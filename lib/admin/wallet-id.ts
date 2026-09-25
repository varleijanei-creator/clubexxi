/**
 * Formato do Wallet ID do Asaas: UUID (ex.: c0c1688f-636b-42c0-b6ee-7339182276b7).
 * Fora do arquivo de Server Actions porque "use server" só exporta funções,
 * e os formulários usam o mesmo padrão no atributo `pattern`.
 */
const HEX = "[0-9a-fA-F]";

/** Pro atributo `pattern` do input (o navegador já ancora início e fim). */
export const PADRAO_WALLET_ID = `${HEX}{8}-${HEX}{4}-${HEX}{4}-${HEX}{4}-${HEX}{12}`;

export const WALLET_ID_VALIDO = new RegExp(`^${PADRAO_WALLET_ID}$`);

export const EXEMPLO_WALLET_ID = "00000000-0000-0000-0000-000000000000";
