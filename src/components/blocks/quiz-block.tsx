"use client";

import { useState } from "react";

import type { PropsOf } from "@/lib/blocks/schema";

/**
 * Quiz do casal — SPEC 7.2.
 *
 * É PRESENTE, NÃO PROVA. A diferença muda o componente inteiro:
 *
 *  - não há placar. Acertar rende uma reação, errar rende outra, e nenhuma
 *    das duas é nota;
 *  - errar não trava nada: a próxima pergunta vem igual;
 *  - o recado do fim aparece para quem acertou tudo e para quem não acertou
 *    nada. Ele é o presente; o quiz é só o caminho até ele.
 *
 * Um quiz que diz "você errou 4 de 6" para a pessoa que recebeu a página
 * transforma carinho em avaliação. Não é o que se está entregando aqui.
 *
 * Cliente porque tem estado. Sem `useEffect`: tudo acontece por clique, então
 * não há nada para sincronizar depois da hidratação.
 */
export function QuizBlock({ props }: { props: PropsOf<"quiz"> }) {
  const [at, setAt] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const questions = props.questions;
  const question = questions[at];

  if (questions.length === 0) return null;

  if (done || !question) {
    return (
      <section className="block-quiz block-quiz--end">
        <h2 className="block-quiz__title">{props.title}</h2>

        {props.reward ? (
          <p className="block-quiz__reward">{props.reward}</p>
        ) : (
          <p className="block-quiz__reward">
            Acertando ou não, você me conhece melhor que ninguém.
          </p>
        )}
      </section>
    );
  }

  const respondida = chosen !== null;
  const acertou = chosen === question.answer;
  const ultima = at === questions.length - 1;

  function escolher(index: number) {
    if (respondida) return;
    setChosen(index);
  }

  function avancar() {
    setChosen(null);
    if (ultima) setDone(true);
    else setAt((value) => value + 1);
  }

  return (
    <section className="block-quiz">
      <h2 className="block-quiz__title">{props.title}</h2>

      <p className="block-quiz__count" data-numeric>
        {at + 1} de {questions.length}
      </p>

      <p className="block-quiz__question">{question.text}</p>

      <ul className="block-quiz__options">
        {question.options.map((option, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => escolher(index)}
              disabled={respondida}
              data-chosen={respondida && index === chosen ? "" : undefined}
              data-right={respondida && index === question.answer ? "" : undefined}
              className="block-quiz__option"
            >
              {option}
            </button>
          </li>
        ))}
      </ul>

      {respondida ? (
        <div className="block-quiz__after">
          {/* Nenhuma das duas frases é nota. A de baixo não corrige ninguém. */}
          <p className="block-quiz__react">
            {acertou ? "Essa você sabia." : "Essa era pegadinha."}
          </p>

          <button
            type="button"
            onClick={avancar}
            className="block-quiz__next"
          >
            {ultima ? "Ver o final" : "Próxima"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
