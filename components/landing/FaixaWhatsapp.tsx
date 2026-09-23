import Botao from "@/components/Botao";

import s from "./FaixaWhatsapp.module.css";

export default function FaixaWhatsapp() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <h2 className={s.titulo}>
          Ainda tem dúvidas? Chama a gente que a gente te ajuda!
        </h2>
        <Botao
          href="https://wa.me/message/ZEH6RBVPHEMEH1"
          target="_blank"
          rel="noopener noreferrer"
          className={s.botao}
        >
          Chamar no WhatsApp
        </Botao>
      </div>
    </section>
  );
}
