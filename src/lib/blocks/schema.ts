import { z } from "zod";

import {
  DEFAULT_PALETTE,
  DEFAULT_SKIN,
  PALETTE_IDS,
  SKIN_IDS,
} from "@/lib/palettes";

/**
 * O coração da arquitetura — SPEC 7.2.
 *
 * A página **é** uma lista ordenada de blocos em JSON. Nunca `foto1`, `foto2`,
 * `nomeNamorado`: isso morre no segundo template (anti-padrão 1 da seção 12).
 *
 * Adicionar um bloco novo = props aqui + componente + linha no registry.
 * Nada mais.
 *
 * Nota sobre o SPEC: o exemplo da seção 7.2 monta a união com `as any`. Aqui as
 * variantes são declaradas numa tupla, o que dá o mesmo resultado com tipos de
 * verdade — a seção 12 proíbe `any`.
 */

/**
 * Versão 2: saiu `occasion` e `theme.palette` virou enum das paletas de
 * revelação. Conteúdo na 1 sobe na leitura, em `blocks/migrate.ts`.
 */
export const SCHEMA_VERSION = 2;

/** Unidades do contador, na ordem em que aparecem. */
export const counterUnits = ["y", "mo", "d", "h", "m", "s"] as const;
export type CounterUnit = (typeof counterUnits)[number];

export const blockProps = {
  hero: z.object({
    title: z.string().max(80),
    subtitle: z.string().max(120).optional(),
    mediaId: z.string().optional(),
    align: z.enum(["left", "center"]).default("center"),
    overlay: z.number().min(0).max(1).default(0.45),
  }),

  counter: z.object({
    mode: z.enum(["since", "until"]),
    date: z.iso.datetime(),
    label: z.string().max(40).default("juntos há"),
    units: z
      .array(z.enum(counterUnits))
      .min(1)
      .default([...counterUnits]),
  }),

  letter: z.object({
    text: z.string().max(4000),
    typewriter: z.boolean().default(false),
    signature: z.string().max(60).optional(),
    /**
     * Como a carta se revela.
     *
     * `envelope` é o formato "carta interativa": o texto começa fechado e quem
     * recebe abre. É **prop**, e não bloco novo, porque o conteúdo é o mesmo —
     * mesmo texto, mesma assinatura. Como bloco separado, trocar de formato
     * apagaria o que a pessoa escreveu, que é justamente o que não pode
     * acontecer num editor (SPEC 8.4).
     *
     * Default `plain`: carta que já existe continua abrindo igual.
     */
    reveal: z.enum(["plain", "envelope"]).default("plain"),
  }),

  gallery: z.object({
    layout: z
      .enum(["carousel", "grid", "polaroid", "stack"])
      .default("carousel"),
    /**
     * Divergência consciente do SPEC 7.2, que traz `.min(1)`.
     *
     * Rascunho nasce **sem foto** — a pessoa escolhe a ocasião antes de subir
     * qualquer imagem. Com `.min(1)` aqui, todo rascunho novo seria inválido e o
     * autosave falharia calado, o que bate de frente com o requisito mais
     * importante do editor: nunca perder o trabalho (SPEC 8.4).
     *
     * A exigência de ter foto continua existindo — só mudou de lugar: vale na
     * publicação, em `validateForPublish`.
     */
    mediaIds: z.array(z.string()).max(60),
    captions: z.record(z.string(), z.string()).optional(),
  }),

  music: z.object({
    provider: z.enum(["spotify", "youtube"]),
    trackId: z.string(),
    // Política de autoplay do navegador exige gesto: nunca toca sozinho (SPEC 8.8).
    autoplay: z.boolean().default(false),
  }),

  timeline: z.object({
    items: z
      .array(
        z.object({
          date: z.string().max(40),
          title: z.string().max(60),
          text: z.string().max(400).optional(),
          mediaId: z.string().optional(),
        }),
      )
      .max(24),
  }),

  reasons: z.object({
    title: z.string().max(60),
    items: z.array(z.string().max(140)).max(100),
  }),

  guestbook: z.object({
    title: z.string().max(60),
    moderated: z.boolean().default(true),
  }),

  map: z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string().max(60),
  }),

  video: z.object({
    provider: z.enum(["upload", "youtube"]),
    ref: z.string(),
  }),

  capsule: z.object({
    openAt: z.iso.datetime(),
    text: z.string().max(2000),
  }),

  stats: z.object({
    items: z
      .array(z.object({ value: z.string().max(12), label: z.string().max(40) }))
      .max(6),
  }),

  footer: z.object({
    text: z.string().max(120),
  }),
} as const;

