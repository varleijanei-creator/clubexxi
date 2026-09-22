"use client";

import { useEffect, useMemo, useState } from "react";
import { AsYouType, type CountryCode } from "libphonenumber-js";

import { formatarValor } from "@/lib/formatacao";
import { PAIS_PADRAO } from "@/lib/paises";
import { createClient } from "@/lib/supabase/client";
import { validarTelefone } from "@/lib/telefone";
import {
  apenasDigitos,
  formatarCEP,
  formatarCPF,
  formatarTelefone,
  validarCPF,
} from "@/lib/validacao";

export { formatarValor };

export type AfiliadoMenu = { nome: string; codigo: string };

// Select único: afiliada usa um valor composto "afiliado:<codigo>" pra
// distinguir qual delas foi escolhida sem precisar de um segundo campo de
// estado. selecionarOrigem() decodifica isso pra origem + afiliado_codigo.
const PREFIXO_AFILIADO = "afiliado:";
export function opcaoAfiliado(codigo: string): string {
  return `${PREFIXO_AFILIADO}${codigo}`;
}

export const OPCOES_ORIGEM_INICIO: { value: string; label: string }[] = [
  { value: "vitor-hugo", label: "Vitor Hugo" },
  { value: "varlei-giannei", label: "Varlei Giannei" },
];

export const OPCOES_ORIGEM_FIM: { value: string; label: string }[] = [
  { value: "assinante", label: "Uma amiga assinante me indicou" },
  { value: "instagram", label: "Instagram @clubexxi" },
  { value: "outro", label: "Outro" },
];

export type CodigoIndicacaoStatus = "ocioso" | "verificando" | "ok" | "erro";

export type Plano = {
  slug: string;
  nome: string;
  tipo: string;
  valor: number;
  ciclo: string;
  meses: number;
  familia: string | null;
  ordem: number;
  descricao: string | null;
};

export type FormaPagamento = "CREDIT_CARD" | "PIX";

export type UpsellInfo = {
  mensal: Plano;
  trimestral: Plano;
};

/** Preço do plano formatado conforme o ciclo — nunca o valor trimestral sozinho. */
export function formatarPrecoCiclo(ciclo: string, valor: number): string {
  if (ciclo === "trimestral") return `${formatarValor(valor)} a cada 3 meses`;
  return `${formatarValor(valor)}/mês`;
}

export type CamposForm = {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  paisTelefone: string;
  pais: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  ponto_referencia: string;
  ref_code: string;
  afiliado_codigo: string;
  origem: string;
  origem_detalhe: string;
};

const CAMPOS_INICIAIS = (
  refInicial: string | null,
  afInicial: string | null,
): CamposForm => ({
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  paisTelefone: PAIS_PADRAO,
  pais: PAIS_PADRAO,
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  ponto_referencia: "",
  ref_code: refInicial ?? "",
  afiliado_codigo: afInicial ?? "",
  // Vinda por ?af=, a origem já é conhecida e o menu nem aparece (regra do
  // afiliado tem prioridade sobre ref, igual já é hoje no servidor). Vinda
  // por ?ref=, a origem só é decidida depois de validar o código (efeito
  // abaixo) — por isso começa vazia mesmo com refInicial preenchido.
  origem: afInicial ? "afiliado" : "",
  origem_detalhe: "",
});

type CepStatus = "ocioso" | "carregando" | "ok" | "erro";

