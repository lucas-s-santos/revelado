import { SCHEMA_VERSION, type SiteContent } from "@/lib/blocks/schema";

/**
 * Conteúdo de exemplo — usado pelo aceite da Fase 3 (`/dev/blocos`), pela
 * página de exemplo da landing e pelos testes.
 *
 * Não é um mock de teste solto: é a página que a gente mostra para quem quer ver
 * antes de comprar, então o texto é de verdade.
 */

/** Slug reservado, servido sem banco enquanto o Neon não estiver configurado. */
export const DEMO_SLUG = "exemplo-marina-e-teo";

/** Data fixa para o conteúdo ser determinístico nos testes e no build. */
const SINCE = "2021-06-12T03:00:00.000Z";

export const demoContent: SiteContent = {
  schemaVersion: SCHEMA_VERSION,
  theme: {
    template: "revelacao",
    skin: "clara",
    palette: "magenta",
    font: "mixed",
    effect: "hearts",
  },
  blocks: [
    {
      id: "hero",
      type: "hero",
      props: {
        title: "Marina e Téo",
        subtitle: "desde aquele dia na fila do cinema",
        align: "center",
        overlay: 0.45,
      },
    },
    {
      id: "counter",
      type: "counter",
      props: {
        mode: "since",
        date: SINCE,
        label: "juntos há",
        units: ["y", "mo", "d", "h", "m", "s"],
      },
    },
    {
      id: "letter",
      type: "letter",
      props: {
        text: "Eu não lembro do filme.\n\nLembro que você riu de uma coisa que eu falei sem graça nenhuma, e que eu passei o resto da semana tentando ser engraçado de novo. Cinco anos depois ainda estou tentando.\n\nObrigado por continuar rindo.",
        typewriter: false,
        signature: "Téo",
      },
    },
    {
      id: "gallery",
      type: "gallery",
      props: {
        layout: "carousel",
        mediaIds: ["demo-1", "demo-2", "demo-3", "demo-4"],
        captions: {
          "demo-1": "a primeira viagem",
          "demo-3": "o apartamento novo",
        },
      },
    },
    {
      id: "timeline",
      type: "timeline",
      props: {
        items: [
          {
            date: "jun 2021",
            title: "A fila do cinema",
            text: "Você estava atrás de mim e o filme já tinha começado.",
          },
          {
            date: "mar 2023",
            title: "A mudança",
            text: "Duas caixas de livro e uma discussão sobre a estante.",
          },
          { date: "hoje", title: "Aqui" },
        ],
      },
    },
    {
      id: "footer",
      type: "footer",
      props: { text: "para a Marina, que lê tudo até o fim" },
    },
  ],
};
