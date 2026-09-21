import { redirect } from "next/navigation";
import { ehAdmin } from "@/lib/auth/autorizacao";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import FormLogin from "@/components/auth/FormLogin";

// Fica fora de app/admin/(protegido) de propósito: se entrar no route group
// protegido, quem está deslogado nunca alcança esta página pra fazer login
// (o guard redireciona pra cá, e essa página redirecionaria de volta —
// loop).
export default async function PaginaLoginAdmin() {
  const usuario = await usuarioAtual();
  if (usuario && (await ehAdmin(usuario.email))) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1
        className="text-xl font-normal text-[var(--c21-tinta)]"
        style={{ fontFamily: "var(--c21-fonte-display)" }}
      >
        Painel Clube 21
      </h1>
      <FormLogin next="/admin" />
    </main>
  );
}
