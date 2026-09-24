import type { createServiceClient } from "@/lib/supabase/server";
import { COOKIES_UTM, lerUtm, type Utm } from "@/lib/utm";

export type { Utm };

/**
 * Origem do pedido — peça isolada que o checkout transparente (branch
 * checkout-v2) chama antes de gravar o pedido. Junta num lugar só o que hoje
 * está espalhado no /api/checkout: ?af= (afiliada), ?ref= (indicação de
 * assinante) e, daqui pra frente, as UTMs.
 *
 * Regras (as mesmas do /api/checkout de hoje, spec-link-afiliada.md):
 * - af e ref nunca coexistem. Afiliada ATIVA encontrada tem prioridade e o
 *   ref é descartado, mesmo que os dois venham juntos.
 * - Código que não existe (ou afiliada inativa) é ignorado em silêncio —
 *   link digitado errado não pode custar uma venda.
 * - Ninguém se autoindica: ref cuja dona tem o mesmo e-mail de quem assina
 *   é descartado.
 *
 * URL x cookie: cada grupo é lido como uma unidade, da URL primeiro. Se a URL
 * trouxer af ou ref, o cookie de af/ref é ignorado inteiro (não mistura um
 * ref da URL com um af antigo do cookie). O mesmo vale pras UTMs.
 * Os cookies de af/ref ainda não são gravados por ninguém — os nomes ficam
 * definidos aqui pra quem for gravar usar os mesmos.
 *
 * UTMs: lidas por lerUtm() (lib/utm.ts) — o proxy.ts grava o cookie e quem
 * chama grava `utm` nas colunas pedidos.utm_* com colunasUtm(). São
 * independentes de af/ref: nenhum dos dois descarta o outro.
 */

type ClienteServico = ReturnType<typeof createServiceClient>;

export const COOKIES_ORIGEM = {
  af: "c21_af",
  ref: "c21_ref",
  ...COOKIES_UTM,
} as const;

/** Parâmetros da URL (searchParams da página) ou o corpo já parseado do POST. */
export type ParametrosOrigem =
  | URLSearchParams
  | Record<string, string | string[] | null | undefined>;

/** Compatível com `cookies()` do next/headers e com `request.cookies`. */
export type CookiesOrigem = {
  get(nome: string): { value: string } | undefined;
};

/** O que vai pro pedido. `utm` vai nas colunas pedidos.utm_* (colunasUtm). */
export type OrigemPedido = {
  afiliado_id: string | null;
  ref_code: string | null;
  utm: Utm | null;
};

const TAMANHO_MAX_CODIGO = 40;

function limpar(valor: unknown, max: number): string | null {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  if (typeof bruto !== "string") return null;
  // tira caracteres de controle; vem da URL, então é entrada não confiável
  const texto = bruto.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!texto || texto.length > max) return null;
  return texto;
}

function lerParametro(params: ParametrosOrigem, ...chaves: string[]): unknown {
  for (const chave of chaves) {
    const v = params instanceof URLSearchParams ? params.get(chave) : params[chave];
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return undefined;
}

/**
 * Lê af/ref/UTMs sem consultar o banco. Aceita tanto os nomes da URL (af,
 * ref) quanto os do corpo do POST (afiliado_codigo, ref_code).
 */
export function lerOrigemBruta(
  params: ParametrosOrigem,
  cookies?: CookiesOrigem,
): { af: string | null; ref: string | null; utm: Utm | null } {
  const afUrl = limpar(lerParametro(params, "af", "afiliado_codigo"), TAMANHO_MAX_CODIGO);
  const refUrl = limpar(lerParametro(params, "ref", "ref_code"), TAMANHO_MAX_CODIGO);

  let af = afUrl;
  let ref = refUrl;
  if (!afUrl && !refUrl && cookies) {
    af = limpar(cookies.get(COOKIES_ORIGEM.af)?.value, TAMANHO_MAX_CODIGO);
    ref = limpar(cookies.get(COOKIES_ORIGEM.ref)?.value, TAMANHO_MAX_CODIGO);
  }

  return { af, ref, utm: lerUtm(params, cookies) };
}

/**
 * Função única de origem: lê URL/cookie, cruza com o banco e devolve o que
 * gravar no pedido. Erro de consulta não recusa o pedido — é logado e o
 * código correspondente é tratado como "não encontrado", igual ao
 * /api/checkout de hoje.
 */
export async function resolverOrigemPedido({
  supabase,
  params,
  cookies,
  emailAssinante,
}: {
  supabase: ClienteServico;
  params: ParametrosOrigem;
  cookies?: CookiesOrigem;
  emailAssinante: string;
}): Promise<OrigemPedido> {
  const { af, ref, utm } = lerOrigemBruta(params, cookies);

  // 1) Afiliada ativa tem prioridade e descarta o ref.
  if (af) {
    const { data: afiliado, error } = await supabase
      .from("afiliados")
      .select("id")
      .ilike("codigo", af.replace(/[%_\\]/g, "\\$&"))
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      console.error("[origem] erro ao buscar afiliada", error);
    } else if (afiliado) {
      return { afiliado_id: afiliado.id, ref_code: null, utm };
    }
  }

  if (!ref) return { afiliado_id: null, ref_code: null, utm };

  // 2) O ref precisa existir de verdade.
  const { data: nomeIndicadora, error: refErr } = await supabase.rpc(
    "validar_codigo_indicacao",
    { p_codigo: ref },
  );
  if (refErr) {
    console.error("[origem] erro ao validar ref_code", refErr);
    return { afiliado_id: null, ref_code: null, utm };
  }
  if (!nomeIndicadora) return { afiliado_id: null, ref_code: null, utm };

  // 3) Sem autoindicação: mesmo e-mail (minúsculas, sem espaços) da dona.
  const { data: indicadora, error: indicadoraErr } = await supabase
    .from("membros")
    .select("email")
    .eq("codigo_indicacao", ref)
    .maybeSingle();

  if (indicadoraErr) {
    console.error("[origem] erro ao conferir autoindicação", indicadoraErr);
    return { afiliado_id: null, ref_code: ref, utm };
  }

  const normalizar = (v: string) => v.toLowerCase().replace(/\s+/g, "");
  if (indicadora?.email && normalizar(indicadora.email) === normalizar(emailAssinante)) {
    return { afiliado_id: null, ref_code: null, utm };
  }

  return { afiliado_id: null, ref_code: ref, utm };
}
