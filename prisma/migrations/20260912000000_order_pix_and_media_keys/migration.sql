-- Cobrança Pix persistida no pedido.
--
-- Sem estas colunas, o código copia-e-cola do Pix só existia na resposta da
-- criação da cobrança: recarregar a tela de pagamento perdia o código e a pessoa
-- não tinha como pagar sem refazer o pedido. Funcionava em desenvolvimento
-- porque lá o pedido mora num arquivo JSON que guarda tudo.
ALTER TABLE "Order" ADD COLUMN "pixCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "pixExpiresAt" TIMESTAMP(3);

-- Índice para a expiração de cobrança (job `order.abandoned`, SPEC 9.2).
CREATE INDEX "Order_pixExpiresAt_idx" ON "Order"("pixExpiresAt");
