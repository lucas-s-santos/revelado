import {
  deleteSite,
  listExpiringSoon,
  listPurgeable,
  markExpiringNotified,
} from "@/lib/drafts";
import { sendAbandonedEmail, sendExpiringEmail } from "@/lib/email";
import {
  listAbandoned,
  markAbandonedNotified,
  ownerEmailForSite,
} from "@/lib/orders";

/**
 * Trabalhos agendados — SPEC 9.2.
 *
 * O SPEC pede Inngest. Aqui são funções puras chamadas por uma rota de cron
 * (`/api/cron/[job]`), pelo motivo de sempre: os três trabalhos deste arquivo
 * são varreduras periódicas sem fan-out, sem retry por evento e sem passo
 * encadeado — exatamente o que um cron resolve. `media.process`, que é
 * disparado por evento e precisa de retry, é o que vai justificar a fila de
 * verdade; quando ela entrar, estas funções migram inteiras, porque não sabem
 * quem as chamou.
 *
 * Três regras que valem para os três:
 *  1. **um aviso sai uma vez.** Cada trabalho marca o que já fez antes de
 *     seguir. Cron erra para os dois lados — execução perdida e execução
 *     repetida — e ninguém merece dois e-mails da mesma coisa;
 *  2. **um registro com problema não derruba a leva.** O erro vai para o log e
 *     a varredura continua. Uma página com conteúdo inválido não pode impedir
 *     que as outras 400 sejam avisadas;
 *  3. **lote limitado.** Cada execução processa no máximo `take` registros. Se
 *     houver mais, a próxima execução pega o resto — melhor atrasar um aviso
 *     que estourar o tempo da função no meio.
 */

export interface JobResult {
  job: string;
  /** quantos registros foram efetivamente tratados */
  processed: number;
  /** quantos falharam e ficaram para a próxima rodada */
  failed: number;
}

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

/** SPEC 8.5: "carrinho abandonado, 30 minutos depois, com link de volta". */
export const ABANDONED_AFTER_MS = 30 * MINUTO;

/** SPEC 9.2: aviso 15 dias antes de expirar. */
export const EXPIRING_WITHIN_MS = 15 * DIA;

/** SPEC 9.2: purga 30 dias depois de expirar. */
export const PURGE_GRACE_MS = 30 * DIA;

/**
 * `order.abandoned` — quem gerou o Pix e não pagou.
 *
 * O template já existia em `lib/email.ts` desde a Fase 5 e nunca tinha sido
 * enviado uma vez sequer: faltava exatamente este arquivo.
 */
export async function orderAbandoned(now = new Date()): Promise<JobResult> {
  const pendentes = await listAbandoned(ABANDONED_AFTER_MS, now);

  let processed = 0;
  let failed = 0;

  for (const order of pendentes) {
    try {
      // Marca antes de enviar. Se o envio falhar, perde-se um aviso; se a
      // marcação falhasse depois de um envio bem-sucedido, a pessoa receberia
      // o mesmo e-mail a cada rodada do cron até alguém perceber.
      await markAbandonedNotified(order.id, now);
      await sendAbandonedEmail({ to: order.email, draftId: order.siteId });
      processed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[job:order.abandoned] pedido ${order.id}`, error);
    }
  }

  return { job: "order.abandoned", processed, failed };
}

/** `site.expiring` — avisa 15 dias antes de a página sair do ar. */
export async function siteExpiring(now = new Date()): Promise<JobResult> {
  const proximas = await listExpiringSoon(EXPIRING_WITHIN_MS, now);

  let processed = 0;
  let failed = 0;

  for (const draft of proximas) {
    try {
      const email = await ownerEmailForSite(draft.id);

      // Sem e-mail não há a quem avisar. Marca assim mesmo: insistir toda noite
      // numa página órfã é varrer a mesma linha para sempre.
      await markExpiringNotified(draft.id, now);
      processed += 1;

      if (email && draft.expiresAt) {
        await sendExpiringEmail({
          to: email,
          slug: draft.slug,
          siteId: draft.id,
          expiresAt: draft.expiresAt,
        });
      } else {
        console.warn(
          `[job:site.expiring] site ${draft.id} expira e não tem dono conhecido`,
        );
      }
    } catch (error) {
      failed += 1;
      console.error(`[job:site.expiring] site ${draft.id}`, error);
    }
  }

  return { job: "site.expiring", processed, failed };
}

/**
 * `site.purge` — apaga o que expirou há mais de 30 dias.
 *
 * É o único trabalho destrutivo do sistema, e a carência é o que o torna
 * seguro: expirar só tira do ar, com CTA de renovação (SPEC 8.8). Quem renovar
 * no dia 29 encontra tudo no lugar. Passados os 30, some de verdade — inclusive
 * do R2, que é o que a LGPD cobra (SPEC 9.4).
 */
export async function sitePurge(now = new Date()): Promise<JobResult> {
  const vencidas = await listPurgeable(PURGE_GRACE_MS, now);

  let processed = 0;
  let failed = 0;

  for (const draft of vencidas) {
    try {
      await deleteSite(draft.id);
      processed += 1;
    } catch (error) {
      failed += 1;
      console.error(`[job:site.purge] site ${draft.id}`, error);
    }
  }

  return { job: "site.purge", processed, failed };
}

export const JOBS = {
  "order.abandoned": orderAbandoned,
  "site.expiring": siteExpiring,
  "site.purge": sitePurge,
} as const;

export type JobName = keyof typeof JOBS;

export const JOB_NAMES = Object.keys(JOBS) as JobName[];

export function isJobName(value: string): value is JobName {
  return (JOB_NAMES as string[]).includes(value);
}
