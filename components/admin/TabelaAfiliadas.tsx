import Link from "next/link";
import type { AfiliadaLinha } from "@/lib/admin/afiliadas";
import { linkIndicacao } from "@/lib/admin/afiliadas";
import CopiarLink from "./CopiarLink";

function formatarPercentual(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** Lista de afiliadas — spec-painel-admin.md, Tela 3. */
export default function TabelaAfiliadas({ linhas }: { linhas: AfiliadaLinha[] }) {
  if (linhas.length === 0) {
    return (
      <p className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-6 text-center text-sm text-[var(--c21-tinta-suave)]">
        Nenhuma afiliada cadastrada ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)]">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--c21-linha)] text-left text-xs text-[var(--c21-tinta-suave)]">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Link de indicação</th>
            <th className="px-4 py-3 font-medium">%</th>
            <th className="px-4 py-3 font-medium">Assinantes</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((a) => (
            <tr key={a.id} className="border-b border-[var(--c21-linha)] last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/afiliadas/${a.id}`}
                  className="font-medium text-[var(--c21-tinta)] underline underline-offset-2"
                >
                  {a.nome}
                </Link>
              </td>
              <td className="px-4 py-3">
                <CopiarLink link={linkIndicacao(a.codigo)} />
              </td>
              <td className="px-4 py-3 tabular-nums">{formatarPercentual(a.percentual)}</td>
              <td className="px-4 py-3 tabular-nums text-[var(--c21-tinta-suave)]">
                {a.assinantesAtivos} ativas / {a.assinantesTotal} total
              </td>
              <td className="px-4 py-3">
                {a.ativo ? (
                  <span className="text-[var(--c21-sucesso)]">Ativa</span>
                ) : (
                  <span className="text-[var(--c21-tinta-suave)]">Inativa</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
