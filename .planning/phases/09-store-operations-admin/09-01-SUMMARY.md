---
phase: 09-store-operations-admin
plan: 01
status: complete
completed: 2026-07-21
requirements: [ADMN-03, ADMN-04]
---

# 09-01 Summary — Data-layer foundation

## What was built
- **`ProductSizeStock` model** (prisma/schema.prisma) mirroring `ProductImage`: `productId` + `size` unique, `stock Int @default(0)`, `position`, `onDelete: Cascade`, `@@index([productId])`. Added `Product.variants` back-relation. This is the project's first relational break from the JSON-array convention; the source of truth for stock.
- **`Order` fulfillment fields**: `trackingNumber String?`, `notes String?`, plus an in-schema comment documenting the app-enforced status allow-list (pending → paid → fulfilled → cancelled). `status` stays a `String` (no DB enum) for SQLite→Postgres portability.
- **Seed** (prisma/seed.ts): per-size `ProductSizeStock` rows (default stock 8), FK-safe delete order updated, and sold-out fixtures — `corduroy-cap` fully sold out, `heritage-cable-knit` size S sold out. A self-invariant throws unless both fixtures exist, so `npm run seed` exit 0 proves them.
- **`lib/products.ts`**: additive `ProductVariant` type + `variants` on the `Product` type and `deserialize`, with a `variants` include at all four query sites. `sizes` JSON read path untouched — Phase 8 consumers unaffected.

## Verification
- `npx prisma validate` → valid.
- `npx prisma db push` → applied; 2nd run "already in sync" (idempotent); client regenerated.
- `npm run seed` → exit 0: "Seeded 10 products, 20 images, 36 size-stock rows, 2 collections."
- `npx tsc --noEmit` → exit 0 (change is additive; no Phase 8 consumer broke).

## Decisions / notes
- Dual-write bridge: `sizes` JSON stays live alongside `variants` this phase; full retirement of `sizes` deferred.
- Stayed on `prisma db push` (no migrations folder); `migrate dev` intentionally avoided (reset risk).
- Files: prisma/schema.prisma, prisma/seed.ts, lib/products.ts.
