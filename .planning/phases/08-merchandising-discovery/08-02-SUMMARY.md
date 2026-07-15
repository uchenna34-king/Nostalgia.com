---
phase: 08-merchandising-discovery
plan: 02
subsystem: database
tags: [prisma, sqlite, data-model, schema-migration]

# Dependency graph
requires:
  - phase: 08-merchandising-discovery (plan 01)
    provides: vitest harness + use-debounce install
provides:
  - ProductImage relation replacing the JSON images column, ordered by position
  - Collection model with implicit many-to-many to Product, 2 starter collections seeded
  - Product.materials / Product.care nullable fields for richer PDP copy
  - Indexes on Product.category, Product.price, Product.createdAt
  - lib/products.ts mapping the images relation back to a stable Product.images: string[]
affects: [08-03 (getCatalog/getCollections build on this schema), 08-06 (Gallery consumes ProductImage), 08-08 (collection routes)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ordered one-to-many relation via position Int @default(0) + orderBy at query time (no native ordered-list column in Prisma)"
    - "Implicit many-to-many (Collection <-> Product) — no explicit join model since collections carry no per-link fields"
    - "App-facing Product type stays stable (images: string[]) while the DB shape changes underneath, in lib/products.ts's deserialize mapping"

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - prisma/seed.ts
    - lib/products.ts
    - app/api/checkout/route.ts

key-decisions:
  - "Kept sizes as the existing JSON-encoded string column — not in scope to normalize this phase (RESEARCH Pattern 3)"
  - "Used implicit many-to-many for Collection <-> Product per RESEARCH (no per-link fields needed)"
  - "Seeded materials/care copy only on the 6 featured products, left null elsewhere, per plan's 'at least featured products' requirement"
  - "Autumn Archive collection: outerwear/knitwear (4 products); Essentials collection: tees/hoodie/accessories (5 products) — both exceed the D-12 minimum of 2"

patterns-established:
  - "FK-safe seed truncation order: order -> productImage -> collection -> product"
  - "Any raw prisma.product query needing an image must include { images: { orderBy: { position: 'asc' } } } and read images[0].url instead of JSON.parse"

requirements-completed: [CATL-01, PDP-01, DISC-04]

coverage:
  - id: D1
    description: "Product images normalized into an ordered ProductImage relation; JSON images column removed"
    requirement: CATL-01
    verification:
      - kind: integration
        ref: "npx prisma validate && npx prisma generate && node -e schema-delegate-check"
        status: pass
    human_judgment: false
  - id: D2
    description: "Collection model with product many-to-many relation; 2 starter collections seeded, each linked to >=2 products"
    requirement: DISC-04
    verification:
      - kind: integration
        ref: "npm run seed && node -e seed-count-check (products=10, images=20, collections=2, minLinks>=2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Product gains optional materials/care fields; featured products have non-null copy"
    requirement: PDP-01
    verification:
      - kind: integration
        ref: "node -e featured-materials-care-check (6/6 featured products have both fields)"
        status: pass
    human_judgment: false
  - id: D4
    description: "lib/products.ts keeps Product.images as ordered string[]; existing storefront callers keep compiling"
    requirement: CATL-01
    verification:
      - kind: integration
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-07-15
status: complete
---

# Phase 08 Plan 02: Catalog Data-Model Re-Architecture Summary

**Migrated Product.images from a JSON string column to an ordered ProductImage relation, added a Collection model with 2 seeded starter collections, and added materials/care fields + category/price/createdAt indexes — all while keeping the existing storefront's Product.images: string[] contract unchanged.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-15T10:25:00Z (approx, first commit 10:26:28)
- **Completed:** 2026-07-15T10:29:13Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- `ProductImage` model (ordered by `position`, cascade-deleted with its Product) replaces the JSON `images` column
- `Collection` model with implicit many-to-many to `Product`; seeded "Autumn Archive" (4 products) and "Essentials" (5 products)
- `Product.materials` / `Product.care` nullable fields added; seeded on all 6 featured products with brand-voice copy
- Indexes added on `Product.category`, `Product.price`, `Product.createdAt` for scalable filter/sort
- `lib/products.ts` maps the new relation back to a stable `images: string[]` so `ProductCard`/`AddToCart`/PDP keep working unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the Prisma schema** - `2beb0d0` (feat)
2. **Task 2: Rewrite seed.ts** - `6b4d6fd` (feat)
3. **Task 3: Update lib/products.ts** - `da4ed27` (feat, includes the checkout route Rule 3 fix)

**Plan metadata:** (recorded below after this commit)

## Files Created/Modified
- `prisma/schema.prisma` - `ProductImage`, `Collection` models; `Product` indexes + materials/care fields; `images String` column removed
- `prisma/seed.ts` - writes nested ordered `ProductImage` rows per product; seeds 2 starter `Collection` rows with product connects; FK-safe truncation order
- `lib/products.ts` - `deserialize` maps `images` relation (ordered by position) to `string[]`; `getProducts`/`getFeaturedProducts`/`getProductBySlug` include the images relation; `Product` type gains `materials`/`care`
- `app/api/checkout/route.ts` - updated to include the images relation and read `images[0].url` instead of `JSON.parse`d images (Rule 3 fix, see Deviations)

## Decisions Made
- Kept `sizes` as the existing JSON-encoded string column — not in scope to normalize this phase, matches RESEARCH Pattern 3 and CATL-01's boundary (only `images` called out for normalization)
- Implicit many-to-many for `Collection` <-> `Product` (no explicit join model) since collections carry no per-link fields this phase
- Seeded materials/care only on the 6 featured products (plan required "at least featured products"); rest left null, acceptable per plan
- Autumn Archive: outerwear + knitwear products; Essentials: tees/hoodie/accessories — brand-voice grouping per 08-CONTEXT.md D-11 naming examples

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed app/api/checkout/route.ts broken by the images relation migration**
- **Found during:** Task 3 (`npx tsc --noEmit` verification)
- **Issue:** This route queries `prisma.product` directly (bypassing `lib/products.ts`) and did `JSON.parse(p.images)` to get the first image URL for Stripe line items. Task 1's schema change removed the `images` string column entirely, so this failed to compile: `Property 'images' does not exist on type '...'`.
- **Fix:** Added `include: { images: { orderBy: { position: "asc" } } }` to the `prisma.product.findMany` call and changed `image: (JSON.parse(p.images) as string[])[0]` to `image: p.images[0]?.url`.
- **Files modified:** `app/api/checkout/route.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors after the fix.
- **Committed in:** `da4ed27` (part of Task 3 commit, since it was directly caused by and required to complete Task 3's `tsc` verification)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking compile error)
**Impact on plan:** Necessary to keep `tsc --noEmit` green, a plan-level success criterion. No scope creep — fix is a direct, minimal consequence of the schema migration this plan performs.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema, seed data, and `lib/products.ts` are ready for 08-03 (`getCatalog`, `getCollections`, `getCollectionBySlug`) to build on
- `Product.images` remains a stable `string[]` contract for all existing UI components
- Indexes on category/price/createdAt are in place for 08-03/08-05's filter/sort/pagination work
- No blockers for downstream plans

---
*Phase: 08-merchandising-discovery*
*Completed: 2026-07-15*

## Self-Check: PASSED

All created/modified files found on disk (prisma/schema.prisma, prisma/seed.ts, lib/products.ts, app/api/checkout/route.ts, this SUMMARY.md). All 3 task commits found in git log (2beb0d0, 6b4d6fd, da4ed27).
