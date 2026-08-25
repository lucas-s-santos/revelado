import { CounterBlock } from "@/components/blocks/counter-block";
import { FooterBlock } from "@/components/blocks/footer-block";
import { GalleryBlock } from "@/components/blocks/gallery-block";
import { HeroBlock } from "@/components/blocks/hero-block";
import { LetterBlock } from "@/components/blocks/letter-block";
import { MusicBlock } from "@/components/blocks/music-block";
import { QuizBlock } from "@/components/blocks/quiz-block";
import { TimelineBlock } from "@/components/blocks/timeline-block";
import { blockTypes, type BlockType } from "@/lib/blocks/schema";
import type { PlanId } from "@/lib/plans";

/**
 * Registry de blocos — SPEC 7.2.
 *
 * "Adicionar um bloco novo = criar o componente, o painel de edição e uma linha
 * no registry. Nada mais."
 *
 * `component` recebe `{ props, now?, mediaSrc? }`. O tipo é propositalmente
 * largo aqui: o casamento entre `type` e `props` é garantido pelo zod na
 * entrada e checado pelo teste de cobertura registry↔schema.
 */

export interface BlockDefinition {
  /** rótulo no editor */
  label: string;
  /** nome do ícone (lucide) usado na lista de blocos do editor */
  icon: string;
  /** menor plano que libera o bloco; undefined = todos */
  plan?: PlanId;
  /** true quando o bloco só faz sentido uma vez por página */
  unique?: boolean;
  /** implementado? os blocos V2 entram na Fase 7 */
  ready: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver nota acima
  component?: (props: any) => React.ReactNode;
}

export const registry: Record<BlockType, BlockDefinition> = {
  hero: {
    label: "Capa",
    icon: "image",
    unique: true,
    ready: true,
    component: HeroBlock,
  },
  counter: {
    label: "Contador",
    icon: "timer",
    ready: true,
    component: CounterBlock,
  },
  letter: {
    label: "Carta",
    icon: "pen-line",
    ready: true,
    component: LetterBlock,
  },
  gallery: {
    label: "Galeria",
    icon: "images",
    ready: true,
    component: GalleryBlock,
  },
  music: {
    label: "Música",
    icon: "music",
    plan: "especial",
    ready: true,
    component: MusicBlock,
  },
  timeline: {
    label: "Linha do tempo",
    icon: "git-commit-horizontal",
    plan: "especial",
    ready: true,
    component: TimelineBlock,
  },
  quiz: {
    label: "Quiz do casal",
    icon: "help-circle",
    plan: "para-sempre",
    unique: true,
    ready: true,
    component: QuizBlock,
  },
  footer: {
    label: "Rodapé",
    icon: "minus",
    unique: true,
    ready: true,
    component: FooterBlock,
  },

  // --- V2, Fase 7 (SPEC 13). Já no schema para o content não precisar migrar
  // quando eles chegarem; sem componente, o renderer os ignora.
  reasons: {
    label: "Motivos",
    icon: "list",
    plan: "para-sempre",
    ready: false,
  },
  guestbook: {
    label: "Mural de recados",
    icon: "message-square",
    plan: "para-sempre",
    unique: true,
    ready: false,
  },
  map: { label: "Mapa", icon: "map-pin", plan: "especial", ready: false },
  video: { label: "Vídeo", icon: "video", plan: "especial", ready: false },
  capsule: {
    label: "Cápsula do tempo",
    icon: "lock",
    plan: "para-sempre",
    ready: false,
  },
  stats: { label: "Números", icon: "hash", ready: false },
};

/** Tipos que o renderer sabe desenhar hoje. */
export const readyBlockTypes = blockTypes.filter(
  (type) => registry[type].ready,
);

export function getBlockDefinition(type: BlockType): BlockDefinition {
  return registry[type];
}
