import { createServiceClient } from "@/lib/supabase/server";
import { rotularOrigem } from "@/lib/admin/origem";

/**
 * Dados da visão "Origem das assinaturas" do painel admin.
 *
 * Base: pedidos pagos de assinatura (pedidos.status = 'pago', tipo =
 * 'assinatura') — o pedido é quem guarda as UTMs (pedidos.utm_*, gravadas
 * pelo /api/checkout a partir do cookie do proxy.ts) e a resposta do menu
 * "como ficou sabendo" (pedidos.origem). O período é pela data do pedido
 * (criado_em): pedidos não têm data de pagamento, e a diferença entre os
 * dois é de minutos.
 *
 * Mais as assinaturas MANUAL sem pedido PAGO (ativadas fora do site), pelo
 * assinaturas.criado_em — sem elas o total não bate com as ativas. Algumas
 * têm pedido ligado que ficou em 'iniciado' (a pessoa preencheu o
 * formulário e pagou por fora): contam como manual nas UTMs, mas a
 * resposta do menu desse pedido é usada na coluna do menu.
 *
 * Cada item cai em exatamente um grupo, pra que "direto" não fique inflado:
 * - antes do rastreio: pedido criado antes de INICIO_RASTREIO_UTM — não dá
 *   pra saber se veio de link, o site ainda não gravava UTM;
 * - direto / sem UTM: pedido criado depois, sem nenhuma utm_*;
 * - com UTM: pelo menos uma utm_* preenchida;
 * - manual / fora do site: assinatura MANUAL sem pedido pago ligado.
 *
 * Situação (ativa / suspensa / cancelada): pedido -> assinatura pelo
 * assinatura_eventos (pedido_id + assinatura_id, gravados pela
 * ativar_membro()). Não há outro vínculo confiável: assinaturas não tem
 * pedido_id, e casar por e-mail erra quando a mesma pessoa tem mais de uma
 * assinatura. Pedido sem evento (os de 16/09, anteriores à tabela de
 * eventos) aparece como "sem vínculo" em vez de um palpite.
 *
 * Service role, só no servidor (mesmo motivo de lib/admin/metricas.ts).
 */

/**
 * Quando o rastreio de UTM começou a valer: deploy da afiliadas-split, em
 * 25/09/2026, na primeira hora cheia depois do push. As colunas pedidos.utm_*
 * existem desde 24/09, mas o site só passou a gravá-las no deploy — usar a
 * data da migration jogaria em "direto" quem assinou no intervalo.
 * Se mudar, ajustar também ROTULO_ANTES e os textos de
 * app/admin/(protegido)/origem/page.tsx.
 */
export const INICIO_RASTREIO_UTM = "2026-09-25T14:00:00-03:00";

/** Primeira edição do clube — início padrão do filtro. */
const DATA_INICIAL = "2026-09-01";

const CHAVE_SEM_UTM = "__sem_utm__";
const CHAVE_ANTES = "__antes_rastreio__";
const CHAVE_MANUAL = "__manual__";
const CHAVE_FALTOU = "__faltou_no_link__";
const CHAVE_MENU_VAZIO = "__menu_vazio__";

export const ROTULO_SEM_UTM = "Direto / sem UTM";
export const ROTULO_ANTES = "Antes do rastreio (até 25/09, 14h)";
export const ROTULO_MANUAL = "Manual / fora do site";
const ROTULO_FALTOU = "Link sem este campo";

/** Rótulos que não são um canal de verdade — a página mostra mais apagado. */
export const ROTULOS_ESPECIAIS = new Set([ROTULO_SEM_UTM, ROTULO_ANTES, ROTULO_MANUAL]);

type Grupo = "com_utm" | "sem_utm" | "antes" | "manual";
type Situacao = "ativa" | "suspensa" | "cancelada" | "sem_vinculo";

