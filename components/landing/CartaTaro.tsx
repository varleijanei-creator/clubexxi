import s from "./CartaTaro.module.css";

export default function CartaTaro() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <div className={s.texto}>
          <h2 className={s.titulo}>A carta de tarô</h2>
          <p className={s.paragrafo}>
            Uma carta de tarô colecionável, uma por mês, pra montar seu
            próprio baralho ao longo do ano.
          </p>
          <p className={s.paragrafo}>
            A primeira é O Mundo, arcano XXI — a mesma que dá nome ao clube.
          </p>
          <p className={s.selo}>Exclusiva do plano Pêssego</p>
        </div>
        <div className={s.imagem}>{/* TODO: imagem */}</div>
      </div>
    </section>
  );
}
