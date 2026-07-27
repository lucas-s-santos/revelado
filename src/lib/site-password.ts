import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Senha opcional da página publicada — SPEC 8.8 e 9.4.
 *
 * `scrypt` do próprio Node, sem dependência nova: é lento de propósito, que é
 * exatamente o que se quer contra força bruta. O salt vai junto no hash.
 *
 * O cookie de destravamento é derivado do hash, não é o hash: quem interceptar
 * o cookie não leva a senha embora.
 */

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(hash, "hex");

  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}

/** Nome do cookie que marca a página como destravada neste navegador. */
export const unlockCookie = (slug: string) => `revelado_unlock_${slug}`;

/**
 * Valor do cookie: derivado do hash guardado. Trocar a senha invalida todos os
 * cookies antigos automaticamente, sem precisar de lista de revogação.
 */
export function unlockToken(passwordHash: string): string {
  return createHash("sha256")
    .update(`${passwordHash}:${process.env.AUTH_SECRET ?? "revelado"}`)
    .digest("hex")
    .slice(0, 32);
}
