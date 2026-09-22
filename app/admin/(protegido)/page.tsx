import {
  buscarMetricasPainel,
  mesesDisponiveis,
  normalizarMes,
} from "@/lib/admin/metricas";
import { formatarValor } from "@/lib/formatacao";
import { paramTexto } from "@/lib/searchParams";
import CartaoMetrica from "@/components/admin/CartaoMetrica";
import GraficoSerie from "@/components/admin/GraficoSerie";
import SeletorMes from "@/components/admin/SeletorMes";
import TabelaQuebra from "@/components/admin/TabelaQuebra";

// Tela 1 do spec-painel-admin.md — métricas. `assinatura_eventos` é a fonte
// principal; buscarMetricasPainel() já roda com a service role (ver
// lib/admin/metricas.ts pro motivo).
export default async function PaginaAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const opcoesMes = mesesDisponiveis();
  const mes = normalizarMes(paramTexto(params, "mes"));
  const dados = await buscarMetricasPainel(mes);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-[var(--c21-tinta)]">
          Painel
        </h1>
        <SeletorMes mesSelecionado={mes} opcoes={opcoesMes} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <CartaoMetrica
          rotulo="Entradas"
          valor={String(dados.cartoes.entradas)}
          cor="var(--c21-sucesso)"
          nota="entrou + reativou, no mês"
        />
        <CartaoMetrica
          rotulo="Saídas"
          valor={String(dados.cartoes.saidas)}
          cor="var(--c21-erro)"
          nota="cancelou + estornou, no mês"
        />
        <CartaoMetrica
          rotulo="Suspensas"
          valor={String(dados.cartoes.suspensas)}
          cor="var(--c21-laranja)"
          nota="atraso, no mês"
        />
        <CartaoMetrica
          rotulo="Ativas hoje"
          valor={String(dados.cartoes.ativasHoje)}
          cor="var(--c21-tinta)"
        />
        <CartaoMetrica
          rotulo="Receita recorrente"
          valor={formatarValor(dados.cartoes.mrr)}
          cor="var(--c21-cobalto)"
          nota="mensal, normalizada por ciclo"
        />
      </div>

      <div className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--c21-tinta)]">
          Entradas e saídas — últimos 12 meses
        </h2>
        <GraficoSerie pontos={dados.serieMensal} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TabelaQuebra titulo="Por plano, no mês" linhas={dados.porPlano} />
        <TabelaQuebra titulo="Por origem, no mês" linhas={dados.porOrigem} />
        <TabelaQuebra titulo="Por país, no mês" linhas={dados.porPais} />
      </div>
    </div>
  );
}
