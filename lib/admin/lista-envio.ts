import { createServiceClient } from "@/lib/supabase/server";
import { nomeDoPais } from "@/lib/paises";

/**
 * CSV da lista de envio de uma edição — spec-painel-admin.md, Tela 2.
 * Fonte: `envios` cruzado com `edicoes` e `enderecos`, como o spec pede.
 * Exclui envio cancelado; inclui previsto e enviado.
 */

export type EdicaoParaExportar = {
  id: string;
  nome: string | null;
  mes: string;
  fechamento: string | null;
  status: string;
};

export async function buscarEdicoesParaExportacao(): Promise<EdicaoParaExportar[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("edicoes")
    .select("id, nome, mes, fechamento, status")
    .order("mes", { ascending: true });

  if (error) {
    throw new Error(`[lista-envio] falha ao ler edições: ${error.message}`);
  }
  return data ?? [];
}

type MembroComEndereco = {
  nome: string;
  enderecos: EnderecoBruto[] | EnderecoBruto | null;
};

type EnderecoBruto = {
  cep: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string | null;
  cidade: string;
  uf: string | null;
  pais: string;
  ponto_referencia: string | null;
};

type EnvioComEndereco = {
  status: string;
  membros: MembroComEndereco[] | MembroComEndereco | null;
};

function primeiro<T>(v: T[] | T | null): T | null {
  if (v === null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

// Campo com vírgula, aspas ou quebra de linha precisa ficar entre aspas,
// com as aspas internas dobradas (RFC 4180) — senão o Excel lê a linha errada.
function celulaCsv(valor: string | null | undefined): string {
  const texto = valor ?? "";
  if (/[",\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

const CABECALHO = [
  "nome",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "uf",
  "cep",
  "pais",
  "ponto_referencia",
];

export async function gerarCsvListaEnvio(
  edicaoId: string,
): Promise<{ nomeArquivo: string; conteudo: string } | null> {
  const supabase = createServiceClient();

  const edicaoRes = await supabase
    .from("edicoes")
    .select("id, nome, mes")
    .eq("id", edicaoId)
    .maybeSingle();
  if (edicaoRes.error) {
    throw new Error(`[lista-envio] falha ao ler edição: ${edicaoRes.error.message}`);
  }
  if (!edicaoRes.data) return null;

  const enviosRes = await supabase
    .from("envios")
    .select(
      "status, membros(nome, enderecos(cep, logradouro, numero, complemento, bairro, cidade, uf, pais, ponto_referencia))",
    )
    .eq("edicao_id", edicaoId)
    .neq("status", "cancelado");
  if (enviosRes.error) {
    throw new Error(`[lista-envio] falha ao ler envios: ${enviosRes.error.message}`);
  }

  const linhas = ((enviosRes.data ?? []) as unknown as EnvioComEndereco[]).map((envio) => {
    const membro = primeiro(envio.membros);
    const endereco = membro ? primeiro(membro.enderecos) : null;
    return [
      membro?.nome ?? "",
      endereco?.logradouro ?? "",
      endereco?.numero ?? "",
      endereco?.complemento ?? "",
      endereco?.bairro ?? "",
      endereco?.cidade ?? "",
      endereco?.uf ?? "",
      endereco?.cep ?? "",
      endereco ? nomeDoPais(endereco.pais) : "",
      endereco?.ponto_referencia ?? "",
    ];
  });

  const csv = [CABECALHO, ...linhas]
    .map((linha) => linha.map(celulaCsv).join(","))
    .join("\r\n");

  // BOM UTF-8 na frente: sem isso o Excel em pt-BR lê acento como lixo.
  const conteudo = "﻿" + csv;
  const mesArquivo = edicaoRes.data.mes.slice(0, 7); // "2026-10-01" -> "2026-10"

  return {
    nomeArquivo: `lista-envio-${mesArquivo}.csv`,
    conteudo,
  };
}
