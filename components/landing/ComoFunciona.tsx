import Botao from "@/components/Botao";

import s from "./ComoFunciona.module.css";

export default function ComoFunciona() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <h2 className={s.titulo}>Como funciona?</h2>
        <div className={s.passos}>
          <div className={s.passo}>
            <span className={s.numero}>1</span>
            <h3 className={s.passoTitulo}>
              Você escolhe o plano e preenche o endereço.
            </h3>
            <p className={s.passoTexto}>
              Endereço completo, porque isso aqui vai mesmo pelo correio, pro
              mundo todo!
            </p>
          </div>
          <div className={s.passo}>
            <span className={s.numero}>2</span>
            <h3 className={s.passoTitulo}>A gente monta seu envelope à mão.</h3>
            <p className={s.passoTexto}>Peça por peça, na semana da postagem.</p>
          </div>
          <div className={s.passo}>
            <span className={s.numero}>3</span>
            <h3 className={s.passoTitulo}>Chega na sua caixa de correio.</h3>
          </div>
        </div>
        <div className={s.aviso}>
          <p className={s.avisoTitulo}>
            🍑 Assinou até dia 20? Essa edição já é sua.
          </p>
          <p className={s.avisoTexto}>
            Depois do dia 20, sem estresse — você já garante seu lugar, só
            que a primeira carta que chega é a do mês seguinte :D
          </p>
          <div className={s.avisoCta}>
            <Botao href="/assinar">Começar agora</Botao>
          </div>
        </div>
      </div>
    </section>
  );
}
