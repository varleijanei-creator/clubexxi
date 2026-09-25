"use client";

import { useRef, useState } from "react";

/**
 * Link com botão de copiar. Se o navegador negar a área de transferência,
 * seleciona o texto do campo pra copiar à mão.
 */
export default function CopiarLink({ rotulo, url }: { rotulo: string; url: string }) {
  const campo = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"parado" | "copiado" | "manual">("parado");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setEstado("copiado");
    } catch {
      campo.current?.select();
      setEstado("manual");
    }
    setTimeout(() => setEstado("parado"), 2000);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--c21-tinta-suave)]">{rotulo}</span>
      <div className="flex gap-2">
        <input
          ref={campo}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={`Link ${rotulo}`}
          className="min-w-0 flex-1 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel-fundo)] px-2 py-1.5 font-mono text-xs text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]"
        />
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-3 py-1.5 text-xs text-[var(--c21-tinta)] hover:bg-[var(--c21-papel-fundo)]"
        >
          {estado === "copiado" ? "Copiado ✓" : estado === "manual" ? "Ctrl+C" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
