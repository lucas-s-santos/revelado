"use client";

import { Field } from "@/components/editor/field";
import { blockProps } from "@/lib/blocks/schema";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/** Passo 1 — Quem. Título e subtítulo da capa (SPEC 8.4). */
export function StepWho() {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);

  const hero = findBlock(content, "hero");
  if (!hero) return null;

  const titleMax = blockProps.hero.shape.title.maxLength ?? 80;
  const subtitleMax = 120;

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">Para quem é essa página?</h2>
        <p className="step__lede">
          É a primeira coisa que a pessoa vê quando abre o link.
        </p>
      </header>

      <Field
        label="Título da capa"
        hint="Os nomes de vocês, ou o que você diria em voz alta ao entregar."
        value={hero.props.title}
        maxLength={titleMax}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            value={hero.props.title}
            maxLength={titleMax}
            placeholder="Marina e Téo"
            onChange={(event) => patch(hero.id, { title: event.target.value })}
            className="input"
          />
        )}
      </Field>

      <Field
        label="Uma linha embaixo (opcional)"
        hint="Uma data, um lugar, uma piada interna."
        value={hero.props.subtitle ?? ""}
        maxLength={subtitleMax}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            value={hero.props.subtitle ?? ""}
            maxLength={subtitleMax}
            placeholder="desde aquele dia na fila do cinema"
            onChange={(event) =>
              patch(hero.id, { subtitle: event.target.value })
            }
            className="input"
          />
        )}
      </Field>
    </div>
  );
}
