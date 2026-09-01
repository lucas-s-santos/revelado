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
 *
 * O tipo é exportado porque a mesma lista vive na assinatura do `addBlock` do
 * store. Enquanto estava escrita duas vezes, as duas saíram de sincronia:
 * `stats` entrou aqui, o store continuou sem ele, e o editor parou de
 * compilar.
 */
export type OptionalBlockType =
  | "music"
  | "timeline"
  | "quiz"
  | "capsule"
  | "reasons"
  | "stats"
  | "video";

export function optionalBlock(type: OptionalBlockType): Block {
  if (type === "video") {
    return block({
      id: "video",
      type: "video",
      props: {
        // Nunca "upload": hospedar vídeo é banda e custo por gigabyte, pelo
        // mesmo motivo que a regra 10 proíbe hospedar música. O schema aceita
        // o valor por histórico; o produto não o cria.
        provider: "youtube" as const,
        ref: "",
      },
    });
  }

  if (type === "stats") {
    return block({
      id: "stats",
      type: "stats",
      props: {
        // Três linhas prontas e vazias, não zero e não seis. Zero deixa a
        // pessoa diante de um botão sem saber o que o bloco faz; seis parecem
        // uma planilha a preencher. Três já mostram a forma da grade.
        items: [
          { value: "", label: "" },
          { value: "", label: "" },
          { value: "", label: "" },
        ],
      },
    });
  }

  if (type === "reasons") {
    return block({
      id: "reasons",
      type: "reasons",
      props: {
        // Nasce com título e um item vazio: campo em branco parece erro, e o
        // primeiro input já pronto convida a escrever (SPEC 11).
        title: "motivos por que eu te amo",
        items: [""],
      },
    });
  }

  if (type === "capsule") {
    /* Abre daqui a uma semana, e não hoje: nascer já aberta esconderia o que a
     * cápsula é. Uma data no futuro faz o contador aparecer no preview e a
     * pessoa entender o recurso sem ler explicação. */
    const daquiUmaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return block({
      id: "capsule",
      type: "capsule",
      props: {
        openAt: daquiUmaSemana.toISOString(),
        text: "",
      },
    });
  }

  if (type === "music") {
    return block({
      id: "music",
      type: "music",
      props: {
        provider: "spotify" as const,
        trackId: "",
        autoplay: false,
        startSec: 0,
      },
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
