import { marcarComissaoPaga } from "@/lib/admin/afiliadas-acoes";

/** Marca uma comissão como paga — Server Action, sem JS. Some quando já paga/cancelada. */
export default function BotaoMarcarPaga({
  comissaoId,
  status,
  voltarPara,
}: {
  comissaoId: string;
  status: string;
  voltarPara: string;
}) {
  if (status === "paga" || status === "cancelada") return null;

  return (
    <form action={marcarComissaoPaga}>
      <input type="hidden" name="comissaoId" value={comissaoId} />
      <input type="hidden" name="voltarPara" value={voltarPara} />
      <button
        type="submit"
        className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-2 py-1 text-xs text-[var(--c21-tinta)] hover:bg-[var(--c21-papel-fundo)]"
      >
        Marcar como paga
      </button>
    </form>
  );
}
