"use client";

import { HelpCircle, Plus, Trash2 } from "lucide-react";

import { Field } from "@/components/editor/field";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo do quiz — SPEC 7.2 (`quiz`).
 *
 * Opcional, como música e linha do tempo: entra por escolha e sai pela mesma
 * porta. Quiz vazio trava a publicação, então sem a saída a pessoa ficaria
 * presa num bloco que ela nem quis.
 *
 * A resposta certa se marca clicando na opção. Não há campo "índice da
 * resposta": índice é linguagem de sistema, e quem monta a página pensa em
 * "essa é a certa", não em "answer = 2".
 */

const MAX_PERGUNTAS = 12;
const MAX_OPCOES = 4;

export function StepQuiz() {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  const quiz = findBlock(content, "quiz");

  if (!quiz) {
    return (
      <div className="step">
        <header className="step__head">
          <h2 className="step__title">Um quiz sobre vocês?</h2>
          <p className="step__lede">
            Perguntas que só quem viveu junto sabe responder. Opcional — e
            errar faz parte da graça.
          </p>
        </header>

        <button
          type="button"
          onClick={() => addBlock("quiz")}
          className="btn-primary"
        >
          <HelpCircle size={16} aria-hidden />
          Adicionar quiz
        </button>
      </div>
    );
  }

  const perguntas = quiz.props.questions;
  const escreve = (proximas: typeof perguntas) =>
    patch(quiz.id, { questions: proximas });

  const alterarTexto = (i: number, texto: string) =>
    escreve(perguntas.map((q, k) => (k === i ? { ...q, text: texto } : q)));

  const alterarOpcao = (i: number, o: number, valor: string) =>
    escreve(
      perguntas.map((q, k) =>
        k === i
          ? { ...q, options: q.options.map((op, j) => (j === o ? valor : op)) }
          : q,
      ),
    );

  const marcarCerta = (i: number, o: number) =>
    escreve(perguntas.map((q, k) => (k === i ? { ...q, answer: o } : q)));

  const addOpcao = (i: number) =>
    escreve(
      perguntas.map((q, k) =>
        k === i && q.options.length < MAX_OPCOES
          ? { ...q, options: [...q.options, ""] }
          : q,
      ),
    );

  /**
   * Tirar uma opção pode derrubar a resposta certa: se a removida era a certa,
   * ou se o índice dela passa a apontar para fora da lista, a pergunta ficaria
   * sem resposta possível — e o schema recusaria salvar o rascunho inteiro.
   */
  const removerOpcao = (i: number, o: number) =>
    escreve(
      perguntas.map((q, k) => {
        if (k !== i || q.options.length <= 2) return q;

        const options = q.options.filter((_, j) => j !== o);
        const answer =
          q.answer === o ? 0 : q.answer > o ? q.answer - 1 : q.answer;

        return { ...q, options, answer };
      }),
    );

  const removerPergunta = (i: number) =>
    escreve(perguntas.filter((_, k) => k !== i));

  const addPergunta = () =>
    escreve([
      ...perguntas,
      { id: crypto.randomUUID(), text: "", options: ["", ""], answer: 0 },
    ]);

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">O quiz de vocês</h2>
        <p className="step__lede">
          Quem recebe responde. Não tem nota nem placar — o recado do fim
          aparece de qualquer jeito.
        </p>
      </header>

      <Field label="Título do quiz" value={quiz.props.title} maxLength={60}>
        {(props) => (
          <input
            {...props}
            type="text"
            value={quiz.props.title}
            maxLength={60}
            onChange={(e) => patch(quiz.id, { title: e.target.value })}
            className="input"
          />
        )}
      </Field>

      {perguntas.length === 0 ? (
        <p className="step__empty">
          Nenhuma pergunta ainda. Comece por algo que só vocês dois saberiam.
        </p>
      ) : null}

      <ol className="quiz-edit">
        {perguntas.map((pergunta, i) => (
          <li key={pergunta.id} className="quiz-edit__item">
            <Field
              label={"Pergunta " + (i + 1)}
              value={pergunta.text}
              maxLength={160}
            >
              {(props) => (
                <input
                  {...props}
                  type="text"
                  value={pergunta.text}
                  maxLength={160}
                  placeholder="Onde a gente se viu pela primeira vez?"
                  onChange={(e) => alterarTexto(i, e.target.value)}
                  className="input"
                />
              )}
            </Field>

            <p className="field__label">Opções — clique na certa</p>

            <ul className="quiz-edit__options">
              {pergunta.options.map((opcao, o) => (
                <li key={o} className="quiz-edit__option">
                  <button
                    type="button"
                    onClick={() => marcarCerta(i, o)}
                    aria-pressed={pergunta.answer === o}
                    aria-label={"Marcar opção " + (o + 1) + " como certa"}
                    className="quiz-edit__mark"
                  />

                  <input
                    type="text"
                    value={opcao}
                    maxLength={80}
                    placeholder={"Opção " + (o + 1)}
                    onChange={(e) => alterarOpcao(i, o, e.target.value)}
                    className="input"
                  />

                  {pergunta.options.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => removerOpcao(i, o)}
                      aria-label={"Remover opção " + (o + 1)}
                      className="quiz-edit__drop"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            {pergunta.options.length < MAX_OPCOES ? (
              <button
                type="button"
                onClick={() => addOpcao(i)}
                className="btn-quiet"
              >
                <Plus size={14} aria-hidden />
                Mais uma opção
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => removerPergunta(i)}
              className="moment__remove"
            >
              <Trash2 size={14} aria-hidden />
              Remover esta pergunta
            </button>
          </li>
        ))}
      </ol>

      {perguntas.length < MAX_PERGUNTAS ? (
        <button type="button" onClick={addPergunta} className="btn-quiet">
          <Plus size={16} aria-hidden />
          Adicionar pergunta
        </button>
      ) : null}

      <Field
        label="O recado do fim (opcional)"
        hint="Aparece para quem acertou tudo e para quem não acertou nada."
        value={quiz.props.reward ?? ""}
        maxLength={400}
      >
        {(props) => (
          <textarea
            {...props}
            value={quiz.props.reward ?? ""}
            maxLength={400}
            rows={3}
            placeholder="Acertando ou não, é você que eu escolho todo dia."
            onChange={(e) => patch(quiz.id, { reward: e.target.value })}
            className="input input--area"
          />
        )}
      </Field>

      <button
        type="button"
        onClick={() => removeBlock(quiz.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar o quiz da página
      </button>
    </div>
  );
}
