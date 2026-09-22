import type { PontoSerieMensal } from "@/lib/admin/metricas";

const COR_ENTRADAS = "#2E7D32"; // var(--c21-sucesso)
const COR_SAIDAS = "#B0281A"; // var(--c21-erro)

const ALTURA = 160;
const LARGURA_GRUPO = 44;
const LARGURA_BARRA = 14;
const MARGEM_BASE = 20; // espaço pro rótulo do mês

/**
 * Barras entradas/saídas dos últimos 12 meses. SVG puro, sem lib de
 * gráfico — 12 pontos não justificam uma dependência nova.
 */
export default function GraficoSerie({ pontos }: { pontos: PontoSerieMensal[] }) {
  const maximo = Math.max(1, ...pontos.flatMap((p) => [p.entradas, p.saidas]));
  const alturaUtil = ALTURA - MARGEM_BASE;
  const largura = pontos.length * LARGURA_GRUPO;

  return (
    <div className="overflow-x-auto">
      <svg
        role="img"
        aria-label="Entradas e saídas por mês, últimos 12 meses"
        width={largura}
        height={ALTURA}
        viewBox={`0 0 ${largura} ${ALTURA}`}
        className="min-w-full"
      >
        <line
          x1={0}
          y1={alturaUtil}
          x2={largura}
          y2={alturaUtil}
          stroke="var(--c21-linha)"
          strokeWidth={1}
        />
        {pontos.map((p, i) => {
          const x = i * LARGURA_GRUPO;
          const hEntradas = (p.entradas / maximo) * (alturaUtil - 8);
          const hSaidas = (p.saidas / maximo) * (alturaUtil - 8);
          return (
            <g key={p.mes}>
              <title>
                {p.rotulo}: {p.entradas} entradas, {p.saidas} saídas
              </title>
              <rect
                x={x + 4}
                y={alturaUtil - hEntradas}
                width={LARGURA_BARRA}
                height={hEntradas}
                fill={COR_ENTRADAS}
                rx={2}
              />
              <rect
                x={x + 4 + LARGURA_BARRA + 2}
                y={alturaUtil - hSaidas}
                width={LARGURA_BARRA}
                height={hSaidas}
                fill={COR_SAIDAS}
                rx={2}
              />
              <text
                x={x + LARGURA_GRUPO / 2}
                y={ALTURA - 4}
                textAnchor="middle"
                fontSize={10}
                fill="var(--c21-tinta-suave)"
              >
                {p.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Entradas e saídas por mês, últimos 12 meses</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Entradas</th>
            <th>Saídas</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((p) => (
            <tr key={p.mes}>
              <td>{p.rotulo}</td>
              <td>{p.entradas}</td>
              <td>{p.saidas}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-4 text-xs text-[var(--c21-tinta-suave)]">
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: COR_ENTRADAS }}
          />
          Entradas
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: COR_SAIDAS }}
          />
          Saídas
        </span>
      </div>
    </div>
  );
}
