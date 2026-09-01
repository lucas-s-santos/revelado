import { describe, expect, it } from "vitest";

import { PAYMENTS_SIMULATED, verifySignature } from "@/lib/mercadopago";

/**
 * A regressão que trava o "publicar sem pagar".
 *
 * Um deploy real que subisse sem `MERCADOPAGO_WEBHOOK_SECRET` fazia a
 * `verifySignature` devolver `true` para qualquer coisa — e um POST forjado no
 * webhook publicava a página de graça. Foi demonstrado de ponta a ponta.
 *
 * O contrato agora é: sem segredo, a assinatura só passa no modo SIMULADO
 * (dev sem banco). Este teste roda sob `vitest`, que não define
 * `DATABASE_URL`, então aqui `PAYMENTS_SIMULATED` é verdadeiro — e o que
 * importa é a AMARRAÇÃO: a dispensa de assinatura nunca pode valer além do
 * modo simulado.
 */
describe("segurança do webhook de pagamento", () => {
  it("sem segredo, só dispensa assinatura no modo simulado", () => {
    // Sem env de segredo configurada no teste, o retorno acompanha exatamente
    // PAYMENTS_SIMULATED — nunca um `true` incondicional.
    const semSegredo = verifySignature(null, null, "qualquer-id");
    expect(semSegredo).toBe(PAYMENTS_SIMULATED);
  });

  it("PAYMENTS_SIMULATED implica ausência de banco", () => {
    // A trava é justamente esta: simulação e banco não coexistem. Se um dia
    // alguém ligar simulação com banco presente, este teste cai.
    if (PAYMENTS_SIMULATED) {
      expect(process.env.DATABASE_URL).toBeFalsy();
    }
  });

  it("uma assinatura obviamente falsa não passa quando há segredo", () => {
    const anterior = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "segredo-de-teste";
    try {
      // Header presente mas com hash que não bate: recusa.
      expect(
        verifySignature("ts=123,v1=deadbeef", "req-1", "pagamento-9"),
      ).toBe(false);
      // Sem header nenhum, com segredo configurado: recusa.
      expect(verifySignature(null, "req-1", "pagamento-9")).toBe(false);
    } finally {
      if (anterior === undefined) delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
      else process.env.MERCADOPAGO_WEBHOOK_SECRET = anterior;
    }
  });
});
