import { createServiceClient } from "@/lib/supabase/server";
import { PAISES } from "@/lib/paises";

/**
 * Dados da Tela 1 (métricas) do painel admin — spec-painel-admin.md.
 *
 * Roda sempre no servidor, com a service role: `assinatura_eventos` tem RLS
 * ligada mas NENHUMA policy de leitura, nem pra admin via is_admin() —
 * conferido direto no banco antes de escrever esta query. Um cliente
 * autenticado normal (anon key + cookie de sessão) vê a tabela vazia, sem
 * erro nenhum. Por isso este módulo só pode ser chamado do servidor.
 */

// Primeira edição do clube — o seletor de mês começa aqui (spec).
const MES_INICIAL = "2026-09";

const TIPOS_ENTRADA = ["entrou", "reativou"] as const;
const TIPOS_SAIDA = ["cancelou", "estornou"] as const;

function ehTipoEntrada(tipo: string): boolean {
  return (TIPOS_ENTRADA as readonly string[]).includes(tipo);
}
function ehTipoSaida(tipo: string): boolean {
  return (TIPOS_SAIDA as readonly string[]).includes(tipo);
}

// Mesmos rótulos do menu de origem em app/assinar/useFormAssinatura.ts.
// "afiliado" chega assim, sem o código — o código mora em afiliado_id.
const ROTULOS_ORIGEM: Record<string, string> = {
  "vitor-hugo": "Vitor Hugo",
  "varlei-giannei": "Varlei Giannei",
  afiliado: "Afiliada",
  assinante: "Indicação de assinante",
  instagram: "Instagram",
  outro: "Outro",
};

const NAO_INFORMADO = "Não informado";

const NOMES_PAIS: Record<string, string> = Object.fromEntries(
  PAISES.map((p) => [p.codigo, p.nome]),
);

const MESES_ABREVIADOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export type OpcaoMes = { valor: string; rotulo: string };

function rotularMes(mes: string): string {
  const [ano, mesNum] = mes.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mesNum - 1, 1));
  const rotulo = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(data);
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1); // "setembro de 2026" -> "Setembro de 2026"
}

function rotularMesCurto(mes: string): string {
  const [ano, mesNum] = mes.split("-").map(Number);
  return `${MESES_ABREVIADOS[mesNum - 1]}/${String(ano).slice(2)}`;
}

