import {
  parseSiteContent,
  SCHEMA_VERSION,
  type SiteContent,
} from "@/lib/blocks/schema";

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
 * `steps[n]` leva da versão `n` para `n + 1`.
 *
 * Exemplo de como o próximo vai parecer:
 *   1: (content) => ({ ...content, schemaVersion: 2, theme: {...} })
 */
const steps: Record<number, Step> = {};

export interface MigrateResult {
  content: SiteContent | null;
  /** de qual versão veio */
  from: number;
  /** true se algum passo rodou */
  migrated: boolean;
  /** mensagem quando não deu para validar */
  error?: string;
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

  let current = input as Record<string, unknown>;
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
