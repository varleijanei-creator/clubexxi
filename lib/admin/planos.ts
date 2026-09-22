import { createServiceClient } from "@/lib/supabase/server";
import type { PlanoLinha } from "@/lib/admin/planos-tipos";

/**
 * Leitura de `planos` (+ `planos_precos`) pra seção Planos da Tela 4.
 *
 * Achado ao montar isso: `planos_precos` só tem linha pra 3 dos 7 slugs de
 * `planos` (semente, flor, pessego — nenhuma das variantes "-trimestral"
 * nem presente-edicao). E o checkout não lê `planos_precos` mais: há um
 * comentário no próprio código, em app/api/planos/route.ts, dizendo que
 * parou de juntar com ela. `app/api/checkout/route.ts` também lê o preço
 * direto de `planos.valor`.
 *
 * Ou seja: quem cobra de verdade é `planos.valor`. Por isso só esse valor
 * é editável aqui; o de `planos_precos`, quando existe, aparece só como
 * informação (`precoLegado`).
 */
export async function buscarPlanos(): Promise<PlanoLinha[]> {
  const supabase = createServiceClient();

  const [planosRes, precosRes] = await Promise.all([
    supabase.from("planos").select("*").order("ordem").order("nome"),
    supabase.from("planos_precos").select("plano_slug, ciclo, valor, ativo"),
  ]);

  if (planosRes.error) {
    throw new Error(`[planos] falha ao ler planos: ${planosRes.error.message}`);
  }
  if (precosRes.error) {
    throw new Error(`[planos] falha ao ler planos_precos: ${precosRes.error.message}`);
  }

  const precosPorSlug = new Map((precosRes.data ?? []).map((p) => [p.plano_slug, p]));

  return (planosRes.data ?? []).map((p) => {
    const legado = precosPorSlug.get(p.slug);
    return {
      slug: p.slug,
      nome: p.nome,
      tipo: p.tipo,
      ciclo: p.ciclo,
      meses: p.meses,
      valor: Number(p.valor),
      ativo: p.ativo,
      descricao: p.descricao,
      precoLegado: legado ? { ciclo: legado.ciclo, valor: Number(legado.valor), ativo: legado.ativo } : null,
    };
  });
}
