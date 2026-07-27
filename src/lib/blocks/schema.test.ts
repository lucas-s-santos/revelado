import { describe, expect, it } from "vitest";

import { defaultContent } from "@/lib/blocks/defaults";
import { demoContent } from "@/lib/blocks/fixtures";
import { migrate } from "@/lib/blocks/migrate";
import {
  blockTypes,
  parseSiteContent,
  SCHEMA_VERSION,
  validateForPublish,
} from "@/lib/blocks/schema";
import { OCCASION_IDS } from "@/lib/occasions";

describe("schema dos blocos", () => {
  it("aplica os defaults do zod", () => {
    const parsed = parseSiteContent({
      schemaVersion: SCHEMA_VERSION,
      occasion: "namorados",
      theme: { template: "x", palette: "namorados" },
      blocks: [{ id: "h", type: "hero", props: { title: "Oi" } }],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const hero = parsed.data.blocks[0];
    expect(hero?.type).toBe("hero");
    if (hero?.type !== "hero") return;

    expect(hero.props.align).toBe("center");
    expect(hero.props.overlay).toBe(0.45);
    expect(parsed.data.theme.font).toBe("mixed");
    expect(parsed.data.theme.effect).toBe("none");
  });

  it("recusa bloco de tipo desconhecido", () => {
    const parsed = parseSiteContent({
      schemaVersion: SCHEMA_VERSION,
      occasion: "namorados",
      theme: { template: "x", palette: "namorados" },
      blocks: [{ id: "z", type: "carrossel-3d", props: {} }],
    });

    expect(parsed.success).toBe(false);
  });

  it("recusa página sem bloco nenhum e respeita o teto de 30", () => {
    const base = {
      schemaVersion: SCHEMA_VERSION,
      occasion: "namorados",
      theme: { template: "x", palette: "namorados" },
    };

    expect(parseSiteContent({ ...base, blocks: [] }).success).toBe(false);

    const many = Array.from({ length: 31 }, (_, i) => ({
      id: `h${i}`,
      type: "hero",
      props: { title: "Oi" },
    }));
    expect(parseSiteContent({ ...base, blocks: many }).success).toBe(false);
  });

  it("valida os limites de tamanho do texto", () => {
    const withTitle = (title: string) =>
      parseSiteContent({
        schemaVersion: SCHEMA_VERSION,
        occasion: "namorados",
        theme: { template: "x", palette: "namorados" },
        blocks: [{ id: "h", type: "hero", props: { title } }],
      }).success;

    expect(withTitle("a".repeat(80))).toBe(true);
    expect(withTitle("a".repeat(81))).toBe(false);
  });

  it("exige data ISO no contador", () => {
    const withDate = (date: string) =>
      parseSiteContent({
        schemaVersion: SCHEMA_VERSION,
        occasion: "namorados",
        theme: { template: "x", palette: "namorados" },
        blocks: [{ id: "c", type: "counter", props: { mode: "since", date } }],
      }).success;

    expect(withDate("2021-06-12T03:00:00.000Z")).toBe(true);
    expect(withDate("12/06/2021")).toBe(false);
  });
});

describe("defaults por ocasião", () => {
  it("gera conteúdo válido para as oito ocasiões", () => {
    for (const occasion of OCCASION_IDS) {
      const parsed = parseSiteContent(defaultContent(occasion));
      expect(
        parsed.success,
        `${occasion}: ${JSON.stringify(parsed.error?.issues)}`,
      ).toBe(true);
    }
  });

  it("usa só tipos de bloco que existem no schema", () => {
    for (const occasion of OCCASION_IDS) {
      for (const block of defaultContent(occasion).blocks) {
        expect(blockTypes).toContain(block.type);
      }
    }
  });

  it("dá a cada bloco um id único dentro da página", () => {
    for (const occasion of OCCASION_IDS) {
      const ids = defaultContent(occasion).blocks.map((block) => block.id);
      expect(new Set(ids).size, `${occasion} tem id repetido`).toBe(ids.length);
    }
  });
});

describe("portão da publicação", () => {
  it("deixa o rascunho salvar sem foto, mas não publicar", () => {
    const content = defaultContent("namorados");

    // Rascunho: válido (requisito mais importante do editor — SPEC 8.4).
    expect(parseSiteContent(content).success).toBe(true);

    // Publicação: barra, porque a galeria está vazia.
    const issues = validateForPublish(content);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((issue) => issue.message.includes("foto"))).toBe(true);
  });

  it("libera a publicação quando o conteúdo está completo", () => {
    expect(validateForPublish(demoContent)).toEqual([]);
  });

  it("reclama de capa sem título", () => {
    const issues = validateForPublish({
      ...demoContent,
      blocks: [
        {
          id: "h",
          type: "hero",
          props: { title: "  ", align: "center", overlay: 0.4 },
        },
      ],
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.blockId).toBe("h");
  });
});

describe("migração", () => {
  it("passa direto conteúdo já na versão atual", () => {
    const content = defaultContent("namorados");
    const result = migrate(content);

    expect(result.content).not.toBeNull();
    expect(result.migrated).toBe(false);
    expect(result.from).toBe(SCHEMA_VERSION);
  });

  it("recusa conteúdo de versão futura em vez de adivinhar", () => {
    const result = migrate({
      ...defaultContent("namorados"),
      schemaVersion: 99,
    });

    expect(result.content).toBeNull();
    expect(result.error).toContain("99");
  });

  it("devolve erro legível quando o conteúdo é inválido", () => {
    const result = migrate({ schemaVersion: 1, blocks: [] });

    expect(result.content).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("não explode com entrada que não é objeto", () => {
    for (const input of [null, undefined, "", 42, []]) {
      expect(() => migrate(input)).not.toThrow();
      expect(migrate(input).content).toBeNull();
    }
  });
});
