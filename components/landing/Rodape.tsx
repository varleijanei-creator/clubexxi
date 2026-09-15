import s from "./Rodape.module.css";

export default function Rodape() {
  return (
    <footer className={s.rodape}>
      <div className={s.conteudo}>
        <div className={s.links}>
          <a
            href="https://instagram.com/clubexxi"
            className={s.linkDestaque}
          >
            Instagram @clubexxi
          </a>
          <a
            href="mailto:comercial.clube21@gmail.com"
            className={s.linkDestaque}
          >
            comercial.clube21@gmail.com
          </a>
          <a href="/privacidade" className={s.link}>
            Política de privacidade
          </a>
        </div>
        <p className={s.legal}>
          61.685.219 VARLEI JOSE JANEI · CNPJ 61.685.219/0001-66 · Brasil
        </p>
      </div>
    </footer>
  );
}
