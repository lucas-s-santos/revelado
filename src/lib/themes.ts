/**
 * Temas da página — o passo de tema do editor.
 *
 * Um tema é um **preset** de duas coisas que o produto já tinha separadas: a
 * pele (`data-skin`) e a paleta (`data-palette`). Juntar as duas numa grade
 * nomeada é o que a pessoa entende — ninguém escolhe "pele clara + accent
 * selênio", escolhe "Selênio". Por baixo continua sendo skin × palette, então
 * nada muda no CSS nem na regra 6: `--color-accent` segue vindo da paleta.
 *
 * Os nomes vêm do laboratório, nunca do calendário — é o vocabulário da marca
 * e é o que impede o tema de virar ocasião disfarçada.
 *
 * Toda cor aqui já passou pelo `pnpm contrast` nas duas peles. Cor que não
 * passa não entra na grade.
 */
import { DEFAULT_PALETTE, DEFAULT_SKIN, type PaletteId, type SkinId } from "@/lib/palettes";
import { PLAN_IDS, type PlanId } from "@/lib/plans";

export interface Theme {
  id: string;
  name: string;
  hint: string;
  skin: SkinId;
  palette: PaletteId;
  /** Plano mínimo que destrava. Ausente = livre em qualquer plano. */
  minPlan?: PlanId;
}

export const THEMES: readonly Theme[] = [
  // --- Pele clara: papel ---------------------------------------------------
  {
    id: "revelador",
    name: "Revelador",
    hint: "o vermelho da casa",
    skin: "clara",
    palette: "rubi",
  },
  {
    id: "ampliacao",
    name: "Ampliação",
    hint: "magenta de ampliador",
    skin: "clara",
    palette: "magenta",
  },
  {
    id: "luz-de-seguranca",
    name: "Luz de segurança",
    hint: "âmbar quente",
    skin: "clara",
    palette: "ambar",
  },
  {
    id: "cianotipia",
    name: "Cianotipia",
    hint: "azul de blueprint",
    skin: "clara",
    palette: "ciano",
  },
  {
    id: "sepia",
    name: "Sépia",
    hint: "marrom de retrato antigo",
    skin: "clara",
    palette: "sepia",
  },
  {
    id: "viragem",
    name: "Viragem",
    hint: "verde de banho químico",
    skin: "clara",
    palette: "verde",
  },

  // --- Pele escura: câmara escura -----------------------------------------
  {
    id: "camara-escura",
    name: "Câmara escura",
    hint: "noir, para as fotos brilharem",
    skin: "escura",
    palette: "magenta",
  },
  {
    id: "lampada",
    name: "Lâmpada",
    hint: "escuro com luz âmbar",
    skin: "escura",
    palette: "ambar",
  },
  {
    id: "banho-frio",
    name: "Banho frio",
    hint: "escuro com ciano",
    skin: "escura",
    palette: "ciano",
  },

  // --- Destravam no Especial ----------------------------------------------
  {
    id: "selenio",
    name: "Selênio",
    hint: "violeta de viragem",
    skin: "clara",
    palette: "selenio",
    minPlan: "especial",
  },
  {
    id: "platina",
    name: "Platina",
    hint: "escuro com creme de platinotipia",
    skin: "escura",
    palette: "papel",
    minPlan: "especial",
  },
  {
    id: "viragem-noturna",
    name: "Viragem noturna",
    hint: "escuro com verde",
    skin: "escura",
    palette: "verde",
    minPlan: "especial",
  },
] as const;

/** O tema de quem não escolheu nada — a mesma cor do site em que ela clicou. */
export const DEFAULT_THEME = "revelador";

const THEME_BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export function isThemeId(value: unknown): value is string {
  return typeof value === "string" && THEME_BY_ID.has(value);
}

/** Nunca devolve undefined: tema desconhecido cai no padrão. */
export function getTheme(id: string): Theme {
  return (
    THEME_BY_ID.get(id) ?? {
      id: DEFAULT_THEME,
      name: "Revelador",
      hint: "o vermelho da casa",
      skin: DEFAULT_SKIN,
      palette: DEFAULT_PALETTE,
    }
  );
}

/**
 * Um tema está destravado quando o plano da pessoa é o mínimo exigido **ou
 * superior**. A ordem é a de `PLAN_IDS`, então plano melhor nunca perde acesso
 * ao que o plano abaixo já tinha.
 *
 * Sem plano escolhido ainda (no editor, antes do checkout), só os livres
 * contam como destravados — a trava é o convite para subir de plano, e mentir
 * sobre ela no editor viraria surpresa no pagamento.
 */
export function isThemeUnlocked(theme: Theme, plan: PlanId | null): boolean {
  if (!theme.minPlan) return true;
  if (!plan) return false;
  return PLAN_IDS.indexOf(plan) >= PLAN_IDS.indexOf(theme.minPlan);
}
