import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { db } from "@/lib/db";

/**
 * Auth.js — SPEC 2: magic link por e-mail, **sem senha**.
 *
 * Três decisões que a SPEC dita e que estão codificadas aqui:
 *
 *  1. **login nunca vem antes do editor** (regra inviolável 8). Nada nesta
 *     configuração protege rota nenhuma: não há middleware, não há `authorized`
 *     redirecionando. A sessão é informação a mais que algumas telas usam para
 *     mostrar as páginas de outros aparelhos — nunca uma tranca na entrada;
 *
 *  2. **a conta nasce no checkout** (SPEC 1). `createOrder` já faz `upsert` do
 *     `User` pelo e-mail, então quando a pessoa pedir o link de acesso a conta
 *     dela costuma já existir, com as páginas ligadas. Entrar é reencontrar o
 *     que já é seu, não criar cadastro;
 *
 *  3. **sessão em banco, não JWT.** O SPEC 9.4 fala em direito de exclusão e em
 *     tirar acesso; com sessão em tabela isso é apagar uma linha, com JWT seria
 *     esperar o token vencer.
 *
 * Sem `DATABASE_URL` ou sem `AUTH_SECRET` o login fica **desligado** e o resto
 * do app continua inteiro no cookie anônimo — é o que mantém o projeto rodável
 * sem nenhuma credencial, como o resto do sistema (ver `lib/drafts.ts`).
 */

export const AUTH_ENABLED = Boolean(
  process.env.DATABASE_URL && process.env.AUTH_SECRET,
);

const providers = process.env.RESEND_API_KEY
  ? [
      Resend({
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM ?? "Revelado <ola@revelado.com.br>",
      }),
    ]
  : [];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  session: { strategy: "database" },
  pages: {
    signIn: "/entrar",
    verifyRequest: "/entrar/confira",
    error: "/entrar",
  },
  callbacks: {
    /** O id do usuário precisa chegar na sessão: é a chave de tudo. */
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  trustHost: true,
});

/**
 * O id de quem está logado, ou `null`.
 *
 * Envolve `auth()` porque ele explode quando não há banco ou segredo — e o
 * projeto inteiro roda sem os dois. Aqui a resposta certa é "ninguém logado",
 * não uma exceção: a tela que chamou continua funcionando pelo cookie anônimo.
 */
export async function currentUserId(): Promise<string | null> {
  if (!AUTH_ENABLED) return null;

  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
