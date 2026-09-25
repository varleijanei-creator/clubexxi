import { createServiceClient } from "@/lib/supabase/server";

/**
 * Dados da Tela 3 (Afiliadas) do painel admin — spec-painel-admin.md.
 * `afiliados` e `comissoes` têm policy própria pra admin (admin_gerencia_afiliados,
 * admin_le_comissoes, ambas via is_admin()) — diferente de assinatura_eventos.
 * Uso a service role mesmo assim, pelo mesmo motivo que o resto do painel: evita
 * o risco de is_admin() (comparação exata de e-mail) divergir de ehAdmin()
 * (case-insensitive) e a tela parecer "vazia" em vez de dar erro.
 *
 * Aviso à parte, não relacionado a este código: a coluna `comissoes.status`
 * tem DEFAULT 'prevista', mas a check constraint da própria coluna só aceita
 * aprovada/paga/cancelada/pendente — um insert sem status explícito falha.
 * Não mexi nisso (seria migration); os dados hoje sempre gravam status
 * explícito, então não trava nada aqui, mas fica registrado.
 */

function linkBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://clubexxi.com.br";
}

export function linkIndicacao(codigo: string): string {
  return `${linkBase()}/assinar?af=${encodeURIComponent(codigo)}`;
}

export type AfiliadaLinha = {
  id: string;
  nome: string;
  codigo: string;
  percentual: number;
  ativo: boolean;
  email: string | null;
  telefone: string | null;
  /** Preenchido = split do Asaas (quando a checkout-v2 estiver no ar); null = Pix manual. */
  walletId: string | null;
  criadoEm: string;
  assinantesTotal: number;
  assinantesAtivos: number;
};

export async function buscarAfiliadas(): Promise<AfiliadaLinha[]> {
  const supabase = createServiceClient();

  const [afiliadosRes, assinaturasRes] = await Promise.all([
    supabase.from("afiliados").select("*").order("nome"),
    supabase.from("assinaturas").select("afiliado_id, status").not("afiliado_id", "is", null),
  ]);

  if (afiliadosRes.error) {
    throw new Error(`[afiliadas] falha ao ler afiliados: ${afiliadosRes.error.message}`);
  }
  if (assinaturasRes.error) {
    throw new Error(`[afiliadas] falha ao ler assinaturas: ${assinaturasRes.error.message}`);
  }

  const contagem = new Map<string, { total: number; ativos: number }>();
  for (const a of assinaturasRes.data ?? []) {
    const atual = contagem.get(a.afiliado_id) ?? { total: 0, ativos: 0 };
    atual.total += 1;
    if (a.status === "ativa") atual.ativos += 1;
    contagem.set(a.afiliado_id, atual);
  }

  return (afiliadosRes.data ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    codigo: a.codigo,
    percentual: Number(a.percentual ?? 10),
    ativo: a.ativo,
    email: a.email,
    telefone: a.telefone,
    walletId: a.wallet_id,
    criadoEm: a.criado_em,
    assinantesTotal: contagem.get(a.id)?.total ?? 0,
    assinantesAtivos: contagem.get(a.id)?.ativos ?? 0,
  }));
}

export type ComissaoLinha = {
  id: string;
  competencia: string;
  valorBase: number;
  percentual: number;
  valorComissao: number;
  status: string;
  formaPagamento: string;
  pagoEm: string | null;
  membroNome: string | null;
};

export type GrupoComissoesAfiliada = {
  afiliadoId: string;
  afiliadoNome: string;
  linhas: ComissaoLinha[];
  totalBase: number;
  totalComissao: number;
};

type ComissaoBruta = {
  id: string;
  afiliado_id: string;
  competencia: string;
  valor_base: number;
  percentual: number;
  valor_comissao: number;
  status: string;
  forma_pagamento: string;
  pago_em: string | null;
  assinaturas: { membros: { nome: string } | { nome: string }[] | null } | null;
};

function nomeDoMembroDaComissao(c: ComissaoBruta): string | null {
  const membros = c.assinaturas?.membros;
  if (!membros) return null;
  const membro = Array.isArray(membros) ? membros[0] : membros;
  return membro?.nome ?? null;
}

function limitesDoMes(mes: string): { inicio: string; fim: string } {
  const [ano, mesNum] = mes.split("-").map(Number);
  const paraData = (a: number, m: number) => `${a}-${String(m).padStart(2, "0")}-01`;
  return mesNum === 12
    ? { inicio: paraData(ano, 12), fim: paraData(ano + 1, 1) }
    : { inicio: paraData(ano, mesNum), fim: paraData(ano, mesNum + 1) };
}

