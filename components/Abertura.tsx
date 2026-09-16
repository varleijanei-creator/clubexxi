import Botao from "./Botao";
import s from "./Abertura.module.css";

/* Materiais do carrossel. A ordem importa: nenhuma cor
   encosta numa parecida enquanto giram.
   laranja → azul → verde → rosa → verde-limão */
const MATERIAIS = [
  { src: "/clube21/peca-1-comer.webp",   classe: s.s1 },
  { src: "/clube21/peca-2-baixo.webp",   classe: s.s2 },
  { src: "/clube21/peca-3-conta.webp",   classe: s.s3 },
  { src: "/clube21/peca-4-drink.webp",   classe: s.s4 },
  { src: "/clube21/peca-5-receita.webp", classe: s.s5 },
];

export default function Abertura() {
  return (
    <section className={s.abertura}>
      <div className={s.ceu} aria-hidden="true" />
      <div className={s.veu} aria-hidden="true" />

      <div className={s.palco}>
        <div className={`${s.estrela} ${s.saida}`} aria-hidden="true">
          <img src="/clube21/estrela.svg" alt="" />
        </div>
        <div className={`${s.estrela} ${s.entrada}`} aria-hidden="true">
          <img src="/clube21/estrela.svg" alt="" />
        </div>

        {MATERIAIS.map((m) => (
          <div key={m.src} className={`${s.slide} ${m.classe}`} aria-hidden="true">
            <img src={m.src} alt="" />
          </div>
        ))}

        <div className={s.marca}>
          <img src="/clube21/logo.png" alt="Clube 21" />
        </div>
      </div>

      <h1 className={s.titulo}>
        Um clube de assinatura de cartas criado pra te fazer viver deliciosamente.
      </h1>

      <p className={s.sub}>
        Todo mês um envelope novo na sua casa, com cartas de verdade.
        Sem tela, sem pressa e 100% analógico.
      </p>

      <div className={s.acao}>
        <Botao href="/assinar">Quero receber cartas!</Botao>
      </div>
    </section>
  );
}
