import Rodape from "@/components/landing/Rodape";
import { paramTexto } from "@/lib/searchParams";
import { pixAtivo } from "@/lib/pagamento";

import Cabecalho from "./Cabecalho";
import FormAssinatura from "./FormAssinatura";

export default async function AssinarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const plano = paramTexto(params, "plano");
  const ref = paramTexto(params, "ref");
  const af = paramTexto(params, "af");

  return (
    <div className="flex flex-1 flex-col bg-[var(--c21-papel)]">
      <Cabecalho />
      <div className="flex flex-1 justify-center px-4 py-10">
        <div className="flex w-full max-w-md flex-col gap-6">
          <h1
            className="text-xl font-normal text-[var(--c21-tinta)]"
            style={{ fontFamily: "var(--c21-fonte-display)" }}
          >
            Assine o Clube 21
          </h1>
          <FormAssinatura
            planoInicial={plano}
            refInicial={ref}
            afInicial={af}
            pixAtivo={pixAtivo()}
          />
        </div>
      </div>
      <Rodape />
    </div>
  );
}
