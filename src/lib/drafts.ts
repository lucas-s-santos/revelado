import { randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";

import { devDir } from "@/lib/dev-store";
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
const DEV_DIR = devDir();

export interface Draft {
  id: string;
  slug: string;
  templateId: string | null;
  content: SiteContent;
  status: "DRAFT" | "PENDING_PAYMENT" | "PUBLISHED" | "EXPIRED";
  /** dono anônimo, antes do login (SPEC 1) */
  anonId: string | null;
  /** dono com conta, a partir do checkout (SPEC 1) */
  userId: string | null;
  updatedAt: Date;

  // --- estado da página publicada (SPEC 8.8)
  /** senha opcional, guardada como hash (SPEC 9.4) */
  passwordHash: string | null;
  /** aparece no Google? `false` por padrão (SPEC 9.4) */
  indexable: boolean;
  /** null = vitalícia */
  expiresAt: Date | null;
  /** quando o aviso de "vai expirar" saiu (SPEC 9.2) */
  expiringNotifiedAt: Date | null;
}

export interface CreateDraftInput {
  templateId?: string | null;
  content: SiteContent;
  anonId: string;
}

// --- backend de arquivo (dev) --------------------------------------------

interface DevRecord extends Omit<
  Draft,
  "updatedAt" | "expiresAt" | "expiringNotifiedAt"
> {
  updatedAt: string;
  expiresAt: string | null;
  expiringNotifiedAt?: string | null;
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
    expiringNotifiedAt: record.expiringNotifiedAt
      ? new Date(record.expiringNotifiedAt)
      : null,
  };
}

/**
 * Linha do Postgres → `Draft`.
 *
 * Existia copiado em quatro lugares, e foi assim que acrescentar um campo novo
 * quebrou a compilação em três deles. Um mapeador só: campo novo entra aqui e
 * chega em todo mundo.
 *
 * O `content` vem de fora porque cada chamador já passou pelo `migrate` — o
 * JSON do banco pode ser de uma versão de schema anterior (SPEC 7.2).
 */
type SiteRow = {
  id: string;
  slug: string;
  templateId: string | null;
  status: Draft["status"];
  anonId: string | null;
  userId: string | null;
  passwordHash: string | null;
  indexable: boolean;
  expiresAt: Date | null;
  expiringNotifiedAt: Date | null;
  updatedAt: Date;
};

function rowToDraft(site: SiteRow, content: SiteContent): Draft {
  return {
    id: site.id,
    slug: site.slug,
    templateId: site.templateId,
    content,
    status: site.status,
    anonId: site.anonId,
    userId: site.userId,
    passwordHash: site.passwordHash,
    indexable: site.indexable,
    expiresAt: site.expiresAt,
    expiringNotifiedAt: site.expiringNotifiedAt,
    updatedAt: site.updatedAt,
  };
}

// --- API pública ----------------------------------------------------------

