"use client";

import { useActionState } from "react";
import { atualizarPlano } from "@/lib/admin/planos-acoes";
import type { PlanoLinha, EstadoPlano } from "@/lib/admin/planos-tipos";
import { formatarValor } from "@/lib/formatacao";

const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-2 py-1 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

/**
 * Uma linha de plano — só valor, descrição e ativo são editáveis. Slug e
 * exclusão de propósito fora daqui: assinaturas existentes dependem do
 * slug.
 */
export default function LinhaPlano({ plano }: { plano: PlanoLinha }) {
  const estadoInicial: EstadoPlano = {
    erro: null,
    valores: { valor: String(plano.valor), descricao: plano.descricao ?? "", ativo: plano.ativo },
  };
  const [estado, aoEnviar, pendente] = useActionState(atualizarPlano, estadoInicial);

  return (
    <tr className="border-b border-[var(--c21-linha)] align-top last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-[var(--c21-tinta)]">{plano.nome}</p>
        <p className="text-xs text-[var(--c21-tinta-suave)]">{plano.slug}</p>
      </td>
      <td className="px-4 py-3 text-[var(--c21-tinta-suave)]">
        {plano.ciclo} · {plano.meses} {plano.meses === 1 ? "mês" : "meses"}
        {plano.precoLegado && (
          <p className="mt-1 text-xs">
            planos_precos: {plano.precoLegado.ciclo} {formatarValor(plano.precoLegado.valor)}
            {plano.precoLegado.ativo ? "" : " (inativo)"}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <form action={aoEnviar} className="flex flex-col gap-2">
          <input type="hidden" name="slug" value={plano.slug} />
          {estado.erro && <p className="text-xs text-[var(--c21-erro)]">{estado.erro}</p>}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--c21-tinta-suave)]">R$</span>
            <input
              name="valor"
              type="number"
              min={0}
              step="0.01"
              defaultValue={estado.valores.valor}
              className={`${entrada} w-24`}
            />
          </div>
          <textarea
            name="descricao"
            rows={2}
            placeholder="Descrição"
            defaultValue={estado.valores.descricao}
            className={`${entrada} w-full`}
          />
          <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
            <input type="checkbox" name="ativo" defaultChecked={estado.valores.ativo} className="h-4 w-4" />
            Ativo
          </label>
          <button
            type="submit"
            disabled={pendente}
            className="self-start rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-3 py-1.5 text-xs text-[var(--c21-tinta)] hover:bg-[var(--c21-papel-fundo)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendente ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </td>
    </tr>
  );
}