/** Um pedido pago ou uma assinatura manual — o que a visão conta. */
type Item = {
  grupo: Grupo;
  situacao: Situacao;
  origem: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type PedidoLinha = {
  id: string;
  criado_em: string;
  origem: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

type EventoLinha = {
  pedido_id: string;
  assinatura_id: string;
  pedido: { status: string; tipo: string; origem: string | null } | null;
};

type AssinaturaLinha = {
  id: string;
  status: string;
  billing_type: string | null;
  criado_em: string;
};

export type Periodo = { de: string; ate: string };

/** Uma linha de canal: total e como está hoje cada assinatura dele. */
export type LinhaCanal = {
  chave: string;
  rotulo: string;
  total: number;
  ativas: number;
  suspensas: number;
  canceladas: number;
  semVinculo: number;
};

export type OrigemAssinaturas = {
  periodo: Periodo;
  resumo: {
    total: number;
    comUtm: number;
    semUtm: number;
    antes: number;
    manual: number;
    /** Ativas entre os itens da visão (respeita o período). */
    ativas: number;
    /** Todas as assinaturas ativas do banco, sem filtro — pra conferir. */
    ativasNoBanco: number;
  };
  porCampanha: LinhaCanal[];
  porRede: LinhaCanal[];
  porOnde: LinhaCanal[];
  porMenu: LinhaCanal[];
  /** Perfil (utm_campaign) nas linhas × resposta do menu nas colunas. */
  cruzamento: {
    linhas: { chave: string; rotulo: string }[];
    colunas: { chave: string; rotulo: string }[];
    contagem: Record<string, Record<string, number>>;
  };
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function hojeEmSaoPaulo(agora: Date): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

function dataValida(valor: string | null): valor is string {
  if (!valor || !DATA_ISO.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(valor);
}

/**
 * Datas do filtro (YYYY-MM-DD, dia de São Paulo). Inválida ou ausente cai
 * no padrão: de 01/09/2026 até hoje. Se vierem invertidas, troca.
 */
export function normalizarPeriodo(
  de: string | null,
  ate: string | null,
  agora: Date = new Date(),
): Periodo {
  let inicio = dataValida(de) ? de : DATA_INICIAL;
  let fim = dataValida(ate) ? ate : hojeEmSaoPaulo(agora);
  if (inicio > fim) [inicio, fim] = [fim, inicio];
  return { de: inicio, ate: fim };
}

function limitesDoPeriodo({ de, ate }: Periodo): { inicio: string; fim: string } {
  // Brasil sem horário de verão desde 2019: -03:00 fixo.
  const fim = new Date(`${ate}T00:00:00-03:00`);
  fim.setUTCDate(fim.getUTCDate() + 1); // até o fim do dia "ate"
  return {
    inicio: new Date(`${de}T00:00:00-03:00`).toISOString(),
    fim: fim.toISOString(),
  };
}

function grupoDoPedido(p: PedidoLinha, inicioRastreio: number): Grupo {
  if (new Date(p.criado_em).getTime() < inicioRastreio) return "antes";
  const temUtm = p.utm_source || p.utm_medium || p.utm_campaign || p.utm_content;
  return temUtm ? "com_utm" : "sem_utm";
}

function situacaoDe(status: string | undefined): Situacao {
  if (status === "ativa" || status === "suspensa" || status === "cancelada") return status;
  return "sem_vinculo";
}

/** Chave de uma dimensão UTM pro item, já considerando o grupo. */
function chaveUtm(
  item: Item,
  coluna: "utm_source" | "utm_medium" | "utm_campaign",
): string {
  if (item.grupo === "manual") return CHAVE_MANUAL;
  if (item.grupo === "antes") return CHAVE_ANTES;
  if (item.grupo === "sem_utm") return CHAVE_SEM_UTM;
  return item[coluna] ?? CHAVE_FALTOU;
}

function rotularChaveUtm(chave: string): string {
  if (chave === CHAVE_MANUAL) return ROTULO_MANUAL;
  if (chave === CHAVE_ANTES) return ROTULO_ANTES;
  if (chave === CHAVE_SEM_UTM) return ROTULO_SEM_UTM;
  if (chave === CHAVE_FALTOU) return ROTULO_FALTOU;
  return chave; // valor da UTM já normalizado (minúsculas, sem acento)
}

/**
 * Manual com pedido ligado usa a resposta do menu daquele pedido; manual
 * sem pedido nenhum não passou pelo menu e fica numa coluna própria.
 */
function chaveMenu(item: Item): string {
  if (item.grupo === "manual" && !item.origem) return CHAVE_MANUAL;
  return item.origem ?? CHAVE_MENU_VAZIO;
}

function rotularMenu(chave: string): string {
  if (chave === CHAVE_MANUAL) return ROTULO_MANUAL;
  return rotularOrigem(chave === CHAVE_MENU_VAZIO ? null : chave);
}

/** Valores reais primeiro (maior total antes); os grupos especiais no fim. */
const ORDEM_ESPECIAIS: Record<string, number> = {
  [CHAVE_FALTOU]: 1,
  [CHAVE_MENU_VAZIO]: 1,
  [CHAVE_SEM_UTM]: 2,
  [CHAVE_ANTES]: 3,
  [CHAVE_MANUAL]: 4,
};

function ordenar(linhas: LinhaCanal[]): LinhaCanal[] {
  return linhas.sort((a, b) => {
    const pa = ORDEM_ESPECIAIS[a.chave] ?? 0;
    const pb = ORDEM_ESPECIAIS[b.chave] ?? 0;
    if (pa !== pb) return pa - pb;
    return b.total - a.total || a.chave.localeCompare(b.chave);
  });
}

const CAMPO_SITUACAO = {
  ativa: "ativas",
  suspensa: "suspensas",
  cancelada: "canceladas",
  sem_vinculo: "semVinculo",
} as const;

function contar(
  itens: Item[],
  chaveDe: (item: Item) => string,
  rotular: (chave: string) => string,
): LinhaCanal[] {
  const linhas = new Map<string, LinhaCanal>();
  for (const item of itens) {
    const chave = chaveDe(item);
    let linha = linhas.get(chave);
    if (!linha) {
      linha = {
        chave,
        rotulo: rotular(chave),
        total: 0,
        ativas: 0,
        suspensas: 0,
        canceladas: 0,
        semVinculo: 0,
      };
      linhas.set(chave, linha);
    }
    linha.total += 1;
    linha[CAMPO_SITUACAO[item.situacao]] += 1;
  }
  return ordenar([...linhas.values()]);
}

export async function buscarOrigemAssinaturas(periodo: Periodo): Promise<OrigemAssinaturas> {
  const supabase = createServiceClient();
  const { inicio, fim } = limitesDoPeriodo(periodo);

  // Eventos e assinaturas vêm inteiros (sem filtro de período): são poucas
  // centenas de linhas, e o vínculo pedido -> assinatura precisa enxergar
  // tudo pra não chamar de "manual" uma assinatura de pedido fora do período.
  const [pedidosRes, eventosRes, assinaturasRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, criado_em, origem, utm_source, utm_medium, utm_campaign, utm_content")
      .eq("status", "pago")
      .eq("tipo", "assinatura")
      .gte("criado_em", inicio)
      .lt("criado_em", fim),
    supabase
      .from("assinatura_eventos")
      .select("pedido_id, assinatura_id, pedido:pedidos(status, tipo, origem)")
      .not("pedido_id", "is", null)
      .not("assinatura_id", "is", null)
      .order("created_at", { ascending: true }),
    supabase.from("assinaturas").select("id, status, billing_type, criado_em"),
  ]);

  for (const [rotulo, res] of [
    ["pedidos", pedidosRes],
    ["eventos", eventosRes],
    ["assinaturas", assinaturasRes],
  ] as const) {
    if (res.error) {
      throw new Error(`[origem-assinaturas] falha ao ler ${rotulo}: ${res.error.message}`);
    }
  }

  const pedidos = (pedidosRes.data ?? []) as PedidoLinha[];
  const assinaturas = (assinaturasRes.data ?? []) as AssinaturaLinha[];
  const statusPorAssinatura = new Map(assinaturas.map((a) => [a.id, a.status]));

  // Pedido -> assinatura: vale o evento mais recente (ordem crescente acima,
  // o último sobrescreve). Hoje nenhum pedido tem mais de uma assinatura.
  const assinaturaDoPedido = new Map<string, string>();
  const assinaturasComPedidoPago = new Set<string>();
  // Resposta do menu do pedido não pago ligado a uma assinatura (manual).
  const menuDaAssinatura = new Map<string, string>();
  for (const e of (eventosRes.data ?? []) as unknown as EventoLinha[]) {
    assinaturaDoPedido.set(e.pedido_id, e.assinatura_id);
    if (e.pedido?.status === "pago" && e.pedido.tipo === "assinatura") {
      assinaturasComPedidoPago.add(e.assinatura_id);
    } else if (e.pedido?.origem) {
      menuDaAssinatura.set(e.assinatura_id, e.pedido.origem);
    }
  }

  const inicioRastreio = new Date(INICIO_RASTREIO_UTM).getTime();
  const itens: Item[] = pedidos.map((p) => {
    const assinaturaId = assinaturaDoPedido.get(p.id);
    return {
      grupo: grupoDoPedido(p, inicioRastreio),
      situacao: situacaoDe(assinaturaId ? statusPorAssinatura.get(assinaturaId) : undefined),
      origem: p.origem,
      utm_source: p.utm_source,
      utm_medium: p.utm_medium,
      utm_campaign: p.utm_campaign,
    };
  });

  const inicioMs = new Date(inicio).getTime();
  const fimMs = new Date(fim).getTime();
  for (const a of assinaturas) {
    if (a.billing_type !== "MANUAL" || assinaturasComPedidoPago.has(a.id)) continue;
    const criada = new Date(a.criado_em).getTime();
    if (criada < inicioMs || criada >= fimMs) continue;
    itens.push({
      grupo: "manual",
      situacao: situacaoDe(a.status),
      origem: menuDaAssinatura.get(a.id) ?? null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
    });
  }

  const resumo = {
    total: itens.length,
    comUtm: 0,
    semUtm: 0,
    antes: 0,
    manual: 0,
    ativas: 0,
    ativasNoBanco: assinaturas.filter((a) => a.status === "ativa").length,
  };
  const campoGrupo = {
    com_utm: "comUtm",
    sem_utm: "semUtm",
    antes: "antes",
    manual: "manual",
  } as const;
  for (const item of itens) {
    resumo[campoGrupo[item.grupo]] += 1;
    if (item.situacao === "ativa") resumo.ativas += 1;
  }

  const chaveCampanha = (item: Item) => chaveUtm(item, "utm_campaign");
  const porCampanha = contar(itens, chaveCampanha, rotularChaveUtm);
  const porMenu = contar(itens, chaveMenu, rotularMenu);

  const contagem: Record<string, Record<string, number>> = {};
  for (const item of itens) {
    const linha = chaveCampanha(item);
    const coluna = chaveMenu(item);
    contagem[linha] ??= {};
    contagem[linha][coluna] = (contagem[linha][coluna] ?? 0) + 1;
  }

  return {
    periodo,
    resumo,
    porCampanha,
    porRede: contar(itens, (item) => chaveUtm(item, "utm_source"), rotularChaveUtm),
    porOnde: contar(itens, (item) => chaveUtm(item, "utm_medium"), rotularChaveUtm),
    porMenu,
    cruzamento: {
      // mesma ordem das tabelas
      linhas: porCampanha.map(({ chave, rotulo }) => ({ chave, rotulo })),
      colunas: porMenu.map(({ chave, rotulo }) => ({ chave, rotulo })),
      contagem,
    },
  };
}
