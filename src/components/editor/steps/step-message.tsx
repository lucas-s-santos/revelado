"use client";

import { Field } from "@/components/editor/field";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/** Passo 4 — Mensagem. A carta (SPEC 8.4). */
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
