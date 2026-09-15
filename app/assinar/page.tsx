import { paramTexto } from "@/lib/searchParams";

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
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="text-xl font-semibold text-zinc-900">
          Assine o Clube 21
        </h1>
        <FormAssinatura planoInicial={plano} refInicial={ref} afInicial={af} />
      </div>
    </div>
  );
}
