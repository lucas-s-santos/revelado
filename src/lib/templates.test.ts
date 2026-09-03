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
   * Estes testes existem para o editor nunca oferecer um formato cujo bloco
   * principal não renderiza. O renderer ignora bloco sem componente — em
   * silêncio, sem erro —, então a pessoa escolheria "Motivos" e receberia uma
   * página sem os motivos.
   *
   * Antes eram duas listas de ids escritas à mão, uma de prontos e outra de
   * não-prontos. Toda vez que um bloco ganhava componente, um id tinha de
   * mudar de lista — e quando o último mudou, a lista de não-prontos ficou
   * vazia e o teste passou a afirmar nada. Como propriedade, ele vale para os
   * formatos que existem hoje e para os que vierem, sem manutenção.
   */
  it("todo formato oferecido tem todos os blocos prontos", () => {
    for (const template of TEMPLATES) {
      const faltando = template.preset.blocks.filter(
        (type) => !readyBlockTypes.includes(type),
      );

      expect(
        isTemplateReady(template, readyBlockTypes),
        `o formato "${template.id}" pede ${faltando.join(", ")}`,
      ).toBe(faltando.length === 0);
    }
  });

  it("recusa um formato que peça bloco sem componente", () => {
    // Sintético de propósito: os formatos de verdade estão todos prontos, e
    // sem este caso a função de recusa deixaria de ser exercitada. "map" é o
    // último bloco do schema ainda sem componente — trocar aqui quando ele
    // ganhar um.
    const inventado = {
      ...TEMPLATES[0]!,
      preset: {
        ...TEMPLATES[0]!.preset,
        blocks: ["hero", "map", "footer"] as const,
      },
    };

    expect(isTemplateReady(inventado, readyBlockTypes)).toBe(false);
  });

  it("sobra pelo menos um formato para escolher", () => {
    const prontos = TEMPLATES.filter((t) => isTemplateReady(t, readyBlockTypes));
    expect(prontos.length).toBeGreaterThan(0);
  });
});
