import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { readAnonId } from "@/lib/anon";
import { validateForPublish } from "@/lib/blocks/schema";
import { getDraft } from "@/lib/drafts";
import { listActivePlans } from "@/lib/plans-db";

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
  if (draft.anonId && draft.anonId !== (await readAnonId())) notFound();

  // Já publicada: a pessoa voltou no histórico. Manda para o lugar certo.
  if (draft.status === "PUBLISHED") redirect(`/p/${draft.slug}`);

  const issues = validateForPublish(draft.content);
  const hero = draft.content.blocks.find((block) => block.type === "hero");
  const plans = await listActivePlans();

  return (
    <CheckoutForm
      draftId={draft.id}
      slug={draft.slug}
      plans={plans}
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
    />
  );
}
