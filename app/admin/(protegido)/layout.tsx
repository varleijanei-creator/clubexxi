import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ehAdmin } from "@/lib/auth/autorizacao";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import SairBotao from "@/components/SairBotao";

// As cinco rotas do spec-painel-admin.md — todas construídas.
const NAV = [
  { href: "/admin", rotulo: "Painel" },
  { href: "/admin/membras", rotulo: "Membras" },
  { href: "/admin/afiliadas", rotulo: "Afiliadas" },
  { href: "/admin/produtos", rotulo: "Produtos" },
];

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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--c21-linha)] bg-[var(--c21-papel)] px-6 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <span
            className="text-sm font-normal text-[var(--c21-tinta)]"
            style={{ fontFamily: "var(--c21-fonte-display)" }}
          >
            Painel Clube 21
          </span>
          <nav className="flex gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-[var(--c21-tinta-suave)] hover:text-[var(--c21-tinta)]"
              >
                {item.rotulo}
              </Link>
            ))}
          </nav>
        </div>
        <SairBotao destino="/admin/login" />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
