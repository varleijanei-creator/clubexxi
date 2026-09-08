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

/**
 * POST /v3/checkouts — cria um checkout hospedado.
 * `payload` já vem montado pelo route handler. Devolve o id e o link (URL que
 * o front usa para redirecionar).
 */
export async function criarCheckout(
  payload: Record<string, unknown>,
): Promise<CheckoutCriado> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    throw new AsaasError("Integração de pagamento não configurada", 500);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
      },
      body: JSON.stringify(payload),
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
    // resposta não-JSON; tratada abaixo
  }

  const erros = (corpo as { errors?: { code?: string; description?: string }[] })
    ?.errors;

  if (!res.ok) {
    const descricao =
      erros
        ?.map((e) => e.description)
        .filter(Boolean)
        .join("; ") || `Falha ao criar o checkout (HTTP ${res.status}).`;
    // `detalhes` guarda só a lista de erros do Asaas — nunca a chave.
    throw new AsaasError(descricao, 502, erros ?? null);
  }

  const dados = corpo as { id?: string; link?: string } | null;
  if (!dados?.id || !dados?.link) {
    throw new AsaasError("Resposta inesperada do provedor de pagamento.", 502);
  }

  return { id: dados.id, link: dados.link };
}
