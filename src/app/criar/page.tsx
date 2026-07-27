import type { Metadata } from "next";

import { Logo } from "@/components/chrome/logo";
import { OccasionPicker } from "@/components/editor/occasion-picker";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: "Escolha a ocasião",
  description: "Oito ocasiões, cada uma com o clima certo. Sem cadastro.",
};

/**
 * `/criar` — SPEC 8.2.
 *
 * "Grid de 8 cards. Clique: cria um `Site` em DRAFT com `anonId` de cookie."
 * O aceite pede o rascunho criado **no servidor antes da navegação**, e é o que
 * o `OccasionPicker` faz: espera o POST responder para então navegar.
 */
export default function CreatePage() {
  return (
    <main className="create-page">
      <header className="create-page__head">
        <Logo />
        <p className="eyebrow mt-8">passo 1 de 3</p>
        <h1 className="create-page__title">
          O que você quer <span className="display-italic">celebrar</span>?
        </h1>
        <p className="create-page__lede">
          Cada ocasião já vem com cores, blocos e textos sugeridos. Dá para
          mudar tudo depois. {copy.hero.noLogin}
        </p>
      </header>

      <OccasionPicker />
    </main>
  );
}
