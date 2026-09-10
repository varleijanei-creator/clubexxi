import FormAssinatura from "./FormAssinatura";

function paramTexto(
  params: { [key: string]: string | string[] | undefined },
  chave: string,
): string | null {
  const v = params[chave];
  const valor = Array.isArray(v) ? v[0] : v;
  return valor ? valor : null;
}

export default async function AssinarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const plano = paramTexto(params, "plano");
  const ref = paramTexto(params, "ref");

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="text-xl font-semibold text-zinc-900">
          Assine o Clube 21
        </h1>
        <FormAssinatura planoInicial={plano} refInicial={ref} />
      </div>
    </div>
  );
}
