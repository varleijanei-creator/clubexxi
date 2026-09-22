"use client";

import { useActionState } from "react";
import { atualizarPreco, excluirPreco } from "@/lib/admin/produtos-acoes";
import { CONTEXTOS } from "@/lib/admin/produtos-tipos";
import type { Preco, EstadoPreco } from "@/lib/admin/produtos-tipos";
import BotaoExcluir from "./BotaoExcluir";

const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-2 py-1 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

/** Uma linha de preço existente — editável, com useActionState pra manter o que foi digitado se der erro. */
export default function LinhaPreco({ slug, preco }: { slug: string; preco: Preco }) {
  const estadoInicial: EstadoPreco = {
    erro: null,
    valores: { contexto: preco.contexto, valor: String(preco.valor), ativo: preco.ativo },
  };
  const [estado, aoEnviar, pendente] = useActionState(atualizarPreco, estadoInicial);

  return (
    <form
      action={aoEnviar}
      className="flex flex-wrap items-end gap-3 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] p-3"
    >
      <input type="hidden" name="id" value={preco.id} />
      <input type="hidden" name="produto_slug" value={slug} />

      {estado.erro && (
        <p className="w-full text-xs text-[var(--c21-erro)]">{estado.erro}</p>
      )}

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
        <input name="valor" type="number" min={0} step="0.01" defaultValue={estado.valores.valor} className={entrada} />
      </div>
      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
        <input type="checkbox" name="ativo" defaultChecked={estado.valores.ativo} className="h-4 w-4" />
        Ativo
      </label>
      <button
        type="submit"
        disabled={pendente}
        className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-3 py-1.5 text-xs text-[var(--c21-tinta)] hover:bg-[var(--c21-papel-fundo)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendente ? "Salvando…" : "Salvar"}
      </button>
      <BotaoExcluir action={excluirPreco} campos={{ id: preco.id, produto_slug: slug }} pergunta="Excluir este preço?" />
    </form>
  );
}
