"use client";

import { BotaoPrimario, LinkTexto, PaginaRetorno } from "../ui";
import { usePedidoRetorno } from "../usePedidoRetorno";

export default function PaginaExpirado({
  pedidoId,
}: {
  pedidoId: string | null;
}) {
  const estado = usePedidoRetorno(pedidoId);
  const href =
    estado.status === "ok" ? `/assinar?plano=${estado.dados.plano_slug}` : "/assinar";

  return (
    <PaginaRetorno titulo="O link expirou">
      <p>
        O checkout tem validade de 24 horas e esse prazo passou. É só começar
        de novo — leva um minuto.
      </p>
      <BotaoPrimario href={href}>Começar de novo</BotaoPrimario>
      <LinkTexto href="/">Ir para a home</LinkTexto>
    </PaginaRetorno>
  );
}
