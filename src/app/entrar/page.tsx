import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/chrome/logo";
import { AUTH_ENABLED, currentUserId, signIn } from "@/auth";
import { allow } from "@/lib/rate-limit";
import { logDenied } from "@/lib/security-log";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * `/entrar` — SPEC 2: magic link, **sem senha**.
 *
 * Esta tela não é um portão. A regra inviolável 8 diz que login nunca vem antes
 * do editor, e nada no sistema redireciona para cá: quem chega, chega porque
 * quis, do painel, para reencontrar num aparelho o que montou em outro.
 *
 * Por isso a linguagem não é de cadastro. Quem paga já tem conta — ela nasce no
 * checkout (SPEC 1) — então o que acontece aqui é **reconhecer**, não criar.
 *
 * Server Action e não rota de API: o formulário funciona sem JavaScript.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  // Já está logado: não há o que fazer aqui.
  if (await currentUserId()) redirect("/painel");

  async function enviarLink(formData: FormData) {
    "use server";

    // Mandar e-mail é caro e é gatilho de abuso: o teto do endereço alheio é o
    // que impede alguém usar o Revelado para encher a caixa de outra pessoa.
    if (!(await allow("checkout"))) {
      await logDenied("rate-limited", { rota: "entrar" });
      redirect("/entrar?erro=espera");
    }

    const email = String(formData.get("email") ?? "").trim();
    if (!email) redirect("/entrar?erro=email");

    await signIn("resend", { email, redirectTo: "/painel" });
  }

  return (
    <main className="gate">
      <div className="gate__card glass">
        <Logo />

        <p className="eyebrow mt-6">sem senha</p>
        <h1 className="gate__title">Entrar no Revelado</h1>

        {AUTH_ENABLED ? (
          <>
            <p className="gate__lede">
              Digite o e-mail que você usou na compra. Mandamos um link — abrir
              o link já é entrar.
            </p>

            <form action={enviarLink} className="detail__form mt-2">
              <label htmlFor="email" className="field__label">
                Seu e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="voce@email.com"
                className="input"
                aria-describedby={erro ? "erro-entrar" : undefined}
              />

              {erro ? (
                <p id="erro-entrar" role="alert" className="field__error">
                  {erro === "espera"
                    ? "Muitos pedidos seguidos. Espere um minuto e tente de novo."
                    : "Confira o e-mail — parece que falta alguma coisa nele."}
                </p>
              ) : null}

              <button
                type="submit"
                className="btn-primary mt-2 w-full justify-center"
              >
                Mandar meu link
              </button>
            </form>

            <p className="gate__lede mt-4 text-sm">
              Nunca criamos senha. O e-mail é a chave, e ele já é seu.
            </p>
          </>
        ) : (
          // Sem banco ou sem segredo configurado o login não existe — e dizer
          // isso é melhor que mostrar um formulário que não vai funcionar.
          <>
            <p className="gate__lede">
              O login ainda não está ligado neste ambiente. Suas páginas
              continuam salvas e acessíveis neste navegador.
            </p>
            <Link href="/painel" className="btn-primary mt-4">
              Ver minhas páginas
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
