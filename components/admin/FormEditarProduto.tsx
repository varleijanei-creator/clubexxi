import { atualizarProduto } from "@/lib/admin/produtos-acoes";
import { CATEGORIAS, type DetalheProduto } from "@/lib/admin/produtos";

const campo = "flex flex-col gap-1";
const rotulo = "text-xs text-[var(--c21-tinta-suave)]";
const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-3 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

/** Edição de um produto existente, pré-preenchida. Slug não muda (é a chave). */
export default function FormEditarProduto({ produto }: { produto: DetalheProduto }) {
  const temPrecoAtivo = produto.precos.some((p) => p.ativo);

  return (
    <form action={atualizarProduto} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="slug" value={produto.slug} />

      <div className={campo}>
        <label className={rotulo}>Slug</label>
        <p className="px-3 py-1.5 text-sm text-[var(--c21-tinta-suave)]">{produto.slug}</p>
      </div>
      <div className={campo}>
        <label htmlFor="nome" className={rotulo}>
          Nome *
        </label>
        <input id="nome" name="nome" required defaultValue={produto.nome} className={entrada} />
      </div>
      <div className={campo}>
        <label htmlFor="categoria" className={rotulo}>
          Categoria *
        </label>
        <select id="categoria" name="categoria" required defaultValue={produto.categoria} className={entrada}>
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
        <textarea id="descricao" name="descricao" rows={2} defaultValue={produto.descricao ?? ""} className={entrada} />
      </div>

      <div className={campo}>
        <label htmlFor="estoque" className={rotulo}>
          Estoque (vazio = ilimitado, 0 = esgotado)
        </label>
        <input
          id="estoque"
          name="estoque"
          type="number"
          min={0}
          step={1}
          defaultValue={produto.estoque ?? ""}
          className={entrada}
        />
      </div>
      <div className={campo}>
        <label htmlFor="ordem" className={rotulo}>
          Ordem de exibição
        </label>
        <input id="ordem" name="ordem" type="number" step={1} defaultValue={produto.ordem} className={entrada} />
      </div>
      <div className={campo}>
        <label htmlFor="imagem_url" className={rotulo}>
          URL da imagem
        </label>
        <input
          id="imagem_url"
          name="imagem_url"
          type="url"
          defaultValue={produto.imagemUrl ?? ""}
          className={entrada}
        />
      </div>
      {produto.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={produto.imagemUrl}
          alt=""
          className="h-16 w-16 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] object-cover"
        />
      )}
      <div className={campo}>
        <label htmlFor="bump_titulo" className={rotulo}>
          Título como order bump
        </label>
        <input
          id="bump_titulo"
          name="bump_titulo"
          defaultValue={produto.bumpTitulo ?? ""}
          className={entrada}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
        <input type="checkbox" name="cabe_envelope" defaultChecked={produto.cabeEnvelope} className="h-4 w-4" />
        Cabe no envelope
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
        <input type="checkbox" name="pede_endereco" defaultChecked={produto.pedeEndereco} className="h-4 w-4" />
        Pede endereço (vai pra outra pessoa)
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
        <input type="checkbox" name="bump" defaultChecked={produto.bump} className="h-4 w-4" />
        Disponível como order bump
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)] sm:col-span-2 lg:col-span-3">
        <input type="checkbox" name="ativo" defaultChecked={produto.ativo} className="h-4 w-4" />
        Ativo (visível nos lugares públicos)
        {!temPrecoAtivo && (
          <span className="text-xs text-[var(--c21-laranja)]">
            — sem preço ativo ainda, não vai conseguir ativar
          </span>
        )}
      </label>

      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)]"
        >
          Salvar produto
        </button>
      </div>
    </form>
  );
}
