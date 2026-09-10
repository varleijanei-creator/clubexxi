"use client";

import { useEffect, useMemo, useState } from "react";

import { formatarValor } from "@/lib/formatacao";
import {
  apenasDigitos,
  formatarCEP,
  formatarCPF,
  formatarTelefone,
  validarCPF,
} from "@/lib/validacao";

export { formatarValor };

export type Plano = {
  slug: string;
  nome: string;
  tipo: string;
  valor: number;
  ciclo: string;
};

export type Afiliada = {
  id: string;
  nome: string;
};

export type CamposForm = {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  ponto_referencia: string;
  ref_code: string;
  afiliada_id: string;
};

const CAMPOS_INICIAIS = (refInicial: string | null): CamposForm => ({
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  ponto_referencia: "",
  ref_code: refInicial ?? "",
  afiliada_id: "",
});

type CepStatus = "ocioso" | "carregando" | "ok" | "erro";

function validarCampos(
  campos: CamposForm,
  planoSlug: string | null,
  cepGenerico: boolean,
): Record<string, string> {
  const erros: Record<string, string> = {};

  if (!planoSlug) erros.plano = "Selecione um plano";

  if (campos.nome.trim().length < 2) erros.nome = "Informe o nome completo";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email.trim()))
    erros.email = "E-mail inválido";
  if (!validarCPF(campos.cpf)) erros.cpf = "CPF inválido";

  const telefone = apenasDigitos(campos.telefone);
  if (telefone.length < 10 || telefone.length > 11)
    erros.telefone = "Telefone inválido (DDD + número)";

  const cep = apenasDigitos(campos.cep);
  if (cep.length !== 8) erros.cep = "CEP deve ter 8 dígitos";
  else if (cepGenerico)
    erros.cep = "Esse CEP é o geral da cidade. Informe o CEP da sua rua";

  if (!campos.logradouro.trim()) erros.logradouro = "Informe o logradouro";
  if (!campos.numero.trim()) erros.numero = "Informe o número";
  if (!campos.bairro.trim()) erros.bairro = "Informe o bairro";
  if (!campos.cidade.trim()) erros.cidade = "Informe a cidade";
  if (!/^[A-Za-z]{2}$/.test(campos.uf.trim())) erros.uf = "UF inválida";

  return erros;
}

