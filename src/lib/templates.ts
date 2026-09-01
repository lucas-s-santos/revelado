/**
 * Templates — SPEC 7.1 (`model Template`) e 8.3.
 *
 * Antes eram dois por ocasião, o que dava dezesseis páginas quase iguais. Com um
 * produto só, eles voltam a ser o que deveriam ser: cinco jeitos diferentes de
 * contar a mesma história.
 *
 * O que o template carrega é **preset**, não conteúdo: paleta, fonte, efeito e
 * a ordem dos blocos. Trocar de template no editor não apaga o que a pessoa já
 * escreveu — só remonta a moldura.
 *
 * Fonte de verdade para o seed do banco. Em runtime o app lê do banco, porque o
 * admin cria template novo sem deploy (SPEC 8.9).
 */

import type { BlockType } from "@/lib/blocks/schema";
import type { PaletteId } from "@/lib/palettes";

export interface TemplateSeed {
  id: string;
  name: string;
  /** uma linha, para o card de escolha */
  hint: string;
  /**
   * Ícone do card, por nome.
   *
   * Declarado aqui e não deduzido dos blocos porque não dá para deduzir:
   * "Essencial" e "Cápsula" começam com os mesmos dois blocos, e sairiam com o
   * mesmo desenho. O formato sabe o que ele é; a interface só desenha.
   */
  icon: "heart" | "sparkles" | "timeline" | "list" | "lock";
  previewUrl: string;
  /** null = incluso em todos os planos */
  planRequired: string | null;
  order: number;
  preset: {
    palette: PaletteId;
    font: "serif" | "sans" | "mixed";
    effect: "none" | "hearts" | "confetti" | "snow" | "stars";
    /** ordem dos blocos; o editor completa o resto com os padrões */
    blocks: readonly BlockType[];
  };
}

export const TEMPLATES: readonly TemplateSeed[] = [
  {
    id: "essencial",
    name: "Essencial",
    hint: "capa, contador, fotos e a carta",
    icon: "heart",
    previewUrl: "/templates/essencial.webp",
    planRequired: null,
    order: 1,
    preset: {
      palette: "magenta",
      font: "mixed",
      effect: "hearts",
      blocks: ["hero", "counter", "gallery", "letter", "footer"],
    },
  },
  {
    id: "revelacao",
    name: "Revelação",
    hint: "as fotos aparecem conforme a pessoa rola",
    icon: "sparkles",
    previewUrl: "/templates/revelacao.webp",
    planRequired: null,
    order: 2,
    preset: {
      palette: "magenta",
      font: "serif",
      effect: "hearts",
      blocks: ["hero", "counter", "letter", "gallery", "timeline", "footer"],
    },
  },
  {
    id: "linha-do-tempo",
    name: "Linha do tempo",
    hint: "de onde começou até aqui, data por data",
    icon: "timeline",
    previewUrl: "/templates/linha-do-tempo.webp",
    planRequired: null,
    order: 3,
    preset: {
      palette: "ambar",
      font: "mixed",
      effect: "none",
      blocks: ["hero", "timeline", "gallery", "counter", "letter", "footer"],
    },
  },
  {
    id: "motivos",
    name: "Motivos",
    hint: "a lista de por que você gosta dela ou dele",
    icon: "list",
    previewUrl: "/templates/motivos.webp",
    planRequired: "especial",
    order: 4,
    preset: {
      palette: "rubi",
      font: "sans",
      effect: "hearts",
      blocks: ["hero", "reasons", "gallery", "counter", "music", "footer"],
    },
  },
  {
    id: "capsula",
    name: "Cápsula do tempo",
    hint: "uma carta que só abre na data que você marcar",
    icon: "lock",
    previewUrl: "/templates/capsula.webp",
    planRequired: "especial",
    order: 5,
    preset: {
      palette: "ciano",
      font: "mixed",
      effect: "stars",
      blocks: ["hero", "counter", "capsule", "gallery", "letter", "footer"],
    },
  },
] as const;

export const TEMPLATE_IDS = TEMPLATES.map(
  (template) => template.id,
) as readonly string[];

const TEMPLATE_BY_ID = new Map(
  TEMPLATES.map((template) => [template.id, template]),
);

export function getTemplate(id: string): TemplateSeed | undefined {
  return TEMPLATE_BY_ID.get(id);
}

/**
 * O template é montável hoje?
 *
 * Dois presets citam blocos que ainda não têm componente (`reasons` em
 * "Motivos", `capsule` em "Cápsula do tempo"). O renderer ignora bloco sem
 * componente, então oferecer esses formatos no editor entregaria uma página
 * onde o bloco principal simplesmente não aparece — sem erro, sem aviso.
 *
 * O filtro é por dado, não por lista à mão: quando `reasons` e `capsule`
 * ganharem componente, os formatos aparecem sozinhos.
 *
 * Recebe os tipos prontos por parâmetro para este módulo não importar o
 * registry: `templates.ts` alimenta o seed do banco, que roda fora do React.
 */
export function isTemplateReady(
  template: TemplateSeed,
  readyTypes: readonly BlockType[],
): boolean {
  return template.preset.blocks.every((type) => readyTypes.includes(type));
}
