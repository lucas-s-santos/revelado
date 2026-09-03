"use client";

import { MessageSquare, Trash2 } from "lucide-react";

import { Field } from "@/components/editor/field";
import { Pular } from "@/components/editor/pular";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo do mural de recados — SPEC 8.9.
 *
 * O bloco existia no schema desde sempre e nunca teve como ser preenchido:
 * `ready: false` no registry o deixava invisível na página publicada. Este
 * passo, `guestbook-block.tsx` e `/api/guestbook` fecham o trio.
 *
 * A única escolha real aqui é "moderado?" — quem decide se um estranho
 * escreve direto na página de vocês é vocês, não o sistema. Moderado é o
 * padrão: tira o susto de um recado ruim aparecer antes de alguém ver.
 */
export function StepGuestbook({ aninhado = false }: { aninhado?: boolean } = {}) {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  const guestbook = findBlock(content, "guestbook");

  if (!guestbook) {
    return (
      <div className="step">
        {aninhado ? null : (
          <header className="step__head">
            <h2 className="step__title">Um mural de recados?</h2>
            <p className="step__lede">
              Quem abrir a página pode deixar uma mensagem — os convidados do
              casamento, os amigos, quem quiser.
            </p>
          </header>
        )}

        <button
          type="button"
          onClick={() => addBlock("guestbook")}
          className="btn-primary"
        >
          <MessageSquare size={16} aria-hidden />
          Adicionar mural de recados
        </button>

        {aninhado ? null : <Pular texto="continuar sem o mural" />}
      </div>
    );
  }

  return (
    <div className="step">
      {aninhado ? null : (
        <header className="step__head">
          <h2 className="step__title">O mural</h2>
          <p className="step__lede">
            Quem enviar um recado só o vê publicado depois — nunca antes de
            você conferir, a não ser que desligue a moderação.
          </p>
        </header>
      )}

      <Field label="Título do mural" value={guestbook.props.title} maxLength={60}>
        {(props) => (
          <input
            {...props}
            type="text"
            value={guestbook.props.title}
            maxLength={60}
            onChange={(event) =>
              patch(guestbook.id, { title: event.target.value })
            }
            className="input"
          />
        )}
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={guestbook.props.moderated}
          onChange={(event) =>
            patch(guestbook.id, { moderated: event.target.checked })
          }
        />
        Revisar cada recado antes de publicar
      </label>

      {!guestbook.props.moderated ? (
        <p className="field__hint">
          Desligado: o que for escrito aparece na hora, sem passar por
          ninguém antes.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => removeBlock(guestbook.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar o mural da página
      </button>
    </div>
  );
}
