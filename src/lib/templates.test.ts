import { describe, expect, it } from "vitest";

import { readyBlockTypes } from "@/components/blocks/registry";
import { getTemplate, isTemplateReady, TEMPLATES } from "@/lib/templates";

describe("templates", () => {
  it("não repete id", () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  it("todo preset começa pela capa e termina no rodapé", () => {
    for (const template of TEMPLATES) {
      expect(template.preset.blocks[0]).toBe("hero");
      expect(template.preset.blocks.at(-1)).toBe("footer");
    }
  });

  it("id desconhecido devolve undefined em vez de adivinhar", () => {
    expect(getTemplate("nao-existe")).toBeUndefined();
  });
});

describe("quais dá para montar hoje", () => {
  /**
   * Este teste existe para o editor nunca oferecer um formato cujo bloco
   * principal não renderiza. O renderer ignora bloco sem componente — em
   * silêncio, sem erro —, então a pessoa escolheria "Motivos" e receberia uma
   * página sem os motivos.
   */
  it("aceita os formatos cujos blocos todos existem", () => {
    for (const id of ["essencial", "revelacao", "linha-do-tempo"]) {
      const template = getTemplate(id);
      expect(template, `template ${id} sumiu`).toBeDefined();
      expect(isTemplateReady(template!, readyBlockTypes)).toBe(true);
    }
  });

  it("recusa os que dependem de bloco ainda não implementado", () => {
    // "motivos" pede `reasons`; "capsula" pede `capsule`. Os dois estão no
    // registry como ready: false. Quando ganharem componente, este teste falha
    // — e aí é só movê-los para o caso de cima.
    for (const id of ["motivos", "capsula"]) {
      const template = getTemplate(id);
      expect(template, `template ${id} sumiu`).toBeDefined();
      expect(isTemplateReady(template!, readyBlockTypes)).toBe(false);
    }
  });

  it("sobra pelo menos um formato para escolher", () => {
    const prontos = TEMPLATES.filter((t) => isTemplateReady(t, readyBlockTypes));
    expect(prontos.length).toBeGreaterThan(0);
  });
});
