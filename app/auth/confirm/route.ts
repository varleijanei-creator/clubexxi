import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback do link mágico do Supabase Auth (padrão oficial pro App Router):
 * o e-mail leva pra cá com token_hash + type, aqui trocamos por uma sessão
 * de verdade e mandamos a pessoa pra onde ela queria ir. Compartilhado
 * entre /admin e, depois, /minha-conta — nenhuma área tem callback próprio.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Só aceita caminho relativo de dentro do próprio site — nunca redireciona
  // pra fora. "next" chega via query string pública, então é entrada não
  // confiável (proteção contra open redirect).
  const nextBruto = searchParams.get("next");
  const next =
    nextBruto && nextBruto.startsWith("/") && !nextBruto.startsWith("//")
      ? nextBruto
      : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth] falha ao verificar token do link mágico", error);
  }

  // TODO(minha-conta): esse fallback assume painel admin. Quando /minha-conta
  // existir, decidir o destino do erro a partir do "next" (ou de um parâmetro
  // de contexto próprio) em vez de sempre voltar pro login do admin.
  return NextResponse.redirect(`${origin}/admin/login?erro=link_invalido`);
}
