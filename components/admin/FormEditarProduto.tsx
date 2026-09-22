"use client";

import { useActionState } from "react";
import { atualizarProduto } from "@/lib/admin/produtos-acoes";
import { CATEGORIAS } from "@/lib/admin/produtos-tipos";
import type { DetalheProduto, EstadoProduto } from "@/lib/admin/produtos-tipos";

const campo = "flex flex-col gap-1";
const rotulo = "text-xs text-[var(--c21-tinta-suave)]";
const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-3 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

/**
 * Edição de um produto existente. Slug não muda (é a chave, não vai no
 * form). Em erro de validação, useActionState devolve o que a pessoa
 * digitou em vez do formulário voltar com os valores antigos do banco.
 */
export default function FormEditarProduto({ produto }: { produto: DetalheProduto }) {
  const estadoInicial: EstadoProduto = {
    erro: null,
    valores: {
      slug: produto.slug,
      nome: produto.nome,
      categoria: produto.categoria,
      descricao: produto.descricao ?? "",
      estoque: produto.estoque === null ? "" : String(produto.estoque),
      ordem: String(produto.ordem),
      imagem_url: produto.imagemUrl ?? "",
      bump_titulo: produto.bumpTitulo ?? "",
      bump: produto.bump,
      pede_endereco: produto.pedeEndereco,
      cabe_envelope: produto.cabeEnvelope,
      ativo: produto.ativo,
    },
  };
  const [estado, aoEnviar, pendente] = useActionState(atualizarProduto, estadoInicial);
  const temPrecoAtivo = produto.precos.some((p) => p.ativo);

  return (
    <form action={aoEnviar} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="slug" value={produto.slug} />

      {estado.erro && (
        <p className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-erro)] px-3 py-2 text-sm text-[var(--c21-erro)] sm:col-span-2 lg:col-span-3">
          {estado.erro}
        </p>
      )}

      <div className={campo}>
        <label className={rotulo}>Slug</label>
        <p className="px-3 py-1.5 text-sm text-[var(--c21-tinta-suave)]">{produto.slug}</p>
      </div>
      <div className={campo}>
        <label htmlFor="nome" className={rotulo}>
          Nome *
        </label>
        <input id="nome" name="nome" required defaultValue={estado.valores.nome} className={entrada} />
      </div>
      <div className={campo}>
        <label htmlFor="categoria" className={rotulo}>
          Categoria *
        </label>
        <select id="categoria" name="categoria" required defaultValue={estado.valores.categoria} className={entrada}>
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
        <textarea id="descricao" name="descricao" rows={2} defaultValue={estado.valores.descricao} className={entrada} />
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
          defaultValue={estado.valores.estoque}
          className={entrada}
        />
      </div>
      <div className={campo}>
        <label htmlFor="ordem" className={rotulo}>
          Ordem de exibição
        </label>
        <input id="ordem" name="ordem" type="number" step={1} defaultValue={estado.valores.ordem} className={entrada} />
      </div>
      <div className={campo}>
        <label htmlFor="imagem_url" className={rotulo}>
          URL da imagem
        </label>
        <input
          id="imagem_url"
          name="imagem_url"
          type="url"
          defaultValue={estado.valores.imagem_url}
          className={entrada}
        />
      </div>
      {estado.valores.imagem_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={estado.valores.imagem_url}
          alt=""
          className="h-16 w-16 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] object-cover"
        />
      )}
      <div className={campo}>
        <label htmlFor="bump_titulo" className={rotulo}>
          Título como order bump
        </label>
        <input id="bump_titulo" name="bump_titulo" defaultValue={estado.valores.bump_titulo} className={entrada} />
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
        <input type="checkbox" name="cabe_envelope" defaultChecked={estado.valores.cabe_envelope} className="h-4 w-4" />
        Cabe no envelope
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
        <input type="checkbox" name="pede_endereco" defaultChecked={estado.valores.pede_endereco} className="h-4 w-4" />
        Pede endereço (vai pra outra pessoa)
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
        <input type="checkbox" name="bump" defaultChecked={estado.valores.bump} className="h-4 w-4" />
        Disponível como order bump
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)] sm:col-span-2 lg:col-span-3">
        <input type="checkbox" name="ativo" defaultChecked={estado.valores.ativo} className="h-4 w-4" />
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
          disabled={pendente}
          className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}
