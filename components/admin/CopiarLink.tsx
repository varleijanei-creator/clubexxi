"use client";

import { useState } from "react";

/** Link de indicação + botão de copiar — única parte desta tela que precisa de JS (clipboard). */
export default function CopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard API pode falhar (permissão, contexto não seguro) — sem
      // fallback: a pessoa ainda pode selecionar e copiar o texto à mão.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="truncate rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel-fundo)] px-2 py-1 text-xs text-[var(--c21-tinta)]">
        {link}
      </code>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-2 py-1 text-xs text-[var(--c21-tinta)] hover:bg-[var(--c21-papel-fundo)]"
      >
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
