"use client";

import { enableMapSet, produce } from "immer";
import { create } from "zustand";
import { temporal } from "zundo";

import type {
  Block,
  BlockType,
  PropsOf,
  SiteContent,
} from "@/lib/blocks/schema";

enableMapSet();

/**
 * Store do editor — SPEC 8.4.
 *
 * Requisito acima de todos: **nunca perder o trabalho**. Daí três decisões:
 *  - o conteúdo vive aqui e é espelhado no servidor por autosave com debounce
 *    (SPEC 12 anti-padrão 10: o servidor é a fonte, o cliente é cache);
 *  - `zundo` guarda o histórico para o ⌘Z, com throttle para digitar não gerar
 *    um passo por tecla;
 *  - nada de Context (SPEC 2): o preview lê o mesmo store e re-renderiza só o
 *    que mudou.
 */

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/** Pausa na digitação que fecha um passo de undo. */
export const HISTORY_DEBOUNCE_MS = 500;

export interface EditorState {
  draftId: string | null;
  content: SiteContent | null;

  saveState: SaveState;
  saveError: string | null;
  lastSavedAt: number | null;

  /** passo atual do modo simples, 0..4 */
  step: number;

  // --- ações
  load: (draftId: string, content: SiteContent) => void;
  patchBlockProps: <T extends BlockType>(
    blockId: string,
    patch: Partial<PropsOf<T>>,
  ) => void;
  setTheme: (patch: Partial<SiteContent["theme"]>) => void;
  addMedia: (mediaIds: string[]) => void;
  removeMedia: (mediaId: string) => void;
  reorderMedia: (mediaIds: string[]) => void;
  setStep: (step: number) => void;

  markSaving: () => void;
  markSaved: () => void;
  markError: (message: string) => void;
}

/**
 * A primeira foto da galeria é a capa.
 *
 * O editor promete isso em texto ("a primeira vira a capa"), então tem que
 * valer de verdade — depois de subir, reordenar e remover. Roda dentro do
 * `produce`, sobre o rascunho do immer.
 */
function syncCover(draft: SiteContent): void {
  const gallery = draft.blocks.find((item) => item.type === "gallery");
  const hero = draft.blocks.find((item) => item.type === "hero");
  if (gallery?.type !== "gallery" || hero?.type !== "hero") return;

  const first = gallery.props.mediaIds[0];
  if (first) hero.props.mediaId = first;
  else delete hero.props.mediaId;
}

/** O primeiro bloco de um tipo — o modo simples edita sempre esses. */
export function findBlock<T extends BlockType>(
  content: SiteContent | null,
  type: T,
): Extract<Block, { type: T }> | undefined {
  return content?.blocks.find((block) => block.type === type) as
    Extract<Block, { type: T }> | undefined;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      draftId: null,
      content: null,
      saveState: "idle",
      saveError: null,
      lastSavedAt: null,
      step: 0,

      load: (draftId, content) =>
        set({
          draftId,
          content,
          saveState: "idle",
          saveError: null,
          lastSavedAt: Date.now(),
        }),

      patchBlockProps: (blockId, patch) =>
        set((state) => {
          if (!state.content) return state;

          const content = produce(state.content, (draft) => {
            const block = draft.blocks.find((item) => item.id === blockId);
            if (!block) return;
            Object.assign(block.props, patch);
          });

          return { content, saveState: "dirty" };
        }),

      setTheme: (patch) =>
        set((state) => {
          if (!state.content) return state;

          const content = produce(state.content, (draft) => {
            Object.assign(draft.theme, patch);
          });

          return { content, saveState: "dirty" };
        }),

      addMedia: (mediaIds) =>
        set((state) => {
          if (!state.content || mediaIds.length === 0) return state;

          const content = produce(state.content, (draft) => {
            const gallery = draft.blocks.find(
              (item) => item.type === "gallery",
            );
            if (gallery?.type !== "gallery") return;

            for (const mediaId of mediaIds) {
              if (!gallery.props.mediaIds.includes(mediaId)) {
                gallery.props.mediaIds.push(mediaId);
              }
            }

            syncCover(draft);
          });

          return { content, saveState: "dirty" };
        }),

      removeMedia: (mediaId) =>
        set((state) => {
          if (!state.content) return state;

          const content = produce(state.content, (draft) => {
            for (const block of draft.blocks) {
              if (block.type !== "gallery") continue;
              block.props.mediaIds = block.props.mediaIds.filter(
                (id) => id !== mediaId,
              );
            }

            // A capa pode estar usando a foto removida — vira a próxima.
            syncCover(draft);
          });

          return { content, saveState: "dirty" };
        }),

      reorderMedia: (mediaIds) =>
        set((state) => {
          if (!state.content) return state;

          const content = produce(state.content, (draft) => {
            const gallery = draft.blocks.find(
              (item) => item.type === "gallery",
            );
            if (gallery?.type !== "gallery") return;
            gallery.props.mediaIds = mediaIds;

            // Arrastar para o primeiro lugar troca a capa.
            syncCover(draft);
          });

          return { content, saveState: "dirty" };
        }),

      setStep: (step) => set({ step }),

      markSaving: () => set({ saveState: "saving", saveError: null }),
      markSaved: () =>
        set({ saveState: "saved", saveError: null, lastSavedAt: Date.now() }),
      markError: (message) => set({ saveState: "error", saveError: message }),
    }),
    {
      // Só o conteúdo entra no histórico: estado de salvamento e passo não são
      // coisas que a pessoa espera desfazer com ⌘Z.
      partialize: (state) => ({ content: state.content }),
      limit: 50,
      /**
       * Digitar não pode gerar um passo de undo por tecla — 50 passos seriam
       * consumidos por uma frase. O histórico só registra depois de uma pausa
       * na digitação, que é como todo editor de texto se comporta.
       */
      handleSet: (handleSet) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        return (...args: Parameters<typeof handleSet>) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => handleSet(...args), HISTORY_DEBOUNCE_MS);
        };
      },
    },
  ),
);

/** Hook do histórico (⌘Z / ⇧⌘Z). */
export const useEditorHistory = () => useEditorStore.temporal.getState();
