import { SCHEMA_VERSION, type SiteContent } from "@/lib/blocks/schema";

/**
 * Conteúdo de exemplo — usado pelo aceite da Fase 3 (`/dev/blocos`), pela
 * página de exemplo da landing e pelos testes.
 *
 * Não é um mock de teste solto: é a página que a gente mostra para quem quer ver
 * antes de comprar, então o texto é de verdade.
 */

/** Slug reservado, servido sem banco enquanto o Neon não estiver configurado.
 *  Mora em `demo-slug.ts` para o cliente poder lê-lo sem puxar este arquivo. */
export { DEMO_SLUG } from "@/lib/blocks/demo-slug";

/** Data fixa para o conteúdo ser determinístico nos testes e no build. */
const SINCE = "2021-06-12T03:00:00.000Z";

/**
 * A cápsula do exemplo abre no próximo 12 de junho.
 *
 * Calculada, e não fixa como `SINCE`: uma data cravada viraria passado e a
 * cápsula do exemplo apareceria aberta, escondendo justamente o que ela é. O
 * exemplo existe para mostrar o recurso funcionando, então ela precisa estar
 * sempre lacrada — com um contador de verdade correndo.
 */
function proximoDozeDeJunho(): string {
  const agora = new Date();
  const ano =
    agora.getUTCMonth() > 5 || (agora.getUTCMonth() === 5 && agora.getUTCDate() > 12)
      ? agora.getUTCFullYear() + 1
      : agora.getUTCFullYear();

  return new Date(Date.UTC(ano, 5, 12, 3)).toISOString();
}

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
        // A capa. Sem ela o exemplo abria com mil pixels de degradê vazio antes
        // do nome — e a imagem de preview do link saía sem foto nenhuma, que é
        // o primeiro frame que alguem ve no WhatsApp.
        //
        // É a mesma foto que abre a galeria, de propósito: o editor promete
        // "a primeira vira a capa", e o exemplo tem que mostrar o produto do
        // jeito que ele funciona.
        mediaId: "demo-1",
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
      id: "stats",
      type: "stats",
      props: {
        /* Especificos ao ponto de parecerem invencao — que e exatamente o
         * argumento. Quem le "3 paises, 11 mudancas de ideia sobre o nome do
         * gato" entende sem explicacao que a pagina e sobre um casal
         * especifico, e nao um modelo com o nome trocado. Cinco itens: a grade
         * de tres colunas fecha bonito em 3+2. */
        items: [
          { value: "3", label: "países onde a gente se perdeu" },
          { value: "1", label: "gato, 11 mudanças de ideia sobre o nome" },
          { value: "47", label: "vezes que vimos o mesmo filme" },
          { value: "2", label: "mudanças de apartamento" },
          { value: "∞", label: "brigas por causa do ar-condicionado" },
        ],
      },
    },
    {
      id: "letter",
      type: "letter",
      props: {
        text: "Eu não lembro do filme.\n\nLembro que você riu de uma coisa que eu falei sem graça nenhuma, e que eu passei o resto da semana tentando ser engraçado de novo. Cinco anos depois ainda estou tentando.\n\nObrigado por continuar rindo.",
        typewriter: false,
        reveal: "plain" as const,
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
      id: "capsule",
      type: "capsule",
      props: {
        openAt: proximoDozeDeJunho(),
        text: "Cinco anos. E eu ainda faço questão de chegar antes para pegar o lugar do corredor.",
      },
    },
    {
      id: "footer",
      type: "footer",
      props: { text: "para a Marina, que lê tudo até o fim" },
    },
  ],
};
