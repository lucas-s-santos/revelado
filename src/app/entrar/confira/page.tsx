import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/chrome/logo";

export const metadata: Metadata = {
  title: "Confira seu e-mail",
  robots: { index: false, follow: false },
};

/**
 * `/entrar/confira` — a tela depois de pedir o link (SPEC 2).
 *
 * Estática: não depende de nada de quem pediu, e mostrar o e-mail digitado aqui
 * seria entregar, para quem estiver olhando a tela, um endereço que a pessoa
 * acabou de escrever.
 *
 * Voz da interface (SPEC 11): diz o que aconteceu e o que fazer agora, sem pedir
 * desculpa e sem ser vaga sobre o prazo.
 */
export default function CheckEmailPage() {
  return (
    <main className="gate">
      <div className="gate__card glass">
        <Logo />

        <p className="eyebrow mt-6">link enviado</p>
        <h1 className="gate__title">Confira seu e-mail</h1>

        <p className="gate__lede">
          Mandamos um link de acesso agora. Abrir o link já entra — não tem
          senha para criar nem código para digitar.
        </p>

        <p className="gate__lede text-sm">
          O link vale por 24 horas e só funciona uma vez. Se não chegou em
          alguns minutos, confira o spam ou peça outro.
        </p>

        <div className="detail__form-row mt-2">
          <Link href="/entrar" className="btn-quiet">
            Pedir outro link
          </Link>
          <Link href="/criar" className="btn-quiet">
            Criar uma página
          </Link>
        </div>
      </div>
    </main>
  );
}
