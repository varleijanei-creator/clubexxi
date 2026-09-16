import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Política de Privacidade — Clube 21",
};

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-zinc-900">{titulo}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-zinc-700">
        {children}
      </div>
    </section>
  );
}

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-zinc-900">
            Política de Privacidade — Clube 21
          </h1>
          <p className="text-sm text-zinc-500">
            Última atualização: 11 de setembro de 2026
          </p>
          <p className="text-sm leading-relaxed text-zinc-700">
            O Clube 21 é um clube de assinatura de cartas, operado por
            61.685.219 VARLEI JOSE JANEI, CNPJ 61.685.219/0001-66, com sede
            na Av. 2 DV, 261, Diário Ville, Rio Claro/SP, CEP 13.503-569.
          </p>
          <p className="text-sm leading-relaxed text-zinc-700">
            Esta página explica quais dados seus a gente coleta, por que
            coleta e o que você pode fazer a respeito. Escrevemos em
            português claro de propósito: se alguma parte ficar confusa,
            escreve pra gente que a gente explica.
          </p>
        </header>

        <Secao titulo="Quais dados a gente coleta">
          <p>Quando você assina o Clube 21, pedimos:</p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Nome completo</strong> — pra escrever no envelope e pra
              te chamar pelo nome nos nossos e-mails.
            </li>
            <li>
              <strong>E-mail</strong> — pra confirmar sua assinatura e falar
              com você.
            </li>
            <li>
              <strong>Telefone</strong> — pra te adicionar na comunidade do
              WhatsApp e pra contato, se precisarmos.
            </li>
            <li>
              <strong>CPF</strong> — exigido pela operadora de pagamento
              para emitir a cobrança.
            </li>
            <li>
              <strong>Endereço completo</strong> — porque a carta vai mesmo
              pelo correio.
            </li>
          </ul>
          <p>
            Os dados do seu <strong>cartão de crédito não passam por nós</strong>{" "}
            e não ficam guardados nos nossos sistemas. Eles são digitados
            direto na tela do Asaas, nossa operadora de pagamento, que é
            quem processa a cobrança.
          </p>
          <p>
            Também registramos informações sobre a sua assinatura: qual
            plano você escolheu, quando assinou, o histórico de pagamentos
            e quais edições já te enviamos.
          </p>
        </Secao>

        <Secao titulo="Por que a gente usa esses dados">
          <ul className="list-disc pl-5">
            <li>
              <strong>Pra entregar o que você assinou:</strong> montar e
              postar o seu envelope, cobrar a mensalidade e te dar acesso à
              comunidade.
            </li>
            <li>
              <strong>Pra falar com você:</strong> confirmações, avisos
              sobre a sua assinatura e novidades do clube. Todo e-mail de
              novidade tem link de descadastro, e cancelar isso não afeta a
              sua assinatura.
            </li>
            <li>
              <strong>Pra cumprir obrigações legais:</strong> guardar
              registros fiscais e contábeis pelo prazo que a lei exige.
            </li>
          </ul>
        </Secao>

        <Secao titulo="Com quem a gente compartilha">
          <p>Só com quem é necessário pra o clube funcionar:</p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Asaas</strong> — processamento dos pagamentos.
            </li>
            <li>
              <strong>Correios</strong> — entrega das cartas.
            </li>
            <li>
              <strong>Supabase, Vercel e Resend</strong> — os serviços de
              tecnologia que hospedam nosso site, guardam os dados e enviam
              nossos e-mails.
            </li>
          </ul>
          <p>
            A gente <strong>não vende seus dados</strong> e não compartilha
            sua lista com ninguém pra fins de publicidade.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo a gente guarda">
          <p>
            Enquanto você for assinante, e por mais cinco anos depois do fim
            da assinatura — prazo em que a lei exige que a gente mantenha
            registros fiscais. Passado isso, os dados são apagados.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            A Lei Geral de Proteção de Dados (Lei 13.709/2018) te garante o
            direito de:
          </p>
          <ul className="list-disc pl-5">
            <li>saber quais dados seus a gente tem;</li>
            <li>corrigir dados errados ou desatualizados;</li>
            <li>
              pedir a exclusão dos seus dados, respeitados os prazos legais
              acima;
            </li>
            <li>receber uma cópia dos seus dados;</li>
            <li>retirar seu consentimento e cancelar a assinatura a qualquer momento.</li>
          </ul>
          <p>
            Pra exercer qualquer um desses direitos, é só mandar um e-mail
            pra{" "}
            <a
              href="mailto:comercial@clubexxi.com.br"
              className="underline underline-offset-2"
            >
              comercial@clubexxi.com.br
            </a>
            . A gente responde em até 15 dias.
          </p>
        </Secao>

        <Secao titulo="Cancelamento">
          <p>
            Você pode cancelar sua assinatura quando quiser, sem burocracia,
            mandando um e-mail pra{" "}
            <a
              href="mailto:comercial@clubexxi.com.br"
              className="underline underline-offset-2"
            >
              comercial@clubexxi.com.br
            </a>
            . O cancelamento vale a partir da próxima cobrança — a edição do
            mês que você já pagou ainda é sua e será enviada normalmente.
          </p>
        </Secao>

        <Secao titulo="Cookies">
          <p>
            Nosso site usa apenas os cookies necessários pro funcionamento
            das páginas e do formulário de assinatura. A gente não usa
            cookies de publicidade nem rastreamento pra anúncios.
          </p>
        </Secao>

        <Secao titulo="Segurança">
          <p>
            Os dados ficam guardados em serviços com criptografia e acesso
            restrito. O acesso ao cadastro das assinantes é limitado às duas
            pessoas que tocam o clube: Vitor e Varlei.
          </p>
        </Secao>

        <Secao titulo="Mudanças nesta política">
          <p>
            Se a gente mudar alguma coisa aqui, a data lá no topo muda
            junto. Se for uma mudança importante, a gente avisa por e-mail.
          </p>
        </Secao>

        <Secao titulo="Contato">
          <p>Qualquer dúvida sobre seus dados ou sobre esta política:</p>
          <p>
            <strong>
              <a
                href="mailto:comercial@clubexxi.com.br"
                className="underline underline-offset-2"
              >
                comercial@clubexxi.com.br
              </a>
            </strong>
          </p>
        </Secao>
      </div>
    </div>
  );
}
