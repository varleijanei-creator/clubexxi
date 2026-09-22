/**
 * Tipos e constantes da Tela 4 (Produtos) sem nenhum import de servidor —
 * mesmo motivo de lib/admin/membras-tipos.ts: componente de cliente que
 * importasse de lib/admin/produtos.ts arrastaria createServiceClient (usa
 * next/headers) pro bundle do navegador e quebraria o build.
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

// ---------- Estado dos formulários com useActionState ----------
// Em erro de validação a action devolve { erro, valores } em vez de redirect
// — assim o formulário reaparece com o que a pessoa digitou, não em branco.

export type ValoresProduto = {
  slug: string;
  nome: string;
  categoria: string;
  descricao: string;
  estoque: string;
  ordem: string;
  imagem_url: string;
  bump_titulo: string;
  bump: boolean;
  pede_endereco: boolean;
  cabe_envelope: boolean;
  ativo: boolean;
};

export type EstadoProduto = {
  erro: string | null;
  valores: ValoresProduto;
};

export const VALORES_PRODUTO_VAZIOS: ValoresProduto = {
  slug: "",
  nome: "",
  categoria: "",
  descricao: "",
  estoque: "",
  ordem: "0",
  imagem_url: "",
  bump_titulo: "",
  bump: false,
  pede_endereco: false,
  cabe_envelope: true,
  ativo: false,
};

export type ValoresPreco = {
  contexto: string;
  valor: string;
  ativo: boolean;
};

export type EstadoPreco = {
  erro: string | null;
  valores: ValoresPreco;
};
