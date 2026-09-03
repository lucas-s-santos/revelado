"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { ChevronDown, Eye } from "lucide-react";

import { Logo } from "@/components/chrome/logo";
import { LeaveGuard } from "@/components/editor/leave-guard";
import { SaveIndicator } from "@/components/editor/save-indicator";
import { StepFormat } from "@/components/editor/steps/step-format";
import { StepMessage } from "@/components/editor/steps/step-message";
import { StepMusic } from "@/components/editor/steps/step-music";
import { StepPhotos } from "@/components/editor/steps/step-photos";
import { StepReview } from "@/components/editor/steps/step-review";
import { StepTheme } from "@/components/editor/steps/step-theme";
import { StepTimeline } from "@/components/editor/steps/step-timeline";
import { StepType } from "@/components/editor/steps/step-type";
import { StepWhen } from "@/components/editor/steps/step-when";
import { StepExtras } from "@/components/editor/steps/step-extras";
import { StepLink } from "@/components/editor/steps/step-link";
import { StepWho } from "@/components/editor/steps/step-who";
import { PhoneFrame } from "@/components/preview/phone-frame";
import { useAutosave } from "@/hooks/use-autosave";
import { track } from "@/lib/analytics";
import type { SiteContent } from "@/lib/blocks/schema";
import { collectMediaIds, mediaMapFor } from "@/lib/media";
import type { TemplateSeed } from "@/lib/templates";
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
 * Os onze passos.
 *
 * O formato abre a sequência: ele decide QUAIS blocos a página tem, então
 * escolher depois de preencher significaria remontar a moldura por cima do
 * trabalho já feito.
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
  { id: "formato", label: "Formato", Component: StepFormat },
  { id: "quem", label: "Quem", Component: StepWho },
  { id: "quando", label: "Quando", Component: StepWhen },
  { id: "fotos", label: "Fotos", Component: StepPhotos },
  { id: "mensagem", label: "Carta", Component: StepMessage },
  { id: "musica", label: "Música", Component: StepMusic },
  { id: "linha", label: "Momentos", Component: StepTimeline },
  { id: "extras", label: "Extras", Component: StepExtras },
  { id: "tema", label: "Tema", Component: StepTheme },
  { id: "letra", label: "Letra", Component: StepType },
  { id: "link", label: "Link", Component: StepLink },
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
  templates,
}: {
  draftId: string;
  slug: string;
  content: SiteContent;
  published: boolean;
  templates: TemplateSeed[];
}) {
  const load = useEditorStore((state) => state.load);
  // Do store, não da prop: renomear o link no passo "Link" não recarrega a
  // página, e a prop do servidor continuaria mostrando o endereço antigo.
  const slugAtual = useEditorStore((state) => state.slug);
  const step = useEditorStore((state) => state.step);
  const setStep = useEditorStore((state) => state.setStep);
  const liveContent = useEditorStore((state) => state.content);

  const [ready, setReady] = useState(false);

  /* A prévia começa ABERTA, e isso é decisão, não preguiça.
   *
   * Ela é o que faz a pessoa acreditar que está montando uma página de verdade
   * — abrir fechado economizaria altura e esconderia o argumento. Quem precisa
   * da tela inteira para escrever recolhe uma vez, e a escolha vale para o
   * resto da sessão.
   *
   * No desktop o estado é ignorado: lá a prévia é uma coluna ao lado e não
   * disputa altura com o formulário. */
  const [previaAberta, setPreviaAberta] = useState(true);

  // Hidrata do servidor uma vez. O servidor é a fonte (anti-padrão 10).
  useEffect(() => {
    load(draftId, content, slug);
    setReady(true);
    void track("editor_opened", { template: content.theme.template });
  }, [draftId, content, slug, load]);

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
      {/* Textura de fundo. Posições fixas e escritas à mão: geradas por random
          elas mudariam entre o HTML do servidor e a hidratação, e o React
          reclamaria de incompatibilidade a cada carregamento. */}
      <div aria-hidden className="editor__coracoes">
        {CORACOES.map((c, i) => (
          <span key={i} style={{ top: c.t, left: c.l, fontSize: c.s }}>
            ♥
          </span>
        ))}
      </div>

      <header className="editor__bar">
        <Logo size={26} showName={false} />

        <p className="editor__crumb">
          <span className="eyebrow">montando</span>
          <span className="hidden sm:inline">/p/{slugAtual ?? slug}</span>
        </p>

        <SaveIndicator />
      </header>

      {published ? (
        <p role="alert" className="editor__locked">
          Esta página já foi publicada — o QR Code dela já está impresso. Para
          mudar alguma coisa, use o painel.
        </p>
      ) : null}

      {/* Só depois de o rascunho carregar: avisar que "está salvo" antes de
          haver o que salvar seria promessa vazia. */}
      {ready ? <LeaveGuard draftId={draftId} /> : null}

      {/*
        O progresso mora no topo, não dentro do painel.
        Antes eram 14 pílulas nomeadas empilhadas em três linhas: a primeira
        coisa que a pessoa via era o tamanho do trabalho. Como bolinhas, a
        régua cabe numa linha e continua clicável — e o nome de cada etapa vai
        no `aria-label`, então quem usa leitor de tela ouve "Fotos, etapa 4 de
        14" em vez de "botão".
      */}
      <div className="editor__progresso">
        {/* Uma linha só: incentivo, barra e porcentagem lado a lado.
            Eram três linhas empilhadas — cabeçalho, barra, bolinhas — e no
            celular a faixa comia 110px dos 844 da tela, empurrando o primeiro
            campo do formulário para baixo da dobra. Nada foi removido; o que
            estava em coluna passou a caber em linha. */}
        <div className="editor__progress-row">
          <p className="editor__cheer">{cheerOf(step)}</p>

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

          <p data-numeric className="editor__percent">
            {percentOf(step)}%
          </p>
        </div>

        <nav className="editor__dots" aria-label="Etapas">
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(index)}
              data-current={index === step ? "" : undefined}
              data-done={index < step ? "" : undefined}
              aria-current={index === step ? "step" : undefined}
              aria-label={`${item.label}, etapa ${index + 1} de ${STEPS.length}`}
              className="editor__dot"
            />
          ))}
        </nav>
      </div>

      <div className="editor__body">
        <section
          className="editor__preview"
          aria-label="Prévia da página"
          data-recolhida={previaAberta ? undefined : ""}
        >
          {/* O rótulo virou botão — mas só no celular, onde ele resolve um
              problema real: mesmo com a faixa encolhida para 32vh, o primeiro
              campo do formulário nascia em 578px de uma tela de 844. Quem está
              escrevendo a carta quer a tela inteira para escrever; quem quer
              conferir toca e a prévia volta.
              No desktop a prévia é uma coluna ao lado, não disputa altura com
              nada, e o botão fica escondido por CSS. */}
          <button
            type="button"
            className="editor__preview-label"
            onClick={() => setPreviaAberta((valor) => !valor)}
            aria-expanded={previaAberta}
            aria-controls="editor-previa"
          >
            <Eye size={14} aria-hidden />
            prévia em tempo real
            <ChevronDown size={14} aria-hidden className="editor__preview-seta" />
          </button>

          <div id="editor-previa" className="editor__preview-palco">
            <PhoneFrame
              content={previewContent}
              interactive
              media={mediaMapFor(draftId, collectMediaIds(previewContent))}
              className="editor__phone"
            />
          </div>
        </section>

        <section className="editor__panel" aria-label="Controles">
          <div className="editor__step-body">
            {ready ? (
              current.id === "formato" ? (
                <StepFormat templates={templates} />
              ) : (
                <Step />
              )
            ) : (
              <p className="editor__loading">Abrindo…</p>
            )}
          </div>
        </section>
      </div>

      {/* A barra de ação é da PÁGINA, não do painel: no celular ela fica colada
          embaixo, sempre alcançável com o polegar, sem depender de rolar até o
          fim do formulário. */}
      <footer className="editor__actions">
        <button
          type="button"
          onClick={() => setStep(Math.max(step - 1, 0))}
          disabled={step === 0}
          className="btn-quiet"
        >
          ← Voltar
        </button>

        <p className="editor__agora">{current.label}</p>

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
            Continuar →
          </button>
        )}
      </footer>
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

/** Onde cada coração fica. Fixo, nunca sorteado — ver a nota no JSX. */
const CORACOES = [
  { t: "14%", l: "6%", s: "1.1rem" },
  { t: "31%", l: "22%", s: "0.7rem" },
  { t: "9%", l: "41%", s: "0.8rem" },
  { t: "58%", l: "9%", s: "0.9rem" },
  { t: "73%", l: "31%", s: "0.7rem" },
  { t: "22%", l: "78%", s: "0.9rem" },
  { t: "46%", l: "93%", s: "1.2rem" },
  { t: "84%", l: "71%", s: "0.8rem" },
  { t: "91%", l: "14%", s: "1rem" },
  { t: "66%", l: "88%", s: "0.7rem" },
];
