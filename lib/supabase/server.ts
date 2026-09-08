import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para o servidor (Server Components, Route Handlers, Server
 * Actions). Lê a sessão do membro pelos cookies e respeita a RLS — o membro
 * logado vê só a própria linha, casando pelo e-mail do JWT.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component onde não dá para escrever cookie.
            // Pode ser ignorado quando há middleware renovando a sessão.
          }
        },
      },
    },
  );
}

/**
 * Cliente Supabase com a service role. Ignora a RLS — use SÓ no servidor,
 * nunca exponha a chave no client. É o cliente usado por toda escrita no banco
 * vinda do checkout (pedidos, assinaturas, etc.).
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
