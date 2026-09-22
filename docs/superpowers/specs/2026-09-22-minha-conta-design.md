# Área de membros (/minha-conta) — desenho

Etapa 6 do painel de administração do Clube 21. Continuação de
`spec-painel-admin.md`, que já deixou pronta a autenticação compartilhada
(magic link do Supabase Auth) pensando nesta área. Documento de trabalho —
leia inteiro antes de escrever código.

## Contexto

`/admin` está pronto e em produção (cinco telas). Esta é a segunda área
autenticada prevista desde o início: onde a assinante vê os próprios dados —
plano, endereço, pagamentos, envios e indicação. Só leitura nesta versão;
qualquer mudança continua sendo pedida por e-mail/WhatsApp, como hoje.

## Decisão de arquitetura: RLS de verdade, não service role

O painel admin usa a service role em tudo, porque várias tabelas relevantes
(`assinatura_eventos`, `produtos`) não têm policy de leitura pra admin — não
tinha escolha. Aqui é diferente: **o banco já tem policy própria** pra
`membros`, `assinaturas`, `enderecos`, `creditos` e `indicacoes`, todas no
mesmo formato:

```sql
membro_id IN (
  SELECT membros.id FROM membros WHERE membros.email = auth.jwt() ->> 'email'
)
```

(a de `membros` compara direto: `email = auth.jwt() ->> 'email'`)

Uso essas policies com o cliente de sessão normal (`lib/supabase/server.ts`,
`createClient()`) em vez da service role. Justificativa: um bug de filtro
aqui vaza o dado de uma cliente pra outra — muito pior do que um bug
equivalente no admin, onde quem vê tudo já é o dono do negócio. Com RLS de
verdade, o Postgres barra o vazamento mesmo que eu erre um filtro em
código.

Três tabelas que este documento usa **não têm** policy própria —
`pagamentos`, `envios`, `remessas` — só `admin_le_*` via `is_admin()`.
Pra essas, uso a service role, mas **nunca com um ID vindo do cliente**: só
com o `membro_id`/IDs de assinatura que eu já obtive por uma leitura com RLS
(prova de que são da própria pessoa). É a regra central deste desenho:
service role nunca decide "de quem é isso" sozinha, só busca informação
extra sobre algo que o RLS já confirmou ser da pessoa logada.

`planos` (nome do plano) também usa service role — não é dado privado da
pessoa, é catálogo, e a policy pública só libera `ativo = true` (um plano
que ela assinou e saiu de linha depois não apareceria pra ela via RLS
pública).

## Achado corrigido: e-mail sem lowercase no login

`components/auth/FormLogin.tsx` manda `email.trim()` pro
`signInWithOtp`, sem `.toLowerCase()`. No `/admin` isso nunca deu problema,
porque `ehAdmin()` compara case-insensitive (`ilike`). Aqui seria um bug
real: `membros.email` é sempre gravado em minúsculo (`ativar_membro` faz
`lower(...)`), e a policy de RLS compara exato
(`email = auth.jwt() ->> 'email'`). Uma assinante que digitasse o e-mail com
qualquer letra maiúscula entraria normalmente, mas veria a conta **vazia** —
sem erro nenhum, silencioso.

Correção: `FormLogin.tsx` passa a mandar `email.trim().toLowerCase()`.
Afeta os dois logins (admin e conta), inofensivo no admin, essencial aqui.

## Rotas

```
/minha-conta            a tela (só leitura)
/minha-conta/login      link mágico, reaproveita FormLogin
```

- `app/minha-conta/(protegido)/layout.tsx` — mesmo padrão do admin: sem
  sessão → redireciona pro login; com sessão mas sem linha em `membros` →
  404. A leitura de `membros` pelo guard *é* a query de autorização — não
  precisa de uma função tipo `ehAdmin()` separada, porque o RLS já filtra.
  Cabeçalho simples: nome da pessoa + botão Sair.
- `app/minha-conta/(protegido)/page.tsx` — a tela única, com as seções
  abaixo.
- `app/minha-conta/login/page.tsx` — fora do grupo protegido, mesmo motivo
  do `/admin/login` (evitar loop de redirect).