export function useFormAssinatura(
  planoInicial: string | null,
  refInicial: string | null,
) {
  const [planos, setPlanos] = useState<Plano[] | null>(null);
  const [planosErro, setPlanosErro] = useState<string | null>(null);
  const [planoSlug, setPlanoSlug] = useState<string | null>(planoInicial);
  // null = ainda não decidido pelo usuário; deriva do plano ser válido.
  // Definido explicitamente ao selecionar um plano ou clicar em "trocar plano".
  const [escolhaAbertaManual, setEscolhaAbertaManual] = useState<
    boolean | null
  >(null);

  const [afiliadas, setAfiliadas] = useState<Afiliada[]>([]);

  const [campos, setCampos] = useState<CamposForm>(() =>
    CAMPOS_INICIAIS(refInicial),
  );
  const [mostrarCampoIndicacao, setMostrarCampoIndicacao] = useState(
    Boolean(refInicial),
  );

  const [cepStatus, setCepStatus] = useState<CepStatus>("ocioso");
  const [cepMensagem, setCepMensagem] = useState<string | null>(null);
  const [cepGenerico, setCepGenerico] = useState(false);
  const [enderecoBloqueado, setEnderecoBloqueado] = useState(false);

  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Planos — nenhum preço fixo no código, tudo vem de /api/planos.
  useEffect(() => {
    let cancelado = false;

    fetch("/api/planos?ciclo=MONTHLY")
      .then((res) => {
        if (!res.ok) throw new Error("falha ao carregar planos");
        return res.json();
      })
      .then((data: { planos: Plano[] }) => {
        if (cancelado) return;
        // presente-edicao tem fluxo próprio, ainda não construído — não aparece aqui.
        const assinaveis = (data.planos ?? []).filter(
          (p) => p.tipo === "assinatura",
        );
        setPlanos(assinaveis);
      })
      .catch(() => {
        if (!cancelado) setPlanosErro("Não foi possível carregar os planos.");
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // Afiliadas — lista vazia significa que o campo não aparece.
  useEffect(() => {
    let cancelado = false;

    fetch("/api/afiliadas")
      .then((res) => (res.ok ? res.json() : { afiliadas: [] }))
      .then((data: { afiliadas: Afiliada[] }) => {
        if (!cancelado) setAfiliadas(data.afiliadas ?? []);
      })
      .catch(() => {
        if (!cancelado) setAfiliadas([]);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const planoSelecionado = useMemo(
    () => planos?.find((p) => p.slug === planoSlug) ?? null,
    [planos, planoSlug],
  );

  // Com plano válido vindo da URL, a escolha fica fechada por padrão; sem
  // plano válido, começa aberta. `escolhaAbertaManual` sobrepõe essa regra
  // assim que a pessoa clica em "trocar plano" ou escolhe um plano.
  const mostrarEscolhaPlanos = escolhaAbertaManual ?? !planoSelecionado;

  function limparErroChave(chave: string) {
    setErros((atual) => {
      if (!atual[chave]) return atual;
      const copia = { ...atual };
      delete copia[chave];
      return copia;
    });
  }

  function selecionarPlano(slug: string) {
    setPlanoSlug(slug);
    setEscolhaAbertaManual(false);
    limparErroChave("plano");
  }

  function alternarEscolhaPlanos() {
    setEscolhaAbertaManual(!mostrarEscolhaPlanos);
  }

  function alternarCampoIndicacao() {
    setMostrarCampoIndicacao((atual) => !atual);
  }

  function limparErroCampo(campo: keyof CamposForm) {
    limparErroChave(campo);
  }

  function atualizarCampo(campo: keyof CamposForm, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
    limparErroCampo(campo);
  }

  function atualizarCPF(valor: string) {
    atualizarCampo("cpf", formatarCPF(valor));
  }

  function atualizarTelefone(valor: string) {
    atualizarCampo("telefone", formatarTelefone(valor));
  }

  async function atualizarCEP(valor: string) {
    const formatado = formatarCEP(valor);
    setCampos((atual) => ({ ...atual, cep: formatado }));
    limparErroCampo("cep");
    setCepGenerico(false);

    const digitos = apenasDigitos(formatado);
    if (digitos.length < 8) {
      setCepStatus("ocioso");
      setCepMensagem(null);
      setEnderecoBloqueado(false);
      return;
    }

    setCepStatus("carregando");
    setCepMensagem(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await res.json();

      if (dados.erro) {
        setCepStatus("erro");
        setCepMensagem("CEP não encontrado");
        setEnderecoBloqueado(false);
        return;
      }

      if (!dados.logradouro) {
        // CEP genérico do município (final -000): o Asaas recusa na hora do
        // pagamento. Bloqueia aqui pra pessoa não descobrir só no fim do fluxo.
        setCepStatus("erro");
        setCepGenerico(true);
        setCepMensagem(
          "Esse CEP é o geral da cidade. Informe o CEP da sua rua",
        );
        setEnderecoBloqueado(false);
        return;
      }

      setCampos((atual) => ({
        ...atual,
        logradouro: dados.logradouro ?? "",
        bairro: dados.bairro ?? "",
        cidade: dados.localidade ?? "",
        uf: dados.uf ?? "",
      }));
      limparErroCampo("logradouro");
      limparErroCampo("bairro");
      limparErroCampo("cidade");
      limparErroCampo("uf");
      setCepStatus("ok");
      setCepMensagem(null);
      setEnderecoBloqueado(true);

      document.getElementById("numero")?.focus();
    } catch {
      setCepStatus("erro");
      setCepMensagem("Não foi possível consultar o CEP. Preencha manualmente.");
      setEnderecoBloqueado(false);
    }
  }

  function primeiroCampoComErro(erros: Record<string, string>): string | null {
    const ordem: (keyof CamposForm | "plano")[] = [
      "plano",
      "nome",
      "email",
      "cpf",
      "telefone",
      "cep",
      "logradouro",
      "numero",
      "bairro",
      "cidade",
      "uf",
    ];
    return ordem.find((campo) => erros[campo]) ?? null;
  }

  function rolarAteCampo(campo: string) {
    const el = document.getElementById(campo);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  }

  async function enviar() {
    if (enviando) return;

    // Usa o plano já casado com a lista carregada — se o slug da URL não
    // bater com nenhum plano ativo, planoSelecionado é null e cai no erro.
    const planoEfetivo = planoSelecionado?.slug ?? null;

    const errosValidacao = validarCampos(campos, planoEfetivo, cepGenerico);
    if (Object.keys(errosValidacao).length > 0) {
      setErros(errosValidacao);
      const primeiro = primeiroCampoComErro(errosValidacao);
      if (primeiro) rolarAteCampo(primeiro);
      return;
    }

    setErros({});
    setErroGeral(null);
    setEnviando(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plano: planoEfetivo,
          nome: campos.nome.trim(),
          email: campos.email.trim(),
          cpf: apenasDigitos(campos.cpf),
          telefone: apenasDigitos(campos.telefone),
          cep: apenasDigitos(campos.cep),
          logradouro: campos.logradouro.trim(),
          numero: campos.numero.trim(),
          complemento: campos.complemento.trim() || undefined,
          bairro: campos.bairro.trim(),
          cidade: campos.cidade.trim(),
          uf: campos.uf.trim().toUpperCase(),
          pais: "BR",
          ponto_referencia: campos.ponto_referencia.trim() || undefined,
          ref_code: campos.ref_code.trim() || undefined,
          afiliada_id: campos.afiliada_id || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = data.url;
        return;
      }

      if (res.status === 400 && data.campos) {
        setErros(data.campos);
        const primeiro = primeiroCampoComErro(data.campos);
        if (primeiro) rolarAteCampo(primeiro);
        setEnviando(false);
        return;
      }

      setErroGeral(
        data.error ?? "Não foi possível continuar. Tente de novo em instantes.",
      );
      setEnviando(false);
    } catch {
      setErroGeral(
        "Falha de conexão. Confira sua internet e tente de novo.",
      );
      setEnviando(false);
    }
  }

  return {
    planos,
    planosErro,
    planoSlug,
    planoSelecionado,
    mostrarEscolhaPlanos,
    selecionarPlano,
    alternarEscolhaPlanos,

    afiliadas,

    campos,
    atualizarCampo,
    atualizarCPF,
    atualizarTelefone,
    atualizarCEP,

    mostrarCampoIndicacao,
    alternarCampoIndicacao,

    cepStatus,
    cepMensagem,
    enderecoBloqueado,

    erros,
    erroGeral,
    enviando,
    enviar,
  };
}
