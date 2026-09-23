import Link from "next/link";
import type { AssinaturaConta } from "@/lib/conta/dados";
import { formatarValor } from "@/lib/formatacao";
import { formatarDataConta } from "@/lib/conta/formato";
import SeloStatus from "@/components/SeloStatus";
import Bloco from "./Bloco";
import Campo from "./Campo";

const ROTULO_PAGAMENTO: Record<string, string> = {
  CREDIT_CARD: "Cartão de crédito",
  PIX: "Pix",
  BOLETO: "Boleto",
};

/** Assinatura ativa é status "ativa" — suspensa/cancelada caem no aviso de "sem assinatura ativa". */
export default function SecaoAssinatura({ assinatura }: { assinatura: AssinaturaConta | null }) {
  const ativa = assinatura?.status === "ativa";

  if (!ativa) {
    return (
      <Bloco titulo="Sua assinatura">
        <p className="text-sm text-[var(--c21-tinta)]">
          Você não tem uma assinatura ativa no momento.
        </p>
        <Link
          href="/assinar"
          className="self-start rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-2 text-sm font-bold text-[var(--c21-papel)]"
        >
          Assinar de novo
        </Link>
      </Bloco>
    );
  }

  return (
    <Bloco titulo="Sua assinatura">
      <dl className="flex flex-col gap-2">
        <Campo rotulo="Plano" valor={assinatura.planoNome} />
        <Campo rotulo="Status" valor={<SeloStatus status={assinatura.status} />} />
        <Campo rotulo="Valor" valor={formatarValor(assinatura.valor)} />
        <Campo
          rotulo="Forma de pagamento"
          valor={
            assinatura.billingType
              ? (ROTULO_PAGAMENTO[assinatura.billingType] ?? assinatura.billingType)
              : "—"
          }
        />
        <Campo
          rotulo="Próxima cobrança"
          valor={assinatura.proximaCobranca ? formatarDataConta(assinatura.proximaCobranca) : "—"}
        />
      </dl>
    </Bloco>
  );
}
