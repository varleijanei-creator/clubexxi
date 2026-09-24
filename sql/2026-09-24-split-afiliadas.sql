-- =====================================================================
-- Split do Asaas pra comissão de afiliada
-- Data: 2026-09-24 · Branch: afiliadas-split
--
-- Aplicado pela migration "split_afiliadas" (apply_migration do Supabase,
-- que roda o arquivo numa transação só — por isso sem begin/commit aqui).
--
-- Conteúdo, em ordem:
--   1. Coluna nova assinaturas.split_valor
--   2. Default de comissoes.status: 'prevista' -> 'pendente'
--   3. ativar_membro()             — comissão nasce 'paga' via split
--   4. registrar_evento_cobranca() — estorno e chargeback com split
--
-- Contrato com o checkout (checkout-v2): quando a assinatura é criada
-- pela API com split, o pedido guarda em dados_json.split exatamente o
-- array enviado ao Asaas, ex.: {"split": [{"walletId": "...",
-- "fixedValue": 18.00}]}. Na primeira ativação a ativar_membro() copia o
-- fixedValue pra assinaturas.split_valor; daí em diante, a fonte é a
-- assinatura.
--
-- ATENÇÃO checkout-v2: dados_json.split[0].fixedValue precisa ser gravado
-- como NÚMERO JSON (18.00), não string ("18.00"). A ativar_membro() só
-- reconhece o split quando jsonb_typeof(...fixedValue) = 'number'; string
-- vira "sem split" em silêncio e a comissão sai pendente/Pix — a afiliada
-- receberia em dobro (split + Pix).
--
-- As duas funções mantêm a mesma assinatura de parâmetros (CREATE OR
-- REPLACE substitui no lugar, sem sobrecarga) — o n8n não precisa mudar,
-- exceto pra passar a encaminhar PAYMENT_CHARGEBACK_REQUESTED (item 4b).
-- Fora dos trechos marcados com NOVO, o corpo das funções é o mesmo que
-- está no banco em 24/09/2026 (conferido por hash md5).
-- =====================================================================

-- =====================================================================
-- 1. assinaturas.split_valor
-- =====================================================================
-- fixedValue do split ATIVO na assinatura do Asaas (comissão da afiliada
-- repassada automaticamente a cada cobrança). Null = assinatura sem split:
-- a comissão é gravada 'pendente' e paga por Pix.
-- Assinaturas que já existem ficam null — nenhuma tem split hoje.

alter table public.assinaturas
  add column split_valor numeric;

alter table public.assinaturas
  add constraint assinaturas_split_valor_check
  check (split_valor is null or split_valor > 0);

comment on column public.assinaturas.split_valor is
  'fixedValue do split do Asaas ativo na assinatura (comissão de afiliada repassada automaticamente). Null = sem split: comissão paga por Pix.';

-- =====================================================================
-- 2. comissoes.status: default 'pendente'
-- =====================================================================
-- O default atual, 'prevista', viola a própria check
-- (aprovada/paga/cancelada/pendente). Hoje ninguém depende dele (as
-- funções sempre informam o status), mas um insert sem status falharia.

alter table public.comissoes
  alter column status set default 'pendente';

-- =====================================================================
-- 3. ativar_membro()
-- =====================================================================
-- Com split (primeira venda: dados_json.split do pedido; renovação:
-- assinaturas.split_valor), a comissão de cada pagamento nasce
-- status='paga', forma_pagamento='split', pago_em=now(),
-- valor_comissao = fixedValue repassado, valor_base = v_valor (valor do
-- pagamento; não relê planos pelo plano_slug do pedido, que fica
-- desatualizado depois de um upgrade).
-- Sem split, nada muda: status='pendente', forma_pagamento='pix'.
-- O retorno ganha a chave 'comissao_forma' ('split' ou 'pix').

