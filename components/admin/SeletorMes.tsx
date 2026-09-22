"use client";

import { useRouter } from "next/navigation";
import type { OpcaoMes } from "@/lib/admin/metricas";

/** Seletor de mês do painel — navega trocando ?mes= na própria /admin. */
export default function SeletorMes({
  mesSelecionado,
  opcoes,
}: {
  mesSelecionado: string;
  opcoes: OpcaoMes[];
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
      <span className="text-[var(--c21-tinta-suave)]">Mês</span>
      <select
        value={mesSelecionado}
        onChange={(e) => router.push(`/admin?mes=${e.target.value}`)}
        className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-3 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}
