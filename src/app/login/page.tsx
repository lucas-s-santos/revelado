import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Logo } from "@/components/chrome/logo";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * `/login` — porta única de entrada por trás de `/admin` (SPEC 8.9: "protegido
 * por role"). Magic link, sem senha — SPEC 2.
 *
 * Não é a tela do editor: `/criar` e `/editor/[draftId]` nunca passam por
 * aqui (CLAUDE.md regra 8). Quem chega em `/login` foi mandado por
 * `admin/layout.tsx`, sempre com `?callbackUrl=`.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const destination = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/admin";

  const session = await auth();
  if (session?.user) redirect(destination);

  return (
    <main className="panel">
      <header className="panel__bar">
        <Logo />
      </header>

      <h1 className="panel__title">Entrar</h1>

      <LoginForm callbackUrl={destination} />
    </main>
  );
}