CREATE OR REPLACE FUNCTION public.ativar_membro(p_checkout_session text, p_subscription_id text, p_customer_id text, p_billing_type text DEFAULT NULL::text, p_valor numeric DEFAULT NULL::numeric, p_due_date date DEFAULT NULL::date, p_external_reference text DEFAULT NULL::text, p_payment_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_pedido        pedidos%rowtype;
  v_pessoais      jsonb;
  v_endereco      jsonb;
  v_membro_id     uuid;
  v_indicador_id  uuid;
  v_edicao_id     uuid;
  v_assinatura_id uuid;
  v_codigo        text;
  v_base          text;
  v_novo_membro   boolean := false;
  v_plano_nome    text;
  v_link          text;
  v_meses         integer := 1;
  v_envios        integer := 0;
  v_edicao_nome   text;
  v_valor         numeric;
  v_via           text;
  v_ultima_mes    date;
  v_ciclo_atual   date;
  v_afiliado_id   uuid;
  v_percentual    numeric;
  v_comissao      numeric := null;
  -- NOVO: split do Asaas
  v_split_valor   numeric := null;  -- fixedValue repassado; null = sem split
  v_forma_comissao text := null;
begin
  -- 1. Acha o pedido. Dois caminhos, conforme a origem da venda.
  if p_checkout_session is not null and trim(p_checkout_session) <> '' then
    v_via := 'checkout_session';

    select * into v_pedido
    from pedidos
    where asaas_checkout_id = p_checkout_session;

  elsif p_external_reference is not null and trim(p_external_reference) <> '' then
    v_via := 'external_reference';

    if trim(p_external_reference) ~*
       '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select * into v_pedido
      from pedidos
      where id = trim(p_external_reference)::uuid;
    end if;

  else
    return jsonb_build_object(
      'ok', false,
      'motivo', 'sem_identificador',
      'detalhe', 'webhook chegou sem checkoutSession e sem externalReference'
    );
  end if;

  if v_pedido.id is null then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'pedido_nao_encontrado',
      'via', v_via,
      'checkout_session', p_checkout_session,
      'external_reference', p_external_reference
    );
  end if;

  -- NOVO: o pedido foi criado com split? Lê o fixedValue gravado pelo
  -- checkout. Só aceita número positivo — JSON malformado vira "sem split"
  -- (comissão cai no fluxo de Pix) em vez de derrubar a ativação.
  -- Vale só pra PRIMEIRA ativação, que copia o valor pra
  -- assinaturas.split_valor. Na renovação a fonte é a assinatura (abaixo).
  if jsonb_typeof(v_pedido.dados_json -> 'split' -> 0 -> 'fixedValue') = 'number' then
    v_split_valor := (v_pedido.dados_json -> 'split' -> 0 ->> 'fixedValue')::numeric;
    if v_split_valor <= 0 then
      v_split_valor := null;
    end if;
  end if;

  -- =====================================================================
  -- 2. Pedido já pago = RENOVAÇÃO.
  -- =====================================================================
  if v_pedido.status = 'pago' then

    -- NOVO: split_valor vem da assinatura, não do pedido — se o split for
    -- removido da assinatura (afiliada desativada), basta zerar a coluna.
    select a.id, a.membro_id, a.proxima_cobranca, a.afiliado_id, a.split_valor
      into v_assinatura_id, v_membro_id, v_ciclo_atual, v_afiliado_id, v_split_valor
    from assinaturas a
    where a.asaas_subscription_id = p_subscription_id;

    if v_assinatura_id is null then
      return jsonb_build_object(
        'ok', true,
        'motivo', 'ja_ativo',
        'detalhe', 'assinatura nao encontrada pelo subscription_id',
        'pedido_id', v_pedido.id
      );
    end if;

    if p_due_date is not null and v_ciclo_atual is not distinct from p_due_date then
      return jsonb_build_object(
        'ok', true,
        'motivo', 'ja_ativo',
        'detalhe', 'ciclo ja processado',
        'pedido_id', v_pedido.id,
        'assinatura_id', v_assinatura_id
      );
    end if;

    select coalesce(meses, 1) into v_meses
    from planos where slug = v_pedido.plano_slug;

    if v_meses is null or v_meses < 1 then
      v_meses := 1;
    end if;

    select max(e.mes) into v_ultima_mes
    from envios en
    join edicoes e on e.id = en.edicao_id
    where en.membro_id = v_membro_id;

    if v_ultima_mes is null then
      select id into v_edicao_id
      from edicoes
      where status = 'aberta' and fechamento >= current_date
      order by mes limit 1;
    else
      select id into v_edicao_id
      from edicoes
      where mes > v_ultima_mes
      order by mes limit 1;
    end if;

    if v_edicao_id is not null then
      insert into envios (membro_id, edicao_id, assinatura_id, status)
      select v_membro_id, x.id, v_assinatura_id, 'previsto'
      from (
        select e.id
        from edicoes e
        where e.mes >= (select mes from edicoes where id = v_edicao_id)
        order by e.mes
        limit v_meses
      ) x
      on conflict (membro_id, edicao_id) do nothing;

      get diagnostics v_envios = row_count;
    end if;

    update assinaturas set
      status           = 'ativa',
      valor            = coalesce(p_valor, valor),
      billing_type     = coalesce(p_billing_type, billing_type),
      proxima_cobranca = coalesce(p_due_date, proxima_cobranca),
      atualizado_em    = now()
    where id = v_assinatura_id;

    -- Comissão da renovação.
    if v_afiliado_id is not null and p_payment_id is not null then
      select coalesce(percentual, 10) into v_percentual
      from afiliados where id = v_afiliado_id;

      v_valor    := coalesce(p_valor, (v_pedido.dados_json ->> 'valor')::numeric);

      if v_split_valor is not null then
        -- NOVO: repasse feito pelo Asaas. Base = v_valor (valor do
        -- pagamento), não planos pelo plano_slug do pedido — depois de um
        -- upgrade o plano do pedido fica desatualizado.
        v_comissao       := v_split_valor;
        v_forma_comissao := 'split';

        insert into comissoes (
          afiliado_id, assinatura_id, asaas_payment_id, competencia,
          valor_base, percentual, valor_comissao, status,
          forma_pagamento, pago_em, observacao
        ) values (
          v_afiliado_id,
          v_assinatura_id,
          p_payment_id,
          date_trunc('month', coalesce(p_due_date, current_date))::date,
          v_valor,
          coalesce(v_percentual, 10),
          v_comissao,
          'paga',
          'split',
          now(),
          'repassada pelo split do Asaas'
        )
        on conflict (asaas_payment_id) do nothing;
      else
        v_comissao       := round(v_valor * coalesce(v_percentual, 10) / 100, 2);
        v_forma_comissao := 'pix';

        insert into comissoes (
          afiliado_id, assinatura_id, asaas_payment_id, competencia,
          valor_base, percentual, valor_comissao, status
        ) values (
          v_afiliado_id,
          v_assinatura_id,
          p_payment_id,
          date_trunc('month', coalesce(p_due_date, current_date))::date,
          v_valor,
          coalesce(v_percentual, 10),
          v_comissao,
          'pendente'
        )
        on conflict (asaas_payment_id) do nothing;
      end if;
    end if;

    return jsonb_build_object(
      'ok', true,
      'motivo', case when v_envios > 0 then 'renovado' else 'ja_ativo' end,
      'via', v_via,
      'pedido_id', v_pedido.id,
      'membro_id', v_membro_id,
      'assinatura_id', v_assinatura_id,
      'edicao_id', v_edicao_id,
      'envios_criados', v_envios,
      'comissao', v_comissao,
      'comissao_forma', v_forma_comissao
    );
  end if;

  -- =====================================================================
  -- Primeira ativação.
  -- =====================================================================

  v_pessoais := v_pedido.dados_json -> 'pessoais';
  v_endereco := v_pedido.dados_json -> 'endereco';

  -- 3. Quem indicou, se veio código
  if v_pedido.ref_code is not null and trim(v_pedido.ref_code) <> '' then
    select id into v_indicador_id
    from membros
    where lower(codigo_indicacao) = lower(trim(v_pedido.ref_code));
  end if;

  -- 4. Membro: reaproveita pelo e-mail se já existir
  select id into v_membro_id
  from membros
  where lower(email) = lower(v_pessoais ->> 'email');

  -- 4a. Se não achou pelo e-mail, tenta pelo cliente do Asaas
  --     (mesma pessoa/CPF assinando com outro e-mail)
  if v_membro_id is null and p_customer_id is not null and trim(p_customer_id) <> '' then
    select id into v_membro_id
    from membros
    where asaas_customer_id = p_customer_id;
  end if;

  if v_membro_id is null then
    v_novo_membro := true;

    v_base := lower(split_part(trim(unaccent(v_pessoais ->> 'nome')), ' ', 1));
    v_base := regexp_replace(v_base, '[^a-z]', '', 'g');
    if v_base = '' then
      v_base := 'membro';
    end if;

    loop
      v_codigo := v_base || lpad((floor(random() * 10000))::int::text, 4, '0');
      exit when not exists (
        select 1 from membros where codigo_indicacao = v_codigo
      );
    end loop;

    insert into membros (
      nome, email, telefone, cpf,
      asaas_customer_id, codigo_indicacao, indicado_por, status
    ) values (
      v_pessoais ->> 'nome',
      lower(v_pessoais ->> 'email'),
      v_pessoais ->> 'telefone',
      v_pessoais ->> 'cpf',
      p_customer_id,
      v_codigo,
      v_indicador_id,
      'ativo'
    )
    returning id into v_membro_id;
  else
    update membros set
      status            = 'ativo',
      asaas_customer_id = coalesce(asaas_customer_id, p_customer_id),
      telefone          = coalesce(telefone, v_pessoais ->> 'telefone'),
      cpf               = coalesce(cpf, v_pessoais ->> 'cpf'),
      indicado_por      = coalesce(indicado_por, v_indicador_id)
    where id = v_membro_id
    returning codigo_indicacao into v_codigo;
  end if;

  -- 5. Endereço
  if exists (select 1 from enderecos where membro_id = v_membro_id) then
    update enderecos set
      cep              = v_endereco ->> 'cep',
      logradouro       = v_endereco ->> 'logradouro',
      numero           = v_endereco ->> 'numero',
      complemento      = v_endereco ->> 'complemento',
      bairro           = v_endereco ->> 'bairro',
      cidade           = v_endereco ->> 'cidade',
      uf               = v_endereco ->> 'uf',
      pais             = coalesce(v_endereco ->> 'pais', 'BR'),
      ponto_referencia = v_endereco ->> 'ponto_referencia',
      atualizado_em    = now()
    where membro_id = v_membro_id;
  else
    insert into enderecos (
      membro_id, cep, logradouro, numero, complemento,
      bairro, cidade, uf, pais, ponto_referencia
    ) values (
      v_membro_id,
      v_endereco ->> 'cep',
      v_endereco ->> 'logradouro',
      v_endereco ->> 'numero',
      v_endereco ->> 'complemento',
      v_endereco ->> 'bairro',
      v_endereco ->> 'cidade',
      v_endereco ->> 'uf',
      coalesce(v_endereco ->> 'pais', 'BR'),
      v_endereco ->> 'ponto_referencia'
    );
  end if;

  -- 6. Edição
  select id into v_edicao_id
  from edicoes
  where status = 'aberta'
    and fechamento >= current_date
  order by mes
  limit 1;

  if v_edicao_id is null then
    select id into v_edicao_id
    from edicoes
    where mes > current_date
    order by mes
    limit 1;
  end if;

  -- 6b. Dados do plano
  select nome, link_comunidade, coalesce(meses, 1)
    into v_plano_nome, v_link, v_meses
  from planos where slug = v_pedido.plano_slug;

  if v_meses is null or v_meses < 1 then
    v_meses := 1;
  end if;

  -- 7. Assinatura
  if exists (
    select 1 from assinaturas where asaas_subscription_id = p_subscription_id
  ) then
    update assinaturas set
      status           = 'ativa',
      valor            = coalesce(p_valor, valor),
      billing_type     = coalesce(p_billing_type, billing_type),
      proxima_cobranca = coalesce(p_due_date, proxima_cobranca),
      split_valor      = v_split_valor,  -- NOVO
      atualizado_em    = now()
    where asaas_subscription_id = p_subscription_id
    returning id into v_assinatura_id;
  else
    insert into assinaturas (
      membro_id, asaas_subscription_id, plano_slug, valor,
      billing_type, status, proxima_cobranca, primeira_edicao, afiliado_id,
      split_valor  -- NOVO
    ) values (
      v_membro_id,
      p_subscription_id,
      v_pedido.plano_slug,
      coalesce(p_valor, (v_pedido.dados_json ->> 'valor')::numeric),
      p_billing_type,
      'ativa',
      p_due_date,
      v_edicao_id,
      v_pedido.afiliado_id,
      v_split_valor
    )
    returning id into v_assinatura_id;
  end if;

  -- 8. Envios
  if v_edicao_id is not null then
    insert into envios (membro_id, edicao_id, assinatura_id, status)
    select v_membro_id, x.id, v_assinatura_id, 'previsto'
    from (
      select e.id
      from edicoes e
      where e.mes >= (select mes from edicoes where id = v_edicao_id)
      order by e.mes
      limit v_meses
    ) x
    on conflict (membro_id, edicao_id) do nothing;

    get diagnostics v_envios = row_count;
  end if;

  -- 9. Fecha o pedido
  update pedidos set status = 'pago' where id = v_pedido.id;

  -- 10. Dados para o e-mail
  select nome into v_edicao_nome
  from edicoes where id = v_edicao_id;

  v_valor := coalesce(p_valor, (v_pedido.dados_json ->> 'valor')::numeric);

  -- 10b. NOVO — evento de entrada para as métricas.
  --      Bloco protegido: se falhar, a ativação continua normalmente.
  begin
    insert into assinatura_eventos (
      membro_id, tipo, plano_slug, ciclo, valor, origem,
      afiliado_id, pais, motivo, pedido_id, assinatura_id
    ) values (
      v_membro_id,
      case when v_novo_membro then 'entrou' else 'reativou' end,
      v_pedido.plano_slug,
      case when v_pedido.ciclo in ('mensal', 'trimestral') then v_pedido.ciclo end,
      v_valor,
      coalesce(
        nullif(trim(concat_ws(' — ', v_pedido.origem, v_pedido.origem_detalhe)), ''),
        null
      ),
      v_pedido.afiliado_id,
      coalesce(v_endereco ->> 'pais', 'BR'),
      null,
      v_pedido.id,
      v_assinatura_id
    );
  exception when others then
    raise warning 'assinatura_eventos: falhou ao gravar entrada do pedido %: %',
      v_pedido.id, sqlerrm;
  end;

  -- 11. Comissão da primeira venda.
  if v_pedido.afiliado_id is not null and p_payment_id is not null then
    select coalesce(percentual, 10) into v_percentual
    from afiliados where id = v_pedido.afiliado_id;

    if v_split_valor is not null then
      -- NOVO: repasse feito pelo Asaas (ver renovação acima). Base = v_valor.
      v_comissao       := v_split_valor;
      v_forma_comissao := 'split';

      insert into comissoes (
        afiliado_id, assinatura_id, asaas_payment_id, competencia,
        valor_base, percentual, valor_comissao, status,
        forma_pagamento, pago_em, observacao
      ) values (
        v_pedido.afiliado_id,
        v_assinatura_id,
        p_payment_id,
        date_trunc('month', coalesce(p_due_date, current_date))::date,
        v_valor,
        coalesce(v_percentual, 10),
        v_comissao,
        'paga',
        'split',
        now(),
        'repassada pelo split do Asaas'
      )
      on conflict (asaas_payment_id) do nothing;
    else
      v_comissao       := round(v_valor * coalesce(v_percentual, 10) / 100, 2);
      v_forma_comissao := 'pix';

      insert into comissoes (
        afiliado_id, assinatura_id, asaas_payment_id, competencia,
        valor_base, percentual, valor_comissao, status
      ) values (
        v_pedido.afiliado_id,
        v_assinatura_id,
        p_payment_id,
        date_trunc('month', coalesce(p_due_date, current_date))::date,
        v_valor,
        coalesce(v_percentual, 10),
        v_comissao,
        'pendente'
      )
      on conflict (asaas_payment_id) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'motivo', 'ativado',
    'via', v_via,
    'pedido_id', v_pedido.id,
    'membro_id', v_membro_id,
    'novo_membro', v_novo_membro,
    'codigo_indicacao', v_codigo,
    'indicado_por', v_indicador_id,
    'edicao_id', v_edicao_id,
    'assinatura_id', v_assinatura_id,
    'meses', v_meses,
    'envios_criados', v_envios,
    'afiliado_id', v_pedido.afiliado_id,
    'comissao', v_comissao,
    'comissao_forma', v_forma_comissao,
    'email', lower(v_pessoais ->> 'email'),
    'nome', v_pessoais ->> 'nome',
    'primeiro_nome', split_part(trim(v_pessoais ->> 'nome'), ' ', 1),
    'plano_nome', v_plano_nome,
    'plano_slug', v_pedido.plano_slug,
    'valor', v_valor,
    'edicao_nome', v_edicao_nome,
    'link_comunidade', v_link,
    'cancel_token', (select cancel_token from assinaturas where id = v_assinatura_id)
  );
