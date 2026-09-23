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

const formatadorCiclo = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10-01" -> "outubro de 2026" — ciclo de crédito é mês/ano, o dia não importa. */
export function formatarCicloConta(iso: string): string {
  return formatadorCiclo.format(new Date(iso));
}
