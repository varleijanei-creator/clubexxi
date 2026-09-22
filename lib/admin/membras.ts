import { createServiceClient } from "@/lib/supabase/server";
import { nomeDoPais } from "@/lib/paises";
import { rotularOrigem, NAO_INFORMADO } from "@/lib/admin/origem";
import {
  FILTRO_TODOS,
  FILTRO_NAO_INFORMADO,
  type FiltrosMembras,
  type LinhaMembra,
  type OpcoesFiltroMembras,
  type ResultadoMembras,
} from "@/lib/admin/membras-tipos";

// Reexporta pros arquivos de servidor que já importavam tipo/constante
// daqui — só componente de cliente precisa ir direto em membras-tipos.
export {
  FILTRO_TODOS,
  FILTRO_NAO_INFORMADO,
  FILTROS_PADRAO,
  type FiltrosMembras,
  type LinhaMembra,
  type OpcoesFiltroMembras,
  type ResultadoMembras,
} from "@/lib/admin/membras-tipos";

/**
 * Dados da Tela 2 (Membras) do painel admin — spec-painel-admin.md.
 * Mesmo motivo da Tela 1: roda com a service role porque `assinatura_eventos`
 * não tem policy de leitura pra ninguém além da service role.
 *
 * Estratégia de leitura: busca membros com assinaturas e endereços
 * embutidos (PostgREST resolve pelas FKs) numa única ida ao banco, e filtra/
 * pagina em memória. Um membro pode ter mais de uma linha em `assinaturas`
 * (histórico de cancelamento e nova assinatura); "plano atual" e "status"
 * usam sempre a mais recente por `criado_em`.
 *
 * Isso é adequado pro tamanho do clube hoje (tiragem de 100/edição). Se a
 * base crescer bem além disso, migrar pra filtro e paginação no banco vai
 * exigir uma view ou function nova — avisar antes de criar.
 */

const PAGINA_TAMANHO = 20;

type AssinaturaBruta = {
  id: string;
  plano_slug: string;
  status: string;
  valor: number;
  criado_em: string;
  afiliado_id: string | null;
};

type EnderecoBruto = {
  cidade: string | null;
  pais: string | null;
};

type MembroBruto = {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
  assinaturas: AssinaturaBruta[] | null;
  enderecos: EnderecoBruto[] | null;
};

function assinaturaAtual(a: AssinaturaBruta[] | null): AssinaturaBruta | null {
  if (!a || a.length === 0) return null;
  return [...a].sort((x, y) => (x.criado_em < y.criado_em ? 1 : -1))[0];
}

export function normalizarFiltros(
  params: Record<string, string | string[] | undefined>,
): FiltrosMembras {
  const texto = (chave: string): string => {
    const v = params[chave];
    const valor = Array.isArray(v) ? v[0] : v;
    return valor ?? "";
  };
  const pagina = Number.parseInt(texto("pagina"), 10);
  return {
    busca: texto("busca").trim(),
    status: texto("status"),
    plano: texto("plano"),
    pais: texto("pais"),
    origem: texto("origem"),
    afiliada: texto("afiliada"),
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
  };
}

