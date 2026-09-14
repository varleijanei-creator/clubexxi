/**
 * Acréscimo de envio internacional: R$ 20 por envelope, ou seja, por mês do
 * ciclo do plano. Único lugar com esse número — usado tanto na exibição do
 * preço quanto no valor cobrado.
 */
export const ACRESCIMO_INTERNACIONAL_POR_MES = 20;

export function calcularAcrescimoInternacional(meses: number): number {
  return ACRESCIMO_INTERNACIONAL_POR_MES * meses;
}
