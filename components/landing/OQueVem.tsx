import Botao from "@/components/Botao";

import s from "./OQueVem.module.css";

export default function OQueVem() {
  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <h2 className={s.titulo}>O que chega no seu envelope?</h2>

        <div className={s.pecas}>
          <div className={s.cartaoFoto}>
            <div className={s.fotoMoldura}>
              <img
                src="/clube21/env-tiragem.webp"
                alt="Tiragem e Foco do Mês"
                className={`${s.foto} ${s.fotoTortoA}`}
              />
            </div>
            <div className={`${s.cartaoFotoTexto} ${s.cartaoAmarelo}`}>
              <h3 className={s.cartaoTitulo}>Tiragem e Foco do Mês</h3>
              <p className={s.cartaoTexto}>
                Uma tiragem de tarô que traduz a energia do mês de um jeito
                delicioso. Um foco pra te guiar ao longo dos próximos 30
                dias.
              </p>
            </div>
          </div>

          <div className={s.cartaoFoto}>
            <div className={s.fotoMoldura}>
              <img
                src="/clube21/env-diario-vitor.webp"
                alt="Diário Vitor"
                className={`${s.foto} ${s.fotoTortoB}`}
              />
            </div>
            <div className={`${s.cartaoFotoTexto} ${s.fundoLimao}`}>
              <h3 className={s.cartaoTitulo}>Diário Vitor</h3>
              <p className={s.cartaoTexto}>
                Uma carta escrita à mão pelo Vitor: crônicas, treta e humor
                real do mês dele.
              </p>
            </div>
          </div>

          <div className={s.cartaoFoto}>
            <div className={s.fotoMoldura}>
              <img
                src="/clube21/env-diario-varlei.webp"
                alt="Diário Varlei"
                className={`${s.foto} ${s.fotoTortoA}`}
              />
            </div>
            <div className={`${s.cartaoFotoTexto} ${s.fundoLilas}`}>
              <h3 className={s.cartaoTitulo}>Diário Varlei</h3>
              <p className={s.cartaoTexto}>
                Uma carta escrita à mão pelo Varlei: reflexão sensível e
                poética sobre viver com mais presença.
              </p>
            </div>
          </div>

          <div className={s.cartaoFoto}>
            <div className={s.fotoMoldura}>
              <img
                src="/clube21/env-caso-do-acaso.webp"
                alt="Caso do Acaso — Horóscopo do Mês"
                className={`${s.foto} ${s.fotoTortoB}`}
              />
            </div>
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

          <div className={s.cartaoFoto}>
            <div className={s.fotoMoldura}>
              <img
                src="/clube21/env-comer-rezar-amar.webp"
                alt="Momento Comer, Rezar e Amar"
                className={`${s.foto} ${s.fotoTortoA}`}
              />
            </div>
            <div className={`${s.cartaoFotoTexto} ${s.fundoRosa}`}>
              <h3 className={s.cartaoTitulo}>Momento Comer, Rezar e Amar</h3>
              <p className={s.cartaoTexto}>Um relato real de prazer e presença.</p>
            </div>
          </div>

          <div className={s.cartaoFoto}>
            <div className={s.fotoMoldura}>
              <img
                src="/clube21/env-baixo-astral.webp"
                alt="Baixo Astral do Mês"
                className={`${s.foto} ${s.fotoTortoB}`}
              />
            </div>
            <div className={`${s.cartaoFotoTexto} ${s.cartaoCeu}`}>
              <h3 className={s.cartaoTitulo}>Baixo Astral do Mês</h3>
              <p className={s.cartaoTexto}>
                Quando um de nós passa por um perrengue e conta sem filtro.
                Pra você dar boas risadas!
              </p>
            </div>
          </div>

          <div className={s.cartaoFoto}>
            <div className={s.fotoMoldura}>
              <img
                src="/clube21/env-saia-justa.webp"
                alt="Saia Justa do Mês"
                className={`${s.foto} ${s.fotoTortoA}`}
              />
            </div>
            <div className={`${s.cartaoFotoTexto} ${s.cartaoLaranja}`}>
              <h3 className={s.cartaoTitulo}>Saia Justa do Mês</h3>
              <p className={s.cartaoTexto}>
                A treta engraçada e cringe do mês, pra dar boas risadas.
              </p>
            </div>
          </div>

          <div className={s.maoNaMassa}>
            <div className={s.maoNaMassaFotos}>
              <img
                src="/clube21/env-receita.webp"
                alt="Receita do mês"
                className={s.maoNaMassaReceita}
              />
              <img
                src="/clube21/env-drink.webp"
                alt="Drink do mês"
                className={s.maoNaMassaDrink}
              />
            </div>
            <div className={s.maoNaMassaTexto}>
              <h3 className={`${s.cartaoTitulo} ${s.tituloVermelho}`}>Mão na Massa</h3>
              <p className={s.cartaoTexto}>
                Todo mês algo prazeroso e temático pra você fazer: uma
                receita, um drink, uma cerâmica fria... sempre algo especial
                :)
              </p>
            </div>
          </div>

          <div className={s.cartaoFoto}>
            <div className={s.fotoMoldura}>
              <img
                src="/clube21/env-historias.webp"
                alt="Histórias das Membras"
                className={`${s.foto} ${s.fotoTortoB}`}
              />
            </div>
            <div className={`${s.cartaoFotoTexto} ${s.cartaoVerde}`}>
              <h3 className={s.cartaoTitulo}>Histórias das Membras</h3>
              <p className={s.cartaoTexto}>
                Um relato real de vida enviado por uma assinante e escolhido
                pra edição.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={s.destaque}>
        <div className={s.destaqueInterno}>
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
          <div className={s.destaqueImagens}>
            <img
              src="/clube21/env-missoes.webp"
              alt="Missões do mês"
              className={s.fotoMissoes}
            />
          </div>
          <div className={s.destaqueCta}>
            <Botao href="/assinar">Quero fazer parte do clube!</Botao>
          </div>
        </div>
      </div>

      <div
        className={s.faixaFechamento}
        role="img"
        aria-label="E o melhor: enviamos pro mundo todo!"
      >
        <img
          src="/clube21/caixa de correio.png"
          alt=""
          aria-hidden="true"
          className={s.fotoCaixaCorreio}
        />
        <img
          src="/clube21/entregamos pro mundo todo.png"
          alt=""
          aria-hidden="true"
          className={s.fotoLettering}
        />
      </div>
    </section>
  );
}
