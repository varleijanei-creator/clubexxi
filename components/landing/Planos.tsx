import Link from "next/link";

import { ACRESCIMO_INTERNACIONAL_POR_MES } from "@/lib/precos";

import s from "./Planos.module.css";

const AVISO_INTERNACIONAL = `Assinaturas internacionais: + R$ ${ACRESCIMO_INTERNACIONAL_POR_MES} por envelope.`;

export default function Planos() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <h2 className={s.titulo}>Escolha o seu plano:</h2>

        <div className={s.planos}>
          <div className={`${s.plano} ${s.planoPessego}`}>
            <span className={s.planoNome}>🍑 Plano Pêssego</span>
            <div className={s.precoBloco}>
              <span className={s.planoPreco}>R$ 69,90</span>
              <span className={s.planoFrete}>(frete incluso)</span>
            </div>
            <p className={s.planoIntro}>
              A experiência completa do Clube 21. Você recebe tudo:
            </p>
            <div className={s.planoLista}>
              <span>Tiragem e foco do mês</span>
              <span>Diário Vitor e Diário Varlei</span>
              <span>Horóscopo do mês</span>
              <span>As três crônicas do mês</span>
              <span>Mão na massa (drink + receita)</span>
              <span>Histórias das membras</span>
            </div>
            <p className={s.planoIntro}>E ainda ganha:</p>
            <div className={s.planoLista}>
              <span>Carta de tarô colecionável do mês</span>
              <span>
                Participação nos Classificados C21 — o mural onde ajudamos a
                divulgar os projetos das próprias assinantes
              </span>
              <span>Adesivos</span>
              <span>Presente de marcas parceiras</span>
              <span>Sorteios mensais</span>
              <span>Missões exclusivas</span>
              <span>Credencial exclusiva de membro</span>
              <span>Acesso à Comunidade Pêssego</span>
            </div>
            <div className={s.planoAcao}>
              <Link href="/assinar?plano=pessego" className={s.botaoPrimario}>
                Quero o Plano Pêssego
              </Link>
              <span className={s.planoAviso}>{AVISO_INTERNACIONAL}</span>
            </div>
          </div>

          <div className={`${s.plano} ${s.planoSecundario} ${s.planoFlor}`}>
            <span className={s.planoNomeSecundario}>🌸 Plano Flor</span>
            <div className={s.precoBlocoSecundario}>
              <span className={s.planoPrecoSecundario}>R$ 59,90</span>
              <span className={s.planoFreteSecundario}>(frete incluso)</span>
            </div>
            <p className={s.planoDescricao}>
              <strong>Um passo além do essencial.</strong> Tudo do Semente,
              mais o Mão na Massa (drink e receita do mês) e as Histórias das
              Membras. Ideal pra quem quer sentir mais o clube, sem precisar
              da experiência completa ainda.
            </p>
            <div className={s.planoAcao}>
              <Link href="/assinar?plano=flor" className={s.botaoSecundario}>
                Quero o Plano Flor
              </Link>
              <span className={s.planoAvisoSecundario}>{AVISO_INTERNACIONAL}</span>
            </div>
          </div>

          <div className={`${s.plano} ${s.planoSecundario} ${s.planoSemente}`}>
            <span className={s.planoNomeSecundario}>🌱 Plano Semente</span>
            <div className={s.precoBlocoSecundario}>
              <span className={s.planoPrecoSecundario}>R$ 39,90</span>
              <span className={s.planoFreteSecundario}>(frete incluso)</span>
            </div>
            <p className={s.planoDescricao}>
              <strong>O primeiro passo pra viver deliciosamente.</strong>{" "}
              Tiragem e foco do mês, os diários do Vitor e do Varlei,
              horóscopo e as três crônicas do mês. Recebe também o
              Classificados C21 (sem poder participar ainda).
            </p>
            <div className={s.planoAcao}>
              <Link href="/assinar?plano=semente" className={s.botaoSecundario}>
                Quero o Plano Semente
              </Link>
              <span className={s.planoAvisoSecundario}>{AVISO_INTERNACIONAL}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
