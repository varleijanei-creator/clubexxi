import { NextResponse } from "next/server";

import {
  AsaasError,
  buscarClientePorCpf,
  criarAssinatura,
  criarCheckout,
  criarCliente,
  listarCobrancasAssinatura,
} from "@/lib/asaas";
import { calcularAcrescimoInternacional } from "@/lib/precos";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Asaas só aceita CREDIT_CARD quando chargeTypes = RECURRENT (PIX exigiria
// chargeType DETACHED, que não renova). Bate com a decisão do projeto:
// "cartão é o padrão, só cartão renova sozinho".
const BILLING_TYPES = ["CREDIT_CARD"];

// Pix recorrente não passa pelo checkout hospedado — é assinatura criada
// direto pela API (ver spec-rota-pix.md). "CREDIT_CARD" aqui é o caminho
// já existente, inalterado.
const FORMAS_PAGAMENTO = ["CREDIT_CARD", "PIX"] as const;
type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

// Bate com o check da coluna `pedidos.origem`. Valor fora dessa lista vira
// null — nunca recusa o pedido por causa de "como você ficou sabendo".
const ORIGENS_VALIDAS = new Set([
  "vitor-hugo",
  "varlei-giannei",
  "afiliado",
  "assinante",
  "instagram",
  "outro",
]);

// -------------------------------------------------------------------------
// Validação da entrada
// -------------------------------------------------------------------------

type Pessoais = {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
};

type Endereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
  ponto_referencia: string | null;
};

type EntradaValida = {
  plano: string;
  pessoais: Pessoais;
  endereco: Endereco;
  refCode: string | null;
  afiliadoCodigo: string | null;
  origem: string | null;
  origemDetalhe: string | null;
};

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const digitos = (v: unknown): string => texto(v).replace(/\D/g, "");

function validarEntrada(
  corpo: unknown,
): { dados: EntradaValida } | { erros: Record<string, string> } {
  const erros: Record<string, string> = {};
  // Corpo plano, com os nomes de campo do CLAUDE.md. Sem objetos aninhados.
  const b = (corpo ?? {}) as Record<string, unknown>;

  const plano = texto(b.plano);
  if (!plano) erros.plano = "Selecione um plano";

  const nome = texto(b.nome);
  const email = texto(b.email).toLowerCase();
  const cpf = digitos(b.cpf);
  const telefone = digitos(b.telefone);

  if (nome.length < 2) erros.nome = "Informe o nome completo";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email = "E-mail inválido";
  if (cpf.length !== 11) erros.cpf = "CPF deve ter 11 dígitos";
  if (telefone.length < 10 || telefone.length > 11)
    erros.telefone = "Telefone inválido (DDD + número)";

  // País: BR mantém as regras brasileiras (CEP de 8 dígitos, UF de 2 letras);
  // qualquer outro país vira texto livre pro CEP/UF, já que não tem como
  // validar formato de endereço de fora do Brasil aqui.
  const pais = (texto(b.pais) || "BR").toUpperCase();
  if (!/^[A-Z]{2}$/.test(pais)) erros.pais = "País inválido";
  const ehBrasil = pais === "BR";

  const cep = ehBrasil ? digitos(b.cep) : texto(b.cep);
  const logradouro = texto(b.logradouro);
  const numero = texto(b.numero);
  const bairro = texto(b.bairro);
  const cidade = texto(b.cidade);
  const uf = ehBrasil ? texto(b.uf).toUpperCase() : texto(b.uf);

  if (ehBrasil) {
    if (cep.length !== 8) erros.cep = "CEP deve ter 8 dígitos";
  } else if (cep.length < 3 || cep.length > 12) {
    erros.cep = "Código postal deve ter de 3 a 12 caracteres";
  }
  if (!logradouro) erros.logradouro = "Informe o logradouro";
  if (!numero) erros.numero = "Informe o número";
  if (!bairro) erros.bairro = "Informe o bairro";
  if (!cidade) erros.cidade = "Informe a cidade";
  if (ehBrasil) {
    if (!/^[A-Z]{2}$/.test(uf)) erros.uf = "UF inválida";
  } else if (!uf) {
    erros.uf = "Informe o estado ou região";
  }

  const refCode = texto(b.ref_code) || null;
  if (refCode && refCode.length > 40)
    erros.ref_code = "Código de indicação inválido";

  // Vem da URL (?af=), então é entrada não confiável. Sem formato esperado
  // além de um limite de tamanho — o cruzamento com a tabela `afiliados`
  // (existe/ativo) acontece depois, com consulta parametrizada, e um código
  // que não bate é ignorado em silêncio, não rejeitado aqui.
  const afiliadoCodigo = texto(b.afiliado_codigo) || null;
  if (afiliadoCodigo && afiliadoCodigo.length > 40)
    erros.afiliado_codigo = "Código de afiliada inválido";

  // Valor fora da lista aceita vira null em vez de recusar o pedido — "como
  // você ficou sabendo" não é motivo pra travar uma venda.
  const origemBruta = texto(b.origem);
  const origem = ORIGENS_VALIDAS.has(origemBruta) ? origemBruta : null;
  // Só faz sentido junto de "outro"; nas demais opções o campo nem aparece
  // no formulário, então um valor vindo de fora daí é ignorado.
  const origemDetalhe =
    origem === "outro" ? texto(b.origem_detalhe) || null : null;

  if (Object.keys(erros).length > 0) return { erros };

  return {
    dados: {
      plano,
      pessoais: { nome, email, cpf, telefone },
      endereco: {
        cep,
        logradouro,
        numero,
        complemento: texto(b.complemento) || null,
        bairro,
        cidade,
        uf,
        pais,
        ponto_referencia: texto(b.ponto_referencia) || null,
      },
      refCode,
      afiliadoCodigo,
      origem,
      origemDetalhe,
    },
  };
}

