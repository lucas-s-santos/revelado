"use client";

import { Field } from "@/components/editor/field";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/** Passo da carta — texto, assinatura e como ela se revela (SPEC 8.4). */

const REVEALS = [
  {
    id: "plain" as const,
    label: "Direta",
    hint: "o texto já aparece",
  },
  {
    id: "envelope" as const,
    label: "Em envelope",
    hint: "fechada; quem recebe abre",
  },
];
export function StepMessage() {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);

  const letter = findBlock(content, "letter");

  if (!letter) {
    return (
      <div className="step">
        <header className="step__head">
          <h2 className="step__title">Esta página não tem carta</h2>
          <p className="step__lede">Siga para o estilo.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">O que você quer dizer?</h2>
        <p className="step__lede">
          Escreva como você fala. Uma linha pula parágrafo, duas separam blocos.
        </p>
      </header>

      {/* Formato é prop da mesma carta, não outro bloco: trocar aqui nunca
          apaga o que já foi escrito. */}
      <fieldset className="fieldset">
        <legend className="field__label">Como ela aparece</legend>
        <div className="chips">
          {REVEALS.map((reveal) => (
            <button
              key={reveal.id}
              type="button"
              onClick={() => patch(letter.id, { reveal: reveal.id })}
              aria-pressed={letter.props.reveal === reveal.id}
              className="chip"
            >
              <span>{reveal.label}</span>
              <small>{reveal.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <Field
        label="Sua mensagem"
        hint="Ninguém acerta de primeira. Escreva bruto agora e volte depois."
        value={letter.props.text}
        maxLength={4000}
      >
        {(props) => (
          <textarea
            {...props}
            value={letter.props.text}
            maxLength={4000}
            rows={9}
            placeholder="Eu não lembro do filme. Lembro que você riu…"
            onChange={(event) => patch(letter.id, { text: event.target.value })}
            className="input input--area"
          />
        )}
      </Field>

      <Field
        label="Assinatura (opcional)"
        value={letter.props.signature ?? ""}
        maxLength={60}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            value={letter.props.signature ?? ""}
            maxLength={60}
            placeholder="Téo"
            onChange={(event) =>
              patch(letter.id, { signature: event.target.value })
            }
            className="input"
          />
        )}
      </Field>
    </div>
  );
}
