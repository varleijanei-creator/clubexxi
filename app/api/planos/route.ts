import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/planos
 *
 * Lista os planos ativos, com os dois ciclos (mensal e trimestral) — cada
 * combinação plano+ciclo é sua própria linha em `planos`, já com o valor
 * certo, então não precisa mais juntar com planos_precos. O front filtra
 * pra mensal na listagem e usa `familia` pra achar o trimestral no upsell.
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data: planos, error } = await supabase
    .from("planos")
    .select("slug, nome, tipo, valor, ciclo, meses, familia, ordem, descricao")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  if (error) {
    console.error("[planos] erro ao buscar planos", error);
    return NextResponse.json(
      { error: "Erro ao consultar os planos." },
      { status: 500 },
    );
  }

  const resultado = (planos ?? [])
    .map((plano) => ({
      slug: plano.slug,
      nome: plano.nome,
      tipo: plano.tipo,
      valor: Number(plano.valor),
      ciclo: plano.ciclo,
      meses: plano.meses,
      familia: plano.familia,
      ordem: plano.ordem,
      descricao: plano.descricao,
    }))
    .filter((p) => Number.isFinite(p.valor) && p.valor > 0);

  return NextResponse.json({ planos: resultado });
}
