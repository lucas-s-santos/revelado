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

/**
 * Esta pessoa é dona deste rascunho? — SPEC 9.4.
 *
 * Uma função só, usada por toda tela e toda rota que abre um rascunho: editor,
 * checkout, painel, sucesso, autosave e assinatura de upload. Antes a regra
 * estava copiada em cinco lugares, e todas as cópias tinham a mesma brecha —
 * rascunho **sem** `anonId` era liberado para qualquer um.
 *
 * São dois donos possíveis, e é de propósito (SPEC 1: "a criação acontece sem
 * login, a conta nasce no checkout"):
 *
 *  - **a conta**, quando existe. É o que faz as páginas aparecerem no
 *    computador depois de terem sido montadas no celular;
 *  - **o cookie anônimo**, que é o único dono antes do checkout. Continua
 *    valendo depois, para quem nunca pediu o link de acesso.
 *
 * Sem nenhum dos dois identificável, ninguém entra.
 */
export async function isDraftOwner(draft: {
  anonId: string | null;
  userId: string | null;
}): Promise<boolean> {
  // Sem `userId` no rascunho não há conta para comparar: evita acordar o
  // Auth.js no caminho mais comum, que é o do visitante sem login.
  if (draft.userId) {
    const userId = await loggedUserId();
    if (userId && draft.userId === userId) return true;
  }

  if (!draft.anonId) return false;
  return (await readAnonId()) === draft.anonId;
}

/**
 * O id de quem está logado, buscado por import tardio.
 *
 * Estático, o `@/auth` arrastaria o Auth.js inteiro — e com ele `next/server` —
 * para o grafo de todo módulo que toca `lib/anon`: as rotas, o limitador de
 * requisições e os testes. Sob o vitest isso quebra na resolução, e nas rotas é
 * peso que nem sempre se usa.
 *
 * Rascunho sem `userId` nem precisa perguntar: não há conta para comparar.
 */
async function loggedUserId(): Promise<string | null> {
  try {
    const { currentUserId } = await import("@/auth");
    return await currentUserId();
  } catch {
    // Ambiente sem Auth.js disponível: ninguém logado, o cookie decide.
    return null;
  }
}
