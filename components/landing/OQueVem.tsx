import Botao from "@/components/Botao";

import s from "./OQueVem.module.css";

export default function OQueVem() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <h2 className={s.titulo}>O que chega no seu envelope?</h2>

        <div className={s.pecas}>
          <div className={`${s.cartao} ${s.cartaoAmarelo} ${s.torto1}`}>
            <h3 className={s.cartaoTitulo}>Tiragem e Foco do Mês</h3>
            <p className={s.cartaoTexto}>
              Uma tiragem de tarô que traduz a energia do mês de um jeito
              delicioso. Um foco pra te guiar ao longo dos próximos 30 dias.
            </p>
          </div>

          <div className={`${s.cartaoFoto} ${s.torto2}`}>
            <div className={s.fotoPlaceholder}>{/* TODO: imagem */}</div>
            <div className={`${s.cartaoFotoTexto} ${s.fundoLimao}`}>
              <h3 className={s.cartaoTitulo}>Diário Vitor</h3>
              <p className={s.cartaoTexto}>
                Uma carta escrita à mão pelo Vitor: crônicas, treta e humor
                real do mês dele.
              </p>
            </div>
          </div>

          <div className={`${s.cartaoFoto} ${s.torto3}`}>
            <div className={s.fotoPlaceholder}>{/* TODO: imagem */}</div>
            <div className={`${s.cartaoFotoTexto} ${s.fundoLilas}`}>
              <h3 className={s.cartaoTitulo}>Diário Varlei</h3>
              <p className={s.cartaoTexto}>
                Uma carta escrita à mão pelo Varlei: reflexão sensível e
                poética sobre viver com mais presença.
              </p>
            </div>
          </div>

          <div className={`${s.cartaoFoto} ${s.torto2}`}>
            <div className={s.fotoPlaceholder}>{/* TODO: imagem */}</div>
            <div className={`${s.cartaoFotoTexto} ${s.fundoPapel}`}>
              <h3 className={`${s.cartaoTitulo} ${s.tituloCobalto}`}>
                Caso do Acaso — Horóscopo do Mês
              </h3>
              <p className={s.cartaoTexto}>
                Uma leitura astrológica completa, escrita por nossa astróloga
                convidada, traduzindo o céu em convite pra viver melhor aqui
                embaixo.
              </p>
            </div>
          </div>

          <div className={`${s.cartaoFoto} ${s.torto4}`}>
            <img
              src="/clube21/peca-1-comer.webp"
              alt="Momento Comer, Rezar e Amar"
              className={s.foto}
            />
            <div className={`${s.cartaoFotoTexto} ${s.fundoRosa}`}>
              <h3 className={s.cartaoTitulo}>Momento Comer, Rezar e Amar</h3>
              <p className={s.cartaoTexto}>Um relato real de prazer e presença.</p>
            </div>
          </div>

          <div className={`${s.cartao} ${s.cartaoCeu} ${s.torto5}`}>
            <h3 className={s.cartaoTitulo}>Baixo Astral do Mês</h3>
            <p className={s.cartaoTexto}>
              Quando um de nós passa por um perrengue e conta sem filtro.
            </p>
          </div>

          <div className={`${s.cartao} ${s.cartaoLaranja} ${s.torto6}`}>
            <h3 className={`${s.cartaoTitulo} ${s.tituloClaro}`}>
              Saia Justa do Mês
            </h3>
            <p className={`${s.cartaoTexto} ${s.textoClaro}`}>
              A treta engraçada e cringe do mês, pra dar boas risadas.
            </p>
          </div>

          <div className={s.maoNaMassa}>
            <div className={s.maoNaMassaFotos}>
              <img
                src="/clube21/peca-5-receita.webp"
                alt="Receita do mês"
                className={s.maoNaMassaReceita}
              />
              <img
                src="/clube21/peca-4-drink.webp"
                alt="Drink do mês"
                className={s.maoNaMassaDrink}
              />
            </div>
            <div className={s.maoNaMassaTexto}>
              <h3 className={`${s.cartaoTitulo} ${s.tituloVermelho}`}>Mão na Massa</h3>
              <p className={s.cartaoTexto}>Um drink do mês, com receita completa.</p>
              <p className={s.cartaoTexto}>
                Uma receita do mês, doce ou salgada, pra fazer sozinha ou com
                uma amiga.
              </p>
            </div>
          </div>

          <div className={`${s.cartao} ${s.cartaoVerde} ${s.torto7}`}>
            <h3 className={s.cartaoTitulo}>Histórias das Membras</h3>
            <p className={s.cartaoTexto}>
              Um relato real de vida enviado por uma assinante e escolhido
              pra edição.
            </p>
          </div>
        </div>

        <div className={s.destaque}>
          <div className={s.destaqueTexto}>
            <span className={s.selo}>🍑 Exclusivos do Plano Pêssego</span>
            <div className={s.listaDestaque}>
              <p>Missões e desafios pra celebrar a vida ainda mais</p>
              <p>
                Uma carta de tarô colecionável, uma por mês, pra montar seu
                próprio baralho ao longo do ano.
              </p>
              <p>Credencial Exclusiva de Membro do Clube</p>
              <p>
                Classificados C21: um mural onde toda edição ajudamos
                assinantes a divulgar seus projetos e negócios.
              </p>
              <p>Adesivos pra colecionar.</p>
              <p>Presentes e sorteios com marcas parceiras, todo mês!</p>
            </div>
          </div>
          <div className={s.destaqueImagens}>{/* TODO: imagem */}</div>
        </div>

        <p className={s.fechamento}>E o melhor: enviamos pro mundo todo!</p>

        <div className={s.cta}>
          <Botao href="/assinar">Quero receber o meu</Botao>
        </div>
      </div>
    </section>
  );
}
