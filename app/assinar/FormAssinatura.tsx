"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PAISES } from "@/lib/paises";
import {
  ACRESCIMO_INTERNACIONAL_POR_MES,
  calcularAcrescimoInternacional,
} from "@/lib/precos";

import {
  formatarPrecoCiclo,
  formatarValor,
  opcaoAfiliado,
  OPCOES_ORIGEM_FIM,
  OPCOES_ORIGEM_INICIO,
  useFormAssinatura,
  type FormaPagamento,
  type Plano,
  type UpsellInfo,
} from "./useFormAssinatura";

// ---------------------------------------------------------------------------
// Peças pequenas de UI. Isoladas aqui pra troca de visual não encostar na
// lógica do hook. Sem design definido ainda: mínimo legível com Tailwind.
// ---------------------------------------------------------------------------

// Emoji e descrição são só texto/decoração — nunca preço, que sempre vem do
// banco. Fallback usado enquanto `planos.descricao` estiver vazio.
const EMOJI_POR_SLUG: Record<string, string> = {
  pessego: "🍑",
  flor: "🌸",
  semente: "🌱",
};

const DESCRICAO_FALLBACK_POR_SLUG: Record<string, string> = {
  pessego:
    "A experiência completa do Clube 21. Você recebe tudo: tiragem e foco do mês, Diário Vitor e Diário Varlei, horóscopo do mês, as três crônicas do mês, mão na massa (drink + receita) e histórias das membras. E ainda ganha: carta de tarô colecionável do mês, participação nos Classificados C21, adesivos, presente de marcas parceiras, sorteios mensais, missões exclusivas, credencial exclusiva de membro e acesso à Comunidade Pêssego.",
  flor: "Um passo além do essencial. Tudo do Semente, mais o Mão na Massa (drink e receita do mês) e as Histórias das Membras. Ideal pra quem quer sentir mais o clube, sem precisar da experiência completa ainda.",
  semente:
    "O primeiro passo pra viver deliciosamente. Tiragem e foco do mês, os diários do Vitor e do Varlei, horóscopo e as três crônicas do mês. Recebe também o Classificados C21 (sem poder participar ainda).",
};

