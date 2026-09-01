import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlockRenderer } from "@/components/blocks/block-renderer";
import { DEMO_SLUG } from "@/lib/blocks/fixtures";
import { lacrarCapsulas } from "@/lib/capsule";
import { collectMediaIds, mediaMapFor } from "@/lib/media";
import { getPublishedSite } from "@/lib/sites";

/**
 * A página de exemplo servida sem moldura, para caber dentro do celular da
 * landing.
 *
 * Existe por um motivo só, e é de segurança: esta rota **não passa pelo
 * Portal** — entrega o conteúdo direto. Isso é aceitável para a página de
 * demonstração, que é pública por definição e não tem nada de ninguém dentro.
 * Não é aceitável para nenhuma outra. Por isso a rota atende exclusivamente o
 * `DEMO_SLUG` e devolve 404 para qualquer outro: se ela aceitasse slug
 * arbitrário, seria um jeito de pular o envelope (e, na Fase 6, a senha) de
 * qualquer página publicada — um bypass de controle de acesso escondido atrás
 * de uma rota de conveniência.
 *
 * O conteúdo continua passando por `lacrarCapsulas`: a regra de que texto
 * lacrado não sai do servidor não abre exceção para demonstração.
 *
 * O mesmo `BlockRenderer` de sempre (CLAUDE.md, regra 2). Não há terceira
 * versão da página aqui — há a mesma página, sem o envelope na frente.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== DEMO_SLUG) notFound();

  const site = await getPublishedSite(slug);
  if (!site) notFound();

  const agora = Date.now();

  return (
    <main
      className="published"
      data-skin={site.content.theme.skin}
      data-palette={site.content.theme.palette}
      data-effect={site.content.theme.effect}
    >
      <BlockRenderer
        content={lacrarCapsulas(site.content, agora)}
        mode="published"
        now={agora}
        media={mediaMapFor(site.id, collectMediaIds(site.content))}
      />
    </main>
  );
}
