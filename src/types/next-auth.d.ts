import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * `session.user` do Auth.js só tem `name`/`email`/`image` por padrão — o
 * callback `session` em `src/auth.ts` grava `id` e `role` a mais, e é este
 * arquivo que ensina o TypeScript que eles existem.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
}
