import { randomUUID } from "node:crypto";

import { devDir } from "@/lib/dev-store";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { migrate } from "@/lib/blocks/migrate";
import { parseSiteContent, type SiteContent } from "@/lib/blocks/schema";
import { db, notDeleted } from "@/lib/db";

/**
 * Rascunhos — o lado servidor do requisito mais importante do editor:
 * **nunca perder o trabalho** (SPEC 8.4).
 *
 * SPEC 12 anti-padrão 10: o servidor é a fonte de verdade do rascunho, o
 * `localStorage` é só cache. Por isso tudo aqui é servidor.
 *
 * Dois backends:
 *  - **Prisma/Postgres** quando há `DATABASE_URL`. É o de produção;
 *  - **arquivo em `.drafts/`** quando não há. Existe só para o projeto rodar
 *    e ser testável sem Neon configurado — sobrevive a fechar a aba e a
 *    reiniciar o servidor, que é o que o aceite da fase exige. Não é para
 *    produção: sem `DATABASE_URL`, o app grita no log.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const DEV_DIR = devDir();

export interface Draft {
  id: string;
  slug: string;
  templateId: string | null;
  content: SiteContent;
  status: "DRAFT" | "PENDING_PAYMENT" | "PUBLISHED" | "EXPIRED";
  anonId: string | null;
  updatedAt: Date;

  // --- estado da página publicada (SPEC 8.8)
  /** senha opcional, guardada como hash (SPEC 9.4) */
  passwordHash: string | null;
  /** aparece no Google? `false` por padrão (SPEC 9.4) */
  indexable: boolean;
  /** null = vitalícia */
  expiresAt: Date | null;
}

export interface CreateDraftInput {
  templateId?: string | null;
  content: SiteContent;
  anonId: string;
}

// --- backend de arquivo (dev) --------------------------------------------

interface DevRecord extends Omit<Draft, "updatedAt" | "expiresAt"> {
  updatedAt: string;
  expiresAt: string | null;
}

async function devWrite(record: DevRecord): Promise<void> {
  await mkdir(DEV_DIR, { recursive: true });
  await writeFile(
    join(DEV_DIR, `${record.id}.json`),
    JSON.stringify(record, null, 2),
    "utf8",
  );
}

