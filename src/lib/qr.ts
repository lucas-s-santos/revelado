/**
 * QR Code — SPEC 9.3.
 *
 * "Nível de correção **H**. Entregar PNG 2048px, SVG vetorial e PDF A6 pronto
 * para imprimir com moldura e frase."
 *
 * Nível H aguenta ~30% do código danificado. Não é exagero: o QR vai ser
 * impresso em papel comum, dobrado, colado dentro de um cartão e escaneado sob
 * luz de restaurante.
 *
 * Preto sobre branco de propósito — a Câmara Escura para aqui. Contraste
 * invertido ou colorido derruba a taxa de leitura em câmera ruim, e este é o
 * único artefato do produto que precisa funcionar no mundo físico.
 */

const QR_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
  color: { dark: "#000000", light: "#FFFFFF" },
};

export function pageUrlFor(slug: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/p/${slug}`;
}

export async function qrPng(slug: string, width = 2048): Promise<Buffer> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toBuffer(pageUrlFor(slug), {
    ...QR_OPTIONS,
    type: "png",
    width,
  });
}

export async function qrSvg(slug: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toString(pageUrlFor(slug), { ...QR_OPTIONS, type: "svg" });
}

/**
 * Cartão A6 (105 × 148 mm) pronto para imprimir.
 *
 * Medidas em pontos PDF (1pt = 1/72"). A6 = 297.6 × 419.5pt. O QR fica com
 * ~55mm de lado: abaixo de 40mm a leitura em celular antigo começa a falhar.
 */
export async function qrCardPdf(input: {
  slug: string;
  title: string;
  line?: string;
}): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const A6_WIDTH = 297.64;
  const A6_HEIGHT = 419.53;
  const MM = 2.8346; // pontos por milímetro

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Revelado — ${input.title}`);
  pdf.setCreator("Revelado");

  const page = pdf.addPage([A6_WIDTH, A6_HEIGHT]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  // Fundo branco: é o que a impressora doméstica reproduz melhor.
  page.drawRectangle({
    x: 0,
    y: 0,
    width: A6_WIDTH,
    height: A6_HEIGHT,
    color: rgb(1, 1, 1),
  });

  // Moldura fina, 8mm da borda — sobra margem para o corte sair torto.
  const inset = 8 * MM;
  page.drawRectangle({
    x: inset,
    y: inset,
    width: A6_WIDTH - inset * 2,
    height: A6_HEIGHT - inset * 2,
    borderColor: rgb(0.82, 0.82, 0.82),
    borderWidth: 0.75,
  });

  const png = await qrPng(input.slug, 1024);
  const image = await pdf.embedPng(png);

  const qrSize = 55 * MM;
  page.drawImage(image, {
    x: (A6_WIDTH - qrSize) / 2,
    y: A6_HEIGHT - inset - 22 * MM - qrSize,
    width: qrSize,
    height: qrSize,
  });

  const center = (text: string, font: typeof serif, size: number) =>
    (A6_WIDTH - font.widthOfTextAtSize(text, size)) / 2;

  const eyebrow = "APONTE A CÂMERA DO CELULAR";
  page.drawText(eyebrow, {
    x: center(eyebrow, sans, 7),
    y: A6_HEIGHT - inset - 14 * MM,
    size: 7,
    font: sans,
    color: rgb(0.55, 0.55, 0.55),
  });

  const title = truncate(input.title, serif, 18, A6_WIDTH - inset * 2 - 20);
  page.drawText(title, {
    x: center(title, serif, 18),
    y: 46 * MM,
    size: 18,
    font: serif,
    color: rgb(0.06, 0.04, 0.1),
  });

  if (input.line) {
    const line = truncate(input.line, sans, 9, A6_WIDTH - inset * 2 - 20);
    page.drawText(line, {
      x: center(line, sans, 9),
      y: 38 * MM,
      size: 9,
      font: sans,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  const brand = "feito com Revelado";
  page.drawText(brand, {
    x: center(brand, sans, 7),
    y: inset + 5 * MM,
    size: 7,
    font: sans,
    color: rgb(0.68, 0.68, 0.68),
  });

  return pdf.save();
}

/** Corta com reticências para o texto nunca vazar da moldura. */
function truncate(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;

  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}…`;
}
