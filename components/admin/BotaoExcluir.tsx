/** Confirmação de exclusão em dois cliques, sem JS: abre, confirma, envia. */
export default function BotaoExcluir({
  action,
  campos,
  pergunta,
  rotuloAbrir = "Excluir",
}: {
  action: (formData: FormData) => Promise<void>;
  campos: Record<string, string>;
  pergunta: string;
  rotuloAbrir?: string;
}) {
  return (
    <details className="inline-block">
      <summary className="cursor-pointer text-xs text-[var(--c21-erro)]">{rotuloAbrir}</summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-[var(--c21-raio-sm)] border border-[var(--c21-erro)] bg-[var(--c21-papel)] p-3">
        {Object.entries(campos).map(([nome, valor]) => (
          <input key={nome} type="hidden" name={nome} value={valor} />
        ))}
        <p className="text-xs text-[var(--c21-tinta)]">{pergunta}</p>
        <button
          type="submit"
          className="self-start rounded-[var(--c21-raio-sm)] bg-[var(--c21-erro)] px-3 py-1 text-xs font-bold text-[var(--c21-papel)]"
        >
          Sim, excluir
        </button>
      </form>
    </details>
  );
}
