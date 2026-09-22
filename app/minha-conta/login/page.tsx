import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { buscarDadosConta } from "@/lib/conta/dados";
import FormLogin from "@/components/auth/FormLogin";

// Fica fora de app/minha-conta/(protegido) de propósito: se entrar no route
// group protegido, quem está deslogado nunca alcança esta página pra fazer
// login (o guard redireciona pra cá, e essa página redirecionaria de volta
// — loop). Mesmo motivo do /admin/login.
export default async function PaginaLoginConta() {
  const usuario = await usuarioAtual();
  if (usuario) {
    // Mesmo raciocínio do ehAdmin() no /admin/login: se a leitura falhar
    // por qualquer motivo, não trava a página de login — só não redireciona,
    // a pessoa vê o formulário e tenta de novo.
    let dados = null;
    try {
      dados = await buscarDadosConta();
    } catch (err) {
      console.error("[conta] erro ao checar sessão existente no login", err);
    }
    if (dados) redirect("/minha-conta");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1
        className="text-xl font-normal text-[var(--c21-tinta)]"
        style={{ fontFamily: "var(--c21-fonte-display)" }}
      >
        Minha conta — Clube 21
      </h1>
      <FormLogin next="/minha-conta" />
    </main>
  );
}
