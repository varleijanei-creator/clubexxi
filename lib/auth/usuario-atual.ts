import { isAuthSessionMissingError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type UsuarioAtual = { email: string };

/**
 * Quem está logado agora, a partir da sessão do Supabase Auth (cookies).
 * Base comum pro guard de /admin e, depois, de /minha-conta — nenhuma das
 * duas áreas deve reimplementar essa leitura (spec-painel-admin.md).
 */
export async function usuarioAtual(): Promise<UsuarioAtual | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // getUser() devolve AuthSessionMissingError como "error" pro caso mais
  // comum de todos — visitante sem sessão nenhuma. Isso não é uma falha,
  // então não loga. Só loga o que sobrar (falha real do Auth), pra
  // distinguir isso de "não logado" na hora de investigar um problema.
  if (error && !isAuthSessionMissingError(error)) {
    console.error("[auth] erro ao ler sessão atual", error);
  }

  if (!user?.email) return null;
  return { email: user.email };
}
