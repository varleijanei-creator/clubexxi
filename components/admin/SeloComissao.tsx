const CORES: Record<string, string> = {
  pendente: "var(--c21-laranja)",
  aprovada: "var(--c21-cobalto)",
  paga: "var(--c21-sucesso)",
  cancelada: "var(--c21-erro)",
};

/** Selo colorido pro status da comissão (pendente/aprovada/paga/cancelada). */
export default function SeloComissao({ status }: { status: string }) {
  const cor = CORES[status] ?? "var(--c21-tinta-suave)";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--c21-tinta)]">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cor }} />
      {status}
    </span>
  );
}
