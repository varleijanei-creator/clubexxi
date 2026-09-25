import { criarAfiliada } from "@/lib/admin/afiliadas-acoes";
import { EXEMPLO_WALLET_ID, PADRAO_WALLET_ID } from "@/lib/admin/wallet-id";

const OPCOES_TIPO_CHAVE = [
  { valor: "", rotulo: "—" },
  { valor: "cpf", rotulo: "CPF" },
  { valor: "cnpj", rotulo: "CNPJ" },
  { valor: "email", rotulo: "E-mail" },
  { valor: "telefone", rotulo: "Telefone" },
  { valor: "aleatoria", rotulo: "Aleatória" },
];

const campo = "flex flex-col gap-1";
const rotulo = "text-xs text-[var(--c21-tinta-suave)]";
const entrada =
  "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-3 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

/** Cadastro de afiliada — grava direto em `afiliados` via Server Action, sem JS. */
export default function FormNovaAfiliada() {
  return (
    <details className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--c21-tinta)]">
        + Nova afiliada
      </summary>
      <form action={criarAfiliada} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className={campo}>
          <label htmlFor="nome" className={rotulo}>
            Nome *
          </label>
          <input id="nome" name="nome" required className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="codigo" className={rotulo}>
            Código * (vai no link)
          </label>
          <input id="codigo" name="codigo" required pattern="[a-z0-9-]+" className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="percentual" className={rotulo}>
            Percentual (padrão 10)
          </label>
          <input
            id="percentual"
            name="percentual"
            type="number"
            min={0}
            max={100}
            step="0.01"
            placeholder="10"
            className={entrada}
          />
        </div>
        <div className={campo}>
          <label htmlFor="email" className={rotulo}>
            E-mail
          </label>
          <input id="email" name="email" type="email" className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="telefone" className={rotulo}>
            Telefone
          </label>
          <input id="telefone" name="telefone" className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="cpf_cnpj" className={rotulo}>
            CPF/CNPJ
          </label>
          <input id="cpf_cnpj" name="cpf_cnpj" className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="chave_pix" className={rotulo}>
            Chave Pix
          </label>
          <input id="chave_pix" name="chave_pix" className={entrada} />
        </div>
        <div className={campo}>
          <label htmlFor="tipo_chave_pix" className={rotulo}>
            Tipo da chave Pix
          </label>
          <select id="tipo_chave_pix" name="tipo_chave_pix" className={entrada}>
            {OPCOES_TIPO_CHAVE.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </div>
        <div className={campo}>
          <label htmlFor="wallet_id" className={rotulo}>
            Wallet ID do Asaas (vazio = Pix manual)
          </label>
          <input
            id="wallet_id"
            name="wallet_id"
            pattern={PADRAO_WALLET_ID}
            placeholder={EXEMPLO_WALLET_ID}
            title={`Formato ${EXEMPLO_WALLET_ID}`}
            autoComplete="off"
            spellCheck={false}
            className={`${entrada} font-mono`}
          />
        </div>
        <div className={`${campo} sm:col-span-2 lg:col-span-3`}>
          <label htmlFor="observacoes" className={rotulo}>
            Observações
          </label>
          <textarea id="observacoes" name="observacoes" rows={2} className={entrada} />
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--c21-tinta)]">
          <input type="checkbox" name="ativo" defaultChecked className="h-4 w-4" />
          Ativa
        </label>
        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)]"
          >
            Cadastrar afiliada
          </button>
        </div>
      </form>
    </details>
  );
}
