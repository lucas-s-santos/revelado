import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/blocks/block-renderer";
import { mediaResolver } from "@/lib/media";
import { getPublishedSite, isExpired } from "@/lib/sites";

/**
 * A página publicada — SPEC 8.8. **A tela mais importante do sistema**: é o
 * produto entregue.
 *
 * Server Component, estática com ISR. Uma página viralizada não pode custar nem
 * cair. A revalidação por tag ao editar entra na Fase 6.
 *
 * O que ainda é da Fase 6 e está anotado como pendência no README: senha,
 * página própria de expirada, contagem de visita agregada e `opengraph-image`.
 */
export const revalidate = 3600;
export const dynamicParams = true;

// Nada de pré-render no build: os slugs nascem quando as pessoas publicam.
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublishedSite(slug);

  if (!site) return { title: "Página não encontrada" };

  const hero = site.content.blocks.find((block) => block.type === "hero");
  const title =
    hero?.type === "hero" ? hero.props.title : "Uma página para você";
  const description =
    hero?.type === "hero" && hero.props.subtitle
      ? hero.props.subtitle
      : "Feito com Revelado.";

  return {
    title,
    description,
    // SPEC 8.8 / 9.4 — noindex por padrão, configurável pela pessoa.
    robots: site.indexable ? undefined : { index: false, follow: false },
    openGraph: { title, description, type: "website" },
  };
}

export default async function PublishedPage({ params }: { params: Params }) {
  const { slug } = await params;
  const site = await getPublishedSite(slug);

  if (!site) notFound();

  const expired = isExpired(site);

  return (
    <main
      className="published"
      data-occasion={site.content.theme.palette}
      data-effect={site.content.theme.effect}
    >
      {expired ? (
        // SPEC 8.8: expirada mostra CTA de renovação, nunca 404.
        <section className="published__expired">
          <h1>Esta página expirou</h1>
          <p>
            O prazo dela terminou, mas nada foi perdido: dá para colocar de
            volta no ar em um clique.
          </p>
          <Link href="/painel" className="btn-primary">
            Renovar minha página
          </Link>
        </section>
      ) : (
        <BlockRenderer
          content={site.content}
          mode="published"
          now={Date.now()}
          mediaSrc={mediaResolver(site.id)}
        />
      )}
    </main>
  );
}
