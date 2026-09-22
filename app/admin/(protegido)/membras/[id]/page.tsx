import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { buscarDetalheMembro } from "@/lib/admin/membras";
import { formatarDataAdmin, formatarDataHoraAdmin } from "@/lib/admin/formato";
import { formatarValor } from "@/lib/formatacao";
import SeloStatus from "@/components/SeloStatus";

function Campo({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--c21-tinta-suave)]">{rotulo}</dt>
      <dd className="text-right text-[var(--c21-tinta)]">{valor}</dd>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <h2 className="mb-3 text-sm font-semibold text-[var(--c21-tinta)]">{titulo}</h2>
      {children}
    </section>
  );
}

export default async function PaginaDetalheMembro({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membro = await buscarDetalheMembro(id);
  if (!membro) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/membras"
          className="text-sm text-[var(--c21-tinta-suave)] underline underline-offset-2"
        >
          ← Membras
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-[var(--c21-tinta)]">{membro.nome}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Bloco titulo="Contato">
          <dl className="flex flex-col gap-2 text-sm">
            <Campo rotulo="E-mail" valor={membro.email} />
            <Campo rotulo="Telefone" valor={membro.telefone ?? "—"} />
            <Campo rotulo="CPF" valor={membro.cpf ?? "—"} />
            <Campo
              rotulo="Cadastro"
              valor={`${membro.status} — desde ${formatarDataAdmin(membro.criadoEm)}`}
            />
            <Campo rotulo="Código de indicação" valor={membro.codigoIndicacao ?? "—"} />
          </dl>
        </Bloco>

        <Bloco titulo="Endereço">
          {membro.endereco ? (
            <p className="text-sm leading-relaxed text-[var(--c21-tinta)]">
              {membro.endereco.logradouro}, {membro.endereco.numero}
              {membro.endereco.complemento ? ` — ${membro.endereco.complemento}` : ""}
              <br />
              {membro.endereco.bairro ? `${membro.endereco.bairro} — ` : ""}
              {membro.endereco.cidade}
              {membro.endereco.uf ? `/${membro.endereco.uf}` : ""}
              <br />
              CEP {membro.endereco.cep ?? "—"} — {membro.endereco.pais}
              {membro.endereco.pontoReferencia && (
                <>
                  <br />
                  Referência: {membro.endereco.pontoReferencia}
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-[var(--c21-tinta-suave)]">Sem endereço cadastrado.</p>
          )}
        </Bloco>

        <Bloco titulo="Assinatura atual">
          {membro.assinaturaAtual ? (
            <dl className="flex flex-col gap-2 text-sm">
              <Campo rotulo="Plano" valor={membro.assinaturaAtual.planoNome} />
              <Campo rotulo="Status" valor={<SeloStatus status={membro.assinaturaAtual.status} />} />
              <Campo rotulo="Valor" valor={formatarValor(membro.assinaturaAtual.valor)} />
              <Campo rotulo="Forma de pagamento" valor={membro.assinaturaAtual.billingType ?? "—"} />
              <Campo rotulo="Afiliada" valor={membro.assinaturaAtual.afiliadaNome ?? "—"} />
              <Campo
                rotulo="Próxima cobrança"
                valor={
                  membro.assinaturaAtual.proximaCobranca
                    ? formatarDataAdmin(membro.assinaturaAtual.proximaCobranca)
                    : "—"
                }
              />
              {membro.assinaturaAtual.canceladaEm && (
                <Campo
                  rotulo="Cancelada em"
                  valor={
                    formatarDataAdmin(membro.assinaturaAtual.canceladaEm) +
                    (membro.assinaturaAtual.motivoCancelamento
                      ? ` — ${membro.assinaturaAtual.motivoCancelamento}`
                      : "")
                  }
                />
              )}
            </dl>
          ) : (
            <p className="text-sm text-[var(--c21-tinta-suave)]">Sem assinatura.</p>
          )}
        </Bloco>

        <Bloco titulo="Envios previstos">
          {membro.enviosPrevistos.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-[var(--c21-tinta)]">
              {membro.enviosPrevistos.map((e, i) => (
                <li key={i}>{e.edicaoNome ?? e.edicaoMes}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhum envio previsto.</p>
          )}
        </Bloco>
      </div>

      <Bloco titulo="Histórico">
        {membro.eventos.length === 0 ? (
          <p className="text-sm text-[var(--c21-tinta-suave)]">Nenhum evento registrado.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {membro.eventos.map((ev, i) => (
              <li
                key={i}
                className="flex flex-wrap items-baseline gap-x-2 border-b border-[var(--c21-linha)] pb-2 last:border-0"
              >
                <span className="font-medium text-[var(--c21-tinta)]">{ev.tipo}</span>
                <span className="text-[var(--c21-tinta-suave)]">
                  {formatarDataHoraAdmin(ev.criadoEm)}
                </span>
                {ev.planoSlug && (
                  <span className="text-[var(--c21-tinta-suave)]">— {ev.planoSlug}</span>
                )}
                {ev.origemRotulo && (
                  <span className="text-[var(--c21-tinta-suave)]">· {ev.origemRotulo}</span>
                )}
                {ev.motivo && <span className="text-[var(--c21-tinta-suave)]">· {ev.motivo}</span>}
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </div>
  );
}
