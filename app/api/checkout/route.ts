import { NextResponse } from "next/server";

import { AsaasError, criarCheckout } from "@/lib/asaas";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Hoje só existe cobrança mensal. 3/6/12 meses entram depois.
const CICLOS_VALIDOS = ["MONTHLY"];

// Asaas só aceita CREDIT_CARD quando chargeTypes = RECURRENT (PIX exigiria
// chargeType DETACHED, que não renova). Bate com a decisão do projeto:
// "cartão é o padrão, só cartão renova sozinho".
const BILLING_TYPES = ["CREDIT_CARD"];

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
  ciclo: string;
  pessoais: Pessoais;
  endereco: Endereco;
  refCode: string | null;
  afiliadaId: string | null;
};

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const digitos = (v: unknown): string => texto(v).replace(/\D/g, "");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validarEntrada(
  corpo: unknown,
): { dados: EntradaValida } | { erros: Record<string, string> } {
  const erros: Record<string, string> = {};
  // Corpo plano, com os nomes de campo do CLAUDE.md. Sem objetos aninhados.
  const b = (corpo ?? {}) as Record<string, unknown>;

  const plano = texto(b.plano);
  if (!plano) erros.plano = "Selecione um plano";

  const ciclo = texto(b.ciclo) || "MONTHLY";
  if (!CICLOS_VALIDOS.includes(ciclo)) erros.ciclo = "Ciclo indisponível";

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

  const afiliadaId = texto(b.afiliada_id) || null;
  if (afiliadaId && !UUID_RE.test(afiliadaId))
    erros.afiliada_id = "Afiliada inválida";

  if (Object.keys(erros).length > 0) return { erros };

  return {
    dados: {
      plano,
      ciclo,
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
      afiliadaId,
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
  const { plano, ciclo, pessoais, endereco, refCode, afiliadaId } =
    validado.dados;

  const supabase = createServiceClient();

  // Plano + preço vêm do banco. Nada de valor fixo no código.
  const { data: planoRow, error: planoErr } = await supabase
    .from("planos")
    .select("slug, nome, tipo, valor, ativo")
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

  const { data: precoRow, error: precoErr } = await supabase
    .from("planos_precos")
    .select("valor, ciclo, meses, ativo")
    .eq("plano_slug", plano)
    .eq("ciclo", ciclo)
    .eq("ativo", true)
    .maybeSingle();

  if (precoErr) {
    console.error("[checkout] erro ao buscar preço", precoErr);
    return NextResponse.json(
      { error: "Erro ao consultar o preço do plano." },
      { status: 500 },
    );
  }

  const valor = Number(precoRow?.valor ?? planoRow.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    console.error("[checkout] preço não configurado", { plano, ciclo });
    return NextResponse.json(
      { error: "Preço do plano não configurado." },
      { status: 500 },
    );
  }

  // 1) Grava o pedido com status 'iniciado' (service role, ignora RLS).
  const dadosJson = {
    pessoais,
    endereco,
    ref_code: refCode,
    afiliada_id: afiliadaId,
    valor,
  };

  const { data: pedido, error: pedidoErr } = await supabase
    .from("pedidos")
    .insert({
      plano_slug: plano,
      ciclo,
      tipo: planoRow.tipo ?? "assinatura",
      ref_code: refCode,
      afiliado_id: afiliadaId,
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

  // 2) Cria o checkout no Asaas. externalReference amarra o retorno ao pedido.
  const base = siteUrl(request);
  const ehBrasil = endereco.pais === "BR";
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
        description: `Assinatura ${planoRow.nome} — cobrança mensal`,
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
      cycle: ciclo,
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
