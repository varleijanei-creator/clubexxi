import { NextResponse, type NextRequest } from "next/server";
import { usuarioAtual } from "@/lib/auth/usuario-atual";
import { ehAdmin } from "@/lib/auth/autorizacao";
import { gerarCsvListaEnvio } from "@/lib/admin/lista-envio";

export const runtime = "nodejs";

/**
 * CSV da lista de envio — spec-painel-admin.md, Tela 2.
 *
 * Route Handler, não page: o layout de app/admin/(protegido) só protege
 * page.tsx, não route.ts. Por isso confere sessão e admin aqui de novo,
 * do mesmo jeito que o guard faz.
 */
export async function GET(request: NextRequest) {
  const usuario = await usuarioAtual();
  if (!usuario || !(await ehAdmin(usuario.email))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const edicaoId = request.nextUrl.searchParams.get("edicao");
  if (!edicaoId) {
    return NextResponse.json({ error: "Informe a edição." }, { status: 400 });
  }

  const resultado = await gerarCsvListaEnvio(edicaoId);
  if (!resultado) {
    return NextResponse.json({ error: "Edição não encontrada." }, { status: 404 });
  }

  return new NextResponse(resultado.conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${resultado.nomeArquivo}"`,
    },
  });
}
