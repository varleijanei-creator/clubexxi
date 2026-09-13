"use client";

import { useEffect, useMemo, useState } from "react";

import { formatarValor } from "@/lib/formatacao";
import { PAIS_PADRAO } from "@/lib/paises";
import { ACRESCIMO_INTERNACIONAL } from "@/lib/precos";
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
  meses: number;
  familia: string | null;
  ordem: number;
  descricao: string | null;
};

export type Afiliada = {
  id: string;
  nome: string;
};

export type UpsellInfo = {
  mensal: Plano;
  trimestral: Plano;
  valorMensalEquivalente: number;
  economia: number;
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
  afiliada_id: string;
};

const CAMPOS_INICIAIS = (refInicial: string | null): CamposForm => ({
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
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

  const ehBrasil = campos.pais === "BR";

  if (ehBrasil) {
    const cep = apenasDigitos(campos.cep);
    if (cep.length !== 8) erros.cep = "CEP deve ter 8 dígitos";
    else if (cepGenerico)
      erros.cep = "Esse CEP é o geral da cidade. Informe o CEP da sua rua";
  } else {
    const cep = campos.cep.trim();
    if (cep.length < 3 || cep.length > 12)
      erros.cep = "Código postal deve ter de 3 a 12 caracteres";
  }

  if (!campos.logradouro.trim()) erros.logradouro = "Informe o logradouro";
  if (!campos.numero.trim()) erros.numero = "Informe o número";
  if (!campos.bairro.trim()) erros.bairro = "Informe o bairro";
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

  // Reage a troca de país automaticamente, já que `ehBrasil` vem de
  // `campos.pais`. Mesma constante que o servidor usa pra cobrar de verdade.
  const acrescimoInternacional = ehBrasil ? 0 : ACRESCIMO_INTERNACIONAL;
  const valorComAcrescimo = planoSelecionado
    ? planoSelecionado.valor + acrescimoInternacional
    : null;

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
      setUpsellPendente({
        mensal,
        trimestral,
        valorMensalEquivalente: trimestral.valor / 3,
        economia: mensal.valor * 3 - trimestral.valor,
      });
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

  function atualizarPais(codigo: string) {
    atualizarCampo("pais", codigo);
    // A busca automática e o formato de CEP/UF só valem pro Brasil — troca
    // de país zera esse estado pra não ficar preso a uma regra que não vale
    // mais.
    setCepStatus("ocioso");
    setCepMensagem(null);
    setCepGenerico(false);
    setEnderecoBloqueado(false);
    limparErroChave("cep");
    limparErroChave("uf");
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
          cep: ehBrasil ? apenasDigitos(campos.cep) : campos.cep.trim(),
          logradouro: campos.logradouro.trim(),
          numero: campos.numero.trim(),
          complemento: campos.complemento.trim() || undefined,
          bairro: campos.bairro.trim(),
          cidade: campos.cidade.trim(),
          uf: ehBrasil ? campos.uf.trim().toUpperCase() : campos.uf.trim(),
          pais: campos.pais,
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
    planosMensais,
    planosErro,
    planoSlug,
    planoSelecionado,
    acrescimoInternacional,
    valorComAcrescimo,
    mostrarEscolhaPlanos,
    selecionarPlano,
    escolherPlano,
    alternarEscolhaPlanos,

    upsellPendente,
    confirmarUpsell,

    afiliadas,

    campos,
    ehBrasil,
    atualizarCampo,
    atualizarCPF,
    atualizarTelefone,
    atualizarPais,
    atualizarUf,
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