- `app/auth/confirm/route.ts` — resolve o TODO já existente no código: hoje
  o fallback de link inválido sempre volta pro `/admin/login`. Passa a
  decidir pelo prefixo de `next`: `/minha-conta` → `/minha-conta/login`,
  senão `/admin/login` (comportamento atual, preservado).

## Seções da tela e fonte de cada uma

| Seção | Fonte | Cliente | Observação |
|---|---|---|---|
| Dados de contato | `membros` | sessão (RLS) | nome, e-mail, telefone, CPF, código de indicação. Sem campos fiscais — mesma regra do admin. |
| Assinatura atual | `assinaturas` | sessão (RLS) | a mais recente por `criado_em`, mesma lógica do admin (pode haver mais de uma linha). Nome do plano via `planos` (service role). |
| Endereço | `enderecos` | sessão (RLS) | só leitura. |
| Histórico de pagamentos | `pagamentos` | service role, filtrado pelos IDs de `assinaturas` já lidos via RLS | hoje vazia em produção, mas o webhook já grava lá. |
| Envios | `envios` + `remessas` | service role, filtrado pelo `membro_id` já confirmado via RLS | junta os dois por `(membro_id, edicao_id)`: status de `envios`, rastreio/postado_em de `remessas` quando existir. |
| Indicação e créditos | `indicacoes` + `creditos` | sessão (RLS) | **sem nome de quem foi indicada** — só contagem por status (pendente/confirmada/cancelada) e os créditos de `creditos` (ciclo, percentual, status). Link pronto pra copiar: `${NEXT_PUBLIC_SITE_URL}/assinar?ref=<codigo_indicacao>`. |

## Estados vazios

- **Sem assinatura ativa** (cancelou, ou nunca chegou a pagar): mensagem
  "Você não tem uma assinatura ativa" + botão pra `/assinar`. As outras
  seções continuam aparecendo se tiverem dado (histórico de pagamento,
  envios passados).
- Sem pagamento registrado: "Nenhum pagamento registrado ainda."
- Sem envio registrado: "Nenhum envio registrado ainda."
- Sem indicação: "Você ainda não indicou ninguém" — o link pra copiar
  aparece sempre, com ou sem indicação.

## Visual

Mesmos tokens do projeto inteiro (não é uma paleta nova). A diferença fica
nos detalhes que dão a sensação de marca do `/assinar`, em vez da densidade
neutra do admin: títulos de seção em Gelica (fonte display), botão
principal na cor de ação (vermelho).

## Fora de escopo nesta versão

- Editar qualquer coisa (endereço, plano, forma de pagamento) — só leitura.
- Cancelar assinatura — as functions `confirmar_cancelamento` e
  `consultar_cancelamento` já existem no banco, prontas pra um fluxo de
  link por token (WF-4), mas não entram nesta tela.
- Trocar de plano — não existe function nem integração com a API do Asaas
  pra isso; ficaria pra uma etapa própria, se um dia for pedido.
- Nota fiscal — mesma regra do admin, campos fiscais ficam fora da
  interface.

## Verificação planejada

Diferente do admin (onde testar com a service role já bastava, porque ela
ignora RLS por definição e não prova isolamento nenhum), aqui a barreira
real é o RLS entre contas. Verificação:

1. `tsc --noEmit` e `next build` limpos, como sempre.
2. Gerar sessão real de duas assinantes de teste via
   `supabase.auth.admin.generateLink` + `verifyOtp`, só no servidor, sem
   mandar e-mail — pra ter um `access_token` de verdade de cada uma.
3. Com o cliente autenticado como assinante A, confirmar que as queries de
   cada seção trazem só os dados dela.
4. Com o mesmo cliente, tentar ler algo da assinante B (endereço, plano,
   créditos) e confirmar que vem vazio — a prova de isolamento que a
   verificação do admin não tinha como fazer.
5. Conferir a correção do e-mail: login com e-mail em maiúscula bate com a
   mesma linha de `membros` que o e-mail gravado em minúsculo.
