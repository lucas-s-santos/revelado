"use client";

import { StepCapsule } from "@/components/editor/steps/step-capsule";
import { StepQuiz } from "@/components/editor/steps/step-quiz";
import { StepReasons } from "@/components/editor/steps/step-reasons";
import { StepStats } from "@/components/editor/steps/step-stats";
import { StepVideo } from "@/components/editor/steps/step-video";

/**
 * Extras — motivos, quiz, números, vídeo e cápsula numa etapa só.
 *
 * Eram passos separados, e cada um ocupava uma tela inteira para mostrar um
 * título e um botão de adicionar. Telas quase vazias custam caro duas vezes:
 * alongam o índice, que é a primeira coisa que a pessoa vê e o que comunica o
 * tamanho do trabalho, e pedem várias decisões onde há uma só — "quero mais
 * alguma coisa nessa página?".
 *
 * Cabem cinco aqui porque todos começam FECHADOS: quem não quiser nenhum vê
 * cinco cartões e segue. No dia em que um deles nascer aberto, esta etapa vira
 * uma tela longa demais e a conta muda.
 *
 * Cada bloco continua sendo o mesmo componente de antes, agora em modo
 * `aninhado`: sem cabeçalho próprio e sem "Pular", que aqui seriam cinco
 * títulos e cinco saídas na mesma tela. Ninguém foi reescrito; o que mudou foi
 * onde eles moram.
 *
 * **Tema e Letra ficaram de fora desta fusão de propósito.** Aqueles dois já
 * foram um passo só e foram separados porque juntos davam uma tela longa
 * demais no celular — está escrito em `step-type.tsx`, e o motivo continua
 * valendo. Os daqui cabem porque começam fechados: quem não quiser nenhum vê
 * a lista de cartões e segue.
 */
export function StepExtras() {
  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">Quer mais alguma coisa?</h2>
        <p className="step__lede">
          Tudo aqui é opcional. Dá para seguir sem nenhum — ou voltar e
          adicionar depois.
        </p>
      </header>

      <div className="extras">
        <section className="extras__item">
          <StepReasons aninhado />
        </section>

        <section className="extras__item">
          <StepQuiz aninhado />
        </section>

        <section className="extras__item">
          <StepStats aninhado />
        </section>

        <section className="extras__item">
          <StepVideo aninhado />
        </section>

        <section className="extras__item">
          <StepCapsule aninhado />
        </section>
      </div>
    </div>
  );
}
