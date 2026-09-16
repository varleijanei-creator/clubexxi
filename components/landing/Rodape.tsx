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
            href="mailto:comercial@clubexxi.com.br"
            className={s.linkDestaque}
          >
            comercial@clubexxi.com.br
          </a>
          <a href="/privacidade" className={s.link}>
            Política de privacidade
          </a>
        </div>
        <p className={s.legal}>
          CNPJ 61.685.219/0001-66 · São Carlos - SP / Brasil
        </p>
      </div>
    </footer>
  );
}
