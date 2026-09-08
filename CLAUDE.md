# Clube 21 — contexto do projeto

Leia este arquivo antes de qualquer alteração.

## O que é

Clube de assinatura de **cartas físicas** enviadas pelo correio todo mês.
Domínio: clubexxi.com.br. Instagram: @clubexxi.
Lançamento: **15/09/2026**. Corte da primeira edição: **20/09/2026**.

## Stack

- Next.js (App Router) + TypeScript + Tailwind, hospedado na Vercel
- Supabase (Postgres + Auth) — banco já criado, schema já aplicado
- Asaas — pagamento, via **Checkout hospedado** (não montamos formulário de cartão)
- n8n — webhooks, e-mails e rotinas assíncronas (fora deste repo)
- Resend — envio de e-mail

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     <- só no servidor, nunca no client
ASAAS_API_KEY                 <- sandbox até 14/09
ASAAS_BASE_URL                <- https://api-sandbox.asaas.com/v3
NEXT_PUBLIC_SITE_URL          <- usada nas URLs de callback
```

Autenticação do Asaas é o header `access_token`, **não** `Authorization: Bearer`.

## Aprendizados do Asaas (custaram tempo, não redescobrir)

- A chave começa com `$`. Em `.env` isso é lido como variável e a chave chega vazia.
  Precisa ficar escapada (`\$aact_...`). Já corrigido, não desfazer.
- As URLs de callback **não aceitam `http://localhost`**. Exigem HTTPS real. Por isso
  `NEXT_PUBLIC_SITE_URL` aponta para o domínio de produção mesmo em teste local.
- O telefone vai só com dígitos, sem máscara, mas o Asaas **rejeita números
  implausíveis** como `11999999999`. Em teste, usar algo realista.
- **O Asaas valida se o CEP existe de verdade.** CEP inventado é recusado com
  "O campo postalCode é inválido", já no fim do fluxo. Consequência: o formulário
  precisa validar o CEP com autocomplete **antes** de chamar o checkout, senão a
  pessoa só descobre o erro na última etapa e não entende o motivo.

## Decisões já fechadas (não reabrir)

- **Checkout hospedado do Asaas.** O endereço e o código de indicação são coletados
  em formulário próprio ANTES, e gravados no Supabase. O Asaas só recebe o pagamento.
- **Cartão é o padrão.** Só cartão renova sozinho; Pix é segunda opção.
- **Comunicação só por e-mail.** Sem disparo por WhatsApp. O grupo de WhatsApp existe
  e entra como link no e-mail de boas-vindas.
- **Login sem senha**, por magic link do Supabase Auth. Vale para membro e para admin.
- **Indicação:** 1 amiga = 25% de desconto na mensalidade seguinte, 2 = 50%, 3 = 75%,
  4 = mês grátis. Teto de 4 por ciclo. Vale só no mês seguinte. Excedente rola para
  o ciclo seguinte. A indicação conta quando o **pagamento da indicada é confirmado**,
  não no cadastro.
- **Tiragem limitada** por edição (100 na primeira). A home mostra vagas restantes e
  o estado esgotado.
- **Nota fiscal:** estrutura pronta no banco, mas **desligada**. Não expor no site.

## Banco de dados

O schema **já existe**, aplicado em três migrations. Não crie tabelas novas nem
migrations sem me avisar antes.

