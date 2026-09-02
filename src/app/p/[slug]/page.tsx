import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/blocks/block-renderer";
import { lacrarCapsulas } from "@/lib/capsule";
import { Portal } from "@/components/blocks/portal";
import type { SiteContent } from "@/lib/blocks/schema";
import { collectMediaIds, mediaMapFor } from "@/lib/media";
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

/**
 * O nome que vai escrito no envelope.
 *
 * Sai do título do hero, que é onde a pessoa escreveu para quem é a página —
 * "Marina e Téo", "Para você". Mas o campo é texto livre, e nem todo mundo
 * escreve um nome ali: tem quem escreva uma frase inteira. Um envelope com um
 * parágrafo na frente fica pior do que um envelope liso, então há um teto de
 * tamanho; passando dele, devolve `undefined` e o envelope fica sem nada, como
 * era antes.
 */
function nomeNoEnvelope(content: SiteContent): string | undefined {
  const hero = content.blocks.find((block) => block.type === "hero");
  if (hero?.type !== "hero") return undefined;

  const titulo = hero.props.title.trim();
  if (titulo.length === 0 || titulo.length > 28) return undefined;

  return titulo;
}

export default async function PublishedPage({ params }: { params: Params }) {
  const { slug } = await params;
  const site = await getPublishedSite(slug);

  if (!site) notFound();

  // ⚠️ FASE 6 — APLICAÇÃO DA SENHA ENTRA AQUI, E NÃO PODE SER ESQUECIDA.
  //
  // A tela `/p/[slug]/senha`, o `site-password.ts` e o cookie de unlock já
  // estão prontos. O que falta é esta página REDIRECIONAR para `/senha` quando
  // `site.hasPassword` e o cookie de unlock não bate. Hoje ela não faz isso —
  // e é seguro, porque `passwordHash` é sempre null: não há nenhum lugar no
  // código que DEFINA uma senha (o editor não tem o campo). `hasPassword` é
  // sempre false, então não há página protegida para vazar.
  //
  // A armadilha: no dia em que "definir senha" for implementada, ligar SÓ o
  // campo de definir, sem esta aplicação, deixa a senha decorativa — qualquer
  // um abre `/p/[slug]` direto e ignora a tela. As duas metades TÊM que chegar
  // juntas. `hasPassword` só pode virar `true` no mesmo PR que fizer:
  //
  //   if (site.hasPassword) {
  //     const cookie = (await cookies()).get(unlockCookie(slug))?.value;
  //     const stored = await storedHashFor(slug);
  //     if (stored && unlockToken(stored) !== cookie) redirect(`/p/${slug}/senha`);
  //   }
  //
  // E há um custo a resolver junto: `cookies()` torna esta página DINÂMICA e
  // mata o ISR de 1h (SPEC 8.8). Ou a leitura fica atrás de um middleware que
  // só age nas páginas com senha, ou as páginas protegidas aceitam ser
  // dinâmicas enquanto as abertas seguem estáticas. É decisão da Fase 6, não
  // um patch — por isso está marcado e não meio-implementado.
  const expired = isExpired(site);
  // Uma leitura só do relógio: o mesmo instante decide o lacre e alimenta os
  // contadores, senão HTML e hidratação divergem por milissegundos.
  const agora = Date.now();

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
        <Portal para={nomeNoEnvelope(site.content)}>
          <BlockRenderer
            content={lacrarCapsulas(site.content, agora)}
            mode="published"
            now={agora}
            media={mediaMapFor(site.id, collectMediaIds(site.content))}
          />
        </Portal>
      )}
    </main>
  );
}
