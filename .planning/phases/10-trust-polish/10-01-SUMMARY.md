---
plan: 10-01
phase: 10-trust-polish
title: Wave 0 test scaffolding & install
status: complete
completed: 2026-07-24
requirements: [TRST-01, TRST-02, SEO-01, ANLY-01, PERF-01]
---

# Plan 10-01 — Summary

**Objective:** Wave 0 — install `jest-axe` and lay down RED test scaffolds that pin the
contracts (rating validation, purchase eligibility, JSON-LD escaping, consent gating,
component a11y) the later plans must satisfy.

## What was built

| Task | Result | Commit |
|------|--------|--------|
| 1. Install `jest-axe` (dev) | `jest-axe` added as devDependency (RESEARCH legitimacy verdict: OK). `lighthouse` deliberately NOT installed — gated to 10-12. | `750dca4` |
| 2. Four logic RED scaffolds | `tests/reviews.test.ts`, `tests/size-guides.test.ts`, `tests/seo.test.ts`, `tests/analytics.test.ts` — assert the pinned signatures; fail at collection until 10-03/07/09/11 create `lib/reviews.ts`/`lib/size-guides.ts`/`lib/seo.ts`/`lib/analytics.ts`. | `a21948d` |
| 3. a11y RED scaffold | `tests/a11y.test.tsx` — jest-axe wired via `expect.extend(toHaveNoViolations)`; three describe blocks (ReviewForm / SizeGuideModal / ConsentBanner). | `7933bc6` |

## Verification

- `npx vitest run`: **56 pre-existing tests pass** (no regression). New scaffolds RED as designed — 3 a11y tests fail at runtime, 4 logic files fail at collection (missing target modules). This is the intended RED baseline.
- Each RED block is independently recoverable: implementing one target module/component flips only its block/file green.

## Deviation (resolved)

The a11y scaffold originally used **literal** dynamic import specifiers
(`await import("@/components/ReviewForm")`). Vite/Vitest resolves literal specifiers at
transform time, which would fail the **entire file** when any one component is still missing —
defeating the plan's requirement that 10-05/10-07/10-09 each green their block independently.
**Fix:** switched all three to a **variable specifier + `/* @vite-ignore */`** so resolution
is deferred to runtime; each block now fails (and later passes) independently. Verified: the
three a11y blocks fail with separate runtime "Cannot find package" errors, not a single
transform-time file error. (A throwaway `tests/probe.test.tsx` used to confirm this behavior
was removed before commit.)

## Interface contracts pinned for downstream

`isValidRating` (1–5 allow-list) · `hasPurchased(userId, slug)` (slug-match) ·
`getRatingSummaries(ids[])` (zero-fills every requested id to `{avg:0,count:0}`) ·
`getSizeGuide(category)` · `buildProductJsonLd` + `serializeJsonLd` (`<`-escape) ·
`trackEvent(name, payload)` (consent-gated). Components are default exports.

## Notes for later plans

- 10-03/07/09/11 must conform their exports to these test files (the scaffolds are the source of truth for names/shapes).
- 10-05/10-07/10-09 each turn exactly one a11y describe block green by implementing their component.
