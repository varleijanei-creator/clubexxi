import Link from "next/link";
import type { LinhaMembra } from "@/lib/admin/membras-tipos";
import { formatarDataAdmin } from "@/lib/admin/formato";
import SeloStatus from "@/components/SeloStatus";

/** Lista de membras — spec-painel-admin.md, Tela 2. Só leitura, clique abre o detalhe. */
export default function TabelaMembras({ linhas }: { linhas: LinhaMembra[] }) {
  if (linhas.length === 0) {
    return (
      <p className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-6 text-center text-sm text-[var(--c21-tinta-suave)]">
        Nenhuma membra encontrada com esses filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)]">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--c21-linha)] text-left text-xs text-[var(--c21-tinta-suave)]">
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">E-mail</th>
            <th className="px-4 py-3 font-medium">Plano</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Cidade/país</th>
            <th className="px-4 py-3 font-medium">Entrada</th>
            <th className="px-4 py-3 font-medium">Origem</th>
            <th className="px-4 py-3 font-medium">Afiliada</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.id} className="border-b border-[var(--c21-linha)] last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/membras/${l.id}`}
                  className="font-medium text-[var(--c21-tinta)] underline underline-offset-2"
                >
                  {l.nome}
                </Link>
              </td>
              <td className="px-4 py-3 text-[var(--c21-tinta-suave)]">{l.email}</td>
              <td className="px-4 py-3">{l.planoNome}</td>
              <td className="px-4 py-3">
                <SeloStatus status={l.statusAssinatura} />
              </td>
              <td className="px-4 py-3 text-[var(--c21-tinta-suave)]">
                {l.cidade ? `${l.cidade} — ${l.paisNome}` : l.paisNome}
              </td>
              <td className="px-4 py-3 text-[var(--c21-tinta-suave)]">
                {formatarDataAdmin(l.dataEntrada)}
              </td>
              <td className="px-4 py-3 text-[var(--c21-tinta-suave)]">{l.origemRotulo}</td>
              <td className="px-4 py-3 text-[var(--c21-tinta-suave)]">{l.afiliadaNome ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
