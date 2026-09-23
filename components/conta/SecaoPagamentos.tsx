import type { PagamentoConta } from "@/lib/conta/dados";
import { formatarValor } from "@/lib/formatacao";
import { formatarDataConta } from "@/lib/conta/formato";
import Bloco from "./Bloco";

const ROTULO_STATUS: Record<string, string> = {
  CONFIRMED: "Pago",
  RECEIVED: "Pago",
  PENDING: "Pendente",
  OVERDUE: "Atrasado",
  REFUNDED: "Estornado",
};

export default function SecaoPagamentos({ pagamentos }: { pagamentos: PagamentoConta[] }) {
  return (
    <Bloco titulo="Histórico de pagamentos">
      {pagamentos.length === 0 ? (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhum pagamento registrado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pagamentos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 border-b border-[var(--c21-linha)] pb-2 text-sm last:border-0"
            >
              <span className="text-[var(--c21-tinta-suave)]">
                {p.vencimento ? formatarDataConta(p.vencimento) : "—"}
              </span>
              <span className="text-[var(--c21-tinta)]">{formatarValor(p.valor)}</span>
              <span className="text-[var(--c21-tinta-suave)]">
                {ROTULO_STATUS[p.status] ?? p.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
