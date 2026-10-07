CREATE TYPE "SellerSuborderStatus" AS ENUM ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

CREATE TABLE "SellerSuborder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" "SellerSuborderStatus" NOT NULL DEFAULT 'PAID',
    "subtotalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SellerSuborder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrderLine" ADD COLUMN "sellerSuborderId" TEXT;

CREATE UNIQUE INDEX "SellerSuborder_orderId_sellerId_key" ON "SellerSuborder"("orderId", "sellerId");
CREATE INDEX "SellerSuborder_sellerId_status_idx" ON "SellerSuborder"("sellerId", "status");
CREATE INDEX "SellerSuborder_orderId_idx" ON "SellerSuborder"("orderId");
CREATE INDEX "OrderLine_sellerSuborderId_idx" ON "OrderLine"("sellerSuborderId");

ALTER TABLE "SellerSuborder" ADD CONSTRAINT "SellerSuborder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SellerSuborder" ADD CONSTRAINT "SellerSuborder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_sellerSuborderId_fkey" FOREIGN KEY ("sellerSuborderId") REFERENCES "SellerSuborder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
