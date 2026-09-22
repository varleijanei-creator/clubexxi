import Link from "next/link";
import type { ProdutoLinha } from "@/lib/admin/produtos";
import { CATEGORIAS } from "@/lib/admin/produtos";
import { formatarValor } from "@/lib/formatacao";

const NOMES_CATEGORIA = new Map<string, string>(CATEGORIAS.map((c) => [c.valor, c.rotulo]));

function rotuloEstoque(estoque: number | null): { texto: string; cor: string } {
  if (estoque === null) return { texto: "Ilimitado", cor: "var(--c21-tinta-suave)" };
  if (estoque === 0) return { texto: "Esgotado", cor: "var(--c21-erro)" };
  return { texto: String(estoque), cor: "var(--c21-tinta)" };
}

function resumoPrecos(precos: ProdutoLinha["precos"]): string {
  if (precos.length === 0) return "sem preço";
  return precos
    .map((p) => `${p.contexto === "bump" ? "bump" : "avulso"} ${formatarValor(p.valor)}${p.ativo ? "" : " (inativo)"}`)
    .join(" · ");
}

/** Lista de produtos — spec-painel-admin.md, Tela 4. */
export default function TabelaProdutos({ linhas }: { linhas: ProdutoLinha[] }) {
  if (linhas.length === 0) {
    return (
      <p className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-6 text-center text-sm text-[var(--c21-tinta-suave)]">
        Nenhum produto cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)]">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--c21-linha)] text-left text-xs text-[var(--c21-tinta-suave)]">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium">Envio</th>
            <th className="px-4 py-3 font-medium">Estoque</th>
            <th className="px-4 py-3 font-medium">Preços</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((p) => {
            const estoque = rotuloEstoque(p.estoque);
            return (
              <tr key={p.slug} className="border-b border-[var(--c21-linha)] last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/produtos/${p.slug}`}
                    className="font-medium text-[var(--c21-tinta)] underline underline-offset-2"
                  >
                    {p.nome}
                  </Link>
                  {p.bump && (
                    <span className="ml-2 rounded-[var(--c21-raio-pilula)] bg-[var(--c21-cobalto)] px-2 py-0.5 text-[10px] font-bold text-[var(--c21-papel)]">
                      BUMP
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--c21-tinta-suave)]">
                  {NOMES_CATEGORIA.get(p.categoria) ?? p.categoria}
                </td>
                <td className="px-4 py-3">
                  {p.cabeEnvelope ? (
                    <span className="text-[var(--c21-tinta-suave)]">Cabe no envelope</span>
                  ) : (
                    <span className="font-semibold text-[var(--c21-laranja)]">Frete próprio</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums" style={{ color: estoque.cor }}>
                  {estoque.texto}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--c21-tinta-suave)]">{resumoPrecos(p.precos)}</td>
                <td className="px-4 py-3">
                  {p.ativo ? (
                    <span className="text-[var(--c21-sucesso)]">Ativo</span>
                  ) : (
                    <span className="text-[var(--c21-tinta-suave)]">Inativo</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
