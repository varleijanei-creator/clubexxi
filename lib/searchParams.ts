/** Lê um parâmetro de busca como texto simples, ou null se ausente/vazio. */
export function paramTexto(
  params: Record<string, string | string[] | undefined>,
  chave: string,
): string | null {
  const v = params[chave];
  const valor = Array.isArray(v) ? v[0] : v;
  return valor ? valor : null;
}
