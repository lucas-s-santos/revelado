import { NextResponse } from "next/server";

import { getDraft } from "@/lib/drafts";
import { getOrder } from "@/lib/orders";

/**
 * Estado do pedido — usado pelo polling de 3s da tela de Pix (SPEC 8.5).
 *
 * "Polling a cada 3s **e** webhook": o polling é só para a tela reagir rápido.
 * Quem muda o estado é o webhook, sempre — esta rota apenas lê.
 */

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    return NextResponse.json(
      { error: "Pedido não encontrado." },
      { status: 404 },
    );
  }

  const draft = await getDraft(order.siteId);

  return NextResponse.json({
    id: order.id,
    status: order.status,
    amountCents: order.amountCents,
    slug: draft?.slug ?? null,
    published: draft?.status === "PUBLISHED",
  });
}
