import { paramTexto } from "@/lib/searchParams";

import PaginaCancelado from "./PaginaCancelado";

export default async function CheckoutCanceladoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pedidoId = paramTexto(params, "pedido");

  return <PaginaCancelado pedidoId={pedidoId} />;
}
