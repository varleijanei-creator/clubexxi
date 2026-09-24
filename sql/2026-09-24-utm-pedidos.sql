-- =====================================================================
-- UTMs no pedido: de onde veio quem assinou (Instagram do Vitor, do
-- Varlei, TikTok etc.).
-- Data: 2026-09-24 · Branch: afiliadas-split
--
-- STATUS: APLICADO em 2026-09-24 (migration utm_pedidos). Conferido:
-- as 4 colunas text, nulas.
--
-- O que muda: 4 colunas text nulas em pedidos. Nada mais — sem tabela,
-- sem função, sem mexer em policy (as de pedidos valem pras colunas novas).
--
-- De onde vêm os valores: o proxy.ts grava cookies c21_utm_* (30 dias,
-- vale o último link com UTM) e o /api/checkout lê esses cookies na hora
-- de gravar o pedido. Chegam já normalizados pelo código: minúsculas, sem
-- acento, só [a-z0-9_.-], no máximo 100 caracteres.
--
-- Independente de afiliada/indicação e do menu "como ficou sabendo"
-- (pedidos.origem / origem_detalhe), que continuam como estão.
--
-- O check de tamanho é só rede de segurança: o código já corta em 100,
-- então ele não recusa pedido em uso normal. Não há check de formato de
-- propósito — se a normalização do código mudar, o pedido não pode falhar
-- no insert por causa de UTM.
--
-- Sem índice: o volume é de centenas de pedidos por edição; o relatório
-- do /admin filtra por status e período e agrupa em memória sem custo.
-- =====================================================================

alter table public.pedidos
  add column utm_source   text,
  add column utm_medium   text,
  add column utm_campaign text,
  add column utm_content  text;

alter table public.pedidos
  add constraint pedidos_utm_tamanho check (
        char_length(utm_source)   <= 100
    and char_length(utm_medium)   <= 100
    and char_length(utm_campaign) <= 100
    and char_length(utm_content)  <= 100
  );

comment on column public.pedidos.utm_source   is 'Rede de origem (instagram, tiktok...). Último link com UTM em até 30 dias. Nulo = direto / sem UTM.';
comment on column public.pedidos.utm_medium   is 'Onde estava o link (bio, stories...).';
comment on column public.pedidos.utm_campaign is 'Perfil/campanha (vitor, varlei...).';
comment on column public.pedidos.utm_content  is 'Variação do conteúdo (qual post/story).';

-- Conferência depois de aplicar:
--
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'pedidos'
--   and column_name like 'utm\_%';
