---
plan: 10-12
phase: 10-trust-polish
title: Performance & accessibility pass + Lighthouse verification
status: complete-with-documented-gap
completed: 2026-07-29
requirements: [PERF-01]
---

# Plan 10-12 — Summary

**Objective:** Final cross-cutting pass (PERF-01, D-15) — migrate images to `next/image`,
remediate accessibility, and measure Lighthouse against a **production** build.

## Results

**Accessibility target (100): MET on every route and both presets.**
**Performance target (≥90): met on desktop; NOT met on mobile — documented below.**

| Route | Preset | Performance | Accessibility |
|-------|--------|-------------|---------------|
| `/` | desktop | **90** ✅ | **100** ✅ |
| `/shop` | desktop | **96** ✅ | **100** ✅ |
| `/product/sepia-wool-overcoat` | desktop | **98** ✅ | **100** ✅ |
| `/` | mobile | 82 ❌ | **100** ✅ |
| `/shop` | mobile | see note | **100** ✅ |
| `/product/sepia-wool-overcoat` | mobile | see note | **100** ✅ |

Measured with `npx lighthouse` (v13.4.1) against `npm run build` + `npm run start -- -p 3002`
— a production build, never `next dev` (RESEARCH Pitfall 6).

## Accessibility: 96 → 100, via five real defects fixed

None of these were fixed by weakening a test or lowering a target.

| Audit | Defect | Fix |
|-------|--------|-----|
| `color-contrast` | sepia `#A6552F` on `bg-ink` (home editorial band) measured **3.28:1**, below the 4.5:1 AA floor | new `sepia-light` `#C97A4A` → **5.28:1**, used only on dark backgrounds |
| `color-contrast` | sepia on `cream-dark` (footer eyebrows) measured **4.01:1**; on cream a marginal 4.59:1 | new `sepia-deep` `#8A4524` for `.eyebrow` → **5.37 / 6.15:1** |
| `label-content-name-mismatch` | Nav wishlist/cart had visible text "Wishlist 3" but accessible name "Open wishlist" — breaks **WCAG 2.5.3 Label in Name**; a speech-input user saying "click Wishlist" would not match | removed the redundant `aria-label` so the visible text *is* the accessible name |
| `heading-order` | `/shop` and `/collections/[slug]` jumped **h1 → h3** (ProductCard names), breaking heading navigation | added an `sr-only` `<h2>Products</h2>` section heading |
| `select-name` | the sort `<select>` had only a visual `<p>` "Sort by", never associated — announced as an unlabelled combo box | `aria-label="Sort by"`, matching the price inputs' existing pattern |

The locked sepia accent `#A6552F` was **not** changed. Two AA-passing siblings were added and
applied only where measurement showed a failure.

`select-name` is worth noting: it scored 100 on mobile and only failed on **desktop**, because
the filter panel is hidden at mobile widths. Testing one viewport would have missed it.

## Performance: desktop passes; mobile is not reliably measurable here

Desktop meets the target on all three routes (90 / 96 / 98).

Mobile does not, and **the local numbers are too noisy to report as fact.** Three consecutive
runs of the *identical* build on `/shop` produced:

| Run | Performance | Speed Index | LCP | TBT |
|-----|-------------|-------------|-----|-----|
| 1 | 76 | 2.9 s | 3.7 s | 490 ms |
| 2 | 61 | 4.4 s | 3.6 s | 1,590 ms |
| 3 | 81 | 3.4 s | 3.5 s | 340 ms |

A **61–81 spread with TBT varying 4.7×** on unchanged code is CPU contention on this machine
(Lighthouse mobile applies a 4× CPU throttle on top of an already-busy host), not application
behaviour. Earlier passes on the same code scored 85 / 85 / 88.

**The one stable mobile signal is LCP ≈ 3.5 s**, and its cause is identifiable rather than
mysterious:

- `mainthread-work-breakdown` is dominated by **Style & Layout (~1,520 ms)** while total JS is
  small (largest chunk 53 KB) and `CLS` is ~0 and `TBT` is 30 ms in quiet runs. That profile
  points at paint cost, not script cost.
- The two plausible contributors are both **locked brand elements**: the full-viewport
  `feTurbulence` film-grain overlay (procedural noise rasterized across the screen) and the
  infinite marquee — a continuously animating viewport never reaches "visually complete", which
  is precisely what Speed Index measures.

Fixing either would mean altering the locked aesthetic, which is a design decision for the
owner and outside this plan's mechanical-optimization scope. **Documented rather than silently
marked passed**, per the plan's instruction.

**Recommendation for Phase 11:** re-measure on real hosting with real raster photography. Local
localhost scores with 1.2 KB placeholder SVGs are not representative in either direction — the
image weight flatters the score, while the throttled busy host depresses it.

## Optimizations shipped (Tasks 1–2, commit `5ceebfe`)

- `next/image` on all four image surfaces via `fill` + `sizes`; `priority` on the two Hero
  images and the Gallery main image (LCP candidates), lazy everywhere else. Alt text preserved
  verbatim; decorative images stay `alt=""`/`aria-hidden`; Gallery keeps its
  `aria-pressed`/`aria-current` thumbnail semantics; `motion-reduce:transition-none` added to
  the ProductCard hover zoom.
- Global `:focus-visible` sepia ring (2px + 2px offset) — verified on a real Tab press as
  `solid 2px rgb(166, 85, 47)`. No default outline is suppressed anywhere.
- `next.config.js` images config for the first-party placeholder SVGs.

**Root cause fixed during Task 1:** every optimizer request was 400ing. Next 14.2.35's
`detectContentType` recognises SVG **only** by the `<?xml` prolog magic bytes — there is no
`<svg` branch — so our bare-`<svg>` placeholders were rejected *before* `dangerouslyAllowSVG`
was ever consulted, which is why the flag appeared inert. Fixed by prepending the
standards-valid XML prolog to all 20 placeholders, rather than per-tag `unoptimized` (which
would have to be found and removed when real photography lands, and would silently ship real
raster images unoptimized if missed).

## Verification

- `npm run build` — clean. `npx tsc --noEmit` — clean. `npx vitest run` — **102/102**.
- `tests/a11y.test.tsx` — 5/5 (ReviewForm, SizeGuideModal, ConsentBanner, RatingStars).
- All image URLs across the three routes return 200 in the production build.
- Lighthouse artifacts (`lh-*.json`) were measurement-only and removed; scores recorded above.

## Package legitimacy (Task 3)

`lighthouse` was flagged **SUS** on publish recency only. Provenance presented to the owner
(official `github.com/GoogleChrome/lighthouse`, ~3.6M weekly downloads, exact package name, no
typosquat signal) and **approved by the owner**, run via **`npx`** — no persistent install, no
entry added to `package.json`, and never a runtime dependency of the shipped storefront.
