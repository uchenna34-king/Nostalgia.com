---
plan: 10-06
phase: 10-trust-polish
title: Owner-only review moderation + hidden-review filter
status: complete
completed: 2026-07-28
requirements: [TRST-01]
---

# Plan 10-06 — Summary

**Objective:** Deliver the auto-publish-with-owner-removal half of D-02: a `hidden` flag,
storefront read filtering, and an owner-gated `/admin/reviews` moderation surface.

## What was built

| Task | Result | Verify |
|------|--------|--------|
| 1. `hidden` flag + read filter | `Review.hidden Boolean @default(false)` + `add_review_hidden` migration (`hidden BOOLEAN NOT NULL DEFAULT false`). `lib/reviews.ts` filters `hidden: false` in the list query **and both** rating aggregates — so hiding drops a review from the PDP list, average/count, card stars, and (shared aggregate) JSON-LD together. | `prisma validate` ✅, 4 filter sites, `reviews.test.ts` still green |
| 2. Actions + list page | `hideReview`/`unhideReview`/`deleteReview`, each with `await requireOwner()` as the FIRST statement, then `revalidatePath` fan-out (`/admin/reviews`, `/`, `/shop`, `/product/[slug]`, `/collections/[slug]`). Page queries `prisma.review.findMany` directly (owner sees hidden rows too), tolerating null name/email. | gate count 3 = export count 3 |
| 3. Moderation table + nav | `"use client"` dense table: Product link / Author / Rating `N/5` / Title / Date / Status pill / Actions. Visible rows → Hide + Delete; hidden rows → Unhide + Delete, dimmed. Delete confirm uses the verbatim UI-SPEC string. AdminNav "Reviews" entry. | live-verified |

## Verification

- Source assertions: `grep -c 'hidden: false' lib/reviews.ts` = 4; `await requireOwner` count (3) equals `export async function` count (3) — no `prisma` call precedes any gate. `tsc` clean.
- **In-browser (owner session via the dev "Sign in as store owner" button):** `/admin/reviews` listed all 4 reviews with the Reviews nav link active. Hid Friend's 5/5 overcoat review → PDP immediately went **4.5 (2 reviews) → 4.0 (1 review)** and the review left the list. Unhid it → restored to **4.5 (2 reviews)**. Both the list and the aggregate fan out correctly.

## Notes

- Hide is a reversible soft flag; delete is a hard `prisma.review.delete` (safe — no `Order` FK to `Review`).
- No customer-facing report/flag/helpful-vote flow (D-02 scope fence).
- The seed data was returned to its original state (unhide) after testing.
