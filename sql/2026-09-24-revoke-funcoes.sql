-- =====================================================================
-- Fecha 4 funções SECURITY DEFINER que estavam executáveis pela API
-- pública (/rest/v1/rpc/...) com a chave anon/publishable.
-- Data: 2026-09-24 · Branch: afiliadas-split
--
-- STATUS: APLICADO em 2026-09-24 (migration revoke_funcoes). Conferido:
-- as 4 com proacl {postgres=X/postgres,service_role=X/postgres}.
--
-- Por quê: as quatro rodam como o dono (postgres) e ignoram RLS. Com a
-- chave pública, qualquer pessoa podia, por exemplo:
--   - ativar_membro(): ativar a própria assinatura sem pagar, usando o
--     pedidoId que o checkout devolve ao navegador (e, com split, gerar
--     comissão marcada como paga);
--   - registrar_evento_cobranca(): cancelar a assinatura de outra pessoa
--     com o subscription_id dela;
--   - pedidos_para_lembrete(): ler a lista de carrinhos abandonados
--     (nome e e-mail de quem não pagou);
--   - recontar_vagas(): mexer na contagem de vagas de uma edição.
--
-- Quem continua podendo executar:
--   - service_role: o n8n chama com a chave secreta (sb_secret_...), que
--     usa esse papel — conferido nos logs do Supabase em 24/09/2026. O
--     servidor do site (createServiceClient) também usa service_role.
--   - postgres (dono): continua executando. É o que mantém funcionando o
--     trigger envios_recontar → envios_recontar_trigger() (SECURITY
--     DEFINER, dono postgres) → recontar_vagas().
--
-- Conferido antes de escrever:
--   - nenhum código do site chama essas 4 funções (o client só chama
--     listar_afiliados_menu e validar_codigo_indicacao, fora daqui);
--   - no banco, só envios_recontar_trigger() chama uma delas
--     (recontar_vagas), e roda como postgres; nenhuma view, policy ou job
--     de pg_cron (extensão não instalada) usa essas funções.
--
-- Atenção pro futuro: CREATE OR REPLACE mantém estas permissões, mas
-- DROP + CREATE devolve o EXECUTE pra anon/authenticated (default
-- privileges do Supabase). Se alguma for recriada, repetir este bloco.
-- =====================================================================

revoke execute on function public.ativar_membro(
  text, text, text, text, numeric, date, text, text
) from public, anon, authenticated;

revoke execute on function public.registrar_evento_cobranca(
  text, text, text
) from public, anon, authenticated;

revoke execute on function public.pedidos_para_lembrete()
  from public, anon, authenticated;

revoke execute on function public.recontar_vagas(uuid)
  from public, anon, authenticated;

grant execute on function public.ativar_membro(
  text, text, text, text, numeric, date, text, text
) to service_role;

grant execute on function public.registrar_evento_cobranca(
  text, text, text
) to service_role;

grant execute on function public.pedidos_para_lembrete()
  to service_role;

grant execute on function public.recontar_vagas(uuid)
  to service_role;

-- Conferência depois de aplicar (esperado em cada linha:
-- {postgres=X/postgres,service_role=X/postgres}):
--
-- select p.proname, p.proacl
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('ativar_membro', 'registrar_evento_cobranca',
--                     'pedidos_para_lembrete', 'recontar_vagas');