export type BlockType = keyof typeof blockProps;

export const blockTypes = Object.keys(blockProps) as BlockType[];

const variant = <T extends BlockType>(type: T) =>
  z.object({
    id: z.string().min(1),
    type: z.literal(type),
    props: blockProps[type],
  });

export const blockSchema = z.discriminatedUnion("type", [
  variant("hero"),
  variant("counter"),
  variant("letter"),
  variant("gallery"),
  variant("music"),
  variant("timeline"),
  variant("reasons"),
  variant("guestbook"),
  variant("map"),
  variant("video"),
  variant("capsule"),
  variant("stats"),
  variant("footer"),
]);

export const siteContentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  theme: z.object({
    template: z.string(),
    // Sem bump de versão: `.default()` preenche o que já está salvo na leitura.
    skin: z.enum(SKIN_IDS).default(DEFAULT_SKIN),
    palette: z.enum(PALETTE_IDS).default(DEFAULT_PALETTE),
    font: z.enum(["serif", "sans", "mixed"]).default("mixed"),
    effect: z
      .enum(["none", "hearts", "confetti", "snow", "stars"])
      .default("none"),
  }),
  blocks: z.array(blockSchema).min(1).max(30),
});

export type SiteContent = z.infer<typeof siteContentSchema>;
export type Block = z.infer<typeof blockSchema>;

/** Bloco de um tipo específico — o que cada componente recebe. */
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;
export type PropsOf<T extends BlockType> = BlockOf<T>["props"];

/**
 * Valida conteúdo vindo do banco ou do cliente. Devolve o resultado do zod em
 * vez de lançar: quem chama decide o que fazer (SPEC 12 — validar no cliente
 * **e** no servidor).
 */
export function parseSiteContent(input: unknown) {
  return siteContentSchema.safeParse(input);
}

/**
 * Portão da **publicação** — mais rígido que o do rascunho.
 *
 * Rascunho tem que salvar sempre, mesmo pela metade (SPEC 8.4). Publicar é
 * outra coisa: a página vai virar presente impresso num QR Code, então aqui
 * exigimos o que faria a pessoa receber uma página vazia.
 *
 * Devolve a lista de problemas em português, pronta para a interface — cada um
 * diz o que aconteceu e o que fazer (SPEC 11).
 */
export interface PublishIssue {
  blockId: string;
  message: string;
}

export function validateForPublish(content: SiteContent): PublishIssue[] {
  const issues: PublishIssue[] = [];

  for (const block of content.blocks) {
    switch (block.type) {
      case "gallery":
        if (block.props.mediaIds.length === 0) {
          issues.push({
            blockId: block.id,
            message: "Adicione ao menos uma foto na galeria antes de publicar.",
          });
        }
        break;

      case "hero":
        if (block.props.title.trim().length === 0) {
          issues.push({
            blockId: block.id,
            message: "Escreva o título da capa.",
          });
        }
        break;

      case "letter":
        if (block.props.text.trim().length === 0) {
          issues.push({
            blockId: block.id,
            message:
              "A carta está vazia — escreva sua mensagem ou remova o bloco.",
          });
        }
        break;

      case "timeline":
        if (block.props.items.length === 0) {
          issues.push({
            blockId: block.id,
            message:
              "A linha do tempo está sem datas — preencha ou remova o bloco.",
          });
        }
        break;

      case "music":
        if (block.props.trackId.trim().length === 0) {
          issues.push({
            blockId: block.id,
            message: "Escolha a música ou remova o bloco.",
          });
        }
        break;

      default:
        break;
    }
  }

  return issues;
}
