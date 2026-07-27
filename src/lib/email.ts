/**
 * E-mail transacional — SPEC 2 e 8.5.
 *
 * Resend. Sem `RESEND_API_KEY`, escreve no log em vez de enviar — o fluxo
 * inteiro roda em desenvolvimento sem conta em lugar nenhum, e dá para conferir
 * no terminal que o e-mail certo saiu na hora certa.
 *
 * Nota sobre o SPEC: ele pede React Email para os templates. Aqui os templates
 * são funções que devolvem HTML, para não trazer mais uma árvore de dependência
 * só para dois e-mails. Quando forem dez, a troca vale e o ponto de mudança é
 * este arquivo.
 */

const RESEND_CONFIGURED = Boolean(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Revelado <ola@revelado.com.br>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface SendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send({ to, subject, html, text }: SendInput): Promise<void> {
  if (!RESEND_CONFIGURED) {
    console.info(
      `[email] (não enviado — sem RESEND_API_KEY)\n  para: ${to}\n  assunto: ${subject}\n  ${text.replace(/\n/g, "\n  ")}`,
    );
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
  });
  if (result.error) throw new Error(result.error.message);
}

/** Envelope comum. Sóbrio: é comprovante, não peça de marketing. */
function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#0A0711;color:#F6EFE6;font-family:system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto">
    <h1 style="font-size:22px;font-weight:400;margin:0 0 16px">${title}</h1>
    ${body}
    <p style="margin-top:32px;font-size:12px;color:#9B90AA">
      Revelado · páginas comemorativas com QR Code
    </p>
  </div>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#F2B457;color:#0A0711;text-decoration:none;font-weight:500">${label}</a>`;
}

/** Página no ar — SPEC 8.5: enviado assim que o webhook confirma. */
export async function sendPublishedEmail(input: {
  to: string;
  slug: string;
  orderId: string;
}): Promise<void> {
  const pageUrl = `${SITE_URL}/p/${input.slug}`;
  const successUrl = `${SITE_URL}/sucesso/${input.orderId}`;

  await send({
    to: input.to,
    subject: "Sua página está no ar 🎉",
    html: layout(
      "Sua página está no ar",
      `<p style="line-height:1.6;color:#F6EFE6">Está pronta. Este é o link para presentear:</p>
       <p style="margin:16px 0"><a href="${pageUrl}" style="color:#F2B457">${pageUrl}</a></p>
       <p style="line-height:1.6;color:#9B90AA">Na página de sucesso você baixa o QR Code em PNG, SVG e o cartão A6 pronto para imprimir.</p>
       <p style="margin:24px 0">${button(successUrl, "Baixar meu QR Code")}</p>
       <p style="line-height:1.6;color:#9B90AA;font-size:13px">Guarde este e-mail: é por ele que você edita a página depois.</p>`,
    ),
    text: `Sua página está no ar!\n\nLink: ${pageUrl}\nQR Code e cartão para imprimir: ${successUrl}\n\nGuarde este e-mail: é por ele que você edita a página depois.`,
  });
}

/** Carrinho abandonado — SPEC 8.5: 30 minutos depois, com link de volta. */
export async function sendAbandonedEmail(input: {
  to: string;
  draftId: string;
}): Promise<void> {
  const backUrl = `${SITE_URL}/checkout/${input.draftId}`;

  await send({
    to: input.to,
    subject: "Sua página ficou pela metade",
    html: layout(
      "Sua página ficou pela metade",
      `<p style="line-height:1.6;color:#F6EFE6">Está tudo salvo do jeito que você deixou. É só continuar de onde parou.</p>
       <p style="margin:24px 0">${button(backUrl, "Continuar minha página")}</p>`,
    ),
    text: `Sua página ficou pela metade — está tudo salvo.\n\nContinue em: ${backUrl}`,
  });
}

/** Primeira visita — SPEC 8.7: o maior gatilho emocional do produto. */
export async function sendFirstViewEmail(input: {
  to: string;
  slug: string;
}): Promise<void> {
  await send({
    to: input.to,
    subject: "Sua página foi aberta 💛",
    html: layout(
      "Alguém abriu sua página",
      `<p style="line-height:1.6;color:#F6EFE6">O presente chegou. A página <strong>/p/${input.slug}</strong> foi aberta pela primeira vez agora.</p>`,
    ),
    text: `Alguém abriu sua página /p/${input.slug} pela primeira vez.`,
  });
}
