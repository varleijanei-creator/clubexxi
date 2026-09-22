/** Formatação de data usada em /minha-conta — independente de lib/admin/formato.ts de propósito (namespaces separados). */

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatarDataConta(iso: string): string {
  return formatadorData.format(new Date(iso));
}
