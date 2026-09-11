/**
 * Países aceitos no endereço de entrega. Código ISO 3166-1 alpha-2 — é o que
 * vai pra dados_json.endereco.pais. Brasil primeiro, é o padrão do formulário.
 */
export type Pais = { codigo: string; nome: string };

export const PAIS_PADRAO = "BR";

export const PAISES: Pais[] = [
  { codigo: "BR", nome: "Brasil" },
  { codigo: "PT", nome: "Portugal" },
  { codigo: "US", nome: "Estados Unidos" },
  { codigo: "CA", nome: "Canadá" },
  { codigo: "GB", nome: "Reino Unido" },
  { codigo: "IE", nome: "Irlanda" },
  { codigo: "ES", nome: "Espanha" },
  { codigo: "FR", nome: "França" },
  { codigo: "DE", nome: "Alemanha" },
  { codigo: "IT", nome: "Itália" },
  { codigo: "NL", nome: "Países Baixos" },
  { codigo: "CH", nome: "Suíça" },
  { codigo: "BE", nome: "Bélgica" },
  { codigo: "JP", nome: "Japão" },
  { codigo: "AU", nome: "Austrália" },
  { codigo: "AR", nome: "Argentina" },
  { codigo: "CL", nome: "Chile" },
  { codigo: "UY", nome: "Uruguai" },
  { codigo: "PY", nome: "Paraguai" },
  { codigo: "MX", nome: "México" },
];
