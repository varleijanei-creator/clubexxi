import { createServiceClient } from "@/lib/supabase/server";
import type { QuebraLinha } from "@/lib/admin/metricas";
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
 * Cada pedido cai em exatamente um de três grupos, pra que "direto" não
 * fique inflado com quem assinou antes de existir rastreio:
 * - antes do rastreio: criado antes de INICIO_RASTREIO_UTM — não dá pra
 *   saber se veio de link, a coluna nem existia;
 * - direto / sem UTM: criado depois, sem nenhuma utm_*;
 * - com UTM: pelo menos uma utm_* preenchida.
 *
 * Service role, só no servidor (mesmo motivo de lib/admin/metricas.ts).
 */

/**
 * Quando o rastreio de UTM começou a valer.
 *
 * PENDENTE NO DEPLOY: hoje é 24/09 00:00 (migration utm_pedidos), mas o
 * site só grava UTM depois que a branch afiliadas-split for pro ar. Pedido
 * pago entre esta data e o deploy cai em "direto / sem UTM" sem ser. Ao
 * fazer o deploy, trocar pela data e hora dele (com -03:00) e ajustar os
 * textos "24/09" / "até 23/09" em ROTULO_ANTES e em app/admin/(protegido)/origem/page.tsx.
 */
export const INICIO_RASTREIO_UTM = "2026-09-24T00:00:00-03:00";

/** Primeira edição do clube — início padrão do filtro. */
const DATA_INICIAL = "2026-09-01";

const CHAVE_SEM_UTM = "__sem_utm__";
const CHAVE_ANTES = "__antes_rastreio__";
const CHAVE_FALTOU = "__faltou_no_link__";
const CHAVE_MENU_VAZIO = "__menu_vazio__";

export const ROTULO_SEM_UTM = "Direto / sem UTM";
export const ROTULO_ANTES = "Antes do rastreio (até 23/09)";
const ROTULO_FALTOU = "Link sem este campo";

type Grupo = "com_utm" | "sem_utm" | "antes";

type PedidoLinha = {
  criado_em: string;
  origem: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
};

export type Periodo = { de: string; ate: string };

export type OrigemAssinaturas = {
  periodo: Periodo;
  resumo: { total: number; comUtm: number; semUtm: number; antes: number };
  porCampanha: QuebraLinha[];
  porRede: QuebraLinha[];
  porOnde: QuebraLinha[];
  porMenu: QuebraLinha[];
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

function grupoDo(p: PedidoLinha, inicioRastreio: number): Grupo {
  if (new Date(p.criado_em).getTime() < inicioRastreio) return "antes";
  const temUtm = p.utm_source || p.utm_medium || p.utm_campaign || p.utm_content;
  return temUtm ? "com_utm" : "sem_utm";
}

/** Chave de uma dimensão UTM pro pedido, já considerando o grupo. */
function chaveUtm(
  p: PedidoLinha,
  grupo: Grupo,
  coluna: "utm_source" | "utm_medium" | "utm_campaign",
): string {
  if (grupo === "antes") return CHAVE_ANTES;
  if (grupo === "sem_utm") return CHAVE_SEM_UTM;
  return p[coluna] ?? CHAVE_FALTOU;
}

function rotularChaveUtm(chave: string): string {
  if (chave === CHAVE_ANTES) return ROTULO_ANTES;
  if (chave === CHAVE_SEM_UTM) return ROTULO_SEM_UTM;
  if (chave === CHAVE_FALTOU) return ROTULO_FALTOU;
  return chave; // valor da UTM já normalizado (minúsculas, sem acento)
}

/** Valores reais primeiro (maior contagem antes); os grupos especiais no fim. */
const ORDEM_ESPECIAIS: Record<string, number> = {
  [CHAVE_FALTOU]: 1,
  [CHAVE_SEM_UTM]: 2,
  [CHAVE_ANTES]: 3,
  [CHAVE_MENU_VAZIO]: 1,
};

function ordenar<T extends { chave: string; entradas: number }>(linhas: T[]): T[] {
  return linhas.sort((a, b) => {
    const pa = ORDEM_ESPECIAIS[a.chave] ?? 0;
    const pb = ORDEM_ESPECIAIS[b.chave] ?? 0;
    if (pa !== pb) return pa - pb;
    return b.entradas - a.entradas || a.chave.localeCompare(b.chave);
  });
}

function contar(
  pedidos: PedidoLinha[],
  chaveDe: (p: PedidoLinha) => string,
  rotular: (chave: string) => string,
): QuebraLinha[] {
  const contagem = new Map<string, number>();
  for (const p of pedidos) {
    const chave = chaveDe(p);
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return ordenar(
    [...contagem.entries()].map(([chave, entradas]) => ({
      chave,
      rotulo: rotular(chave),
      entradas,
    })),
  );
}

function chaveMenu(p: PedidoLinha): string {
  return p.origem ?? CHAVE_MENU_VAZIO;
}

function rotularMenu(chave: string): string {
  return rotularOrigem(chave === CHAVE_MENU_VAZIO ? null : chave);
}

export async function buscarOrigemAssinaturas(periodo: Periodo): Promise<OrigemAssinaturas> {
  const supabase = createServiceClient();
  const { inicio, fim } = limitesDoPeriodo(periodo);

  const { data, error } = await supabase
    .from("pedidos")
    .select("criado_em, origem, utm_source, utm_medium, utm_campaign, utm_content")
    .eq("status", "pago")
    .eq("tipo", "assinatura")
    .gte("criado_em", inicio)
    .lt("criado_em", fim);

  if (error) {
    throw new Error(`[origem-assinaturas] falha ao ler pedidos: ${error.message}`);
  }

  const pedidos = (data ?? []) as PedidoLinha[];
  const inicioRastreio = new Date(INICIO_RASTREIO_UTM).getTime();
  const grupos = new Map(pedidos.map((p) => [p, grupoDo(p, inicioRastreio)]));
  const grupo = (p: PedidoLinha) => grupos.get(p)!;

  const resumo = { total: pedidos.length, comUtm: 0, semUtm: 0, antes: 0 };
  for (const p of pedidos) {
    const g = grupo(p);
    if (g === "com_utm") resumo.comUtm += 1;
    else if (g === "sem_utm") resumo.semUtm += 1;
    else resumo.antes += 1;
  }

  const chaveCampanha = (p: PedidoLinha) => chaveUtm(p, grupo(p), "utm_campaign");
  const porCampanha = contar(pedidos, chaveCampanha, rotularChaveUtm);
  const porMenu = contar(pedidos, chaveMenu, rotularMenu);

  const contagem: Record<string, Record<string, number>> = {};
  for (const p of pedidos) {
    const linha = chaveCampanha(p);
    const coluna = chaveMenu(p);
    contagem[linha] ??= {};
    contagem[linha][coluna] = (contagem[linha][coluna] ?? 0) + 1;
  }

  return {
    periodo,
    resumo,
    porCampanha,
    porRede: contar(pedidos, (p) => chaveUtm(p, grupo(p), "utm_source"), rotularChaveUtm),
    porOnde: contar(pedidos, (p) => chaveUtm(p, grupo(p), "utm_medium"), rotularChaveUtm),
    porMenu,
    cruzamento: {
      // mesma ordem das tabelas acima
      linhas: porCampanha.map(({ chave, rotulo }) => ({ chave, rotulo })),
      colunas: porMenu.map(({ chave, rotulo }) => ({ chave, rotulo })),
      contagem,
    },
  };
}
