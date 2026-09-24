import type { createServiceClient } from "@/lib/supabase/server";

/**
 * Split do Asaas pra comissão de afiliada — peça isolada que o checkout
 * transparente (branch checkout-v2) chama ao criar a assinatura pela API
 * (POST /v3/subscriptions, campo `split`). Só vale pra assinatura criada pela
 * API; o checkout hospedado fica fora do split.
 *
 * Regras (decididas, não reabrir):
 * - fixedValue, nunca percentualValue: o percentual do Asaas incide sobre o
 *   netValue (depois das taxas) e a afiliada receberia menos que 10%.
 * - fixedValue = valor CHEIO do plano (planos.valor) × afiliados.percentual
 *   / 100, arredondado em centavos — mesma conta da ativar_membro(), que
 *   grava a comissão. afiliados.percentual é a fonte única (nulo = 10, como
 *   o coalesce de lá). Com 10%: 39,90 → 3,99 · 108 → 10,80 · 180 → 18,00.
 * - Afiliada sem wallet_id (ou inativa) → sem split: a comissão continua
 *   sendo gravada pela ativar_membro() e paga por Pix, como hoje.
 * - Assinatura MANUAL não passa por aqui (não existe no Asaas).
 *
 * Só no servidor: recebe o cliente de service role, que ignora a RLS.
 */

type ClienteServico = ReturnType<typeof createServiceClient>;

/** Usado quando afiliados.percentual é nulo — igual ao coalesce da ativar_membro(). */
export const PERCENTUAL_PADRAO_AFILIADA = 10;

/** Item do array `split` de POST /v3/subscriptions. */
export type SplitAsaas = {
  walletId: string;
  fixedValue: number;
};

/** O que a função precisa do pedido — bate com as colunas de `pedidos`. */
export type PedidoParaSplit = {
  afiliado_id: string | null;
  plano_slug: string;
};

/**
 * valorPlano × percentual / 100, em reais com 2 casas — espelha o
 * round(v_valor * percentual / 100, 2) da ativar_membro(): meio centavo
 * arredonda pra cima. A conta é feita em inteiros (centavos × percentual com
 * até 4 casas) pra não herdar erro de ponto flutuante (59.9 * 0.1 = 5.99…01).
 */
export function valorSplitAfiliada(valorPlano: number, percentual: number): number {
  if (!Number.isFinite(valorPlano) || valorPlano <= 0) return 0;
  if (!Number.isFinite(percentual) || percentual <= 0) return 0;

  const centavos = Math.round(valorPlano * 100);
  const percentualX10000 = Math.round(percentual * 10000);
  const numerador = centavos * percentualX10000;
  const divisor = 100 * 10000;
  // arredondamento half-up com inteiros: floor((2n + d) / 2d)
  const resultado = Math.floor((2 * numerador + divisor) / (2 * divisor));
  return resultado / 100;
}

/**
 * Devolve o array `split` pra assinatura do pedido, ou null quando não há
 * split a fazer (pedido sem afiliada, afiliada inativa ou sem wallet_id).
 *
 * Erro de leitura no banco é lançado, não engolido: quem chama decide. O
 * seguro é criar a assinatura sem split e registrar no log — a comissão
 * continua gravada pela ativar_membro() e sai por Pix, sem risco de pagar em
 * dobro. O que não pode é seguir achando que houve split quando não houve.
 */
export async function montarSplitAfiliada(
  supabase: ClienteServico,
  pedido: PedidoParaSplit,
): Promise<SplitAsaas[] | null> {
  if (!pedido.afiliado_id) return null;

  const { data: afiliado, error: afiliadoErr } = await supabase
    .from("afiliados")
    .select("wallet_id, ativo, percentual")
    .eq("id", pedido.afiliado_id)
    .maybeSingle();

  if (afiliadoErr) {
    throw new Error(`[split] falha ao ler afiliada: ${afiliadoErr.message}`);
  }

  const walletId = (afiliado?.wallet_id ?? "").trim();
  if (!afiliado || !afiliado.ativo || !walletId) return null;

  const percentual =
    afiliado.percentual === null || afiliado.percentual === undefined
      ? PERCENTUAL_PADRAO_AFILIADA
      : Number(afiliado.percentual);
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) {
    throw new Error(`[split] percentual inválido na afiliada: ${afiliado.percentual}`);
  }
  // Percentual zero: não há comissão, então não há o que repassar.
  if (percentual === 0) return null;

  const { data: plano, error: planoErr } = await supabase
    .from("planos")
    .select("valor")
    .eq("slug", pedido.plano_slug)
    .maybeSingle();

  if (planoErr) {
    throw new Error(`[split] falha ao ler plano: ${planoErr.message}`);
  }
  if (!plano) {
    throw new Error(`[split] plano não encontrado: ${pedido.plano_slug}`);
  }

  const fixedValue = valorSplitAfiliada(Number(plano.valor), percentual);
  if (fixedValue <= 0) {
    throw new Error(`[split] valor do plano inválido: ${pedido.plano_slug}`);
  }

  return [{ walletId, fixedValue }];
}
