CREATE TYPE "SellerLedgerEntryType" AS ENUM ('SALE_CREDIT', 'PAYOUT', 'RETURN_DEBIT', 'SHIPPING_DEBIT', 'ADJUSTMENT');
CREATE TYPE "SellerLedgerEntryStatus" AS ENUM ('PENDING', 'POSTED', 'SETTLED', 'VOID');
CREATE TYPE "VendorReturnStatus" AS ENUM ('PENDING', 'READY_TO_SHIP', 'SHIPPED', 'RECEIVED_BY_VENDOR', 'CLOSED');

CREATE TABLE "SellerLedgerEntry" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "orderLineId" TEXT,
  "type" "SellerLedgerEntryType" NOT NULL,
  "status" "SellerLedgerEntryStatus" NOT NULL DEFAULT 'POSTED',
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellerLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorReturn" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "status" "VendorReturnStatus" NOT NULL DEFAULT 'PENDING',
  "carrier" TEXT,
  "trackingNumber" TEXT,
  "shippedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorReturn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SellerLedgerEntry_sellerId_status_idx" ON "SellerLedgerEntry"("sellerId", "status");
CREATE INDEX "SellerLedgerEntry_orderLineId_idx" ON "SellerLedgerEntry"("orderLineId");
CREATE INDEX "VendorReturn_sellerId_status_idx" ON "VendorReturn"("sellerId", "status");
CREATE INDEX "VendorReturn_orderLineId_idx" ON "VendorReturn"("orderLineId");

ALTER TABLE "SellerLedgerEntry" ADD CONSTRAINT "SellerLedgerEntry_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerLedgerEntry" ADD CONSTRAINT "SellerLedgerEntry_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VendorReturn" ADD CONSTRAINT "VendorReturn_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VendorReturn" ADD CONSTRAINT "VendorReturn_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
