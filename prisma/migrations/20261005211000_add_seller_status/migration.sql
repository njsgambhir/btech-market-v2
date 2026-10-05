CREATE TYPE "SellerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');

ALTER TABLE "Seller"
ADD COLUMN "status" "SellerStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Seller"
SET "status" = 'APPROVED'
WHERE "verified" = true;
