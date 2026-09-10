import { paramTexto } from "@/lib/searchParams";

import PaginaExpirado from "./PaginaExpirado";

export default async function CheckoutExpiradoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pedidoId = paramTexto(params, "pedido");

  return <PaginaExpirado pedidoId={pedidoId} />;
}
