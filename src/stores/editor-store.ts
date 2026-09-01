"use client";

import { enableMapSet, produce } from "immer";
import { create } from "zustand";
import { temporal } from "zundo";

import {
  optionalBlock,
  type OptionalBlockType,
} from "@/lib/blocks/defaults";
import { getTemplate } from "@/lib/templates";
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
  /** O endereço da página. Fora do `content` porque não é bloco: mora na
   *  coluna do site e tem regra própria (imutável depois de publicado). */
  slug: string | null;

  saveState: SaveState;
  saveError: string | null;
  lastSavedAt: number | null;

  /** passo atual do modo simples, 0..4 */
  step: number;

  // --- ações
  load: (draftId: string, content: SiteContent, slug: string) => void;
  setSlug: (slug: string) => void;
  patchBlockProps: <T extends BlockType>(
    blockId: string,
    patch: Partial<PropsOf<T>>,
  ) => void;
  setTheme: (patch: Partial<SiteContent["theme"]>) => void;
  /** Liga um bloco opcional (música, linha do tempo). Idempotente. */
  addBlock: (type: OptionalBlockType) => void;
  /** Troca o formato: remonta a moldura sem tocar no que foi escrito. */
  applyTemplate: (templateId: string) => void;
  removeBlock: (blockId: string) => void;
  addMedia: (mediaIds: string[]) => void;
  removeMedia: (mediaId: string) => void;
  /** Legenda de uma foto. Texto vazio apaga a chave em vez de guardar "". */
  setCaption: (mediaId: string, texto: string) => void;
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
      slug: null,
      saveState: "idle",
      saveError: null,
      lastSavedAt: null,
      step: 0,

      load: (draftId, content, slug) =>
        set({
          draftId,
          content,
          slug,
          saveState: "idle",
          saveError: null,
          lastSavedAt: Date.now(),
        }),

      setSlug: (slug) => set({ slug }),

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

      /**
       * Música e linha do tempo não vêm no rascunho novo: se viessem, todo
       * rascunho nasceria inválido para publicar, porque a validação exige
       * faixa escolhida e ao menos uma data quando o bloco existe.
       *
       * Entra antes do rodapé, que é sempre o último — no fim da lista o bloco
       * apareceria DEPOIS da assinatura da página.
       */
      addBlock: (type) =>
        set((state) => {
          if (!state.content) return state;
          if (state.content.blocks.some((item) => item.type === type)) {
            return state;
          }

          const content = produce(state.content, (draft) => {
            const footer = draft.blocks.findIndex(
              (item) => item.type === "footer",
            );
            const at = footer === -1 ? draft.blocks.length : footer;
            draft.blocks.splice(at, 0, optionalBlock(type));
          });

          return { content, saveState: "dirty" };
        }),

      /**
       * Trocar de formato REMONTA A MOLDURA, nunca apaga o conteúdo.
       *
       * Três regras, e todas existem para proteger o que a pessoa escreveu:
       *
       * 1. Os blocos existentes são REORDENADOS na ordem do preset. Nenhum é
       *    recriado, então texto, fotos e datas seguem intactos.
       * 2. Bloco que o preset pede e a página não tem entra vazio — mas só
       *    música e linha do tempo, que são os opcionais. Os demais (capa,
       *    contador, galeria, carta, rodapé) vêm no rascunho desde o início;
       *    se algum faltar, é estado torto que não se conserta adivinhando
       *    props.
       * 3. Bloco que a página tem e o preset não pede FICA, no fim, antes do
       *    rodapé. Sumir com ele apagaria trabalho — e é a pessoa quem tira,
       *    no passo dele.
       */
      applyTemplate: (templateId) =>
        set((state) => {
          if (!state.content) return state;

          const template = getTemplate(templateId);
          if (!template) return state;

          const { preset } = template;

          const content = produce(state.content, (draft) => {
            draft.theme.template = template.id;
            draft.theme.palette = preset.palette;
            draft.theme.font = preset.font;
            draft.theme.effect = preset.effect;

            const restantes = [...draft.blocks];
            const ordenados: typeof draft.blocks = [];

            for (const type of preset.blocks) {
              const at = restantes.findIndex((item) => item.type === type);

              if (at !== -1) {
                ordenados.push(restantes.splice(at, 1)[0]!);
                continue;
              }

              if (type === "music" || type === "timeline" || type === "quiz") {
                ordenados.push(optionalBlock(type));
              }
            }

            // O que sobrou entra antes do rodapé, para não cair depois da
            // assinatura da página.
            const footer = ordenados.findIndex((item) => item.type === "footer");
            const at = footer === -1 ? ordenados.length : footer;
            ordenados.splice(at, 0, ...restantes);

            draft.blocks = ordenados;
          });

          return { content, saveState: "dirty" };
        }),

      removeBlock: (blockId) =>
        set((state) => {
          if (!state.content) return state;

          const content = produce(state.content, (draft) => {
            const at = draft.blocks.findIndex((item) => item.id === blockId);
            if (at !== -1) draft.blocks.splice(at, 1);
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

              // A legenda vai junto. Sem isto ela ficava órfã no JSON: a foto
              // sumia da tela e o texto continuava sendo salvo para sempre,
              // reaparecendo se um dia o mesmo mediaId voltasse.
              if (block.props.captions) {
                delete block.props.captions[mediaId];
                if (Object.keys(block.props.captions).length === 0) {
                  delete block.props.captions;
                }
              }
            }

            // A capa pode estar usando a foto removida — vira a próxima.
            syncCover(draft);
          });

          return { content, saveState: "dirty" };
        }),

      setCaption: (mediaId, texto) =>
        set((state) => {
          if (!state.content) return state;

          const limpo = texto.trim();

          const content = produce(state.content, (draft) => {
            for (const block of draft.blocks) {
              if (block.type !== "gallery") continue;

              if (!limpo) {
                // Guardar "" encheria o JSON de chaves vazias e faria o
                // renderer desenhar uma faixa de legenda sem texto.
                if (block.props.captions) {
                  delete block.props.captions[mediaId];
                  if (Object.keys(block.props.captions).length === 0) {
                    delete block.props.captions;
                  }
                }
                continue;
              }

              block.props.captions ??= {};
              block.props.captions[mediaId] = limpo;
            }
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
