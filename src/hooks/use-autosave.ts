"use client";

import { useEffect, useRef } from "react";

import type { SiteContent } from "@/lib/blocks/schema";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Autosave — SPEC 8.4: debounce de 800ms, `PATCH /api/drafts/[id]`.
 *
 * Detalhes que existem porque "nunca perder o trabalho" é o requisito mais
 * importante da tela:
 *  - **retry** com espera crescente: 4G cai, e cair não pode significar perder;
 *  - **`sendBeacon` ao fechar a aba**, para o último trecho digitado ir junto;
 *  - **cache local** em `sessionStorage` a cada mudança — não é fonte de verdade
 *    (anti-padrão 10), é rede de segurança se o servidor recusar tudo.
 */

const DEBOUNCE_MS = 800;
const MAX_ATTEMPTS = 4;
const LOCAL_PREFIX = "revelado_draft_";

export function localCacheKey(draftId: string) {
  return `${LOCAL_PREFIX}${draftId}`;
}

async function patchDraft(draftId: string, content: SiteContent) {
  const response = await fetch(`/api/drafts/${draftId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Não deu para salvar agora.");
  }
}

export function useAutosave(): void {
  const draftId = useEditorStore((state) => state.draftId);
  const content = useEditorStore((state) => state.content);
  const saveState = useEditorStore((state) => state.saveState);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef(false);
  const pending = useRef<SiteContent | null>(null);

  useEffect(() => {
    if (!draftId || !content || saveState !== "dirty") return;

    // Rede de segurança local, gravada antes de tentar a rede.
    try {
      sessionStorage.setItem(localCacheKey(draftId), JSON.stringify(content));
    } catch {
      // Cota cheia ou modo privado: seguir mesmo assim, o servidor é a fonte.
    }

    pending.current = content;
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);

    async function flush() {
      if (!draftId || inFlight.current) return;

      const payload = pending.current;
      if (!payload) return;

      inFlight.current = true;
      useEditorStore.getState().markSaving();

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          await patchDraft(draftId, payload);

          // Se digitaram durante o salvamento, o store continua sujo e o
          // próximo efeito agenda outro flush.
          if (pending.current === payload) {
            useEditorStore.getState().markSaved();
            pending.current = null;
          }

          inFlight.current = false;
          return;
        } catch (error) {
          const last = attempt === MAX_ATTEMPTS;
          if (last) {
            useEditorStore
              .getState()
              .markError(
                error instanceof Error
                  ? error.message
                  : "Não deu para salvar agora.",
              );
            inFlight.current = false;
            return;
          }

          // 0.4s, 0.8s, 1.6s
          await new Promise((resolve) =>
            setTimeout(resolve, 400 * 2 ** (attempt - 1)),
          );
        }
      }
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draftId, content, saveState]);

  // Fechar a aba com algo por salvar: manda pelo beacon, que sobrevive ao unload.
  useEffect(() => {
    if (!draftId) return;

    const handler = () => {
      const state = useEditorStore.getState();
      if (state.saveState !== "dirty" || !state.content) return;

      navigator.sendBeacon?.(
        `/api/drafts/${draftId}`,
        new Blob([JSON.stringify({ content: state.content })], {
          type: "application/json",
        }),
      );
    };

    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [draftId]);
}
