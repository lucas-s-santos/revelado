import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

import type { BlockOf, SiteContent } from "@/lib/blocks/schema";
import { collectMediaIds, mediaMapFor } from "@/lib/media";
import { getPublishedSite, isExpired } from "@/lib/sites";

/**
 * A imagem que o WhatsApp mostra quando o link chega — SPEC 8.8.
 *
 * **Este é o frame zero da experiência, antes do portal.** O link é entregue
 * numa conversa, e o que a pessoa vê primeiro não é a página: é o retângulo do
 * preview. Ele estava saindo vazio, com título e descrição em texto e mais
 * nada — um link cru no meio do WhatsApp não parece presente, parece spam.
 *
 * Regras que valem aqui:
 *
 * - **Nunca falhar.** Se o site sumiu, se a foto não carrega, se a fonte não
 *   lê — sai a versão de marca, nunca um erro. Um preview quebrado é pior que
 *   um preview simples, e esta rota é chamada por robôs que não tentam de novo.
 * - **Não entregar a página.** O nome do casal aparece; a carta, as fotos de
 *   dentro e o contador não. Quem abre o link tem que abrir para descobrir.
 * - **Nada de grid.** O renderizador do `ImageResponse` (Satori) só entende um
 *   subconjunto de CSS: flexbox sim, grid não, e todo elemento com mais de um
 *   filho precisa de `display: flex` declarado.
 * - **A capa passa pelo sharp antes de entrar.** O Satori decodifica PNG, JPEG
 *   e SVG — e ignora WebP **em silêncio**, sem erro e sem espaço reservado.
 *   Como o upload converte toda foto para WebP (`use-uploads.ts`), a capa
 *   nunca apareceria: medi 122 KB de imagem com a foto WebP contra 367 KB com
 *   um PNG no mesmo lugar. Convertendo para JPEG aqui, qualquer formato que o
 *   produto aceite hoje ou aceite depois continua funcionando.
 */

export const runtime = "nodejs";
export const alt = "Uma página do Revelado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Tokens do theme.css. Repetidos como literais porque o Satori não lê CSS
 * custom properties — ele resolve estilo inline, não cascata. */
const DEEP = "#2C0A1B";
const DEEP_2 = "#3D0F22";
const CREME = "#FFF0F5";
const MUTED = "#C9A8B8";
const BRAND = "#FF6FAE";

async function fonte(arquivo: string): Promise<ArrayBuffer | null> {
  try {
    const buf = await readFile(join(process.cwd(), "src/assets/fonts", arquivo));
    return new Uint8Array(buf).buffer;
  } catch {
    // Sem a fonte o Satori cai no padrão dele. Feio, mas sai imagem.
    return null;
  }
}

/** O bloco de capa, estreitado de verdade.
 *
 * `"x" in props` sobre uma união discriminada devolve `{}` e o título perde o
 * tipo; e tirar o tipo de `Parameters<typeof collectMediaIds>` também não
 * serve, porque aquela função aceita uma forma estrutural solta e o `Extract`
 * sai `never`. O schema já publica `BlockOf<"hero">` para exatamente isto. */
function acharHero(content: SiteContent): BlockOf<"hero"> | undefined {
  return content.blocks.find(
    (block): block is BlockOf<"hero"> => block.type === "hero",
  );
}

/** A capa, quando dá para resolver uma URL absoluta para ela. */
async function capa(siteId: string, content: SiteContent) {
  const mediaId = acharHero(content)?.props.mediaId;
  if (!mediaId) return null;

  const url = mediaMapFor(siteId, collectMediaIds(content))[mediaId];
  if (!url) return null;

  /* Mesma convenção do lib/qr.ts, que resolve o mesmo problema (montar uma
   * URL absoluta a partir de um caminho). `headers()` seria mais esperto, mas
   * esta rota pode ser renderizada estaticamente, e ali não existe pedido — a
   * chamada estoura e o catch de quem chama engole, deixando a capa sumir sem
   * dizer por quê. */
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const absoluta = url.startsWith("http") ? url : `${base}${url}`;

  const resposta = await fetch(absoluta);
  if (!resposta.ok) return null;

  /* JPEG, e não a foto crua: ver a nota sobre o Satori no topo do arquivo.
   * Já redimensiona para o tamanho final — a capa costuma ser bem maior que
   * 1200px, e carregar o excedente só para descartá-lo engorda o data URI. */
  const jpeg = await sharp(Buffer.from(await resposta.arrayBuffer()))
    .resize(size.width, size.height, { fit: "cover" })
    .jpeg({ quality: 78 })
    .toBuffer();

  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getPublishedSite(slug).catch(() => null);

  const titulo =
    (site ? acharHero(site.content)?.props.title : undefined) ??
    "Uma página de vocês";
  const expirada = site ? isExpired(site) : false;

  const [display, corpo, foto] = await Promise.all([
    fonte("fraunces-600.ttf"),
    fonte("jakarta-500.ttf"),
    site && !expirada
      ? capa(site.id, site.content).catch(() => null)
      : Promise.resolve(null),
  ]);

  const fonts = [
    display && { name: "Fraunces", data: display, weight: 600 as const },
    corpo && { name: "Jakarta", data: corpo, weight: 500 as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: `linear-gradient(135deg, ${DEEP_2} 0%, ${DEEP} 100%)`,
        }}
      >
        {/* A foto entra como fundo esmaecido: dá calor e contexto sem
            entregar o álbum. Sem foto, o gradiente sozinho resolve. */}
        {foto ? (
          /* eslint-disable-next-line @next/next/no-img-element --
             next/image nao existe aqui dentro: o Satori renderiza um
             subconjunto de HTML/CSS no servidor e produz um PNG, sem DOM e sem
             o pipeline de otimizacao do Next. A tag crua e a unica opcao. */
          <img
            src={foto}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "1200px",
              height: "630px",
              objectFit: "cover",
              opacity: 0.34,
            }}
          />
        ) : null}

        {/* Véu por cima da foto: é o que garante que o texto tenha fundo
            previsível, independente de a capa ser clara ou escura. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "1200px",
            height: "630px",
            display: "flex",
            background: `linear-gradient(100deg, ${DEEP} 22%, rgba(44,10,27,0.72) 62%, rgba(44,10,27,0.45) 100%)`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 80px",
            width: "1200px",
            height: "630px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "999px",
                background: BRAND,
                display: "flex",
              }}
            />
            <div
              style={{
                fontFamily: "Jakarta",
                fontSize: "24px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: MUTED,
              }}
            >
              alguém preparou esta página para você
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: titulo.length > 28 ? "76px" : "104px",
                lineHeight: 1.02,
                color: CREME,
                // Satori não quebra linha sozinho em caixa sem largura.
                maxWidth: "900px",
              }}
            >
              {titulo}
            </div>

            <div
              style={{
                fontFamily: "Jakarta",
                fontSize: "30px",
                color: MUTED,
                display: "flex",
              }}
            >
              {expirada ? "esta página expirou" : "toque para abrir"}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
