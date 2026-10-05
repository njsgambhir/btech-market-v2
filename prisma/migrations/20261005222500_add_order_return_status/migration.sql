CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'AUTHORIZED', 'IN_TRANSIT', 'RECEIVED', 'APPROVED', 'REJECTED', 'REFUNDED');

ALTER TABLE "Order"
ADD COLUMN "returnStatus" "ReturnStatus",
ADD COLUMN "returnAuthorizedAt" TIMESTAMP(3);

UPDATE "Order"
SET "returnStatus" = 'REFUNDED'
WHERE "status" = 'REFUNDED';
