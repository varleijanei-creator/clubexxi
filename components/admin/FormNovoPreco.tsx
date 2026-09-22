"use client";

import { useActionState } from "react";
import { criarPreco } from "@/lib/admin/produtos-acoes";
import { CONTEXTOS } from "@/lib/admin/produtos-tipos";
import type { EstadoPreco } from "@/lib/admin/produtos-tipos";

const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-2 py-1 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

const ESTADO_INICIAL: EstadoPreco = { erro: null, valores: { contexto: "avulso", valor: "", ativo: true } };

/** Novo preço pra um produto — avulso ou order bump. */
export default function FormNovoPreco({ slug }: { slug: string }) {
  const [estado, aoEnviar, pendente] = useActionState(criarPreco, ESTADO_INICIAL);

  return (
    <details>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--c21-tinta)]">+ Novo preço</summary>
      <form action={aoEnviar} className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="produto_slug" value={slug} />

        {estado.erro && <p className="w-full text-xs text-[var(--c21-erro)]">{estado.erro}</p>}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--c21-tinta-suave)]">Contexto</label>
          <select name="contexto" defaultValue={estado.valores.contexto} className={entrada}>
            {CONTEXTOS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--c21-tinta-suave)]">Valor</label>
          <input
            name="valor"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={estado.valores.valor}
            className={entrada}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
          <input type="checkbox" name="ativo" defaultChecked={estado.valores.ativo} className="h-4 w-4" />
          Ativo
        </label>
        <button
          type="submit"
          disabled={pendente}
          className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Adicionar preço"}
        </button>
      </form>
    </details>
  );
}