function Campo({
  id,
  label,
  value,
  onChange,
  onBlur,
  erro,
  tipo = "text",
  placeholder,
  obrigatorio,
  readOnly,
  ajuda,
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  erro?: string;
  tipo?: string;
  placeholder?: string;
  obrigatorio?: boolean;
  readOnly?: boolean;
  ajuda?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--c21-tinta)]"
      >
        {label}
        {obrigatorio && <span className="text-[var(--c21-erro)]"> *</span>}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        readOnly={readOnly}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(erro)}
        className={`rounded-[var(--c21-raio-sm)] border px-3 py-2 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)] ${
          erro ? "border-[var(--c21-erro)]" : "border-[var(--c21-linha)]"
        } ${
          readOnly
            ? "bg-[var(--c21-papel-fundo)] text-[var(--c21-tinta-suave)]"
            : "bg-[var(--c21-papel)]"
        }`}
      />
      {ajuda && !erro && (
        <p className="text-xs text-[var(--c21-tinta-suave)]">{ajuda}</p>
      )}
      {erro && <p className="text-xs text-[var(--c21-erro)]">{erro}</p>}
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  opcoes,
  ajuda,
  erro,
  obrigatorio,
  comOpcaoVazia = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  opcoes: { value: string; label: string }[];
  ajuda?: string;
  erro?: string;
  obrigatorio?: boolean;
  comOpcaoVazia?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--c21-tinta)]"
      >
        {label}
        {obrigatorio && <span className="text-[var(--c21-erro)]"> *</span>}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-[var(--c21-raio-sm)] border bg-[var(--c21-papel)] px-3 py-2 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)] ${
          erro ? "border-[var(--c21-erro)]" : "border-[var(--c21-linha)]"
        }`}
      >
        {comOpcaoVazia && <option value=""></option>}
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {ajuda && !erro && (
        <p className="text-xs text-[var(--c21-tinta-suave)]">{ajuda}</p>
      )}
      {erro && <p className="text-xs text-[var(--c21-erro)]">{erro}</p>}
    </div>
  );
}

function Botao({
  children,
  onClick,
  tipo = "button",
  variante = "primario",
  desabilitado,
}: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: "button" | "submit";
  variante?: "primario" | "texto";
  desabilitado?: boolean;
}) {
  if (variante === "texto") {
    return (
      <button
        type={tipo}
        onClick={onClick}
        disabled={desabilitado}
        className="text-sm font-medium text-[var(--c21-vermelho)] underline underline-offset-2 hover:text-[var(--c21-acao-hover)] disabled:opacity-50"
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={desabilitado}
      className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-2.5 text-sm font-bold text-[var(--c21-papel)] hover:bg-[var(--c21-acao-hover)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ModalUpsell({
  info,
  ehBrasil,
  onEscolherMensal,
  onEscolherTrimestral,
}: {
  info: UpsellInfo;
  ehBrasil: boolean;
  onEscolherMensal: () => void;
  onEscolherTrimestral: () => void;
}) {
  // Mesma fórmula do servidor: R$ 20 por envelope, por mês do ciclo. Reaberto
  // com país já não-BR (ex.: "trocar plano" depois de escolher Portugal),
  // então precisa refletir o acréscimo igual ao resto da tela.
  const acrescimoMensal = ehBrasil
    ? 0
    : calcularAcrescimoInternacional(info.mensal.meses);
  const acrescimoTrimestral = ehBrasil
    ? 0
    : calcularAcrescimoInternacional(info.trimestral.meses);
  const valorMensal = info.mensal.valor + acrescimoMensal;
  const valorTrimestral = info.trimestral.valor + acrescimoTrimestral;
  const valorMensalEquivalente = valorTrimestral / 3;
  const economia = valorMensal * 3 - valorTrimestral;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--c21-tinta)]/40 p-4"
      onClick={onEscolherMensal}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-[var(--c21-raio-md)] bg-[var(--c21-papel)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            className="text-base font-normal text-[var(--c21-tinta)]"
            style={{ fontFamily: "var(--c21-fonte-display)" }}
          >
            Quer economizar no {info.mensal.nome}?
          </h2>
          <button
            type="button"
            onClick={onEscolherMensal}
            aria-label="Fechar"
            className="text-[var(--c21-tinta-suave)] hover:text-[var(--c21-tinta)]"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] p-3">
          <p className="text-sm font-medium text-[var(--c21-tinta)]">
            {info.mensal.nome}
          </p>
          <p className="text-sm text-[var(--c21-tinta-suave)]">
            {formatarValor(valorMensal)}/mês
          </p>
          <Botao variante="texto" onClick={onEscolherMensal}>
            Continuar mensal
          </Botao>
        </div>

        <div className="flex flex-col gap-2 rounded-[var(--c21-raio-sm)] border-2 border-[var(--c21-tinta)] p-3">
          <p className="text-sm font-medium text-[var(--c21-tinta)]">
            {info.trimestral.nome}
          </p>
          <p className="text-sm font-medium text-[var(--c21-tinta)]">
            {formatarValor(valorTrimestral)} a cada 3 meses
          </p>
          <p className="text-xs text-[var(--c21-tinta-suave)]">
            {formatarValor(valorMensalEquivalente)} por mês, cobrados a
            cada 3 meses
          </p>
          <p className="text-xs text-[var(--c21-tinta-suave)]">
            Economize {formatarValor(economia)}
          </p>
          {info.mensal.familia === "pessego" && (
            <p className="text-xs text-[var(--c21-tinta-suave)]">
              {formatarValor(valorMensalEquivalente)} por carta — você
              paga o mesmo do plano Flor e leva o Pêssego
            </p>
          )}
          <Botao onClick={onEscolherTrimestral}>Trocar pelo trimestral</Botao>
        </div>
      </div>
    </div>
  );
}

/**
 * Seletor de forma de pagamento (spec-seletor-pagamento.md). Estado
 * selecionado não depende só de cor — borda + fundo + "✓" no título.
 */
function SeletorPagamento({
  valor,
  onChange,
  trimestral,
}: {
  valor: FormaPagamento;
  onChange: (v: FormaPagamento) => void;
  trimestral: boolean;
}) {
  const opcoes: { valor: FormaPagamento; titulo: string; texto: string }[] = [
    {
      valor: "CREDIT_CARD",
      titulo: "Cartão de crédito",
      texto: trimestral
        ? "Cobrança automática a cada 3 meses."
        : "Cobrança automática todo mês.",
    },
    {
      valor: "PIX",
      titulo: "Pix",
      texto: trimestral
        ? "A cada 3 meses você recebe um novo Pix por e-mail pra pagar."
        : "A cada mês você recebe um novo Pix por e-mail pra pagar.",
    },
  ];

  return (
    <section className="flex flex-col gap-2 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <h2
        className="text-sm font-normal text-[var(--c21-tinta)]"
        style={{ fontFamily: "var(--c21-fonte-display)", fontSize: "1.05rem" }}
      >
        Forma de pagamento
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        {opcoes.map((o) => {
          const selecionado = valor === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => onChange(o.valor)}
              aria-pressed={selecionado}
              className={`flex flex-1 flex-col gap-1 rounded-[var(--c21-raio-sm)] border p-3 text-left ${
                selecionado
                  ? "border-[var(--c21-tinta)] bg-[var(--c21-papel-fundo)] ring-1 ring-[var(--c21-tinta)]"
                  : "border-[var(--c21-linha)] bg-[var(--c21-papel)]"
              }`}
            >
              <span className="text-sm font-medium text-[var(--c21-tinta)]">
                {selecionado ? "✓ " : ""}
                {o.titulo}
              </span>
              <span className="text-xs text-[var(--c21-tinta-suave)]">
                {o.texto}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Mostra o ciclo trimestral ao lado do mensal, lado a lado, com o trimestral
 * marcado como recomendado — visível assim que a pessoa chega com um plano
 * selecionado (por URL ou por já ter escolhido na lista). Não substitui o
 * ModalUpsell (que continua disparando de onde já dispara hoje, ao escolher
 * um plano mensal na lista "trocar plano"): isto aqui é só apresentação, e
 * troca de ciclo chama `selecionarPlano` diretamente, sem popup.
 */
function SeletorCiclo({
  planos,
  planoSelecionado,
  ehBrasil,
  onSelecionar,
}: {
  planos: Plano[];
  planoSelecionado: Plano;
  ehBrasil: boolean;
  onSelecionar: (slug: string) => void;
}) {
  const familia = planoSelecionado.familia;
  const trimestral = familia
    ? planos.find((p) => p.familia === familia && p.ciclo === "trimestral")
    : undefined;
  const mensal = familia
    ? planos.find((p) => p.familia === familia && p.ciclo === "mensal")
    : undefined;

  if (!trimestral || !mensal) return null;

  const acrescimoMensal = ehBrasil
    ? 0
    : calcularAcrescimoInternacional(mensal.meses);
  const acrescimoTrimestral = ehBrasil
    ? 0
    : calcularAcrescimoInternacional(trimestral.meses);
  const valorMensal = mensal.valor + acrescimoMensal;
  const valorTrimestral = trimestral.valor + acrescimoTrimestral;
  const economia = valorMensal * 3 - valorTrimestral;
  const cicloAtual = planoSelecionado.ciclo;

  const opcoes: {
    slug: string;
    ciclo: string;
    titulo: string;
    recomendado?: boolean;
    linhas: string[];
  }[] = [
    {
      slug: trimestral.slug,
      ciclo: "trimestral",
      titulo: "Trimestral",
      recomendado: true,
      linhas: [
        `${formatarValor(valorTrimestral)} a cada 3 meses`,
        `Economize ${formatarValor(economia)}`,
      ],
    },
    {
      slug: mensal.slug,
      ciclo: "mensal",
      titulo: "Mensal",
      linhas: [`${formatarValor(valorMensal)}/mês`],
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-[var(--c21-tinta)]">
        Forma de cobrança
      </span>
      <div className="flex flex-col gap-3 sm:flex-row">
        {opcoes.map((o) => {
          const selecionado = cicloAtual === o.ciclo;
          return (
            <button
              key={o.slug}
              type="button"
              onClick={() => onSelecionar(o.slug)}
              aria-pressed={selecionado}
              className={`flex flex-1 flex-col gap-1 rounded-[var(--c21-raio-sm)] border p-3 text-left ${
                selecionado
                  ? "border-[var(--c21-tinta)] bg-[var(--c21-papel-fundo)] ring-1 ring-[var(--c21-tinta)]"
                  : "border-[var(--c21-linha)] bg-[var(--c21-papel)]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--c21-tinta)]">
                  {selecionado ? "✓ " : ""}
                  {o.titulo}
                </span>
                {o.recomendado && (
                  <span className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-vermelho)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--c21-papel)]">
                    Recomendado
                  </span>
                )}
              </span>
              {o.linhas.map((linha) => (
                <span
                  key={linha}
                  className="text-xs text-[var(--c21-tinta-suave)]"
                >
                  {linha}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export default function FormAssinatura({
  planoInicial,
  refInicial,
  afInicial,
}: {
  planoInicial: string | null;
  refInicial: string | null;
  afInicial: string | null;
}) {
  const f = useFormAssinatura(planoInicial, refInicial, afInicial);

  return (
    <form
      className="flex w-full max-w-md flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        f.enviar();
      }}
      noValidate
    >
      {f.erroGeral && (
        <div className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-erro)] bg-[var(--c21-papel-fundo)] px-3 py-2 text-sm text-[var(--c21-erro)]">
          {f.erroGeral}
        </div>
      )}

      {/* Plano */}
      <section className="flex flex-col gap-3 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2
          className="text-sm font-normal text-[var(--c21-tinta)]"
          style={{ fontFamily: "var(--c21-fonte-display)", fontSize: "1.05rem" }}
        >
          Plano
        </h2>

        {f.planos === null && !f.planosErro && (
          <p className="text-sm text-[var(--c21-tinta-suave)]">
            Carregando planos…
          </p>
        )}
        {f.planosErro && (
          <p className="text-sm text-[var(--c21-erro)]">{f.planosErro}</p>
        )}

        {f.planos && f.planoSelecionado && !f.mostrarEscolhaPlanos && (
          <div className="flex items-center gap-3 rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel-fundo)] px-3 py-3">
            <img
              src="/clube21/pessego.svg"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0"
            />
            <div className="flex flex-1 items-center justify-between gap-3">
              <div>
                <p
                  className="text-base font-normal text-[var(--c21-tinta)]"
                  style={{ fontFamily: "var(--c21-fonte-display)" }}
                >
                  {f.planoSelecionado.nome}
                </p>
                <p className="text-sm text-[var(--c21-tinta-suave)]">
                  {formatarPrecoCiclo(
                    f.planoSelecionado.ciclo,
                    f.valorComAcrescimo ?? f.planoSelecionado.valor,
                  )}
                  {!f.ehBrasil && f.acrescimoInternacional > 0 && (
                    <> (já com + {formatarValor(f.acrescimoInternacional)} de envio internacional)</>
                  )}
                </p>
              </div>
              <Botao variante="texto" onClick={f.alternarEscolhaPlanos}>
                trocar plano
              </Botao>
            </div>
          </div>
        )}

        {f.planos && f.planoSelecionado && !f.mostrarEscolhaPlanos && (
          <SeletorCiclo
            planos={f.planos}
            planoSelecionado={f.planoSelecionado}
            ehBrasil={f.ehBrasil}
            onSelecionar={f.selecionarPlano}
          />
        )}

        {f.planosMensais && f.mostrarEscolhaPlanos && (
          <div id="plano" className="flex flex-col gap-4">
            {f.planosMensais.map((p, index) => {
              const destaque = index === 0;
              const descricao =
                p.descricao || DESCRICAO_FALLBACK_POR_SLUG[p.slug] || "";
              const emoji = EMOJI_POR_SLUG[p.slug];

              return (
                <div
                  key={p.slug}
                  className={`flex flex-col gap-3 rounded-[var(--c21-raio-md)] border p-4 ${
                    destaque
                      ? "border-[var(--c21-tinta)] shadow-md sm:scale-105"
                      : "border-[var(--c21-linha)]"
                  }`}
                >
                  {destaque && (
                    <span className="self-start rounded-[var(--c21-raio-pilula)] bg-[var(--c21-tinta)] px-2 py-0.5 text-xs font-medium text-[var(--c21-papel)]">
                      Mais completo
                    </span>
                  )}
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="text-base font-normal text-[var(--c21-tinta)]"
                      style={{ fontFamily: "var(--c21-fonte-display)" }}
                    >
                      {emoji ? `${emoji} ` : ""}
                      {p.nome}
                    </span>
                    <span className="whitespace-nowrap text-sm text-[var(--c21-tinta-suave)]">
                      {formatarValor(
                        p.valor +
                          (f.ehBrasil ? 0 : calcularAcrescimoInternacional(p.meses)),
                      )}
                      /mês
                    </span>
                  </div>
                  {descricao && (
                    <p className="text-sm text-[var(--c21-tinta)]">
                      {descricao}
                    </p>
                  )}
                  <Botao onClick={() => f.escolherPlano(p.slug)}>
                    Quero o {p.nome}
                  </Botao>
                </div>
              );
            })}
            {f.erros.plano && (
              <p className="text-xs text-[var(--c21-erro)]">{f.erros.plano}</p>
            )}
          </div>
        )}
      </section>

      {f.upsellPendente && (
        <ModalUpsell
          info={f.upsellPendente}
          ehBrasil={f.ehBrasil}
          onEscolherMensal={() => f.confirmarUpsell(false)}
          onEscolherTrimestral={() => f.confirmarUpsell(true)}
        />
      )}

      {/* Dados pessoais */}
      <section className="flex flex-col gap-3 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2
          className="text-sm font-normal text-[var(--c21-tinta)]"
          style={{ fontFamily: "var(--c21-fonte-display)", fontSize: "1.05rem" }}
        >
          Seus dados
        </h2>
        <Campo
          id="nome"
          label="Nome completo"
          value={f.campos.nome}
          onChange={(v) => f.atualizarCampo("nome", v)}
          erro={f.erros.nome}
          obrigatorio
          autoComplete="name"
        />
        <Campo
          id="email"
          label="E-mail"
          tipo="email"
          value={f.campos.email}
          onChange={(v) => f.atualizarCampo("email", v)}
          erro={f.erros.email}
          obrigatorio
          autoComplete="email"
          inputMode="email"
        />
        {f.mostrarMenuOrigem && (
          <Select
            id="origem"
            label="Como você ficou sabendo do Clube 21?"
            value={f.origemSelecionada}
            onChange={f.selecionarOrigem}
            opcoes={[
              ...OPCOES_ORIGEM_INICIO,
              ...f.afiliadosMenu.map((a) => ({
                value: opcaoAfiliado(a.codigo),
                label: a.nome,
              })),
              ...OPCOES_ORIGEM_FIM,
            ]}
            erro={f.erros.origem}
            obrigatorio
          />
        )}
        {f.campos.origem === "assinante" && (
          <Campo
            id="ref_code"
            label="Código de indicação"
            value={f.campos.ref_code}
            onChange={(v) => f.atualizarCampo("ref_code", v)}
            onBlur={() => f.validarCodigoIndicacao(f.campos.ref_code)}
            erro={
              f.erros.ref_code ??
              (f.codigoIndicacaoStatus === "erro"
                ? "Não encontramos esse código. Confere com quem te indicou?"
                : undefined)
            }
            obrigatorio
            ajuda={
              f.codigoIndicacaoStatus === "ok" && f.codigoIndicacaoNome
                ? `Indicação da ${f.codigoIndicacaoNome} ✓`
                : f.codigoIndicacaoStatus === "verificando"
                  ? "Verificando código…"
                  : "Uma amiga te indicou? Coloca o código dela aqui e ela ganha desconto no mês seguinte 🍑"
            }
          />
        )}
        {f.campos.origem === "outro" && (
          <Campo
            id="origem_detalhe"
            label="Conta pra gente onde 🙂"
            value={f.campos.origem_detalhe}
            onChange={(v) => f.atualizarCampo("origem_detalhe", v)}
            erro={f.erros.origem_detalhe}
          />
        )}
        <Campo
          id="cpf"
          label="CPF"
          value={f.campos.cpf}
          onChange={f.atualizarCPF}
          erro={f.erros.cpf}
          obrigatorio
          placeholder="000.000.000-00"
          inputMode="numeric"
        />
        <Campo
          id="telefone"
          label="Telefone"
          value={f.campos.telefone}
          onChange={f.atualizarTelefone}
          erro={f.erros.telefone}
          obrigatorio
          placeholder="(11) 98765-4321"
          inputMode="tel"
          ajuda="Use um número real — números implausíveis são recusados na hora do pagamento"
        />
      </section>

      {/* Endereço de entrega */}
      <section className="flex flex-col gap-3 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
        <h2
          className="text-sm font-normal text-[var(--c21-tinta)]"
          style={{ fontFamily: "var(--c21-fonte-display)", fontSize: "1.05rem" }}
        >
          Endereço de entrega
        </h2>
        <Select
          id="pais"
          label="País"
          value={f.campos.pais}
          onChange={f.atualizarPais}
          opcoes={PAISES.map((p) => ({ value: p.codigo, label: p.nome }))}
          erro={f.erros.pais}
          obrigatorio
          comOpcaoVazia={false}
        />
        {!f.ehBrasil && f.planoSelecionado && (
          <p className="rounded-[var(--c21-raio-sm)] bg-[var(--c21-papel-fundo)] px-3 py-2 text-xs font-medium text-[var(--c21-tinta)]">
            Envio internacional: + {formatarValor(f.acrescimoInternacional)}
            {f.planoSelecionado.meses > 1 &&
              ` (${formatarValor(ACRESCIMO_INTERNACIONAL_POR_MES)} por envelope)`}
          </p>
        )}
        <Campo
          id="cep"
          label={f.ehBrasil ? "CEP" : "Código postal"}
          value={f.campos.cep}
          onChange={f.atualizarCEP}
          erro={f.erros.cep ?? (f.cepStatus === "erro" ? f.cepMensagem ?? undefined : undefined)}
          obrigatorio
          placeholder={f.ehBrasil ? "00000-000" : "Postal code"}
          inputMode={f.ehBrasil ? "numeric" : "text"}
          ajuda={f.cepStatus === "carregando" ? "Buscando CEP…" : undefined}
        />
        <Campo
          id="logradouro"
          label="Logradouro"
          value={f.campos.logradouro}
          onChange={(v) => f.atualizarCampo("logradouro", v)}
          erro={f.erros.logradouro}
          obrigatorio
          readOnly={f.enderecoBloqueado}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            id="numero"
            label="Número"
            value={f.campos.numero}
            onChange={(v) => f.atualizarCampo("numero", v)}
            erro={f.erros.numero}
            obrigatorio
          />
          <Campo
            id="complemento"
            label="Complemento"
            value={f.campos.complemento}
            onChange={(v) => f.atualizarCampo("complemento", v)}
            erro={f.erros.complemento}
          />
        </div>
        <Campo
          id="bairro"
          label="Bairro"
          value={f.campos.bairro}
          onChange={(v) => f.atualizarCampo("bairro", v)}
          erro={f.erros.bairro}
          obrigatorio
          readOnly={f.enderecoBloqueado}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            id="cidade"
            label="Cidade"
            value={f.campos.cidade}
            onChange={(v) => f.atualizarCampo("cidade", v)}
            erro={f.erros.cidade}
            obrigatorio
            readOnly={f.enderecoBloqueado}
          />
          <Campo
            id="uf"
            label={f.ehBrasil ? "UF" : "Estado / Região"}
            value={f.campos.uf}
            onChange={f.atualizarUf}
            erro={f.erros.uf}
            obrigatorio
            readOnly={f.enderecoBloqueado}
          />
        </div>
        <Campo
          id="ponto_referencia"
          label="Ponto de referência"
          value={f.campos.ponto_referencia}
          onChange={(v) => f.atualizarCampo("ponto_referencia", v)}
          erro={f.erros.ponto_referencia}
        />
      </section>

      <p className="text-xs text-[var(--c21-tinta-suave)]">
        Ao assinar, você concorda com a nossa{" "}
        <Link
          href="/privacidade"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-[var(--c21-vermelho)]"
        >
          Política de Privacidade
        </Link>
        .
      </p>

      <SeletorPagamento
        valor={f.formaPagamento}
        onChange={f.selecionarFormaPagamento}
        trimestral={f.planoSelecionado?.ciclo === "trimestral"}
      />

      <Botao tipo="submit" desabilitado={f.enviando}>
        {f.enviando ? "Enviando…" : "Continuar para pagamento"}
      </Botao>
    </form>
  );
}
