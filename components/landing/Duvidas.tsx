"use client";

import { useState } from "react";

import Botao from "@/components/Botao";

import s from "./Duvidas.module.css";

const PERGUNTAS: [string, string][] = [
  [
    "Moro fora do Brasil! Posso assinar?",
    "Claro! Enviamos pro mundo todo e o frete já vem incluso no valor de cada plano!",
  ],
  [
    "Como funciona a entrega?",
    "Depois que você assina, a gente monta seu envelope à mão na semana da postagem e envia sem rastreio, direto pro seu endereço.",
  ],
  [
    "Posso cancelar quando quiser?",
    "Pode, sim. É só mandar um e-mail pra gente em comercial@clubexxi.com.br que a gente cancela e te responde confirmando. A edição que você já pagou ainda é sua e chega normalmente — o cancelamento vale a partir da cobrança seguinte.",
  ],
  [
    "Posso trocar de plano depois?",
    "Pode! Manda um e-mail pra gente e a gente ajusta pra valer na sua próxima renovação.",
  ],
  ["Quando a carta é enviada?", "Sempre na última semana de cada mês."],
  [
    "Preciso entender de tarô pra participar?",
    "Não! O Clube 21 é pra qualquer pessoa. O tarô é só um dos ingredientes — a gente te guia mês a mês.",
  ],
];

export default function Duvidas() {
  const [aberta, setAberta] = useState<number | null>(0);

  return (
    <section className={s.secao}>
      <div className={s.conteudo}>
        <h2 className={s.titulo}>Dúvidas</h2>
        <div className={s.lista}>
          {PERGUNTAS.map(([pergunta, resposta], i) => {
            const expandida = aberta === i;
            return (
              <div key={pergunta} className={s.item}>
                <button
                  type="button"
                  onClick={() => setAberta((atual) => (atual === i ? null : i))}
                  aria-expanded={expandida}
                  className={s.pergunta}
                >
                  <span>{pergunta}</span>
                  <span className={s.sinal}>{expandida ? "–" : "+"}</span>
                </button>
                {expandida && <p className={s.resposta}>{resposta}</p>}
              </div>
            );
          })}
        </div>
        <div className={s.cta}>
          <Botao href="/assinar">Quero assinar!</Botao>
        </div>
      </div>
    </section>
  );
}
