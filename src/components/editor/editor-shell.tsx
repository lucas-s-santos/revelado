"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { Logo } from "@/components/chrome/logo";
import { SaveIndicator } from "@/components/editor/save-indicator";
import { StepMessage } from "@/components/editor/steps/step-message";
import { StepMusic } from "@/components/editor/steps/step-music";
import { StepPhotos } from "@/components/editor/steps/step-photos";
import { StepReview } from "@/components/editor/steps/step-review";
import { StepTheme } from "@/components/editor/steps/step-theme";
import { StepTimeline } from "@/components/editor/steps/step-timeline";
import { StepType } from "@/components/editor/steps/step-type";
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

/**
 * Os nove passos.
 *
 * Eram cinco, e quatro dos que entraram não são divisão de tela: são conteúdo
 * que o produto renderizava e ninguém conseguia preencher. Música e linha do
 * tempo tinham bloco no schema desde a fase 3 e nenhum editor. Revisão não
 * existia — a pessoa ia para o pagamento sem saber o que faltava.
 *
 * A ordem segue a da página publicada, não a facilidade de implementar: quem
 * monta vai preenchendo de cima para baixo e reconhece o que já viu no
 * celular ao lado.
 *
 * `STEP_OF_BLOCK`, em `step-review.tsx`, aponta para estes índices. Mexeu na
 * ordem aqui, conserte lá.
 */
const STEPS = [
  { id: "quem", label: "Quem", Component: StepWho },
  { id: "quando", label: "Quando", Component: StepWhen },
  { id: "fotos", label: "Fotos", Component: StepPhotos },
  { id: "mensagem", label: "Carta", Component: StepMessage },
  { id: "musica", label: "Música", Component: StepMusic },
  { id: "linha", label: "Momentos", Component: StepTimeline },
  { id: "tema", label: "Tema", Component: StepTheme },
  { id: "letra", label: "Letra", Component: StepType },
  { id: "revisao", label: "Revisão", Component: StepReview },
] as const;

/**
 * O quanto já andou, de 0 a 100.
 *
 * Divide por `length - 1` e não por `length`: no último passo a barra tem de
 * chegar a 100%, senão a pessoa termina de montar a página olhando para uma
 * barra que diz que falta coisa.
 */
function percentOf(step: number): number {
  return Math.round((step / (STEPS.length - 1)) * 100);
}

/** O tom muda com o avanço. Nada de "Passo 3 de 9", que é linguagem de sistema. */
function cheerOf(step: number): string {
  if (step === 0) return "Vamos começar";
  if (step >= STEPS.length - 1) return "Última olhada";
  if (step >= STEPS.length - 3) return "Quase lá";
  if (step >= 3) return "Indo bem";
  return "Bom começo";
}

export function EditorShell({
  draftId,
  slug,
  content,
  published,
}: {
  draftId: string;
  slug: string;
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
    void track("editor_opened", { template: content.theme.template });
  }, [draftId, content, load]);

  useAutosave();
  useUndoShortcuts();

  // O preview fica um tique atrás do campo, nunca na frente.
  const previewContent = useDeferredValue(liveContent ?? content);

  const current = STEPS[step] ?? STEPS[0];
  const Step = current.Component;
  const isLast = step === STEPS.length - 1;

  // Sem `data-palette` na raiz de propósito: a paleta é do conteúdo, e quem a
  // aplica é o BlockRenderer, dentro do preview. Tingir a interface inteira
  // faria o editor mudar de cor a cada clique no passo de estilo.
  return (
    <div className="editor">
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

          <div className="editor__progress-head">
            <p className="editor__cheer">{cheerOf(step)}</p>
            <p data-numeric className="editor__percent">
              {percentOf(step)}%
            </p>
          </div>

          <div
            className="editor__progress"
            role="progressbar"
            aria-valuenow={percentOf(step)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso da montagem"
          >
            <span style={{ transform: `scaleX(${percentOf(step) / 100})` }} />
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
