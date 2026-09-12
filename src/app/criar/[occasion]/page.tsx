import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/chrome/logo";
import {
  TemplatePicker,
  type TemplateOption,
} from "@/components/editor/template-picker";
import { OCCASION_IDS, OCCASIONS, type OccasionId } from "@/lib/occasions";
import { contentForTemplate, templatesFor } from "@/lib/templates";

type Params = Promise<{ occasion: string }>;

export function generateStaticParams() {
  return OCCASION_IDS.map((occasion) => ({ occasion }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { occasion } = await params;
  const found = OCCASIONS.find((item) => item.id === occasion);

  if (!found) return { title: "Ocasião não encontrada" };

  return {
    title: `Escolha o estilo — ${found.name}`,
    description: found.seo.description,
  };
}

/**
 * `/criar/[occasion]` — SPEC 8.3.
 *
 * Estática: os templates e os blocos padrão de cada ocasião vêm do código
 * (`lib/templates.ts`, `lib/blocks/defaults.ts`), então as oito páginas saem
 * prontas no build. É a segunda tela do funil, com o visitante ainda decidindo
 * se fica — não pode custar um render de servidor.
 *
 * **Divergência anotada da SPEC 8.2.** Lá o rascunho nasce ao clicar na ocasião.
 * Aqui ele nasce ao clicar no template, uma tela depois. O motivo é concreto:
 * criar no primeiro clique deixa uma linha de banco para cada visitante que
 * chega nesta tela e desiste, e esta é exatamente a tela onde se desiste. A
 * intenção da SPEC — não perder a escolha da pessoa — continua valendo, porque a
 * ocasião está na URL e o refresh a mantém.
 */
export default async function TemplatePage({ params }: { params: Params }) {
  const { occasion } = await params;

  if (!(OCCASION_IDS as readonly string[]).includes(occasion)) notFound();
  const occasionId = occasion as OccasionId;

  const found = OCCASIONS.find((item) => item.id === occasionId);
  if (!found) notFound();

  // Fixo, e não `Date.now()`: a página é estática, e um "agora" de build faria
  // o contador do preview divergir na hidratação.
  const now = Date.parse("2026-01-01T12:00:00.000Z");

  const templates: TemplateOption[] = templatesFor(occasionId).map(
    (template) => ({
      id: template.id,
      slug: template.slug,
      name: template.name,
      description: template.description,
      planRequired: template.planRequired,
      preview: contentForTemplate(occasionId, template.slug),
    }),
  );

  return (
    <main className="create-page" data-occasion={occasionId}>
      <header className="create-page__head">
        <Logo />
        <p className="eyebrow mt-8">passo 2 de 3</p>
        <h1 className="create-page__title">
          Que <span className="display-italic">clima</span> você quer?
        </h1>
        <p className="create-page__lede">
          Todos têm as mesmas fotos, o mesmo contador e a mesma mensagem — muda
          a letra e o que acontece no fundo. Dá para trocar depois, sem perder
          nada do que você escrever.
        </p>

        <Link href="/criar" className="btn-quiet mt-4 self-start">
          ← Trocar de ocasião
        </Link>
      </header>

      <TemplatePicker occasion={occasionId} templates={templates} now={now} />
    </main>
  );
}
