/**
 * Tipos e constantes da Tela 2 (Membras) sem nenhum import de servidor —
 * separado de lib/admin/membras.ts de propósito. Aquele arquivo importa
 * createServiceClient (que usa next/headers); se um componente de cliente
 * importar qualquer coisa de lá, o bundler arrasta o módulo inteiro pro
 * cliente e o build quebra. Componentes de cliente importam só daqui.
 */

export const FILTRO_TODOS = "";
export const FILTRO_NAO_INFORMADO = "__nao_informado__";

export type FiltrosMembras = {
  busca: string;
  status: string;
  plano: string;
  pais: string;
  origem: string;
  afiliada: string;
  pagina: number;
};

export const FILTROS_PADRAO: FiltrosMembras = {
  busca: "",
  status: FILTRO_TODOS,
  plano: FILTRO_TODOS,
  pais: FILTRO_TODOS,
  origem: FILTRO_TODOS,
  afiliada: FILTRO_TODOS,
  pagina: 1,
};

export type LinhaMembra = {
  id: string;
  nome: string;
  email: string;
  planoSlug: string | null;
  planoNome: string;
  statusAssinatura: string | null;
  cidade: string | null;
  pais: string | null;
  paisNome: string;
  dataEntrada: string;
  origem: string | null;
  origemRotulo: string;
  afiliadaId: string | null;
  afiliadaNome: string | null;
};

export type OpcoesFiltroMembras = {
  planos: { valor: string; rotulo: string }[];
  paises: { valor: string; rotulo: string }[];
  afiliadas: { valor: string; rotulo: string }[];
};

export type ResultadoMembras = {
  linhas: LinhaMembra[];
  total: number;
  paginaAtual: number;
  totalPaginas: number;
  opcoes: OpcoesFiltroMembras;
};
