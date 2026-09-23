import type { EnderecoConta } from "@/lib/conta/dados";
import { nomeDoPais } from "@/lib/paises";
import Bloco from "./Bloco";

export default function SecaoEndereco({ endereco }: { endereco: EnderecoConta | null }) {
  return (
    <Bloco titulo="Endereço de entrega">
      {endereco ? (
        <p className="text-sm leading-relaxed text-[var(--c21-tinta)]">
          {endereco.logradouro}, {endereco.numero}
          {endereco.complemento ? ` — ${endereco.complemento}` : ""}
          <br />
          {endereco.bairro ? `${endereco.bairro} — ` : ""}
          {endereco.cidade}
          {endereco.uf ? `/${endereco.uf}` : ""}
          <br />
          CEP {endereco.cep ?? "—"} — {nomeDoPais(endereco.pais)}
          {endereco.pontoReferencia && (
            <>
              <br />
              Referência: {endereco.pontoReferencia}
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-[var(--c21-tinta-suave)]">Sem endereço cadastrado.</p>
      )}
    </Bloco>
  );
}
