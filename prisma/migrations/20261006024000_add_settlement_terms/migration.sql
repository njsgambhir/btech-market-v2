ALTER TABLE "SellerLedgerEntry"
ADD COLUMN "grossAmountCents" INTEGER,
ADD COLUMN "commissionAmountCents" INTEGER,
ADD COLUMN "commissionBps" INTEGER,
ADD COLUMN "reserveDays" INTEGER,
ADD COLUMN "eligibleAt" TIMESTAMP(3);

CREATE TABLE "MarketplaceSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "defaultCommissionBps" INTEGER NOT NULL DEFAULT 600,
  "reserveDays" INTEGER NOT NULL DEFAULT 7,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MarketplaceSettings" ("id", "defaultCommissionBps", "reserveDays", "updatedAt")
VALUES ('default', 600, 7, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
