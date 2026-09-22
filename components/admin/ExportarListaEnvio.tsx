import type { EdicaoParaExportar } from "@/lib/admin/lista-envio";
import { formatarDataAdmin } from "@/lib/admin/formato";

/**
 * Formulário GET puro (sem JS): escolher a edição monta
 * /admin/membras/exportar?edicao=<id> e o navegador baixa o CSV.
 */
export default function ExportarListaEnvio({
  edicoes,
  edicaoPadrao,
}: {
  edicoes: EdicaoParaExportar[];
  edicaoPadrao: string | null;
}) {
  if (edicoes.length === 0) return null;

  return (
    <form
      method="get"
      action="/admin/membras/exportar"
      className="flex flex-wrap items-end gap-3 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="edicao" className="text-xs text-[var(--c21-tinta-suave)]">
          Lista de envio da edição
        </label>
        <select
          id="edicao"
          name="edicao"
          defaultValue={edicaoPadrao ?? edicoes[0].id}
          className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-2 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]"
        >
          {edicoes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome ?? e.mes}
              {e.fechamento ? ` — fecha ${formatarDataAdmin(e.fechamento)}` : ""}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-cobalto)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)]"
      >
        Exportar CSV
      </button>
    </form>
  );
}
