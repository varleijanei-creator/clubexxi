"use client";

import { formatarData, formatarValor } from "@/lib/formatacao";

import { BotaoPrimario, PaginaRetorno } from "../ui";
import { usePedidoRetorno } from "../usePedidoRetorno";

export default function PaginaSucesso({
  pedidoId,
}: {
  pedidoId: string | null;
}) {
  const estado = usePedidoRetorno(pedidoId);

  if (estado.status === "carregando") {
    return (
      <PaginaRetorno titulo="Pagamento aprovado!">
        <p className="text-sm text-zinc-600">Carregando os detalhes…</p>
      </PaginaRetorno>
    );
  }

  if (estado.status === "vazio") {
    return (
      <PaginaRetorno titulo="Pagamento recebido!">
        <p>
          Recebemos a confirmação do seu pagamento. Você vai receber um e-mail
          com os próximos passos.
        </p>
        <p className="text-sm text-zinc-600">
          Não achou o e-mail?{" "}
          <a
            href="mailto:contato@clubexxi.com.br"
            className="underline underline-offset-2"
          >
            Fale com a gente
          </a>
          .
        </p>
      </PaginaRetorno>
    );
  }

  const { dados } = estado;

  return (
    <PaginaRetorno titulo="Pagamento aprovado!">
      <p>
        {dados.primeiro_nome ? `${dados.primeiro_nome}, sua` : "Sua"}{" "}
        assinatura do <strong>{dados.plano_nome}</strong> está confirmada —{" "}
        {formatarValor(dados.valor)}/mês.
      </p>

      {dados.primeira_edicao && (
        <p>
          Sua primeira carta é a edição{" "}
          <strong>{dados.primeira_edicao.nome}</strong>, que fecha em{" "}
          {formatarData(dados.primeira_edicao.fechamento)}.
        </p>
      )}

      <p className="text-sm text-zinc-600">
        Cada envelope é montado à mão e postado na última semana do mês.
      </p>

      {dados.link_comunidade && (
        <BotaoPrimario href={dados.link_comunidade}>
          Entrar no grupo do WhatsApp
        </BotaoPrimario>
      )}
    </PaginaRetorno>
  );
}
