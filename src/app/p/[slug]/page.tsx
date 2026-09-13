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
 * Server Component. Os dados vêm do cache por tag (`lib/sites.ts`), invalidado
 * ao publicar, trocar senha, mudar indexação ou excluir — uma página viralizada
 * não faz uma consulta de banco por visita.
 *
 * **Por que a rota é dinâmica e não mais ISR.** O e2e do funil pegou: com
 * `export const revalidate` e `generateStaticParams`, o Next trata esta rota
 * como geração estática, e ler cookie ali não "cai para dinâmico" — estoura
 * `DYNAMIC_SERVER_USAGE`. Na prática, **toda página com senha devolvia 500 em
 * produção**, em vez do portão. O comentário antigo dizia o contrário e estava
 * errado.
 *
 * O custo medido de renderizar por requisição é ~15ms contra ~4ms do estático:
 * irrelevante para o orçamento de LCP (SPEC 10), que é dominado pela rede em
 * 4G. O que se perde é o cache de CDN na frente — com pico sazonal de 50x, isso
 * vira invocação de função por visita. Está anotado no README: a forma de ter
 * os dois é o portão morar só em `/senha`, deixando esta rota sem cookie
 * nenhum, ao preço de a pessoa destravada ficar naquela URL.
 */
export const dynamicParams = true;

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

  // SPEC 8.8: com senha, ninguém vê o conteúdo antes de destravar. O cookie só
  // é lido quando existe senha — nas outras páginas nada disso roda.
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
    <main className="published" data-occasion={site.content.theme.palette}>
      {expired ? (
        // SPEC 8.8: expirada mostra CTA de renovação, nunca 404.
        <section className="published__expired">
          <h1>Esta página expirou</h1>
          <p>
            O prazo dela terminou, mas nada foi perdido: dá para colocar de
            volta no ar em um clique.
          </p>
          {/* Aponta para esta página no painel, e não para a lista: quem abre
              um link expirado quer renovar **esta**, e o dono pode estar em
              outro aparelho, onde a lista viria vazia. */}
          <Link href={`/painel/${site.id}`} className="btn-primary">
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
