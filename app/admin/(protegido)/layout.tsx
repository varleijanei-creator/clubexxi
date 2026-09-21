import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ehAdmin } from "@/lib/auth/autorizacao";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import SairBotao from "./SairBotao";

/**
 * Guard de tudo sob /admin (exceto /admin/login, que fica fora deste route
 * group de propósito — sem isso, deslogado batendo em /admin/login entraria
 * em loop de redirect). Sem sessão -> volta pro login. Com sessão mas sem
 * ser admin -> 404, não uma mensagem dizendo que a área existe (regra do
 * spec-painel-admin.md).
 */
export default async function LayoutAdminProtegido({
  children,
}: {
  children: ReactNode;
}) {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/admin/login");
  if (!(await ehAdmin(usuario.email))) notFound();

  return (
    <div className="min-h-screen bg-[var(--c21-papel-fundo)]">
      <header className="flex items-center justify-between border-b border-[var(--c21-linha)] bg-[var(--c21-papel)] px-6 py-3">
        <span
          className="text-sm font-normal text-[var(--c21-tinta)]"
          style={{ fontFamily: "var(--c21-fonte-display)" }}
        >
          Painel Clube 21
        </span>
        <SairBotao />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
