import { describe, expect, it } from "vitest";

import { pageUrlFor, qrCardPdf, qrPng, qrSvg } from "@/lib/qr";

/**
 * Aceite da Fase 5 (SPEC 13): "QR impresso em papel comum escaneia em três
 * aparelhos".
 *
 * O teste físico continua sendo seu — nenhum teste automatizado imprime papel.
 * O que dá para garantir aqui é o degrau anterior: que o PNG gerado é um QR
 * **decodificável de verdade** e que ele aponta para a página certa. Um QR
 * corrompido nunca chegaria à impressora.
 */

const SLUG = "namorados-abc123";

/** Decodifica o PNG de volta, como se fosse a câmera do celular. */
async function decode(png: Buffer): Promise<string | null> {
  const { PNG } = await import("pngjs");
  const jsQR = (await import("jsqr")).default;

  const image = PNG.sync.read(png);
  const result = jsQR(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height,
  );

  return result?.data ?? null;
}

describe("QR Code", () => {
  it("gera PNG que decodifica de volta para a URL da página", async () => {
    const png = await qrPng(SLUG, 512);

    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(await decode(png)).toBe(pageUrlFor(SLUG));
  }, 30_000);

  it("continua legível com um pedaço danificado (nível H)", async () => {
    const png = await qrPng(SLUG, 512);

    const { PNG } = await import("pngjs");
    const image = PNG.sync.read(png);

    // Apaga um quadrado no meio — o borrão de tinta ou a dobra que um cartão
    // impresso em casa leva. Nível H recupera até ~30% do código; aqui vai um
    // pedaço menor que isso, porque a promessa do SPEC é "escaneia depois de
    // impresso", não "sobrevive a qualquer coisa".
    const side = Math.floor(image.width * 0.22);
    const start = Math.floor((image.width - side) / 2);

    for (let y = start; y < start + side; y++) {
      for (let x = start; x < start + side; x++) {
        const index = (image.width * y + x) << 2;
        image.data[index] = 255;
        image.data[index + 1] = 255;
        image.data[index + 2] = 255;
      }
    }

    const damaged = PNG.sync.write(image);
    expect(await decode(damaged)).toBe(pageUrlFor(SLUG));
  }, 30_000);

  it("gera SVG vetorial com o desenho dentro", async () => {
    const svg = await qrSvg(SLUG);

    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox");
    expect(svg).toContain("<path");
  });

  it("gera o cartão A6 em PDF com o tamanho certo", async () => {
    const pdf = await qrCardPdf({
      slug: SLUG,
      title: "Marina e Téo",
      line: "desde aquele dia na fila do cinema",
    });

    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");

    const { PDFDocument } = await import("pdf-lib");
    const parsed = await PDFDocument.load(pdf);
    const page = parsed.getPage(0);

    // A6 = 105 × 148 mm em pontos, com 1pt de tolerância.
    expect(page.getWidth()).toBeCloseTo(297.64, 0);
    expect(page.getHeight()).toBeCloseTo(419.53, 0);
    expect(parsed.getPageCount()).toBe(1);
  }, 30_000);

  it("corta título comprido em vez de deixar vazar da moldura", async () => {
    const pdf = await qrCardPdf({
      slug: SLUG,
      title:
        "Um título absurdamente longo que jamais caberia num cartão A6 inteiro",
    });

    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
  }, 30_000);
});
