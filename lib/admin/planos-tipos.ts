/**
 * Tipos da seção Planos (dentro da Tela 4 — Produtos), sem import de
 * servidor, mesmo motivo de produtos-tipos.ts.
 */

export type PrecoLegado = {
  ciclo: string;
  valor: number;
  ativo: boolean;
};

export type PlanoLinha = {
  slug: string;
  nome: string;
  tipo: string;
  ciclo: string;
  meses: number;
  valor: number;
  ativo: boolean;
  descricao: string | null;
  // De `planos_precos` — hoje só 3 dos 7 slugs têm linha lá (ver nota em
  // lib/admin/planos.ts). Só leitura, não editável por aqui.
  precoLegado: PrecoLegado | null;
};

export type ValoresPlano = {
  valor: string;
  descricao: string;
  ativo: boolean;
};

export type EstadoPlano = {
  erro: string | null;
  valores: ValoresPlano;
};
