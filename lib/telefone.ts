/**
 * Validação de telefone internacional, compartilhada entre a tela
 * (app/assinar) e a rota app/api/checkout/route.ts. Sem regra fixa de
 * dígitos — quem decide validade é o libphonenumber-js, a partir do país do
 * telefone (que pode ser diferente do país do endereço de entrega).
 */
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export type ResultadoTelefone =
  | { valido: true; e164: string }
  | { valido: false; e164: null };

/**
 * Recebe o número como a pessoa digitou (com ou sem máscara) e o código ISO
 * do país do telefone. Devolve o número em E.164 (ex.: "+351912345678")
 * quando válido.
 */
export function validarTelefone(
  numero: string,
  paisTelefone: string,
): ResultadoTelefone {
  const parsed = parsePhoneNumberFromString(numero, paisTelefone as CountryCode);
  if (!parsed || !parsed.isValid()) return { valido: false, e164: null };
  return { valido: true, e164: parsed.number };
}
