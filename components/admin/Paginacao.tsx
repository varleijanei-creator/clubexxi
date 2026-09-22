import Link from "next/link";
import type { FiltrosMembras } from "@/lib/admin/membras-tipos";

function hrefDaPagina(filtros: FiltrosMembras, pagina: number): string {
  const params = new URLSearchParams();
  if (filtros.busca) params.set("busca", filtros.busca);
  if (filtros.status) params.set("status", filtros.status);
  if (filtros.plano) params.set("plano", filtros.plano);
  if (filtros.pais) params.set("pais", filtros.pais);
  if (filtros.origem) params.set("origem", filtros.origem);
  if (filtros.afiliada) params.set("afiliada", filtros.afiliada);
  if (pagina > 1) params.set("pagina", String(pagina));
  const query = params.toString();
  return query ? `/admin/membras?${query}` : "/admin/membras";
}

/** Anterior/próxima da lista de membras — links simples, preservam os filtros ativos. */
export default function Paginacao({
  filtros,
  paginaAtual,
  totalPaginas,
  total,
}: {
  filtros: FiltrosMembras;
  paginaAtual: number;
  totalPaginas: number;
  total: number;
}) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between text-sm text-[var(--c21-tinta-suave)]">
      <span>
        Página {paginaAtual} de {totalPaginas} — {total} membras
      </span>
      <div className="flex gap-2">
        {paginaAtual > 1 ? (
          <Link
            href={hrefDaPagina(filtros, paginaAtual - 1)}
            className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-3 py-1.5 text-[var(--c21-tinta)]"
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-3 py-1.5 opacity-40">
            Anterior
          </span>
        )}
        {paginaAtual < totalPaginas ? (
          <Link
            href={hrefDaPagina(filtros, paginaAtual + 1)}
            className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-3 py-1.5 text-[var(--c21-tinta)]"
          >
            Próxima
          </Link>
        ) : (
          <span className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] px-3 py-1.5 opacity-40">
            Próxima
          </span>
        )}
      </div>
    </div>
  );
}
