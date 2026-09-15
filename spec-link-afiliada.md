# Especificação — link de afiliada `?af=` (Clube 21)

## Contexto

O clube vai ter afiliadas: pessoas que divulgam com um link próprio e recebem
10% de comissão recorrente enquanto a assinante ficar. É diferente do programa
de indicação entre assinantes (`?ref=`), que dá desconto a quem indica.

**Os dois não coexistem.** Ou a venda é de uma afiliada, ou é uma indicação de
assinante. Nunca as duas.

O banco já está pronto: existe a tabela `afiliados` (com `codigo`, `percentual`,
`wallet_id`, `ativo`), a coluna `pedidos.afiliado_id` aponta para ela, e a
função `ativar_membro()` já grava a comissão sozinha quando o pedido tem
afiliada. **Falta só a rota preencher `pedidos.afiliado_id`.**

---

## 1. Front-end — `/assinar`

Ler o parâmetro `af` da URL, do mesmo jeito que `ref` já é lido hoje:

```
clubexxi.com.br/assinar?af=julia
```

Guardar e enviar no corpo do `POST /api/checkout` como `afiliado_codigo`.

Precisa sobreviver às interações da página (troca de plano, troca de país,
abertura do modal de upsell) — igual ao `ref`.

Nada muda visualmente. A pessoa não precisa saber que veio por um link de
afiliada.

---

## 2. Servidor — `app/api/checkout/route.ts`

Ao receber `afiliado_codigo`:

1. Buscar em `afiliados` por `lower(codigo) = lower(afiliado_codigo)` **e**
   `ativo = true`
2. Se encontrar, gravar o `id` em `pedidos.afiliado_id`
3. Se **não** encontrar, ou se estiver inativo: **ignorar em silêncio** e seguir
   com a venda normalmente, sem afiliada. Não retornar erro, não bloquear a
   compra — um link digitado errado não pode custar uma venda.

### Exclusividade

Se a requisição trouxer `afiliado_codigo` **e** `ref_code`, a **afiliada tem
prioridade**: grava `afiliado_id` e descarta o `ref_code` (grava nulo).

Motivo: alguém pode montar essa URL editando um link compartilhado. Como as
duas trilhas não coexistem por decisão de negócio, a regra precisa estar no
código e não no combinado.

Se só vier `ref_code`, o comportamento atual continua igual.

### Validação

O código vem da URL, ou seja, do usuário. Tratar como entrada não confiável:
consulta parametrizada, sem concatenar em SQL.

---

## 3. Fora de escopo — não fazer agora

- **Não** incluir o array `splits` na criação da assinatura. O split do Asaas
  entra num passo separado, e hoje nenhuma afiliada tem `wallet_id`. No
  primeiro mês a comissão é paga manualmente por Pix.
- **Não** alterar `ativar_membro()` — ela já grava a comissão.
- **Não** mexer nos workflows do n8n.
- **Não** criar tela de admin de afiliadas. Por enquanto o cadastro é `insert`
  direto no banco.
- **Não** exibir o nome da afiliada na página.

---

## 4. Verificação

1. `/assinar?af=julia` com uma afiliada ativa cadastrada → o pedido gravado tem
   `afiliado_id` preenchido
2. `/assinar?af=naoexiste` → pedido criado normalmente, `afiliado_id` nulo, sem
   erro na tela
3. `/assinar?af=julia` com a afiliada `ativo = false` → `afiliado_id` nulo
4. `/assinar?af=julia&ref=clara1605` → `afiliado_id` preenchido, `ref_code` nulo
5. `/assinar?ref=clara1605` → comportamento de hoje, `ref_code` preenchido
6. `/assinar?af=JULIA` (maiúsculas) → encontra a afiliada `julia`
7. Trocar de plano e de país no formulário com `?af=julia` na URL e conferir que
   o código sobrevive até o envio

Para testar, cadastre uma afiliada fictícia direto no banco e apague depois.

Ao terminar: typecheck, lint, `git diff > diff.txt`, sem commitar.
