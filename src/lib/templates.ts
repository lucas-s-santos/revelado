import { defaultContent } from "@/lib/blocks/defaults";
import type { SiteContent } from "@/lib/blocks/schema";
import type { OccasionId } from "@/lib/occasions";
import type { PlanId } from "@/lib/plans";

/**
 * Templates — SPEC 7.1 (model Template) e 8.3.
 *
 * Em TypeScript pelo mesmo motivo de `lib/plans.ts` e `lib/occasions.ts`: é a
 * fonte de verdade do seed, e o app funciona sem banco configurado.
 *
 * **Um template aqui é só um tema.** Ele não troca os blocos — a ocasião já
 * decide quais blocos a página tem (`lib/blocks/defaults.ts`), e deixar o
 * template mexer nisso faria a pessoa perder o que escreveu ao trocar de
 * template no editor. O que ele muda é tipografia e efeito ambiental, que é o
 * que separa "Dia dos Namorados discreto" de "Dia dos Namorados exagerado".
 *
 * Sem `previewUrl`: a SPEC 8.3 pede "preview **real**, não imagem estática", e
 * o preview real é o próprio `BlockRenderer` dentro do `PhoneFrame`. Uma pasta
 * de `.webp` seria mais um lugar para o template e a imagem divergirem.
 */

type Font = SiteContent["theme"]["font"];
type Effect = SiteContent["theme"]["effect"];

export interface TemplateSeed {
  /** único dentro da ocasião: o id completo é `${occasion}-${slug}` */
  slug: string;
  name: string;
  /** uma linha, no tom da interface (SPEC 11) */
  description: string;
  font: Font;
  /**
   * `"signature"` usa o efeito característico da ocasião — corações no Dia dos
   * Namorados, neve no Natal. Qualquer outro valor é literal.
   */
  effect: Effect | "signature";
  planRequired: PlanId | null;
  /** ocasiões em que este template não faz sentido */
  excludeOccasions?: readonly OccasionId[];
}

/**
 * O efeito que é a cara de cada ocasião.
 *
 * Memorial recebe estrelas, não confete nem corações: céu estrelado é um motivo
 * de lembrança, festa numa página de memória é a diferença entre um presente e
 * uma ofensa.
 */
const SIGNATURE_EFFECT: Record<OccasionId, Effect> = {
  namorados: "hearts",
  aniversario: "confetti",
  maes: "hearts",
  pais: "stars",
  casamento: "confetti",
  bebe: "stars",
  natal: "snow",
  memorial: "stars",
};

export const TEMPLATES: readonly TemplateSeed[] = [
  {
    slug: "essencial",
    name: "Essencial",
    description: "A página limpa. Nada disputa atenção com a foto.",
    font: "mixed",
    effect: "none",
    planRequired: null,
  },
  {
    slug: "revelacao",
    name: "Revelação",
    description: "Serifa grande e o efeito da ocasião ao fundo.",
    font: "serif",
    effect: "signature",
    planRequired: null,
  },
  {
    slug: "manuscrito",
    name: "Manuscrito",
    description: "Tudo em serifa, como uma carta escrita à mão.",
    font: "serif",
    effect: "none",
    planRequired: null,
  },
  {
    slug: "editorial",
    name: "Editorial",
    description: "Sem serifa, espaçado, com ar de revista.",
    font: "sans",
    effect: "none",
    planRequired: null,
  },
  {
    slug: "festa",
    name: "Festa",
    description: "Confete caindo o tempo todo. Para quem quer barulho.",
    font: "sans",
    effect: "confetti",
    planRequired: "especial",
    excludeOccasions: ["memorial"],
  },
  {
    slug: "noturno",
    name: "Noturno",
    description: "Céu estrelado atrás do texto, sem pressa.",
    font: "mixed",
    effect: "stars",
    planRequired: "especial",
  },
  {
    slug: "neve",
    name: "Neve",
    description: "Neve caindo devagar, mesmo fora de dezembro.",
    font: "mixed",
    effect: "snow",
    planRequired: "especial",
  },
] as const;

export interface Template extends Omit<TemplateSeed, "effect"> {
  /** id completo, como fica em `content.theme.template` */
  id: string;
  effect: Effect;
}

/** Os templates que fazem sentido para uma ocasião, já com o efeito resolvido. */
export function templatesFor(occasion: OccasionId): Template[] {
  return TEMPLATES.filter(
    (template) => !template.excludeOccasions?.includes(occasion),
  ).map((template) => ({
    ...template,
    id: `${occasion}-${template.slug}`,
    effect:
      template.effect === "signature"
        ? SIGNATURE_EFFECT[occasion]
        : template.effect,
  }));
}

export function findTemplate(
  occasion: OccasionId,
  slug: string,
): Template | undefined {
  return templatesFor(occasion).find(
    (template) => template.slug === slug || template.id === slug,
  );
}

/**
 * O conteúdo inicial de um rascunho com este template.
 *
 * Blocos vêm da ocasião, tema vem do template. Se o template pedido não existir
 * — link velho, ocasião que perdeu um template — cai no conteúdo padrão em vez
 * de falhar: ninguém perde a página por causa de um tema.
 */
export function contentForTemplate(
  occasion: OccasionId,
  slug?: string | null,
): SiteContent {
  const base = defaultContent(occasion);
  const template = slug ? findTemplate(occasion, slug) : undefined;

  if (!template) return base;

  return {
    ...base,
    theme: {
      ...base.theme,
      template: template.id,
      font: template.font,
      effect: template.effect,
    },
  };
}
