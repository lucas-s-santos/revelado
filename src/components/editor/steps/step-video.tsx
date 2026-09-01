"use client";

import { Trash2, Video } from "lucide-react";

import { Field } from "@/components/editor/field";
import { Pular } from "@/components/editor/pular";
import { parseMusicUrl } from "@/lib/music";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo do vídeo.
 *
 * O bloco existia no schema desde a fase 3 e nunca teve como ser preenchido —
 * ficava `ready: false` no registry, ou seja, invisível na página. Este passo e
 * o `video-block.tsx` fecham o par.
 *
 * **Só YouTube, e é decisão, não limitação.** O schema também prevê
 * `provider: "upload"`, e este passo nunca o cria: hospedar vídeo é banda e
 * custo por gigabyte, pelo mesmo motivo que a regra 10 proíbe hospedar música.
 *
 * A URL é lida por `parseMusicUrl`, o mesmo analisador do passo de música.
 * Escrever um segundo aqui significaria manter duas listas de formatos de link
 * do YouTube — e elas iam divergir no dia em que o YouTube inventasse a
 * terceira.
 */
export function StepVideo({ aninhado = false }: { aninhado?: boolean } = {}) {
  const content = useEditorStore((state) => state.content);
  const patch = useEditorStore((state) => state.patchBlockProps);
  const addBlock = useEditorStore((state) => state.addBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

  const video = findBlock(content, "video");

  if (!video) {
    return (
      <div className="step">
        {aninhado ? null : (
          <header className="step__head">
            <h2 className="step__title">Um vídeo de vocês?</h2>
            <p className="step__lede">
              Aquele que você já tem no YouTube — a viagem, a festa, o pedido.
            </p>
          </header>
        )}

        <button
          type="button"
          onClick={() => addBlock("video")}
          className="btn-primary"
        >
          <Video size={16} aria-hidden />
          Adicionar vídeo
        </button>

        {aninhado ? null : <Pular texto="continuar sem vídeo" />}
      </div>
    );
  }

  const lido = parseMusicUrl(video.props.ref);
  // Guarda o que a pessoa digitou. Só vira `ref` quando dá para reconhecer um
  // vídeo do YouTube — assim um link pela metade não apaga o que já valia.
  const reconhecido = lido?.provider === "youtube";

  return (
    <div className="step">
      {aninhado ? null : (
        <header className="step__head">
          <h2 className="step__title">O vídeo</h2>
          <p className="step__lede">
            Cole o link do YouTube. Ele só começa quando a pessoa tocar no play.
          </p>
        </header>
      )}

      <Field
        label="Link do YouTube"
        hint="Cole o endereço do vídeo — youtube.com/watch ou youtu.be."
      >
        {(props) => (
          <input
            {...props}
            type="url"
            inputMode="url"
            value={video.props.ref}
            placeholder="https://youtu.be/…"
            onChange={(event) => {
              const texto = event.target.value;
              const achado = parseMusicUrl(texto);
              patch(video.id, {
                provider: "youtube" as const,
                // Reconheceu: guarda o id, que é o que o embed precisa. Não
                // reconheceu: guarda o texto cru, para o campo não apagar o
                // que a pessoa está no meio de colar.
                ref:
                  achado?.provider === "youtube" ? achado.trackId : texto,
              });
            }}
            className="input"
          />
        )}
      </Field>

      {video.props.ref.trim().length === 0 ? (
        <p className="step__empty">
          Sem link, o vídeo não aparece na página.
        </p>
      ) : reconhecido || /^[\w-]{11}$/.test(video.props.ref.trim()) ? (
        <p className="step__hint">
          Reconhecido. O celular ao lado já mostra onde ele entra.
        </p>
      ) : (
        <p role="alert" className="field__error">
          Não reconheci esse link. Ele precisa ser de um vídeo do YouTube.
        </p>
      )}

      <button
        type="button"
        onClick={() => removeBlock(video.id)}
        className="moment__remove"
      >
        <Trash2 size={14} aria-hidden />
        Tirar o vídeo da página
      </button>
    </div>
  );
}
