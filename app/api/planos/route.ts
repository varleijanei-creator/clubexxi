import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/planos?ciclo=MONTHLY
 *
 * Lista os planos ativos com o preço do ciclo pedido. O preço sai das mesmas
 * tabelas que /api/checkout consulta (planos + planos_precos), para não existir
 * valor fixo no front — se o preço mudar no banco, muda na tela sem deploy.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ciclo = searchParams.get("ciclo") ?? "MONTHLY";

  const supabase = createServiceClient();

  const { data: planos, error: planosErr } = await supabase
    .from("planos")
    .select("slug, nome, tipo, valor, ativo")
    .eq("ativo", true);

  if (planosErr) {
    console.error("[planos] erro ao buscar planos", planosErr);
    return NextResponse.json(
      { error: "Erro ao consultar os planos." },
      { status: 500 },
    );
  }

  const { data: precos, error: precosErr } = await supabase
    .from("planos_precos")
    .select("plano_slug, valor, ciclo, meses, ativo")
    .eq("ciclo", ciclo)
    .eq("ativo", true);

  if (precosErr) {
    console.error("[planos] erro ao buscar preços", precosErr);
    return NextResponse.json(
      { error: "Erro ao consultar os preços." },
      { status: 500 },
    );
  }

  const precoPorSlug = new Map(
    (precos ?? []).map((p) => [p.plano_slug, Number(p.valor)]),
  );

  // Mesma regra de fallback da rota de checkout: preço do ciclo, senão o do plano.
  const resultado = (planos ?? [])
    .map((plano) => ({
      slug: plano.slug,
      nome: plano.nome,
      tipo: plano.tipo,
      valor: precoPorSlug.get(plano.slug) ?? Number(plano.valor),
      ciclo,
    }))
    .filter((p) => Number.isFinite(p.valor) && p.valor > 0);

  return NextResponse.json({ planos: resultado });
}
