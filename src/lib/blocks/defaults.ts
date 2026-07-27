import {
  SCHEMA_VERSION,
  type Block,
  type SiteContent,
} from "@/lib/blocks/schema";
import { type OccasionId } from "@/lib/occasions";

/**
 * Preset de blocos por ocasião — SPEC 7.1 (`Occasion.defaultBlocks`) e Fase 3.
 *
 * É o que o editor carrega quando a pessoa escolhe a ocasião: a página já nasce
 * com o clima certo, para ela editar em vez de começar do zero (SPEC 8.2).
 * O texto é convite, nunca recado triste (SPEC 11).
 */

const block = <T extends Block>(value: T): T => value;

/** ISO de uma data-alvo plausível, para o contador não nascer vazio. */
function isoYearsAgo(years: number): string {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear() - years,
      now.getUTCMonth(),
      now.getUTCDate(),
      3,
    ),
  ).toISOString();
}

function isoNextBirthday(): string {
  const now = new Date();
  const year =
    now.getUTCMonth() >= 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(year, 11, 31, 3)).toISOString();
}

const footer = (text: string) =>
  block({ id: "footer", type: "footer", props: { text } });

const gallery = block({
  id: "gallery",
  type: "gallery",
  props: {
    layout: "carousel" as const,
    mediaIds: [],
    captions: undefined,
  },
});

function blocksFor(occasion: OccasionId): Block[] {
  switch (occasion) {
    case "namorados":
      return [
        block({
          id: "hero",
          type: "hero",
          props: {
            title: "Para você",
            subtitle: "com todo o meu amor",
            align: "center" as const,
            overlay: 0.45,
          },
        }),
        block({
          id: "counter",
          type: "counter",
          props: {
            mode: "since" as const,
            date: isoYearsAgo(1),
            label: "juntos há",
            units: ["y", "mo", "d", "h", "m", "s"] as const,
          },
        }),
        gallery,
        block({
          id: "letter",
          type: "letter",
          props: {
            text: "Escreva aqui o que você não conseguiria falar olhando nos olhos.",
            typewriter: false,
            signature: undefined,
          },
        }),
        footer("Feito com carinho, só para você"),
      ];

    case "aniversario":
      return [
        block({
          id: "hero",
          type: "hero",
          props: {
            title: "Feliz aniversário!",
            subtitle: "que este ano seja do tamanho de você",
            align: "center" as const,
            overlay: 0.4,
          },
        }),
        block({
          id: "counter",
          type: "counter",
          props: {
            mode: "until" as const,
            date: isoNextBirthday(),
            label: "faltam",
            units: ["d", "h", "m", "s"] as const,
          },
        }),
        gallery,
        block({
          id: "letter",
          type: "letter",
          props: {
            text: "Conte por que essa pessoa faz diferença na sua vida.",
            typewriter: false,
            signature: undefined,
          },
        }),
        footer("Um brinde a você"),
      ];

    case "maes":
    case "pais":
      return [
        block({
          id: "hero",
          type: "hero",
          props: {
            title: occasion === "maes" ? "Para a minha mãe" : "Para o meu pai",
            subtitle: "obrigado por tudo",
            align: "center" as const,
            overlay: 0.45,
          },
        }),
        gallery,
        block({
          id: "letter",
          type: "letter",
          props: {
            text: "Aquela história que a família toda conta — escreva ela aqui.",
            typewriter: false,
            signature: undefined,
          },
        }),
        block({
          id: "timeline",
          type: "timeline",
          props: { items: [] },
        }),
        footer("Com amor, da sua família"),
      ];

    case "casamento":
      return [
        block({
          id: "hero",
          type: "hero",
          props: {
            title: "Vamos nos casar",
            subtitle: "e queremos você lá",
            align: "center" as const,
            overlay: 0.5,
          },
        }),
        block({
          id: "counter",
          type: "counter",
          props: {
            mode: "until" as const,
            date: isoNextBirthday(),
            label: "faltam",
            units: ["d", "h", "m"] as const,
          },
        }),
        gallery,
        block({
          id: "letter",
          type: "letter",
          props: {
            text: "Conte como vocês se conheceram.",
            typewriter: false,
            signature: undefined,
          },
        }),
        footer("Até lá"),
      ];

    case "bebe":
      return [
        block({
          id: "hero",
          type: "hero",
          props: {
            title: "Ele está chegando",
            subtitle: "e a casa já está diferente",
            align: "center" as const,
            overlay: 0.4,
          },
        }),
        block({
          id: "counter",
          type: "counter",
          props: {
            mode: "until" as const,
            date: isoNextBirthday(),
            label: "faltam",
            units: ["d", "h"] as const,
          },
        }),
        gallery,
        footer("Com amor, papai e mamãe"),
      ];

    case "natal":
      return [
        block({
          id: "hero",
          type: "hero",
          props: {
            title: "Feliz Natal",
            subtitle: "de quem gosta de você",
            align: "center" as const,
            overlay: 0.45,
          },
        }),
        block({
          id: "counter",
          type: "counter",
          props: {
            mode: "until" as const,
            date: isoNextBirthday(),
            label: "faltam",
            units: ["d", "h", "m", "s"] as const,
          },
        }),
        gallery,
        block({
          id: "letter",
          type: "letter",
          props: {
            text: "Um recado de fim de ano para quem você ama.",
            typewriter: false,
            signature: undefined,
          },
        }),
        footer("Boas festas"),
      ];

    case "memorial":
      return [
        block({
          id: "hero",
          type: "hero",
          props: {
            title: "Para sempre com a gente",
            align: "center" as const,
            overlay: 0.55,
          },
        }),
        gallery,
        block({
          id: "letter",
          type: "letter",
          props: {
            text: "Escreva a lembrança que você quer guardar.",
            typewriter: false,
            signature: undefined,
          },
        }),
        block({
          id: "timeline",
          type: "timeline",
          props: { items: [] },
        }),
        footer("Sempre lembrado"),
      ];
  }
}

/** Conteúdo inicial de um rascunho novo. */
export function defaultContent(
  occasion: OccasionId,
  template = `${occasion}-essencial`,
): SiteContent {
  return {
    schemaVersion: SCHEMA_VERSION,
    occasion,
    theme: {
      template,
      palette: occasion,
      font: "mixed",
      effect: occasion === "namorados" ? "hearts" : "none",
    },
    blocks: blocksFor(occasion),
  };
}

export { blocksFor as defaultBlocksFor };
