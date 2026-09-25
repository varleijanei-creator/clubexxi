const CORES: Record<string, string> = {
  pendente: "var(--c21-laranja)",
  aprovada: "var(--c21-cobalto)",
  paga: "var(--c21-sucesso)",
  cancelada: "var(--c21-erro)",
};

/**
 * Selo colorido pro status da comissão (pendente/aprovada/paga/cancelada).
 * Comissão de split é repassada pelo Asaas no próprio pagamento: aparece
 * como "Paga via split", a não ser que tenha sido cancelada.
 */
export default function SeloComissao({
  status,
  formaPagamento,
}: {
  status: string;
  formaPagamento?: string;
}) {
  const viaSplit = formaPagamento === "split" && status !== "cancelada";
  const cor = viaSplit ? CORES.paga : (CORES[status] ?? "var(--c21-tinta-suave)");
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-[var(--c21-tinta)]">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />
      {viaSplit ? "Paga via split" : status}
    </span>
  );
}
