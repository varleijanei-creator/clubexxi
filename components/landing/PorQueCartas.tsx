import Botao from "@/components/Botao";

import s from "./PorQueCartas.module.css";

export default function PorQueCartas() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <div className={s.texto}>
          <h2 className={s.titulo}>
            Pra quem já rolou o feed 500 vezes hoje e sente falta de conexão.
          </h2>
          <p className={s.paragrafo}>
            O Clube 21 é um convite pra desacelerar por um instante. Pra
            trocar o scroll pelo papel, a notificação pela carta e a pressa
            pelo prazer. Cada envelope que chega é um lembrete: de celebrar a
            sua vida e de se lambuzar com o presente.
          </p>
          <p className={s.paragrafo}>
            A gente escolheu o pêssego pra representar o clube porque
            pêssego é aquilo: suculento, doce, do tipo de coisa que só dá pra
            sentir com o corpo inteiro, devagar, sem pressa, tipo um verão
            italiano que a gente não quer que acabe. É disso que a vida é
            feita, e é fácil esquecer isso rolando uma tela o tempo todo,
            né?
          </p>
          <p className={s.destaque}>
            O Clube 21 é, antes de tudo, um espaço de pessoas sensíveis se
            conectando com o lado feliz e doce da vida.
          </p>
          <div className={s.cta}>
            <Botao href="/assinar">Quero minha carta</Botao>
          </div>
        </div>
        <div className={s.imagem}>{/* TODO: imagem */}</div>
      </div>
    </section>
  );
}
