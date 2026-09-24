import type { NextRequest, NextResponse } from "next/server";

/**
 * UTMs — de onde veio quem assinou (Instagram do Vitor, do Varlei, TikTok…).
 *
 * Fluxo: o proxy.ts chama gravarUtmNoCookie() em toda página; o
 * /api/checkout lê com lerUtm() e grava nas colunas pedidos.utm_*.
 *
 * Regras:
 * - vale o último link com UTM: se a URL traz qualquer utm_*, o grupo inteiro
 *   é trocado (as chaves que faltam são apagadas, pra não misturar campanha
 *   de um link com rede de outro);
 * - visita sem UTM não mexe no cookie;
 * - cookie de 30 dias;
 * - independente de afiliada (?af=), indicação (?ref=) e do menu "como
 *   ficou sabendo" — nada aqui lê ou altera esses campos.
 *
 * Sem dependência de Supabase: roda no proxy.
 */

export const CHAVES_UTM = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;

export type ChaveUtm = (typeof CHAVES_UTM)[number];
export type Utm = Partial<Record<ChaveUtm, string>>;

export const COOKIES_UTM: Record<ChaveUtm, string> = {
  utm_source: "c21_utm_source",
  utm_medium: "c21_utm_medium",
  utm_campaign: "c21_utm_campaign",
  utm_content: "c21_utm_content",
};

/** Igual ao check pedidos_utm_tamanho do banco. */
const TAMANHO_MAX_UTM = 100;
const TRINTA_DIAS_EM_SEGUNDOS = 30 * 24 * 60 * 60;

/** Parâmetros da URL ou um objeto já parseado. */
type Parametros =
  | URLSearchParams
  | Record<string, string | string[] | null | undefined>;

/** Compatível com `cookies()` do next/headers e com `request.cookies`. */
type LeitorCookies = {
  get(nome: string): { value: string } | undefined;
};

/**
 * Minúsculas, sem acento, espaço vira "_", só [a-z0-9_.-], no máximo 100
 * caracteres. "Instagram Vitor" -> "instagram_vitor", "Promoção" -> "promocao".
 * Valor grande é cortado, não descartado: melhor guardar o começo da
 * campanha do que perder a origem.
 */
export function normalizarUtm(valor: unknown): string | null {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  if (typeof bruto !== "string") return null;
  const texto = bruto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, TAMANHO_MAX_UTM);
  return texto || null;
}

function montarUtm(ler: (chave: ChaveUtm) => unknown): Utm | null {
  const utm: Utm = {};
  for (const chave of CHAVES_UTM) {
    const v = normalizarUtm(ler(chave));
    if (v) utm[chave] = v;
  }
  return Object.keys(utm).length > 0 ? utm : null;
}

/**
 * Lê as UTMs como um grupo: da URL se ela trouxer alguma, senão do cookie.
 * Nunca mistura as duas fontes.
 */
export function lerUtm(params?: Parametros, cookies?: LeitorCookies): Utm | null {
  const daUrl = params
    ? montarUtm((chave) =>
        params instanceof URLSearchParams ? params.get(chave) : params[chave],
      )
    : null;
  if (daUrl) return daUrl;
  return cookies ? montarUtm((chave) => cookies.get(COOKIES_UTM[chave])?.value) : null;
}

/** As 4 colunas de pedidos, sempre presentes (null quando não há UTM). */
export function colunasUtm(utm: Utm | null): Record<ChaveUtm, string | null> {
  return {
    utm_source: utm?.utm_source ?? null,
    utm_medium: utm?.utm_medium ?? null,
    utm_campaign: utm?.utm_campaign ?? null,
    utm_content: utm?.utm_content ?? null,
  };
}

/** Chamado pelo proxy.ts. Só age se a URL trouxer alguma UTM válida. */
export function gravarUtmNoCookie(request: NextRequest, response: NextResponse): void {
  const utm = montarUtm((chave) => request.nextUrl.searchParams.get(chave));
  if (!utm) return;

  const opcoes = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  for (const chave of CHAVES_UTM) {
    const valor = utm[chave];
    response.cookies.set(COOKIES_UTM[chave], valor ?? "", {
      ...opcoes,
      maxAge: valor ? TRINTA_DIAS_EM_SEGUNDOS : 0,
    });
  }
}
