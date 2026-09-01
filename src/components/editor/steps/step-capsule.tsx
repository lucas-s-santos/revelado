"use client";

import { Lock, Trash2 } from "lucide-react";

import { Field } from "@/components/editor/field";
import { Pular } from "@/components/editor/pular";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo da cápsula do tempo.
 *
 * O bloco existia no schema desde o começo e nunca teve como ser preenchido —
 * ficava `ready: false` no registry, ou seja, invisível na página. Este passo
 * e o `capsule-block.tsx` fecham o par.
 *
 * O valor dela é resolver um medo concreto: a pessoa quer preparar a página
 * com antecedência e não quer estragar a surpresa mandando cedo demais. Com a
 * cápsula ela manda quando quiser, e a parte que importa fica lacrada.
 */
export function StepCapsule({ aninhado = false }: { aninhado?: boolean } = {}) {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  const capsule = findBlock(content, "capsule");

  if (!capsule) {
    return (
      <div className="step">
        {aninhado ? null : (
          <header className="step__head">
            <h2 className="step__title">Uma cápsula do tempo?</h2>
            <p className="step__lede">
              Um recado que só abre na data que você marcar. Dá para mandar o
              link hoje sem estragar a surpresa — do outro lado aparece um
              contador.
            </p>
          </header>
        )}

        <button
          type="button"
          onClick={() => addBlock("capsule")}
          className="btn-primary"
        >
          <Lock size={16} aria-hidden />
          Adicionar cápsula
        </button>

        {aninhado ? null : <Pular texto="continuar sem cápsula" />}
      </div>
    );
  }

  // `datetime-local` quer "AAAA-MM-DDTHH:MM" no horário local; o schema guarda
  // ISO em UTC. Sem essa conversão o campo mostra a hora errada por fuso.
  const paraCampo = (iso: string) => {
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const vazio = capsule.props.text.trim().length === 0;

  return (
    <div className="step">
      {aninhado ? null : (
        <header className="step__head">
          <h2 className="step__title">A cápsula do tempo</h2>
          <p className="step__lede">
            Fica lacrada até a data. Antes disso, quem abrir o link vê só o
            contador — nem no código da página o texto aparece. O celular ao
            lado mostra exatamente isso, porque é o que a outra pessoa vai ver.
          </p>
        </header>
      )}

      <Field label="Abre em" hint="Data e hora, no seu fuso.">
        {(props) => (
          <input
            {...props}
            type="datetime-local"
            value={paraCampo(capsule.props.openAt)}
            onChange={(event) => {
              const valor = event.target.value;
              if (!valor) return;
              patch(capsule.id, {
                openAt: new Date(valor).toISOString(),
              });
            }}
            className="input"
          />
        )}
      </Field>

      <Field
        label="O que fica guardado"
        hint="Só quem abrir depois da data vai ler."
        value={capsule.props.text}
        maxLength={2000}
      >
        {(props) => (
          <textarea
            {...props}
            rows={6}
            value={capsule.props.text}
            maxLength={2000}
            placeholder="O que você quer dizer só naquele dia?"
            onChange={(event) =>
              patch(capsule.id, { text: event.target.value })
            }
            className="input"
          />
        )}
      </Field>

      {vazio ? (
        <p className="step__empty">
          A cápsula está vazia. Sem texto, ela não aparece na página.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => removeBlock(capsule.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar a cápsula da página
      </button>
    </div>
  );
}
