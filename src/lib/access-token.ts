import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Link assinado — SPEC 9.4.
 *
 * Existe por causa de um conflito real entre duas coisas certas: `/sucesso` tem
 * que conferir de quem é o pedido (a tela imprime o e-mail do comprador), e o
 * link dela vai **dentro do e-mail** — a pessoa paga no celular e abre o e-mail
 * no computador, onde o cookie anônimo não existe. Conferir só o cookie trancaria
 * o cliente fora do próprio QR Code.
 *
 * A saída é o link carregar a prova: um HMAC do id com o segredo do app. Quem
 * recebeu o e-mail entra de qualquer aparelho; quem só adivinhou o id, não.
 */

/**
 * Segredo do app.
 *
 * Em produção sem `AUTH_SECRET` o valor de reserva é público (está neste
 * arquivo), então o aviso é barulhento de propósito: token assinado com segredo
 * conhecido não assina nada. Não derruba o processo porque isso tiraria do ar
 * uma página que já está funcionando — o conserto é preencher a variável.
 */
let warned = false;

export function appSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;

  if (!warned && process.env.NODE_ENV === "production") {
    warned = true;
    console.error(
      "[segurança] AUTH_SECRET não configurado: links assinados e cookies de senha estão usando o segredo de reserva, que é público. Preencha a variável.",
    );
  }

  return "revelado";
}

/** `scope` separa os usos: um token de pedido não vale para outra coisa. */
export function accessToken(scope: string, id: string): string {
  return createHmac("sha256", appSecret())
    .update(`${scope}:${id}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyAccessToken(
  scope: string,
  id: string,
  token: string | undefined | null,
): boolean {
  if (!token) return false;

  const expected = Buffer.from(accessToken(scope, id), "utf8");
  const given = Buffer.from(token, "utf8");

  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** URL de `/sucesso` com a prova embutida — é esta que vai no e-mail. */
export function successUrl(siteUrl: string, orderId: string): string {
  return `${siteUrl}/sucesso/${orderId}?t=${accessToken("order", orderId)}`;
}
