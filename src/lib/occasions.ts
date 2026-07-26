/**
 * Ocasiões — SPEC 4.1 (paleta) + 7.1 (model Occasion).
 * Fonte de verdade para o seed do banco. Em runtime o app lê do banco,
 * porque o admin cria ocasião nova sem deploy (SPEC 8.9).
 */

export const OCCASION_IDS = [
  "namorados",
  "aniversario",
  "maes",
  "pais",
  "casamento",
  "bebe",
  "natal",
  "memorial",
] as const;

export type OccasionId = (typeof OCCASION_IDS)[number];

export interface OccasionSeed {
  id: OccasionId;
  slug: string;
  name: string;
  /** RGB sem vírgula — vira --color-accent (SPEC 4.1). */
  accent: string;
  icon: string;
  order: number;
  seo: { title: string; description: string };
}

export const OCCASIONS: readonly OccasionSeed[] = [
  {
    id: "namorados",
    slug: "namorados",
    name: "Dia dos Namorados",
    accent: "224 80 143",
    icon: "heart",
    order: 1,
    seo: {
      title: "Página de presente para o Dia dos Namorados",
      description:
        "Monte uma página com fotos, mensagem e contador de tempo juntos. Link e QR Code para presentear.",
    },
  },
  {
    id: "aniversario",
    slug: "aniversario",
    name: "Aniversário",
    accent: "242 180 87",
    icon: "cake",
    order: 2,
    seo: {
      title: "Página de aniversário personalizada com QR Code",
      description:
        "Fotos, recado e contagem regressiva numa página só sua. Pronta em minutos.",
    },
  },
  {
    id: "maes",
    slug: "maes",
    name: "Dia das Mães",
    accent: "197 139 232",
    icon: "flower",
    order: 3,
    seo: {
      title: "Presente digital para o Dia das Mães",
      description:
        "Uma página com as fotos da família, uma carta e a música dela. Entregue por QR Code.",
    },
  },
  {
    id: "pais",
    slug: "pais",
    name: "Dia dos Pais",
    accent: "90 169 230",
    icon: "compass",
    order: 4,
    seo: {
      title: "Presente digital para o Dia dos Pais",
      description:
        "Linha do tempo, fotos e mensagem numa página com QR Code para imprimir.",
    },
  },
  {
    id: "casamento",
    slug: "casamento",
    name: "Casamento",
    accent: "230 216 184",
    icon: "rings",
    order: 5,
    seo: {
      title: "Página de casamento com mural de recados",
      description:
        "Convite, galeria e mural dos convidados. QR Code nas mesas e no convite.",
    },
  },
  {
    id: "bebe",
    slug: "bebe",
    name: "Chá de bebê",
    accent: "127 212 224",
    icon: "stroller",
    order: 6,
    seo: {
      title: "Página de chá de bebê e chegada do bebê",
      description:
        "Anuncie a chegada com fotos, contagem e mural de recados dos convidados.",
    },
  },
  {
    id: "natal",
    slug: "natal",
    name: "Natal",
    accent: "111 207 140",
    icon: "tree",
    order: 7,
    seo: {
      title: "Cartão de Natal digital com QR Code",
      description:
        "Um cartão de Natal que abre no celular com fotos, música e recado.",
    },
  },
  {
    id: "memorial",
    slug: "memorial",
    name: "Memorial",
    accent: "168 165 184",
    icon: "candle",
    order: 8,
    seo: {
      title: "Página memorial para homenagear quem partiu",
      description:
        "Um espaço sóbrio com fotos, história e mural de lembranças de quem amou.",
    },
  },
] as const;

export const OCCASION_BY_ID = new Map<string, OccasionSeed>(
  OCCASIONS.map((occasion) => [occasion.id, occasion]),
);

export function getOccasion(id: string): OccasionSeed | undefined {
  return OCCASION_BY_ID.get(id);
}
