"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PAISES } from "@/lib/paises";

import { formatarValor, useFormAssinatura } from "./useFormAssinatura";

// ---------------------------------------------------------------------------
// Peças pequenas de UI. Isoladas aqui pra troca de visual não encostar na
// lógica do hook. Sem design definido ainda: mínimo legível com Tailwind.
// ---------------------------------------------------------------------------

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
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
        {obrigatorio && <span className="text-red-600"> *</span>}
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
        className={`rounded border px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 ${
          erro ? "border-red-500" : "border-zinc-300"
        } ${readOnly ? "bg-zinc-100 text-zinc-600" : "bg-white"}`}
      />
      {ajuda && !erro && <p className="text-xs text-zinc-500">{ajuda}</p>}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
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
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
        {obrigatorio && <span className="text-red-600"> *</span>}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded border bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 ${
          erro ? "border-red-500" : "border-zinc-300"
        }`}
      >
        {comOpcaoVazia && <option value=""></option>}
        {opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {ajuda && !erro && <p className="text-xs text-zinc-500">{ajuda}</p>}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
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
        className="text-sm font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 disabled:opacity-50"
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
      className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export default function FormAssinatura({
  planoInicial,
  refInicial,
}: {
  planoInicial: string | null;
  refInicial: string | null;
}) {
  const f = useFormAssinatura(planoInicial, refInicial);

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
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {f.erroGeral}
        </div>
      )}

      {/* Plano */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">Plano</h2>

        {f.planos === null && !f.planosErro && (
          <p className="text-sm text-zinc-500">Carregando planos…</p>
        )}
        {f.planosErro && (
          <p className="text-sm text-red-600">{f.planosErro}</p>
        )}

        {f.planos && f.planoSelecionado && !f.mostrarEscolhaPlanos && (
          <div className="flex items-center justify-between rounded border border-zinc-300 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {f.planoSelecionado.nome}
              </p>
              <p className="text-sm text-zinc-600">
                {formatarValor(f.planoSelecionado.valor)}/mês
              </p>
            </div>
            <Botao variante="texto" onClick={f.alternarEscolhaPlanos}>
              trocar plano
            </Botao>
          </div>
        )}

        {f.planos && f.mostrarEscolhaPlanos && (
          <div id="plano" className="flex flex-col gap-2">
            {f.planos.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => f.selecionarPlano(p.slug)}
                className={`flex items-center justify-between rounded border px-3 py-2 text-left hover:border-zinc-500 ${
                  f.planoSlug === p.slug
                    ? "border-zinc-900"
                    : "border-zinc-300"
                }`}
              >
                <span className="text-sm font-medium text-zinc-900">
                  {p.nome}
                </span>
                <span className="text-sm text-zinc-600">
                  {formatarValor(p.valor)}/mês
                </span>
              </button>
            ))}
            {f.erros.plano && (
              <p className="text-xs text-red-600">{f.erros.plano}</p>
            )}
          </div>
        )}
      </section>

      {/* Indicação */}
      <section className="flex flex-col gap-2">
        {f.mostrarCampoIndicacao ? (
          <Campo
            id="ref_code"
            label="Código de indicação"
            value={f.campos.ref_code}
            onChange={(v) => f.atualizarCampo("ref_code", v)}
            erro={f.erros.ref_code}
          />
        ) : (
          <Botao variante="texto" onClick={f.alternarCampoIndicacao}>
            Tenho um código de indicação
          </Botao>
        )}
      </section>

      {/* Afiliada */}
      {f.afiliadas.length > 0 && (
        <Select
          id="afiliada_id"
          label="Quem te indicou o clube?"
          value={f.campos.afiliada_id}
          onChange={(v) => f.atualizarCampo("afiliada_id", v)}
          opcoes={f.afiliadas.map((a) => ({ value: a.id, label: a.nome }))}
          ajuda="Opcional"
          erro={f.erros.afiliada_id}
        />
      )}

      {/* Dados pessoais */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">Seus dados</h2>
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
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">
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

      <p className="text-xs text-zinc-500">
        Ao assinar, você concorda com a nossa{" "}
        <Link
          href="/privacidade"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Política de Privacidade
        </Link>
        .
      </p>

      <Botao tipo="submit" desabilitado={f.enviando}>
        {f.enviando ? "Enviando…" : "Continuar para pagamento"}
      </Botao>
    </form>
  );
}