// -------------------------------------------------------------------------
// Auxiliares
// -------------------------------------------------------------------------

/** Base pública do site, para montar as URLs de callback do Asaas. */
function siteUrl(request: Request): string {
  const doEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (doEnv) return doEnv.replace(/\/$/, "");

  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;

  return new URL(request.url).origin;
}

/**
 * CEP para customerData.postalCode do POST /v3/checkouts: 8 dígitos limpos,
 * sem máscara. O schema mostra "01310-000" só como exemplo visual do campo,
 * mas os exemplos de request do Asaas usam a forma sem hífen ("01310000",
 * "89000000") — e a máscara foi recusada em teste. Já chega aqui com 8 dígitos
 * (validação usa digitos()); esta função é a garantia na borda da chamada.
 */
function cepAsaas(cep: string): string {
  return cep.replace(/\D/g, "");
}

/**
 * CEP fixo (Av. Paulista) usado no cadastro do cliente no Asaas quando o
 * endereço de entrega é fora do Brasil. Testado direto no sandbox: postalCode
 * é obrigatório em customerData e é validado contra a base real dos Correios
 * — nem um CEP de 8 dígitos inventado passa ("O campo postalCode é
 * inválido"), e não existe campo de país. `city` enviado à parte também é
 * ignorado (Asaas sempre deriva a cidade a partir do postalCode). Não tem
 * como representar um endereço internacional de verdade nesse campo; o
 * endereço real de entrega continua correto em pedidos.dados_json/enderecos,
 * que é o que importa pra remessa da carta. Sem efeito em nota fiscal — está
 * desligada (config_fiscal.ativo = false).
 */
const CEP_ASAAS_INTERNACIONAL = "01310100";

/**
 * Primeiro vencimento da assinatura: hoje, no fuso America/Sao_Paulo
 * (YYYY-MM-DD). Não usar a data UTC do servidor — depois das 21h ela já
 * virou o dia seguinte no Brasil, o que empurrava a primeira cobrança pra
 * amanhã.
 */
