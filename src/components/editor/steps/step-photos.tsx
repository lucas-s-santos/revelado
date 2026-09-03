"use client";

import { useCallback, useRef, useState } from "react";

import { PhotoGrid } from "@/components/editor/photo-grid";
import { useUploads } from "@/hooks/use-uploads";
import { PLANS, type PlanSeed } from "@/lib/plans";
import { findBlock, useEditorStore } from "@/stores/editor-store";

/**
 * Passo 3 — Fotos. A parte mais frágil do editor em 4G (SPEC 8.4).
 *
 * Comprime no browser, sobe direto para o R2, mostra progresso por arquivo e
 * tenta de novo sozinho. Limite conforme o plano-alvo, com upsell contextual
 * ("mais 25 fotos no Especial") em vez de um "não" seco.
 *
 * `plans` vem de `EditorPage` (lê `listActivePlans` no servidor — SPEC 8.9);
 * padrão opcional só para tipar `<Step />` genérico em `editor-shell.tsx`, ver
 * a mesma nota em `step-format.tsx`.
 */
export function StepPhotos({ plans = PLANS }: { plans?: readonly PlanSeed[] }) {
  const draftId = useEditorStore((state) => state.draftId);
  const content = useEditorStore((state) => state.content);
  const addMedia = useEditorStore((state) => state.addMedia);

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Plano-alvo enquanto o checkout não escolhe outro (SPEC 8.4). */
  const targetPlan = plans.find((plan) => plan.highlight) ?? plans[0] ?? PLANS[0]!;
  const nextPlan = plans.find((plan) => plan.maxPhotos > targetPlan.maxPhotos);

  const gallery = findBlock(content, "gallery");
  const used = gallery?.props.mediaIds.length ?? 0;
  const remaining = Math.max(targetPlan.maxPhotos - used, 0);

  const onDone = useCallback(
    (mediaId: string) => addMedia([mediaId]),
    [addMedia],
  );

  const { items, add, retry, clearDone } = useUploads(draftId ?? "", onDone);

  const accept = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).slice(0, remaining);
      if (list.length === 0) return;
      add(list);
    },
    [add, remaining],
  );

  if (!gallery) return null;

  const failed = items.filter((item) => item.status === "error");
  const active = items.filter(
    (item) => item.status === "compressing" || item.status === "uploading",
  );

  return (
    <div className="step">
      <header className="step__head">
        <h2 className="step__title">As fotos de vocês</h2>
        <p className="step__lede">
          Arraste para reordenar — a primeira vira a capa. Elas são comprimidas
          aqui no seu aparelho antes de subir, para não gastar sua internet.
        </p>
      </header>

      <div
        className="uploader"
        data-dragover={dragOver ? "" : undefined}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          accept(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) accept(event.target.files);
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={remaining === 0}
          className="uploader__button"
        >
          {remaining === 0 ? "Limite de fotos atingido" : "Escolher fotos"}
        </button>

        <p className="uploader__hint">
          {remaining > 0 ? (
            <>
              <span data-numeric>{used}</span> de{" "}
              <span data-numeric>{targetPlan.maxPhotos}</span> fotos no plano{" "}
              {targetPlan.name}
            </>
          ) : (
            "Remova alguma foto para adicionar outra."
          )}
        </p>

        {/* Upsell contextual, no momento em que o limite aperta (SPEC 8.4). */}
        {nextPlan && remaining <= 3 ? (
          <p className="uploader__upsell">
            Precisa de mais? São{" "}
            <strong data-numeric>
              {nextPlan.maxPhotos - targetPlan.maxPhotos}
            </strong>{" "}
            fotos a mais no {nextPlan.name} — dá para escolher no fim.
          </p>
        ) : null}
      </div>

      {active.length > 0 ? (
        <ul className="uploads">
          {active.map((item) => (
            <li key={item.localId} className="uploads__item">
              <span className="uploads__name">{item.name}</span>
              <span className="uploads__bar" aria-hidden>
                <span style={{ transform: `scaleX(${item.progress / 100})` }} />
              </span>
              <span data-numeric className="uploads__pct">
                {item.status === "compressing" ? "…" : `${item.progress}%`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {failed.length > 0 ? (
        <ul className="uploads" role="alert">
          {failed.map((item) => (
            <li key={item.localId} className="uploads__item is-error">
              <span className="uploads__name">{item.name}</span>
              <span className="uploads__error">{item.error}</span>
              <button
                type="button"
                className="btn-quiet"
                onClick={() => retry(item.localId)}
              >
                Tentar de novo
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <PhotoGrid onSettled={clearDone} />
    </div>
  );
}
