import { NextResponse } from "next/server";

import { qrCardPdf, qrPng, qrSvg } from "@/lib/qr";
import { getPublishedSite } from "@/lib/sites";

/**
 * QR Code da página — SPEC 9.1 e 9.3.
 *
 * `?formato=png|svg|pdf`. Cacheado por um ano: o slug é imutável depois de
 * publicado (SPEC 7.1), então o QR dele nunca muda — gerar de novo a cada
 * download seria trabalho jogado fora.
 */

type Params = Promise<{ slug: string }>;

const CACHE = "public, max-age=31536000, immutable";

export async function GET(request: Request, { params }: { params: Params }) {
  const { slug } = await params;
  const format = new URL(request.url).searchParams.get("formato") ?? "png";

  const site = await getPublishedSite(slug);
  if (!site) {
    return NextResponse.json(
      { error: "Página não encontrada." },
      { status: 404 },
    );
  }

  const hero = site.content.blocks.find((block) => block.type === "hero");
  const title =
    hero?.type === "hero" ? hero.props.title : "Uma página para você";
  const line = hero?.type === "hero" ? hero.props.subtitle : undefined;

  if (format === "svg") {
    return new NextResponse(await qrSvg(slug), {
      headers: { "content-type": "image/svg+xml", "cache-control": CACHE },
    });
  }

  if (format === "pdf") {
    const pdf = await qrCardPdf({ slug, title, ...(line ? { line } : {}) });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="revelado-${slug}.pdf"`,
        "cache-control": CACHE,
      },
    });
  }

  const png = await qrPng(slug);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "content-disposition": `attachment; filename="revelado-${slug}.png"`,
      "cache-control": CACHE,
    },
  });
}
