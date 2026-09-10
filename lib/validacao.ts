/**
 * Validação e máscara dos campos do formulário de assinatura. Sem dependência
 * externa — só o necessário pro CPF, telefone e CEP do checkout.
 */

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Valida os dígitos verificadores do CPF. Rejeita sequências repetidas. */
export function validarCPF(valor: string): boolean {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digitoVerificador = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  if (digitoVerificador(cpf.slice(0, 9), 10) !== Number(cpf[9])) return false;
  if (digitoVerificador(cpf.slice(0, 10), 11) !== Number(cpf[10])) return false;

  return true;
}

/** Máscara progressiva 000.000.000-00. Aceita entrada já mascarada ou crua. */
export function formatarCPF(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  const partes = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  let resultado = partes.join(".");
  if (d.length > 9) resultado += `-${d.slice(9, 11)}`;
  return resultado;
}

/** Máscara progressiva (11) 98765-4321, também cobre o formato de 10 dígitos. */
export function formatarTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
}

/** Máscara progressiva 00000-000. */
export function formatarCEP(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
