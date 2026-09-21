import { createServiceClient } from "@/lib/supabase/server";

/**
 * Autorização (não autenticação) do painel admin — roda com a service role
 * porque é uma checagem de confiança feita pelo próprio guard, não uma
 * leitura de dados pra exibir. Comparação de e-mail é case-insensitive
 * (regra explícita do spec-painel-admin.md).
 */
export async function ehAdmin(email: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const emailEscapado = email.trim().replace(/[%_\\]/g, "\\$&");

    const { data, error } = await supabase
      .from("admins")
      .select("id")
      .ilike("email", emailEscapado)
      .eq("ativo", true)
      .maybeSingle();

    if (error) {
      console.error("[auth] erro ao checar admin", error);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    // createServiceClient() lança se SUPABASE_SERVICE_ROLE_KEY não estiver
    // configurada — sem o try/catch isso vazaria como exceção não tratada
    // em vez de negar acesso (esta função nunca deve deixar passar em erro).
    console.error("[auth] erro inesperado ao checar admin", err);
    return false;
  }
}
