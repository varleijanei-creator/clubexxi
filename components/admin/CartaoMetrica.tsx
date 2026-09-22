/** Cartão numérico do topo do painel (Entradas, Saídas, MRR etc.). */
export default function CartaoMetrica({
  rotulo,
  valor,
  cor,
  nota,
}: {
  rotulo: string;
  valor: string;
  cor: string;
  nota?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[var(--c21-raio-md)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] p-4">
      <span className="text-sm text-[var(--c21-tinta-suave)]">{rotulo}</span>
      <span
        className="text-2xl font-semibold"
        style={{ color: cor, fontFamily: "var(--c21-fonte-display)" }}
      >
        {valor}
      </span>
      {nota && (
        <span className="text-xs text-[var(--c21-tinta-suave)]">{nota}</span>
      )}
    </div>
  );
}
