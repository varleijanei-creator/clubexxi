"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  FILTRO_TODOS,
  FILTRO_NAO_INFORMADO,
  type FiltrosMembras,
  type OpcoesFiltroMembras,
} from "@/lib/admin/membras-tipos";
import { ROTULOS_ORIGEM } from "@/lib/admin/origem";

const OPCOES_STATUS = [
  { valor: "ativa", rotulo: "Ativa" },
  { valor: "suspensa", rotulo: "Suspensa" },
  { valor: "cancelada", rotulo: "Cancelada" },
];

const OPCOES_ORIGEM = [
  ...Object.entries(ROTULOS_ORIGEM).map(([valor, rotulo]) => ({ valor, rotulo })),
  { valor: FILTRO_NAO_INFORMADO, rotulo: "Não informado" },
];

function Seletor({
  id,
  rotulo,
  valor,
  aoMudar,
  opcoes,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-[var(--c21-tinta-suave)]">
        {rotulo}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-2 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]"
      >
        <option value={FILTRO_TODOS}>Todas</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Busca + filtros da lista de membras — navega trocando a query string de /admin/membras. */
export default function FiltrosMembrasForm({
  filtros,
  opcoes,
}: {
  filtros: FiltrosMembras;
  opcoes: OpcoesFiltroMembras;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState(filtros.busca);

  function navegar(proximos: Partial<FiltrosMembras>) {
    const combinados = { ...filtros, busca, ...proximos };
    const params = new URLSearchParams();
    if (combinados.busca) params.set("busca", combinados.busca);
    if (combinados.status) params.set("status", combinados.status);
    if (combinados.plano) params.set("plano", combinados.plano);
    if (combinados.pais) params.set("pais", combinados.pais);
    if (combinados.origem) params.set("origem", combinados.origem);
    if (combinados.afiliada) params.set("afiliada", combinados.afiliada);
    // pagina não entra: toda mudança de filtro volta pra página 1
    const query = params.toString();
    router.push(query ? `/admin/membras?${query}` : "/admin/membras");
  }

  function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    navegar({});
  }

  const temFiltro =
    filtros.busca || filtros.status || filtros.plano || filtros.pais || filtros.origem || filtros.afiliada;

  return (
    <form onSubmit={aoSubmeter} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="busca" className="text-xs text-[var(--c21-tinta-suave)]">
          Nome ou e-mail
        </label>
        <input
          id="busca"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar…"
          className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-3 py-1.5 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]"
        />
      </div>

      <Seletor
        id="status"
        rotulo="Status"
        valor={filtros.status}
        aoMudar={(v) => navegar({ status: v })}
        opcoes={OPCOES_STATUS}
      />
      <Seletor
        id="plano"
        rotulo="Plano"
        valor={filtros.plano}
        aoMudar={(v) => navegar({ plano: v })}
        opcoes={opcoes.planos}
      />
      <Seletor
        id="pais"
        rotulo="País"
        valor={filtros.pais}
        aoMudar={(v) => navegar({ pais: v })}
        opcoes={opcoes.paises}
      />
      <Seletor
        id="origem"
        rotulo="Origem"
        valor={filtros.origem}
        aoMudar={(v) => navegar({ origem: v })}
        opcoes={OPCOES_ORIGEM}
      />
      <Seletor
        id="afiliada"
        rotulo="Afiliada"
        valor={filtros.afiliada}
        aoMudar={(v) => navegar({ afiliada: v })}
        opcoes={opcoes.afiliadas}
      />

      <button
        type="submit"
        className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-1.5 text-sm font-bold text-[var(--c21-papel)]"
      >
        Buscar
      </button>
      {temFiltro && (
        <a
          href="/admin/membras"
          className="text-sm text-[var(--c21-tinta-suave)] underline underline-offset-2"
        >
          Limpar filtros
        </a>
      )}
    </form>
  );
}
