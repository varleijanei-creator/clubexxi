import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { gravarUtmNoCookie } from "@/lib/utm";

// Nome do arquivo é "proxy.ts", não "middleware.ts" — o Next.js 16 renomeou
// a convenção e builda com aviso de depreciação usando o nome antigo.
export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Link com utm_* em qualquer página vira cookie de 30 dias (lib/utm.ts).
  gravarUtmNoCookie(request, response);
  return response;
}

export const config = {
  // Exclui /api: as rotas do checkout (/api/checkout e afins) não usam
  // sessão do Supabase Auth (leem/escrevem com a service role) e são
  // sensíveis a latência — não faz sentido gastar uma chamada à Auth API
  // nelas. Reavaliar quando /admin tiver rotas de API próprias.
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
