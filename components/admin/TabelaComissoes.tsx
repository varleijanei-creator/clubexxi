import type { ComissaoLinha } from "@/lib/admin/afiliadas";
import { formatarValor } from "@/lib/formatacao";
import { formatarDataAdmin, formatarCompetencia } from "@/lib/admin/formato";
import SeloComissao from "./SeloComissao";
import BotaoMarcarPaga from "./BotaoMarcarPaga";

/** Linhas de comissão de uma afiliada (ou de um grupo do mês) — spec-painel-admin.md, Tela 3. */
export default function TabelaComissoes({
  linhas,
  voltarPara,
  mostrarCompetencia = false,
}: {
  linhas: ComissaoLinha[];
  voltarPara: string;
  mostrarCompetencia?: boolean;
}) {
  if (linhas.length === 0) {
    return <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhuma comissão.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--c21-linha)] text-left text-xs text-[var(--c21-tinta-suave)]">
            {mostrarCompetencia && <th className="px-3 py-2 font-medium">Competência</th>}
            <th className="px-3 py-2 font-medium">Assinante</th>
            <th className="px-3 py-2 font-medium">Base</th>
            <th className="px-3 py-2 font-medium">%</th>
            <th className="px-3 py-2 font-medium">Comissão</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Paga em</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {linhas.map((c) => (
            <tr key={c.id} className="border-b border-[var(--c21-linha)] last:border-0">
              {mostrarCompetencia && (
                <td className="px-3 py-2 text-[var(--c21-tinta-suave)]">
                  {formatarCompetencia(c.competencia)}
                </td>
              )}
              <td className="px-3 py-2">{c.membroNome ?? "—"}</td>
              <td className="px-3 py-2 tabular-nums">{formatarValor(c.valorBase)}</td>
              <td className="px-3 py-2 tabular-nums">{c.percentual}%</td>
              <td className="px-3 py-2 tabular-nums font-medium">{formatarValor(c.valorComissao)}</td>
              <td className="px-3 py-2">
                <SeloComissao status={c.status} />
              </td>
              <td className="px-3 py-2 text-[var(--c21-tinta-suave)]">
                {c.pagoEm ? formatarDataAdmin(c.pagoEm) : "—"}
              </td>
              <td className="px-3 py-2">
                <BotaoMarcarPaga comissaoId={c.id} status={c.status} voltarPara={voltarPara} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
