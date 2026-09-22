"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { ehAdmin } from "@/lib/auth/autorizacao";
import { CATEGORIAS, CONTEXTOS } from "@/lib/admin/produtos";

/**
 * Escritas da Tela 4 (Produtos). Server Actions pelo mesmo motivo das
 * outras telas (route.ts não divide segmento com page.tsx) — e aqui elas
 * são ainda mais necessárias: produtos/produtos_precos não têm NENHUMA
 * policy de escrita via RLS, só a service role grava.
 *
 * Cada função confere sessão e admin de novo — Server Action não passa
 * pelo guard do layout.
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
const CATEGORIAS_VALIDAS = new Set(CATEGORIAS.map((c) => c.valor));
const CONTEXTOS_VALIDOS = new Set(CONTEXTOS.map((c) => c.valor));

function erroProduto(slug: string | null, mensagem: string): never {
  const destino = slug ? `/admin/produtos/${slug}` : "/admin/produtos";
  redirect(`${destino}?erro=${encodeURIComponent(mensagem)}`);
}

export async function criarProduto(formData: FormData): Promise<void> {
  await exigirAdmin();

  const slug = texto(formData, "slug").toLowerCase();
  const nome = texto(formData, "nome");
  const categoria = texto(formData, "categoria");
  const descricao = texto(formData, "descricao");
  const estoqueTexto = texto(formData, "estoque");
  const ordemTexto = texto(formData, "ordem");
  const imagemUrl = texto(formData, "imagem_url");
  const bump = formData.get("bump") === "on";
  const bumpTitulo = texto(formData, "bump_titulo");
  const pedeEndereco = formData.get("pede_endereco") === "on";
  const cabeEnvelope = formData.get("cabe_envelope") === "on";

  if (!slug || !SLUG_VALIDO.test(slug)) {
    erroProduto(null, "Slug é obrigatório e só pode ter letras minúsculas, números e hífen.");
  }
  if (!nome) erroProduto(null, "Nome é obrigatório.");
  if (!CATEGORIAS_VALIDAS.has(categoria as (typeof CATEGORIAS)[number]["valor"])) {
    erroProduto(null, "Escolha uma categoria válida.");
  }

  let estoque: number | null = null;
  if (estoqueTexto) {
    const n = Number(estoqueTexto);
    if (!Number.isInteger(n) || n < 0) erroProduto(null, "Estoque precisa ser um número inteiro, 0 ou maior.");
    estoque = n;
  }

  const ordem = ordemTexto ? Number(ordemTexto) : 0;
  if (!Number.isFinite(ordem)) erroProduto(null, "Ordem precisa ser um número.");

  const supabase = createServiceClient();
  // ativo nasce false sempre — não é campo do formulário de criação, é a
  // regra do spec ("nasce false de propósito"). Só liga depois, na edição,
  // quando já tiver preço ativo cadastrado.
  const { error } = await supabase.from("produtos").insert({
    slug,
    nome,
    descricao: descricao || null,
    categoria,
    ativo: false,
    bump,
    bump_titulo: bumpTitulo || null,
    pede_endereco: pedeEndereco,
    cabe_envelope: cabeEnvelope,
    estoque,
    ordem,
    imagem_url: imagemUrl || null,
  });

  if (error) {
    erroProduto(null, error.code === "23505" ? "Já existe um produto com esse slug." : `Erro ao salvar: ${error.message}`);
  }

  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${slug}?sucesso=Produto+criado.+Ainda+está+inativo.`);
}

export async function atualizarProduto(formData: FormData): Promise<void> {
  await exigirAdmin();

  const slug = texto(formData, "slug");
  if (!slug) erroProduto(null, "Produto inválido.");

  const nome = texto(formData, "nome");
  const categoria = texto(formData, "categoria");
  const descricao = texto(formData, "descricao");
  const estoqueTexto = texto(formData, "estoque");
  const ordemTexto = texto(formData, "ordem");
  const imagemUrl = texto(formData, "imagem_url");
  const bump = formData.get("bump") === "on";
  const bumpTitulo = texto(formData, "bump_titulo");
  const pedeEndereco = formData.get("pede_endereco") === "on";
  const cabeEnvelope = formData.get("cabe_envelope") === "on";
  const ativo = formData.get("ativo") === "on";

  if (!nome) erroProduto(slug, "Nome é obrigatório.");
  if (!CATEGORIAS_VALIDAS.has(categoria as (typeof CATEGORIAS)[number]["valor"])) {
    erroProduto(slug, "Escolha uma categoria válida.");
  }

  let estoque: number | null = null;
  if (estoqueTexto) {
    const n = Number(estoqueTexto);
    if (!Number.isInteger(n) || n < 0) erroProduto(slug, "Estoque precisa ser um número inteiro, 0 ou maior.");
    estoque = n;
  }

  const ordem = ordemTexto ? Number(ordemTexto) : 0;
  if (!Number.isFinite(ordem)) erroProduto(slug, "Ordem precisa ser um número.");

  if (ativo) {
    const supabaseChecagem = createServiceClient();
    const { count } = await supabaseChecagem
      .from("produtos_precos")
      .select("id", { count: "exact", head: true })
      .eq("produto_slug", slug)
      .eq("ativo", true);
    if (!count) {
      erroProduto(
        slug,
        "Cadastre um preço ativo antes de ativar o produto — regra do spec: \"só aparece com preço ativo cadastrado\".",
      );
    }
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("produtos")
    .update({
      nome,
      descricao: descricao || null,
      categoria,
      ativo,
      bump,
      bump_titulo: bumpTitulo || null,
      pede_endereco: pedeEndereco,
      cabe_envelope: cabeEnvelope,
      estoque,
      ordem,
      imagem_url: imagemUrl || null,
    })
    .eq("slug", slug);

  if (error) erroProduto(slug, `Erro ao salvar: ${error.message}`);

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
  if (error) erroProduto(slug, `Erro ao excluir: ${error.message}`);

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos?sucesso=Produto+excluído.");
}

export async function criarPreco(formData: FormData): Promise<void> {
  await exigirAdmin();

  const slug = texto(formData, "produto_slug");
  const contexto = texto(formData, "contexto");
  const valorTexto = texto(formData, "valor").replace(",", ".");
  const ativo = formData.get("ativo") === "on";

  if (!slug) redirect("/admin/produtos");
  if (!CONTEXTOS_VALIDOS.has(contexto as (typeof CONTEXTOS)[number]["valor"])) {
    erroProduto(slug, "Escolha um contexto de preço válido.");
  }
  const valor = Number(valorTexto);
  if (!Number.isFinite(valor) || valor < 0) erroProduto(slug, "Valor precisa ser um número, 0 ou maior.");

  const supabase = createServiceClient();
  const { error } = await supabase.from("produtos_precos").insert({
    produto_slug: slug,
    contexto,
    valor,
    ativo,
  });

  if (error) erroProduto(slug, `Erro ao salvar preço: ${error.message}`);

  revalidatePath(`/admin/produtos/${slug}`);
  redirect(`/admin/produtos/${slug}?sucesso=Preço+adicionado.`);
}

export async function atualizarPreco(formData: FormData): Promise<void> {
  await exigirAdmin();

  const id = texto(formData, "id");
  const slug = texto(formData, "produto_slug");
  const contexto = texto(formData, "contexto");
  const valorTexto = texto(formData, "valor").replace(",", ".");
  const ativo = formData.get("ativo") === "on";

  if (!id || !slug) redirect("/admin/produtos");
  if (!CONTEXTOS_VALIDOS.has(contexto as (typeof CONTEXTOS)[number]["valor"])) {
    erroProduto(slug, "Escolha um contexto de preço válido.");
  }
  const valor = Number(valorTexto);
  if (!Number.isFinite(valor) || valor < 0) erroProduto(slug, "Valor precisa ser um número, 0 ou maior.");

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("produtos_precos")
    .update({ contexto, valor, ativo })
    .eq("id", id);

  if (error) erroProduto(slug, `Erro ao salvar preço: ${error.message}`);

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
  if (error) erroProduto(slug, `Erro ao excluir preço: ${error.message}`);

  revalidatePath(`/admin/produtos/${slug}`);
  redirect(`/admin/produtos/${slug}?sucesso=Preço+excluído.`);
}
