import type { EnvioConta } from "@/lib/conta/dados";
import { formatarDataConta } from "@/lib/conta/formato";
import Bloco from "./Bloco";

const ROTULO_STATUS: Record<string, string> = {
  previsto: "Prevista",
  enviado: "Enviada",
  cancelado: "Cancelada",
};

export default function SecaoEnvios({ envios }: { envios: EnvioConta[] }) {
  return (
    <Bloco titulo="Envios">
      {envios.length === 0 ? (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhum envio registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {envios.map((e, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 border-b border-[var(--c21-linha)] pb-2 text-sm last:border-0"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--c21-tinta)]">{e.edicaoNome ?? e.edicaoMes}</span>
                <span className="text-[var(--c21-tinta-suave)]">
                  {ROTULO_STATUS[e.status] ?? e.status}
                </span>
              </div>
              {(e.rastreio || e.postadoEm) && (
                <span className="text-xs text-[var(--c21-tinta-suave)]">
                  {e.rastreio && `Rastreio: ${e.rastreio}`}
                  {e.rastreio && e.postadoEm && " — "}
                  {e.postadoEm && `postado em ${formatarDataConta(e.postadoEm)}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
