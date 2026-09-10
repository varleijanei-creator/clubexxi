import { paramTexto } from "@/lib/searchParams";

import PaginaSucesso from "./PaginaSucesso";

export default async function CheckoutSucessoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pedidoId = paramTexto(params, "pedido");

  return <PaginaSucesso pedidoId={pedidoId} />;
}
