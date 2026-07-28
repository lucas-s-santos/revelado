import { NextResponse } from "next/server";

import { getDraft } from "@/lib/drafts";
import { recordView } from "@/lib/views";

/**
 * `/api/sites/[id]/view` — SPEC 9.1: "incremento agregado de visita".
 *
 * Chamada pelo `ViewBeacon` da página publicada. Responde 204 sempre que puder:
 * quem chama é um `sendBeacon`, que descarta o corpo da resposta de qualquer
 * jeito, e a página de quem recebeu o presente não pode esperar por isto.
 *
 * A rota é aberta por natureza — a página publicada é aberta por gente sem
 * conta. O que protege o número não é autenticação, é o formato do dado: só
 * incrementa contador de página **publicada**, guarda agregado por dia e nunca
 * log cru (SPEC 7.1 e 9.4). Inflar a contagem é o pior que alguém consegue
 * fazer aqui, e o dado é do dono da página, não faturamento.
 */

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const { id } = await params;

  const draft = await getDraft(id);

  // Rascunho ou página apagada não conta visita. Silêncio em vez de 404: o
  // beacon não tem o que fazer com o erro.
  if (!draft || draft.status !== "PUBLISHED") {
    return new NextResponse(null, { status: 204 });
  }

  try {
    await recordView(draft.id, draft.slug);
  } catch (error) {
    // A contagem é bônus; derrubar a rota não devolve a visita perdida.
    console.error(`[view:${draft.slug}] não deu para registrar`, error);
  }

  return new NextResponse(null, { status: 204 });
}
