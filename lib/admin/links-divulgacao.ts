/**
 * Links de divulgação com UTM, mostrados em /admin/origem pra copiar.
 * Os valores já estão no formato que lib/utm.ts grava (minúsculas, sem
 * acento), então aparecem iguais na visão de origem.
 */

const SITE = "https://clubexxi.com.br/";

type Perfil = { campanha: "vitor" | "varlei" | "clubexxi"; nome: string };

const PERFIS: Perfil[] = [
  { campanha: "vitor", nome: "Vitor" },
  { campanha: "varlei", nome: "Varlei" },
  { campanha: "clubexxi", nome: "Clube" },
];

const CANAIS = [
  { rede: "instagram", sigla: "IG", onde: ["bio", "stories"] },
  { rede: "tiktok", sigla: "TikTok", onde: ["bio"] },
] as const;

export type LinkDivulgacao = { chave: string; rotulo: string; url: string };

function montarUrl(rede: string, onde: string, campanha: string): string {
  const params = new URLSearchParams({
    utm_source: rede,
    utm_medium: onde,
    utm_campaign: campanha,
  });
  return `${SITE}?${params.toString()}`;
}

/** IG Vitor/Varlei/Clube em bio e stories, TikTok Vitor/Varlei/Clube na bio. */
export const LINKS_DIVULGACAO: LinkDivulgacao[] = CANAIS.flatMap((canal) =>
  PERFIS.flatMap((perfil) =>
    canal.onde.map((onde) => ({
      chave: `${canal.rede}-${perfil.campanha}-${onde}`,
      rotulo: `${canal.sigla} ${perfil.nome} — ${onde}`,
      url: montarUrl(canal.rede, onde, perfil.campanha),
    })),
  ),
);
