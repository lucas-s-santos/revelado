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

/**
 * O dono do rascunho pode mexer nele? Uma regra só, para três rotas.
 *
 * **É fail-closed, e isso conserta um padrão perigoso.** As checagens estavam
 * espalhadas como `if (draft.anonId && draft.anonId !== eu)` (checkout, upload)
 * e `if (!draftAnonId) return true` (autosave) — todas *liberavam* quando o
 * rascunho não tinha dono. A intenção era "rascunho já migrado para uma conta",
 * mas a camada de contas não existe ainda: hoje, um rascunho sem `anonId` é um
 * rascunho que ninguém consegue provar que é seu, e o certo é negar, não abrir.
 * É a mesma classe do fail-open do pagamento — uma trava que se desliga quando
 * o campo está vazio.
 *
 * Rascunho com dono: só o cookie igual passa. Sem dono: negado até existir
 * login que prove a posse pela conta. Nenhum rascunho do fluxo real nasce sem
 * `anonId` (`ensureAnonId` garante), então isto não fecha porta de ninguém
 * legítimo — fecha a porta que estava aberta.
 */
export async function podeMexerNoRascunho(
  draftAnonId: string | null,
): Promise<boolean> {
  if (!draftAnonId) return false;
  return (await readAnonId()) === draftAnonId;
}

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
