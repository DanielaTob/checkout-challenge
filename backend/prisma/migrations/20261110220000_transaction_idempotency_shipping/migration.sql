-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "shipping" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotency_key_key" ON "transactions"("idempotency_key");

