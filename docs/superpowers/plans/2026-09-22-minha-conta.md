# Área de membros (/minha-conta) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir `/minha-conta`, área só-leitura onde a assinante vê dados
de contato, assinatura atual, endereço, histórico de pagamentos, envios e
indicação/créditos — logada pelo mesmo magic link do `/admin`.

**Architecture:** Reaproveita a autenticação compartilhada já construída
(`lib/auth/usuario-atual.ts`, `components/auth/FormLogin.tsx`,
`app/auth/confirm/route.ts`). Diferente do painel admin (que usa a service
role em tudo), aqui a maior parte das leituras usa o cliente de sessão
normal (`lib/supabase/server.ts` → `createClient()`), que respeita as
policies de RLS "o membro vê só a própria linha" já existentes em
`membros`, `assinaturas`, `enderecos`, `creditos` e `indicacoes`. As três
tabelas sem policy própria (`pagamentos`, `envios`, `remessas`) usam a
service role, sempre filtradas por IDs já obtidos numa leitura com RLS —
nunca por um valor vindo do cliente.

**Tech Stack:** Next.js 16 (App Router, Server Components), Supabase
(`@supabase/ssr` + `@supabase/supabase-js`), TypeScript, Tailwind + tokens
do projeto (`styles/tokens.css`). Sem framework de teste automatizado no
projeto — verificação é `tsc --noEmit`, `next build`, e scripts Node
temporários batendo direto no Supabase real (mesmo padrão usado em todas as
etapas anteriores do painel admin).

Spec completo: `docs/superpowers/specs/2026-09-22-minha-conta-design.md`.

---

## Antes de começar

Branch de trabalho: **`revisao`**. Confirme que está nela:

```bash
git branch --show-current
```

Se não estiver, `git checkout revisao` primeiro. Nunca commitar direto na
`main` — cada task abaixo termina com commit na `revisao`; o push pra `main`
só acontece depois que o usuário validar no preview (fora deste plano).

---

## Task 1: Corrigir e-mail sem lowercase no login

**Files:**
- Modify: `components/auth/FormLogin.tsx:19`

- [ ] **Step 1: Aplicar a correção**

Em `components/auth/FormLogin.tsx`, a chamada a `signInWithOtp` manda
`email: email.trim()`. Troque para:

```tsx
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
```

(Só a linha do `email:` muda — o resto do bloco `options` continua igual.)

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add components/auth/FormLogin.tsx
git commit -m "auth: normaliza e-mail pra minúsculo antes do magic link

FormLogin só fazia trim(), sem lowercase. Inofensivo no /admin
(ehAdmin já compara case-insensitive), mas quebraria silenciosamente
o RLS de /minha-conta (comparação exata email = auth.jwt()->>'email')
se a pessoa digitasse o e-mail com alguma letra maiúscula: login
funcionaria, mas a conta apareceria vazia, sem erro nenhum."
```

---

## Task 2: Resolver o fallback de erro em app/auth/confirm/route.ts

**Files:**
- Modify: `app/auth/confirm/route.ts`

- [ ] **Step 1: Substituir o fallback fixo por uma decisão baseada no `next`**

Arquivo completo depois da mudança:

```ts
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback do link mágico do Supabase Auth (padrão oficial pro App Router):
 * o e-mail leva pra cá com token_hash + type, aqui trocamos por uma sessão
 * de verdade e mandamos a pessoa pra onde ela queria ir. Compartilhado
 * entre /admin e /minha-conta — nenhuma área tem callback próprio.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Só aceita caminho relativo de dentro do próprio site — nunca redireciona
  // pra fora. "next" chega via query string pública, então é entrada não
  // confiável (proteção contra open redirect).
  const nextBruto = searchParams.get("next");
  const next =
    nextBruto && nextBruto.startsWith("/") && !nextBruto.startsWith("//")
      ? nextBruto
      : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth] falha ao verificar token do link mágico", error);
  }

  // Link inválido/expirado: volta pro login de onde a pessoa veio. "next"
  // começando com /minha-conta manda pro login de lá; qualquer outro caso
  // (inclusive next="/", sem contexto) cai no login do admin, como sempre.
  const loginDestino = next.startsWith("/minha-conta")
    ? "/minha-conta/login"
    : "/admin/login";
  return NextResponse.redirect(`${origin}${loginDestino}?erro=link_invalido`);
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add app/auth/confirm/route.ts
git commit -m "auth: fallback de link inválido decide o login pelo next

Resolve o TODO deixado na etapa de auth: antes sempre voltava pro
/admin/login. Agora next começando com /minha-conta volta pro login
de lá; o resto continua indo pro admin, como já era."
```

---

## Task 3: Generalizar SairBotao (compartilhado entre /admin e /minha-conta)

**Files:**
- Create: `components/SairBotao.tsx`
- Delete: `components/admin/SairBotao.tsx` — não existe, é
  `app/admin/(protegido)/SairBotao.tsx` (confirmar abaixo)
- Modify: `app/admin/(protegido)/layout.tsx`

- [ ] **Step 1: Ler o arquivo atual pra confirmar o caminho exato**

```bash
cat "app/admin/(protegido)/SairBotao.tsx"
```

Esperado (conteúdo atual, pra conferência — não copie daqui, o Step 2 já
traz o texto final):

```tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SairBotao() {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[auth] erro ao sair", err);
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      className="text-sm font-medium text-[var(--c21-vermelho)] underline underline-offset-2"
    >
      Sair
    </button>
  );
}
```

- [ ] **Step 2: Criar a versão compartilhada, com `destino` como prop**

Criar `components/SairBotao.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Botão de sair, compartilhado entre /admin e /minha-conta — só muda o destino. */
export default function SairBotao({ destino }: { destino: string }) {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Não trava a navegação por causa disso — mesmo se o signOut falhar
      // (rede instável), o guard do servidor barra de novo se a sessão
      // ainda existir. Só loga pra não ficar sem rastro nenhum.
      console.error("[auth] erro ao sair", err);
    }
    router.replace(destino);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      className="text-sm font-medium text-[var(--c21-vermelho)] underline underline-offset-2"
    >
      Sair
    </button>
  );
}
```

- [ ] **Step 3: Apagar o arquivo antigo**

```bash
rm "app/admin/(protegido)/SairBotao.tsx"
```

- [ ] **Step 4: Atualizar o layout do admin pra usar a versão nova, com destino**

Em `app/admin/(protegido)/layout.tsx`, troque a linha de import:

```tsx
import SairBotao from "./SairBotao";
```

por:

```tsx
import SairBotao from "@/components/SairBotao";
```

E troque o uso (`<SairBotao />`, perto do fim do JSX) por:

```tsx
        <SairBotao destino="/admin/login" />
