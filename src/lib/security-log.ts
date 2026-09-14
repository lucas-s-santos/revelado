/**
 * Registro de tentativa de acesso indevido — SPEC 9.4.
 *
 * Sem isto, toda porta fechada do sistema fecha em silêncio: quem passa a noite
 * tentando abrir rascunho e senha alheios não deixa rastro, e a notícia chega
 * pelo cliente, semanas depois. O Sentry já existia, mas só captura **exceção**,
 * e recusar acesso não levanta exceção nenhuma.
 *
 * LGPD (SPEC 9.4): grava o **evento**, não a pessoa. O IP entra em hash curto —
 * dá para ver que são 400 tentativas da mesma origem sem guardar de quem é.
 *
 * O passo que fecha o assunto não está no código: crie no Sentry um alerta sobre
 * a tag `security` (ex.: 10 eventos em 5 minutos → e-mail). Log que ninguém lê
 * não é monitoramento.
 */

import { createHash } from "node:crypto";

import { appSecret } from "@/lib/access-token";
import { clientIp } from "@/lib/rate-limit";

export type DeniedKind =
  | "owner-mismatch"
  | "bad-password"
  | "bad-signature"
  | "rate-limited"
  | "published-locked";

/** Origem em hash: suficiente para agrupar, inútil para identificar. */
function originHash(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${appSecret()}`)
    .digest("hex")
    .slice(0, 12);
}

export async function logDenied(
  kind: DeniedKind,
  detail: Record<string, string | number> = {},
): Promise<void> {
  const origem = originHash(await clientIp());
  const payload = { ...detail, origem };

  console.warn(`[negado:${kind}]`, payload);

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureMessage(`acesso negado: ${kind}`, {
      level: "warning",
      tags: { security: kind },
      extra: payload,
    });
  } catch {
    // Observabilidade não pode derrubar a rota que ela observa.
  }
}
