---
phase: 08-merchandising-discovery
plan: 06
subsystem: ui
tags: [nextjs, react, gallery, pdp, wishlist, catalog]

# Dependency graph
requires:
  - phase: 08-merchandising-discovery
    provides: per-product ProductImage set (08-02), getCatalog paginated query (08-03), WishlistButton/WishlistContext (08-04)
provides:
  - "Gallery client component: main image + selectable thumbnail row, accessible, single-image degradation"
  - "Rewritten PDP: Gallery-driven images, materials/care detail section, WishlistButton mounted, related products via getCatalog"
affects: [09-admin, 10-trust, ui-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gallery hand-rolled (no carousel library) per RESEARCH anti-patterns, using useState selectedIndex"
    - "PDP related-products query routed through getCatalog({category, page:1}) instead of unbounded getProducts, for CATL-01 consistency"

key-files:
  created: [components/Gallery.tsx]
  modified: ["app/product/[slug]/page.tsx"]

key-decisions:
  - "Gallery.tsx from a prior interrupted run already matched the spec (client component, selectedIndex state, accessible thumbnails, single-image degradation, reduced-motion) — verified against plan and tsc, committed as-is rather than rewritten"
  - "WishlistButton placed inline next to AddToCart (flex row) rather than absolutely positioned, matching the PDP's non-hover static layout (unlike ProductCard's overlay placement)"
  - "Materials & Care section renders only the fields present (materials and/or care independently), omitted entirely when both are null"

patterns-established:
  - "Detail-page richer-content sections follow the existing uppercase-tracking list treatment (ul with '— ' prefixed li items) already used for shipping/returns bullets"

requirements-completed: [PDP-01]

coverage:
  - id: D1
    description: "Gallery client component renders ordered main image + thumbnails, swaps main image on thumbnail click, marks active thumbnail accessibly (aria-current/aria-pressed), degrades to single image with no thumbnail row when only one image exists"
    requirement: "PDP-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Visual/interactive behavior (click-to-swap, accessible focus states, reduced-motion) requires a human to click through thumbnails in a browser; no test suite exists in this project to assert DOM interaction."
  - id: D2
    description: "PDP rewritten to use Gallery, surface materials/care when present, mount WishlistButton, and source related products via getCatalog (bounded/indexed) instead of unbounded getProducts"
    requirement: "PDP-01"
    verification:
      - kind: integration
        ref: "npx next build"
        status: pass
    human_judgment: true
    rationale: "Confirming materials/care display correctly for a product that has them, wishlist save reflecting in nav/wishlist page, and overall visual/aesthetic fidelity requires a human browser check per the plan's own verification section."

# Metrics
duration: 12min
completed: 2026-07-16
status: complete
---

# Phase 08 Plan 06: PDP Gallery & Enrichment Summary

**Multi-image Gallery client component with accessible thumbnail swapping, materials/care detail section, PDP-mounted WishlistButton, and related products sourced via the bounded getCatalog query**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-16T09:18:44Z
- **Completed:** 2026-07-16T09:30:31Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Verified and committed a pre-existing `components/Gallery.tsx` (partial work from an interrupted prior run) that already satisfied the full task spec: client component, `selectedIndex` state, large main image with `aspect-[3/4]`/`object-cover`, accessible thumbnail row (`aria-current`, `aria-pressed`, "View image N of M" labels), single-image degradation, and reduced-motion-safe transitions
- Rewrote `app/product/[slug]/page.tsx` to replace the static image grid with `<Gallery>`, add a "Materials & Care" detail section rendered conditionally on `product.materials`/`product.care`, mount `WishlistButton` next to `AddToCart` with the minimal `{slug, name, price, image}` shape, and swap the unbounded `getProducts(category)` related-products fetch for `getCatalog({category, page: 1})`

## Task Commits

Each task was committed atomically:

1. **Task 1: Gallery client component (main image + thumbnails)** - `8429b76` (feat)
2. **Task 2: Rewrite the PDP to use Gallery, richer details, and WishlistButton** - `5fe01aa` (feat)

**Plan metadata:** (this commit, following SUMMARY)

_Note: No TDD tasks in this plan._

## Files Created/Modified
- `components/Gallery.tsx` - Client component: main image + thumbnail row, selectedIndex state, accessible thumbnail buttons
- `app/product/[slug]/page.tsx` - Rewritten PDP: Gallery-driven images, materials/care section, WishlistButton, getCatalog-sourced related products

## Decisions Made
- Kept the pre-existing untracked `Gallery.tsx` rather than rewriting from scratch — it matched every element of the Task 1 spec and `npx tsc --noEmit` passed cleanly
- Rendered materials/care as two independently-optional `li` entries inside one conditional section, rather than two separate sections, keeping the detail block visually compact
- Positioned `WishlistButton` inline (flex row) beside `AddToCart` rather than as an absolute overlay, since the PDP details column has no image backdrop to float over (unlike `ProductCard`)

## Deviations from Plan

None - plan executed exactly as written. The only notable circumstance was Task 1 starting from partial pre-existing work (per the execution context note), which was verified against the spec rather than rewritten — not a deviation from the plan's intent, just a different starting point for an already-conforming file.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PDP now fully reflects the 08-02 image model and 08-03 catalog query path; no further merchandising-discovery work depends on this plan within the phase
- Browser-based human verification (thumbnail swap, materials/care display, wishlist save reflecting in nav/wishlist page) remains outstanding per the plan's own verification section — deferred to phase-level verify

---
*Phase: 08-merchandising-discovery*
*Completed: 2026-07-16*

## Self-Check: PASSED

- FOUND: components/Gallery.tsx
- FOUND: app/product/[slug]/page.tsx
- FOUND commit: 8429b76
- FOUND commit: 5fe01aa