function validarCampos(
  campos: CamposForm,
  planoSlug: string | null,
  bairroObrigatorio: boolean,
  codigoIndicacaoInvalido: boolean,
): Record<string, string> {
  const erros: Record<string, string> = {};

  if (!planoSlug) erros.plano = "Selecione um plano";

  if (campos.nome.trim().length < 2) erros.nome = "Informe o nome completo";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email.trim()))
    erros.email = "E-mail inválido";

  if (!campos.origem) erros.origem = "Selecione uma opção";
  if (campos.origem === "assinante") {
    if (!campos.ref_code.trim())
      erros.ref_code = "Coloca o código de quem te indicou 🍑";
    else if (codigoIndicacaoInvalido)
      erros.ref_code = "Código de indicação inválido";
  }

  if (!validarCPF(campos.cpf)) erros.cpf = "CPF inválido";

  if (!validarTelefone(campos.telefone, campos.paisTelefone).valido)
    erros.telefone = "Telefone inválido";

  const ehBrasil = campos.pais === "BR";

  if (ehBrasil) {
    const cep = apenasDigitos(campos.cep);
    if (cep.length !== 8) erros.cep = "CEP deve ter 8 dígitos";
  } else {
    const cep = campos.cep.trim();
    if (cep.length < 3 || cep.length > 12)
      erros.cep = "Código postal deve ter de 3 a 12 caracteres";
  }

  if (!campos.logradouro.trim()) erros.logradouro = "Informe o logradouro";
  if (!campos.numero.trim()) erros.numero = "Informe o número";
  // Bairro só é obrigatório quando veio confiável da consulta de CEP — em
  // cidade com CEP único (sem bairro no ViaCEP) ou endereço internacional,
  // fica opcional (coluna enderecos.bairro aceita null).
  if (bairroObrigatorio && !campos.bairro.trim())
    erros.bairro = "Informe o bairro";
  if (!campos.cidade.trim()) erros.cidade = "Informe a cidade";

  if (ehBrasil) {
    if (!/^[A-Za-z]{2}$/.test(campos.uf.trim())) erros.uf = "UF inválida";
  } else if (!campos.uf.trim()) {
    erros.uf = "Informe o estado ou região";
  }

  return erros;
}

