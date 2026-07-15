---
phase: 08-merchandising-discovery
plan: 04
subsystem: frontend
tags: [react-context, localstorage, vitest, wishlist, tdd]

# Dependency graph
requires:
  - phase: 08-merchandising-discovery (plan 01)
    provides: vitest harness (vitest.config.ts, tests/smoke.test.ts)
provides:
  - "lib/wishlist.ts: pure hasItem/addItem/removeItem/toggleItem helpers over WishlistItem[] (no React, no localStorage)"
  - "context/WishlistContext.tsx: WishlistProvider + useWishlist(), localStorage-backed (key nostalgia-wishlist), mirrors CartContext's hydration pattern"
  - "components/WishlistButton.tsx: accessible heart-toggle client component"
  - "components/Providers.tsx: WishlistProvider nested inside CartProvider inside SessionProvider"
affects: [08-05, 08-06, 08-07, 08-08 (any card/PDP UI wanting a save affordance can now import WishlistButton + useWishlist)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure reducer module pattern (mirrors lib/catalog.ts from 08-03): lib/wishlist.ts has zero React/DOM imports, so add/remove/toggle/idempotency are unit-tested without jsdom or a provider"
    - "Context wraps pure helpers pattern: WishlistContext's mutators (toggle/remove) delegate entirely to lib/wishlist.ts; the context itself only owns React state + localStorage hydration/persist effects, exactly mirroring CartContext's structure"
    - "SSR-safe hydration: state starts empty ([]) on both server and first client render; a load-once useEffect populates from localStorage post-mount and a hydrated flag gates the persist-effect from firing before that load completes — identical to CartContext, so WishlistButton's isWishlisted() is stable across hydration with no explicit loading state needed in the button itself"

key-files:
  created:
    - lib/wishlist.ts
    - tests/wishlist.test.ts
    - context/WishlistContext.tsx
    - components/WishlistButton.tsx
  modified:
    - components/Providers.tsx

key-decisions:
  - "WishlistButton accepts the minimal WishlistItem shape ({slug,name,price,image}) rather than the full Product type, so callers on ProductCard/PDP construct it inline (e.g. {slug, name, price, image: product.images[0]}) without a dependency on lib/products.ts"
  - "WishlistButton calls e.preventDefault()/e.stopPropagation() on click since it is designed to sit inside a ProductCard's outer <Link> (per plan's 'corner of a ProductCard' placement) without navigating"
  - "No drawer/auto-open behavior on toggle, per plan: wishlist has no drawer, unlike cart's openDrawer on addItem"

patterns-established:
  - "Second pure-reducer-plus-context pair in the codebase (cart, now wishlist) confirms the pattern is reusable for future client-persisted collections"

requirements-completed: [WISH-01]

coverage:
  - id: D1
    description: "hasItem/addItem/removeItem/toggleItem are pure, immutable, and idempotent; add-then-toggle returns to empty; remove-when-absent is a safe no-op; JSON round-trip preserves shape"
    requirement: WISH-01
    verification:
      - kind: unit
        ref: "tests/wishlist.test.ts (13 tests: hasItem x2, addItem x3, removeItem x3, toggleItem x4, serialization x1)"
        status: pass
      - kind: other
        ref: "npx vitest run (full suite: 46/46 passing)"
        status: pass
    human_judgment: false
  - id: D2
    description: "WishlistContext persists to localStorage key nostalgia-wishlist, hydrates once on mount with a guarded try/catch, and does not disturb CartProvider; WishlistButton toggles and reflects saved state with aria-pressed/aria-label"
    requirement: WISH-01
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
      - kind: manual
        ref: "Browser add/reload persistence check deferred to phase-level verification (per plan's <verification> section)"
        status: pending
    human_judgment: true

duration: 12min
completed: 2026-07-15
status: complete
---

# Phase 08 Plan 04: Wishlist State Layer Summary

**Pure `lib/wishlist.ts` reducer (TDD, 13 Vitest units) plus a `WishlistContext`/`useWishlist`/`WishlistButton` trio cloned structurally from the existing cart, wired into `Providers` without touching `CartProvider`.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-15
- **Completed:** 2026-07-15
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments

- `lib/wishlist.ts`: `WishlistItem` type (`{slug, name, price, image}`) plus `hasItem`, `addItem` (idempotent, no duplicate), `removeItem` (safe no-op when absent), `toggleItem` (add-then-toggle returns to empty). All pure, all return new arrays, zero React/DOM/localStorage imports.
- `tests/wishlist.test.ts`: 13 Vitest units — RED-verified first (import failure against a nonexistent module), then GREEN after implementation. Covers idempotency, no-op removal, toggle round-trip, non-mutation of inputs, and a `JSON.parse(JSON.stringify(items))` serialization round-trip.
- `context/WishlistContext.tsx`: `"use client"` `WishlistProvider` structurally mirroring `CartContext` — load-once hydration `useEffect` reading localStorage key `nostalgia-wishlist` inside a guarded try/catch, a `hydrated` flag gating the persist `useEffect`, and a value of `{items, count, toggle, remove, isWishlisted, clear}` whose mutators delegate to `lib/wishlist.ts`. `useWishlist()` throws outside the provider, matching `useCart`'s guard. No drawer/auto-open (wishlist has none).
- `components/WishlistButton.tsx`: `"use client"` accessible heart-toggle (`aria-pressed`, state-reflecting `aria-label`, inline SVG heart filled when saved), styled with locked tokens (`bg-cream/85`, `text-ink`, `hover:text-sepia`) sized to sit in a card corner; calls `preventDefault`/`stopPropagation` so it can nest inside a `ProductCard`'s `<Link>` without navigating.
- `components/Providers.tsx`: `WishlistProvider` now nests inside `CartProvider` inside `SessionProvider`; `CartProvider`'s own behavior/tree position is unchanged.
- `npx vitest run` (full suite): 46/46 passing (33 pre-existing + 13 new wishlist tests).
- `npx tsc --noEmit`: zero errors.

## Task Commits

Each task was committed atomically (TDD: separate RED/GREEN commits for Task 1):

1. **Task 1a: Write failing wishlist tests (RED)** - `0f45a17` (test)
2. **Task 1b: Implement lib/wishlist.ts (GREEN)** - `78776a2` (feat)
3. **Task 2: WishlistContext, WishlistButton, wire Providers** - `93b8360` (feat)

## Files Created/Modified

- `lib/wishlist.ts` - Pure reducer module: `WishlistItem` type + `hasItem`/`addItem`/`removeItem`/`toggleItem`.
- `tests/wishlist.test.ts` - 13 Vitest units against `lib/wishlist.ts`'s pure functions.
- `context/WishlistContext.tsx` - `WishlistProvider`/`useWishlist`, localStorage-backed under key `nostalgia-wishlist`, cloned from `CartContext`'s hydration/persist pattern.
- `components/WishlistButton.tsx` - Accessible toggle button consuming `useWishlist().toggle`/`isWishlisted`.
- `components/Providers.tsx` - Added `WishlistProvider` nested inside `CartProvider`.

## Decisions Made

- `WishlistButton`'s `product` prop is typed as the minimal `WishlistItem` (not the full `Product`), keeping the button decoupled from `lib/products.ts` — callers construct the shape inline from whatever `Product`-like object they have.
- Click handler calls `preventDefault`/`stopPropagation` in anticipation of the plan's stated placement ("sits cleanly on a ProductCard corner"), where a `ProductCard` wraps the whole card in a `<Link>`; this was not required by any task's `<done>` criteria but avoids an obvious future bug when the button is actually dropped into `ProductCard` in a later plan (Rule 2 — missing critical functionality for the button's stated intended usage).
- No `hydrated`-gating inside `WishlistButton` itself: `isWishlisted()` reads directly from context state, which is empty on the server and on the first client render alike (the context's own `hydrated` flag only gates the *persist* effect, and the *load* effect runs after first paint), so the button's rendered output is already SSR/hydration-stable without extra bookkeeping — same behavior as the cart's nav count badge.

## Deviations from Plan

None - plan executed exactly as written. `preventDefault`/`stopPropagation` on the toggle click (noted above) is a defensive addition anticipating the button's documented placement inside a `ProductCard` `<Link>`, not a deviation from any stated task behavior.

## Known Stubs

None. `WishlistButton` is not yet mounted on `ProductCard` or the PDP — that wiring belongs to whichever later 08-0x plan builds/updates those surfaces (this plan's `files_modified` scope was intentionally limited to the state layer, per its own frontmatter). This is not a stub in the sense of hardcoded empty data; `useWishlist`/`WishlistButton` are fully functional and ready to be dropped in.

## Threat Flags

None beyond the plan's own threat register (T-08-03, localStorage tampering, accepted risk — client-only data, never trusted server-side).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `useWishlist()` and `WishlistButton` are ready to be imported into `ProductCard`, the PDP, and a future `/wishlist` page by later 08-0x plans.
- `WishlistProvider` is confirmed to coexist with `CartProvider` without regressions (full 46-test suite green, `tsc --noEmit` clean).
- No blockers for downstream plans.

---
*Phase: 08-merchandising-discovery*
*Completed: 2026-07-15*

## Self-Check: PASSED

All created files found on disk (lib/wishlist.ts, tests/wishlist.test.ts, context/WishlistContext.tsx, components/WishlistButton.tsx); components/Providers.tsx modification confirmed. All 3 task commits found in git log (0f45a17, 78776a2, 93b8360).