export async function buscarMembras(filtros: FiltrosMembras): Promise<ResultadoMembras> {
  const supabase = createServiceClient();

  const [membrosRes, planosRes, afiliadosRes, entrouRes] = await Promise.all([
    supabase
      .from("membros")
      .select("id, nome, email, criado_em, assinaturas(*), enderecos(cidade, pais)")
      // Trava razoável: painel admin, base pequena — ver comentário no topo do arquivo.
      .order("criado_em", { ascending: false })
      .limit(5000),
    supabase.from("planos").select("slug, nome"),
    supabase.from("afiliados").select("id, nome"),
    supabase
      .from("assinatura_eventos")
      .select("membro_id, origem, created_at")
      .eq("tipo", "entrou")
      .order("created_at", { ascending: true }),
  ]);

  for (const [rotulo, res] of [
    ["membros", membrosRes],
    ["planos", planosRes],
    ["afiliados", afiliadosRes],
    ["eventos de entrada", entrouRes],
  ] as const) {
    if (res.error) {
      throw new Error(`[membras] falha ao ler ${rotulo}: ${res.error.message}`);
    }
  }

  const nomesPlano = new Map((planosRes.data ?? []).map((p) => [p.slug, p.nome]));
  const nomesAfiliada = new Map((afiliadosRes.data ?? []).map((a) => [a.id, a.nome]));

  // origem = a do primeiro evento "entrou" daquele membro (só existe em
  // assinatura_eventos — não há vínculo direto membros -> pedidos).
  const origemPorMembro = new Map<string, string | null>();
  for (const evento of entrouRes.data ?? []) {
    if (!origemPorMembro.has(evento.membro_id)) {
      origemPorMembro.set(evento.membro_id, evento.origem);
    }
  }

  const membros = (membrosRes.data ?? []) as unknown as MembroBruto[];

  const todasAsLinhas: LinhaMembra[] = membros.map((m) => {
    const assinatura = assinaturaAtual(m.assinaturas);
    const endereco = m.enderecos?.[0] ?? null;
    const origem = origemPorMembro.get(m.id) ?? null;
    return {
      id: m.id,
      nome: m.nome,
      email: m.email,
      planoSlug: assinatura?.plano_slug ?? null,
      planoNome: assinatura ? (nomesPlano.get(assinatura.plano_slug) ?? assinatura.plano_slug) : "—",
      statusAssinatura: assinatura?.status ?? null,
      cidade: endereco?.cidade ?? null,
      pais: endereco?.pais ?? null,
      paisNome: endereco?.pais ? nomeDoPais(endereco.pais) : NAO_INFORMADO,
      dataEntrada: m.criado_em,
      origem,
      origemRotulo: rotularOrigem(origem),
      afiliadaId: assinatura?.afiliado_id ?? null,
      afiliadaNome: assinatura?.afiliado_id ? (nomesAfiliada.get(assinatura.afiliado_id) ?? null) : null,
    };
  });

  const buscaLower = filtros.busca.toLowerCase();
  const filtradas = todasAsLinhas.filter((l) => {
    if (filtros.status !== FILTRO_TODOS && l.statusAssinatura !== filtros.status) return false;
    if (filtros.plano !== FILTRO_TODOS && l.planoSlug !== filtros.plano) return false;
    if (filtros.afiliada !== FILTRO_TODOS && l.afiliadaId !== filtros.afiliada) return false;
    if (filtros.pais !== FILTRO_TODOS) {
      if (filtros.pais === FILTRO_NAO_INFORMADO ? l.pais !== null : l.pais !== filtros.pais) return false;
    }
    if (filtros.origem !== FILTRO_TODOS) {
      if (filtros.origem === FILTRO_NAO_INFORMADO ? l.origem !== null : l.origem !== filtros.origem) return false;
    }
    if (buscaLower) {
      const alvo = `${l.nome} ${l.email}`.toLowerCase();
      if (!alvo.includes(buscaLower)) return false;
    }
    return true;
  });

  const total = filtradas.length;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGINA_TAMANHO));
  const paginaAtual = Math.min(Math.max(1, filtros.pagina), totalPaginas);
  const inicio = (paginaAtual - 1) * PAGINA_TAMANHO;
  const linhas = filtradas.slice(inicio, inicio + PAGINA_TAMANHO);

  const paisesPresentes = [
    ...new Set(todasAsLinhas.map((l) => l.pais).filter((p): p is string => p !== null)),
  ].sort((a, b) => nomeDoPais(a).localeCompare(nomeDoPais(b), "pt-BR"));

  return {
    linhas,
    total,
    paginaAtual,
    totalPaginas,
    opcoes: {
      planos: (planosRes.data ?? [])
        .map((p) => ({ valor: p.slug, rotulo: p.nome }))
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR")),
      paises: paisesPresentes.map((codigo) => ({ valor: codigo, rotulo: nomeDoPais(codigo) })),
      afiliadas: (afiliadosRes.data ?? [])
        .map((a) => ({ valor: a.id, rotulo: a.nome }))
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR")),
    },
  };
}

// ---------- Detalhe de uma membra ----------

export type DetalheEndereco = {
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

export type DetalheAssinatura = {
  id: string;
  planoSlug: string;
  planoNome: string;
  status: string;
  valor: number;
  billingType: string | null;
  proximaCobranca: string | null;
  criadoEm: string;
  canceladaEm: string | null;
  motivoCancelamento: string | null;
};

export type DetalheEvento = {
  tipo: string;
  planoSlug: string | null;
  planoAnterior: string | null;
  valor: number | null;
  origemRotulo: string;
  motivo: string | null;
  criadoEm: string;
};

export type DetalheEnvio = {
  edicaoNome: string | null;
  edicaoMes: string;
  status: string;
};

export type DetalheMembro = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  status: string;
  criadoEm: string;
  codigoIndicacao: string | null;
  endereco: DetalheEndereco | null;
  assinaturaAtual: DetalheAssinatura | null;
  eventos: DetalheEvento[];
  enviosPrevistos: DetalheEnvio[];
};

