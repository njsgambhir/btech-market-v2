CREATE TYPE "SellerPayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

CREATE TABLE "SellerPayout" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "status" "SellerPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "provider" TEXT NOT NULL DEFAULT 'development',
  "providerRef" TEXT,
  "paidAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SellerPayout_providerRef_key" ON "SellerPayout"("providerRef");
CREATE INDEX "SellerPayout_sellerId_status_idx" ON "SellerPayout"("sellerId", "status");
CREATE INDEX "SellerLedgerEntry_sellerId_type_status_eligibleAt_idx" ON "SellerLedgerEntry"("sellerId", "type", "status", "eligibleAt");

ALTER TABLE "SellerPayout"
ADD CONSTRAINT "SellerPayout_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
