import type { LinhaCanal } from "@/lib/admin/origem-assinaturas";

/**
 * Lista de canais com total e, embaixo, quantas continuam ativas e quantas
 * foram canceladas. A barra é empilhada: ativas, suspensas, canceladas e
 * sem vínculo, na escala do maior canal.
 */
export default function TabelaCanal({
  titulo,
  linhas,
  vazio,
  especiais,
}: {
  titulo: string;
  linhas: LinhaCanal[];
  vazio: string;
  /** Rótulos que não são canal de verdade (direto, antes, manual): texto mais apagado. */
  especiais: Set<string>;
}) {
  const maximo = Math.max(1, ...linhas.map((l) => l.total));

  return (
    <div className="flex flex-col gap-3 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <h2 className="text-sm font-semibold text-[var(--c21-tinta)]">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-[var(--c21-tinta-suave)]">{vazio}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {linhas.map((l) => {
            const partes = [
              { n: l.ativas, cor: "var(--c21-sucesso)" },
              { n: l.suspensas, cor: "var(--c21-laranja)" },
              { n: l.canceladas, cor: "var(--c21-erro)" },
              { n: l.semVinculo, cor: "var(--c21-linha)" },
            ];
            const detalhe = [
              `${l.ativas} ${l.ativas === 1 ? "ativa" : "ativas"}`,
              l.suspensas > 0 && `${l.suspensas} ${l.suspensas === 1 ? "suspensa" : "suspensas"}`,
              `${l.canceladas} ${l.canceladas === 1 ? "cancelada" : "canceladas"}`,
              l.semVinculo > 0 && `${l.semVinculo} sem vínculo`,
            ].filter(Boolean);

            return (
              <li key={l.chave} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span
                    className={
                      especiais.has(l.rotulo)
                        ? "text-[var(--c21-tinta-suave)]"
                        : "text-[var(--c21-tinta)]"
                    }
                  >
                    {l.rotulo}
                  </span>
                  <span className="tabular-nums text-[var(--c21-tinta)]">{l.total}</span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--c21-papel-fundo)]">
                  <div
                    className="flex h-1.5"
                    style={{ width: `${(l.total / maximo) * 100}%` }}
                  >
                    {partes.map(
                      (p, i) =>
                        p.n > 0 && (
                          <div
                            key={i}
                            className="h-1.5"
                            style={{ width: `${(p.n / l.total) * 100}%`, background: p.cor }}
                          />
                        ),
                    )}
                  </div>
                </div>
                <span className="text-xs tabular-nums text-[var(--c21-tinta-suave)]">
                  {detalhe.join(" · ")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