| tabela | o que guarda |
|---|---|
| `planos` | semente / flor / pessego / presente-edicao. Coluna `tipo` |
| `planos_precos` | preço por ciclo (MONTHLY hoje; 3/6/12 meses depois) |
| `edicoes` | mês, tiragem, vagas_usadas, fechamento, status |
| `membros` | dados, `asaas_customer_id`, `codigo_indicacao` (gerado por trigger), `indicado_por`, e os campos fiscais |
| `enderecos` | endereço de entrega do membro (1 por membro) |
| `pedidos` | o que a pessoa preencheu antes do checkout. `dados_json`, `ref_code`, `status`, `tipo`, `ciclo` |
| `assinaturas` | `asaas_subscription_id`, plano, valor, status, próxima cobrança |
| `pagamentos` | `asaas_payment_id`, valor, status |
| `indicacoes` | indicador -> indicado. `indicado_id` é UNIQUE |
| `creditos` | desconto acumulado por membro e ciclo. UNIQUE (membro_id, ciclo_ref) |
| `presentes` | quem paga != quem recebe. Cobrança única |
| `remessas` | envelope por edição. Pertence a um membro OU a um presente |
| `notas_fiscais` | notas emitidas. Espelha o retorno do Asaas |
| `config_fiscal` | linha única com município, código de serviço, alíquota. Nasce `ativo = false` |
| `afiliados` | split de pagamento (fase de outubro) |
| `admins` | e-mails com acesso ao painel |
| `webhook_events` | `asaas_event_id` UNIQUE — idempotência dos webhooks |

Funções disponíveis: `vagas_disponiveis()` e `is_admin()`.
View disponível: `mala_direta` (assinantes ativos + presentes pagos, para etiquetas).

RLS está ligada em tudo. O membro logado vê só a própria linha, casando pelo e-mail
do JWT. O admin vê tudo via `is_admin()`. O servidor usa a service role e ignora RLS.

## Convenções

- Nomes de tabela, coluna e campo de formulário em **português**, como no banco
- O corpo de `POST /api/checkout` é **plano**, sem objetos aninhados, com os nomes:
  `plano, nome, email, cpf, telefone, cep, logradouro, numero, complemento, bairro,
  cidade, uf, pais, ponto_referencia, ref_code`
- Toda chamada ao Asaas acontece em **route handler no servidor**, nunca no client
- Toda escrita no banco vinda do checkout usa a **service role**, no servidor
- O `externalReference` do Asaas recebe o `pedidos.id`. É o que amarra o retorno
- Valores em `numeric`, nunca em centavos inteiros
- Slugs dos planos: `semente`, `flor`, `pessego`

## Não faça

- Não use `localStorage` nem `sessionStorage`
- Não exponha `SUPABASE_SERVICE_ROLE_KEY` nem `ASAAS_API_KEY` no client
- Não confie em URL de retorno para confirmar pagamento. **Quem confirma é o webhook**
- Não crie tabela, coluna ou migration sem avisar
- Não invente preço, prazo ou benefício. Os valores são 39,90 / 59,90 / 69,90
- Não instale biblioteca de UI ou de formulário sem perguntar
- Não exponha campos de nota fiscal na interface por enquanto

## Fluxos n8n (fora deste repo)

- **WF-1 Receptor Asaas** — pronto e ativo. Recebe o webhook, valida o header
  `asaas-access-token`, grava em `webhook_events` com deduplicação e roteia
- Próximos: ativação do membro, motor de indicação, aplicação do desconto, e-mails,
  e a régua de carrinho abandonado

## Carrinho abandonado

`pedidos` com status `iniciado` **é** a lista de carrinhos abandonados: a pessoa
preencheu nome, e-mail e endereço completos e não pagou. A régua vai usar isso.

Pontos a respeitar quando for construir:

- O checkout do Asaas expira. O evento de expiração é o que move o pedido de
  `iniciado` para `expirado`
- **O link antigo não pode ser reenviado**, porque expira. O e-mail de recuperação
  precisa gerar um checkout novo a partir dos dados já gravados no pedido
- Pedido pode ficar preso em `iniciado` por falha de rede na hora de marcar o
  cancelamento. Uma rotina precisa expirar pedidos antigos
- O prazo do dia 20 é real e serve de gancho legítimo no segundo toque

## Estado atual

Feito: banco com as três migrations aplicadas, esqueleto no ar, domínio ligado com
HTTPS, WF-1 do n8n funcionando, e **`POST /api/checkout` funcionando de ponta a
ponta** — grava o pedido, cria a sessão no Asaas e devolve a URL do checkout,
validada no navegador com o plano e o valor corretos.

A seguir: captura do `?ref`, páginas de retorno, webhook de ativação (WF-2),
área do membro, painel admin, régua de carrinho abandonado.
