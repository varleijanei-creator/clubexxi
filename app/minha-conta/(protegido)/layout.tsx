import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { buscarDadosConta } from "@/lib/conta/dados";
import SairBotao from "@/components/SairBotao";

/**
 * Guard de tudo sob /minha-conta (exceto /minha-conta/login, que fica fora
 * deste route group de propósito — mesmo motivo do admin: evita loop de
 * redirect). Sem sessão -> volta pro login. Com sessão mas sem linha em
 * `membros` -> 404, não uma mensagem dizendo que a área existe (mesma
 * regra do admin, spec-painel-admin.md).
 *
 * buscarDadosConta() faz dupla função aqui: é a checagem de autorização
 * (existe linha em membros?) E já busca os dados que a página vai
 * precisar — graças ao cache(), as duas chamadas (guard + página) viram
 * uma consulta só.
 */
export default async function LayoutContaProtegido({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/minha-conta/login");
  const dados = await buscarDadosConta();
  if (!dados) notFound();

  return (
    <div className="min-h-screen bg-[var(--c21-papel-fundo)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c21-linha)] bg-[var(--c21-papel)] px-6 py-3">
        <span
          className="text-sm font-normal text-[var(--c21-tinta)]"
          style={{ fontFamily: "var(--c21-fonte-display)" }}
        >
          Olá, {dados.membro.nome.split(" ")[0]}
        </span>
        <SairBotao destino="/minha-conta/login" />
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">{children}</main>
    </div>
  );
}
