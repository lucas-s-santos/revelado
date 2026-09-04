import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/chrome/logo";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Guarda de `/admin` — SPEC 8.9: "protegido por role. Zero enfeite."
 *
 * Fica num Server Component, não em `middleware.ts`: sessão de banco (SPEC 2,
 * `strategy: "database"` em `src/auth.ts`) precisa do Prisma para validar o
 * cookie, e o Prisma Client não roda no runtime de Edge do middleware sem um
 * driver adapter à parte — complexidade que nada aqui pede. Todo layout e
 * toda página sob `/admin` já são Server Component por padrão (CLAUDE.md
 * regra 4), então a checagem aqui já cobre a árvore inteira.
 *
 * Fail-closed: sem sessão ou sem `role: ADMIN`, sai — nunca renderiza filho.
 *
 * A casca visual (barra + navegação por abas) mora aqui porque é a mesma em
 * toda sub-rota — sem isso cada `page.tsx` reescreveria o mesmo cabeçalho.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="admin-shell">
      <header className="admin-shell__bar">
        <Logo size={26} />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn-quiet">
            Sair
          </button>
        </form>
      </header>

      <AdminNav />

      <main className="admin-shell__content">{children}</main>
    </div>
  );
}
