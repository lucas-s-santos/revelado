import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";
import type { Role } from "@prisma/client";

/**
 * Login — Auth.js, magic link, sem senha (SPEC 2).
 *
 * Existe por um motivo só hoje: proteger `/admin` por `role` (SPEC 8.9,
 * anti-padrão 7 não se aplica aqui — o editor continua sem login nenhum). Não
 * troca o "conta nasce no checkout" de `lib/orders.ts`; as duas coisas
 * convivem, uma pelo e-mail (`User.email` é a chave em comum).
 *
 * `PrismaAdapter` exige sessão de banco (`Session`/`VerificationToken` no
 * schema) — daí `strategy: "database"`, e não JWT.
 *
 * O template do e-mail não é o do provider: `sendVerificationRequest` chama
 * `sendMagicLinkEmail` de `lib/email.ts`, o mesmo módulo que já manda os
 * outros três transacionais — mesmo layout, mesmo fallback de log em dev sem
 * `RESEND_API_KEY`. Sem isso, login não seria testável sem conta no Resend.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? "sem-chave-usa-fallback-de-log",
      from: process.env.EMAIL_FROM ?? "Revelado <ola@revelado.com.br>",
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLinkEmail({ to: identifier, url });
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      // `AdapterUser` do pacote só tipa os campos padrão do Auth.js; `role` é
      // nosso, do `User` do Prisma — o adapter devolve a linha inteira, o tipo
      // é que não sabe. Sem augmentar `@auth/core/adapters` (módulo
      // transitivo, fora do alcance confiável de `declare module` aqui).
      session.user.id = user.id;
      session.user.role = (user as unknown as { role: Role }).role;
      return session;
    },
  },
});
