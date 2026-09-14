"use client";

import { useEffect, useState } from "react";

export type PedidoRetorno = {
  primeiro_nome: string;
  plano_nome: string;
  plano_slug: string;
  valor: number;
  meses: number;
  link_comunidade: string | null;
  primeira_edicao: { nome: string; fechamento: string } | null;
};

export type EstadoPedidoRetorno =
  | { status: "carregando" }
  | { status: "ok"; dados: PedidoRetorno }
  // sem ?pedido= na URL, id malformado, ou a busca falhou — mesmo tratamento
  // nas três telas: mensagem genérica, nunca erro técnico.
  | { status: "vazio" };

/** Busca GET /api/pedido/[id] pro id vindo de ?pedido= (ou null, se ausente). */
export function usePedidoRetorno(pedidoId: string | null): EstadoPedidoRetorno {
  const [estado, setEstado] = useState<EstadoPedidoRetorno>(
    pedidoId ? { status: "carregando" } : { status: "vazio" },
  );

  useEffect(() => {
    // pedidoId ausente já é coberto pelo valor inicial de `estado`.
    if (!pedidoId) return;

    let cancelado = false;

    fetch(`/api/pedido/${pedidoId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((dados: PedidoRetorno | null) => {
        if (cancelado) return;
        setEstado(dados ? { status: "ok", dados } : { status: "vazio" });
      })
      .catch(() => {
        if (!cancelado) setEstado({ status: "vazio" });
      });

    return () => {
      cancelado = true;
    };
  }, [pedidoId]);

  return estado;
}
