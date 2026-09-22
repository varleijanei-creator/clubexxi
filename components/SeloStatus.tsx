const CORES: Record<string, string> = {
  ativa: "var(--c21-sucesso)",
  suspensa: "var(--c21-laranja)",
  cancelada: "var(--c21-erro)",
};

/** Selo colorido pro status da assinatura (ativa/suspensa/cancelada) — usado em /admin e /minha-conta. */
export default function SeloStatus({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-sm text-[var(--c21-tinta-suave)]">—</span>;
  }
  const cor = CORES[status] ?? "var(--c21-tinta-suave)";
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[var(--c21-tinta)]">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: cor }}
      />
      {status}
    </span>
  );
}
