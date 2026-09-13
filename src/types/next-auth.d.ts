import type { DefaultSession } from "next-auth";

/**
 * O `id` do usuário na sessão.
 *
 * O Auth.js não o inclui por padrão com sessão em banco; o callback `session`
 * em `src/auth.ts` coloca, e esta declaração é o que faz o TypeScript saber
 * disso em toda tela que lê a sessão.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