export async function buscarComissoesDoMes(mes: string): Promise<GrupoComissoesAfiliada[]> {
  const supabase = createServiceClient();
  const { inicio, fim } = limitesDoMes(mes);

  const [comissoesRes, afiliadosRes] = await Promise.all([
    supabase
      .from("comissoes")
      .select("*, assinaturas(membros(nome))")
      .gte("competencia", inicio)
      .lt("competencia", fim),
    supabase.from("afiliados").select("id, nome"),
  ]);

  if (comissoesRes.error) {
    throw new Error(`[afiliadas] falha ao ler comissões: ${comissoesRes.error.message}`);
  }
  if (afiliadosRes.error) {
    throw new Error(`[afiliadas] falha ao ler afiliados: ${afiliadosRes.error.message}`);
  }

  const nomesAfiliada = new Map((afiliadosRes.data ?? []).map((a) => [a.id, a.nome]));
  const grupos = new Map<string, GrupoComissoesAfiliada>();

  for (const c of (comissoesRes.data ?? []) as unknown as ComissaoBruta[]) {
    const grupo: GrupoComissoesAfiliada = grupos.get(c.afiliado_id) ?? {
      afiliadoId: c.afiliado_id,
      afiliadoNome: nomesAfiliada.get(c.afiliado_id) ?? "(afiliada removida)",
      linhas: [],
      totalBase: 0,
      totalComissao: 0,
    };
    grupo.linhas.push({
      id: c.id,
      competencia: c.competencia,
      valorBase: Number(c.valor_base),
      percentual: Number(c.percentual),
      valorComissao: Number(c.valor_comissao),
      status: c.status,
      formaPagamento: c.forma_pagamento,
      pagoEm: c.pago_em,
      membroNome: nomeDoMembroDaComissao(c),
    });
    grupo.totalBase += Number(c.valor_base);
    grupo.totalComissao += Number(c.valor_comissao);
    grupos.set(c.afiliado_id, grupo);
  }

  return [...grupos.values()].sort((a, b) => a.afiliadoNome.localeCompare(b.afiliadoNome, "pt-BR"));
}

export type AssinantePorAfiliada = {
  assinaturaId: string;
  membroNome: string;
  membroEmail: string;
  planoNome: string;
  status: string;
  criadoEm: string;
};

export type DetalheAfiliada = {
  id: string;
  nome: string;
  codigo: string;
  percentual: number;
  ativo: boolean;
  email: string | null;
  telefone: string | null;
  cpfCnpj: string | null;
  chavePix: string | null;
  tipoChavePix: string | null;
  walletId: string | null;
  observacoes: string | null;
  criadoEm: string;
  assinantes: AssinantePorAfiliada[];
  comissoes: ComissaoLinha[];
};

export async function buscarDetalheAfiliada(id: string): Promise<DetalheAfiliada | null> {
  const supabase = createServiceClient();

  const afiliadaRes = await supabase.from("afiliados").select("*").eq("id", id).maybeSingle();
  if (afiliadaRes.error) {
    throw new Error(`[afiliadas] falha ao ler afiliada: ${afiliadaRes.error.message}`);
  }
  if (!afiliadaRes.data) return null;

  const [assinaturasRes, comissoesRes, planosRes] = await Promise.all([
    supabase
      .from("assinaturas")
      .select("id, status, criado_em, plano_slug, membros(nome, email)")
      .eq("afiliado_id", id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("comissoes")
      .select("*, assinaturas(membros(nome))")
      .eq("afiliado_id", id)
      .order("competencia", { ascending: false }),
    supabase.from("planos").select("slug, nome"),
  ]);

  for (const [rotulo, res] of [
    ["assinantes", assinaturasRes],
    ["comissões", comissoesRes],
    ["planos", planosRes],
  ] as const) {
    if (res.error) {
      throw new Error(`[afiliadas] falha ao ler ${rotulo} do detalhe: ${res.error.message}`);
    }
  }

  const nomesPlano = new Map((planosRes.data ?? []).map((p) => [p.slug, p.nome]));

  type AssinaturaBruta = {
    id: string;
    status: string;
    criado_em: string;
    plano_slug: string;
    membros: { nome: string; email: string } | { nome: string; email: string }[] | null;
  };

  const assinantes: AssinantePorAfiliada[] = ((assinaturasRes.data ?? []) as unknown as AssinaturaBruta[]).map(
    (a) => {
      const membro = Array.isArray(a.membros) ? a.membros[0] : a.membros;
      return {
        assinaturaId: a.id,
        membroNome: membro?.nome ?? "—",
        membroEmail: membro?.email ?? "—",
        planoNome: nomesPlano.get(a.plano_slug) ?? a.plano_slug,
        status: a.status,
        criadoEm: a.criado_em,
      };
    },
  );

  const comissoes: ComissaoLinha[] = ((comissoesRes.data ?? []) as unknown as ComissaoBruta[]).map((c) => ({
    id: c.id,
    competencia: c.competencia,
    valorBase: Number(c.valor_base),
    percentual: Number(c.percentual),
    valorComissao: Number(c.valor_comissao),
    status: c.status,
    formaPagamento: c.forma_pagamento,
    pagoEm: c.pago_em,
    membroNome: nomeDoMembroDaComissao(c),
  }));

  const a = afiliadaRes.data;
  return {
    id: a.id,
    nome: a.nome,
    codigo: a.codigo,
    percentual: Number(a.percentual ?? 10),
    ativo: a.ativo,
    email: a.email,
    telefone: a.telefone,
    cpfCnpj: a.cpf_cnpj,
    chavePix: a.chave_pix,
    tipoChavePix: a.tipo_chave_pix,
    walletId: a.wallet_id,
    observacoes: a.observacoes,
    criadoEm: a.criado_em,
    assinantes,
    comissoes,
  };
}
