import type { PlanoLinha } from "@/lib/admin/planos-tipos";
import LinhaPlano from "./LinhaPlano";

/**
 * Planos — nome, slug, ciclo e valor cobrado hoje (planos.valor, é o que o
 * checkout lê). Sem excluir e sem editar slug: assinaturas existentes
 * dependem dele.
 */
export default function TabelaPlanos({ linhas }: { linhas: PlanoLinha[] }) {
  if (linhas.length === 0) {
    return (
      <p className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-6 text-center text-sm text-[var(--c21-tinta-suave)]">
        Nenhum plano cadastrado.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)]">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--c21-linha)] text-left text-xs text-[var(--c21-tinta-suave)]">
            <th className="px-4 py-3 font-medium">Plano</th>
            <th className="px-4 py-3 font-medium">Ciclo</th>
            <th className="px-4 py-3 font-medium">Valor / descrição / ativo</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((p) => (
            <LinhaPlano key={p.slug} plano={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
