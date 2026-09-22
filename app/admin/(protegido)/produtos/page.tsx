import { buscarProdutos } from "@/lib/admin/produtos";
import { paramTexto } from "@/lib/searchParams";
import FormNovoProduto from "@/components/admin/FormNovoProduto";
import TabelaProdutos from "@/components/admin/TabelaProdutos";

// Tela 5 do spec-painel-admin.md — CRUD de produtos e preços. Cadastro fica
// aqui; edição, preços e exclusão ficam no detalhe (/admin/produtos/[slug]).
export default async function PaginaProdutos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const erro = paramTexto(params, "erro");
  const sucesso = paramTexto(params, "sucesso");
  const produtos = await buscarProdutos();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--c21-tinta)]">Produtos</h1>

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

      <FormNovoProduto />

      <TabelaProdutos linhas={produtos} />
    </div>
  );
}
