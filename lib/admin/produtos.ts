import { createServiceClient } from "@/lib/supabase/server";

/**
 * Dados da Tela 4 (Produtos) do painel admin — spec-painel-admin.md.
 *
 * `produtos` e `produtos_precos` têm RLS ligada com UMA policy cada, e as
 * duas são só de leitura pública (`ativo = true`) — não existe policy de
 * escrita pra admin nenhuma. Diferente das outras telas, aqui a service
 * role não é só por consistência: sem ela, nenhum INSERT/UPDATE/DELETE
 * passa, nem logado como admin.
 */

export const CATEGORIAS = [
  { valor: "print", rotulo: "Print" },
  { valor: "carta_taro", rotulo: "Carta de tarô" },
  { valor: "edicao", rotulo: "Edição avulsa" },
  { valor: "baralho", rotulo: "Baralho" },
  { valor: "presente", rotulo: "Presente" },
  { valor: "vestuario", rotulo: "Vestuário" },
  { valor: "acessorio", rotulo: "Acessório" },
  { valor: "outro", rotulo: "Outro" },
] as const;

export const CONTEXTOS = [
  { valor: "avulso", rotulo: "Avulso (Shop)" },
  { valor: "bump", rotulo: "Order bump (checkout)" },
] as const;

export type Preco = {
  id: string;
  contexto: string;
  valor: number;
  ativo: boolean;
};

export type ProdutoLinha = {
  slug: string;
  nome: string;
  categoria: string;
  ativo: boolean;
  bump: boolean;
  cabeEnvelope: boolean;
  pedeEndereco: boolean;
  estoque: number | null;
  ordem: number;
  precos: Preco[];
};

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

export type DetalheProduto = {
  slug: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  ativo: boolean;
  bump: boolean;
  bumpTitulo: string | null;
  pedeEndereco: boolean;
  cabeEnvelope: boolean;
  estoque: number | null;
  ordem: number;
  imagemUrl: string | null;
  precos: Preco[];
};

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

  const p = data as unknown as ProdutoBruto & { descricao: string | null; bump_titulo: string | null; imagem_url: string | null };
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
