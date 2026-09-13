import { cookies } from "next/headers";

import { isDraftOwner } from "@/lib/anon";
import { getDraft, type Draft } from "@/lib/drafts";
import { unlockCookie, unlockToken } from "@/lib/site-password";

/**
 * Quem pode ver a foto — SPEC 9.4.
 *
 * Existe porque proteger a página e deixar as fotos abertas protege nada: os
 * endereços das imagens estão no HTML da própria página, e uma URL que vaze de
 * bucket público vale para sempre — inclusive depois de a página expirar, ganhar
 * senha ou ser apagada.
 *
 * **A regra é uma só: a foto vale o que a página dela vale.** Página aberta,
 * foto aberta. Página com senha, foto com senha. Rascunho, só o dono. Expirada,
 * ninguém — se o conteúdo saiu do ar, as fotos saíram junto.
 */

export type MediaAccess = "allow" | "deny" | "not-found";

export async function accessForSite(
  siteId: string,
  at = new Date(),
): Promise<MediaAccess> {
  const draft = await getDraft(siteId);
  if (!draft) return "not-found";

  return decideAccess(draft, {
    unlocked: await hasUnlockCookie(draft),
    owner: await isDraftOwner(draft.anonId),
    at,
  });
}

export interface AccessContext {
  /** o visitante já digitou a senha desta página neste navegador */
  unlocked: boolean;
  /** o cookie anônimo é o mesmo que criou o rascunho */
  owner: boolean;
  at: Date;
}

/**
 * A decisão em si, sem tocar em cookie nem em banco — é o que permite testar
 * cada combinação sem levantar um servidor.
 */
export function decideAccess(
  draft: Pick<Draft, "status" | "passwordHash" | "expiresAt">,
  ctx: AccessContext,
): MediaAccess {
  // O dono entra sempre, inclusive na própria página expirada: é dele, e é o
  // que faz o painel e o editor continuarem mostrando as fotos.
  if (ctx.owner) return "allow";

  if (draft.status !== "PUBLISHED") return "deny";

  const expirou =
    draft.expiresAt !== null &&
    new Date(draft.expiresAt).getTime() <= ctx.at.getTime();
  if (expirou) return "deny";

  if (draft.passwordHash) return ctx.unlocked ? "allow" : "deny";

  return "allow";
}

async function hasUnlockCookie(draft: Draft): Promise<boolean> {
  if (!draft.passwordHash) return false;

  const store = await cookies();
  return (
    store.get(unlockCookie(draft.slug))?.value ===
    unlockToken(draft.passwordHash)
  );
}

/**
 * O id do site que uma chave de mídia aponta.
 *
 * A chave é `sites/<siteId>/<mediaId>` (ver `mediaKey` em `lib/r2.ts`). Qualquer
 * outro formato é recusado em vez de adivinhado: quem monta a chave é o cliente.
 */
export function siteIdFromKey(key: string): string | null {
  const parts = key.split("/");
  if (parts.length !== 3) return null;
  if (parts[0] !== "sites") return null;

  const siteId = parts[1];
  const mediaId = parts[2];
  if (!siteId || !mediaId) return null;

  // Sem `.` nem separador: nada que possa virar caminho de disco.
  if (!/^[\w-]+$/.test(siteId) || !/^[\w-]+$/.test(mediaId)) return null;

  return siteId;
}