export async function createDraft(input: CreateDraftInput): Promise<Draft> {
  const slug = await generateSlug();

  if (!hasDatabase) {
    const record: DevRecord = {
      id: randomUUID(),
      slug,
      templateId: input.templateId ?? null,
      content: input.content,
      status: "DRAFT",
      anonId: input.anonId,
      userId: null,
      passwordHash: null,
      indexable: false,
      expiresAt: null,
      expiringNotifiedAt: null,
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

  return rowToDraft(site, input.content);
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

  return rowToDraft(site, result.content);
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

  return { ok: true, draft: rowToDraft(updated, content) };
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

/**
 * As páginas de quem está pedindo — SPEC 8.7, o painel.
 *
 * Soma os dois donos possíveis (ver `isDraftOwner`): a conta, quando existe, e o
 * cookie anônimo deste navegador. É o que faz o painel mostrar tanto as páginas
 * montadas neste aparelho quanto as que chegaram pela conta.
 *
 * **Sem filtro de status.** Antes o backend de arquivo trazia tudo e o Postgres
 * filtrava `status: "DRAFT"`, então em produção o painel nunca mostraria uma
 * página publicada — justamente a que a pessoa vai lá gerenciar. Em
 * desenvolvimento funcionava, o que é o pior tipo de divergência.
 */
export async function listDraftsForOwner(
  owner: { anonId: string | null; userId: string | null },
  take = 20,
): Promise<Draft[]> {
  if (!owner.anonId && !owner.userId) return [];

  if (!hasDatabase) {
    return (await devAllRecords())
      .filter((record) => owner.anonId && record.anonId === owner.anonId)
      .map(devToDraft)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, take);
  }

  const donos = [
    ...(owner.userId ? [{ userId: owner.userId }] : []),
    ...(owner.anonId ? [{ anonId: owner.anonId }] : []),
  ];

  const sites = await db.site.findMany({
    where: { OR: donos, ...notDeleted },
    orderBy: { updatedAt: "desc" },
    take,
  });

  return sites.flatMap((site) => {
    const result = migrate(site.content);
    if (!result.content) return [];
    return [rowToDraft(site, result.content)];
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
 * Slug aleatório — SPEC 9.4: não pode ser adivinhável, senão dá para varrer as
 * páginas dos outros. Imutável depois de publicado (SPEC 7.1).
 *
 * Sem o prefixo de ocasião (removido na v2 do SPEC), o sorteio carrega a página
 * inteira — por isso dez caracteres, não oito.
 *
 * Duas coisas que ele precisa ter e antes não tinha:
 *  - **`randomInt` do `node:crypto`**, não `Math.random`. O sufixo é a única
 *    coisa que separa a página de quem não deveria vê-la, e `Math.random` é
 *    previsível a partir de saídas anteriores — quem coletasse alguns slugs
 *    poderia derivar os próximos;
 *  - **conferência de colisão**. O slug é `@unique` no banco: sem conferir,
 *    um empate vira erro 500 na cara de quem estava criando a página.
 */
async function generateSlug(): Promise<string> {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // sem 0/o/1/l

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = Array.from({ length: 10 }, () =>
      alphabet.charAt(randomInt(alphabet.length)),
    ).join("");

    if (!(await slugTaken(slug))) return slug;
  }

  // Cinco empates seguidos em 32^10 não acontece: se aconteceu, alguma coisa
  // está errada no sorteio. Cai para um sufixo maior em vez de insistir.
  return randomUUID().replace(/-/g, "").slice(0, 14);
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

// --- consultas dos jobs agendados (SPEC 9.2) ------------------------------

/** Todos os registros do backend de arquivo. Só existe fora de produção. */
async function devAllRecords(): Promise<DevRecord[]> {
  try {
    const files = await readdir(DEV_DIR);
    const records = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map((file) => devRead(file.replace(/\.json$/, ""))),
    );
    return records.filter((record): record is DevRecord => record !== null);
  } catch {
    return [];
  }
}

/**
 * Páginas que vão expirar — SPEC 9.2 (`site.expiring`), aviso 15 dias antes.
 *
 * Só as que ainda não receberam o aviso, e só as que **ainda estão no ar**: uma
 * página que já expirou não tem o que avisar, tem o que renovar.
 */
export async function listExpiringSoon(
  withinMs: number,
  now = new Date(),
  take = 100,
): Promise<Draft[]> {
  const limite = new Date(now.getTime() + withinMs);

  if (!hasDatabase) {
    return (await devAllRecords())
      .map(devToDraft)
      .filter(
        (draft) =>
          draft.status === "PUBLISHED" &&
          draft.expiresAt !== null &&
          draft.expiringNotifiedAt === null &&
          draft.expiresAt.getTime() > now.getTime() &&
          draft.expiresAt.getTime() <= limite.getTime(),
      )
      .slice(0, take);
  }

  const sites = await db.site.findMany({
    where: {
      status: "PUBLISHED",
      expiringNotifiedAt: null,
      expiresAt: { gt: now, lte: limite },
      ...notDeleted,
    },
    orderBy: { expiresAt: "asc" },
    take,
  });

  return sites.flatMap((site) => {
    const result = migrate(site.content);
    return result.content ? [rowToDraft(site, result.content)] : [];
  });
}

/**
 * Zera a marca do aviso de expiração.
 *
 * Chamada ao renovar: sem isto, uma página renovada carregaria para sempre a
 * marca do ciclo anterior e **nunca mais seria avisada** de que vai expirar de
 * novo — o cliente descobriria pela página fora do ar.
 */
export async function clearExpiringNotice(id: string): Promise<void> {
  if (!hasDatabase) {
    const record = await devRead(id);
    if (!record) return;
    await devWrite({ ...record, expiringNotifiedAt: null });
    return;
  }

  await db.site.update({ where: { id }, data: { expiringNotifiedAt: null } });
}

/** Marca o aviso de expiração como enviado, para ele não sair duas vezes. */
export async function markExpiringNotified(
  id: string,
  at = new Date(),
): Promise<void> {
  if (!hasDatabase) {
    const record = await devRead(id);
    if (!record) return;
    await devWrite({ ...record, expiringNotifiedAt: at.toISOString() });
    return;
  }

  await db.site.update({ where: { id }, data: { expiringNotifiedAt: at } });
}

/**
 * Páginas expiradas há mais de `graceMs` — SPEC 9.2 (`site.purge`), 30 dias
 * depois de expirar.
 *
 * A carência é o ponto: expirar não apaga nada, só tira do ar com CTA de
 * renovação (SPEC 8.8). Quem renova no dia 29 não perde as fotos.
 */
export async function listPurgeable(
  graceMs: number,
  now = new Date(),
  take = 100,
): Promise<Draft[]> {
  const limite = new Date(now.getTime() - graceMs);

  if (!hasDatabase) {
    return (await devAllRecords())
      .map(devToDraft)
      .filter(
        (draft) =>
          draft.expiresAt !== null &&
          draft.expiresAt.getTime() <= limite.getTime(),
      )
      .slice(0, take);
  }

  const sites = await db.site.findMany({
    where: { expiresAt: { lte: limite }, ...notDeleted },
    orderBy: { expiresAt: "asc" },
    take,
  });

  return sites.flatMap((site) => {
    const result = migrate(site.content);
    return result.content ? [rowToDraft(site, result.content)] : [];
  });
}
