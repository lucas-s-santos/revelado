import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BlockRenderer } from "@/components/blocks/block-renderer";
import { ViewBeacon } from "@/components/published/view-beacon";
import { collectMediaIds, mediaMapFor } from "@/lib/media";
import { unlockCookie, unlockToken } from "@/lib/site-password";
import { getPublishedSite, isExpired, sitePasswordHash } from "@/lib/sites";

/**
 * A página publicada — SPEC 8.8. **A tela mais importante do sistema**: é o
 * produto entregue.
 *
 * Server Component, estática com ISR e revalidação por tag ao editar (ver
 * `lib/cache.ts`). Uma página viralizada não pode custar nem cair.
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

  // Página com senha não conta o que tem dentro na prévia do link (SPEC 9.4):
  // adiantar os nomes no card do WhatsApp desfaria a senha pela metade.
  if (site.hasPassword) {
    return {
      title: "Uma página privada",
      description: "Peça a senha para quem te enviou o link.",
      robots: { index: false, follow: false },
    };
  }

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

  // SPEC 8.8: com senha, ninguém vê o conteúdo antes de destravar.
  //
  // `cookies()` só é lido quando a página **tem** senha, e é essa condição que
  // preserva o ISR: ler cookie marca o render como dinâmico, então uma página
  // protegida sai do cache de rota (que é o correto — a resposta depende de quem
  // pede) enquanto todas as outras continuam estáticas e baratas.
  if (site.hasPassword) {
    const stored = await sitePasswordHash(slug);
    const store = await cookies();

    if (
      !stored ||
      store.get(unlockCookie(slug))?.value !== unlockToken(stored)
    ) {
      redirect(`/p/${slug}/senha`);
    }
  }

  const expired = isExpired(site);

  return (
    <main
      className="published"
      data-skin={site.content.theme.skin}
      data-palette={site.content.theme.palette}
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
        <>
          <BlockRenderer
            content={site.content}
            mode="published"
            now={Date.now()}
            media={mediaMapFor(site.id, collectMediaIds(site.content))}
          />
          {/* O exemplo é conteúdo de marketing: não entra na conta de ninguém. */}
          {site.isDemo ? null : <ViewBeacon siteId={site.id} />}
        </>
      )}
    </main>
  );
}
