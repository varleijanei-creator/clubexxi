/**
 * Como a afiliada recebe: "Split (quando ativo)" quando tem wallet_id do
 * Asaas, "Pix manual" quando não tem. Split só acontece em assinatura criada
 * pela API com o split junto (lib/split-afiliada.ts, usado pela checkout-v2,
 * ainda fora do ar) — até lá a comissão continua saindo por Pix. Quando a
 * checkout-v2 entrar, trocar o texto para "Split automático". A afiliada ter
 * wallet também não muda assinaturas já existentes.
 */
export default function SeloRepasse({ walletId }: { walletId: string | null }) {
  const split = Boolean(walletId);
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-[var(--c21-tinta)]"
      title={split ? `Wallet ID ${walletId}` : "Sem wallet ID do Asaas"}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: split ? "var(--c21-cobalto)" : "var(--c21-laranja)" }}
      />
      {split ? "Split (quando ativo)" : "Pix manual"}
    </span>
  );
}
