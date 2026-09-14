import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ENABLED, handlers } from "@/auth";

/**
 * Handler do Auth.js — SPEC 2.
 *
 * É a única rota que o Auth.js precisa: pedir o link, verificar o token e
 * encerrar a sessão passam todos por aqui.
 *
 * O guarda na frente existe porque o login depende de banco, segredo e conta no
 * Resend, e o projeto inteiro roda sem os três. Sem eles o adapter estoura e a
 * rota devolvia 500 — erro de verdade no log, evento no Sentry e uma tela feia
 * para quem só bateu na URL. Recusar de forma limpa é o mesmo tratamento que o
 * resto do sistema dá a serviço não configurado.
 */

const indisponivel = () =>
  NextResponse.json(
    { error: "O login não está disponível neste ambiente." },
    { status: 404 },
  );

export async function GET(request: NextRequest) {
  if (!AUTH_ENABLED) return indisponivel();
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!AUTH_ENABLED) return indisponivel();
  return handlers.POST(request);
}
