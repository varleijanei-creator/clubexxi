import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso no browser (Client Components).
 * Usa a anon key e respeita a RLS: o membro logado enxerga só a própria linha.
 * Nunca usar para escrita vinda do checkout — isso é feito no servidor com a
 * service role (ver ./server.ts).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
