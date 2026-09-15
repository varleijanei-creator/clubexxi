import s from "./Comunidade.module.css";

export default function Comunidade() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <h2 className={s.titulo}>
          Você não recebe só uma carta. Você entra pra um clube :)
        </h2>
        <p className={s.paragrafo}>
          Além da nossa casa no Instagram (<strong>@clubexxi</strong>), toda
          assinante entra numa comunidade só nossa no whatsapp, pra
          participar das próximas edições, criar com a gente e saber de tudo
          em primeira mão.
        </p>
        <p className={s.paragrafo}>
          E pra quem tá no <strong>Plano Pêssego</strong>, tem mais: a{" "}
          <strong>Comunidade Pêssego</strong>, exclusiva com sorteios de
          presentes de marcas parceiras e edições especiais que só chegam pra
          quem é dali.
        </p>
      </div>
    </section>
  );
}
