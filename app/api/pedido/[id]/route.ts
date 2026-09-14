import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function naoEncontrado() {
  return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
}

type PrimeiraEdicao = { nome: string; fechamento: string } | null;

/**
 * A primeira carta da pessoa: edição aberta cujo fechamento ainda não passou;
 * sem isso, a próxima edição por mês. Cobre o caso do prazo (assina até dia 20
 * pega a edição corrente, depois disso pega a seguinte) sem repetir a regra
 * aqui — quem fecha isso é o campo `fechamento` de cada edição no banco.
 */
async function buscarPrimeiraEdicao(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<PrimeiraEdicao> {
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: aberta } = await supabase
    .from("edicoes")
    .select("nome, fechamento, mes")
    .eq("status", "aberta")
    .gte("fechamento", hoje)
    .order("mes", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (aberta) return { nome: aberta.nome, fechamento: aberta.fechamento };

  const { data: proxima } = await supabase
    .from("edicoes")
    .select("nome, fechamento, mes")
    .gte("mes", hoje)
    .order("mes", { ascending: true })
    .limit(1)
    .maybeSingle();

  return proxima ? { nome: proxima.nome, fechamento: proxima.fechamento } : null;
}

/**
 * GET /api/pedido/[id]
 *
 * Leitura enxuta pra tela de retorno do checkout. Devolve só o que é
 * inofensivo se o id do pedido vazar pela URL — nunca CPF, e-mail, telefone,
 * endereço ou o dados_json inteiro.
 *
 * Funciona mesmo com o pedido ainda 'iniciado' (webhook do Asaas atrasado):
 * lê pedidos.dados_json, nunca depende de membros existir.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return naoEncontrado();

  const supabase = createServiceClient();

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select("plano_slug, dados_json")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[pedido] erro ao buscar pedido", error);
    return naoEncontrado();
  }
  if (!pedido) return naoEncontrado();

  const dadosJson = (pedido.dados_json ?? {}) as {
    pessoais?: { nome?: string };
    valor?: number;
  };

  const primeiroNome = (dadosJson.pessoais?.nome ?? "").trim().split(/\s+/)[0] ?? "";

  const { data: planoRow } = await supabase
    .from("planos")
    .select("nome, valor, meses, link_comunidade")
    .eq("slug", pedido.plano_slug)
    .maybeSingle();

  const valor = Number(dadosJson.valor ?? planoRow?.valor ?? 0);
  const primeiraEdicao = await buscarPrimeiraEdicao(supabase);

  return NextResponse.json({
    primeiro_nome: primeiroNome,
    plano_nome: planoRow?.nome ?? pedido.plano_slug,
    plano_slug: pedido.plano_slug,
    valor,
    meses: planoRow?.meses ?? 1,
    link_comunidade: planoRow?.link_comunidade ?? null,
    primeira_edicao: primeiraEdicao,
  });
}