export async function buscarDetalheMembro(id: string): Promise<DetalheMembro | null> {
  const supabase = createServiceClient();

  // Campos fiscais (razao_social, cnpj, inscricao_municipal, email_nota,
  // opta_nota_fiscal) ficam de fora de propósito: "não exponha campos de
  // nota fiscal na interface por enquanto" (CLAUDE.md).
  const membroRes = await supabase
    .from("membros")
    .select("id, nome, email, telefone, cpf, status, criado_em, codigo_indicacao")
    .eq("id", id)
    .maybeSingle();

  if (membroRes.error) {
    throw new Error(`[membras] falha ao ler membro: ${membroRes.error.message}`);
  }
  if (!membroRes.data) return null;

  const [enderecoRes, assinaturasRes, eventosRes, enviosRes, planosRes] = await Promise.all([
    supabase
      .from("enderecos")
      .select("cep, logradouro, numero, complemento, bairro, cidade, uf, pais, ponto_referencia")
      .eq("membro_id", id)
      .maybeSingle(),
    supabase
      .from("assinaturas")
      .select("id, plano_slug, status, valor, billing_type, proxima_cobranca, criado_em, cancelada_em, motivo_cancelamento")
      .eq("membro_id", id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("assinatura_eventos")
      .select("tipo, plano_slug, plano_anterior, valor, origem, motivo, created_at")
      .eq("membro_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("envios")
      .select("status, edicoes(nome, mes)")
      .eq("membro_id", id)
      .eq("status", "previsto"),
    supabase.from("planos").select("slug, nome"),
  ]);

  for (const [rotulo, res] of [
    ["endereço", enderecoRes],
    ["assinaturas", assinaturasRes],
    ["histórico de eventos", eventosRes],
    ["envios previstos", enviosRes],
    ["planos", planosRes],
  ] as const) {
    if (res.error) {
      throw new Error(`[membras] falha ao ler ${rotulo} do detalhe: ${res.error.message}`);
    }
  }

  const nomesPlano = new Map((planosRes.data ?? []).map((p) => [p.slug, p.nome]));
  const assinaturas = assinaturasRes.data ?? [];
  const atual = assinaturas[0] ?? null;

  const endereco = enderecoRes.data
    ? {
        cep: enderecoRes.data.cep,
        logradouro: enderecoRes.data.logradouro,
        numero: enderecoRes.data.numero,
        complemento: enderecoRes.data.complemento,
        bairro: enderecoRes.data.bairro,
        cidade: enderecoRes.data.cidade,
        uf: enderecoRes.data.uf,
        pais: nomeDoPais(enderecoRes.data.pais),
        pontoReferencia: enderecoRes.data.ponto_referencia,
      }
    : null;

  return {
    id: membroRes.data.id,
    nome: membroRes.data.nome,
    email: membroRes.data.email,
    telefone: membroRes.data.telefone,
    cpf: membroRes.data.cpf,
    status: membroRes.data.status,
    criadoEm: membroRes.data.criado_em,
    codigoIndicacao: membroRes.data.codigo_indicacao,
    endereco,
    assinaturaAtual: atual
      ? {
          id: atual.id,
          planoSlug: atual.plano_slug,
          planoNome: nomesPlano.get(atual.plano_slug) ?? atual.plano_slug,
          status: atual.status,
          valor: Number(atual.valor),
          billingType: atual.billing_type,
          proximaCobranca: atual.proxima_cobranca,
          criadoEm: atual.criado_em,
          canceladaEm: atual.cancelada_em,
          motivoCancelamento: atual.motivo_cancelamento,
        }
      : null,
    eventos: (eventosRes.data ?? []).map((e) => ({
      tipo: e.tipo,
      planoSlug: e.plano_slug,
      planoAnterior: e.plano_anterior,
      valor: e.valor !== null ? Number(e.valor) : null,
      origemRotulo: rotularOrigem(e.origem),
      motivo: e.motivo,
      criadoEm: e.created_at,
    })),
    enviosPrevistos: (enviosRes.data ?? []).map((e) => {
      const edicao = Array.isArray(e.edicoes) ? e.edicoes[0] : e.edicoes;
      return {
        edicaoNome: (edicao as { nome: string | null } | null)?.nome ?? null,
        edicaoMes: (edicao as { mes: string } | null)?.mes ?? "",
        status: e.status,
      };
    }),
  };
}
