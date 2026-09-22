import { notFound } from "next/navigation";
import Link from "next/link";
import { buscarProduto } from "@/lib/admin/produtos";
import { excluirProduto } from "@/lib/admin/produtos-acoes";
import { paramTexto } from "@/lib/searchParams";
import FormEditarProduto from "@/components/admin/FormEditarProduto";
import TabelaPrecos from "@/components/admin/TabelaPrecos";
import BotaoExcluir from "@/components/admin/BotaoExcluir";

export default async function PaginaDetalheProduto({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const erro = paramTexto(query, "erro");
  const sucesso = paramTexto(query, "sucesso");

  const produto = await buscarProduto(slug);
  if (!produto) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/produtos"
          className="text-sm text-[var(--c21-tinta-suave)] underline underline-offset-2"
        >
          ← Produtos
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-[var(--c21-tinta)]">{produto.nome}</h1>
      </div>

      {erro && (
        <p className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-erro)] bg-[var(--c21-papel)] px-4 py-2 text-sm text-[var(--c21-erro)]">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-sucesso)] bg-[var(--c21-papel)] px-4 py-2 text-sm text-[var(--c21-sucesso)]">
          {sucesso}
        </p>
      )}

      <section className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--c21-tinta)]">Dados do produto</h2>
        <FormEditarProduto produto={produto} />
      </section>

      <section className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--c21-tinta)]">Preços</h2>
        <TabelaPrecos slug={produto.slug} precos={produto.precos} />
      </section>

      <section className="rounded-[var(--c21-raio-md)] border border-[var(--c21-erro)] bg-[var(--c21-papel)] p-4">
        <h2 className="mb-2 text-sm font-semibold text-[var(--c21-tinta)]">Excluir produto</h2>
        <p className="mb-2 text-xs text-[var(--c21-tinta-suave)]">
          Remove o produto e todos os preços cadastrados dele. Não afeta assinaturas nem pedidos já feitos.
        </p>
        <BotaoExcluir
          action={excluirProduto}
          campos={{ slug: produto.slug }}
          pergunta={`Excluir "${produto.nome}" e todos os preços dele?`}
        />
      </section>
    </div>
  );
}
