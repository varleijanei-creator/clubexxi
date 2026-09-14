# Especificação — ramo Pix em `/api/checkout` (Clube 21)

## Contexto

Hoje o `/api/checkout` cria um pedido no Supabase e uma **sessão de checkout
hospedado** no Asaas, que só aceita cartão de crédito (o checkout hospedado com
`chargeTypes: ["RECURRENT"]` exige `billingTypes: ["CREDIT_CARD"]`).

Precisamos aceitar Pix. Pix recorrente **não passa pelo checkout hospedado** —
é uma assinatura criada direto pela API, com `billingType: "PIX"`. O Asaas gera
uma cobrança nova a cada ciclo e a assinante paga o QR daquele mês manualmente.

Isso é diferente de Pix Automático (débito automático), que não é o escopo aqui.

## Regra número um

**Não alterar o comportamento do caminho de cartão.** Ele está em produção e
funcionando. O ramo Pix é adicional. Se precisar refatorar algo compartilhado,
faça de forma que o fluxo de cartão produza exatamente o mesmo resultado de hoje.

---

## 1. Mudança no contrato da rota

Adicionar um campo opcional ao corpo:

- `forma_pagamento`: `"CREDIT_CARD"` | `"PIX"` — default `"CREDIT_CARD"`

Qualquer outro valor → `400` com `{ error: "forma_pagamento inválida" }`.

Todos os demais campos permanecem como estão (`plano`, `nome`, `email`, `cpf`,
`telefone`, `cep`, `logradouro`, `numero`, `bairro`, `cidade`, `uf`, `ciclo`,
`complemento`, `pais`, `ponto_referencia`, `ref_code`).

Pix vale para **todos os planos**, mensais e trimestrais.

---

## 2. Fluxo do ramo Pix

### 2.1 Criar o pedido primeiro

O pedido precisa existir **antes** da assinatura, porque o `id` dele vai no
`externalReference`. Grave o pedido exatamente como o caminho de cartão já faz
(mesmo `dados_json`, mesmo `plano_slug`, `ref_code`, `afiliado_id`).

O campo `asaas_checkout_id` fica **nulo** nesse caminho — é esperado.

### 2.2 Criar ou localizar o cliente no Asaas

`POST /v3/customers` com nome, e-mail, cpfCnpj, telefone e endereço.

Se a pessoa já existir no Asaas (mesmo CPF), reaproveite o `id` em vez de criar
duplicado — consulte por `cpfCnpj` antes.

### 2.3 Criar a assinatura

`POST /v3/subscriptions` com:

```json
{
  "customer": "<id do cliente>",
  "billingType": "PIX",
  "value": <valor do plano>,
  "nextDueDate": "<hoje, YYYY-MM-DD>",
  "cycle": "<MONTHLY ou QUARTERLY, conforme o ciclo do plano>",
  "description": "Clube 21 — <nome do plano>",
  "externalReference": "<id do pedido criado em 2.1>"
}
```

O `externalReference` é o que faz a venda ser reconhecida no webhook. Sem ele a
assinante paga e não é ativada. É o ponto mais crítico desta spec.

### 2.4 Obter o link da primeira cobrança

A criação da assinatura devolve a assinatura, não a cobrança. Para chegar ao
link de pagamento, liste as cobranças da assinatura:

`GET /v3/subscriptions/{id}/payments`

Pegue a primeira cobrança e use o campo com a URL da fatura hospedada
(provavelmente `invoiceUrl` — **confirme no retorno real antes de assumir**,
logue a resposta completa na primeira execução em sandbox).

Se a listagem vier vazia na primeira tentativa, pode haver um pequeno atraso na
geração. Implemente uma nova tentativa curta (2 tentativas, ~1s de intervalo)
antes de devolver erro.

### 2.5 Resposta da rota

```json
{ "url": "<link da fatura Pix>", "pedidoId": "<uuid>", "subscriptionId": "sub_..." }
```

Mesmo formato do caminho de cartão no que diz respeito a `url` e `pedidoId`,
para que o front-end continue redirecionando da mesma maneira.

---

## 3. O que NÃO fazer

- Não mexer na função `ativar_membro()` do Supabase — já está atualizada.
- Não mexer nos workflows do n8n.
- Não adicionar `PIX` a `billingTypes` do checkout hospedado. Não funciona com
  `RECURRENT` e só vai gerar erro da API.
- Não construir tela própria de QR Code. Vamos usar a fatura hospedada do Asaas.
- Não expor a chave `ASAAS_API_KEY` no client. Tudo server-side.

---

## 4. Tratamento de erro

Se qualquer passo do 2.2 ao 2.4 falhar, o pedido de 2.1 fica órfão com status
pendente. Isso é aceitável (não ativa ninguém), mas devolva `500` com mensagem
clara e logue o erro do Asaas na íntegra — a API costuma retornar o motivo em
`errors[].description`.

---

## 5. Testes

Testar em **sandbox**, não em produção.

1. Assinatura Pix num plano mensal → conferir que a rota devolve URL de fatura
2. Abrir a fatura e confirmar que o QR aparece
3. Conferir no painel do Asaas que a assinatura foi criada com
   `billingType: PIX` e que o `externalReference` contém o uuid do pedido
4. Repetir com um plano trimestral (`cycle: QUARTERLY`)
5. Confirmar que uma assinatura por **cartão** continua funcionando igual

Ao terminar, me mostre o diff dos arquivos alterados antes de qualquer commit.
