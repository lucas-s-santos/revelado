import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/chrome/logo";
import { SuccessActions } from "@/components/checkout/success-actions";
import { getDraft } from "@/lib/drafts";
import { getOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Sua página está no ar",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = Promise<{ orderId: string }>;

/**
 * `/sucesso/[orderId]` — SPEC 8.6.
 *
 * "Link · copiar · QR em PNG/SVG · PDF do cartão A6 · compartilhar (WhatsApp
 * primeiro) · upsell do cartão impresso. E-mail já enviado neste ponto."
 */
export default async function SuccessPage({ params }: { params: Params }) {
  const { orderId } = await params;
  const order = await getOrder(orderId);

  if (!order) notFound();

  const draft = await getDraft(order.siteId);
  if (!draft) notFound();

  // Chegou aqui sem o webhook ter confirmado: não mentir que está no ar.
  if (order.status !== "PAID") {
    return (
      <main className="success">
        <Logo />
        <h1 className="success__title">Ainda estamos aguardando o pagamento</h1>
        <p className="success__lede">
          Assim que o Pix cair, sua página entra no ar sozinha e você recebe um
          e-mail. Pode fechar esta tela — nada se perde.
        </p>
        <Link href={`/checkout/${order.siteId}`} className="btn-primary">
          Voltar ao pagamento
        </Link>
      </main>
    );
  }

  const hero = draft.content.blocks.find((block) => block.type === "hero");
  const title = hero?.type === "hero" ? hero.props.title : "Sua página";

  return (
    <main className="success" data-occasion={draft.occasionId}>
      <Logo />

      <p className="eyebrow">está no ar</p>
      <h1 className="success__title">
        {title} <span className="display-italic">existe</span>
      </h1>
      <p className="success__lede">
        Agora é só entregar. O endereço nunca muda, então o QR que você imprimir
        hoje continua valendo para sempre.
      </p>

      <SuccessActions slug={draft.slug} title={title} />

      <p className="success__mail">
        Mandamos tudo isso para <strong>{order.email}</strong> também.
      </p>

      <Link href="/painel" className="btn-quiet">
        Ir para o meu painel
      </Link>
    </main>
  );
}