```

- [ ] **Step 5: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída. Se aparecer erro de import não resolvido em
`app/admin/(protegido)/layout.tsx`, confira se as duas trocas do Step 4
foram feitas (import E uso).

- [ ] **Step 6: Commit**

```bash
git add components/SairBotao.tsx "app/admin/(protegido)/SairBotao.tsx" "app/admin/(protegido)/layout.tsx"
git commit -m "admin+conta: generaliza SairBotao com destino, compartilhado

Só diferença entre /admin e /minha-conta era a URL de redirect após
sair — agora é uma prop em vez de duas cópias do componente."
```

(O `git add` do arquivo apagado registra a remoção — `git status` deve
mostrar `deleted:` pra ele e `new file:` pra `components/SairBotao.tsx`.)

---

## Task 4: Mover CopiarLink pra components/ (compartilhado)

**Files:**
- Create: `components/CopiarLink.tsx`
- Delete: `components/admin/CopiarLink.tsx`
- Modify: `app/admin/(protegido)/afiliadas/[id]/page.tsx`
- Modify: `components/admin/TabelaAfiliadas.tsx`

- [ ] **Step 1: Criar a versão compartilhada (conteúdo idêntico, só o local muda)**

Criar `components/CopiarLink.tsx`:

```tsx
"use client";

import { useState } from "react";

/** Link + botão de copiar — usado em /admin (afiliadas) e /minha-conta (indicação). */
export default function CopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard API pode falhar (permissão, contexto não seguro) — sem
      // fallback: a pessoa ainda pode selecionar e copiar o texto à mão.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="truncate rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel-fundo)] px-2 py-1 text-xs text-[var(--c21-tinta)]">
        {link}
      </code>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-2 py-1 text-xs text-[var(--c21-tinta)] hover:bg-[var(--c21-papel-fundo)]"
      >
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Apagar o arquivo antigo**

```bash
rm components/admin/CopiarLink.tsx
```

- [ ] **Step 3: Atualizar os dois import sites**

Em `app/admin/(protegido)/afiliadas/[id]/page.tsx`, troque:

```tsx
import CopiarLink from "@/components/admin/CopiarLink";
```

por:

```tsx
import CopiarLink from "@/components/CopiarLink";
```

Em `components/admin/TabelaAfiliadas.tsx`, troque:

```tsx
import CopiarLink from "./CopiarLink";
```

por:

```tsx
import CopiarLink from "@/components/CopiarLink";
```

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 5: Commit**

```bash
git add components/CopiarLink.tsx components/admin/CopiarLink.tsx "app/admin/(protegido)/afiliadas/[id]/page.tsx" components/admin/TabelaAfiliadas.tsx
git commit -m "admin+conta: move CopiarLink pra components/, compartilhado

Sem lógica específica de admin — /minha-conta vai reusar pro link de
indicação."
```

---

## Task 5: Mover SeloStatus pra components/ (compartilhado)

**Files:**
- Create: `components/SeloStatus.tsx`
- Delete: `components/admin/SeloStatus.tsx`
- Modify: `app/admin/(protegido)/afiliadas/[id]/page.tsx`
- Modify: `app/admin/(protegido)/membras/[id]/page.tsx`
- Modify: `components/admin/TabelaMembras.tsx`

- [ ] **Step 1: Criar a versão compartilhada**

Criar `components/SeloStatus.tsx`:

```tsx
const CORES: Record<string, string> = {
  ativa: "var(--c21-sucesso)",
  suspensa: "var(--c21-laranja)",
  cancelada: "var(--c21-erro)",
};

/** Selo colorido pro status da assinatura (ativa/suspensa/cancelada) — usado em /admin e /minha-conta. */
export default function SeloStatus({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-sm text-[var(--c21-tinta-suave)]">—</span>;
  }
  const cor = CORES[status] ?? "var(--c21-tinta-suave)";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--c21-tinta)]">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: cor }}
      />
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Apagar o arquivo antigo**

```bash
rm components/admin/SeloStatus.tsx
```

- [ ] **Step 3: Atualizar os três import sites**

Em `app/admin/(protegido)/afiliadas/[id]/page.tsx` e em
`app/admin/(protegido)/membras/[id]/page.tsx`, troque:

```tsx
import SeloStatus from "@/components/admin/SeloStatus";
```

por:

```tsx
import SeloStatus from "@/components/SeloStatus";
```

Em `components/admin/TabelaMembras.tsx`, troque:

```tsx
import SeloStatus from "./SeloStatus";
```

por:

```tsx
import SeloStatus from "@/components/SeloStatus";
```

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 5: Commit**

```bash
git add components/SeloStatus.tsx components/admin/SeloStatus.tsx "app/admin/(protegido)/afiliadas/[id]/page.tsx" "app/admin/(protegido)/membras/[id]/page.tsx" components/admin/TabelaMembras.tsx
git commit -m "admin+conta: move SeloStatus pra components/, compartilhado

