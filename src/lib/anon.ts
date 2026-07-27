import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Identidade anônima do rascunho — SPEC 1 e 8.2.
 *
 * "A criação acontece **sem login**. A conta nasce no checkout." Até lá, o
 * rascunho pertence a um cookie. É o que permite fechar a aba, voltar e
 * encontrar tudo (SPEC 8.4).
 *
 * LGPD (SPEC 9.4): é um identificador opaco, sem nada pessoal dentro.
 */

export const ANON_COOKIE = "revelado_anon";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Lê o id anônimo, sem criar. Use em Server Component (não pode escrever). */
export async function readAnonId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ANON_COOKIE)?.value ?? null;
}

/**
 * Lê ou cria o id anônimo. Só funciona onde dá para escrever cookie:
 * Route Handler ou Server Action.
 */
export async function ensureAnonId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(ANON_COOKIE)?.value;
  if (existing) return existing;

  const anonId = randomUUID();
  store.set(ANON_COOKIE, anonId, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  return anonId;
}
