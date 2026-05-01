-- Add CONVERTED value to SubscriberStatus enum
ALTER TYPE "SubscriberStatus" ADD VALUE IF NOT EXISTS 'CONVERTED';

-- Add productId to Conversion (required, backfill empty string for any existing rows)
ALTER TABLE "conversions" ADD COLUMN "productId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "conversions" ALTER COLUMN "productId" DROP DEFAULT;

-- Unique constraint so each (shop, order, product) is recorded only once
CREATE UNIQUE INDEX "conversions_shopId_orderId_productId_key"
  ON "conversions"("shopId", "orderId", "productId");
