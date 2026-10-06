-- Blur placeholder for product photos. See lib/product-images.ts: generated at
-- upload time and painted by next/image while the full photo loads.

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "blurDataUrl" TEXT;
