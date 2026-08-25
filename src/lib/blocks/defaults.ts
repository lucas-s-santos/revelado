import {
  SCHEMA_VERSION,
  type Block,
  type SiteContent,
} from "@/lib/blocks/schema";
import { DEFAULT_PALETTE, DEFAULT_SKIN } from "@/lib/palettes";

/**
 * Preset de blocos do rascunho novo — SPEC 7.1 (`Template.preset`) e Fase 3.
 *
 * Antes isto era um `switch` de oito ocasiões. Agora o produto é um só, então é
 * uma lista só: a página que uma pessoa faz para a outra. Ela nasce montada
 * para ser editada, não em branco (SPEC 8.4), e o texto é convite — nunca
 * recado triste (SPEC 11).
 */

const block = <T extends Block>(value: T): T => value;

/** Padrão do contador: um ano atrás. Data plausível, para não nascer vazio. */
function isoOneYearAgo(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 3),
  ).toISOString();
}

/** Template neutro — o que vem antes de a pessoa escolher outro. */
export const DEFAULT_TEMPLATE = "essencial";

export function defaultBlocks(): Block[] {
  return [
    block({
      id: "hero",
      type: "hero",
      props: {
        title: "Para você",
        subtitle: "e para o que a gente construiu",
        align: "center" as const,
        overlay: 0.45,
      },
    }),
    block({
      id: "counter",
      type: "counter",
      props: {
        mode: "since" as const,
        date: isoOneYearAgo(),
        label: "juntos há",
        units: ["y", "mo", "d", "h", "m", "s"] as const,
      },
    }),
    block({
      id: "gallery",
      type: "gallery",
      props: {
        layout: "carousel" as const,
        mediaIds: [],
        captions: undefined,
      },
    }),
    block({
      id: "letter",
      type: "letter",
      props: {
        text: "Escreva aqui o que você não conseguiria falar olhando nos olhos.",
        typewriter: false,
        reveal: "plain" as const,
        signature: undefined,
      },
    }),
    block({
      id: "footer",
      type: "footer",
      props: { text: "Feito com carinho, só para você" },
    }),
  ];
}

/** Conteúdo inicial de um rascunho novo. */
export function defaultContent(template = DEFAULT_TEMPLATE): SiteContent {
  return {
    schemaVersion: SCHEMA_VERSION,
    theme: {
      template,
      skin: DEFAULT_SKIN,
      palette: DEFAULT_PALETTE,
      font: "mixed",
      effect: "hearts",
    },
    blocks: defaultBlocks(),
  };
}

/**
 * Blocos que o rascunho NÃO ganha de nascença.
 *
 * Música e linha do tempo são opcionais de propósito. Se viessem no preset,
 * todo rascunho novo nasceria inválido para publicar — `validateForPublish`
 * exige faixa escolhida e ao menos uma data quando o bloco existe. Então eles
 * entram por escolha, no passo correspondente do editor, e saem do mesmo jeito.
 *
 * O id é o próprio tipo, como nos demais: no modo simples existe no máximo um
 * bloco de cada.
 */
export function optionalBlock(type: "music" | "timeline" | "quiz"): Block {
  if (type === "music") {
    return block({
      id: "music",
      type: "music",
      props: { provider: "spotify" as const, trackId: "", autoplay: false },
    });
  }

  if (type === "quiz") {
    return block({
      id: "quiz",
      type: "quiz",
      props: {
        // Nasce com título, não vazio: o campo em branco no editor pareceria
        // erro, e este texto já é um convite pronto (SPEC 11).
        title: "O quanto você me conhece?",
        questions: [],
      },
    });
  }

  return block({
    id: "timeline",
    type: "timeline",
    props: { items: [] },
  });
}
