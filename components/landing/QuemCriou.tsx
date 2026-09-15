import s from "./QuemCriou.module.css";

export default function QuemCriou() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <h2 className={s.titulo}>Dois sonhadores, um mesmo jeito de viver.</h2>
        <div className={s.pessoas}>
          <div className={s.pessoa}>
            <div className={s.foto}>{/* TODO: imagem */}</div>
            <p className={s.bio}>
              <strong>Vitor</strong>, 27 anos, criador de conteúdo nômade há
              7 anos. Já morou em mais de 20 países, fala 6 línguas e leva
              uma comunidade de +72 mil seguidoras junto nessa jornada. As
              cartas entraram na vida dele como uma forma de viver
              deliciosamente offline, colocando em prática tudo que viu (e
              viveu) mundo afora.
            </p>
          </div>
          <div className={s.pessoa}>
            <div className={s.foto}>{/* TODO: imagem */}</div>
            <p className={s.bio}>
              <strong>Varlei</strong>, 41 anos, designer, apaixonado por
              arte, literatura e música. Encontrou nas cartas um jeito de
              colocar pra fora sua sensibilidade pisciana e seu amor pelo
              analógico. Pra ele, escrever é a forma mais honesta e profunda
              de se conectar com alguém.
            </p>
          </div>
        </div>
        <p className={s.fechamento}>Juntos, criaram o Clube 21.</p>
      </div>
    </section>
  );
}