Mesmo motivo do CopiarLink — status de assinatura não é conceito de
admin, /minha-conta também mostra."
```

---

## Task 6: lib/conta/formato.ts

**Files:**
- Create: `lib/conta/formato.ts`

- [ ] **Step 1: Criar o formatador de data**

```ts
/** Formatação de data usada em /minha-conta — independente de lib/admin/formato.ts de propósito (namespaces separados). */

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatarDataConta(iso: string): string {
  return formatadorData.format(new Date(iso));
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída (arquivo ainda não é importado por ninguém, só precisa
compilar sozinho).

- [ ] **Step 3: Commit**

```bash
git add lib/conta/formato.ts
git commit -m "conta: formatador de data de /minha-conta"
```

---

## Task 7: lib/conta/dados.ts — a busca de dados

Esta é a peça central. Todo o resto da tela depende deste arquivo.

**Files:**
- Create: `lib/conta/dados.ts`

- [ ] **Step 1: Escrever o arquivo completo**

```ts
import { cache } from "react";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Dados de /minha-conta. Duas fontes por design (ver
 * docs/superpowers/specs/2026-09-22-minha-conta-design.md):
 *
 * - `membros`, `assinaturas`, `enderecos`, `creditos`, `indicacoes` têm
 *   policy própria de RLS ("o membro vê só a própria linha") — uso o
 *   cliente de sessão (createClient), sem filtro manual: o RLS já garante
 *   que só a linha da pessoa logada volta.
 * - `pagamentos`, `envios`, `remessas` não têm policy própria — uso a
 *   service role, mas SEMPRE filtrada pelo `membro.id` ou pelos IDs de
 *   `assinaturas` que já vieram de uma leitura com RLS acima. Nunca um
 *   valor vindo de fora.
 *
 * Envolvido em `cache()` (memoização de request do React/Next): o layout
 * chama isto pro guard, a página chama de novo pro conteúdo — as duas
 * chamadas viram uma consulta só dentro do mesmo request.
 */

export type MembroConta = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  codigoIndicacao: string;
};

export type AssinaturaConta = {
  planoNome: string;
  status: string;
  valor: number;
  billingType: string | null;
  proximaCobranca: string | null;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
};

export type EnderecoConta = {
  cep: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string | null;
  cidade: string;
  uf: string | null;
  pais: string;
  pontoReferencia: string | null;
};

export type PagamentoConta = {
  id: string;
  valor: number;
  status: string;
  vencimento: string | null;
  pagoEm: string | null;
};

export type EnvioConta = {
  edicaoNome: string | null;
  edicaoMes: string;
  status: string;
  rastreio: string | null;
  postadoEm: string | null;
};

export type IndicacoesConta = {
  pendentes: number;
  confirmadas: number;
  canceladas: number;
};

export type CreditoConta = {
  cicloRef: string;
  percentual: number;
  status: string;
  aplicadoEm: string | null;
};

export type DadosConta = {
  membro: MembroConta;
  assinatura: AssinaturaConta | null;
  endereco: EnderecoConta | null;
  pagamentos: PagamentoConta[];
  envios: EnvioConta[];
  indicacoes: IndicacoesConta;
  creditos: CreditoConta[];
  linkIndicacao: string;
};

function linkIndicacao(codigo: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://clubexxi.com.br";
  return `${base}/assinar?ref=${encodeURIComponent(codigo)}`;
}

export const buscarDadosConta = cache(async (): Promise<DadosConta | null> => {
  const supabase = await createClient();

  // Sem .eq() de propósito: a policy de RLS de `membros`
  // (email = auth.jwt() ->> 'email') já garante que só a própria linha
  // pode voltar aqui, pra qualquer pessoa autenticada.
  const membroRes = await supabase
    .from("membros")
    .select("id, nome, email, telefone, cpf, codigo_indicacao")
    .maybeSingle();

  if (membroRes.error) {
    throw new Error(`[minha-conta] falha ao ler membro: ${membroRes.error.message}`);
  }
  if (!membroRes.data) return null; // guard: sem linha em membros -> 404

  const membro: MembroConta = {
    id: membroRes.data.id,
    nome: membroRes.data.nome,
    email: membroRes.data.email,
    telefone: membroRes.data.telefone,
    cpf: membroRes.data.cpf,
    codigoIndicacao: membroRes.data.codigo_indicacao,
  };

  const [assinaturasRes, enderecoRes, indicacoesRes, creditosRes] = await Promise.all([
    supabase
      .from("assinaturas")
      .select("id, plano_slug, status, valor, billing_type, proxima_cobranca, criado_em, cancelada_em, motivo_cancelamento")
      .order("criado_em", { ascending: false }),
    supabase
      .from("enderecos")
      .select("cep, logradouro, numero, complemento, bairro, cidade, uf, pais, ponto_referencia")
      .maybeSingle(),
    supabase.from("indicacoes").select("status"),
    supabase
      .from("creditos")
      .select("ciclo_ref, percentual, status, aplicado_em")
      .order("ciclo_ref", { ascending: false }),
  ]);

  for (const [rotulo, res] of [
    ["assinaturas", assinaturasRes],
    ["endereço", enderecoRes],
    ["indicações", indicacoesRes],
    ["créditos", creditosRes],
  ] as const) {
    if (res.error) {
      throw new Error(`[minha-conta] falha ao ler ${rotulo}: ${res.error.message}`);
    }
  }

  const assinaturas = assinaturasRes.data ?? [];
  const atual = assinaturas[0] ?? null;

  let assinatura: AssinaturaConta | null = null;
  if (atual) {
    // Nome do plano: service role, de propósito — não é dado privado da
    // pessoa, é catálogo. A policy pública de `planos` só libera
    // ativo=true, e um plano que ela assinou pode ter saído de linha
    // depois.
    const servico = createServiceClient();
    const planoRes = await servico.from("planos").select("nome").eq("slug", atual.plano_slug).maybeSingle();
    if (planoRes.error) {
      throw new Error(`[minha-conta] falha ao ler plano: ${planoRes.error.message}`);
    }
    assinatura = {
      planoNome: planoRes.data?.nome ?? atual.plano_slug,
      status: atual.status,
      valor: Number(atual.valor),
      billingType: atual.billing_type,
      proximaCobranca: atual.proxima_cobranca,
      canceladaEm: atual.cancelada_em,
      motivoCancelamento: atual.motivo_cancelamento,
    };
  }

  const endereco: EnderecoConta | null = enderecoRes.data
    ? {
        cep: enderecoRes.data.cep,
        logradouro: enderecoRes.data.logradouro,
        numero: enderecoRes.data.numero,
        complemento: enderecoRes.data.complemento,
        bairro: enderecoRes.data.bairro,
        cidade: enderecoRes.data.cidade,
        uf: enderecoRes.data.uf,
        pais: enderecoRes.data.pais,
        pontoReferencia: enderecoRes.data.ponto_referencia,
      }
    : null;

  const indicacoes: IndicacoesConta = { pendentes: 0, confirmadas: 0, canceladas: 0 };
  for (const i of indicacoesRes.data ?? []) {
    if (i.status === "pendente") indicacoes.pendentes += 1;
    else if (i.status === "confirmada") indicacoes.confirmadas += 1;
    else if (i.status === "cancelada") indicacoes.canceladas += 1;
  }

  const creditos: CreditoConta[] = (creditosRes.data ?? []).map((c) => ({
    cicloRef: c.ciclo_ref,
    percentual: c.percentual,
    status: c.status,
    aplicadoEm: c.aplicado_em,
  }));

  // pagamentos e envios/remessas: sem policy de RLS própria, service role
  // com filtro nos IDs que já vieram das leituras com RLS acima (assinaturas
  // e membro.id) — nunca um ID vindo de fora.
  const servico = createServiceClient();
  const idsAssinatura = assinaturas.map((a) => a.id);

  const [enviosRes, remessasRes] = await Promise.all([
    servico
      .from("envios")
      .select("edicao_id, status, edicoes(nome, mes)")
      .eq("membro_id", membro.id),
    servico
      .from("remessas")
      .select("edicao_id, rastreio, postado_em")
      .eq("membro_id", membro.id),
  ]);

  for (const [rotulo, res] of [
    ["envios", enviosRes],
    ["remessas", remessasRes],
  ] as const) {
    if (res.error) {
      throw new Error(`[minha-conta] falha ao ler ${rotulo}: ${res.error.message}`);
    }
  }

  // Query separada (não dentro do Promise.all acima) pra evitar misturar,
  // no mesmo array, uma query real com um valor literal — mais simples de
  // tipar e de ler.
  const pagamentosRes =
    idsAssinatura.length > 0
      ? await servico
          .from("pagamentos")
          .select("id, valor, status, vencimento, pago_em")
          .in("assinatura_id", idsAssinatura)
          .order("vencimento", { ascending: false })
      : { data: [] as { id: string; valor: number; status: string; vencimento: string | null; pago_em: string | null }[], error: null };

  if (pagamentosRes.error) {
    throw new Error(`[minha-conta] falha ao ler pagamentos: ${pagamentosRes.error.message}`);
  }

  const pagamentos: PagamentoConta[] = (pagamentosRes.data ?? []).map((p) => ({
    id: p.id,
    valor: Number(p.valor),
    status: p.status,
    vencimento: p.vencimento,
    pagoEm: p.pago_em,
  }));

  type EdicaoAninhada = { nome: string | null; mes: string } | { nome: string | null; mes: string }[] | null;
  function primeiraEdicao(e: EdicaoAninhada): { nome: string | null; mes: string } | null {
    if (!e) return null;
    return Array.isArray(e) ? (e[0] ?? null) : e;
  }

  const remessaPorEdicao = new Map(
    (remessasRes.data ?? []).map((r) => [r.edicao_id, { rastreio: r.rastreio, postadoEm: r.postado_em }]),
  );

  const envios: EnvioConta[] = ((enviosRes.data ?? []) as unknown as {
    edicao_id: string;
    status: string;
    edicoes: EdicaoAninhada;
  }[])
    .map((e) => {
      const edicao = primeiraEdicao(e.edicoes);
      const remessa = remessaPorEdicao.get(e.edicao_id);
      return {
        edicaoNome: edicao?.nome ?? null,
        edicaoMes: edicao?.mes ?? "",
        status: e.status,
        rastreio: remessa?.rastreio ?? null,
        postadoEm: remessa?.postadoEm ?? null,
      };
    })
    .sort((a, b) => (a.edicaoMes < b.edicaoMes ? 1 : -1));

  return {
    membro,
    assinatura,
    endereco,
    pagamentos,
    envios,
    indicacoes,
    creditos,
    linkIndicacao: linkIndicacao(membro.codigoIndicacao),
  };
});
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add lib/conta/dados.ts
git commit -m "conta: busca de dados de /minha-conta

RLS de verdade (cliente de sessão) em membros/assinaturas/enderecos/
creditos/indicacoes. Service role só em pagamentos/envios/remessas
(sem policy própria), sempre filtrada por IDs já confirmados via RLS.
cache() do React memoiza a chamada dentro do mesmo request — o guard
do layout e a página usam a mesma consulta."
```

---

## Task 8: app/minha-conta/login/page.tsx

**Files:**
- Create: `app/minha-conta/login/page.tsx`

- [ ] **Step 1: Escrever a página, espelhando app/admin/login/page.tsx**

```tsx
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { buscarDadosConta } from "@/lib/conta/dados";
import FormLogin from "@/components/auth/FormLogin";

// Fica fora de app/minha-conta/(protegido) de propósito: se entrar no route
// group protegido, quem está deslogado nunca alcança esta página pra fazer
// login (o guard redireciona pra cá, e essa página redirecionaria de volta
// — loop). Mesmo motivo do /admin/login.
export default async function PaginaLoginConta() {
  const usuario = await usuarioAtual();
  if (usuario && (await buscarDadosConta())) {
    redirect("/minha-conta");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1
        className="text-xl font-normal text-[var(--c21-tinta)]"
        style={{ fontFamily: "var(--c21-fonte-display)" }}
      >
        Minha conta — Clube 21
      </h1>
      <FormLogin next="/minha-conta" />
    </main>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add app/minha-conta/login/page.tsx
git commit -m "conta: tela de login de /minha-conta, mesmo FormLogin do admin"
```

---

## Task 9: app/minha-conta/(protegido)/layout.tsx — o guard

**Files:**
- Create: `app/minha-conta/(protegido)/layout.tsx`

- [ ] **Step 1: Escrever o layout**

```tsx
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { buscarDadosConta } from "@/lib/conta/dados";
import SairBotao from "@/components/SairBotao";

/**
 * Guard de tudo sob /minha-conta (exceto /minha-conta/login, que fica fora
 * deste route group de propósito — mesmo motivo do admin: evita loop de
 * redirect). Sem sessão -> volta pro login. Com sessão mas sem linha em
 * `membros` -> 404, não uma mensagem dizendo que a área existe (mesma
 * regra do admin, spec-painel-admin.md).
 *
 * buscarDadosConta() faz dupla função aqui: é a checagem de autorização
 * (existe linha em membros?) E já busca os dados que a página vai
 * precisar — graças ao cache(), as duas chamadas (guard + página) viram
 * uma consulta só.
 */
export default async function LayoutContaProtegido({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/minha-conta/login");
  const dados = await buscarDadosConta();
  if (!dados) notFound();

  return (
    <div className="min-h-screen bg-[var(--c21-papel-fundo)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c21-linha)] bg-[var(--c21-papel)] px-6 py-3">
        <span
          className="text-sm font-normal text-[var(--c21-tinta)]"
          style={{ fontFamily: "var(--c21-fonte-display)" }}
        >
          Olá, {dados.membro.nome.split(" ")[0]}
        </span>
        <SairBotao destino="/minha-conta/login" />
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add "app/minha-conta/(protegido)/layout.tsx"
git commit -m "conta: guard de /minha-conta — sessão + linha em membros"
```

---

## Task 10: components/conta/Bloco.tsx e components/conta/Campo.tsx

**Files:**
- Create: `components/conta/Bloco.tsx`
- Create: `components/conta/Campo.tsx`

- [ ] **Step 1: Criar Bloco.tsx**

```tsx
import type { ReactNode } from "react";

/** Cartão de seção de /minha-conta — título em Gelica, mesma linguagem visual do /assinar. */
export default function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <h2
        className="text-sm font-normal text-[var(--c21-tinta)]"
        style={{ fontFamily: "var(--c21-fonte-display)", fontSize: "1.05rem" }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 2: Criar Campo.tsx**

```tsx
import type { ReactNode } from "react";

/** Linha rótulo/valor dentro de um Bloco de /minha-conta. */
export default function Campo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-[var(--c21-tinta-suave)]">{rotulo}</dt>
      <dd className="text-right text-[var(--c21-tinta)]">{valor}</dd>
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 4: Commit**

```bash
git add components/conta/Bloco.tsx components/conta/Campo.tsx
git commit -m "conta: componentes de base (Bloco, Campo) das seções de /minha-conta"
```

---

## Task 11: components/conta/SecaoContato.tsx

**Files:**
- Create: `components/conta/SecaoContato.tsx`

- [ ] **Step 1: Escrever o componente**

```tsx
import type { MembroConta } from "@/lib/conta/dados";
import Bloco from "./Bloco";
import Campo from "./Campo";

export default function SecaoContato({ membro }: { membro: MembroConta }) {
  return (
    <Bloco titulo="Seus dados">
      <dl className="flex flex-col gap-2">
        <Campo rotulo="Nome" valor={membro.nome} />
        <Campo rotulo="E-mail" valor={membro.email} />
        <Campo rotulo="Telefone" valor={membro.telefone ?? "—"} />
        <Campo rotulo="CPF" valor={membro.cpf ?? "—"} />
      </dl>
    </Bloco>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add components/conta/SecaoContato.tsx
git commit -m "conta: seção Seus dados"
```

---

## Task 12: components/conta/SecaoAssinatura.tsx

**Files:**
- Create: `components/conta/SecaoAssinatura.tsx`

- [ ] **Step 1: Escrever o componente**

```tsx
import Link from "next/link";
import type { AssinaturaConta } from "@/lib/conta/dados";
import { formatarValor } from "@/lib/formatacao";
import { formatarDataConta } from "@/lib/conta/formato";
import SeloStatus from "@/components/SeloStatus";
import Bloco from "./Bloco";
import Campo from "./Campo";

const ROTULO_PAGAMENTO: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  PIX: "Pix",
  BOLETO: "Boleto",
};

/** Assinatura ativa é status "ativa" — suspensa/cancelada caem no aviso de "sem assinatura ativa". */
export default function SecaoAssinatura({ assinatura }: { assinatura: AssinaturaConta | null }) {
  const ativa = assinatura?.status === "ativa";

  if (!ativa) {
    return (
      <Bloco titulo="Sua assinatura">
        <p className="text-sm text-[var(--c21-tinta)]">
          Você não tem uma assinatura ativa no momento.
        </p>
        <Link
          href="/assinar"
          className="self-start rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-2 text-sm font-bold text-[var(--c21-papel)]"
        >
          Assinar de novo
        </Link>
      </Bloco>
    );
  }

  return (
    <Bloco titulo="Sua assinatura">
      <dl className="flex flex-col gap-2">
        <Campo rotulo="Plano" valor={assinatura.planoNome} />
        <Campo rotulo="Status" valor={<SeloStatus status={assinatura.status} />} />
        <Campo rotulo="Valor" valor={formatarValor(assinatura.valor)} />
        <Campo
          rotulo="Forma de pagamento"
          valor={
            assinatura.billingType
              ? (ROTULO_PAGAMENTO[assinatura.billingType] ?? assinatura.billingType)
              : "—"
          }
        />
        <Campo
          rotulo="Próxima cobrança"
          valor={assinatura.proximaCobranca ? formatarDataConta(assinatura.proximaCobranca) : "—"}
        />
      </dl>
    </Bloco>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add components/conta/SecaoAssinatura.tsx
git commit -m "conta: seção Sua assinatura, com aviso de assinatura inativa"
```

---

## Task 13: components/conta/SecaoEndereco.tsx

**Files:**
- Create: `components/conta/SecaoEndereco.tsx`

- [ ] **Step 1: Escrever o componente**

```tsx
import type { EnderecoConta } from "@/lib/conta/dados";
import { nomeDoPais } from "@/lib/paises";
import Bloco from "./Bloco";

export default function SecaoEndereco({ endereco }: { endereco: EnderecoConta | null }) {
  return (
    <Bloco titulo="Endereço de entrega">
      {endereco ? (
        <p className="text-sm leading-relaxed text-[var(--c21-tinta)]">
          {endereco.logradouro}, {endereco.numero}
          {endereco.complemento ? ` — ${endereco.complemento}` : ""}
          <br />
          {endereco.bairro ? `${endereco.bairro} — ` : ""}
          {endereco.cidade}
          {endereco.uf ? `/${endereco.uf}` : ""}
          <br />
          CEP {endereco.cep ?? "—"} — {nomeDoPais(endereco.pais)}
          {endereco.pontoReferencia && (
            <>
              <br />
              Referência: {endereco.pontoReferencia}
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Sem endereço cadastrado.</p>
      )}
    </Bloco>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add components/conta/SecaoEndereco.tsx
git commit -m "conta: seção Endereço de entrega"
```

---

## Task 14: components/conta/SecaoPagamentos.tsx

**Files:**
- Create: `components/conta/SecaoPagamentos.tsx`

- [ ] **Step 1: Escrever o componente**

```tsx
import type { PagamentoConta } from "@/lib/conta/dados";
import { formatarValor } from "@/lib/formatacao";
import { formatarDataConta } from "@/lib/conta/formato";
import Bloco from "./Bloco";

const ROTULO_STATUS: Record<string, string> = {
  CONFIRMED: "Pago",
  RECEIVED: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Atrasado",
  REFUNDED: "Estornado",
};

export default function SecaoPagamentos({ pagamentos }: { pagamentos: PagamentoConta[] }) {
  return (
    <Bloco titulo="Histórico de pagamentos">
      {pagamentos.length === 0 ? (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhum pagamento registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pagamentos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 border-b border-[var(--c21-linha)] pb-2 text-sm last:border-0"
            >
              <span className="text-[var(--c21-tinta-suave)]">
                {p.vencimento ? formatarDataConta(p.vencimento) : "—"}
              </span>
              <span className="text-[var(--c21-tinta)]">{formatarValor(p.valor)}</span>
              <span className="text-[var(--c21-tinta-suave)]">
                {ROTULO_STATUS[p.status] ?? p.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add components/conta/SecaoPagamentos.tsx
git commit -m "conta: seção Histórico de pagamentos"
```

---

## Task 15: components/conta/SecaoEnvios.tsx

**Files:**
- Create: `components/conta/SecaoEnvios.tsx`

- [ ] **Step 1: Escrever o componente**

```tsx
import type { EnvioConta } from "@/lib/conta/dados";
import { formatarDataConta } from "@/lib/conta/formato";
import Bloco from "./Bloco";

const ROTULO_STATUS: Record<string, string> = {
  previsto: "Prevista",
  enviado: "Enviada",
  cancelado: "Cancelada",
};

export default function SecaoEnvios({ envios }: { envios: EnvioConta[] }) {
  return (
    <Bloco titulo="Envios">
      {envios.length === 0 ? (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhum envio registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {envios.map((e, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 border-b border-[var(--c21-linha)] pb-2 text-sm last:border-0"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--c21-tinta)]">{e.edicaoNome ?? e.edicaoMes}</span>
                <span className="text-[var(--c21-tinta-suave)]">
                  {ROTULO_STATUS[e.status] ?? e.status}
                </span>
              </div>
              {e.rastreio && (
                <span className="text-xs text-[var(--c21-tinta-suave)]">
                  Rastreio: {e.rastreio}
                  {e.postadoEm ? ` — postado em ${formatarDataConta(e.postadoEm)}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add components/conta/SecaoEnvios.tsx
git commit -m "conta: seção Envios"
```

---

## Task 16: components/conta/SecaoIndicacao.tsx

**Files:**
- Create: `components/conta/SecaoIndicacao.tsx`

- [ ] **Step 1: Escrever o componente**

```tsx
import type { IndicacoesConta, CreditoConta } from "@/lib/conta/dados";
import CopiarLink from "@/components/CopiarLink";
import Bloco from "./Bloco";

const ROTULO_CREDITO: Record<string, string> = {
  previsto: "Previsto",
  aplicado: "Aplicado",
  expirado: "Expirado",
  falhou: "Falhou",
};

export default function SecaoIndicacao({
  link,
  indicacoes,
  creditos,
}: {
  link: string;
  indicacoes: IndicacoesConta;
  creditos: CreditoConta[];
}) {
  const total = indicacoes.pendentes + indicacoes.confirmadas + indicacoes.canceladas;

  return (
    <Bloco titulo="Indicação">
      <p className="text-sm text-[var(--c21-tinta)]">
        Cada amiga que assinar com o seu link vira desconto no mês seguinte — 1 = 25%, 2 = 50%, 3 = 75%, 4 = mês grátis.
      </p>
      <CopiarLink link={link} />

      {total === 0 ? (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Você ainda não indicou ninguém.</p>
      ) : (
        <p className="text-sm text-[var(--c21-tinta-suave)]">
          {indicacoes.confirmadas} confirmada{indicacoes.confirmadas === 1 ? "" : "s"}
          {indicacoes.pendentes > 0 && ` · ${indicacoes.pendentes} pendente${indicacoes.pendentes === 1 ? "" : "s"}`}
          {indicacoes.canceladas > 0 && ` · ${indicacoes.canceladas} cancelada${indicacoes.canceladas === 1 ? "" : "s"}`}
        </p>
      )}

      {creditos.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-[var(--c21-linha)] pt-2">
          {creditos.map((c, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-[var(--c21-tinta-suave)]">{c.cicloRef}</span>
              <span className="text-[var(--c21-tinta)]">{c.percentual}%</span>
              <span className="text-[var(--c21-tinta-suave)]">{ROTULO_CREDITO[c.status] ?? c.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add components/conta/SecaoIndicacao.tsx
git commit -m "conta: seção Indicação e créditos"
```

---

## Task 17: app/minha-conta/(protegido)/page.tsx — compõe tudo

**Files:**
- Create: `app/minha-conta/(protegido)/page.tsx`

- [ ] **Step 1: Escrever a página**

```tsx
import { buscarDadosConta } from "@/lib/conta/dados";
import SecaoContato from "@/components/conta/SecaoContato";
import SecaoAssinatura from "@/components/conta/SecaoAssinatura";
import SecaoEndereco from "@/components/conta/SecaoEndereco";
import SecaoPagamentos from "@/components/conta/SecaoPagamentos";
import SecaoEnvios from "@/components/conta/SecaoEnvios";
import SecaoIndicacao from "@/components/conta/SecaoIndicacao";

// A tela única de /minha-conta — spec em
// docs/superpowers/specs/2026-09-22-minha-conta-design.md. buscarDadosConta()
// já rodou uma vez no layout (guard); graças ao cache(), esta chamada não
// bate no banco de novo.
export default async function PaginaConta() {
  const dados = await buscarDadosConta();
  // O layout já garante que dados não é null (senão dá notFound() antes de
  // chegar aqui) — o "!" documenta essa garantia pro TypeScript.
  const { membro, assinatura, endereco, pagamentos, envios, indicacoes, creditos, linkIndicacao } =
    dados!;

  return (
    <>
      <SecaoContato membro={membro} />
      <SecaoAssinatura assinatura={assinatura} />
      <SecaoEndereco endereco={endereco} />
      <SecaoPagamentos pagamentos={pagamentos} />
      <SecaoEnvios envios={envios} />
      <SecaoIndicacao link={linkIndicacao} indicacoes={indicacoes} creditos={creditos} />
    </>
  );
}
```

- [ ] **Step 2: Verificar**

```bash
npx tsc --noEmit
```

Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add "app/minha-conta/(protegido)/page.tsx"
git commit -m "conta: página de /minha-conta, compõe as seis seções"
```

---

## Task 18: Build de produção

**Files:** nenhum (só verificação)

- [ ] **Step 1: Rodar o build completo**

```bash
npx next build
```

Esperado: `✓ Compiled successfully`, sem erro de TypeScript, e a listagem de
rotas deve incluir:

```
├ ƒ /minha-conta
├ ƒ /minha-conta/login
```

- [ ] **Step 2: Se algo falhar**

Erros de "importing a module that depends on next/headers... Client
Component" indicam que algum componente de cliente (`"use client"`) importou
`lib/conta/dados.ts` diretamente (ou um tipo não-`type` de lá). Nenhum dos
componentes de `components/conta/` precisa ser `"use client"` — todos são
Server Components recebendo dados já prontos via prop. Se isso acontecer,
confira se alguma das Secoes ganhou `"use client"` sem necessidade, ou se
algum import de tipo esqueceu a palavra `type` (`import type { X } from
"@/lib/conta/dados"`, nunca `import { X, ... }` quando X é só tipo).

Não commitar nada nesta task — é só checagem.

---

## Task 19: Verificação de isolamento de RLS entre duas contas reais

Esta é a verificação que prova que a decisão de arquitetura (RLS em vez de
service role) funciona de verdade — diferente de rodar com a service role,
que nunca provaria isolamento nenhum.

**Files:** nenhum arquivo do projeto — script temporário, apagado no fim.

- [ ] **Step 1: Escrever o script de verificação**

Criar `_verificar_rls_conta_tmp.mjs` na raiz do projeto:

```js
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      v = v.replace(/^\\\$/, "$");
      return [l.slice(0, i).trim(), v];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: membros, error: eMembros } = await admin
  .from("membros")
  .select("id, email, nome")
  .order("criado_em", { ascending: true })
  .limit(2);
if (eMembros) throw eMembros;
if (membros.length < 2) throw new Error("precisa de pelo menos 2 membros reais pra este teste");

const [membroA, membroB] = membros;
console.log("Testando com:", membroA.email, "x", membroB.email);

// Gera uma sessão de verdade pra cada um, sem mandar e-mail nenhum —
// generateLink() é uma chamada admin (service role), só cria o token.
async function sessaoPara(email) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;
  const hashedToken = data.properties.hashed_token;

  const cliente = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: erroVerify } = await cliente.auth.verifyOtp({
    type: "email",
    token_hash: hashedToken,
  });
  if (erroVerify) throw erroVerify;
  return cliente;
}

const clienteA = await sessaoPara(membroA.email);
const clienteB = await sessaoPara(membroB.email);

// 1) A lê a própria linha em membros
const { data: proprioA, error: e1 } = await clienteA.from("membros").select("id, nome, email").maybeSingle();
if (e1) throw e1;
console.log("1) A lê a própria linha em membros:", proprioA?.email === membroA.email ? "OK" : "FALHOU", proprioA);

// 2) A tenta ler a linha de B pelo id dela, direto
const { data: cruzadoMembros, error: e2 } = await clienteA.from("membros").select("id").eq("id", membroB.id);
if (e2) throw e2;
console.log(
  "2) A tentando ler a linha de B em membros (esperado: 0 linhas):",
  cruzadoMembros.length === 0 ? "OK" : "FALHOU — VAZAMENTO",
  cruzadoMembros,
);

// 3) A tenta ler assinaturas de B
const { data: assinaturasB } = await admin.from("assinaturas").select("id").eq("membro_id", membroB.id).limit(1);
if (assinaturasB && assinaturasB.length > 0) {
  const { data: cruzadoAssin, error: e3 } = await clienteA
    .from("assinaturas")
    .select("id")
    .eq("id", assinaturasB[0].id);
  if (e3) throw e3;
  console.log(
    "3) A tentando ler assinatura de B (esperado: 0 linhas):",
    cruzadoAssin.length === 0 ? "OK" : "FALHOU — VAZAMENTO",
    cruzadoAssin,
  );
} else {
  console.log("3) B não tem assinatura pra testar — pulado");
}

// 4) A tenta ler endereço de B
const { data: enderecoB } = await admin.from("enderecos").select("id").eq("membro_id", membroB.id).maybeSingle();
if (enderecoB) {
  const { data: cruzadoEnd, error: e4 } = await clienteA.from("enderecos").select("id").eq("id", enderecoB.id);
  if (e4) throw e4;
  console.log(
    "4) A tentando ler endereço de B (esperado: 0 linhas):",
    cruzadoEnd.length === 0 ? "OK" : "FALHOU — VAZAMENTO",
    cruzadoEnd,
  );
} else {
  console.log("4) B não tem endereço pra testar — pulado");
}

// 5) B lê a própria linha (confirma que a sessão de B também funciona, não só a de A)
const { data: proprioB, error: e5 } = await clienteB.from("membros").select("id, email").maybeSingle();
if (e5) throw e5;
console.log("5) B lê a própria linha em membros:", proprioB?.email === membroB.email ? "OK" : "FALHOU", proprioB);

// 6) O ponto que motivou a correção da Task 1: gera uma sessão pro e-mail
// de A digitado em maiúsculo, e confere se ainda bate com a linha dele em
// `membros` (gravada em minúsculo por ativar_membro). Isto testa se o
// achado é real (Supabase Auth pode já normalizar e-mail sozinho) — a
// Task 1 fica de qualquer jeito, como defesa, mas o resultado aqui diz se
// o cenário descrito no spec de fato acontecia sem ela.
const emailMaiusculo = membroA.email.toUpperCase();
const clienteMaiusculo = await sessaoPara(emailMaiusculo);
const { data: viaMaiusculo, error: e6 } = await clienteMaiusculo
  .from("membros")
  .select("id, email")
  .maybeSingle();
if (e6) throw e6;
console.log(
  "6) Sessão gerada com",
  emailMaiusculo,
  "-> membros retornou:",
  viaMaiusculo ? "OK, achou a linha" : "VAZIO — confirma o achado do spec",
  viaMaiusculo,
);
```

- [ ] **Step 2: Rodar o script**

```bash
node _verificar_rls_conta_tmp.mjs
```

Esperado: as linhas 1 a 5 terminando em "OK" — nenhuma em "FALHOU". Se
qualquer linha 2, 3 ou 4 disser "FALHOU — VAZAMENTO", **pare**: significa
que a policy de RLS não está filtrando como o design pressupõe, e o código
de `lib/conta/dados.ts` não pode ir pra frente até isso ser corrigido no
banco (não é algo pra "contornar" em código — é a garantia de isolamento
entre contas).

A linha 6 é diagnóstica, não pass/fail: ela mostra se o Supabase Auth já
normaliza o e-mail sozinho (aí "achou a linha" mesmo sem a correção da
Task 1) ou se o achado do spec era real ("VAZIO"). Registre o resultado no
relatório final (Task 21) — a correção da Task 1 fica de qualquer jeito,
como defesa, independente do que esta linha mostrar.

- [ ] **Step 3: Apagar o script**

```bash
rm _verificar_rls_conta_tmp.mjs
```

Não é pra commitar em nenhum momento — é só verificação, mesmo padrão usado
nas etapas do painel admin.

---

## Task 20: Verificação funcional com um membro real

**Files:** nenhum arquivo do projeto — script temporário, apagado no fim.

- [ ] **Step 1: Escrever o script**

Criar `_verificar_dados_conta_tmp.mjs` na raiz do projeto:

```js
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      v = v.replace(/^\\\$/, "$");
      return [l.slice(0, i).trim(), v];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Pega um membro que realmente tem assinatura ativa, endereço e (se
// possível) indicação, pra exercitar o máximo de seções de uma vez.
const { data: comAssinaturaAtiva } = await admin
  .from("assinaturas")
  .select("membro_id")
  .eq("status", "ativa")
  .limit(1)
  .single();

const membroId = comAssinaturaAtiva.membro_id;
const { data: membro } = await admin.from("membros").select("id, email, nome, codigo_indicacao").eq("id", membroId).single();
console.log("Testando com:", membro.email);

async function sessaoPara(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const cliente = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { error: erroVerify } = await cliente.auth.verifyOtp({
    type: "email",
    token_hash: data.properties.hashed_token,
  });
  if (erroVerify) throw erroVerify;
  return cliente;
}

const cliente = await sessaoPara(membro.email);

// Mesmas queries de lib/conta/dados.ts, na mesma ordem, pra bater com o
// que a página vai realmente rodar.
const { data: assinaturas, error: eAssin } = await cliente
  .from("assinaturas")
  .select("id, plano_slug, status, valor, billing_type, proxima_cobranca, criado_em")
  .order("criado_em", { ascending: false });
if (eAssin) throw eAssin;
console.log("assinaturas (via RLS):", assinaturas.length, assinaturas[0]);

const { data: endereco, error: eEnd } = await cliente
  .from("enderecos")
  .select("cidade, uf, pais")
  .maybeSingle();
if (eEnd) throw eEnd;
console.log("endereço (via RLS):", endereco);

const idsAssinatura = assinaturas.map((a) => a.id);
const { data: pagamentos, error: ePag } = await admin
  .from("pagamentos")
  .select("id, valor, status")
  .in("assinatura_id", idsAssinatura.length > 0 ? idsAssinatura : ["00000000-0000-0000-0000-000000000000"]);
if (ePag) throw ePag;
console.log("pagamentos (via service role, filtrado pelos IDs de assinatura acima):", pagamentos.length);

const { data: envios, error: eEnv } = await admin
  .from("envios")
  .select("edicao_id, status, edicoes(nome, mes)")
  .eq("membro_id", membro.id);
if (eEnv) throw eEnv;
console.log("envios (via service role, filtrado por membro.id):", envios.length, envios[0]);

const { data: indicacoes, error: eInd } = await cliente.from("indicacoes").select("status");
if (eInd) throw eInd;
console.log("indicações (via RLS):", indicacoes.length);

const { data: creditos, error: eCred } = await cliente.from("creditos").select("ciclo_ref, percentual, status");
if (eCred) throw eCred;
console.log("créditos (via RLS):", creditos.length);

console.log("codigo_indicacao:", membro.codigo_indicacao);
console.log("link de indicação esperado:", `${env.NEXT_PUBLIC_SITE_URL}/assinar?ref=${membro.codigo_indicacao}`);
```

- [ ] **Step 2: Rodar o script**

```bash
node _verificar_dados_conta_tmp.mjs
```

Esperado: cada consulta devolve sem erro, `assinaturas.length >= 1` com
`status: "ativa"` na primeira posição, `envios` trazendo o nome/mês da
edição aninhado corretamente. `pagamentos` pode vir com `length: 0` (tabela
ainda vazia em produção) — não é falha.

- [ ] **Step 3: Apagar o script**

```bash
rm _verificar_dados_conta_tmp.mjs
```

---

## Task 21: Relatório final

**Files:** nenhum

- [ ] **Step 1: Conferir o estado da branch**

```bash
git status --short
git log --oneline -20
```

Esperado: árvore de trabalho limpa (fora dos arquivos soltos que já
existiam antes deste plano — `TAREFA-*.md`, `spec-painel-admin.md`, etc.,
que continuam de fora de qualquer commit, como sempre), e os commits deste
plano aparecendo em sequência no topo do log.

- [ ] **Step 2: Resumir pro usuário**

Sem push na `main` — só na `revisao`, esperando validação no preview, mesmo
fluxo de todas as etapas anteriores. O resumo deve listar: rotas novas
(`/minha-conta`, `/minha-conta/login`), a correção do e-mail em
`FormLogin.tsx`, os três componentes movidos para `components/`
compartilhado, e o resultado da verificação de isolamento de RLS (Task 19)
— é o item mais importante a reportar, porque é a prova de que uma
assinante não consegue ver o dado da outra.

---

## Verificação de cobertura do spec

Conferência rápida linha a linha contra
`docs/superpowers/specs/2026-09-22-minha-conta-design.md`:

- Decisão RLS vs service role → Task 7 (`lib/conta/dados.ts`), Task 19
  prova.
- Bug do e-mail em maiúsculo → correção na Task 1, checagem empírica de que
  o cenário era real na Task 19 (check 6).
- Rotas `/minha-conta` e `/minha-conta/login` → Tasks 8, 9, 17.
- Fallback do `/auth/confirm` → Task 2.
- Seção dados de contato → Task 11.
- Seção assinatura atual (+ nome do plano via service role) → Task 12,
  resolvido dentro de Task 7.
- Seção endereço → Task 13.
- Seção histórico de pagamentos → Task 14, dados de Task 7.
- Seção envios (+ remessas/rastreio) → Task 15, dados de Task 7.
- Seção indicação e créditos, sem nome de quem foi indicada → Task 16.
- Estado vazio "sem assinatura ativa" → dentro de `SecaoAssinatura` (Task
  12).
- Estados vazios de pagamento/envio/indicação → dentro de cada Secao
  (Tasks 14, 15, 16).
- Visual em Gelica, tokens do projeto → `Bloco.tsx` (Task 10).
- Fora de escopo (editar, cancelar, trocar plano, nota fiscal) — nenhuma
  task implementa nada disso, de propósito.
