import { notFound } from "next/navigation";
import Link from "next/link";
import { buscarDetalheAfiliada, linkIndicacao } from "@/lib/admin/afiliadas";
import { formatarDataAdmin } from "@/lib/admin/formato";
import { paramTexto } from "@/lib/searchParams";
import CopiarLink from "@/components/admin/CopiarLink";
import SeloStatus from "@/components/admin/SeloStatus";
import TabelaComissoes from "@/components/admin/TabelaComissoes";
import FormEditarAfiliada from "@/components/admin/FormEditarAfiliada";

export default async function PaginaDetalheAfiliada({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const erro = paramTexto(query, "erro");
  const sucesso = paramTexto(query, "sucesso");
  const afiliada = await buscarDetalheAfiliada(id);
  if (!afiliada) notFound();

  const voltarPara = `/admin/afiliadas/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/afiliadas"
          className="text-sm text-[var(--c21-tinta-suave)] underline underline-offset-2"
        >
          ← Afiliadas
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-[var(--c21-tinta)]">{afiliada.nome}</h1>
      </div>

      {erro && (
        <p className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-erro)] bg-[var(--c21-papel)] px-4 py-2 text-sm text-[var(--c21-erro)]">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-sucesso)] bg-[var(--c21-papel)] px-4 py-2 text-sm text-[var(--c21-sucesso)]">
          {sucesso}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--c21-tinta)]">Dados</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--c21-tinta-suave)]">Percentual</dt>
              <dd className="text-[var(--c21-tinta)]">{afiliada.percentual}%</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--c21-tinta-suave)]">Status</dt>
              <dd className="text-[var(--c21-tinta)]">{afiliada.ativo ? "Ativa" : "Inativa"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--c21-tinta-suave)]">E-mail</dt>
              <dd className="text-[var(--c21-tinta)]">{afiliada.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--c21-tinta-suave)]">Telefone</dt>
              <dd className="text-[var(--c21-tinta)]">{afiliada.telefone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--c21-tinta-suave)]">CPF/CNPJ</dt>
              <dd className="text-[var(--c21-tinta)]">{afiliada.cpfCnpj ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--c21-tinta-suave)]">Chave Pix</dt>
              <dd className="text-[var(--c21-tinta)]">
                {afiliada.chavePix ?? "—"}
                {afiliada.tipoChavePix ? ` (${afiliada.tipoChavePix})` : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--c21-tinta-suave)]">Cadastrada em</dt>
              <dd className="text-[var(--c21-tinta)]">{formatarDataAdmin(afiliada.criadoEm)}</dd>
            </div>
            {afiliada.observacoes && (
              <div className="flex flex-col gap-1 border-t border-[var(--c21-linha)] pt-2">
                <dt className="text-[var(--c21-tinta-suave)]">Observações</dt>
                <dd className="text-[var(--c21-tinta)]">{afiliada.observacoes}</dd>
              </div>
            )}
          </dl>
          <FormEditarAfiliada afiliada={afiliada} />
        </section>

        <section className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--c21-tinta)]">Link de indicação</h2>
          <CopiarLink link={linkIndicacao(afiliada.codigo)} />
        </section>
      </div>

      <section className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--c21-tinta)]">
          Assinantes por afiliada ({afiliada.assinantes.length})
        </h2>
        {afiliada.assinantes.length === 0 ? (
          <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhuma assinante ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--c21-linha)] text-left text-xs text-[var(--c21-tinta-suave)]">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Plano</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Desde</th>
                </tr>
              </thead>
              <tbody>
                {afiliada.assinantes.map((s) => (
                  <tr key={s.assinaturaId} className="border-b border-[var(--c21-linha)] last:border-0">
                    <td className="px-3 py-2">{s.membroNome}</td>
                    <td className="px-3 py-2 text-[var(--c21-tinta-suave)]">{s.membroEmail}</td>
                    <td className="px-3 py-2">{s.planoNome}</td>
                    <td className="px-3 py-2">
                      <SeloStatus status={s.status} />
                    </td>
                    <td className="px-3 py-2 text-[var(--c21-tinta-suave)]">
                      {formatarDataAdmin(s.criadoEm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--c21-tinta)]">Comissões</h2>
        <TabelaComissoes linhas={afiliada.comissoes} voltarPara={voltarPara} mostrarCompetencia />
      </section>
    </div>
  );
}
