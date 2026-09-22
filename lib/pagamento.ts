/**
 * Liga/desliga o Pix como forma de pagamento no site, sem apagar o código —
 * controlado por `PIX_ATIVO` no ambiente. Só "true" exato liga; qualquer
 * outro valor, ou a variável ausente, desliga. De propósito sem
 * `NEXT_PUBLIC_`: a decisão fica no servidor, não vaza pro bundle do
 * cliente nem pode ser lida/forçada no navegador.
 *
 * Não afeta quem já assina por Pix: webhooks, funções do Supabase e
 * renovação de assinatura Pix existente continuam correndo por fora disso.
 */
export function pixAtivo(): boolean {
  return process.env.PIX_ATIVO === "true";
}
