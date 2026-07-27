import { randomUUID } from "node:crypto";
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
const DEV_DIR = join(process.cwd(), ".drafts");

export interface Draft {
  id: string;
  slug: string;
  occasionId: string;
  templateId: string | null;
  content: SiteContent;
  status: "DRAFT" | "PENDING_PAYMENT" | "PUBLISHED" | "EXPIRED";
  anonId: string | null;
  updatedAt: Date;
}

export interface CreateDraftInput {
  occasionId: string;
  templateId?: string | null;
  content: SiteContent;
  anonId: string;
}

// --- backend de arquivo (dev) --------------------------------------------

interface DevRecord extends Omit<Draft, "updatedAt"> {
  updatedAt: string;
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
  return { ...record, updatedAt: new Date(record.updatedAt) };
}

// --- API pública ----------------------------------------------------------

export async function createDraft(input: CreateDraftInput): Promise<Draft> {
  const slug = await generateSlug(input.occasionId);

  if (!hasDatabase) {
    const record: DevRecord = {
      id: randomUUID(),
      slug,
      occasionId: input.occasionId,
      templateId: input.templateId ?? null,
      content: input.content,
      status: "DRAFT",
      anonId: input.anonId,
      updatedAt: new Date().toISOString(),
    };
    await devWrite(record);
    return devToDraft(record);
  }

  const site = await db.site.create({
    data: {
      slug,
      occasionId: input.occasionId,
      templateId: input.templateId ?? null,
      content: input.content,
      anonId: input.anonId,
    },
  });

  return {
    id: site.id,
    slug: site.slug,
    occasionId: site.occasionId,
    templateId: site.templateId,
    content: input.content,
    status: site.status,
    anonId: site.anonId,
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
    occasionId: site.occasionId,
    templateId: site.templateId,
    content: result.content,
    status: site.status,
    anonId: site.anonId,
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
      occasionId: updated.occasionId,
      templateId: updated.templateId,
      content,
      status: updated.status,
      anonId: updated.anonId,
      updatedAt: updated.updatedAt,
    },
  };
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
        occasionId: site.occasionId,
        templateId: site.templateId,
        content: result.content,
        status: site.status,
        anonId: site.anonId,
        updatedAt: site.updatedAt,
      },
    ];
  });
}

/**
 * Slug com sufixo aleatório — SPEC 9.4: não pode ser adivinhável, senão dá para
 * varrer as páginas dos outros. Imutável depois de publicado (SPEC 7.1).
 */
async function generateSlug(occasionId: string): Promise<string> {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // sem 0/o/1/l
  const suffix = Array.from(
    { length: 8 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");

  return `${occasionId}-${suffix}`;
}
