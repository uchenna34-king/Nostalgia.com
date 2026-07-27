---
plan: 10-03
phase: 10-trust-polish
title: Shared review query layer + aggregate rating in product reads
status: complete
completed: 2026-07-27
requirements: [TRST-01]
---

# Plan 10-03 — Summary

**Objective:** Build the shared review query layer every Phase 10 reviews surface reads
from, and merge aggregate ratings into the product read path (D-01, D-03, D-04).

## What was built

| Task | Result | Verify |
|------|--------|--------|
| 1. `lib/reviews.ts` | Prisma-importing module with pure helpers (`isValidRating` 1-5 allow-list, `purchasedSlugs`, `toRatingMap`, `ELIGIBLE_REVIEW_STATUSES`) and async query helpers (`hasPurchased` via paid/fulfilled order slug-match — no raw JSON SQL; `getRatingSummaries` one bounded groupBy, no N+1; `getRatingSummary`; `getReviewsForProduct`; `getUserReview`; `upsertReview` with rating assert + length caps). | `tests/reviews.test.ts` 7/7 green (RED→GREEN) |
| 2. `lib/products.ts` rating merge | Added `rating: RatingSummary` to `Product`; `deserialize` returns `Omit<Product,"rating">`; new `withRatings()` attaches ratings via ONE `getRatingSummaries` call per read, defaulting reviewless ids to `{avg:0,count:0}`. Routed `getProducts`/`getFeaturedProducts`/`getProductBySlug`/`getCatalog` through it. | `tsc` clean; full suite green |

## Verification

- `npx vitest run tests/reviews.test.ts` — 7/7 green (isValidRating allow-list, hasPurchased slug-match incl. empty-orders=false, getRatingSummaries zero-default + empty-input=empty-map).
- `npx tsc --noEmit` — no error in `lib/reviews.ts` or `lib/products.ts`.
- `npx vitest run` — full suite rose from 56→63 passing; Phase 8 catalog tests still green (stock-aware `where`/pagination path untouched; `lib/catalog.ts` unedited).

## Key decisions honored

- `hasPurchased` takes a **slug**, not a product id (Order.items is slug-keyed — RESEARCH Pitfall 1); only `paid`/`fulfilled` count (Pitfall 4).
- Rating is a **separate subsequent query**, never merged into `buildProductWhere` — D-04 delivered with zero Phase 8 regression.
- `upsertReview` writes through the `@@unique([productId,userId])` compound key (one review per user, structural).

## Consumed by

10-04 (PDP rating + review list), 10-05 (submit action: `hasPurchased`/`upsertReview`/`isValidRating`), 10-06 (admin moderation), 10-11 (JSON-LD `aggregateRating` via `getRatingSummary`).
