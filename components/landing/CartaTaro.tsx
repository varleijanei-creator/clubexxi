import s from "./CartaTaro.module.css";

export default function CartaTaro() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <div className={s.texto}>
          <h2 className={s.titulo}>Cartas de tarô</h2>
          <p className={s.paragrafo}>
            Além disso, você também recebe uma carta de tarô colecionável
            todo mês pra ir montando seu próprio baralho ao longo do ano!
          </p>
          <p className={s.paragrafo}>
            A da edição de outubro é O Mundo, arcano XXI, a mesma que deu o
            nome pro clube.
          </p>
          <p className={s.selo}>Exclusiva do plano Pêssego</p>
        </div>
        <div className={s.imagem}>
          <div className={s.cartas}>
            <img
              src="/clube21/verso carta mundo.png"
              alt=""
              aria-hidden="true"
              className={`${s.foto} ${s.fotoVerso}`}
            />
            <img
              src="/clube21/env-carta-taro.webp"
              alt="Carta de tarô O Mundo, arcano XXI"
              className={`${s.foto} ${s.fotoFrente}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
