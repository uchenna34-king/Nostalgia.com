-- Shop taxonomy: department (women / men / unisex) and a section slug under
-- each category. See lib/taxonomy.ts for the tree these values come from.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "department" TEXT NOT NULL DEFAULT 'unisex',
ADD COLUMN     "subcategory" TEXT;

-- CreateIndex
CREATE INDEX "Product_department_category_subcategory_idx" ON "Product"("department", "category", "subcategory");

-- Move existing stock onto the new tree. Every row keeps its department at
-- 'unisex', so nothing disappears from either the Women or the Men listing;
-- the owner narrows pieces down from the admin afterwards.

-- A hoodie is a hooded sweatshirt: it leaves Tees for Sweatshirts. The
-- embroidered wordmark makes it a graphic piece, not a plain one.
UPDATE "Product" SET "category" = 'Sweatshirts', "subcategory" = 'graphic'
WHERE "category" = 'Tees' AND "slug" = 'nostalgia-hoodie';

-- Remaining tees are unbranded house staples: Shirts & T-shirts / Everyday.
UPDATE "Product" SET "category" = 'Shirts & T-shirts', "subcategory" = 't-shirts'
WHERE "category" = 'Tees';

-- "Bottoms" sat beside "Jeans" ambiguously (jeans are bottoms too).
UPDATE "Product" SET "category" = 'Trousers'
WHERE "category" = 'Bottoms';
