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
import { DEFAULT_PALETTE, PALETTE_IDS } from "@/lib/palettes";

/** Base mínima de um conteúdo válido na versão atual. */
const base = {
  schemaVersion: SCHEMA_VERSION,
  theme: { template: "essencial", palette: "magenta" },
};

describe("schema dos blocos", () => {
  it("aplica os defaults do zod", () => {
    const parsed = parseSiteContent({
      ...base,
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
      ...base,
      blocks: [{ id: "z", type: "carrossel-3d", props: {} }],
    });

    expect(parsed.success).toBe(false);
  });

  it("recusa paleta que não existe", () => {
    const parsed = parseSiteContent({
      schemaVersion: SCHEMA_VERSION,
      theme: { template: "essencial", palette: "namorados" },
      blocks: [{ id: "h", type: "hero", props: { title: "Oi" } }],
    });

    expect(parsed.success).toBe(false);
  });

  it("aceita todas as paletas de revelação", () => {
    for (const palette of PALETTE_IDS) {
      const parsed = parseSiteContent({
        schemaVersion: SCHEMA_VERSION,
        theme: { template: "essencial", palette },
        blocks: [{ id: "h", type: "hero", props: { title: "Oi" } }],
      });

      expect(parsed.success, `${palette} devia valer`).toBe(true);
    }
  });

  it("recusa página sem bloco nenhum e respeita o teto de 30", () => {
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
        ...base,
        blocks: [{ id: "h", type: "hero", props: { title } }],
      }).success;

    expect(withTitle("a".repeat(80))).toBe(true);
    expect(withTitle("a".repeat(81))).toBe(false);
  });

  it("exige data ISO no contador", () => {
    const withDate = (date: string) =>
      parseSiteContent({
        ...base,
        blocks: [{ id: "c", type: "counter", props: { mode: "since", date } }],
      }).success;

    expect(withDate("2021-06-12T03:00:00.000Z")).toBe(true);
    expect(withDate("12/06/2021")).toBe(false);
  });
});

describe("conteúdo padrão", () => {
  it("gera conteúdo válido", () => {
    const parsed = parseSiteContent(defaultContent());
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("usa só tipos de bloco que existem no schema", () => {
    for (const block of defaultContent().blocks) {
      expect(blockTypes).toContain(block.type);
    }
  });

  it("dá a cada bloco um id único dentro da página", () => {
    const ids = defaultContent().blocks.map((block) => block.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("portão da publicação", () => {
  it("deixa o rascunho salvar sem foto, mas não publicar", () => {
    const content = defaultContent();

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
    const result = migrate(defaultContent());

    expect(result.content).not.toBeNull();
    expect(result.migrated).toBe(false);
    expect(result.from).toBe(SCHEMA_VERSION);
  });

  it("recusa conteúdo de versão futura em vez de adivinhar", () => {
    const result = migrate({ ...defaultContent(), schemaVersion: 99 });

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

/**
 * A v1 é a das ocasiões. Página publicada nessa versão tem QR impresso, então a
 * migração precisa subir sem derrubar nem trocar a cor por conta própria.
 */
describe("migração 1 → 2 (pivô para casais)", () => {
  const v1 = {
    schemaVersion: 1,
    occasion: "namorados",
    theme: { template: "namorados-revelacao", palette: "namorados" },
    blocks: [{ id: "h", type: "hero", props: { title: "Marina e Téo" } }],
  };

  it("sobe a versão e tira o campo occasion", () => {
    const result = migrate(v1);

    expect(result.content).not.toBeNull();
    expect(result.migrated).toBe(true);
    expect(result.from).toBe(1);
    expect(result.content).not.toHaveProperty("occasion");
    expect(result.content?.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("traduz a paleta da ocasião antiga", () => {
    expect(migrate(v1).content?.theme.palette).toBe("magenta");

    const casamento = migrate({
      ...v1,
      occasion: "casamento",
      theme: { template: "casamento-essencial", palette: "casamento" },
    });
    expect(casamento.content?.theme.palette).toBe("papel");
  });

  it("cai no padrão quando a ocasião não é nenhuma das conhecidas", () => {
    const result = migrate({
      ...v1,
      occasion: "halloween",
      theme: { template: "x", palette: "halloween" },
    });

    // Referencia a constante, não o valor: trocar o padrão da marca não pode
    // quebrar um teste que fala sobre o fallback, e não sobre a cor.
    expect(result.content?.theme.palette).toBe(DEFAULT_PALETTE);
  });

  it("assume a pele clara em conteúdo que nasceu antes dela existir", () => {
    expect(migrate(v1).content?.theme.skin).toBe("clara");
  });

  it("preserva os blocos que já estavam lá", () => {
    const result = migrate(v1);

    expect(result.content?.blocks).toHaveLength(1);
    expect(result.content?.blocks[0]?.id).toBe("h");
  });
});
