"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { ehAdmin } from "@/lib/auth/autorizacao";
import { CATEGORIAS, CONTEXTOS } from "@/lib/admin/produtos-tipos";
import type { EstadoProduto, EstadoPreco, ValoresProduto, ValoresPreco } from "@/lib/admin/produtos-tipos";

/**
 * Escritas da Tela 4 (Produtos). Server Actions pelo mesmo motivo das
 * outras telas (route.ts não divide segmento com page.tsx) — e aqui elas
 * são ainda mais necessárias: produtos/produtos_precos não têm NENHUMA
 * policy de escrita via RLS, só a service role grava.
 *
 * Cada função confere sessão e admin de novo — Server Action não passa
 * pelo guard do layout.
 *
 * criarProduto/atualizarProduto/criarPreco/atualizarPreco usam a assinatura
 * (estadoAnterior, formData) do useActionState: em erro de validação
 * devolvem { erro, valores } em vez de redirect, pro formulário reaparecer
 * com o que a pessoa digitou. excluirProduto/excluirPreco continuam
 * redirect simples — são só um clique de confirmação, não há dado digitado
 * pra perder.
 */
async function exigirAdmin(): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario || !(await ehAdmin(usuario.email))) {
    redirect("/admin/login");
  }
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

const SLUG_VALIDO = /^[a-z0-9-]+$/;
const CATEGORIAS_VALIDAS = new Set<string>(CATEGORIAS.map((c) => c.valor));
const CONTEXTOS_VALIDOS = new Set<string>(CONTEXTOS.map((c) => c.valor));

function valoresProdutoDoForm(formData: FormData, extra?: Partial<ValoresProduto>): ValoresProduto {
  return {
    slug: texto(formData, "slug"),
    nome: texto(formData, "nome"),
    categoria: texto(formData, "categoria"),
    descricao: texto(formData, "descricao"),
    estoque: texto(formData, "estoque"),
    ordem: texto(formData, "ordem"),
    imagem_url: texto(formData, "imagem_url"),
    bump_titulo: texto(formData, "bump_titulo"),
    bump: formData.get("bump") === "on",
    pede_endereco: formData.get("pede_endereco") === "on",
    cabe_envelope: formData.get("cabe_envelope") === "on",
    ativo: formData.get("ativo") === "on",
    ...extra,
  };
}

function validarComuns(valores: ValoresProduto): { estoque: number | null; ordem: number } | string {
  if (!valores.nome) return "Nome é obrigatório.";
  if (!CATEGORIAS_VALIDAS.has(valores.categoria)) return "Escolha uma categoria válida.";

  let estoque: number | null = null;
  if (valores.estoque) {
    const n = Number(valores.estoque);
    if (!Number.isInteger(n) || n < 0) return "Estoque precisa ser um número inteiro, 0 ou maior.";
    estoque = n;
  }

  const ordem = valores.ordem ? Number(valores.ordem) : 0;
  if (!Number.isFinite(ordem)) return "Ordem precisa ser um número.";

  return { estoque, ordem };
}

export async function criarProduto(_estadoAnterior: EstadoProduto, formData: FormData): Promise<EstadoProduto> {
  await exigirAdmin();

  const valores = valoresProdutoDoForm(formData, { slug: texto(formData, "slug").toLowerCase() });

  if (!valores.slug || !SLUG_VALIDO.test(valores.slug)) {
    return { erro: "Slug é obrigatório e só pode ter letras minúsculas, números e hífen.", valores };
  }

  const comuns = validarComuns(valores);
  if (typeof comuns === "string") return { erro: comuns, valores };

  const supabase = createServiceClient();
  // ativo nasce false sempre — não é campo do formulário de criação, é a
  // regra do spec ("nasce false de propósito"). Só liga depois, na edição,
  // quando já tiver preço ativo cadastrado.
  const { error } = await supabase.from("produtos").insert({
    slug: valores.slug,
    nome: valores.nome,
    descricao: valores.descricao || null,
    categoria: valores.categoria,
    ativo: false,
    bump: valores.bump,
    bump_titulo: valores.bump_titulo || null,
    pede_endereco: valores.pede_endereco,
    cabe_envelope: valores.cabe_envelope,
    estoque: comuns.estoque,
    ordem: comuns.ordem,
    imagem_url: valores.imagem_url || null,
  });

  if (error) {
    return {
      erro: error.code === "23505" ? "Já existe um produto com esse slug." : `Erro ao salvar: ${error.message}`,
      valores,
    };
  }

  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${valores.slug}?sucesso=Produto+criado.+Ainda+está+inativo.`);
}

export async function atualizarProduto(_estadoAnterior: EstadoProduto, formData: FormData): Promise<EstadoProduto> {
  await exigirAdmin();

  const valores = valoresProdutoDoForm(formData);
  const slug = valores.slug;
  if (!slug) return { erro: "Produto inválido.", valores };

  const comuns = validarComuns(valores);
  if (typeof comuns === "string") return { erro: comuns, valores };

  if (valores.ativo) {
    const supabaseChecagem = createServiceClient();
    const { count } = await supabaseChecagem
      .from("produtos_precos")
      .select("id", { count: "exact", head: true })
      .eq("produto_slug", slug)
      .eq("ativo", true);
    if (!count) {
      return {
        erro: 'Cadastre um preço ativo antes de ativar o produto — regra do spec: "só aparece com preço ativo cadastrado".',
        valores,
      };
    }
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("produtos")
    .update({
      nome: valores.nome,
      descricao: valores.descricao || null,
      categoria: valores.categoria,
      ativo: valores.ativo,
      bump: valores.bump,
      bump_titulo: valores.bump_titulo || null,
      pede_endereco: valores.pede_endereco,
      cabe_envelope: valores.cabe_envelope,
      estoque: comuns.estoque,
      ordem: comuns.ordem,
      imagem_url: valores.imagem_url || null,
    })
    .eq("slug", slug);

  if (error) return { erro: `Erro ao salvar: ${error.message}`, valores };

  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${slug}`);
  redirect(`/admin/produtos/${slug}?sucesso=Produto+atualizado.`);
}

