import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { verifyPassword, unlockCookie, unlockToken } from "@/lib/site-password";
import { getPublishedSite, sitePasswordHash } from "@/lib/sites";

export const metadata: Metadata = {
  title: "Esta página tem senha",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/**
 * `/p/[slug]/senha` — SPEC 8.8.
 *
 * Server Action em vez de rota de API: o formulário funciona **sem JavaScript**,
 * que é o que a SPEC 8.8 pede da página publicada ("funciona com JS desabilitado
 * até o primeiro paint").
 *
 * Sem contador de tentativas por enquanto — o slug já tem sufixo aleatório
 * (SPEC 9.4), então não há lista de páginas para varrer. Está anotado no README
 * como pendência se a senha virar barreira séria.
 */
export default async function PasswordPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { slug } = await params;
  const { erro } = await searchParams;

  const site = await getPublishedSite(slug);
  if (!site) notFound();

  // Página sem senha não tem por que mostrar esta tela.
  if (!site.hasPassword) redirect(`/p/${slug}`);

  async function unlock(formData: FormData) {
    "use server";

    const password = String(formData.get("senha") ?? "");
    const target = await getPublishedSite(slug);
    if (!target?.hasPassword) redirect(`/p/${slug}`);

    const stored = await sitePasswordHash(slug);
    if (!stored || !(await verifyPassword(password, stored))) {
      redirect(`/p/${slug}/senha?erro=1`);
    }

    const store = await cookies();
    store.set(unlockCookie(slug), unlockToken(stored), {
      path: `/p/${slug}`,
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    redirect(`/p/${slug}`);
  }

  return (
    <main className="gate" data-occasion={site.occasionId}>
      <form action={unlock} className="gate__card glass">
        <p className="eyebrow">esta página é privada</p>
        <h1 className="gate__title">Tem uma senha aqui</h1>
        <p className="gate__lede">
          Quem te mandou o link também mandou a senha. Digite ela para abrir.
        </p>

        <label htmlFor="senha" className="sr-only">
          Senha da página
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          autoFocus
          autoComplete="off"
          className="input"
          placeholder="senha"
        />

        {erro ? (
          <p role="alert" className="field__error">
            Essa senha não abriu. Confira com quem te enviou o link.
          </p>
        ) : null}

        <button type="submit" className="btn-primary w-full justify-center">
          Abrir a página
        </button>
      </form>
    </main>
  );
}
