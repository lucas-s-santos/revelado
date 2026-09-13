import type { Metadata } from "next";

import { Logo } from "@/components/chrome/logo";
import { StartButton } from "@/components/marketing/start-button";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: "Começar minha página",
  description: "Sua página de casal, pronta em oito minutos. Sem cadastro.",
  // Página de passagem: não tem o que indexar, e link solto no Google só
  // criaria rascunho órfão.
  robots: { index: false, follow: false },
};

/**
 * `/criar` — SPEC 8.2, agora sem o grid de ocasiões.
 *
 * O produto é um só, então não há nada a escolher antes de começar. O que
 * sobrou é o botão: um clique e a pessoa está no editor, com o rascunho já
 * criado no servidor (que é o aceite da tela).
 *
 * A URL continua existindo porque está impressa em material e em links antigos.
 */
export default function CreatePage() {
  return (
    <main className="create-page">
      <header className="create-page__head">
        <Logo />
        <h1 className="create-page__title">
          Vamos <span className="display-italic">revelar</span> a página de
          vocês
        </h1>
        <p className="create-page__lede">{copy.create.lede}</p>

        <div className="create-page__action">
          <StartButton label={copy.create.cta} />
        </div>

        <p className="hero__note">{copy.hero.noLogin}</p>
      </header>
    </main>
  );
}