function proximoVencimento(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `invoiceUrl` foi CONFIRMADO em execução real contra o sandbox (13/09/2026):
 * é o campo com a URL da fatura hospedada no retorno de
 * GET /v3/subscriptions/{id}/payments. Só é chamada depois que
 * `criarPedidoPix` já confirmou `billingType: "PIX"` na cobrança — os
 * fallbacks (`bankSlipUrl`/`transactionReceiptUrl`) são só por robustez a
 * variação de nome de campo, não pra tolerar cobrança em boleto.
 */
function extrairUrlFatura(cobranca: Record<string, unknown>): string | null {
  const candidatos = ["invoiceUrl", "bankSlipUrl", "transactionReceiptUrl"];
  for (const campo of candidatos) {
    const valor = cobranca[campo];
    if (typeof valor === "string" && valor) return valor;
  }
  return null;
}

/**
 * Erro em qualquer etapa do ramo Pix (2.2 a 2.4 da spec). Por spec, o pedido
 * fica órfão com status "iniciado" (pendente) — diferente do caminho de
 * cartão, aqui NÃO marcamos "cancelado", porque não ativou ninguém e pode
 * ser retomado depois. Sempre devolve 500, com a mensagem do Asaas quando
 * disponível.
 */
function falharPix(pedidoId: string, etapa: string, err: unknown) {
  if (err instanceof AsaasError) {
    console.error(`[checkout] Pix: Asaas recusou (${etapa})`, {
      pedidoId,
      message: err.message,
      detalhes: err.detalhes,
    });
  } else {
    console.error(`[checkout] Pix: erro inesperado (${etapa})`, {
      pedidoId,
      err,
    });
  }

  const mensagem =
    err instanceof AsaasError
      ? err.message
      : "Falha ao processar o pagamento via Pix. Tente de novo em instantes.";
  return NextResponse.json({ error: mensagem, pedidoId }, { status: 500 });
}

/**
 * Ramo Pix (spec-rota-pix.md §2): cliente + assinatura direto pela API do
 * Asaas, sem passar pelo checkout hospedado. O pedido já foi gravado antes
 * de chamar isso — `asaas_checkout_id` fica nulo nesse caminho, como
 * esperado pela spec.
 */
async function criarPedidoPix(params: {
  pedidoId: string;
  pessoais: Pessoais;
  endereco: Endereco;
  ehBrasil: boolean;
  planoNome: string;
  valor: number;
  cicloAsaas: "MONTHLY" | "QUARTERLY";
}) {
  const { pedidoId, pessoais, endereco, ehBrasil, planoNome, valor, cicloAsaas } =
    params;

  // 2.2) Cliente no Asaas — reaproveita se já existir pelo CPF.
  let clienteId: string;
  try {
    const existente = await buscarClientePorCpf(pessoais.cpf);
    if (existente) {
      clienteId = existente.id;
    } else {
      const criado = await criarCliente({
        name: pessoais.nome,
        email: pessoais.email,
        cpfCnpj: pessoais.cpf,
        phone: pessoais.telefone,
        address: endereco.logradouro,
        addressNumber: endereco.numero,
        complement: endereco.complemento ?? undefined,
        province: endereco.bairro,
        postalCode: ehBrasil ? cepAsaas(endereco.cep) : CEP_ASAAS_INTERNACIONAL,
      });
      clienteId = criado.id;
    }
  } catch (err) {
    return falharPix(pedidoId, "cliente", err);
  }

  // 2.3) Assinatura cobrada via Pix a cada ciclo. externalReference é o que
  // amarra a venda ao pedido no webhook.
  let assinaturaId: string;
  try {
    const assinatura = await criarAssinatura({
      customer: clienteId,
      billingType: "PIX",
      value: valor,
      nextDueDate: proximoVencimento(),
      cycle: cicloAsaas,
      description: `Clube 21 — ${planoNome}`,
      externalReference: pedidoId,
    });
    assinaturaId = assinatura.id;
  } catch (err) {
    return falharPix(pedidoId, "assinatura", err);
  }

  // 2.4) Primeira cobrança da assinatura, pra pegar o link da fatura Pix.
  // Retry curto se a listagem vier vazia (pequeno atraso na geração).
  let cobrancas: Record<string, unknown>[];
  try {
    cobrancas = await listarCobrancasAssinatura(assinaturaId);
    if (cobrancas.length === 0) {
      await aguardar(1000);
      cobrancas = await listarCobrancasAssinatura(assinaturaId);
    }
  } catch (err) {
    return falharPix(pedidoId, "cobranças", err);
  }

  const primeiraCobranca = cobrancas[0];
  if (!primeiraCobranca) {
    return falharPix(
      pedidoId,
      "cobranças",
      new AsaasError(
        "Não foi possível gerar a cobrança Pix. Tente de novo em instantes.",
        502,
      ),
    );
  }

  // Log da cobrança inteira: útil pra investigar qualquer anomalia (ver
  // trava de billingType logo abaixo).
  console.log(
    "[checkout] Pix: retorno de GET /subscriptions/{id}/payments",
    JSON.stringify(primeiraCobranca),
  );

  // Trava: já vimos essa mesma chamada devolver billingType "BOLETO" pra uma
  // assinatura criada com "PIX" (1 em 9 tentativas em teste, sem causa
  // identificada — ver conversa). Entregar um boleto pra quem escolheu Pix é
  // pior que mostrar erro, então falha explicitamente em vez de devolver a
  // URL da fatura errada.
  if (primeiraCobranca.billingType !== "PIX") {
    console.error(
      "[checkout] Pix: cobrança veio com billingType diferente de PIX — retorno completo acima",
      { pedidoId, assinaturaId, billingType: primeiraCobranca.billingType },
    );
    return falharPix(
      pedidoId,
      "cobranças",
      new AsaasError(
        "Não foi possível gerar a cobrança em Pix. Tente de novo em instantes.",
        502,
      ),
    );
  }

  const urlFatura = extrairUrlFatura(primeiraCobranca);
  if (!urlFatura) {
    console.error(
      "[checkout] Pix: nenhum campo de URL reconhecido na cobrança (inesperado — invoiceUrl é confirmado) — ver campos no log acima",
      { pedidoId, assinaturaId, camposDisponiveis: Object.keys(primeiraCobranca) },
    );
    return falharPix(
      pedidoId,
      "cobranças",
      new AsaasError("Não foi possível obter o link de pagamento Pix.", 502),
    );
  }

  return NextResponse.json({
    url: urlFatura,
    pedidoId,
    subscriptionId: assinaturaId,
  });
}

// -------------------------------------------------------------------------
// POST /api/checkout
// -------------------------------------------------------------------------

export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    console.error("[checkout] 400: corpo não é JSON válido");
    return NextResponse.json(
      { error: "Corpo da requisição inválido (JSON esperado)." },
      { status: 400 },
    );
  }

  const corpoObj = (corpo ?? {}) as Record<string, unknown>;
  const formaPagamento = (texto(corpoObj.forma_pagamento) ||
    "CREDIT_CARD") as FormaPagamento;
  if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
    return NextResponse.json(
      { error: "forma_pagamento inválida" },
      { status: 400 },
    );
  }

  const validado = validarEntrada(corpo);
  if ("erros" in validado) {
    const motivo = Object.entries(validado.erros)
      .map(([campo, msg]) => `${campo}: ${msg}`)
      .join("; ");
    console.error(
      `[checkout] 400 validação falhou -> ${motivo} | chaves recebidas no corpo: ${
        Object.keys((corpo ?? {}) as Record<string, unknown>).join(", ") || "(nenhuma)"
      }`,
    );
    return NextResponse.json(
      { error: "Confira os campos do formulário.", campos: validado.erros },
      { status: 400 },
    );
  }
  const { plano, pessoais, endereco, refCode, afiliadoCodigo, origem, origemDetalhe } =
    validado.dados;
  const ehBrasil = endereco.pais === "BR";

  const supabase = createServiceClient();

  // Afiliada e indicação de assinante não coexistem (decisão de negócio,
  // spec-link-afiliada.md): se o código de afiliada bater com uma afiliada
  // ativa, ela tem prioridade e o ref_code é descartado, mesmo que os dois
  // tenham vindo na mesma URL. Código que não existe ou está inativo é
  // ignorado em silêncio — link digitado errado não pode custar uma venda.
  let afiliadoId: string | null = null;
  let refCodeEfetivo = refCode;

  if (afiliadoCodigo) {
    const { data: afiliado, error: afiliadoErr } = await supabase
      .from("afiliados")
      .select("id")
      .ilike("codigo", afiliadoCodigo.replace(/[%_\\]/g, "\\$&"))
      .eq("ativo", true)
      .maybeSingle();

    if (afiliadoErr) {
      console.error("[checkout] erro ao buscar afiliada", afiliadoErr);
    } else if (afiliado) {
      afiliadoId = afiliado.id;
      refCodeEfetivo = null;
    }
  }

  // Revalida o ref_code contra o banco na hora de gravar — pode ter deixado
  // de existir entre o carregamento da página e o envio. Código que não bate
  // é descartado em silêncio, nunca recusa o pedido.
  if (refCodeEfetivo) {
    const { data: nomeIndicadora, error: refErr } = await supabase.rpc(
      "validar_codigo_indicacao",
      { p_codigo: refCodeEfetivo },
    );
    if (refErr) {
      console.error("[checkout] erro ao validar ref_code", refErr);
    } else if (!nomeIndicadora) {
      refCodeEfetivo = null;
    }
  }

  // Ninguém pode se autoindicar: se o e-mail de quem assina é o mesmo da
  // dona do código (minúsculas, sem espaços), o pedido segue sem ref_code —
  // sem bloquear a compra por causa disso.
  if (refCodeEfetivo) {
    const { data: indicadora, error: indicadoraErr } = await supabase
      .from("membros")
      .select("email")
      .eq("codigo_indicacao", refCodeEfetivo)
      .maybeSingle();

    if (indicadoraErr) {
      console.error("[checkout] erro ao conferir autoindicação", indicadoraErr);
    } else {
      const normalizar = (v: string) => v.toLowerCase().replace(/\s+/g, "");
      if (
        indicadora?.email &&
        normalizar(indicadora.email) === normalizar(pessoais.email)
      ) {
        refCodeEfetivo = null;
      }
    }
  }

  // Plano + preço + ciclo vêm do banco. Cada combinação plano+ciclo é sua
  // própria linha em `planos` (ex. "pessego-trimestral"), já com o valor
  // certo — nada de valor fixo no código, e não confia no que o cliente
  // mandar pra ciclo (ele nem manda: o ciclo é o do plano escolhido).
  const { data: planoRow, error: planoErr } = await supabase
    .from("planos")
    .select("slug, nome, tipo, valor, ativo, ciclo, meses")
    .eq("slug", plano)
    .maybeSingle();

  if (planoErr) {
    console.error("[checkout] erro ao buscar plano", planoErr);
    return NextResponse.json(
      { error: "Erro ao consultar o plano." },
      { status: 500 },
    );
  }
  if (!planoRow || planoRow.ativo === false) {
    console.error("[checkout] 400: plano não encontrado ou inativo", { plano });
    return NextResponse.json(
      { error: "Plano indisponível.", campos: { plano: "Plano inválido" } },
      { status: 400 },
    );
  }

  const valorBase = Number(planoRow.valor);
  if (!Number.isFinite(valorBase) || valorBase <= 0) {
    console.error("[checkout] preço não configurado", { plano });
    return NextResponse.json(
      { error: "Preço do plano não configurado." },
      { status: 500 },
    );
  }

  // Endereço fora do Brasil soma R$ 20 por envelope, ou seja, por mês do
  // ciclo (mensal +20, trimestral +60) — é esse valor (não o do plano puro)
  // que é gravado e cobrado.
  const valor =
    valorBase + (ehBrasil ? 0 : calcularAcrescimoInternacional(planoRow.meses));

  // mensal -> MONTHLY, trimestral -> QUARTERLY. Errar isso cobra R$ 180 e
  // recobra em 30 dias, então vem sempre do plano, nunca do cliente.
  const cicloAsaas = planoRow.ciclo === "trimestral" ? "QUARTERLY" : "MONTHLY";

  // 1) Grava o pedido com status 'iniciado' (service role, ignora RLS).
  const dadosJson = {
    pessoais,
    endereco,
    ref_code: refCodeEfetivo,
    afiliado_id: afiliadoId,
    valor,
  };

  const { data: pedido, error: pedidoErr } = await supabase
    .from("pedidos")
    .insert({
      plano_slug: plano,
      ciclo: cicloAsaas,
      tipo: planoRow.tipo ?? "assinatura",
      ref_code: refCodeEfetivo,
      afiliado_id: afiliadoId,
      origem,
      origem_detalhe: origemDetalhe,
      status: "iniciado",
      dados_json: dadosJson,
    })
    .select("id")
    .single();

  if (pedidoErr || !pedido) {
    console.error("[checkout] erro ao gravar pedido", pedidoErr);
    return NextResponse.json(
      { error: "Não foi possível iniciar o pedido." },
      { status: 500 },
    );
  }

  // Pix não passa pelo checkout hospedado: cliente + assinatura direto pela
  // API do Asaas (spec-rota-pix.md). O caminho de cartão abaixo continua
  // exatamente como antes.
  if (formaPagamento === "PIX") {
    return criarPedidoPix({
      pedidoId: pedido.id,
      pessoais,
      endereco,
      ehBrasil,
      planoNome: planoRow.nome,
      valor,
      cicloAsaas,
    });
  }

  // 2) Cria o checkout no Asaas. externalReference amarra o retorno ao pedido.
  const base = siteUrl(request);
  const payload = {
    billingTypes: BILLING_TYPES,
    chargeTypes: ["RECURRENT"],
    minutesToExpire: 1440,
    externalReference: pedido.id,
    callback: {
      successUrl: `${base}/checkout/sucesso?pedido=${pedido.id}`,
      cancelUrl: `${base}/checkout/cancelado?pedido=${pedido.id}`,
      expiredUrl: `${base}/checkout/expirado?pedido=${pedido.id}`,
    },
    items: [
      {
        name: planoRow.nome,
        description: `Assinatura ${planoRow.nome} — cobrança ${
          planoRow.ciclo === "trimestral" ? "trimestral" : "mensal"
        }`,
        quantity: 1,
        value: valor,
      },
    ],
    // customerData do POST /v3/checkouts (schema CheckoutSessionCustomerDataDTO).
    // Campos: name, cpfCnpj, email, phone, address, addressNumber, complement,
    // province, postalCode. Não existe mobilePhone nem country aqui.
    // - phone: só dígitos, sem máscara (ex. do schema: "4738010919").
    // - postalCode: 8 dígitos, sem máscara, obrigatório e validado contra a
    //   base dos Correios (CEP genérico de cidade, final -000, é recusado).
    //   Pra fora do Brasil não tem CEP real pra mandar — usa o placeholder
    //   fixo CEP_ASAAS_INTERNACIONAL. O endereço de entrega de verdade está
    //   em pedidos.dados_json/enderecos, não aqui.
    customerData: {
      name: pessoais.nome,
      email: pessoais.email,
      cpfCnpj: pessoais.cpf,
      phone: pessoais.telefone,
      address: endereco.logradouro,
      addressNumber: endereco.numero,
      complement: endereco.complemento ?? undefined,
      province: endereco.bairro,
      postalCode: ehBrasil ? cepAsaas(endereco.cep) : CEP_ASAAS_INTERNACIONAL,
    },
    subscription: {
      cycle: cicloAsaas,
      nextDueDate: proximoVencimento(),
    },
  };

  let checkout;
  try {
    checkout = await criarCheckout(payload);
  } catch (err) {
    if (err instanceof AsaasError) {
      console.error("[checkout] Asaas recusou o checkout", {
        pedidoId: pedido.id,
        message: err.message,
        detalhes: err.detalhes,
      });
    } else {
      console.error("[checkout] erro inesperado ao criar checkout", err);
    }
    // O check `pedidos_status_check` só aceita iniciado/pago/cancelado/expirado.
    // Sem estado "erro", marcamos a tentativa como cancelada.
    const { error: cancelErr } = await supabase
      .from("pedidos")
      .update({ status: "cancelado" })
      .eq("id", pedido.id);
    if (cancelErr) {
      console.error("[checkout] falha ao marcar pedido como cancelado", {
        pedidoId: pedido.id,
        cancelErr,
      });
    }

    const status = err instanceof AsaasError ? err.status : 502;
    const mensagem =
      err instanceof AsaasError
        ? err.message
        : "Falha ao criar o checkout. Tente de novo em instantes.";
    return NextResponse.json(
      { error: mensagem, pedidoId: pedido.id },
      { status },
    );
  }

  // 3) Guarda o id do checkout no pedido.
  const { error: updErr } = await supabase
    .from("pedidos")
    .update({ asaas_checkout_id: checkout.id })
    .eq("id", pedido.id);

  if (updErr) {
    // Não bloqueia: o checkout já existe e o externalReference amarra o retorno.
    console.error("[checkout] checkout criado mas asaas_checkout_id não gravado", {
      pedidoId: pedido.id,
      checkoutId: checkout.id,
      updErr,
    });
  }

  // 4) Devolve a URL para o front redirecionar.
  return NextResponse.json({
    url: checkout.link,
    checkoutId: checkout.id,
    pedidoId: pedido.id,
  });
}
