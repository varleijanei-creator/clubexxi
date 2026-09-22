import type { Preco } from "@/lib/admin/produtos-tipos";
import LinhaPreco from "./LinhaPreco";
import FormNovoPreco from "./FormNovoPreco";

/** Preços de um produto — avulso e/ou bump, cada linha editável e removível. */
export default function TabelaPrecos({ slug, precos }: { slug: string; precos: Preco[] }) {
  return (
    <div className="flex flex-col gap-3">
      {precos.length === 0 && (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhum preço cadastrado ainda.</p>
      )}

      {precos.map((p) => (
        <LinhaPreco key={p.id} slug={slug} preco={p} />
      ))}

      <FormNovoPreco slug={slug} />
    </div>
  );
}
