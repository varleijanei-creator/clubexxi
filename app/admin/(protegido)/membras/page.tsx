import { buscarMembras, normalizarFiltros } from "@/lib/admin/membras";
import { buscarEdicoesParaExportacao } from "@/lib/admin/lista-envio";
import FiltrosMembrasForm from "@/components/admin/FiltrosMembras";
import TabelaMembras from "@/components/admin/TabelaMembras";
import Paginacao from "@/components/admin/Paginacao";
import ExportarListaEnvio from "@/components/admin/ExportarListaEnvio";

// Tela 2 do spec-painel-admin.md — lista de membras, com busca, filtros e
// exportação da lista de envio. Só leitura (edição de endereço é outro
// projeto, área de membros).
export default async function PaginaMembras({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtros = normalizarFiltros(params);

  const [resultado, edicoes] = await Promise.all([
    buscarMembras(filtros),
    buscarEdicoesParaExportacao(),
  ]);

  // Padrão do seletor de export: a edição aberta que fecha mais cedo —
  // normalmente a próxima a precisar da lista impressa.
  const edicaoPadrao =
    edicoes
      .filter((e) => e.status === "aberta")
      .sort((a, b) => (a.fechamento ?? "9999-12-31").localeCompare(b.fechamento ?? "9999-12-31"))[0]
      ?.id ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-[var(--c21-tinta)]">Membras</h1>

      <FiltrosMembrasForm filtros={filtros} opcoes={resultado.opcoes} />

      <TabelaMembras linhas={resultado.linhas} />

      <Paginacao
        filtros={filtros}
        paginaAtual={resultado.paginaAtual}
        totalPaginas={resultado.totalPaginas}
        total={resultado.total}
      />

      <ExportarListaEnvio edicoes={edicoes} edicaoPadrao={edicaoPadrao} />
    </div>
  );
}
