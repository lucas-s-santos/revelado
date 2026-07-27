"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { Logo } from "@/components/chrome/logo";
import { SaveIndicator } from "@/components/editor/save-indicator";
import { StepMessage } from "@/components/editor/steps/step-message";
import { StepPhotos } from "@/components/editor/steps/step-photos";
import { StepStyle } from "@/components/editor/steps/step-style";
import { StepWhen } from "@/components/editor/steps/step-when";
import { StepWho } from "@/components/editor/steps/step-who";
import { PhoneFrame } from "@/components/preview/phone-frame";
import { useAutosave } from "@/hooks/use-autosave";
import { track } from "@/lib/analytics";
import type { SiteContent } from "@/lib/blocks/schema";
import { collectMediaIds, mediaMapFor } from "@/lib/media";
import { useEditorStore } from "@/stores/editor-store";

/**
 * O editor — SPEC 8.4.
 *
 * Layout desktop: duas colunas, controles à esquerda (420px) e o `PhoneFrame`
 * sticky à direita. Mobile: preview fixo no topo (40vh) e os controles embaixo.
 *
 * O preview lê o mesmo store com `useDeferredValue`: digitar mantém o campo
 * respondendo na hora e o mockup atualiza logo atrás, sem travar a digitação.
 */

const STEPS = [
  { id: "quem", label: "Quem", Component: StepWho },
  { id: "quando", label: "Quando", Component: StepWhen },
  { id: "fotos", label: "Fotos", Component: StepPhotos },
  { id: "mensagem", label: "Mensagem", Component: StepMessage },
  { id: "estilo", label: "Estilo", Component: StepStyle },
] as const;

export function EditorShell({
  draftId,
  slug,
  occasionId,
  content,
  published,
}: {
  draftId: string;
  slug: string;
  occasionId: string;
  content: SiteContent;
  published: boolean;
}) {
  const load = useEditorStore((state) => state.load);
  const step = useEditorStore((state) => state.step);
  const setStep = useEditorStore((state) => state.setStep);
  const liveContent = useEditorStore((state) => state.content);

  const [ready, setReady] = useState(false);

  // Hidrata do servidor uma vez. O servidor é a fonte (anti-padrão 10).
  useEffect(() => {
    load(draftId, content);
    setReady(true);
    void track("editor_opened", { occasion: occasionId });
  }, [draftId, content, occasionId, load]);

  useAutosave();
  useUndoShortcuts();

  // O preview fica um tique atrás do campo, nunca na frente.
  const previewContent = useDeferredValue(liveContent ?? content);

  const current = STEPS[step] ?? STEPS[0];
  const Step = current.Component;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="editor" data-occasion={occasionId}>
      <header className="editor__bar">
        <Logo size={26} showName={false} />

        <p className="editor__crumb">
          <span className="eyebrow">montando</span>
          <span className="hidden sm:inline">/p/{slug}</span>
        </p>

        <SaveIndicator />
      </header>

      {published ? (
        <p role="alert" className="editor__locked">
          Esta página já foi publicada — o QR Code dela já está impresso. Para
          mudar alguma coisa, use o painel.
        </p>
      ) : null}

      <div className="editor__body">
        <section className="editor__preview" aria-label="Prévia da página">
          <PhoneFrame
            content={previewContent}
            interactive
            media={mediaMapFor(draftId, collectMediaIds(previewContent))}
            className="editor__phone"
          />
        </section>

        <section className="editor__panel" aria-label="Controles">
          <nav className="editor__steps" aria-label="Etapas">
            {STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(index)}
                data-current={index === step ? "" : undefined}
                data-done={index < step ? "" : undefined}
                className="editor__step"
              >
                <span data-numeric>{index + 1}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="editor__progress" aria-hidden>
            <span
              style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }}
            />
          </div>

          <div className="editor__step-body">
            {ready ? <Step /> : <p className="editor__loading">Abrindo…</p>}
          </div>

          <footer className="editor__actions">
            <button
              type="button"
              onClick={() => setStep(Math.max(step - 1, 0))}
              disabled={step === 0}
              className="btn-quiet"
            >
              Voltar
            </button>

            {isLast ? (
              <Link
                href={`/checkout/${draftId}`}
                onClick={() => void track("editor_completed")}
                className="btn-primary"
              >
                Publicar minha página
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="btn-primary"
              >
                Continuar
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}

/** ⌘Z / ⇧⌘Z (SPEC 8.4). */
function useUndoShortcuts() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta || event.key.toLowerCase() !== "z") return;

      event.preventDefault();
      const history = useEditorStore.temporal.getState();

      if (event.shiftKey) history.redo();
      else history.undo();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
