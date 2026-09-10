"use client";

import { BotaoPrimario, LinkTexto, PaginaRetorno } from "../ui";
import { usePedidoRetorno } from "../usePedidoRetorno";

export default function PaginaCancelado({
  pedidoId,
}: {
  pedidoId: string | null;
}) {
  const estado = usePedidoRetorno(pedidoId);
  const href =
    estado.status === "ok" ? `/assinar?plano=${estado.dados.plano_slug}` : "/assinar";

  return (
    <PaginaRetorno titulo="Tudo bem, sem pressa">
      <p>Você saiu do checkout antes de terminar. Nada foi cobrado.</p>
      <BotaoPrimario href={href}>Voltar para o formulário</BotaoPrimario>
      <LinkTexto href="/">Ir para a home</LinkTexto>
    </PaginaRetorno>
  );
}
