---
phase: 08-merchandising-discovery
plan: 07
subsystem: ui
tags: [nextjs, react, wishlist, nav, storefront]

# Dependency graph
requires:
  - phase: 08-merchandising-discovery
    provides: WishlistButton/WishlistContext (08-04), cart nav badge pattern (existing Nav.tsx/CartContext)
provides:
  - "ProductCard wishlist toggle on every product card, non-navigating"
  - "Nav Wishlist link with live count badge beside Cart"
  - "/wishlist page listing saved items with remove controls and empty state"
affects: [08-08, ui-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wishlist nav badge mirrors the cart badge exactly: no explicit hydrated-guard state, relies on WishlistContext's client-only useEffect load so SSR and first client render both show 0/empty, avoiding a hydration mismatch warning"
    - "/wishlist page follows the /cart page shape: early-return empty state, then header + responsive grid, reading context directly with no server fetch"

key-files:
  created: [app/wishlist/page.tsx]
  modified: [components/ProductCard.tsx, components/Nav.tsx]

key-decisions:
  - "Nav Wishlist link uses next/link (not a button) since it navigates to /wishlist, styled identically to the adjacent Cart button (same classes, same badge pill)"
  - "/wishlist grid reuses ProductCard's image/name/price layout convention directly rather than importing ProductCard, since the wishlist item shape (WishlistItem) differs from the full Product type ProductCard expects"

patterns-established:
  - "Denormalized-snapshot list pages (cart, wishlist) both render directly from client context with no server fetch, sharing the same empty-state/header/grid shape"

requirements-completed: [WISH-01]

coverage:
  - id: D1
    description: "Every product card shows a wishlist toggle; saving/unsaving from a card persists"
    requirement: "WISH-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Visual placement and click-without-navigate behavior requires a human to click the toggle on a rendered card in a browser."
  - id: D2
    description: "The nav has a Wishlist affordance beside the cart, with a count badge mirroring the cart"
    requirement: "WISH-01"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Confirming the badge increments live after a save and matches the cart's visual treatment requires a human browser check."
  - id: D3
    description: "A /wishlist page lists saved items with a link to each product, remove controls, and a friendly empty state"
    requirement: "WISH-01"
    verification:
      - kind: integration
        ref: "npx next build"
        status: pass
    human_judgment: true
    rationale: "Confirming remove-then-persist-after-reload and the empty-state transition requires a human browser check per the plan's own verification section."

# Metrics
duration: 18min
completed: 2026-07-16
status: complete
---

# Phase 08 Plan 07: Wishlist Surfacing (ProductCard, Nav, /wishlist page) Summary

**Wishlist toggle on every product card, a Nav entry beside Cart with a live count badge, and a client-rendered /wishlist page with remove controls and empty state**

## Performance

- **Duration:** ~18 min (includes a mid-run infrastructure stall between Task 1 and Task 2/3)
- **Tasks:** 3 completed
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Added `WishlistButton` to `components/ProductCard.tsx`, positioned top-right opposite the category tag, with click-propagation stopped so toggling save does not navigate to the PDP
- Added a Wishlist `Link` to `components/Nav.tsx` beside the existing Cart control, reading `useWishlist().count` and rendering the same ink count-badge pill, styled identically to Cart
- Created `app/wishlist/page.tsx` as a `"use client"` page reading `useWishlist()` directly: header consistent with `/shop`/`/cart`, responsive grid of saved items (image, name, formatted price, link to `/product/[slug]`, remove button), and a friendly branded empty state linking to `/shop`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add WishlistButton to ProductCard** - `b8b47c7` (feat)
2. **Task 2: Add a Wishlist entry to the nav** - `0eb9cff` (feat)
3. **Task 3: Build the /wishlist page** - `e97a7d5` (feat)

_Note: No TDD tasks in this plan._

## Files Created/Modified
- `components/ProductCard.tsx` - Wishlist toggle overlay, non-navigating (Task 1, prior run)
- `components/Nav.tsx` - Wishlist link + count badge beside Cart
- `app/wishlist/page.tsx` - New client page listing saved items, remove controls, empty state

## Decisions Made
- Nav Wishlist control uses `next/link` styled to match the Cart `button` exactly (same badge pill classes) rather than introducing a new visual treatment
- `/wishlist` page's grid renders item fields directly (not via `ProductCard`) since `WishlistItem` is a denormalized snapshot, not a full `Product`
- No explicit `hydrated` boolean gate on the wishlist count/list rendering — mirrors the existing cart pattern where SSR and first client render both show the empty/zero state before the client-only `useEffect` loads real data, avoiding a hydration mismatch without extra state

## Deviations from Plan

None - plan executed exactly as written across all three tasks. Execution was split across two sessions (Task 1 completed and committed in a prior run before an infrastructure stall; Tasks 2 and 3 completed in this resumed run) but no plan content changed as a result.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Wishlist is now reachable from every product card, the nav, and its own listing page — 08-08 (Collections) can proceed independently since it only adds a separate Collections nav link, not a wishlist change
- Browser-based human verification (save from a card and PDP, nav badge increments, remove-then-reload persistence, empty-state transition) remains outstanding per the plan's own verification section — deferred to phase-level verify

---
*Phase: 08-merchandising-discovery*
*Completed: 2026-07-16*

## Self-Check: PASSED
