/** Formatação de data usada nas telas do painel admin (com ano, diferente do checkout). */

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatarDataAdmin(iso: string): string {
  return formatadorData.format(new Date(iso));
}

export function formatarDataHoraAdmin(iso: string): string {
  return formatadorDataHora.format(new Date(iso));
}
