import { criarProduto } from "@/lib/admin/produtos-acoes";
import { CATEGORIAS } from "@/lib/admin/produtos";

const campo = "flex flex-col gap-1";
const rotulo = "text-xs text-[var(--c21-tinta-suave)]";
const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-3 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

/**
 * Cadastro de produto — grava em `produtos` via Server Action. Sem campo
 * "ativo" de propósito: nasce inativo sempre (spec), liga só na edição,
 * depois de ter preço.
 */
export default function FormNovoProduto() {
  return (
    <details className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--c21-tinta)]">
        + Novo produto
      </summary>
      <form action={criarProduto} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className={campo}>
          <label htmlFor="slug" className={rotulo}>
            Slug * (identificador, não muda depois)
          </label>
          <input id="slug" name="slug" required pattern="[a-z0-9-]+" className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="nome" className={rotulo}>
            Nome *
          </label>
          <input id="nome" name="nome" required className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="categoria" className={rotulo}>
            Categoria *
          </label>
          <select id="categoria" name="categoria" required className={entrada} defaultValue="">
            <option value="" disabled>
              Escolha...
            </option>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className={`${campo} sm:col-span-2 lg:col-span-3`}>
          <label htmlFor="descricao" className={rotulo}>
            Descrição
          </label>
          <textarea id="descricao" name="descricao" rows={2} className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="estoque" className={rotulo}>
            Estoque (vazio = ilimitado)
          </label>
          <input id="estoque" name="estoque" type="number" min={0} step={1} className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="ordem" className={rotulo}>
            Ordem de exibição
          </label>
          <input id="ordem" name="ordem" type="number" step={1} defaultValue={0} className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="imagem_url" className={rotulo}>
            URL da imagem
          </label>
          <input id="imagem_url" name="imagem_url" type="url" className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="bump_titulo" className={rotulo}>
            Título como order bump
          </label>
          <input id="bump_titulo" name="bump_titulo" className={entrada} />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
          <input type="checkbox" name="cabe_envelope" defaultChecked className="h-4 w-4" />
          Cabe no envelope
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
          <input type="checkbox" name="pede_endereco" className="h-4 w-4" />
          Pede endereço (vai pra outra pessoa)
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
          <input type="checkbox" name="bump" className="h-4 w-4" />
          Disponível como order bump
        </label>
        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)]"
          >
            Cadastrar produto
          </button>
        </div>
      </form>
    </details>
  );
}
