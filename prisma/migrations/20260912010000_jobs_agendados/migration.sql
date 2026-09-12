-- Filas da SPEC 9.2, versão agendada.
--
-- As duas colunas existem para o mesmo fim: garantir que cada aviso saia UMA
-- vez. Dava para deduzir a janela pela idade do registro, mas aí uma execução
-- perdida significa aviso que nunca sai e uma execução repetida significa dois
-- e-mails para a mesma pessoa. Marcar o envio é mais barato que qualquer uma
-- das duas conversas.
ALTER TABLE "Order" ADD COLUMN "abandonedNotifiedAt" TIMESTAMP(3);
ALTER TABLE "Site" ADD COLUMN "expiringNotifiedAt" TIMESTAMP(3);

-- O job varre por status + idade; sem isto vira varredura de tabela cheia no
-- dia em que houver volume.
CREATE INDEX "Order_status_abandonedNotifiedAt_idx" ON "Order"("status", "abandonedNotifiedAt");
CREATE INDEX "Site_expiresAt_expiringNotifiedAt_idx" ON "Site"("expiresAt", "expiringNotifiedAt");
