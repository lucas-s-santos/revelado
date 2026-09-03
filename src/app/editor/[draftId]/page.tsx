import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditorShell } from "@/components/editor/editor-shell";
import { readAnonId } from "@/lib/anon";
import { getDraft } from "@/lib/drafts";
import { listActivePlans } from "@/lib/plans-db";
import { listActiveTemplates } from "@/lib/templates-db";

export const metadata: Metadata = {
  title: "Montando sua página",
  robots: { index: false, follow: false },
};

// O rascunho muda a cada tecla: nada de cache.
export const dynamic = "force-dynamic";

type Params = Promise<{ draftId: string }>;

/**
 * `/editor/[draftId]` — SPEC 8.4, o coração do produto.
 *
 * Server Component: carrega o rascunho do servidor e entrega pronto ao shell.
 * É isso que faz a recuperação funcionar — fechar a aba e voltar traz tudo de
 * volta porque a fonte de verdade nunca foi o cliente (anti-padrão 10).
 */
export default async function EditorPage({ params }: { params: Params }) {
  const { draftId } = await params;
  const draft = await getDraft(draftId);

  if (!draft) notFound();

  // Rascunho é privado: só o cookie que criou abre (SPEC 9.4).
  if (draft.anonId && draft.anonId !== (await readAnonId())) notFound();

  const [templates, plans] = await Promise.all([
    listActiveTemplates(),
    listActivePlans(),
  ]);

  return (
    <EditorShell
      draftId={draft.id}
      slug={draft.slug}
      content={draft.content}
      published={draft.status === "PUBLISHED"}
      templates={templates}
      plans={plans}
    />
  );
}
