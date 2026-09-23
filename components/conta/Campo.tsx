import type { ReactNode } from "react";

/** Linha rótulo/valor dentro de um Bloco de /minha-conta. */
export default function Campo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-[var(--c21-tinta-suave)]">{rotulo}</dt>
      <dd className="text-right text-[var(--c21-tinta)]">{valor}</dd>
    </div>
  );
}
