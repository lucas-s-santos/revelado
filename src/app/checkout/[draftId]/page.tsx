import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { isDraftOwner } from "@/lib/anon";
import { validateForPublish } from "@/lib/blocks/schema";
import { getDraft } from "@/lib/drafts";

export const metadata: Metadata = {
  title: "Publicar sua página",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = Promise<{ draftId: string }>;

/**
 * `/checkout/[draftId]` — SPEC 8.5.
 *
 * Server Component: carrega o rascunho, confere o dono e valida se a página
 * está publicável **antes** de mostrar preço. Cobrar por uma página que sairia
 * vazia é o pior jeito de começar uma relação com o cliente.
 */
export default async function CheckoutPage({ params }: { params: Params }) {
  const { draftId } = await params;
  const draft = await getDraft(draftId);

  if (!draft) notFound();
  if (!(await isDraftOwner(draft))) notFound();

  // Já publicada: isto é renovação, não engano de histórico. Antes a tela
  // devolvia a pessoa para a página dela — e como o painel e o e-mail de
  // expiração mandavam para cá, renovar era literalmente impossível.
  const renewal = draft.status === "PUBLISHED";

  const issues = validateForPublish(draft.content);
  const hero = draft.content.blocks.find((block) => block.type === "hero");

  return (
    <CheckoutForm
      draftId={draft.id}
      slug={draft.slug}
      palette={draft.content.theme.palette}
      title={hero?.type === "hero" ? hero.props.title : "Sua página"}
      subtitle={hero?.type === "hero" ? (hero.props.subtitle ?? null) : null}
      photoCount={draft.content.blocks.reduce(
        (total, block) =>
          block.type === "gallery"
            ? total + block.props.mediaIds.length
            : total,
        0,
      )}
      issues={issues}
      renewal={renewal}
      expiresAt={draft.expiresAt?.toISOString() ?? null}
    />
  );
}