end;
$function$;

-- =====================================================================
-- 4. registrar_evento_cobranca()
-- =====================================================================
-- a) PAYMENT_REFUNDED (estorno total e chargeback PERDIDO, que o Asaas
--    comunica com esse mesmo evento): além do que já faz, cancela a
--    comissão daquele pagamento que estava 'paga' via split (o Asaas
--    reverte o repasse). Só com p_payment_id — os outros meses continuam
--    repassados.
-- b) PAYMENT_CHARGEBACK_REQUESTED (NOVO): não mexe em assinatura, envios
--    nem status; só anota na observação das comissões daquele pagamento
--    "chargeback recebido em DD/MM/AAAA: não pagar até resolver".
--    Só roda se o n8n passar a encaminhar esse evento.
-- O retorno ganha 'comissoes_split_canceladas' e
-- 'comissoes_marcadas_chargeback'.

CREATE OR REPLACE FUNCTION public.registrar_evento_cobranca(p_subscription_id text, p_evento text, p_payment_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_assinatura_id uuid;
  v_membro_id     uuid;
  v_status_ant    text;
  v_nome          text;
  v_email         text;
  v_envios        integer := 0;
  v_comissoes     integer := 0;
  v_novo_status   text;
  -- NOVO: dados para o evento
  v_plano_slug    text;
  v_valor         numeric;
  v_afiliado_id   uuid;
  v_ciclo         text;
  v_pais          text;
  v_suspendeu     integer := 0;
  -- NOVO (split): comissões pagas via split revertidas / anotadas por chargeback
  v_comissoes_split      integer := 0;
  v_comissoes_chargeback integer := 0;
begin
  if p_subscription_id is null or trim(p_subscription_id) = '' then
    return jsonb_build_object('ok', false, 'motivo', 'sem_subscription_id');
  end if;

  select a.id, a.membro_id, a.status, a.plano_slug, a.valor, a.afiliado_id
    into v_assinatura_id, v_membro_id, v_status_ant, v_plano_slug, v_valor, v_afiliado_id
  from assinaturas a
  where a.asaas_subscription_id = p_subscription_id;

  if v_assinatura_id is null then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'assinatura_nao_encontrada',
      'subscription_id', p_subscription_id
    );
  end if;

  select m.nome, m.email into v_nome, v_email
  from membros m where m.id = v_membro_id;

  -- NOVO: ciclo (pelo plano) e país (pelo endereço), para o evento
  select case when coalesce(pl.meses, 1) > 1 then 'trimestral' else 'mensal' end
    into v_ciclo
  from planos pl where pl.slug = v_plano_slug;

  select e.pais into v_pais
  from enderecos e where e.membro_id = v_membro_id;

  if p_evento = 'PAYMENT_OVERDUE' then
    v_novo_status := 'suspensa';

    -- Só suspende se estiver ativa. Assinatura já cancelada não volta
    -- para suspensa por causa de um evento atrasado.
    update assinaturas set
      status        = 'suspensa',
      atualizado_em = now()
    where id = v_assinatura_id
      and status = 'ativa';

    get diagnostics v_suspendeu = row_count;

    -- NOVO: evento de suspensão, só se realmente suspendeu agora.
    if v_suspendeu > 0 then
      begin
        insert into assinatura_eventos (
          membro_id, tipo, plano_slug, ciclo, valor, afiliado_id,
          pais, motivo, assinatura_id
        ) values (
          v_membro_id, 'suspendeu', v_plano_slug, v_ciclo, v_valor, v_afiliado_id,
          coalesce(v_pais, 'BR'), 'pagamento em atraso', v_assinatura_id
        );
      exception when others then
        raise warning 'assinatura_eventos: falhou ao gravar suspensao da assinatura %: %',
          v_assinatura_id, sqlerrm;
      end;
    end if;

  elsif p_evento = 'PAYMENT_REFUNDED' then
    v_novo_status := 'cancelada';

    update assinaturas set
      status        = 'cancelada',
      atualizado_em = now()
    where id = v_assinatura_id;

    update envios set
      status = 'cancelado'
    where assinatura_id = v_assinatura_id
      and status = 'previsto';

    get diagnostics v_envios = row_count;

    update comissoes set
      status     = 'cancelada',
      observacao = coalesce(observacao || ' | ', '') || 'cancelada por estorno'
    where assinatura_id = v_assinatura_id
      and status = 'pendente'
      and (p_payment_id is null or asaas_payment_id = p_payment_id);

    get diagnostics v_comissoes = row_count;

    -- NOVO (split): o Asaas reverte o repasse do pagamento estornado (e do
    -- chargeback perdido). Só com p_payment_id: os outros meses continuam
    -- repassados e não podem ser cancelados junto.
    if p_payment_id is not null and trim(p_payment_id) <> '' then
      update comissoes set
        status     = 'cancelada',
        observacao = coalesce(observacao || ' | ', '')
                     || 'estornada: repasse do split revertido pelo Asaas'
      where assinatura_id = v_assinatura_id
        and asaas_payment_id = p_payment_id
        and status = 'paga'
        and forma_pagamento = 'split';

      get diagnostics v_comissoes_split = row_count;
    end if;

    -- NOVO: evento de estorno, só se não estava cancelada antes.
    if v_status_ant is distinct from 'cancelada' then
      begin
        insert into assinatura_eventos (
          membro_id, tipo, plano_slug, ciclo, valor, afiliado_id,
          pais, motivo, assinatura_id
        ) values (
          v_membro_id, 'estornou', v_plano_slug, v_ciclo, v_valor, v_afiliado_id,
          coalesce(v_pais, 'BR'), 'estorno no Asaas', v_assinatura_id
        );
      exception when others then
        raise warning 'assinatura_eventos: falhou ao gravar estorno da assinatura %: %',
          v_assinatura_id, sqlerrm;
      end;
    end if;

  elsif p_evento = 'PAYMENT_CHARGEBACK_REQUESTED' then
    -- NOVO: só anota. Assinatura, envios e status das comissões ficam como
    -- estão até o desfecho (perdido = PAYMENT_REFUNDED; vencido = nada).
    if p_payment_id is null or trim(p_payment_id) = '' then
      return jsonb_build_object(
        'ok', false,
        'motivo', 'chargeback_sem_payment_id',
        'subscription_id', p_subscription_id
      );
    end if;

    update comissoes set
      observacao = coalesce(observacao || ' | ', '')
                   || 'chargeback recebido em ' || to_char(current_date, 'DD/MM/YYYY')
                   || ': não pagar até resolver'
    where assinatura_id = v_assinatura_id
      and asaas_payment_id = p_payment_id
      and status in ('pendente', 'aprovada', 'paga');

    get diagnostics v_comissoes_chargeback = row_count;

  else
    return jsonb_build_object(
      'ok', false,
      'motivo', 'evento_nao_tratado',
      'evento', p_evento
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'motivo', lower(p_evento),
    'assinatura_id', v_assinatura_id,
    'membro_id', v_membro_id,
    'nome', v_nome,
    'primeiro_nome', split_part(trim(coalesce(v_nome, '')), ' ', 1),
    'email', v_email,
    'status_anterior', v_status_ant,
    'status_novo', v_novo_status,
    'envios_cancelados', v_envios,
    'comissoes_canceladas', v_comissoes,
    'comissoes_split_canceladas', v_comissoes_split,
    'comissoes_marcadas_chargeback', v_comissoes_chargeback
  );
end;
$function$;
