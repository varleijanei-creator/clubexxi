import { createServiceClient } from "@/lib/supabase/server";
import type { Preco, ProdutoLinha, DetalheProduto } from "@/lib/admin/produtos-tipos";

/**
 * Dados da Tela 4 (Produtos) do painel admin — spec-painel-admin.md.
 *
 * `produtos` e `produtos_precos` têm RLS ligada com UMA policy cada, e as
 * duas são só de leitura pública (`ativo = true`) — não existe policy de
 * escrita pra admin nenhuma. Diferente das outras telas, aqui a service
 * role não é só por consistência: sem ela, nenhum INSERT/UPDATE/DELETE
 * passa, nem logado como admin.
 */

// Reexporta pros arquivos de servidor que importavam daqui — só componente
// de cliente precisa ir direto em produtos-tipos.
export { CATEGORIAS, CONTEXTOS, type Preco, type ProdutoLinha, type DetalheProduto } from "@/lib/admin/produtos-tipos";

type ProdutoBruto = {
  slug: string;
  nome: string;
  categoria: string;
  ativo: boolean;
  bump: boolean;
  cabe_envelope: boolean;
  pede_endereco: boolean;
  estoque: number | null;
  ordem: number;
  produtos_precos: { id: string; contexto: string; valor: number; ativo: boolean }[] | null;
};

function mapearPrecos(precos: ProdutoBruto["produtos_precos"]): Preco[] {
  return (precos ?? []).map((p) => ({
    id: p.id,
    contexto: p.contexto,
    valor: Number(p.valor),
    ativo: p.ativo,
  }));
}

export async function buscarProdutos(): Promise<ProdutoLinha[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("slug, nome, categoria, ativo, bump, cabe_envelope, pede_endereco, estoque, ordem, produtos_precos(*)")
    .order("ordem")
    .order("nome");

  if (error) {
    throw new Error(`[produtos] falha ao ler produtos: ${error.message}`);
  }

  return ((data ?? []) as unknown as ProdutoBruto[]).map((p) => ({
    slug: p.slug,
    nome: p.nome,
    categoria: p.categoria,
    ativo: p.ativo,
    bump: p.bump,
    cabeEnvelope: p.cabe_envelope,
    pedeEndereco: p.pede_endereco,
    estoque: p.estoque,
    ordem: p.ordem,
    precos: mapearPrecos(p.produtos_precos),
  }));
}

export async function buscarProduto(slug: string): Promise<DetalheProduto | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("produtos")
    .select("*, produtos_precos(*)")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`[produtos] falha ao ler produto: ${error.message}`);
  }
  if (!data) return null;

  const p = data as unknown as ProdutoBruto & {
    descricao: string | null;
    bump_titulo: string | null;
    imagem_url: string | null;
  };
  return {
    slug: p.slug,
    nome: p.nome,
    descricao: p.descricao,
    categoria: p.categoria,
    ativo: p.ativo,
    bump: p.bump,
    bumpTitulo: p.bump_titulo,
    pedeEndereco: p.pede_endereco,
    cabeEnvelope: p.cabe_envelope,
    estoque: p.estoque,
    ordem: p.ordem,
    imagemUrl: p.imagem_url,
    precos: mapearPrecos(p.produtos_precos),
  };
}
