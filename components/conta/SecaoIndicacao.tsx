import type { IndicacoesConta, CreditoConta } from "@/lib/conta/dados";
import CopiarLink from "@/components/CopiarLink";
import Bloco from "./Bloco";

const ROTULO_CREDITO: Record<string, string> = {
  previsto: "Previsto",
  aplicado: "Aplicado",
  expirado: "Expirado",
  falhou: "Falhou",
};

export default function SecaoIndicacao({
  link,
  indicacoes,
  creditos,
}: {
  link: string;
  indicacoes: IndicacoesConta;
  creditos: CreditoConta[];
}) {
  const total = indicacoes.pendentes + indicacoes.confirmadas + indicacoes.canceladas;

  return (
    <Bloco titulo="Indicação">
      <p className="text-sm text-[var(--c21-tinta)]">
        Cada amiga que assinar com o seu link vira desconto no mês seguinte — 1 = 25%, 2 = 50%, 3 = 75%, 4 = mês grátis.
      </p>
      <CopiarLink link={link} />

      {total === 0 ? (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Você ainda não indicou ninguém.</p>
      ) : (
        <p className="text-sm text-[var(--c21-tinta-suave)]">
          {indicacoes.confirmadas} confirmada{indicacoes.confirmadas === 1 ? "" : "s"}
          {indicacoes.pendentes > 0 && ` · ${indicacoes.pendentes} pendente${indicacoes.pendentes === 1 ? "" : "s"}`}
          {indicacoes.canceladas > 0 && ` · ${indicacoes.canceladas} cancelada${indicacoes.canceladas === 1 ? "" : "s"}`}
        </p>
      )}

      {creditos.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-[var(--c21-linha)] pt-2">
          {creditos.map((c, i) => (
            <li key={i} className="grid grid-cols-[1fr_60px_90px] items-center gap-3 text-sm">
              <span className="text-[var(--c21-tinta-suave)]">{c.cicloRef}</span>
              <span className="text-right text-[var(--c21-tinta)]">{c.percentual}%</span>
              <span className="text-right text-[var(--c21-tinta-suave)]">{ROTULO_CREDITO[c.status] ?? c.status}</span>
            </li>
          ))}
        </ul>
      )}
    </Bloco>
  );
}
