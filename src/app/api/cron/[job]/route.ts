import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { isJobName, JOB_NAMES, JOBS } from "@/lib/jobs";
import { logDenied } from "@/lib/security-log";

/**
 * Gatilho dos trabalhos agendados — SPEC 9.2.
 *
 * `/api/cron/order.abandoned`, `/api/cron/site.expiring`, `/api/cron/site.purge`.
 * Os horários estão em `vercel.json`.
 *
 * **Rota de manutenção é rota administrativa.** Sem segredo, qualquer um
 * dispararia a purga de páginas expiradas ou uma enxurrada de e-mails. A
 * Vercel manda `Authorization: Bearer $CRON_SECRET` nos crons dela; em
 * desenvolvimento, sem a variável configurada, a rota abre — é o que permite
 * testar o trabalho com um `curl`, e em produção a ausência do segredo **fecha**
 * a rota em vez de abrir (a mesma regra do webhook do Mercado Pago).
 */

export const dynamic = "force-dynamic";

/** Trabalho longo: 5 minutos em vez dos 10s padrão da Vercel. */
export const maxDuration = 300;

type Params = Promise<{ job: string }>;

function autorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Em produção, rota de manutenção sem segredo é porta aberta.
    if (process.env.VERCEL) {
      console.error(
        "[cron] CRON_SECRET ausente em produção — execução recusada.",
      );
      return false;
    }
    return true; // modo local
  }

  const header = request.headers.get("authorization") ?? "";
  const esperado = `Bearer ${secret}`;

  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(esperado, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { job } = await params;

  if (!autorizado(request)) {
    await logDenied("bad-signature", { rota: "cron", job });
    return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
  }

  if (!isJobName(job)) {
    return NextResponse.json(
      { error: "Trabalho desconhecido.", disponiveis: JOB_NAMES },
      { status: 404 },
    );
  }

  const inicio = Date.now();

  try {
    const result = await JOBS[job]();

    console.info(
      `[cron:${job}] ${result.processed} tratados, ${result.failed} falharam, ${Date.now() - inicio}ms`,
    );

    return NextResponse.json({ ...result, ms: Date.now() - inicio });
  } catch (error) {
    // O cron precisa da falha no código de status para reportar a execução —
    // aqui, ao contrário do webhook, devolver erro é o comportamento certo.
    console.error(`[cron:${job}] falhou inteiro`, error);
    return NextResponse.json(
      { error: "O trabalho falhou. Confira o log.", job },
      { status: 500 },
    );
  }
}
