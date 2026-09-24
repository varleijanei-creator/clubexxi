"use client";

import { useState, type FormEvent } from "react";

/* Formulário de cartão do checkout v2 — por enquanto só valida.
   Dados de cartão vivem apenas no estado do React desta tela: nada de
   console.log, storage ou envio pra API. Os inputs não têm `name` de
   propósito: se alguém enviar antes do JS carregar, o navegador não põe
   o número do cartão na URL. */

type Campos = { nome: string; numero: string; validade: string; cvv: string };
type Erros = Partial<Record<keyof Campos, string>>;

const VAZIO: Campos = { nome: "", numero: "", validade: "", cvv: "" };

const soDigitos = (v: string) => v.replace(/\D/g, "");

function formatarNumero(v: string) {
  return soDigitos(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatarValidade(v: string) {
  const d = soDigitos(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

// Amex (34/37) usa CVV de 4 dígitos; as demais bandeiras, 3.
const ehAmex = (numero: string) => /^3[47]/.test(soDigitos(numero));

function luhnValido(digitos: string) {
  let soma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let n = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    soma += n;
  }
  return soma % 10 === 0;
}

function validar(c: Campos): Erros {
  const erros: Erros = {};

  const nome = c.nome.trim();
  if (!nome) erros.nome = "Informe o nome como está no cartão.";
  else if (nome.split(/\s+/).length < 2)
    erros.nome = "Informe nome e sobrenome, como no cartão.";

  const numero = soDigitos(c.numero);
  if (!numero) erros.numero = "Informe o número do cartão.";
  else if (numero.length < 13 || numero.length > 19 || !luhnValido(numero))
    erros.numero = "Número de cartão inválido. Confira os dígitos.";

  const m = /^(\d{2})\/(\d{2})$/.exec(c.validade);
  if (!c.validade) erros.validade = "Informe a validade.";
  else if (!m || Number(m[1]) < 1 || Number(m[1]) > 12)
    erros.validade = "Use o formato MM/AA.";
  else {
    const hoje = new Date();
    const ano = 2000 + Number(m[2]);
    const mes = Number(m[1]);
    // o cartão vale até o último dia do mês impresso
    if (
      ano < hoje.getFullYear() ||
      (ano === hoje.getFullYear() && mes < hoje.getMonth() + 1)
    )
      erros.validade = "Cartão vencido.";
  }

  const cvv = soDigitos(c.cvv);
  const tamanhoCvv = ehAmex(c.numero) ? 4 : 3;
  if (!cvv) erros.cvv = "Informe o código de segurança.";
  else if (cvv.length !== tamanhoCvv)
    erros.cvv = `O código tem ${tamanhoCvv} dígitos.`;

  return erros;
}

function Campo({
  id,
  label,
  value,
  onChange,
  erro,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (valor: string) => void;
  erro?: string;
  placeholder?: string;
  autoComplete: string;
  inputMode?: "text" | "numeric";
  maxLength?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--c21-tinta)]"
      >
        {label}
        <span className="text-[var(--c21-erro)]"> *</span>
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        spellCheck={false}
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={`rounded-[var(--c21-raio-sm)] border bg-[var(--c21-papel)] px-3 py-2 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)] ${
          erro ? "border-[var(--c21-erro)]" : "border-[var(--c21-linha)]"
        }`}
      />
      {erro && (
        <p id={`${id}-erro`} className="text-xs text-[var(--c21-erro)]">
          {erro}
        </p>
      )}
    </div>
  );
}

export default function FormCartao() {
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [ok, setOk] = useState(false);

  function alterar(campo: keyof Campos, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
    setOk(false);
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const encontrados = validar(campos);
    setErros(encontrados);
    setOk(Object.keys(encontrados).length === 0);
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      autoComplete="on"
      className="flex flex-col gap-4 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4"
    >
      <Campo
        id="cc-name"
        label="Nome no cartão"
        value={campos.nome}
        onChange={(v) => alterar("nome", v)}
        erro={erros.nome}
        placeholder="Como está impresso no cartão"
        autoComplete="cc-name"
      />
      <Campo
        id="cc-number"
        label="Número do cartão"
        value={campos.numero}
        onChange={(v) => alterar("numero", formatarNumero(v))}
        erro={erros.numero}
        placeholder="0000 0000 0000 0000"
        autoComplete="cc-number"
        inputMode="numeric"
        maxLength={23}
      />
      <div className="grid grid-cols-2 gap-4">
        <Campo
          id="cc-exp"
          label="Validade"
          value={campos.validade}
          onChange={(v) => alterar("validade", formatarValidade(v))}
          erro={erros.validade}
          placeholder="MM/AA"
          autoComplete="cc-exp"
          inputMode="numeric"
          maxLength={5}
        />
        <Campo
          id="cc-csc"
          label="CVV"
          value={campos.cvv}
          onChange={(v) =>
            alterar("cvv", soDigitos(v).slice(0, ehAmex(campos.numero) ? 4 : 3))
          }
          erro={erros.cvv}
          placeholder={ehAmex(campos.numero) ? "0000" : "000"}
          autoComplete="cc-csc"
          inputMode="numeric"
          maxLength={4}
        />
      </div>

      <button
        type="submit"
        className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-2.5 text-sm font-bold text-[var(--c21-papel)] hover:bg-[var(--c21-acao-hover)]"
      >
        Validar cartão
      </button>

      <p role="status" className="text-sm font-semibold text-[var(--c21-tinta)]">
        {ok ? "teste: formulário ok" : ""}
      </p>
    </form>
  );
}
