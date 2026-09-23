import type { ReactNode } from "react";

/** Cartão de seção de /minha-conta — título em Gelica, mesma linguagem visual do /assinar. */
export default function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <h2
        className="text-sm font-normal text-[var(--c21-tinta)]"
        style={{ fontFamily: "var(--c21-fonte-display)", fontSize: "1.05rem" }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}
