import { buscarAfiliadas, buscarComissoesDoMes } from "@/lib/admin/afiliadas";
import { mesesDisponiveis, normalizarMes } from "@/lib/admin/metricas";
import { formatarValor } from "@/lib/formatacao";
import { paramTexto } from "@/lib/searchParams";
import FormNovaAfiliada from "@/components/admin/FormNovaAfiliada";
import TabelaAfiliadas from "@/components/admin/TabelaAfiliadas";
import TabelaComissoes from "@/components/admin/TabelaComissoes";
import SeletorMes from "@/components/admin/SeletorMes";

// Tela 3 do spec-painel-admin.md — afiliadas, link de indicação e comissões
// do mês. Cadastro e "marcar como paga" ficam em lib/admin/afiliadas-acoes.ts
// (Server Actions).
export default async function PaginaAfiliadas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const opcoesMes = mesesDisponiveis();
  const mes = normalizarMes(paramTexto(params, "mes"));
  const erro = paramTexto(params, "erro");
  const sucesso = paramTexto(params, "sucesso");

  const [afiliadas, gruposComissao] = await Promise.all([
    buscarAfiliadas(),
    buscarComissoesDoMes(mes),
  ]);

  const voltarPara = `/admin/afiliadas?mes=${mes}`;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--c21-tinta)]">Afiliadas</h1>

      {erro && (
        <p className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-erro)] bg-[var(--c21-papel)] px-4 py-2 text-sm text-[var(--c21-erro)]">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-sucesso)] bg-[var(--c21-papel)] px-4 py-2 text-sm text-[var(--c21-sucesso)]">
          {sucesso}
        </p>
      )}

      <FormNovaAfiliada />

      <TabelaAfiliadas linhas={afiliadas} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--c21-tinta)]">Comissões do mês</h2>
          <SeletorMes mesSelecionado={mes} opcoes={opcoesMes} baseHref="/admin/afiliadas" />
        </div>

        {gruposComissao.length === 0 ? (
          <p className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-6 text-center text-sm text-[var(--c21-tinta-suave)]">
            Nenhuma comissão neste mês.
          </p>
        ) : (
          gruposComissao.map((grupo) => (
            <div
              key={grupo.afiliadoId}
              className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--c21-tinta)]">{grupo.afiliadoNome}</h3>
                <span className="text-xs text-[var(--c21-tinta-suave)]">
                  Base {formatarValor(grupo.totalBase)} — comissão {formatarValor(grupo.totalComissao)}
                </span>
              </div>
              <TabelaComissoes linhas={grupo.linhas} voltarPara={voltarPara} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
