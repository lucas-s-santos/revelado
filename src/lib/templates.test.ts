import { describe, expect, it } from "vitest";

import { parseSiteContent } from "@/lib/blocks/schema";
import { OCCASION_IDS } from "@/lib/occasions";
import { PLAN_IDS } from "@/lib/plans";
import {
  contentForTemplate,
  findTemplate,
  TEMPLATES,
  templatesFor,
} from "@/lib/templates";

/**
 * Templates — SPEC 8.3.
 *
 * O que estes testes travam:
 *  1. **o que a SPEC pede de quantidade** (6 a 8 por ocasião);
 *  2. **o template não mexe nos blocos.** Se um dia mexer, trocar de template no
 *     editor apagaria o que a pessoa escreveu — é o pior jeito de perder
 *     trabalho, e nada no tipo impede alguém de tentar;
 *  3. **memorial não recebe efeito de festa.** Confete numa página de memória é
 *     a diferença entre um presente e uma ofensa.
 */
describe("templates por ocasião", () => {
  it("entrega de 6 a 8 templates em toda ocasião, como a SPEC pede", () => {
    for (const occasion of OCCASION_IDS) {
      const lista = templatesFor(occasion);
      expect(lista.length, occasion).toBeGreaterThanOrEqual(6);
      expect(lista.length, occasion).toBeLessThanOrEqual(8);
    }
  });

  it("nenhum id se repete dentro da mesma ocasião", () => {
    for (const occasion of OCCASION_IDS) {
      const ids = templatesFor(occasion).map((template) => template.id);
      expect(new Set(ids).size, occasion).toBe(ids.length);
    }
  });

  it("o id carrega a ocasião — é o que vai em content.theme.template", () => {
    for (const template of templatesFor("natal")) {
      expect(template.id.startsWith("natal-")).toBe(true);
    }
  });

  it("todo plano exigido é um plano que existe", () => {
    for (const template of TEMPLATES) {
      if (template.planRequired === null) continue;
      expect(PLAN_IDS as readonly string[]).toContain(template.planRequired);
    }
  });

  it("pelo menos um template está disponível sem plano pago", () => {
    for (const occasion of OCCASION_IDS) {
      const gratuitos = templatesFor(occasion).filter(
        (template) => template.planRequired === null,
      );
      expect(gratuitos.length, occasion).toBeGreaterThan(0);
    }
  });
});

describe("efeito característico da ocasião", () => {
  it("Natal nasce com neve e Namorados com corações", () => {
    expect(findTemplate("natal", "revelacao")?.effect).toBe("snow");
    expect(findTemplate("namorados", "revelacao")?.effect).toBe("hearts");
  });

  it("memorial nunca recebe efeito de festa", () => {
    const proibidos = ["confetti", "hearts"];

    for (const template of templatesFor("memorial")) {
      expect(proibidos, template.id).not.toContain(template.effect);
    }
  });
});

describe("conteúdo gerado a partir do template", () => {
  it("aplica o tema do template", () => {
    const content = contentForTemplate("casamento", "manuscrito");

    expect(content.theme.template).toBe("casamento-manuscrito");
    expect(content.theme.font).toBe("serif");
    expect(content.theme.effect).toBe("none");
    expect(content.theme.palette).toBe("casamento");
  });

  it("não mexe nos blocos — trocar de tema não pode apagar o que a pessoa escreveu", () => {
    const essencial = contentForTemplate("namorados", "essencial");
    const festa = contentForTemplate("namorados", "festa");

    expect(festa.blocks).toEqual(essencial.blocks);
  });

  it("template desconhecido cai no padrão em vez de falhar", () => {
    // Link velho, ou template removido: ninguém perde a página por um tema.
    const content = contentForTemplate("bebe", "template-que-nao-existe");

    expect(content.blocks.length).toBeGreaterThan(0);
    expect(content.theme.palette).toBe("bebe");
  });

  it("todo template de toda ocasião gera conteúdo que passa no zod", () => {
    for (const occasion of OCCASION_IDS) {
      for (const template of templatesFor(occasion)) {
        const parsed = parseSiteContent(
          contentForTemplate(occasion, template.slug),
        );
        expect(parsed.success, `${template.id}`).toBe(true);
      }
    }
  });
});
