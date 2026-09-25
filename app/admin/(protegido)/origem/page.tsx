import {
  buscarOrigemAssinaturas,
  normalizarPeriodo,
  ROTULO_ANTES,
  ROTULO_SEM_UTM,
} from "@/lib/admin/origem-assinaturas";
import { paramTexto } from "@/lib/searchParams";
import CartaoMetrica from "@/components/admin/CartaoMetrica";
import TabelaQuebra from "@/components/admin/TabelaQuebra";

const VAZIO = "Nenhuma assinatura paga no período.";

function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Origem das assinaturas: UTMs do último link (pedidos.utm_*) lado a lado
// com a resposta do menu "como ficou sabendo" (pedidos.origem). Regras de
// agrupamento em lib/admin/origem-assinaturas.ts.
export default async function PaginaOrigem({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const periodo = normalizarPeriodo(paramTexto(params, "de"), paramTexto(params, "ate"));
  const dados = await buscarOrigemAssinaturas(periodo);
  const { resumo, cruzamento } = dados;

  const campoData =
    "rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-2 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-[var(--c21-tinta)]">
            Origem das assinaturas
          </h1>
          <p className="text-xs text-[var(--c21-tinta-suave)]">
            Assinaturas pagas, pela data do pedido. UTM = último link com UTM
            clicado em até 30 dias. Rastreio a partir de 25/09/2026, 14h.
          </p>
        </div>

        {/* GET simples: o filtro vira ?de=&ate= na URL, sem JS */}
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--c21-tinta-suave)]">
            De
            <input type="date" name="de" defaultValue={periodo.de} className={campoData} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--c21-tinta-suave)]">
            Até
            <input type="date" name="ate" defaultValue={periodo.ate} className={campoData} />
          </label>
          <button
            type="submit"
            className="rounded-[var(--c21-raio-sm)] bg-[var(--c21-tinta)] px-3 py-1.5 text-sm text-[var(--c21-papel)]"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoMetrica
          rotulo="Assinaturas pagas"
          valor={String(resumo.total)}
          cor="var(--c21-tinta)"
          nota={`${dataBr(periodo.de)} a ${dataBr(periodo.ate)}`}
        />
        <CartaoMetrica
          rotulo="Com UTM"
          valor={String(resumo.comUtm)}
          cor="var(--c21-cobalto)"
          nota="vieram por link rastreado"
        />
        <CartaoMetrica
          rotulo={ROTULO_SEM_UTM}
          valor={String(resumo.semUtm)}
          cor="var(--c21-laranja)"
          nota="desde 25/09 14h, sem UTM"
        />
        <CartaoMetrica
          rotulo="Antes do rastreio"
          valor={String(resumo.antes)}
          cor="var(--c21-tinta-suave)"
          nota="até 25/09 14h — sem dado de UTM"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TabelaQuebra titulo="Perfil (utm_campaign)" linhas={dados.porCampanha} vazio={VAZIO} />
        <TabelaQuebra titulo="Rede (utm_source)" linhas={dados.porRede} vazio={VAZIO} />
        <TabelaQuebra titulo="Onde (utm_medium)" linhas={dados.porOnde} vazio={VAZIO} />
        <TabelaQuebra
          titulo="Menu “como ficou sabendo”"
          linhas={dados.porMenu}
          vazio={VAZIO}
        />
      </div>

      <div className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2 className="mb-1 text-sm font-semibold text-[var(--c21-tinta)]">
          Perfil (UTM) × resposta do menu
        </h2>
        <p className="mb-3 text-xs text-[var(--c21-tinta-suave)]">
          Cada linha é um perfil do link; cada coluna, o que a pessoa marcou no
          menu. Mostra onde as duas fontes concordam e onde divergem.
        </p>
        {cruzamento.linhas.length === 0 ? (
          <p className="text-sm text-[var(--c21-tinta-suave)]">{VAZIO}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--c21-linha)] text-left text-xs text-[var(--c21-tinta-suave)]">
                  <th className="py-2 pr-4 font-normal">Perfil (UTM)</th>
                  {cruzamento.colunas.map((c) => (
                    <th key={c.chave} className="px-3 py-2 text-right font-normal whitespace-nowrap">
                      {c.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cruzamento.linhas.map((l) => (
                  <tr
                    key={l.chave}
                    className="border-b border-[var(--c21-linha)] last:border-0 text-[var(--c21-tinta)]"
                  >
                    <td
                      className={`py-2 pr-4 whitespace-nowrap ${
                        l.rotulo === ROTULO_SEM_UTM || l.rotulo === ROTULO_ANTES
                          ? "text-[var(--c21-tinta-suave)]"
                          : ""
                      }`}
                    >
                      {l.rotulo}
                    </td>
                    {cruzamento.colunas.map((c) => {
                      const n = cruzamento.contagem[l.chave]?.[c.chave] ?? 0;
                      return (
                        <td
                          key={c.chave}
                          className={`px-3 py-2 text-right tabular-nums ${
                            n === 0 ? "text-[var(--c21-linha)]" : ""
                          }`}
                        >
                          {n === 0 ? "·" : n}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
