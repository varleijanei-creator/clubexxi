import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova o cookie de sessão do Supabase Auth a cada request. Sem isso, uma
 * sessão criada no login não chega atualizada nos Server Components e a
 * pessoa é deslogada antes da hora — é o padrão oficial do @supabase/ssr
 * pro App Router, não uma escolha deste projeto.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Só pra disparar a renovação do cookie — cada rota decide sozinha o que
  // fazer com a sessão (este middleware não bloqueia nada).
  await supabase.auth.getUser();

  return response;
}
