---
phase: 08-merchandising-discovery
plan: 05
subsystem: ui
tags: [nextjs, app-router, searchparams, suspense, use-debounce, catalog]

# Dependency graph
requires:
  - phase: 08-merchandising-discovery (plan 03)
    provides: "getCatalog query-param -> Prisma where/orderBy/pagination builder, PAGE_SIZE, SORT_OPTIONS"
provides:
  - "components/shop/SearchBox.tsx: debounced (~300ms) live search island writing ?q="
  - "components/shop/FilterPanel.tsx: category/size/price/sort controls, desktop sidebar / mobile collapsible, clear-filters"
  - "components/shop/Pagination.tsx: numbered page links from totalPages, preserves all other params"
  - "components/ProductGrid.tsx: shared server component grid with empty state"
  - "app/shop/page.tsx: URL-driven Server Component wired to getCatalog, category pills preserved as fast path"
affects: [08-06, 08-07, 08-08 (PDP/collection pages can reuse ProductGrid), 08-verify (browser UAT of search/filter/sort/paginate)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Component reads searchParams -> getCatalog; small 'use client' islands own URL writes via useSearchParams/useRouter/usePathname"
    - "Every useSearchParams client island gets its own <Suspense> boundary in the page (Pitfall 1) rather than one shared boundary, so each island's fallback is scoped to its own layout slot"
    - "All filter/search-writing controls call params.set('page', '1') before router.replace (Pitfall 5)"

key-files:
  created:
    - components/shop/SearchBox.tsx
    - components/shop/FilterPanel.tsx
    - components/shop/Pagination.tsx
    - components/ProductGrid.tsx
  modified:
    - app/shop/page.tsx

key-decisions:
  - "FilterPanel's size filter uses a static known set (XS, S, M, L, XL) rather than a dynamic per-catalog facet — covers 8/10 seed products; numeric/One-Size products are simply not size-filterable, consistent with CONTEXT.md's 'Claude's discretion' on filter panel specifics"
  - "Price range inputs commit on blur (not per-keystroke) to avoid firing a URL replace on every digit typed into a number input, while search stays debounced per-keystroke per D-02's explicit ~300ms requirement"
  - "Category pills stay server-rendered plain <Link>s (no client JS) since they only need to preserve other params and set one value — no need to duplicate FilterPanel's client logic for the fast path"

patterns-established:
  - "Client islands that read useSearchParams are always wrapped in their own <Suspense> in the parent Server Component page, verified by a real `next build` (not just `next dev`)"

requirements-completed: [DISC-01, DISC-02, DISC-03, CATL-01]

coverage:
  - id: D1
    description: "SearchBox debounces (~300ms) keystrokes and writes ?q= via router.replace, resetting page=1, with defaultValue reflecting a shared/bookmarked URL"
    requirement: DISC-01
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
      - kind: manual_procedural
        ref: "phase browser verification: type in search box, observe URL ?q= update and grid re-render"
        status: unknown
    human_judgment: true
    rationale: "Live debounced UX (timing, URL update, grid re-render) requires browser observation, not just type-checking"
  - id: D2
    description: "FilterPanel writes category/size/price/sort to the URL live with no Apply button, resets page=1, renders as desktop sidebar / mobile collapsible, offers clear-filters"
    requirement: DISC-02
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
      - kind: manual_procedural
        ref: "phase browser verification: toggle category/size/price/sort, confirm live URL + grid updates and page reset"
        status: unknown
    human_judgment: true
    rationale: "Live filter UX and responsive sidebar/collapsible layout require visual/interaction verification"
  - id: D3
    description: "Sort dropdown drives SORT_OPTIONS (price-asc/price-desc/name/newest) through the URL, resetting page=1"
    requirement: DISC-03
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
      - kind: manual_procedural
        ref: "phase browser verification: change sort, confirm grid re-orders and URL updates"
        status: unknown
    human_judgment: true
    rationale: "Sort ordering correctness in the rendered grid needs visual confirmation"
  - id: D4
    description: "app/shop/page.tsx is a Server Component reading full searchParams, calling getCatalog for server-side skip/take/count (no fetch-all-then-slice), with Pagination rendering numbered pages from totalPages and category pills preserved as a fast path"
    requirement: CATL-01
    verification:
      - kind: other
        ref: "npx next build (Suspense boundaries present, no CSR-bailout error)"
        status: pass
      - kind: other
        ref: "npx vitest run (46/46 passing, unaffected)"
        status: pass
    human_judgment: false

# Metrics
duration: 20min
completed: 2026-07-15
status: complete
---

# Phase 08 Plan 05: Shop Search/Filter/Sort/Paginate UI Summary

**URL-driven `/shop` (search, filter, sort, numbered pagination all via `searchParams` -> `getCatalog`) with three Suspense-wrapped client islands (SearchBox, FilterPanel, Pagination) and a shared server-rendered ProductGrid.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- `components/shop/SearchBox.tsx`: `"use client"` debounced (300ms, `use-debounce`) search input writing `?q=` via `router.replace`, uncontrolled `defaultValue` from the current `q` so bookmarked/shared URLs render correctly, always resets `?page=1`
- `components/shop/FilterPanel.tsx`: `"use client"` category/size/price/sort controls, all writing live to the URL with no Apply button, price range commits on blur, category/size use toggle-style buttons matching the PDP size-selector convention, desktop sidebar (`lg:block`) / mobile collapsible toggle, clear-filters affordance that drops `q`/`category`/`size`/`price`
- `components/shop/Pagination.tsx`: numbered page links (condensed with ellipses for many pages) computed from `getCatalog`'s `totalPages`, Prev/Next disabled at bounds, every link preserves all other URL params, hides entirely at `totalPages <= 1`
- `components/ProductGrid.tsx`: extracted the responsive grid markup into a server component taking `products: Product[]`, with a friendly empty state
- `app/shop/page.tsx`: rewritten as an async Server Component reading the full `searchParams` (`q/category/size/price/sort/page`), calling `getCatalog(...)` once for products + `totalPages` + `categories`, rendering the header, the existing category pills as a fast path (server `<Link>`s preserving other params, D-05), `SearchBox`, `FilterPanel`, `ProductGrid`, and `Pagination` — each `useSearchParams` island wrapped in its own `<Suspense>` boundary (Pitfall 1)
- `npx next build`: succeeds, `/shop` route compiles as `ƒ (Dynamic)` with no missing-Suspense error
- `npx tsc --noEmit`: zero errors
- `npx vitest run`: 46/46 passing (unchanged — no test files touched by this plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: SearchBox and Pagination client islands** - `dcbb009` (feat)
2. **Task 2: FilterPanel (category, size, price range, sort)** - `431488c` (feat)
3. **Task 3: ProductGrid + rewrite app/shop/page.tsx with Suspense boundaries** - `ac2ca4d` (feat)

**Plan metadata:** (recorded below after this commit)

## Files Created/Modified
- `components/shop/SearchBox.tsx` - Debounced live search island writing `?q=`
- `components/shop/FilterPanel.tsx` - Category/size/price/sort controls, sidebar/collapsible, clear-filters
- `components/shop/Pagination.tsx` - Numbered pagination reading/writing `?page=`
- `components/ProductGrid.tsx` - Shared server-rendered product grid with empty state
- `app/shop/page.tsx` - Rewritten URL-driven Server Component (searchParams -> getCatalog), Suspense-wrapped islands

## Decisions Made
- Static known size set (`XS, S, M, L, XL`) for the size filter rather than a dynamically derived per-catalog facet — the plan explicitly left this to Claude's discretion (08-CONTEXT.md); adding a `getSizes()` data function was out of this plan's `files_modified` scope and not needed for correctness
- Price range inputs use `onBlur` rather than `onChange`/per-keystroke to avoid a URL replace on every digit; search itself stays debounced per-keystroke per D-02's explicit requirement
- Category pills remain plain server-rendered `<Link>`s (no new client component) since they only need to set one param and preserve the rest — avoids duplicating FilterPanel's client logic for what's meant to stay a lightweight fast path (D-05)

## Deviations from Plan

**Note on Task 1 starting state:** `components/shop/SearchBox.tsx` and `components/shop/Pagination.tsx` were found already present on disk as untracked files at the start of this execution (from a prior interrupted session), matching the plan's Task 1 spec exactly (debounced `?q=` write, `page=1` reset, numbered pagination preserving params, hides at `<=1` page). Verified via `npx tsc --noEmit` and read through in full before committing — no changes were needed, so they were staged and committed as-is under the Task 1 commit rather than rewritten.

None - plan executed exactly as written otherwise.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/shop` is fully URL-driven; `ProductGrid` and the URL-state pattern (searchParams -> getCatalog -> Suspense-wrapped islands) are ready to be reused by 08-08's `/collections/[slug]` route
- Live browser verification (search debounce timing, filter/sort live updates, pagination click-through, shared-URL reproduction) is deferred to the phase-level UAT per the plan's `<verification>` section — flagged as `human_judgment: true` in the coverage block above
- No blockers for downstream plans

---
*Phase: 08-merchandising-discovery*
*Completed: 2026-07-15*

## Self-Check: PASSED

All created/modified files found on disk (components/shop/SearchBox.tsx, components/shop/FilterPanel.tsx, components/shop/Pagination.tsx, components/ProductGrid.tsx, app/shop/page.tsx). All 3 task commits found in git log (dcbb009, 431488c, ac2ca4d).
