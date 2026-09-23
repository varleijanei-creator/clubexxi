import { IconeEmail, IconeInstagram, IconeWhatsapp } from "./IconesRodape";
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
            <IconeInstagram />
            Instagram @clubexxi
          </a>
          <a
            href="https://wa.me/message/ZEH6RBVPHEMEH1"
            target="_blank"
            rel="noopener noreferrer"
            className={s.linkDestaque}
          >
            <IconeWhatsapp />
            WhatsApp
          </a>
          <a
            href="mailto:comercial@clubexxi.com.br"
            className={s.linkDestaque}
          >
            <IconeEmail />
            comercial@clubexxi.com.br
          </a>
          <a href="/privacidade" className={s.link}>
            Política de privacidade
          </a>
          <a href="/minha-conta/login" className={s.link}>
            Já é assinante? Entrar
          </a>
        </div>
        <p className={s.legal}>
          CNPJ 61.685.219/0001-66 · São Carlos - SP / Brasil
        </p>
      </div>
    </footer>
  );
}
