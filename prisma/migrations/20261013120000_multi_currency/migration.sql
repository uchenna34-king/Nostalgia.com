-- Phase 12: multi-currency payments. Hand-authored from `prisma migrate diff
-- --script` (never `migrate dev`: the local .env points at the production
-- database). Expand-only: nothing is dropped or renamed.

-- AlterTable: Product. priceNgn is added NULLABLE so existing rows can be
-- backfilled, then tightened to NOT NULL.
ALTER TABLE "Product" ADD COLUMN     "priceNgn" INTEGER,
ADD COLUMN     "priceUsdOverride" INTEGER;

-- Backfill (D-08). "price" (the column behind Product.priceUsd) is untouched,
-- so every existing dollar price stays exactly as the owner typed it:
--   priceUsdOverride = price
--   priceNgn         = price (cents) x 1500, rounded to the nearest ₦500
--                      (50000 kobo). 1500 is the placeholder rate; the owner
--                      reviews these prices in /admin.
-- Clamped to 0..₦21,474,500 (2147450000 kobo, the largest ₦500 step an
-- INTEGER holds): anything over $14,316.55 would otherwise overflow, and a
-- failed migration blocks every later deploy until it is resolved by hand.
UPDATE "Product"
SET "priceUsdOverride" = "price",
    "priceNgn" = GREATEST(LEAST(ROUND("price"::numeric * 1500 / 50000) * 50000, 2147450000), 0)::integer;

ALTER TABLE "Product" ALTER COLUMN "priceNgn" SET NOT NULL;

-- AlterTable: Order. Existing rows were all charged in USD (the default).
ALTER TABLE "Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "shippingAddress" TEXT;

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL,
    "usdNgnRate" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- Singleton row. 1500 is a PLACEHOLDER; the owner sets the real rate in
-- /admin/settings. updatedAt has no DB default (@updatedAt is app-level).
INSERT INTO "StoreSettings" ("id", "usdNgnRate", "updatedAt")
VALUES (1, 1500, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateIndex
CREATE INDEX "Product_priceNgn_idx" ON "Product"("priceNgn");
