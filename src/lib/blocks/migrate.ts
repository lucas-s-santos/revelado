import {
  parseSiteContent,
  SCHEMA_VERSION,
  type SiteContent,
} from "@/lib/blocks/schema";
import { DEFAULT_PALETTE, isPaletteId } from "@/lib/palettes";

/**
 * Migração entre versões de schema — SPEC 7.2.
 *
 * Regras que valem para sempre:
 *  - roda **na leitura**, sempre. Nunca migração destrutiva no banco;
 *  - cada passo sobe exatamente uma versão, e nunca joga conteúdo fora: bloco
 *    desconhecido é preservado como está, para uma versão futura entender.
 *
 * Hoje só existe a versão 1, então a função é quase um passa-direto. A forma
 * fica pronta agora porque depois é tarde: quando o schema 2 existir, páginas
 * publicadas já estarão no ar com o 1.
 */

type Step = (content: Record<string, unknown>) => Record<string, unknown>;

/**
 * Mapa das oito ocasiões antigas para as paletas de revelação.
 *
 * Existe só aqui dentro, e só para trás: página publicada na v1 tem o QR
 * impresso e não pode mudar de cor sozinha. Ocasião fora da lista cai no padrão.
 */
const PALETTE_FROM_OCCASION: Record<string, string> = {
  namorados: "magenta",
  aniversario: "ambar",
  maes: "magenta",
  pais: "ciano",
  casamento: "papel",
  bebe: "ciano",
  natal: "rubi",
  memorial: "papel",
};

/**
 * `steps[n]` leva da versão `n` para `n + 1`.
 */
const steps: Record<number, Step> = {
  /**
   * 1 → 2: o produto virou um só (página de casal). Sai `occasion` da raiz e
   * `theme.palette` deixa de ser texto livre para ser uma das paletas.
   *
   * Nada é jogado fora que não dê para reconstruir: a paleta antiga carregava a
   * cor da ocasião, então é dela que a nova sai.
   */
  1: (content) => {
    const { occasion, ...rest } = content as {
      occasion?: unknown;
      theme?: Record<string, unknown>;
    } & Record<string, unknown>;

    const theme = (rest.theme ?? {}) as Record<string, unknown>;
    const previous = theme.palette ?? occasion;

    const palette = isPaletteId(previous)
      ? previous
      : typeof previous === "string"
        ? (PALETTE_FROM_OCCASION[previous] ?? DEFAULT_PALETTE)
        : DEFAULT_PALETTE;

    return { ...rest, schemaVersion: 2, theme: { ...theme, palette } };
  },
};

export interface MigrateResult {
  content: SiteContent | null;
  /** de qual versão veio */
  from: number;
  /** true se algum passo rodou */
  migrated: boolean;
  /** mensagem quando não deu para validar */
  error?: string;
}

/**
 * O `content` vem do banco como `Json`: pode ser null, número, lista. Os passos
 * são declarados recebendo um objeto, então quem garante isso é aqui — assim
 * nenhum passo futuro precisa se defender de entrada torta.
 */
function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function versionOf(input: unknown): number {
  if (input && typeof input === "object" && "schemaVersion" in input) {
    const raw = (input as { schemaVersion: unknown }).schemaVersion;
    if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  }
  // Sem versão declarada, assume a primeira — é o que rascunho antigo teria.
  return 1;
}

/**
 * Recebe o `content` cru do banco e devolve na versão atual, já validado.
 * Não lança: quem chama decide se mostra erro ou cai num fallback.
 */
export function migrate(input: unknown): MigrateResult {
  const from = versionOf(input);

  if (from > SCHEMA_VERSION) {
    // Conteúdo mais novo que o código: acontece em rollback de deploy.
    // Não tentar adivinhar — recusar é mais honesto que renderizar errado.
    return {
      content: null,
      from,
      migrated: false,
      error: `Conteúdo na versão ${from}, mas este código entende até a ${SCHEMA_VERSION}.`,
    };
  }

  let current = isRecord(input) ? input : {};
  let version = from;
  let migrated = false;

  while (version < SCHEMA_VERSION) {
    const step = steps[version];
    if (!step) {
      return {
        content: null,
        from,
        migrated,
        error: `Falta migração da versão ${version} para a ${version + 1}.`,
      };
    }
    current = step(current);
    version += 1;
    migrated = true;
  }

  const parsed = parseSiteContent({
    ...current,
    schemaVersion: SCHEMA_VERSION,
  });

  if (!parsed.success) {
    return {
      content: null,
      from,
      migrated,
      error: parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "raiz"}: ${issue.message}`)
        .join("; "),
    };
  }

  return { content: parsed.data, from, migrated };
}
