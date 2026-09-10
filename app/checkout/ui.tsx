import type { ReactNode } from "react";
import Link from "next/link";

// Moldura e botões compartilhados pelas três telas de retorno do checkout.
// Sem design definido ainda — troca depois, sem encostar no conteúdo de cada
// tela.

export function PaginaRetorno({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-4">
        <h1 className="text-xl font-semibold text-zinc-900">{titulo}</h1>
        {children}
      </div>
    </div>
  );
}

export function BotaoPrimario({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const externo = href.startsWith("http");
  return (
    <Link
      href={href}
      target={externo ? "_blank" : undefined}
      rel={externo ? "noopener noreferrer" : undefined}
      className="block rounded bg-zinc-900 px-4 py-3 text-center text-base font-semibold text-white hover:bg-zinc-700"
    >
      {children}
    </Link>
  );
}

export function LinkTexto({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
    >
      {children}
    </Link>
  );
}
