# Especificação — acréscimo internacional (Clube 21)

## Regra

Assinaturas com endereço fora do Brasil pagam **R$ 20 a mais por envelope**,
para cobrir o custo de envio internacional.

```
acrescimo = 20 × plano.meses      (só quando pais ≠ "BR")
valor_final = plano.valor + acrescimo
```

- Plano mensal (`meses: 1`) → +R$ 20
- Plano trimestral (`meses: 3`) → +R$ 60

Vale para **todos os planos**. O campo de país já existe no formulário
(`/assinar`, seletor com Brasil, Portugal, Estados Unidos, etc.).

---

## 1. Servidor — `app/api/checkout/route.ts`

**O cálculo do valor cobrado é feito no servidor e só no servidor.** Nunca
usar um valor vindo do corpo da requisição.

- Ler o plano do banco (`planos.valor` e `planos.meses`), como já é feito
- Se o país do endereço for diferente de `"BR"`, somar `20 × meses`
- Usar o valor final em **ambos** os caminhos:
  - cartão: no `subscription.value` do checkout hospedado
  - Pix: no `value` do `POST /v3/subscriptions`
- Gravar o valor final no `dados_json.valor` do pedido — a função
  `ativar_membro()` usa esse campo como fallback

Motivo de insistir nisso: se o valor vier do formulário, basta editar o campo
no navegador para assinar o Pêssego internacional pagando R$ 39,90.

---

## 2. Front-end — `/assinar`

Ao **trocar o país no seletor**, a tela deve atualizar na hora:

- O valor exibido do plano passa a mostrar o total com acréscimo
- Aparece uma linha explicando o acréscimo, por exemplo:
  > Envio internacional: + R$ 20,00

  No trimestral: `+ R$ 60,00 (R$ 20 por envelope)`
- Ao voltar para Brasil, a linha some e o valor volta ao original

A mesma lógica de `20 × meses` roda no front só para **exibição**. O servidor
recalcula e é ele quem manda.

O objetivo é evitar a situação em que a pessoa lê R$ 69,90 no formulário e
encontra R$ 89,90 na tela de pagamento do Asaas — isso gera desistência.

Se houver resumo do pedido ou seleção de plano com preço visível na página,
todos os pontos que mostram valor precisam refletir o acréscimo.

---

## 3. Interação com o seletor de forma de pagamento

O seletor cartão/Pix mostra textos por ciclo ("todo mês" / "a cada 3 meses").
Esses textos não mudam com o país — só o valor muda.

---

## 4. O que NÃO fazer

- Não alterar a tabela `planos` nem criar planos internacionais separados.
  O acréscimo é calculado, não cadastrado.
- Não mexer na função `ativar_membro()` nem nos workflows do n8n.
- Não aplicar o acréscimo com base em CEP, DDI ou idioma — só no campo de país.
- Não confiar em valor vindo do cliente.

---

## 5. Verificação

1. `/assinar?plano=pessego`, país Brasil → R$ 69,90, sem linha de acréscimo
2. Trocar para Portugal → R$ 89,90, com a linha "+ R$ 20,00"
3. Trocar para o plano trimestral com Portugal → R$ 240,00
   (180 + 60), linha "+ R$ 60,00 (R$ 20 por envelope)"
4. Voltar para Brasil → volta a R$ 180,00, linha some
5. Enviar com Portugal e conferir que a cobrança criada no Asaas tem o valor
   com acréscimo — nos dois caminhos, cartão e Pix
6. Conferir que `dados_json.valor` do pedido gravado tem o valor final

Ao terminar: typecheck, lint, `git diff > diff.txt`, e não commitar.
