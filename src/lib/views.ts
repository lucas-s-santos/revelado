import { mkdir, readFile, writeFile } from "node:fs/promises";

import { devDir } from "@/lib/dev-store";
import { join } from "node:path";

import { db } from "@/lib/db";
import { sendFirstViewEmail } from "@/lib/email";
import { findDraftBySlug } from "@/lib/drafts";
import { listOrdersByEmail } from "@/lib/orders";

/**
 * Contagem de visitas — SPEC 7.1 e 8.8.
 *
 * "Registrar visita de forma **agregada e assíncrona**, sem bloquear o render."
 * E na tabela: "agregado por dia, **nunca log cru**" — contar quantas visitas
 * houve não exige guardar quem visitou (LGPD, SPEC 9.4).
 *
 * A primeira visita dispara a notificação que a SPEC 8.7 chama de "maior gatilho
 * emocional do produto e a maior fonte de compartilhamento".
 */

const DEV_FILE = devDir("views.json");

interface DevViews {
  [siteId: string]: {
    total: number;
    firstViewedAt: string | null;
    /** contagem por dia, no formato AAAA-MM-DD */
    days: Record<string, number>;
  };
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

async function devRead(): Promise<DevViews> {
  try {
    return JSON.parse(await readFile(DEV_FILE, "utf8")) as DevViews;
  } catch {
    return {};
  }
}

export interface ViewResult {
  total: number;
  /** true só na primeiríssima visita, para disparar a notificação uma vez */
  isFirst: boolean;
}

export async function recordView(
  siteId: string,
  slug: string,
): Promise<ViewResult> {
  const day = today();

  if (!process.env.DATABASE_URL) {
    const all = await devRead();
    const current = all[siteId] ?? { total: 0, firstViewedAt: null, days: {} };

    const isFirst = current.firstViewedAt === null;

    const updated = {
      total: current.total + 1,
      firstViewedAt: current.firstViewedAt ?? new Date().toISOString(),
      days: { ...current.days, [day]: (current.days[day] ?? 0) + 1 },
    };

    await mkdir(devDir(), { recursive: true });
    await writeFile(
      DEV_FILE,
      JSON.stringify({ ...all, [siteId]: updated }, null, 2),
      "utf8",
    );

    if (isFirst) await notifyFirstView(slug);
    return { total: updated.total, isFirst };
  }

  // Agregado por dia: um upsert, não uma linha por visita.
  await db.siteView.upsert({
    where: { siteId_day: { siteId, day: new Date(day) } },
    update: { count: { increment: 1 } },
    create: { siteId, day: new Date(day), count: 1 },
  });

  const site = await db.site.update({
    where: { id: siteId },
    data: { viewsCount: { increment: 1 } },
    select: { viewsCount: true, firstViewedAt: true },
  });

  const isFirst = site.firstViewedAt === null;

  if (isFirst) {
    await db.site.update({
      where: { id: siteId },
      data: { firstViewedAt: new Date() },
    });
    await notifyFirstView(slug);
  }

  return { total: site.viewsCount, isFirst };
}

/**
 * "Sua página foi aberta" — SPEC 8.7.
 *
 * Falhar aqui não pode derrubar o registro da visita: o e-mail é bônus, a
 * contagem é o dado.
 */
async function notifyFirstView(slug: string): Promise<void> {
  try {
    const draft = await findDraftBySlug(slug);
    if (!draft) return;

    // Sem login ainda: o dono é quem pagou por esta página.
    const email = await ownerEmailFor(draft.id);
    if (!email) return;

    await sendFirstViewEmail({ to: email, slug });
  } catch (error) {
    console.error(`[views:${slug}] notificação de primeira visita falhou`, error);
  }
}

async function ownerEmailFor(siteId: string): Promise<string | null> {
  if (process.env.DATABASE_URL) {
    const order = await db.order.findFirst({
      where: { siteId, status: "PAID" },
      include: { user: { select: { email: true } } },
    });
    return order?.user.email ?? null;
  }

  // Modo local: varre os pedidos em disco procurando o desta página.
  const { readdir } = await import("node:fs/promises");
  const dir = devDir("orders");

  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const order = JSON.parse(await readFile(join(dir, file), "utf8")) as {
        siteId: string;
        status: string;
        email: string;
      };
      if (order.siteId === siteId && order.status === "PAID") return order.email;
    }
  } catch {
    return null;
  }

  return null;
}

/** Total de visitas, para o painel (SPEC 8.7). */
export async function viewsFor(siteId: string): Promise<number> {
  if (!process.env.DATABASE_URL) {
    const all = await devRead();
    return all[siteId]?.total ?? 0;
  }

  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { viewsCount: true },
  });

  return site?.viewsCount ?? 0;
}

// Mantém a importação usada, evitando ciclo com lib/orders no caminho do banco.
export type { ViewResult as SiteViewResult };
void listOrdersByEmail;
