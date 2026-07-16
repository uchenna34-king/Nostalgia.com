---
phase: 08-merchandising-discovery
plan: 08
subsystem: ui
tags: [nextjs, react, prisma, catalog, nav, storefront]

# Dependency graph
requires:
  - phase: 08-merchandising-discovery
    provides: getCatalog/getCollections/getCollectionBySlug (08-03), ProductGrid + Pagination pattern from /shop (08-03/08-05), Nav with Cart + Wishlist controls (08-06/08-07)
provides:
  - "/collections index listing seeded curated collections, each linking to its detail page"
  - "/collections/[slug] detail page reusing the same getCatalog + ProductGrid + Pagination path as /shop, filtered by collection"
  - "Nav Collections link discoverable in both desktop and mobile menus"
affects: [phase-9-admin, ui-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Collection detail page mirrors /shop's async Server Component shape exactly: getCatalog({collection, sort, page}) -> ProductGrid + Suspense-wrapped Pagination, no separate collection-specific query"
    - "Unknown collection slug guarded by getCollectionBySlug returning null -> notFound(), rendering the existing branded app/not-found.tsx rather than a custom 404"

key-files:
  created: [app/collections/page.tsx, "app/collections/[slug]/page.tsx"]
  modified: [components/Nav.tsx]

key-decisions:
  - "Collections index card grid styled independently (border-ink/15 cards with name/description/CTA) rather than reusing ProductCard, since collections are not products"
  - "Collection detail page omits FilterPanel/SearchBox (plan marked these optional) — only sort + pagination via getCatalog, keeping scope to what CATL-01/D-12 require"
  - "Collections nav entry placed second, right after Shop and before the category links, as the natural discoverability position for the curated grouping"

patterns-established:
  - "Curated-grouping listing routes (collections) share the exact query/grid/pagination infrastructure as the main catalog route (/shop), differing only in the getCatalog filter parameter used"

requirements-completed: [DISC-04, CATL-01]

coverage:
  - id: D1
    description: "A /collections index lists the seeded curated collections, each linking to its page"
    requirement: "DISC-04"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: true
    rationale: "Confirming the collection cards render correctly and link to the right detail pages requires a human browser check per the plan's own verification section."
  - id: D2
    description: "A /collections/[slug] page lists only that collection's products using the same paginated grid as /shop"
    requirement: "CATL-01"
    verification:
      - kind: integration
        ref: "npx next build"
        status: pass
    human_judgment: true
    rationale: "Confirming pagination, product filtering by collection, and the not-found path for an unknown slug requires a human browser check per the plan's own verification section."
  - id: D3
    description: "Collections are reachable from the nav (desktop and mobile)"
    verification:
      - kind: unit
        ref: "npx tsc --noEmit && npx next build"
        status: pass
    human_judgment: true
    rationale: "Confirming the nav link renders correctly in both desktop and mobile menus, alongside the intact Wishlist/Cart controls, requires a human browser check."

# Metrics
duration: 10min
completed: 2026-07-16
status: complete
---

# Phase 08 Plan 08: Curated Collections (index, detail, nav link) Summary

**A /collections index and /collections/[slug] detail page reusing the exact getCatalog + ProductGrid + Pagination path from /shop, plus a Collections nav link — the final plan of Phase 8**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-16T09:49:00Z
- **Completed:** 2026-07-16T09:51:33Z
- **Tasks:** 3 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Created `app/collections/page.tsx`: async Server Component calling `getCollections()`, rendering a header consistent with `/shop` and a responsive grid of collection cards (name, description, link to detail page), with a friendly empty state and no management affordance (D-11 deferred to Phase 9)
- Created `app/collections/[slug]/page.tsx`: async Server Component calling `getCollectionBySlug(params.slug)` (guarding unknown slugs via `notFound()`), then `getCatalog({ collection: params.slug, sort, page })` rendered through the shared `ProductGrid` and a `Suspense`-wrapped `Pagination`, matching `/shop`'s exact pattern (D-12, CATL-01, Pitfall 1)
- Added a "Collections" entry to `components/Nav.tsx`'s `LINKS` array (shared by desktop and mobile menus), preserving the existing Wishlist and Cart controls untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: Collections index page** - `3fc1d18` (feat)
2. **Task 2: Collection detail page (reuses the paginated grid)** - `e33a089` (feat)
3. **Task 3: Add a Collections link to the nav** - `bba2603` (feat)

_Note: No TDD tasks in this plan._

## Files Created/Modified
- `app/collections/page.tsx` - Collections index listing all seeded collections
- `app/collections/[slug]/page.tsx` - Collection detail page, filtered getCatalog + shared grid/pagination
- `components/Nav.tsx` - Added Collections link to LINKS array (desktop + mobile)

## Decisions Made
- Collections index uses its own card layout (bordered box with name/description/CTA) rather than reusing `ProductCard`, since a `CollectionSummary` is not a `Product`
- Collection detail page keeps FilterPanel/SearchBox out of scope (plan marked optional), including only sort + pagination to satisfy CATL-01/D-12 without scope creep
- Collections link placed second in `LINKS`, immediately after Shop, ahead of the category shortcuts, as the clearest discoverability position for the curated grouping

## Deviations from Plan

None - plan executed exactly as written across all three tasks.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 8 (merchandising-discovery) is now fully delivered: all 8 plans complete, including scalable catalog querying, filters/search, wishlist, PDP gallery, and now curated collections
- Browser-based human verification (click through a collection, paginate, hit an unknown slug, confirm nav link on desktop/mobile) remains outstanding per the plan's own verification section — deferred to phase-level verify
- Collection management (create/edit) is explicitly deferred to the Phase 9 admin (D-11) — no admin UI exists yet for collections

---
*Phase: 08-merchandising-discovery*
*Completed: 2026-07-16*

## Self-Check: PASSED
