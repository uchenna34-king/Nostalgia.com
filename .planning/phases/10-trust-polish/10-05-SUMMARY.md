---
plan: 10-05
phase: 10-trust-polish
title: Review submission — ReviewForm + submitReview Server Action
status: complete
completed: 2026-07-28
requirements: [TRST-01]
---

# Plan 10-05 — Summary

**Objective:** Deliver the reviews WRITE path (D-01/D-02/D-03) — the `submitReview` Server
Action and the `ReviewForm` island — into the `#reviews` section 10-04 built.

## What was built

| Task | Result | Verify |
|------|--------|--------|
| 1. `submitReview` | `"use server"` action. Gate 1 (session identity) and Gate 2 (`hasPurchased`) both re-derived server-side as the first statements, before any write. Explicit field extraction, `isValidRating` clamp, required title, title/body capped at 120/2000, empty body → `null`, single `prisma.review.upsert` on `productId_userId`, then `revalidatePath` × 4. | `tests/submit-review.test.ts` 14/14 |
| 2. `ReviewForm` + a11y tests | All four eligibility states with verbatim UI-SPEC copy, plus submitting / success / error. Star input is a `role="radiogroup"` of five `role="radio"` buttons with numeric `aria-label`s, roving tabindex, and Arrow/Home/End/Enter handling. `STAR_PATH` exported from `RatingStars` so input and display stars share one glyph. | `tests/a11y.test.tsx` 5/5 |
| 3. PDP mount | Eligibility derived server-side (`signed-out` / `no-purchase` / `eligible` / `already-reviewed` + prefill); form mounted in the existing `#reviews` section, 10-04 markup untouched. | live-verified |

## Verification

- **102 tests passing, `tsc --noEmit` clean.** (Suite grew 88 → 102 with the new security tests.)
- **In-browser, all four states** — signed-out → prompt + Sign in, **no form**; signed-in non-purchaser (`friend` on `archive-bomber-jacket`) → "Reviews are open to customers who've purchased this item.", **no form**; eligible → full form; already-reviewed → "You've already reviewed this product."
- **Keyboard-only rating works:** three ArrowRight presses selected 4 stars, focus followed selection, `aria-checked` tracked, 4 stars filled.
- **Real submission:** "Posting…" + disabled fields → confirmation → review appears in the list with the aggregate updated.
- **One-review-per-user is structural, not app-enforced:** a raw duplicate `create` is rejected by the DB with `P2002`, and two `upsert`s leave exactly **one** row edited in place with `createdAt` preserved.
- Seed data disturbed during testing was restored via `npm run seed` (back to 4 reviews).

## Bug found and fixed during live testing

The success confirmation was **unreachable**. On success the action fires `router.refresh()`,
which re-renders the island with `eligibility` flipped to `"already-reviewed"` — and that
branch was evaluated *before* the success branch, so the `role="status"` / `aria-live="polite"`
message vanished the instant it rendered. The customer saw "You've already reviewed this
product." instead of "Thanks — your review is live." — which reads like a rejection, and for
screen-reader users removed the only signal the submit had worked (UI-SPEC §1 requires that
live-region confirmation). **Fix:** the `status === "success"` check now precedes the
eligibility branches. Re-verified live: confirmation renders with `aria-live="polite"`.

Automated tests alone would not have caught this — it only appears once a real
`router.refresh()` changes the props mid-session.

## Added beyond the plan

`tests/submit-review.test.ts` (14 tests) was not required by the plan, but the threat model
rates the eligibility gate **high** severity and it had no automated coverage. It proves, with
the DB mocked, that: anonymous callers and sessions without a user id are rejected with **zero**
writes (and no purchase lookup); a signed-in non-purchaser is rejected with zero writes;
`hasPurchased` is called with the **session** id, never client input; ratings `0`/`6`/`2.5`/
`abc`/`-1` and blank titles are refused before any write; caps and the `null` body hold.