async function devRead(id: string): Promise<DevRecord | null> {
  try {
    const raw = await readFile(join(DEV_DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as DevRecord;
  } catch {
    return null;
  }
}

function devToDraft(record: DevRecord): Draft {
  return {
    ...record,
    updatedAt: new Date(record.updatedAt),
    expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
    // Rascunhos criados antes destes campos existirem não têm as chaves.
    passwordHash: record.passwordHash ?? null,
    indexable: record.indexable ?? false,
  };
}

// --- API pública ----------------------------------------------------------

export async function createDraft(input: CreateDraftInput): Promise<Draft> {
  const slug = generateSlug();

  if (!hasDatabase) {
    const record: DevRecord = {
      id: randomUUID(),
      slug,
      templateId: input.templateId ?? null,
      content: input.content,
      status: "DRAFT",
      anonId: input.anonId,
      passwordHash: null,
      indexable: false,
      expiresAt: null,
      updatedAt: new Date().toISOString(),
    };
    await devWrite(record);
    return devToDraft(record);
  }

  const site = await db.site.create({
    data: {
      slug,
      templateId: input.templateId ?? null,
      content: input.content,
      anonId: input.anonId,
    },
  });

  return {
    id: site.id,
    slug: site.slug,
    templateId: site.templateId,
    content: input.content,
    status: site.status,
    anonId: site.anonId,
    passwordHash: site.passwordHash,
    indexable: site.indexable,
    expiresAt: site.expiresAt,
    updatedAt: site.updatedAt,
  };
}

export async function getDraft(id: string): Promise<Draft | null> {
  if (!hasDatabase) {
    const record = await devRead(id);
    return record ? devToDraft(record) : null;
  }

  const site = await db.site.findFirst({ where: { id, ...notDeleted } });
  if (!site) return null;

  const result = migrate(site.content);
  if (!result.content) return null;

  return {
    id: site.id,
    slug: site.slug,
    templateId: site.templateId,
    content: result.content,
    status: site.status,
    anonId: site.anonId,
    passwordHash: site.passwordHash,
    indexable: site.indexable,
    expiresAt: site.expiresAt,
    updatedAt: site.updatedAt,
  };
}

export type SaveResult =
  | { ok: true; draft: Draft }
  | {
      ok: false;
      reason: "not-found" | "published" | "invalid";
      detail?: string;
    };

/**
 * Autosave. Valida com zod no servidor também (SPEC 12) e **recusa** editar
 * página já publicada — o QR impresso aponta para ela.
 */
export async function saveDraftContent(
  id: string,
  rawContent: unknown,
): Promise<SaveResult> {
  const parsed = parseSiteContent(rawContent);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      detail: parsed.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "raiz"}: ${issue.message}`)
        .join("; "),
    };
  }

  const content = parsed.data;

  if (!hasDatabase) {
    const record = await devRead(id);
    if (!record) return { ok: false, reason: "not-found" };
    if (record.status === "PUBLISHED")
      return { ok: false, reason: "published" };

    const updated: DevRecord = {
      ...record,
      content,
      updatedAt: new Date().toISOString(),
    };
    await devWrite(updated);
    return { ok: true, draft: devToDraft(updated) };
  }

  const site = await db.site.findFirst({
    where: { id, ...notDeleted },
    select: { status: true },
  });
  if (!site) return { ok: false, reason: "not-found" };
  if (site.status === "PUBLISHED") return { ok: false, reason: "published" };

  const updated = await db.site.update({ where: { id }, data: { content } });

  return {
    ok: true,
    draft: {
      id: updated.id,
      slug: updated.slug,
      templateId: updated.templateId,
      content,
      status: updated.status,
      anonId: updated.anonId,
      passwordHash: updated.passwordHash,
      indexable: updated.indexable,
      expiresAt: updated.expiresAt,
      updatedAt: updated.updatedAt,
    },
  };
}

/**
 * Busca por slug — o que a página publicada precisa.
 *
 * No backend de arquivo não existe índice: varre o diretório. Custa pouco com
 * dezenas de rascunhos locais e nunca roda em produção, onde o Postgres tem
 * `@unique` no slug.
 */
export async function findDraftBySlug(slug: string): Promise<Draft | null> {
  if (!hasDatabase) {
    try {
      const files = await readdir(DEV_DIR);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const record = await devRead(file.replace(/\.json$/, ""));
        if (record?.slug === slug) return devToDraft(record);
      }
    } catch {
      return null;
    }
    return null;
  }

  const site = await db.site.findFirst({ where: { slug, ...notDeleted } });
  return site ? getDraft(site.id) : null;
}

/** Rascunhos de um visitante anônimo, para a recuperação ao voltar. */
export async function listDraftsByAnon(anonId: string): Promise<Draft[]> {
  if (!hasDatabase) {
    try {
      const files = await readdir(DEV_DIR);
      const records = await Promise.all(
        files
          .filter((file) => file.endsWith(".json"))
          .map((file) => devRead(file.replace(/\.json$/, ""))),
      );

      return records
        .filter((record): record is DevRecord => record?.anonId === anonId)
        .map(devToDraft)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch {
      return [];
    }
  }

  const sites = await db.site.findMany({
    where: { anonId, status: "DRAFT", ...notDeleted },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  return sites.flatMap((site) => {
    const result = migrate(site.content);
    if (!result.content) return [];
    return [
      {
        id: site.id,
        slug: site.slug,
        templateId: site.templateId,
        content: result.content,
        status: site.status,
        anonId: site.anonId,
        passwordHash: site.passwordHash,
        indexable: site.indexable,
        expiresAt: site.expiresAt,
        updatedAt: site.updatedAt,
      },
    ];
  });
}

/** Quantos caracteres do fim do slug são o sufixo aleatório, com o hífen. */
const SUFIXO = 9;

/** Palavras que não podem virar o começo de um link público. */
const RESERVADAS = new Set([
  "admin", "api", "app", "auth", "blog", "checkout", "criar", "dev",
  "editor", "entrar", "exemplo", "login", "novo", "p", "painel", "sair",
  "sucesso", "suporte", "termos", "privacidade",
]);

/**
 * Transforma o que a pessoa digitou no começo legível de um link.
 *
 * Sem acento, sem espaço, sem hífen dobrado nem sobrando nas pontas — e no
 * máximo 40 caracteres, para o link ainda caber numa conversa sem quebrar.
 */
export function apelidoDeLink(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** O começo legível de um slug, sem o sufixo aleatório. */
export function apelidoAtual(slug: string): string {
  return slug.slice(0, Math.max(slug.length - SUFIXO, 0));
}

export type RenameResult =
  | { ok: true; draft: Draft }
  | { ok: false; reason: "not-found" | "published" | "invalid"; detail?: string };

/**
 * Troca só o **começo legível** do link, preservando o sufixo aleatório.
 *
 * Por que não deixar escolher o link inteiro, que é o que um wizard costuma
 * oferecer: o sufixo é o que impede varrer as páginas dos outros (SPEC 9.4).
 * Estas páginas têm foto íntima de casal; um `/p/marina-e-teo` é adivinhável,
 * e adivinhável aqui significa que dá para achar a página de gente que você não
 * conhece. Então a pessoa escolhe a parte que ela mostra para alguém, e a parte
 * que protege continua sendo sorteada.
 *
 * De quebra, isso dispensa a verificação de disponibilidade em tempo real: com
 * o sufixo mantido, dois links nunca colidem, e ninguém fica tentando nome atrás
 * de nome como quem escolhe @ de rede social.
 *
 * Publicado não muda: o QR já foi impresso e apontado para o slug antigo
 * (SPEC 7.1).
 */
export async function renameDraftSlug(
  id: string,
  apelido: string,
): Promise<RenameResult> {
  const limpo = apelidoDeLink(apelido);

  if (limpo.length < 3) {
    return { ok: false, reason: "invalid", detail: "Use ao menos 3 letras." };
  }
  if (RESERVADAS.has(limpo)) {
    return { ok: false, reason: "invalid", detail: "Esse começo é reservado." };
  }

  const atual = await getDraft(id);
  if (!atual) return { ok: false, reason: "not-found" };
  if (atual.status === "PUBLISHED") return { ok: false, reason: "published" };

  const slug = `${limpo}${atual.slug.slice(atual.slug.length - SUFIXO)}`;

  if (!hasDatabase) {
    const record = await devRead(id);
    if (!record) return { ok: false, reason: "not-found" };
    const updated: DevRecord = {
      ...record,
      slug,
      updatedAt: new Date().toISOString(),
    };
    await devWrite(updated);
    return { ok: true, draft: devToDraft(updated) };
  }

  const updated = await db.site.update({ where: { id }, data: { slug } });
  return {
    ok: true,
    draft: {
      id: updated.id,
      slug: updated.slug,
      templateId: updated.templateId,
      content: atual.content,
      status: updated.status,
      anonId: updated.anonId,
      passwordHash: updated.passwordHash,
      indexable: updated.indexable,
      expiresAt: updated.expiresAt,
      updatedAt: updated.updatedAt,
    },
  };
}

/**
 * Slug com sufixo aleatório — SPEC 9.4: não pode ser adivinhável, senão dá para
 * varrer as páginas dos outros. Imutável depois de publicado (SPEC 7.1).
 *
 * O prefixo era a ocasião; sem ocasiões, é fixo. "nosso" mantém a URL legível
 * na hora de mostrar para alguém, sem dizer nada sobre o conteúdo.
 */
function generateSlug(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // sem 0/o/1/l
  const suffix = Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");

  return `nosso-${suffix}`;
}
