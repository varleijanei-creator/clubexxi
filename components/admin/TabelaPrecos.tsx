import { atualizarPreco, criarPreco, excluirPreco } from "@/lib/admin/produtos-acoes";
import { CONTEXTOS, type Preco } from "@/lib/admin/produtos";
import BotaoExcluir from "./BotaoExcluir";

const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-2 py-1 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

/** Preços de um produto — avulso e/ou bump, cada linha editável e removível. */
export default function TabelaPrecos({ slug, precos }: { slug: string; precos: Preco[] }) {
  return (
    <div className="flex flex-col gap-3">
      {precos.length === 0 && (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhum preço cadastrado ainda.</p>
      )}

      {precos.map((p) => (
        <form
          key={p.id}
          action={atualizarPreco}
          className="flex flex-wrap items-end gap-3 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] p-3"
        >
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="produto_slug" value={slug} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--c21-tinta-suave)]">Contexto</label>
            <select name="contexto" defaultValue={p.contexto} className={entrada}>
              {CONTEXTOS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--c21-tinta-suave)]">Valor</label>
            <input name="valor" type="number" min={0} step="0.01" defaultValue={p.valor} className={entrada} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
            <input type="checkbox" name="ativo" defaultChecked={p.ativo} className="h-4 w-4" />
            Ativo
          </label>
          <button
            type="submit"
            className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-3 py-1.5 text-xs text-[var(--c21-tinta)] hover:bg-[var(--c21-papel-fundo)]"
          >
            Salvar
          </button>
          <BotaoExcluir
            action={excluirPreco}
            campos={{ id: p.id, produto_slug: slug }}
            pergunta="Excluir este preço?"
          />
        </form>
      ))}

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-[var(--c21-tinta)]">
          + Novo preço
        </summary>
        <form action={criarPreco} className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="produto_slug" value={slug} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--c21-tinta-suave)]">Contexto</label>
            <select name="contexto" defaultValue="avulso" className={entrada}>
              {CONTEXTOS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.rotulo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--c21-tinta-suave)]">Valor</label>
            <input name="valor" type="number" min={0} step="0.01" required className={entrada} />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
            <input type="checkbox" name="ativo" defaultChecked className="h-4 w-4" />
            Ativo
          </label>
          <button
            type="submit"
            className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)]"
          >
            Adicionar preço
          </button>
        </form>
      </details>
    </div>
  );
}
