import { buscarDadosConta } from "@/lib/conta/dados";
import SecaoContato from "@/components/conta/SecaoContato";
import SecaoAssinatura from "@/components/conta/SecaoAssinatura";
import SecaoEndereco from "@/components/conta/SecaoEndereco";
import SecaoPagamentos from "@/components/conta/SecaoPagamentos";
import SecaoEnvios from "@/components/conta/SecaoEnvios";
import SecaoIndicacao from "@/components/conta/SecaoIndicacao";

// A tela única de /minha-conta — spec em
// docs/superpowers/specs/2026-09-22-minha-conta-design.md. buscarDadosConta()
// já rodou uma vez no layout (guard); graças ao cache(), esta chamada não
// bate no banco de novo.
export default async function PaginaConta() {
  const dados = await buscarDadosConta();
  // O layout já garante que dados não é null (senão dá notFound() antes de
  // chegar aqui) — o "!" documenta essa garantia pro TypeScript.
  const { membro, assinatura, endereco, pagamentos, envios, indicacoes, creditos, linkIndicacao } =
    dados!;

  return (
    <>
      <SecaoContato membro={membro} />
      <SecaoAssinatura assinatura={assinatura} />
      <SecaoEndereco endereco={endereco} />
      <SecaoPagamentos pagamentos={pagamentos} />
      <SecaoEnvios envios={envios} />
      <SecaoIndicacao link={linkIndicacao} indicacoes={indicacoes} creditos={creditos} />
    </>
  );
}
