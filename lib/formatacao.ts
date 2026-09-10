/** Formatação de valor e data compartilhada entre as telas do checkout. */

const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarValor(valor: number): string {
  return formatadorMoeda.format(valor);
}

// timeZone "UTC" evita que uma data "YYYY-MM-DD" (meia-noite UTC) apareça
// um dia antes em fusos com offset negativo.
const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  timeZone: "UTC",
});

export function formatarData(isoDate: string): string {
  return formatadorData.format(new Date(isoDate));
}