export function useFormAssinatura(
  planoInicial: string | null,
  refInicial: string | null,
  afInicial: string | null,
) {
  const [planos, setPlanos] = useState<Plano[] | null>(null);
  const [planosErro, setPlanosErro] = useState<string | null>(null);
  const [planoSlug, setPlanoSlug] = useState<string | null>(planoInicial);
  // null = ainda não decidido pelo usuário; deriva do plano ser válido.
  // Definido explicitamente ao selecionar um plano ou clicar em "trocar plano".
  const [escolhaAbertaManual, setEscolhaAbertaManual] = useState<
    boolean | null
  >(null);
  const [upsellPendente, setUpsellPendente] = useState<UpsellInfo | null>(
    null,
  );

  // Cartão pré-selecionado por padrão (spec-seletor-pagamento.md) — não reseta
  // ao trocar de plano, então a escolha da pessoa se mantém entre mensal e
  // trimestral.
  const [formaPagamento, setFormaPagamento] =
    useState<FormaPagamento>("CREDIT_CARD");

  const [campos, setCampos] = useState<CamposForm>(() =>
    CAMPOS_INICIAIS(refInicial, afInicial),
  );

  const [afiliadosMenu, setAfiliadosMenu] = useState<AfiliadoMenu[]>([]);

  // "afiliado" (?af=) tem prioridade sobre "ref" — mesma regra do servidor
  // (spec-link-afiliada.md). Só verifica o ref quando não veio afiliado.
  const [refCheckStatus, setRefCheckStatus] = useState<
    "pulado" | "verificando" | "valido" | "invalido"
  >(afInicial ? "pulado" : refInicial ? "verificando" : "pulado");

  const [codigoIndicacaoStatus, setCodigoIndicacaoStatus] =
    useState<CodigoIndicacaoStatus>("ocioso");
  const [codigoIndicacaoNome, setCodigoIndicacaoNome] = useState<
    string | null
  >(null);

  const [cepStatus, setCepStatus] = useState<CepStatus>("ocioso");
  const [cepMensagem, setCepMensagem] = useState<string | null>(null);
  // Aviso não-bloqueante (cidade com CEP único) — diferente de cepMensagem,
  // que é erro do campo CEP em si (não encontrado / falha de rede).
  const [enderecoAviso, setEnderecoAviso] = useState<string | null>(null);
  // Cada campo trava (readOnly) só quando a consulta de CEP devolveu um
  // valor confiável pra ele — diferente entre si porque CEP único devolve
  // cidade/UF mas pode vir sem logradouro e/ou bairro.
  const [logradouroBloqueado, setLogradouroBloqueado] = useState(false);
  const [bairroBloqueado, setBairroBloqueado] = useState(false);
  const [cidadeUfBloqueado, setCidadeUfBloqueado] = useState(false);
  // "Sem número": preenche e trava o campo com "S/N".
  const [semNumero, setSemNumero] = useState(false);

  // Enquanto a pessoa não mexer no país do endereço, ele segue sugerido pelo
  // país do telefone (mesmo os dois campos sendo independentes). No momento
  // em que ela troca o país do endereço na mão, a sugestão para de valer.
  const [enderecoPaisManual, setEnderecoPaisManual] = useState(false);

  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const ehBrasil = campos.pais === "BR";

  // Planos — nenhum preço fixo no código, tudo vem de /api/planos.
  useEffect(() => {
    let cancelado = false;

    fetch("/api/planos")
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

  // Menu "Como você ficou sabendo": lista de afiliadas ativas, via RPC (anon
  // key). Se falhar, o menu aparece do mesmo jeito, só sem elas.
  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("listar_afiliados_menu");
        if (cancelado || error || !data) return;
        const lista = data as AfiliadoMenu[];
        setAfiliadosMenu(
          [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
        );
      } catch {
        /* menu aparece sem afiliadas */
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  // ?ref= na URL: valida contra o banco assim que a página carrega. Código
  // válido trava a origem em "assinante" e esconde o menu; inválido, ignora
  // o ref e mostra o menu normal — como se não tivesse link.
  useEffect(() => {
    if (afInicial || !refInicial) return;
    let cancelado = false;

    async function verificar() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc(
          "validar_codigo_indicacao",
          { p_codigo: refInicial },
        );
        if (cancelado) return;
        const nome = !error && typeof data === "string" ? data : null;
        if (nome) {
          setCodigoIndicacaoStatus("ok");
          setCodigoIndicacaoNome(nome);
          setRefCheckStatus("valido");
          setCampos((atual) => ({ ...atual, origem: "assinante" }));
        } else {
          setCampos((atual) => ({ ...atual, ref_code: "" }));
          setRefCheckStatus("invalido");
        }
      } catch {
        if (cancelado) return;
        setCampos((atual) => ({ ...atual, ref_code: "" }));
        setRefCheckStatus("invalido");
      }
    }

    verificar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Menu escondido: por ?af= (afiliado tem prioridade) ou por ?ref= já
  // validado como assinante. Enquanto o ref inicial ainda está sendo
  // verificado, também fica escondido — evita mostrar e esconder de novo.
  const mostrarMenuOrigem =
    !afInicial && refCheckStatus !== "valido" && refCheckStatus !== "verificando";

  const origemSelecionada =
    campos.origem === "afiliado"
      ? opcaoAfiliado(campos.afiliado_codigo)
      : campos.origem;

  // Nome pra mostrar "você está entrando pela indicação de X" quando ?af=
  // bate com uma afiliada de afiliadosMenu — que já só lista afiliadas
  // ativas (RPC listar_afiliados_menu), então código inexistente ou de
  // afiliada inativa cai em null aqui sem precisar de checagem extra.
  const afiliadaIndicadora = useMemo(
    () => (afInicial ? (afiliadosMenu.find((a) => a.codigo === afInicial) ?? null) : null),
    [afInicial, afiliadosMenu],
  );

  const planoSelecionado = useMemo(
    () => planos?.find((p) => p.slug === planoSlug) ?? null,
    [planos, planoSlug],
  );

  // Listagem mostra só os mensais, ordenados por `ordem` — Pêssego já é
  // ordem 1 no banco, então destacar o primeiro do array já resolve sem
  // fixar o slug "pessego" no código.
  const planosMensais = useMemo(
    () =>
      planos
        ? planos
            .filter((p) => p.ciclo === "mensal")
            .sort((a, b) => a.ordem - b.ordem)
        : null,
    [planos],
  );

  // Com plano válido vindo da URL, a escolha fica fechada por padrão; sem
  // plano válido, começa aberta. `escolhaAbertaManual` sobrepõe essa regra
  // assim que a pessoa clica em "trocar plano" ou escolhe um plano.
  const mostrarEscolhaPlanos = escolhaAbertaManual ?? !planoSelecionado;

  // Trimestral da mesma família, pro upsell — nunca de outra família.
  const trimestralPorFamilia = useMemo(() => {
    const mapa = new Map<string, Plano>();
    (planos ?? []).forEach((p) => {
      if (p.ciclo === "trimestral" && p.familia) mapa.set(p.familia, p);
    });
    return mapa;
  }, [planos]);

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

  /**
   * Clique no CTA de um plano mensal. Se a família tiver trimestral ativo,
   * abre o upsell antes de seguir; senão, seleciona direto (comportamento
   * de sempre).
   */
  function escolherPlano(slugMensal: string) {
    const mensal = planos?.find((p) => p.slug === slugMensal);
    const trimestral = mensal?.familia
      ? trimestralPorFamilia.get(mensal.familia)
      : undefined;

    if (mensal && trimestral) {
      setUpsellPendente({ mensal, trimestral });
      return;
    }

    selecionarPlano(slugMensal);
  }

  function confirmarUpsell(escolheuTrimestral: boolean) {
    if (!upsellPendente) return;
    selecionarPlano(
      escolheuTrimestral
        ? upsellPendente.trimestral.slug
        : upsellPendente.mensal.slug,
    );
    setUpsellPendente(null);
  }

  function alternarEscolhaPlanos() {
    setEscolhaAbertaManual(!mostrarEscolhaPlanos);
  }

  /** Troca a opção do menu "Como você ficou sabendo". `valor` já vem no
   * formato do <select> — "afiliado:<codigo>" pras afiliadas, texto puro
   * pras demais opções. Fora de "assinante" o código de indicação some e
   * zera (regra: nas outras opções o campo fica escondido e vazio). */
  function selecionarOrigem(valor: string) {
    const ehAfiliado = valor.startsWith(PREFIXO_AFILIADO);
    const origem = ehAfiliado ? "afiliado" : valor;
    const codigoAfiliado = ehAfiliado
      ? valor.slice(PREFIXO_AFILIADO.length)
      : "";

    setCampos((atual) => ({
      ...atual,
      origem,
      afiliado_codigo: codigoAfiliado,
      ref_code: origem === "assinante" ? atual.ref_code : "",
    }));
    limparErroChave("origem");

    if (origem !== "assinante") {
      setCodigoIndicacaoStatus("ocioso");
      setCodigoIndicacaoNome(null);
      limparErroChave("ref_code");
    }
  }

  /** Chamada no blur do campo de código de indicação (RPC, anon key). */
  async function validarCodigoIndicacao(codigo: string) {
    const valor = codigo.trim();
    if (!valor) {
      setCodigoIndicacaoStatus("ocioso");
      setCodigoIndicacaoNome(null);
      return;
    }

    setCodigoIndicacaoStatus("verificando");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("validar_codigo_indicacao", {
        p_codigo: valor,
      });
      const nome = !error && typeof data === "string" ? data : null;
      if (nome) {
        setCodigoIndicacaoStatus("ok");
        setCodigoIndicacaoNome(nome);
        limparErroChave("ref_code");
      } else {
        setCodigoIndicacaoStatus("erro");
        setCodigoIndicacaoNome(null);
      }
    } catch {
      setCodigoIndicacaoStatus("erro");
      setCodigoIndicacaoNome(null);
    }
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
    if (campos.paisTelefone === "BR") {
      atualizarCampo("telefone", formatarTelefone(valor));
      return;
    }
    atualizarCampo(
      "telefone",
      new AsYouType(campos.paisTelefone as CountryCode).input(valor),
    );
  }

  // Só o efeito colateral de trocar o país do endereço (reset do estado de
  // CEP/UF, que só vale pro Brasil). Compartilhado entre a troca manual
  // (atualizarPais) e a sugestão automática vinda do país do telefone.
  function aplicarPaisEndereco(codigo: string) {
    atualizarCampo("pais", codigo);
    setCepStatus("ocioso");
    setCepMensagem(null);
    setEnderecoAviso(null);
    setLogradouroBloqueado(false);
    setBairroBloqueado(false);
    setCidadeUfBloqueado(false);
    limparErroChave("cep");
    limparErroChave("uf");
  }

  function atualizarPaisTelefone(codigo: string) {
    atualizarCampo("paisTelefone", codigo);
    atualizarCampo("telefone", "");
    // Sugestão, não vínculo: só ajusta o país do endereço enquanto a pessoa
    // não tiver escolhido um na mão.
    if (!enderecoPaisManual) aplicarPaisEndereco(codigo);
  }

  function atualizarPais(codigo: string) {
    setEnderecoPaisManual(true);
    aplicarPaisEndereco(codigo);
  }

  function atualizarUf(valor: string) {
    atualizarCampo("uf", ehBrasil ? valor.toUpperCase() : valor);
  }

  async function atualizarCEP(valor: string) {
    if (!ehBrasil) {
      // Código postal de fora do Brasil: texto livre, sem busca automática.
      atualizarCampo("cep", valor.slice(0, 12));
      return;
    }

    const formatado = formatarCEP(valor);
    setCampos((atual) => ({ ...atual, cep: formatado }));
    limparErroCampo("cep");
    setEnderecoAviso(null);

    const digitos = apenasDigitos(formatado);
    if (digitos.length < 8) {
      setCepStatus("ocioso");
      setCepMensagem(null);
      setLogradouroBloqueado(false);
      setBairroBloqueado(false);
      setCidadeUfBloqueado(false);
      return;
    }

    setCepStatus("carregando");
    setCepMensagem(null);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const dados = await res.json();

      if (dados.erro) {
        // CEP não encontrado: nunca trava — libera tudo pra digitação manual.
        setCepStatus("erro");
        setCepMensagem("CEP não encontrado. Preencha o endereço manualmente.");
        setLogradouroBloqueado(false);
        setBairroBloqueado(false);
        setCidadeUfBloqueado(false);
        return;
      }

      // Cidade com CEP único (geral do município) devolve localidade/uf mas
      // pode vir sem logradouro e/ou bairro — cada campo trava só quando a
      // consulta realmente devolveu valor pra ele. Cidade/UF sempre vêm,
      // mesmo nesse caso, e por isso sempre são aplicadas (diferente de
      // antes, que pulava esse preenchimento inteiro quando faltava rua).
      const temLogradouro = Boolean(dados.logradouro);
      const temBairro = Boolean(dados.bairro);

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

      setLogradouroBloqueado(temLogradouro);
      setBairroBloqueado(temBairro);
      setCidadeUfBloqueado(Boolean(dados.localidade));

      setCepStatus("ok");
      setCepMensagem(null);
      setEnderecoAviso(
        !temLogradouro || !temBairro
          ? "Sua cidade usa um CEP único. Preencha a rua e o bairro."
          : null,
      );

      document.getElementById(temLogradouro ? "numero" : "logradouro")?.focus();
    } catch {
      setCepStatus("erro");
      setCepMensagem("Não foi possível consultar o CEP. Preencha manualmente.");
      setLogradouroBloqueado(false);
      setBairroBloqueado(false);
      setCidadeUfBloqueado(false);
    }
  }

  function alternarSemNumero() {
    setSemNumero((atual) => {
      const novo = !atual;
      atualizarCampo("numero", novo ? "S/N" : "");
      return novo;
    });
  }

  function primeiroCampoComErro(erros: Record<string, string>): string | null {
    const ordem: (keyof CamposForm | "plano")[] = [
      "plano",
      "nome",
      "email",
      "origem",
      "ref_code",
      "cpf",
      "telefone",
      "pais",
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

    const errosValidacao = validarCampos(
      campos,
      planoEfetivo,
      bairroBloqueado,
      codigoIndicacaoStatus === "erro",
    );
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
          pais_telefone: campos.paisTelefone,
          cep: ehBrasil ? apenasDigitos(campos.cep) : campos.cep.trim(),
          logradouro: campos.logradouro.trim(),
          numero: campos.numero.trim(),
          complemento: campos.complemento.trim() || undefined,
          bairro: campos.bairro.trim() || undefined,
          cidade: campos.cidade.trim(),
          uf: ehBrasil ? campos.uf.trim().toUpperCase() : campos.uf.trim(),
          pais: campos.pais,
          ponto_referencia: campos.ponto_referencia.trim() || undefined,
          ref_code: campos.ref_code.trim() || undefined,
          afiliado_codigo: campos.afiliado_codigo.trim() || undefined,
          origem: campos.origem || undefined,
          origem_detalhe:
            campos.origem === "outro"
              ? campos.origem_detalhe.trim() || undefined
              : undefined,
          forma_pagamento: formaPagamento,
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
    planosMensais,
    planosErro,
    planoSlug,
    planoSelecionado,
    mostrarEscolhaPlanos,
    selecionarPlano,
    escolherPlano,
    alternarEscolhaPlanos,

    upsellPendente,
    confirmarUpsell,

    formaPagamento,
    selecionarFormaPagamento: setFormaPagamento,

    campos,
    ehBrasil,
    atualizarCampo,
    atualizarCPF,
    atualizarTelefone,
    atualizarPaisTelefone,
    atualizarPais,
    atualizarUf,
    atualizarCEP,
    alternarSemNumero,
    semNumero,

    afiliadosMenu,
    afiliadaIndicadora,
    mostrarMenuOrigem,
    origemSelecionada,
    selecionarOrigem,
    codigoIndicacaoStatus,
    codigoIndicacaoNome,
    validarCodigoIndicacao,

    cepStatus,
    cepMensagem,
    enderecoAviso,
    logradouroBloqueado,
    bairroBloqueado,
    cidadeUfBloqueado,

    erros,
    erroGeral,
    enviando,
    enviar,
  };
}
