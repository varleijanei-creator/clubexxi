# Especificação — páginas de retorno do checkout (Clube 21)

Contexto: o fluxo de pagamento está pronto e testado em produção. O que falta
são as três páginas para onde o Asaas devolve a pessoa depois do checkout.
Hoje elas não existem e quem paga cai num 404.

---

## 1. O que já existe

- `app/api/checkout/route.ts` — cria o pedido e a sessão de checkout. As URLs de
  callback já apontam para as três rotas abaixo, com `?pedido={uuid}`:
  - `/checkout/sucesso?pedido={id}`
  - `/checkout/cancelado?pedido={id}`
  - `/checkout/expirado?pedido={id}`
- `app/assinar/` — formulário, já em produção
- `lib/supabase/server.ts` — `createClient()` e `createServiceClient()`
- Tabela `planos` ganhou a coluna `link_comunidade` (text), com o link do grupo
  de WhatsApp de cada plano. `presente-edicao` está null.

---

## 2. Arquivos a criar

```
app/checkout/sucesso/page.tsx
app/checkout/cancelado/page.tsx
app/checkout/expirado/page.tsx
app/api/pedido/[id]/route.ts     — leitura enxuta do pedido (ver item 4)
```

Se houver trecho comum às três telas (moldura, título, botão), extrair para um
componente compartilhado. Mesmo cuidado do formulário: o design ainda não existe
e vai ser trocado depois, então nada de regra dentro do JSX.

---

## 3. `/checkout/sucesso`

A mais importante das três — é a última coisa que a pessoa vê depois de pagar.

### O que mostra
1. Confirmação de que o pagamento foi aprovado
2. Nome da pessoa (primeiro nome basta)
3. Plano assinado e valor
4. **Quando a primeira carta chega** — regra: assinou até o dia 20, recebe a
   edição do mês corrente; depois do dia 20, a primeira é a do mês seguinte.
   Buscar de `edicoes` a linha `status = 'aberta'` com `fechamento >= current_date`;
   se não houver, a próxima por `mes`.
5. **Link do grupo de WhatsApp** do plano assinado, com destaque de botão. Vem de
   `planos.link_comunidade`. Se for null, omitir o bloco inteiro.
6. Aviso curto de que o envelope é montado à mão e postado na última semana do mês

### O caso do webhook atrasado
A pessoa pode chegar aqui **antes** do webhook do Asaas ter processado a
ativação. Nesse caso o pedido ainda está com `status = 'iniciado'` e não existe
membro nem assinatura.

Isso não é erro e não pode parecer erro. Tratamento:
- Mostrar a confirmação normalmente (o pagamento foi aprovado, é o que a pessoa
  precisa saber)
- Buscar nome e plano do próprio `pedidos.dados_json`, que já tem tudo — não
  depender de `membros` existir
- O link da comunidade também sai de `planos`, então funciona igual

Ou seja: a página **nunca** deve depender da ativação ter acontecido. Ela lê o
pedido, não o membro.

### Sem `?pedido=` na URL, ou id inexistente
Mensagem genérica de "pagamento recebido", sem nome nem link, com um caminho de
contato. Nunca mostrar erro técnico nem tela quebrada.

---

## 4. `GET /api/pedido/[id]`

Rota de leitura para a página de sucesso.

Devolve **apenas**:
```json
{
  "primeiro_nome": "Joana",
  "plano_nome": "Plano Pêssego",
  "plano_slug": "pessego",
  "valor": 69.90,
  "link_comunidade": "https://chat.whatsapp.com/...",
  "primeira_edicao": { "nome": "Outubro — O Mundo", "fechamento": "2026-09-20" }
}
```

**Nunca** devolver CPF, e-mail, telefone, endereço completo nem o `dados_json`
inteiro. O id do pedido circula na URL e pode ser compartilhado sem querer —
o que sai daqui precisa ser inofensivo se vazar.

Id inexistente ou malformado → `404` com corpo genérico.

---

## 5. `/checkout/cancelado`

A pessoa desistiu no meio do checkout. Tom leve, sem culpa.

- Diz que nada foi cobrado
- Botão para voltar ao formulário, **mantendo o plano**: `/assinar?plano={slug}`
  (buscar o slug do pedido; sem pedido, mandar para `/assinar`)
- Link secundário para a home

---

## 6. `/checkout/expirado`

A sessão de checkout venceu (o Asaas expira em 24h).

- Explica que o link expirou e que basta começar de novo
- Mesmo botão de voltar com o plano preservado
- Sem tom de erro — é só um prazo que passou

---

## 7. Visual

Igual ao formulário: mínimo legível com Tailwind, coluna única, sem cores de
marca, sem fonte customizada. O design entra depois.

Na página de sucesso, o botão da comunidade deve ser o elemento mais evidente da
tela — é a única ação que a pessoa precisa tomar ali.

---

## 8. Como testar

1. Pegar um id de pedido pago no Supabase e abrir `/checkout/sucesso?pedido={id}`
2. Abrir `/checkout/sucesso` sem parâmetro → mensagem genérica, sem quebrar
3. Abrir com um uuid inventado → mesma mensagem genérica
4. `/checkout/cancelado?pedido={id}` → botão volta com o plano certo na URL
5. `/checkout/expirado?pedido={id}` → idem
6. Conferir na aba de rede que `/api/pedido/{id}` não devolve CPF, e-mail,
   telefone nem endereço
