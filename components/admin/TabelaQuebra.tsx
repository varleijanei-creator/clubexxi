import type { QuebraLinha } from "@/lib/admin/metricas";

/** Lista "rótulo — contagem" com barra proporcional, usada nas três quebras do painel. */
export default function TabelaQuebra({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: QuebraLinha[];
}) {
  const total = linhas.reduce((soma, l) => soma + l.entradas, 0);
  const maximo = Math.max(1, ...linhas.map((l) => l.entradas));

  return (
    <div className="flex flex-col gap-3 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <h2 className="text-sm font-semibold text-[var(--c21-tinta)]">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-[var(--c21-tinta-suave)]">
          Nenhuma entrada neste mês.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map((l) => (
            <li key={l.chave} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm text-[var(--c21-tinta)]">
                <span>{l.rotulo}</span>
                <span className="tabular-nums text-[var(--c21-tinta-suave)]">
                  {l.entradas}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--c21-papel-fundo)]">
                <div
                  className="h-1.5 rounded-full bg-[var(--c21-cobalto)]"
                  style={{ width: `${(l.entradas / maximo) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {total > 0 && (
        <p className="text-xs text-[var(--c21-tinta-suave)]">Total: {total}</p>
      )}
    </div>
  );
}
