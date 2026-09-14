# Especificação — seletor de forma de pagamento em `/assinar` (Clube 21)

## Contexto

A rota `/api/checkout` já aceita o campo `forma_pagamento` (`"CREDIT_CARD"`
default, ou `"PIX"`) e tem o ramo Pix implementado e testado. O que falta é a
interface: hoje o formulário nunca envia esse campo, então a assinante não
consegue escolher Pix.

Esta spec cobre **só o front-end**. Não alterar a rota, o `lib/asaas.ts`, o
banco ou os workflows do n8n.

---

## 1. O que construir

Um seletor de forma de pagamento no formulário `/assinar`, com **duas opções
lado a lado**, posicionado **logo acima do botão de enviar**.

- Cartão de crédito — **pré-selecionado por padrão**
- Pix

Visualmente: dois cards/botões de largura igual, lado a lado no desktop. No
mobile, empilhar se não couberem confortavelmente. O selecionado precisa ter
estado visual claro (borda, fundo ou marca) — não depender só de cor, para
quem tem dificuldade de distinguir matizes.

Seguir a identidade visual que já existe no formulário. Não introduzir
biblioteca nova de componentes.

---

## 2. Textos

**Cartão de crédito**
> Cobrança automática todo mês.

Nos planos trimestrais, trocar por: *Cobrança automática a cada 3 meses.*

**Pix**
> A cada mês você recebe um novo Pix por e-mail pra pagar.

Nos planos trimestrais: *A cada 3 meses você recebe um novo Pix por e-mail
pra pagar.*

O texto deve ser **dinâmico conforme o ciclo do plano** selecionado. O ciclo já
está disponível no front (a página lida com planos mensais e trimestrais).

Esses textos importam: a diferença real entre as duas opções é que o Pix não é
débito automático. Quem não souber disso na hora de escolher vai descobrir
quando esquecer de pagar.

---

## 3. Comportamento

- O valor selecionado vai no corpo do `POST /api/checkout` como
  `forma_pagamento`, com os valores exatos `"CREDIT_CARD"` ou `"PIX"`.
- O redirecionamento após a resposta é **igual nos dois casos**: a rota devolve
  `{ url, pedidoId }` em ambos, e o front já redireciona para `url`. Não criar
  ramificação no tratamento da resposta.
- A troca de plano (mensal ↔ trimestral) deve atualizar os textos do seletor,
  mantendo a opção que a pessoa já tinha escolhido.
- Sem campo obrigatório novo: como cartão vem pré-selecionado, nunca há estado
  sem escolha.

---

## 4. O que NÃO fazer

- Não alterar `app/api/checkout/route.ts` nem `lib/asaas.ts`.
- Não construir tela própria de QR Code — o Pix redireciona para a fatura
  hospedada do Asaas, igual o cartão redireciona para o checkout hospedado.
- Não adicionar boleto como opção.
- Não mudar a validação dos demais campos do formulário.

---

## 5. Verificação

1. Abrir `/assinar?plano=pessego` e conferir que o seletor aparece com cartão
   pré-selecionado
2. Trocar para o plano trimestral e conferir que os textos mudam para "a cada
   3 meses"
3. Escolher Pix e enviar — conferir na aba Network que o corpo contém
   `"forma_pagamento": "PIX"`
4. Conferir que com cartão o corpo contém `"CREDIT_CARD"` (ou omite o campo,
   já que o default cobre)
5. Conferir o layout no mobile

Ao terminar, rodar typecheck e lint, e me mostrar o `git diff` completo colado
como texto. Não commitar.
