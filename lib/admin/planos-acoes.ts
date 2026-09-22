"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { ehAdmin } from "@/lib/auth/autorizacao";
import type { EstadoPlano } from "@/lib/admin/planos-tipos";

/**
 * Única escrita da seção Planos: editar valor/descrição/ativo. Sem excluir
 * e sem editar slug — pedido explícito, porque assinaturas existentes
 * dependem do slug pra fechar o join com `planos`.
 *
 * `planos.valor` é o preço que o checkout cobra de verdade (ver nota em
 * lib/admin/planos.ts) — mudar aqui muda o preço mostrado e cobrado em
 * /assinar a partir de agora, não é só um cadastro cosmético.
 */
export async function atualizarPlano(_estadoAnterior: EstadoPlano, formData: FormData): Promise<EstadoPlano> {
  const usuario = await usuarioAtual();
  if (!usuario || !(await ehAdmin(usuario.email))) {
    redirect("/admin/login");
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const valorTexto = String(formData.get("valor") ?? "").trim().replace(",", ".");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const ativo = formData.get("ativo") === "on";

  const valores = { valor: valorTexto, descricao, ativo };

  if (!slug) return { erro: "Plano inválido.", valores };

  const valor = Number(valorTexto);
  if (!Number.isFinite(valor) || valor < 0) {
    return { erro: "Valor precisa ser um número, 0 ou maior.", valores };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("planos")
    .update({ valor, descricao: descricao || null, ativo })
    .eq("slug", slug);

  if (error) return { erro: `Erro ao salvar: ${error.message}`, valores };

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos?sucesso=Plano+atualizado.");
}
