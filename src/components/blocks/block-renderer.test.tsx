import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BlockRenderer } from "@/components/blocks/block-renderer";
import { registry } from "@/components/blocks/registry";
import { demoContent } from "@/lib/blocks/fixtures";
import { blockTypes, parseSiteContent } from "@/lib/blocks/schema";

/**
 * Aceite da Fase 3 (SPEC 13): "renderizar um SiteContent fixo em preview e em
 * /p/[slug] com o mesmo componente e resultado idêntico".
 *
 * A prova visual é `/dev/blocos`. Esta é a automatizada: renderiza os dois modos
 * e compara o HTML. Se alguém duplicar o renderer no futuro (anti-padrão 2 da
 * seção 12), este teste quebra.
 *
 * `now` fixo porque o contador é ao vivo — sem isso os dois lados divergem por
 * um segundo e o teste ficaria intermitente.
 */
const NOW = Date.parse("2026-07-26T15:00:00.000Z");

/**
 * Única diferença esperada entre os modos: no preview o bloco nasce visível
 * (`data-visible=""`), na publicada ele entra escondido para revelar no scroll.
 * É intencional e é só esse atributo.
 */
const stripRevealState = (html: string) =>
  html.replaceAll(' data-visible=""', "");

describe("BlockRenderer", () => {
  it("renderiza preview e publicada com o mesmo resultado", () => {
    const preview = renderToStaticMarkup(
      <BlockRenderer content={demoContent} mode="preview" now={NOW} />,
    );
    const published = renderToStaticMarkup(
      <BlockRenderer content={demoContent} mode="published" now={NOW} />,
    );

    expect(preview).not.toBe("");
    expect(stripRevealState(preview)).toBe(
      stripRevealState(published).replaceAll(
        'data-mode="published"',
        'data-mode="preview"',
      ),
    );
  });

  it("desenha um bloco de cada tipo pronto presente no conteúdo", () => {
    const html = renderToStaticMarkup(
      <BlockRenderer content={demoContent} mode="published" now={NOW} />,
    );

    for (const block of demoContent.blocks) {
      expect(html).toContain(`data-block="${block.type}"`);
    }
  });

  it("ignora bloco sem componente em vez de quebrar a página", () => {
    /* Este teste usava `stats`, que desde entao ganhou componente — e passou a
     * testar o contrario do que dizia. A afirmacao abaixo existe para isso nao
     * se repetir em silencio: no dia em que `map` for implementado, ela falha
     * com um recado dizendo para trocar o exemplo, em vez de o teste continuar
     * verde sem verificar nada. */
    expect(registry.map.ready).toBe(false);

    const content = {
      ...demoContent,
      blocks: [
        ...demoContent.blocks,
        {
          id: "map",
          type: "map" as const,
          props: { lat: -23.55, lng: -46.63, label: "onde a gente se conheceu" },
        },
      ],
    };

    const html = renderToStaticMarkup(
      <BlockRenderer content={content} mode="published" now={NOW} />,
    );

    expect(html).not.toContain('data-block="map"');
    expect(html).toContain('data-block="hero"'); // o resto continua no ar
  });

  it("leva a paleta e a fonte para o DOM", () => {
    const html = renderToStaticMarkup(
      <BlockRenderer content={demoContent} mode="published" now={NOW} />,
    );

    expect(html).toContain(`data-palette="${demoContent.theme.palette}"`);
    expect(html).toContain(`data-font="${demoContent.theme.font}"`);
  });
});

describe("registry", () => {
  it("cobre todos os tipos do schema, sem sobra nem falta", () => {
    expect(Object.keys(registry).sort()).toEqual([...blockTypes].sort());
  });

  it("todo bloco marcado como pronto tem componente", () => {
    for (const type of blockTypes) {
      const definition = registry[type];
      if (definition.ready) {
        expect(
          definition.component,
          `${type} está pronto sem componente`,
        ).toBeTypeOf("function");
      } else {
        expect(
          definition.component,
          `${type} não está pronto mas tem componente`,
        ).toBeUndefined();
      }
    }
  });

  it("cobre os sete blocos que a Fase 3 pede", () => {
    const fase3 = [
      "hero",
      "counter",
      "letter",
      "gallery",
      "music",
      "timeline",
      "footer",
    ] as const;

    for (const type of fase3) {
      expect(registry[type].ready, `${type} deveria estar pronto`).toBe(true);
    }
  });
});

describe("fixture de demonstração", () => {
  it("passa pelo schema", () => {
    const parsed = parseSiteContent(demoContent);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });
});
