"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { ehAdmin } from "@/lib/auth/autorizacao";

/**
 * Escritas da Tela 3 (Afiliadas). Server Actions, não Route Handler: um
 * route.ts não pode dividir segmento com page.tsx (é o que já hospeda
 * /admin/afiliadas), e Server Action evita inventar uma URL só pra isso.
 *
 * Mas Server Action também não passa pelo guard do layout — layout só
 * protege o React tree de page.tsx. Por isso cada função confere sessão e
 * admin de novo, igual o Route Handler de exportar CSV da Tela 2.
 */
async function exigirAdmin(): Promise<string> {
  const usuario = await usuarioAtual();
  if (!usuario || !(await ehAdmin(usuario.email))) {
    redirect("/admin/login");
  }
  return usuario.email;
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

const CODIGO_VALIDO = /^[a-z0-9-]+$/;

export async function criarAfiliada(formData: FormData): Promise<void> {
  await exigirAdmin();

  const nome = texto(formData, "nome");
  const codigo = texto(formData, "codigo").toLowerCase();
  const email = texto(formData, "email");
  const telefone = texto(formData, "telefone");
  const cpfCnpj = texto(formData, "cpf_cnpj");
  const chavePix = texto(formData, "chave_pix");
  const tipoChavePix = texto(formData, "tipo_chave_pix");
  const walletId = texto(formData, "wallet_id");
  const observacoes = texto(formData, "observacoes");
  const percentualTexto = texto(formData, "percentual");
  const ativo = formData.get("ativo") === "on";

  const erro = (mensagem: string) => redirect(`/admin/afiliadas?erro=${encodeURIComponent(mensagem)}`);

  if (!nome) erro("Nome é obrigatório.");
  if (!codigo) erro("Código é obrigatório.");
  if (!CODIGO_VALIDO.test(codigo)) {
    erro("Código só pode ter letras minúsculas, números e hífen — é o que vai no link.");
  }

  let percentual: number | undefined;
  if (percentualTexto) {
    const n = Number(percentualTexto.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) erro("Percentual precisa ser um número entre 0 e 100.");
    percentual = n;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("afiliados").insert({
    nome,
    codigo,
    email: email || null,
    telefone: telefone || null,
    cpf_cnpj: cpfCnpj || null,
    chave_pix: chavePix || null,
    tipo_chave_pix: tipoChavePix || null,
    wallet_id: walletId || null,
    observacoes: observacoes || null,
    ativo,
    ...(percentual !== undefined ? { percentual } : {}),
  });

  if (error) {
    erro(error.code === "23505" ? "Já existe uma afiliada com esse código." : `Erro ao salvar: ${error.message}`);
    return;
  }

  revalidatePath("/admin/afiliadas");
  redirect("/admin/afiliadas?sucesso=Afiliada+cadastrada.");
}

export async function marcarComissaoPaga(formData: FormData): Promise<void> {
  const email = await exigirAdmin();

  const comissaoId = texto(formData, "comissaoId");
  const voltarPara = texto(formData, "voltarPara") || "/admin/afiliadas";
  if (!comissaoId) redirect(voltarPara);

  const supabase = createServiceClient();

  // Confere o status antes de mexer: comissão cancelada ou já paga não se
  // recalcula nem se reativa (regra do spec — quem cancela é a function do
  // banco).
  const atualRes = await supabase
    .from("comissoes")
    .select("status, observacao")
    .eq("id", comissaoId)
    .maybeSingle();

  if (atualRes.error || !atualRes.data || ["cancelada", "paga"].includes(atualRes.data.status)) {
    redirect(voltarPara);
  }

  // "registra quando e por quem": pago_em já existe na tabela pra "quando".
  // Pra "quem", não há coluna própria — anexo em observacao sem apagar o
  // que já tinha, em vez de criar coluna nova sem avisar.
  const notaAnterior = atualRes.data!.observacao ? `${atualRes.data!.observacao}\n` : "";
  const nota = `${notaAnterior}Marcada como paga em ${new Date().toISOString()} por ${email}.`;

  const { error } = await supabase
    .from("comissoes")
    .update({ status: "paga", pago_em: new Date().toISOString(), observacao: nota })
    .eq("id", comissaoId);

  if (error) {
    redirect(
      `${voltarPara}${voltarPara.includes("?") ? "&" : "?"}erro=${encodeURIComponent("Erro ao marcar como paga.")}`,
    );
  }

  revalidatePath("/admin/afiliadas");
  revalidatePath(voltarPara);
  redirect(voltarPara);
}
