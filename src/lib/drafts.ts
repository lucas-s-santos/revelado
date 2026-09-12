import { randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { migrate } from "@/lib/blocks/migrate";
import { revalidateSite } from "@/lib/cache";
import { parseSiteContent, type SiteContent } from "@/lib/blocks/schema";
import { db, notDeleted } from "@/lib/db";
import { deleteSiteMedia } from "@/lib/r2";

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

  // --- estado da página publicada (SPEC 8.8)
  /** senha opcional, guardada como hash (SPEC 9.4) */
  passwordHash: string | null;
  /** aparece no Google? `false` por padrão (SPEC 9.4) */
  indexable: boolean;
  /** null = vitalícia */
  expiresAt: Date | null;
}

export interface CreateDraftInput {
  occasionId: string;
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
    occasionId: site.occasionId,
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
      occasionId: updated.occasionId,
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
 * Privacidade da página publicada — SPEC 8.7 ("trocar senha") e 9.4.
 *
 * Separado de `saveDraftContent` de propósito: aquele recusa mexer em página
 * publicada, porque o QR já está impresso. Senha e indexação são justamente o
 * que **precisa** poder mudar depois de publicar, e nenhum dos dois toca o
 * conteúdo que o QR aponta.
 */
export interface PrivacyPatch {
  /** `null` remove a senha; `undefined` não mexe nela */
  passwordHash?: string | null;
  indexable?: boolean;
}

export async function updateSitePrivacy(
  id: string,
  patch: PrivacyPatch,
): Promise<Draft | null> {
  if (!hasDatabase) {
    const record = await devRead(id);
    if (!record) return null;

    const updated: DevRecord = {
      ...record,
      passwordHash:
        patch.passwordHash === undefined
          ? record.passwordHash
          : patch.passwordHash,
      indexable: patch.indexable ?? record.indexable,
      updatedAt: new Date().toISOString(),
    };

    await devWrite(updated);
    return devToDraft(updated);
  }

  const site = await db.site.findFirst({
    where: { id, ...notDeleted },
    select: { id: true },
  });
  if (!site) return null;

  await db.site.update({
    where: { id },
    data: {
      ...(patch.passwordHash === undefined
        ? {}
        : { passwordHash: patch.passwordHash }),
      ...(patch.indexable === undefined ? {} : { indexable: patch.indexable }),
    },
  });

  return getDraft(id);
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
        occasionId: site.occasionId,
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

/** O slug já existe? Ignora `deletedAt`: apagada ou não, a vaga está ocupada. */
async function slugTaken(slug: string): Promise<boolean> {
  if (!hasDatabase) {
    try {
      const files = await readdir(DEV_DIR);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const record = await devRead(file.replace(/\.json$/, ""));
        if (record?.slug === slug) return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  const site = await db.site.findUnique({
    where: { slug },
    select: { id: true },
  });
  return site !== null;
}

/**
 * Slug com sufixo aleatório — SPEC 9.4: não pode ser adivinhável, senão dá para
 * varrer as páginas dos outros. Imutável depois de publicado (SPEC 7.1).
 *
 * Duas coisas que o sorteio precisa ter e antes não tinha:
 *  - **`randomInt` do `node:crypto`**, não `Math.random`. O sufixo é a única
 *    coisa que separa a página de quem não deveria vê-la, e `Math.random` é
 *    previsível a partir de saídas anteriores — quem coletasse alguns slugs
 *    poderia derivar os próximos;
 *  - **conferência de colisão**. O slug é `@unique` no banco: sem conferir,
 *    um empate vira erro 500 na cara de quem estava criando a página.
 */
async function generateSlug(occasionId: string): Promise<string> {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // sem 0/o/1/l

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Array.from({ length: 8 }, () =>
      alphabet.charAt(randomInt(alphabet.length)),
    ).join("");

    const slug = `${occasionId}-${suffix}`;
    if (!(await slugTaken(slug))) return slug;
  }

  // Cinco empates seguidos em 32^8 não acontece: se aconteceu, alguma coisa
  // está errada no sorteio. Cai para um sufixo maior em vez de insistir.
  return `${occasionId}-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/**
 * Exclusão a pedido da pessoa — SPEC 9.4: "direito de exclusão apagando também
 * o R2".
 *
 * Três coisas acontecem, nesta ordem, e a ordem importa:
 *  1. as fotos saem do R2. É o único lugar de onde não dá para recuperar por
 *     engano depois, e é o que a LGPD cobra;
 *  2. o site vira `deletedAt` no banco (soft delete, SPEC 7.1) — o histórico da
 *     venda continua existindo para a contabilidade, o conteúdo não;
 *  3. o cache do slug cai, senão a página continua servindo do ISR por mais uma
 *     hora depois de apagada.
 *
 * O slug **não** é liberado: `slugTaken` ignora `deletedAt` de propósito. Um QR
 * Code impresso não pode um dia apontar para a página de outra pessoa.
 */
export async function deleteSite(id: string): Promise<boolean> {
  const draft = await getDraft(id);
  if (!draft) return false;

  const removed = await deleteSiteMedia(id).catch((error: unknown) => {
    // Falha no storage não pode impedir a exclusão do conteúdo: o pedido da
    // pessoa vale mais. Fica registrado para varredura posterior.
    console.error(`[exclusao:${id}] mídias não saíram do R2`, error);
    return 0;
  });

  if (!hasDatabase) {
    await rm(join(DEV_DIR, `${id}.json`), { force: true });
  } else {
    await db.site.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  revalidateSite(draft.slug);
  console.warn(`[exclusao:${id}] site apagado, ${removed} mídias removidas`);

  return true;
}
