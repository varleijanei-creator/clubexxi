import s from "./OQueE.module.css";

export default function OQueE() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <div className={s.texto}>
          <h2 className={s.titulo}>O que é o Clube 21?</h2>
          <p className={s.paragrafo}>
            O <strong>Clube 21</strong> nasceu inspirado na carta de tarô &quot;o
            Mundo&quot;, uma carta que fala sobre fechar ciclos, celebrar
            conquistas e comemorar a vida. É um pouco disso que a gente quer
            trazer pra você todo mês: um motivo pra parar, sentir e celebrar,
            mesmo nos dias mais corridos, numa comunidade de pessoas como
            você :)
          </p>
          <p className={s.paragrafo}>
            Todo mês, montamos à mão um envelope recheado de histórias reais,
            tarôzinho, horóscopo, receitas e muito mais, e mandamos direto pra
            sua caixa de correio.{" "}
            <strong>
              É sobre lembrar, mês a mês, que você merece viver com mais
              gosto.
            </strong>
          </p>
        </div>
        <div className={s.imagem}>
          <img
            src="/clube21/Cartas mesa.jpeg"
            alt="Envelopes do Clube 21 com selo de pêssego"
            className={s.foto}
          />
        </div>
      </div>
    </section>
  );
}
