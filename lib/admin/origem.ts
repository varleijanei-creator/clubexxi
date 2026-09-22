/**
 * Rótulos de `origem` compartilhados entre as telas do painel admin.
 * Mesmos valores do menu em app/assinar/useFormAssinatura.ts — "afiliado"
 * chega sem o código (o código mora em afiliado_id, não em origem).
 */
export const ROTULOS_ORIGEM: Record<string, string> = {
  "vitor-hugo": "Vitor Hugo",
  "varlei-giannei": "Varlei Giannei",
  afiliado: "Afiliada",
  assinante: "Indicação de assinante",
  instagram: "Instagram",
  outro: "Outro",
};

export const NAO_INFORMADO = "Não informado";

export function rotularOrigem(valor: string | null): string {
  if (!valor) return NAO_INFORMADO;
  return ROTULOS_ORIGEM[valor] ?? valor;
}
