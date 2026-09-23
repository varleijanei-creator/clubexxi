import type { MembroConta } from "@/lib/conta/dados";
import Bloco from "./Bloco";
import Campo from "./Campo";

export default function SecaoContato({ membro }: { membro: MembroConta }) {
  return (
    <Bloco titulo="Seus dados">
      <dl className="flex flex-col gap-2">
        <Campo rotulo="Nome" valor={membro.nome} />
        <Campo rotulo="E-mail" valor={membro.email} />
        <Campo rotulo="Telefone" valor={membro.telefone ?? "—"} />
        <Campo rotulo="CPF" valor={membro.cpf ?? "—"} />
      </dl>
    </Bloco>
  );
}
