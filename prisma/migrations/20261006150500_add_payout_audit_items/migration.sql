-- CreateTable
CREATE TABLE "SellerPayoutItem" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerPayoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerPayoutItem_payoutId_ledgerEntryId_key" ON "SellerPayoutItem"("payoutId", "ledgerEntryId");

-- CreateIndex
CREATE INDEX "SellerPayoutItem_sellerId_createdAt_idx" ON "SellerPayoutItem"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "SellerPayoutItem_ledgerEntryId_idx" ON "SellerPayoutItem"("ledgerEntryId");

-- AddForeignKey
ALTER TABLE "SellerPayoutItem" ADD CONSTRAINT "SellerPayoutItem_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "SellerPayout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayoutItem" ADD CONSTRAINT "SellerPayoutItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayoutItem" ADD CONSTRAINT "SellerPayoutItem_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "SellerLedgerEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
