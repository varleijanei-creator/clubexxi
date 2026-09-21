import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Nome do arquivo é "proxy.ts", não "middleware.ts" — o Next.js 16 renomeou
// a convenção e builda com aviso de depreciação usando o nome antigo.
export async function proxy(request: NextRequest) {
  return updateSession(request);
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
