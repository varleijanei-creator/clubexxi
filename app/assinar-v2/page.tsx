import type { Metadata } from "next";

import Rodape from "@/components/landing/Rodape";

import Cabecalho from "../assinar/Cabecalho";
import FormCartao from "./FormCartao";

// Página de teste do checkout v2 — fora dos buscadores até ir pro ar.
export const metadata: Metadata = {
  title: "Assinar (v2) — Clube 21",
  robots: { index: false, follow: false },
};

export default function AssinarV2Page() {
  return (
    <div className="flex flex-1 flex-col bg-[var(--c21-papel)]">
      <Cabecalho />
      <div className="flex flex-1 justify-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <h1
            className="text-xl font-normal text-[var(--c21-tinta)]"
            style={{ fontFamily: "var(--c21-fonte-display)" }}
          >
            Dados do cartão
          </h1>
          <FormCartao />
        </div>
      </div>
      <Rodape />
    </div>
  );
}
