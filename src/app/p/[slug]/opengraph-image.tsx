import { ImageResponse } from "next/og";

import { publicUrlFor } from "@/lib/media";
import { getOccasion } from "@/lib/occasions";
import { getPublishedSite, isExpired } from "@/lib/sites";

/**
 * Card do WhatsApp — SPEC 8.8: "é marketing gratuito no WhatsApp".
 *
 * Praticamente toda página deste produto é entregue colando um link numa
 * conversa. O card é a primeira coisa que a pessoa presenteada vê, antes mesmo
 * de tocar no link — vale mais que qualquer seção da landing.
 *
 * As cores estão escritas em hexadecimal aqui, como em `lib/email.ts` e pelo
 * mesmo motivo: o Satori renderiza fora do navegador e não enxerga as custom
 * properties de `styles/theme.css`. O accent, que é o que muda por ocasião,
 * continua vindo de uma fonte só (`lib/occasions.ts`).
 */

export const runtime = "nodejs";
export const alt = "Uma página feita no Revelado";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NOIR = "#0A0711";
const NOIR_2 = "#120C1C";
const PAPER = "#F6EFE6";
const MUTED = "#9B90AA";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getPublishedSite(slug);

  const accent = rgb(
    (site && getOccasion(site.occasionId)?.accent) || "242 180 87",
  );

  const hero = site?.content.blocks.find((block) => block.type === "hero");

  // Página com senha não entrega **nada** do conteúdo no card: nem os nomes,
  // nem a foto. Quem não tem a senha não pode descobrir o presente pela prévia
  // do WhatsApp, senão a senha protege pela metade (SPEC 9.4).
  const locked = site?.hasPassword ?? false;
  const expired = site ? isExpired(site) : false;

  const title = locked
    ? "Uma página privada"
    : hero?.type === "hero" && hero.props.title.trim()
      ? hero.props.title
      : "Uma página para você";

  const subtitle = locked
    ? "Peça a senha para quem te enviou o link."
    : hero?.type === "hero" && hero.props.subtitle?.trim()
      ? hero.props.subtitle
      : "Feito com Revelado.";

  /**
   * A foto só entra quando o R2 tem host público: o Satori busca a imagem por
   * URL absoluta, e o caminho local (`/api/media/…`) não existe para ele.
   */
  const photo =
    !locked && !expired && hero?.type === "hero" && hero.props.mediaId
      ? absolute(publicUrlFor(site!.id, hero.props.mediaId))
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          // Com foto, o texto assenta embaixo, sobre o véu escuro. Sem foto,
          // centralizado — senão o card fica com meia tela vazia em cima.
          justifyContent: photo ? "flex-end" : "center",
          position: "relative",
          background: NOIR,
          color: PAPER,
          fontFamily: "sans-serif",
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={size.width}
            height={size.height}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        {/* Véu escuro: garante o contraste do texto sobre qualquer foto. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: photo
              ? `linear-gradient(180deg, rgba(10,7,17,.35) 0%, rgba(10,7,17,.92) 72%)`
              : `radial-gradient(900px 520px at 18% -10%, ${NOIR_2} 0%, ${NOIR} 70%)`,
          }}
        />

        {/* Luz de segurança: a assinatura visual da Câmara Escura (SPEC 4).
         *
         * Círculo com paradas explícitas e `borderRadius`: o Satori não entende
         * `closest-side` e, sem isso, o brilho vaza até a borda da caixa e
         * aparece como um retângulo magenta no card. */}
        <div
          style={{
            position: "absolute",
            top: -300,
            left: -220,
            width: 760,
            height: 760,
            borderRadius: 760,
            background: `radial-gradient(circle, ${accent(0.32)} 0%, ${accent(0.12)} 45%, rgba(10,7,17,0) 70%)`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            padding: photo ? "0 72px 72px" : "0 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: accent(1),
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: accent(1),
              }}
            />
            {locked ? "página privada" : "revelado"}
          </div>

          <div
            style={{
              fontSize: title.length > 42 ? 66 : 88,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              maxWidth: 980,
            }}
          >
            {title}
          </div>

          <div style={{ fontSize: 32, color: MUTED, maxWidth: 860 }}>
            {subtitle}
          </div>
        </div>

        {/* Filete do accent na base — a mesma marca d'água do rodapé do produto.
         * Posicionado, e não como último filho do flex: com o conteúdo
         * centralizado (card sem foto) ele seria centralizado junto e cortaria
         * a imagem ao meio. */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 10,
            background: accent(1),
          }}
        />
      </div>
    ),
    size,
  );
}

/**
 * `"224 80 143"` → função de opacidade, o equivalente a `rgb(var(--x) / .3)`.
 *
 * Sempre na forma com vírgula: o Satori não é um navegador e a sintaxe moderna
 * separada por espaço nem sempre passa pelo parser dele.
 */
function rgb(triplet: string) {
  const channels = triplet.trim().split(/\s+/).join(",");
  return (alpha: number) => `rgba(${channels},${alpha})`;
}

function absolute(url: string): string | null {
  if (url.startsWith("http")) return url;

  const base = process.env.NEXT_PUBLIC_SITE_URL;
  return base ? `${base}${url}` : null;
}