export async function excluirProduto(formData: FormData): Promise<void> {
  await exigirAdmin();
  const slug = texto(formData, "slug");
  if (!slug) redirect("/admin/produtos");

  const supabase = createServiceClient();
  // ON DELETE CASCADE em produtos_precos — apagar o produto apaga os
  // preços dele junto, de propósito (confirmado no schema antes de montar
  // esta ação).
  const { error } = await supabase.from("produtos").delete().eq("slug", slug);
  if (error) redirect(`/admin/produtos/${slug}?erro=${encodeURIComponent(`Erro ao excluir: ${error.message}`)}`);

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos?sucesso=Produto+excluído.");
}

function valoresPrecoDoForm(formData: FormData): ValoresPreco {
  return {
    contexto: texto(formData, "contexto"),
    valor: texto(formData, "valor"),
    ativo: formData.get("ativo") === "on",
  };
}

function validarPreco(valores: ValoresPreco): number | string {
  if (!CONTEXTOS_VALIDOS.has(valores.contexto)) return "Escolha um contexto de preço válido.";
  const valor = Number(valores.valor.replace(",", "."));
  if (!Number.isFinite(valor) || valor < 0) return "Valor precisa ser um número, 0 ou maior.";
  return valor;
}

export async function criarPreco(_estadoAnterior: EstadoPreco, formData: FormData): Promise<EstadoPreco> {
  await exigirAdmin();

  const slug = texto(formData, "produto_slug");
  const valores = valoresPrecoDoForm(formData);
  if (!slug) redirect("/admin/produtos");

  const valorOuErro = validarPreco(valores);
  if (typeof valorOuErro === "string") return { erro: valorOuErro, valores };

  const supabase = createServiceClient();
  const { error } = await supabase.from("produtos_precos").insert({
    produto_slug: slug,
    contexto: valores.contexto,
    valor: valorOuErro,
    ativo: valores.ativo,
  });

  if (error) return { erro: `Erro ao salvar preço: ${error.message}`, valores };

  revalidatePath(`/admin/produtos/${slug}`);
  redirect(`/admin/produtos/${slug}?sucesso=Preço+adicionado.`);
}

export async function atualizarPreco(_estadoAnterior: EstadoPreco, formData: FormData): Promise<EstadoPreco> {
  await exigirAdmin();

  const id = texto(formData, "id");
  const slug = texto(formData, "produto_slug");
  const valores = valoresPrecoDoForm(formData);
  if (!id || !slug) redirect("/admin/produtos");

  const valorOuErro = validarPreco(valores);
  if (typeof valorOuErro === "string") return { erro: valorOuErro, valores };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("produtos_precos")
    .update({ contexto: valores.contexto, valor: valorOuErro, ativo: valores.ativo })
    .eq("id", id);

  if (error) return { erro: `Erro ao salvar preço: ${error.message}`, valores };

  revalidatePath(`/admin/produtos/${slug}`);
  redirect(`/admin/produtos/${slug}?sucesso=Preço+atualizado.`);
}

export async function excluirPreco(formData: FormData): Promise<void> {
  await exigirAdmin();

  const id = texto(formData, "id");
  const slug = texto(formData, "produto_slug");
  if (!id || !slug) redirect("/admin/produtos");

  const supabase = createServiceClient();
  const { error } = await supabase.from("produtos_precos").delete().eq("id", id);
  if (error) redirect(`/admin/produtos/${slug}?erro=${encodeURIComponent(`Erro ao excluir preço: ${error.message}`)}`);

  revalidatePath(`/admin/produtos/${slug}`);
  redirect(`/admin/produtos/${slug}?sucesso=Preço+excluído.`);
}