/** Meses disponíveis no seletor: de setembro/2026 até o mês corrente, mais recente primeiro. */
export function mesesDisponiveis(agora: Date = new Date()): OpcaoMes[] {
  const [anoInicial, mesInicial] = MES_INICIAL.split("-").map(Number);
  const anoAtual = agora.getUTCFullYear();
  const mesAtual = agora.getUTCMonth() + 1;

  const meses: OpcaoMes[] = [];
  let ano = anoInicial;
  let mes = mesInicial;
  while (ano < anoAtual || (ano === anoAtual && mes <= mesAtual)) {
    const valor = `${ano}-${String(mes).padStart(2, "0")}`;
    meses.push({ valor, rotulo: rotularMes(valor) });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return meses.reverse();
}

/** Garante um "YYYY-MM" dentro da faixa do clube; fora dela, cai no mês corrente. */
export function normalizarMes(valor: string | null, agora: Date = new Date()): string {
  const disponiveis = mesesDisponiveis(agora);
  if (valor && disponiveis.some((m) => m.valor === valor)) return valor;
  return disponiveis[0].valor; // mês corrente é sempre o primeiro (lista invertida)
}

function limitesDoMes(mes: string): { inicio: string; fim: string } {
  const [ano, mesNum] = mes.split("-").map(Number);
  return {
    inicio: new Date(Date.UTC(ano, mesNum - 1, 1)).toISOString(),
    fim: new Date(Date.UTC(ano, mesNum, 1)).toISOString(),
  };
}

type EventoLinha = {
  tipo: string;
  plano_slug: string | null;
  origem: string | null;
  pais: string | null;
};

export type QuebraLinha = { chave: string; rotulo: string; entradas: number };

function agruparEntradas(
  eventos: EventoLinha[],
  coluna: "plano_slug" | "origem" | "pais",
  rotular: (valor: string | null) => string,
): QuebraLinha[] {
  const contagem = new Map<string, { rotulo: string; entradas: number }>();
  for (const evento of eventos) {
    if (!ehTipoEntrada(evento.tipo)) continue;
    const valorBruto = evento[coluna];
    const chave = valorBruto ?? "(nao-informado)";
    const atual = contagem.get(chave);
    if (atual) atual.entradas += 1;
    else contagem.set(chave, { rotulo: rotular(valorBruto), entradas: 1 });
  }
  return [...contagem.entries()]
    .map(([chave, v]) => ({ chave, ...v }))
    .sort((a, b) => b.entradas - a.entradas);
}

export type PontoSerieMensal = {
  mes: string;
  rotulo: string;
  entradas: number;
  saidas: number;
};

export type MetricasPainel = {
  mes: string;
  cartoes: {
    entradas: number;
    saidas: number;
    suspensas: number;
    ativasHoje: number;
    mrr: number;
  };
  serieMensal: PontoSerieMensal[];
  porPlano: QuebraLinha[];
  porOrigem: QuebraLinha[];
  porPais: QuebraLinha[];
};

export async function buscarMetricasPainel(mes: string): Promise<MetricasPainel> {
  const supabase = createServiceClient();
  const { inicio, fim } = limitesDoMes(mes);

  // Janela dos últimos 12 meses, terminando no mês selecionado (o seletor
  // de mês vale pra tela inteira, série incluída — spec-painel-admin.md).
  const inicioSerie = new Date(fim);
  inicioSerie.setUTCMonth(inicioSerie.getUTCMonth() - 12);

  const [eventosMesRes, serieRes, planosRes, ativasRes] = await Promise.all([
    supabase
      .from("assinatura_eventos")
      .select("tipo, plano_slug, origem, pais")
      .gte("created_at", inicio)
      .lt("created_at", fim),
    supabase
      .from("assinatura_eventos")
      .select("tipo, created_at")
      .gte("created_at", inicioSerie.toISOString())
      .lt("created_at", fim),
    supabase.from("planos").select("slug, nome, meses"),
    supabase.from("assinaturas").select("valor, plano_slug").eq("status", "ativa"),
  ]);

  for (const [rotulo, res] of [
    ["eventos do mês", eventosMesRes],
    ["série mensal", serieRes],
    ["planos", planosRes],
    ["assinaturas ativas", ativasRes],
  ] as const) {
    if (res.error) {
      throw new Error(`[métricas] falha ao ler ${rotulo}: ${res.error.message}`);
    }
  }

  const eventosMes = (eventosMesRes.data ?? []) as EventoLinha[];
  const nomesPlano = new Map((planosRes.data ?? []).map((p) => [p.slug, p.nome]));
  const mesesPorPlano = new Map((planosRes.data ?? []).map((p) => [p.slug, p.meses]));

  const cartoes = {
    entradas: eventosMes.filter((e) => ehTipoEntrada(e.tipo)).length,
    saidas: eventosMes.filter((e) => ehTipoSaida(e.tipo)).length,
    suspensas: eventosMes.filter((e) => e.tipo === "suspendeu").length,
    ativasHoje: ativasRes.data?.length ?? 0,
    mrr: 0,
  };

  // Receita recorrente mensal: normaliza plano trimestral (e afins) dividindo
  // pelo número de meses do ciclo, senão a soma bruta infla o número (spec).
  let mrr = 0;
  for (const assinatura of ativasRes.data ?? []) {
    const meses = mesesPorPlano.get(assinatura.plano_slug) ?? 1;
    mrr += Number(assinatura.valor) / meses;
  }
  cartoes.mrr = Math.round(mrr * 100) / 100;

  // 12 chaves "YYYY-MM", da mais antiga pra mais nova, pro eixo do gráfico.
  const chavesSerie: string[] = [];
  {
    let ano = inicioSerie.getUTCFullYear();
    let mesNum = inicioSerie.getUTCMonth() + 1;
    for (let i = 0; i < 12; i++) {
      chavesSerie.push(`${ano}-${String(mesNum).padStart(2, "0")}`);
      mesNum += 1;
      if (mesNum > 12) {
        mesNum = 1;
        ano += 1;
      }
    }
  }

  const contagemSerie = new Map(
    chavesSerie.map((m) => [m, { entradas: 0, saidas: 0 }]),
  );
  for (const evento of serieRes.data ?? []) {
    const d = new Date(evento.created_at);
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const balde = contagemSerie.get(chave);
    if (!balde) continue; // fora da janela, não deveria acontecer dado o filtro acima
    if (ehTipoEntrada(evento.tipo)) balde.entradas += 1;
    else if (ehTipoSaida(evento.tipo)) balde.saidas += 1;
  }

  const serieMensal: PontoSerieMensal[] = chavesSerie.map((m) => ({
    mes: m,
    rotulo: rotularMesCurto(m),
    ...contagemSerie.get(m)!,
  }));

  return {
    mes,
    cartoes,
    serieMensal,
    porPlano: agruparEntradas(eventosMes, "plano_slug", (v) =>
      v ? (nomesPlano.get(v) ?? v) : NAO_INFORMADO,
    ),
    porOrigem: agruparEntradas(eventosMes, "origem", (v) =>
      v ? (ROTULOS_ORIGEM[v] ?? v) : NAO_INFORMADO,
    ),
    porPais: agruparEntradas(eventosMes, "pais", (v) =>
      v ? (NOMES_PAIS[v] ?? v) : NAO_INFORMADO,
    ),
  };
}
