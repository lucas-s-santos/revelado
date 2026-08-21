/**
 * Paletas de revelação — SPEC 4.1.
 *
 * Substituem as oito ocasiões. O produto agora é um só (página para casal),
 * então `--color-accent` não muda mais de significado: ele continua dinâmico,
 * mas quem escolhe é a pessoa, no passo de estilo do editor.
 *
 * Os nomes vêm do laboratório, não do calendário — é o vocabulário da marca.
 *
 * Cada paleta tem dois valores no theme.css, um por pele: o tom que brilha
 * sobre o noir fica ilegível como texto sobre creme. Aqui mora só o id; a cor
 * é assunto do CSS.
 */

/**
 * Peles. A clara é o produto; a escura é a Câmara Escura original, que virou
 * escolha de quem monta a página em vez de ser a única opção.
 *
 * A landing e o editor são sempre claros — a pele é do **conteúdo**, e quem a
 * aplica é o contêiner da página publicada (`data-skin`).
 */
export const SKIN_IDS = ["clara", "escura"] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export const DEFAULT_SKIN: SkinId = "clara";

export const SKINS: readonly { id: SkinId; name: string; hint: string }[] = [
  { id: "clara", name: "Papel", hint: "creme e quente, como um álbum" },
  { id: "escura", name: "Câmara escura", hint: "noir, para as fotos brilharem" },
] as const;

export const PALETTE_IDS = [
  "magenta",
  "ambar",
  "rubi",
  "ciano",
  "papel",
] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

/**
 * A paleta de quem não escolheu nada — e a da landing inteira.
 *
 * É a "rubi", que na pele clara vale exatamente `--color-rose`: assim a página
 * que a pessoa acabou de criar sai da mesma cor do site em que ela clicou.
 */
export const DEFAULT_PALETTE: PaletteId = "rubi";

export interface Palette {
  id: PaletteId;
  name: string;
  /** RGB sem vírgula — vira `--color-accent` (SPEC 4.1). */
  accent: string;
}

export const PALETTES: readonly Palette[] = [
  { id: "magenta", name: "Ampliação", accent: "224 80 143" },
  { id: "ambar", name: "Luz de segurança", accent: "242 180 87" },
  { id: "rubi", name: "Revelador", accent: "214 74 92" },
  { id: "ciano", name: "Cianotipia", accent: "88 214 208" },
  { id: "papel", name: "Papel", accent: "230 216 184" },
] as const;

const PALETTE_BY_ID = new Map<string, Palette>(
  PALETTES.map((palette) => [palette.id, palette]),
);

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && PALETTE_BY_ID.has(value);
}

/** Nunca devolve undefined: paleta desconhecida cai no padrão. */
export function getPalette(id: string): Palette {
  return PALETTE_BY_ID.get(id) ?? PALETTE_BY_ID.get(DEFAULT_PALETTE)!;
}
