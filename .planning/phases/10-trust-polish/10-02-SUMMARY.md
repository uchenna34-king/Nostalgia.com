---
plan: 10-02
phase: 10-trust-polish
title: Review model + baselined migration + verified-purchase seed
status: complete
completed: 2026-07-26
requirements: [TRST-01]
---

# Plan 10-02 — Summary

**Objective:** Establish the persistence root for the whole reviews vertical (TRST-01):
a relational `Review` model, an explicit non-interactive `add-reviews` migration, and
seeded verified-purchase reviews backed by real paid orders.

## What was built

| Task | Result | Verify |
|------|--------|--------|
| 1. `Review` model + back-relations | Added `Review` to `prisma/schema.prisma` mirroring `ProductSizeStock` field-for-field: cuid `id`, String `productId`/`userId` FKs with `onDelete: Cascade`, `rating` Int, required `title`, optional `body`, `createdAt`/`updatedAt`; `@@unique([productId, userId])` + `@@index` on each FK. `reviews Review[]` added to `Product` and `User`. ANSI-portable only. | `npx prisma validate` ✅ |
| 2. Baseline + migration | Baselined the previously db-push-managed schema into `prisma/migrations/0_init/` (via `migrate diff --from-empty --to-schema-datasource`, then `migrate resolve --applied`), then `migrate dev --name add-reviews` emitted a **Review-only** migration (`20260726172011_add_reviews`) — `CREATE TABLE "Review"` + unique index on (productId,userId) + indexes on each FK, no other tables touched. Applied non-interactively; Prisma Client regenerated. | `npx prisma migrate status` → up to date, no drift ✅ |
| 3. Verified-purchase seed | Extended `prisma/seed.ts`: `review.deleteMany()` first in truncation; 3 reviewer users (incl. `friend@nostalgia.test` = demo-login default); one paid/fulfilled `Order` per reviewer snapshotting the reviewed slugs; **4 reviews** (`sepia-wool-overcoat` reviewed by 2 users; `mara`'s review has null body). Seed-time invariant re-reads every review and throws unless a paid/fulfilled order for the same user contains the reviewed slug (via `parseOrderItems`), plus ≥4-reviews and ≥1-product-with-2+ asserts. | `npm run seed` exits 0 ✅ |

## Verification

- `npx prisma validate` — valid.
- `npx prisma migrate status` — 2 migrations, database up to date, **no drift, no interactive prompt**.
- `npm run seed` — exits 0; all invariants hold. Output: `... 3 reviewers, 3 purchase orders, 4 verified-purchase reviews.`
- **Idempotency**: re-running the seed yields the same counts (4 reviews, not 8) — `review.deleteMany()` + `@@unique([productId, userId])` guarantee it structurally.
- `npx tsc --noEmit` — **`prisma/seed.ts` and the regenerated Prisma Client (`prisma.review` delegate) typecheck cleanly.** Verified that no tsc error references 10-02's files; every remaining error is in the 10-01 RED test scaffolds (see advisory).

## Advisory carried forward

- **tsc is not project-wide clean yet** — but every error is a *pre-existing 10-01 RED scaffold*, not a 10-02 regression: `jest-axe` matcher-type augmentation (`toHaveNoViolations`) and the not-yet-created modules `@/lib/reviews` (10-03), `@/lib/size-guides` (10-07), `@/lib/seo` (10-11), `@/lib/analytics` + `@vercel/analytics` (10-09). These flip green as those plans land. If a CI typecheck gate is desired sooner, 10-01's jest-axe types could be augmented independently.
- **Migration history introduced to a db-push project** (carried from planning): Phase 11's SQLite→Postgres cutover must reconcile the `0_init` baseline. The `Review` shape is deliberately ANSI-portable (cuid, standard scalars, `@@unique`, `@@index`, `onDelete: Cascade`) so it survives unchanged.
- **`Review.hidden`** (admin moderation, 10-06) is not in this schema yet — 10-06 adds its own migration.

## Interface pinned for downstream

`Review { id, productId, userId, rating:Int(1-5), title:String, body:String?, createdAt, updatedAt }`,
unique on `(productId, userId)`, cascade-delete on both FKs. Read/write target for 10-03…10-06 and
the 10-11 JSON-LD `aggregateRating`. Seeded verified purchasers: `friend@`, `mara@`, `theo@nostalgia.test`.
