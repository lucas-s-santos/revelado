import { beforeEach, describe, expect, it } from "vitest";

import { defaultContent } from "@/lib/blocks/defaults";
import { parseSiteContent } from "@/lib/blocks/schema";
import {
  HISTORY_DEBOUNCE_MS,
  findBlock,
  useEditorStore,
} from "@/stores/editor-store";

/**
 * O store é onde o trabalho da pessoa vive antes de chegar ao servidor. Errar
 * aqui é perder conteúdo — daí a cobertura.
 */

const load = () => {
  useEditorStore.getState().load("draft-1", defaultContent("namorados"));
  useEditorStore.temporal.getState().clear();
};

describe("editor store", () => {
  beforeEach(load);

  it("marca sujo ao editar e mantém o conteúdo válido pelo schema", () => {
    const hero = findBlock(useEditorStore.getState().content, "hero")!;
    useEditorStore.getState().patchBlockProps(hero.id, { title: "Marina" });

    const state = useEditorStore.getState();
    expect(state.saveState).toBe("dirty");
    expect(findBlock(state.content, "hero")?.props.title).toBe("Marina");

    // Nunca pode virar algo que o servidor recusaria (SPEC 12).
    expect(parseSiteContent(state.content).success).toBe(true);
  });

  it("não deixa o conteúdo anterior ser mutado (immer)", () => {
    const before = useEditorStore.getState().content;
    const hero = findBlock(before, "hero")!;

    useEditorStore.getState().patchBlockProps(hero.id, { title: "Outro" });

    expect(findBlock(before, "hero")?.props.title).toBe(hero.props.title);
    expect(useEditorStore.getState().content).not.toBe(before);
  });

  describe("capa", () => {
    it("a primeira foto vira a capa", () => {
      useEditorStore.getState().addMedia(["a", "b", "c"]);

      const content = useEditorStore.getState().content;
      expect(findBlock(content, "gallery")?.props.mediaIds).toEqual([
        "a",
        "b",
        "c",
      ]);
      expect(findBlock(content, "hero")?.props.mediaId).toBe("a");
    });

    it("reordenar troca a capa", () => {
      useEditorStore.getState().addMedia(["a", "b", "c"]);
      useEditorStore.getState().reorderMedia(["c", "a", "b"]);

      expect(
        findBlock(useEditorStore.getState().content, "hero")?.props.mediaId,
      ).toBe("c");
    });

    it("remover a capa promove a próxima", () => {
      useEditorStore.getState().addMedia(["a", "b"]);
      useEditorStore.getState().removeMedia("a");

      const content = useEditorStore.getState().content;
      expect(findBlock(content, "gallery")?.props.mediaIds).toEqual(["b"]);
      expect(findBlock(content, "hero")?.props.mediaId).toBe("b");
    });

    it("remover a última limpa a capa em vez de deixar id órfão", () => {
      useEditorStore.getState().addMedia(["a"]);
      useEditorStore.getState().removeMedia("a");

      const content = useEditorStore.getState().content;
      expect(findBlock(content, "hero")?.props.mediaId).toBeUndefined();
      // Rascunho sem foto continua salvável (SPEC 8.4).
      expect(parseSiteContent(content).success).toBe(true);
    });

    it("não duplica foto adicionada duas vezes", () => {
      useEditorStore.getState().addMedia(["a"]);
      useEditorStore.getState().addMedia(["a", "b"]);

      expect(
        findBlock(useEditorStore.getState().content, "gallery")?.props.mediaIds,
      ).toEqual(["a", "b"]);
    });
  });

  describe("trocar de formato", () => {
    const tipos = () =>
      useEditorStore.getState().content?.blocks.map((b) => b.type) ?? [];

    it("remonta a moldura sem apagar o que foi escrito", () => {
      // A promessa inteira da ação está neste caso: reordenar não pode
      // recriar bloco, senão o texto vai junto.
      const letter = findBlock(useEditorStore.getState().content, "letter")!;
      useEditorStore
        .getState()
        .patchBlockProps(letter.id, { text: "não me apaga" });

      useEditorStore.getState().applyTemplate("linha-do-tempo");

      expect(findBlock(useEditorStore.getState().content, "letter")?.props.text).toBe(
        "não me apaga",
      );
    });

    it("põe os blocos na ordem do preset", () => {
      useEditorStore.getState().applyTemplate("linha-do-tempo");

      const ordem = tipos();
      expect(ordem[0]).toBe("hero");
      expect(ordem.indexOf("timeline")).toBeLessThan(ordem.indexOf("gallery"));
      expect(ordem.at(-1)).toBe("footer");
    });

    it("cria o bloco opcional que o formato pede e a página não tem", () => {
      expect(tipos()).not.toContain("timeline");

      useEditorStore.getState().applyTemplate("linha-do-tempo");

      expect(tipos()).toContain("timeline");
    });

    it("mantém bloco que o formato não pede, antes do rodapé", () => {
      useEditorStore.getState().addBlock("music");
      // "linha-do-tempo" não inclui música: ela tem de sobreviver à troca.
      useEditorStore.getState().applyTemplate("linha-do-tempo");

      const ordem = tipos();
      expect(ordem).toContain("music");
      expect(ordem.indexOf("music")).toBeLessThan(ordem.indexOf("footer"));
    });

    it("aplica paleta, fonte e efeito do preset", () => {
      useEditorStore.getState().applyTemplate("linha-do-tempo");

      const theme = useEditorStore.getState().content?.theme;
      expect(theme?.template).toBe("linha-do-tempo");
      expect(theme?.palette).toBe("ambar");
      expect(theme?.effect).toBe("none");
    });

    it("ignora formato desconhecido em vez de zerar a página", () => {
      const antes = tipos();
      useEditorStore.getState().applyTemplate("nao-existe");

      expect(tipos()).toEqual(antes);
    });
  });

  it("guarda o tema no conteúdo", () => {
    useEditorStore.getState().setTheme({ palette: "ciano", effect: "stars" });

    const theme = useEditorStore.getState().content?.theme;
    expect(theme?.palette).toBe("ciano");
    expect(theme?.effect).toBe("stars");
  });

  it("desfaz e refaz o conteúdo", async () => {
    const hero = findBlock(useEditorStore.getState().content, "hero")!;
    const original = hero.props.title;

    useEditorStore.getState().patchBlockProps(hero.id, { title: "Primeiro" });
    // O histórico é debounced de propósito: digitar não pode virar um passo de
    // undo por tecla (ver handleSet no store). Espera a pausa antes de checar.
    await new Promise((resolve) =>
      setTimeout(resolve, HISTORY_DEBOUNCE_MS + 150),
    );

    useEditorStore.getState().patchBlockProps(hero.id, { title: "Segundo" });
    await new Promise((resolve) =>
      setTimeout(resolve, HISTORY_DEBOUNCE_MS + 150),
    );

    const history = useEditorStore.temporal.getState();
    expect(history.pastStates.length).toBeGreaterThan(0);

    history.undo();
    const afterUndo = findBlock(useEditorStore.getState().content, "hero")
      ?.props.title;
    expect(afterUndo).not.toBe("Segundo");

    history.redo();
    expect(
      findBlock(useEditorStore.getState().content, "hero")?.props.title,
    ).toBe("Segundo");

    expect(original).toBeTruthy();
  });
});
