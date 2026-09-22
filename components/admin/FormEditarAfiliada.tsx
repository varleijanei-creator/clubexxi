import { atualizarAfiliada } from "@/lib/admin/afiliadas-acoes";
import type { DetalheAfiliada } from "@/lib/admin/afiliadas";

const campo = "flex flex-col gap-1";
const rotulo = "text-xs text-[var(--c21-tinta-suave)]";
const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-3 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

/**
 * Edição de afiliada — nome, e-mail, telefone, CPF/CNPJ, chave Pix,
 * percentual e status. Código de propósito fora do form: link já
 * divulgado depende dele, não editável por aqui.
 */
export default function FormEditarAfiliada({ afiliada }: { afiliada: DetalheAfiliada }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--c21-tinta)]">
        Editar
      </summary>
      <form action={atualizarAfiliada} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="id" value={afiliada.id} />

        <div className={campo}>
          <label className={rotulo}>Código (não muda)</label>
          <p className="px-3 py-1.5 text-sm text-[var(--c21-tinta-suave)]">{afiliada.codigo}</p>
        </div>
        <div className={campo}>
          <label htmlFor="edit-nome" className={rotulo}>
            Nome *
          </label>
          <input id="edit-nome" name="nome" required defaultValue={afiliada.nome} className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="edit-email" className={rotulo}>
            E-mail
          </label>
          <input id="edit-email" name="email" type="email" defaultValue={afiliada.email ?? ""} className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="edit-telefone" className={rotulo}>
            Telefone
          </label>
          <input id="edit-telefone" name="telefone" defaultValue={afiliada.telefone ?? ""} className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="edit-cpf_cnpj" className={rotulo}>
            CPF/CNPJ
          </label>
          <input id="edit-cpf_cnpj" name="cpf_cnpj" defaultValue={afiliada.cpfCnpj ?? ""} className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="edit-chave_pix" className={rotulo}>
            Chave Pix
          </label>
          <input id="edit-chave_pix" name="chave_pix" defaultValue={afiliada.chavePix ?? ""} className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="edit-percentual" className={rotulo}>
            Percentual
          </label>
          <input
            id="edit-percentual"
            name="percentual"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={afiliada.percentual}
            className={entrada}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
          <input type="checkbox" name="ativo" defaultChecked={afiliada.ativo} className="h-4 w-4" />
          Ativa
        </label>
        <button
          type="submit"
          className="self-start rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)]"
        >
          Salvar
        </button>
      </form>
    </details>
  );
}
