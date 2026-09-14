/**
 * Acesso ao Asaas. Toda chamada acontece no servidor.
 * Autenticação é o header `access_token` (não `Authorization: Bearer`).
 * A chave nunca aparece em log nem na resposta ao cliente.
 */

const BASE_URL = (
  process.env.ASAAS_BASE_URL ?? "https://api-sandbox.asaas.com/v3"
).replace(/\/$/, "");

/** Erro de negócio vindo do Asaas, já com mensagem apresentável ao usuário. */
export class AsaasError extends Error {
  readonly status: number;
  readonly detalhes: unknown;

  constructor(message: string, status: number, detalhes: unknown = null) {
    super(message);
    this.name = "AsaasError";
    this.status = status;
    this.detalhes = detalhes;
  }
}

export type CheckoutCriado = { id: string; link: string };

type ErroAsaas = { code?: string; description?: string };

type RespostaBruta = {
  ok: boolean;
  status: number;
  corpo: unknown;
  erros: ErroAsaas[] | null;
};

/**
 * Chamada crua ao Asaas: autentica, faz o fetch e devolve o corpo já
 * parseado (sem lançar em caso de HTTP de erro — quem chama decide a
 * mensagem, pra cada endpoint poder ter seu próprio texto de erro).
 */
async function chamarAsaas(
  method: "GET" | "POST",
  caminho: string,
  body?: Record<string, unknown>,
): Promise<RespostaBruta> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new AsaasError("Integração de pagamento não configurada", 500);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${caminho}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AsaasError(
      "Não foi possível contatar o provedor de pagamento. Tente de novo em instantes.",
      502,
    );
  }

  const bruto = await res.text();
  let corpo: unknown = null;
  try {
    corpo = bruto ? JSON.parse(bruto) : null;
  } catch {
    // resposta não-JSON; tratada pelo chamador
  }

  const erros =
    (corpo as { errors?: ErroAsaas[] })?.errors ?? null;

  return { ok: res.ok, status: res.status, corpo, erros };
}

/**
 * POST /v3/checkouts — cria um checkout hospedado.
 * `payload` já vem montado pelo route handler. Devolve o id e o link (URL que
 * o front usa para redirecionar).
 */
export async function criarCheckout(
  payload: Record<string, unknown>,
): Promise<CheckoutCriado> {
  const resp = await chamarAsaas("POST", "/checkouts", payload);

  if (!resp.ok) {
    const descricao =
      resp.erros
        ?.map((e) => e.description)
        .filter(Boolean)
        .join("; ") || `Falha ao criar o checkout (HTTP ${resp.status}).`;
    // `detalhes` guarda só a lista de erros do Asaas — nunca a chave.
    throw new AsaasError(descricao, 502, resp.erros);
  }

  const dados = resp.corpo as { id?: string; link?: string } | null;
  if (!dados?.id || !dados?.link) {
    throw new AsaasError("Resposta inesperada do provedor de pagamento.", 502);
  }

  return { id: dados.id, link: dados.link };
}

export type ClienteAsaas = { id: string };

export type DadosClienteAsaas = {
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  postalCode: string;
};

/**
 * GET /v3/customers?cpfCnpj=... — procura um cliente já cadastrado pelo
 * CPF/CNPJ, pra não duplicar cliente no Asaas a cada nova assinatura Pix da
 * mesma pessoa. Devolve `null` quando não existe.
 */
export async function buscarClientePorCpf(
  cpfCnpj: string,
): Promise<ClienteAsaas | null> {
  const resp = await chamarAsaas(
    "GET",
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
  );

  if (!resp.ok) {
    const descricao =
      resp.erros
        ?.map((e) => e.description)
        .filter(Boolean)
        .join("; ") || `Falha ao consultar cliente (HTTP ${resp.status}).`;
    throw new AsaasError(descricao, 502, resp.erros);
  }

  const dados = resp.corpo as { data?: { id?: string }[] } | null;
  const primeiro = dados?.data?.[0];
  return primeiro?.id ? { id: primeiro.id } : null;
}

/** POST /v3/customers — cria um cliente novo no Asaas. */
export async function criarCliente(
  dados: DadosClienteAsaas,
): Promise<ClienteAsaas> {
  const resp = await chamarAsaas(
    "POST",
    "/customers",
    dados as unknown as Record<string, unknown>,
  );

  if (!resp.ok) {
    const descricao =
      resp.erros
        ?.map((e) => e.description)
        .filter(Boolean)
        .join("; ") || `Falha ao criar cliente (HTTP ${resp.status}).`;
    throw new AsaasError(descricao, 502, resp.erros);
  }

  const corpo = resp.corpo as { id?: string } | null;
  if (!corpo?.id) {
    throw new AsaasError(
      "Resposta inesperada do provedor de pagamento ao criar cliente.",
      502,
    );
  }

  return { id: corpo.id };
}

export type AssinaturaAsaas = { id: string };

/**
 * POST /v3/subscriptions — cria uma assinatura cobrada fora do checkout
 * hospedado (caso do Pix: o Asaas gera uma cobrança nova a cada ciclo).
 */
export async function criarAssinatura(
  payload: Record<string, unknown>,
): Promise<AssinaturaAsaas> {
  const resp = await chamarAsaas("POST", "/subscriptions", payload);

  if (!resp.ok) {
    const descricao =
      resp.erros
        ?.map((e) => e.description)
        .filter(Boolean)
        .join("; ") || `Falha ao criar assinatura (HTTP ${resp.status}).`;
    throw new AsaasError(descricao, 502, resp.erros);
  }

  const corpo = resp.corpo as { id?: string } | null;
  if (!corpo?.id) {
    throw new AsaasError(
      "Resposta inesperada do provedor de pagamento ao criar assinatura.",
      502,
    );
  }

  return { id: corpo.id };
}

/**
 * GET /v3/subscriptions/{id}/payments — cobranças já geradas de uma
 * assinatura. Testado em execução real contra o sandbox (13/09/2026): o
 * campo com a URL da fatura hospedada é `invoiceUrl` (ver `extrairUrlFatura`
 * em app/api/checkout/route.ts). Ainda assim devolvemos os objetos crus de
 * cada cobrança, em vez de já extrair o campo aqui, porque quem chama loga a
 * cobrança inteira — útil pra flagrar o caso raro (visto no mesmo teste) em
 * que a cobrança inicial vem como BOLETO em vez de PIX.
 */
export async function listarCobrancasAssinatura(
  subscriptionId: string,
): Promise<Record<string, unknown>[]> {
  const resp = await chamarAsaas(
    "GET",
    `/subscriptions/${subscriptionId}/payments`,
  );

  if (!resp.ok) {
    const descricao =
      resp.erros
        ?.map((e) => e.description)
        .filter(Boolean)
        .join("; ") ||
      `Falha ao consultar cobranças da assinatura (HTTP ${resp.status}).`;
    throw new AsaasError(descricao, 502, resp.erros);
  }

  const corpo = resp.corpo as { data?: Record<string, unknown>[] } | null;
  return corpo?.data ?? [];
}
