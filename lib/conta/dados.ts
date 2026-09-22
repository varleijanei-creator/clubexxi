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
