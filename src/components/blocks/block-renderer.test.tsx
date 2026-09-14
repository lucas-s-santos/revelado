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
 * As diferenças **esperadas** entre os modos. São duas, e cada uma tem motivo:
 *
 *  1. no preview o bloco nasce visível (`data-visible=""`); na publicada ele
 *     entra escondido para revelar no scroll;
 *  2. o título da capa é `h1` só na publicada. Ali a página **é** o documento;
 *     num preview ela é uma figura dentro de outra página, que já tem o `h1`
 *     dela. A tela de escolha de template mostra sete previews de uma vez — com
 *     `h1` em todos, ela nascia com oito, e quem navega por cabeçalho ouvia
 *     "Para você" sete vezes antes de chegar em qualquer coisa.
 *
 * A regra 2 do CLAUDE.md continua valendo onde ela importa: mesmo componente,
 * mesma árvore, mesmas classes, mesmo resultado visual. O que muda é o nome de
 * uma tag, por semântica de documento — e o teste abaixo prova que muda só isso.
 */
const TITULO_DA_CAPA = /<(?:h1|p) class="block-hero__title">(.*?)<\/(?:h1|p)>/g;

const normalizar = (html: string) =>
  html
    .replaceAll(' data-visible=""', "")
    .replace(TITULO_DA_CAPA, "<TITULO>$1</TITULO>");

describe("BlockRenderer", () => {
  it("renderiza preview e publicada com o mesmo resultado", () => {
    const preview = renderToStaticMarkup(
      <BlockRenderer content={demoContent} mode="preview" now={NOW} />,
    );
    const published = renderToStaticMarkup(
      <BlockRenderer content={demoContent} mode="published" now={NOW} />,
    );

    expect(preview).not.toBe("");
    expect(normalizar(preview)).toBe(
      normalizar(published).replaceAll(
        'data-mode="published"',
        'data-mode="preview"',
      ),
    );
  });

  it("o título da capa é h1 na publicada e não é no preview", () => {
    // A exceção da regra 2 fica guardada aqui, em vez de virar um buraco no
    // teste de cima: se alguém devolver o h1 ao preview, a tela de template
    // volta a ter oito, e este teste conta o porquê.
    const preview = renderToStaticMarkup(
      <BlockRenderer content={demoContent} mode="preview" now={NOW} />,
    );
    const published = renderToStaticMarkup(
      <BlockRenderer content={demoContent} mode="published" now={NOW} />,
    );

    expect(published).toContain('<h1 class="block-hero__title">');
    expect(preview).not.toContain("<h1");
    expect(preview).toContain('<p class="block-hero__title">');
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
    // `stats` está no schema mas é Fase 7: não tem componente.
    const content = {
      ...demoContent,
      blocks: [
        ...demoContent.blocks,
        { id: "stats", type: "stats" as const, props: { items: [] } },
      ],
    };

    const html = renderToStaticMarkup(
      <BlockRenderer content={content} mode="published" now={NOW} />,
    );

    expect(html).not.toContain('data-block="stats"');
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
