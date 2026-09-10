import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/afiliadas
 *
 * Lista as afiliadas ativas, em ordem alfabética, para o select do formulário.
 * Devolve só id e nome — nada de e-mail ou chave Pix vai para o browser.
 *
 * Enquanto a tabela estiver vazia a lista volta vazia e o formulário esconde o
 * campo. Basta inserir a primeira afiliada no banco para o campo aparecer.
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("afiliadas")
    .select("id, nome")
    .eq("ativa", true)
    .order("nome", { ascending: true });

  if (error) {
    console.error("[afiliadas] erro ao buscar afiliadas", error);
    // Falha aqui não pode derrubar o formulário: devolve lista vazia e segue.
    return NextResponse.json({ afiliadas: [] });
  }

  return NextResponse.json({ afiliadas: data ?? [] });
}
