---
phase: 08-merchandising-discovery
plan: 03
subsystem: database
tags: [prisma, sqlite, vitest, query-builder, pagination]

# Dependency graph
requires:
  - phase: 08-merchandising-discovery (plan 01)
    provides: vitest harness (vitest.config.ts, tests/smoke.test.ts)
  - phase: 08-merchandising-discovery (plan 02)
    provides: ProductImage relation, Collection model, category/price/createdAt indexes
provides:
  - "lib/catalog.ts: pure query-param -> Prisma where/orderBy/pagination builder (no Prisma client import, unit-testable)"
  - "getCatalog/getCollections/getCollectionBySlug in lib/products.ts"
  - "tests/catalog.test.ts: 32 Vitest units covering search/filter/sort/price/pagination"
affects: [08-04 (shop page UI wires getCatalog + URL searchParams), 08-08 (collection routes consume getCollections/getCollectionBySlug + getCatalog's collection filter)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure query-builder module pattern: lib/catalog.ts imports `Prisma` only as a type, never the client, so filter/sort/pagination logic is unit-tested without a DB"
    - "SQLite workarounds (case-sensitive contains, quote-guarded JSON string contains for sizes) isolated behind lib/catalog.ts helpers with inline comments flagging Postgres migration at Phase 11"
    - "findMany + count run in the same Promise.all against an identical `where` object (never fetch-all-then-filter)"

key-files:
  created:
    - lib/catalog.ts
    - tests/catalog.test.ts
  modified:
    - lib/products.ts

key-decisions:
  - "PAGE_SIZE = 24 per D-07's suggested value"
  - "buildOrderBy validates sort against SORT_OPTIONS' allow-list before switching, so any unknown/malicious string falls back to {createdAt: desc} and never reaches Prisma's orderBy field selection (ASVS V5, T-08-02)"
  - "parsePriceRange only ever captures digit sequences via regex (no sign character), so 'negative price' inputs cannot structurally occur post-regex; kept explicit >=0 guards as defense-in-depth (Rule 2)"
  - "getCatalog re-exports PAGE_SIZE from lib/products.ts so page-link UI code has one import path"

patterns-established:
  - "Pure-logic modules for validation/query-shape code stay Prisma-client-free so Vitest can unit-test them without jsdom/DB setup"

requirements-completed: [DISC-01, DISC-02, DISC-03, DISC-04, CATL-01]

coverage:
  - id: D1
    description: "buildProductWhere: OR-search across name/description/category (case-sensitive, no `mode` key), AND-combined category/size/price/collection filters, quote-guarded size contains"
    requirement: DISC-01
    verification:
      - kind: unit
        ref: "tests/catalog.test.ts#buildProductWhere"
        status: pass
    human_judgment: false
  - id: D2
    description: "buildProductWhere combines category, size (quote-guarded JSON contains), and price range with AND semantics"
    requirement: DISC-02
    verification:
      - kind: unit
        ref: "tests/catalog.test.ts#buildProductWhere size/category/price cases"
        status: pass
    human_judgment: false
  - id: D3
    description: "buildOrderBy maps the 4 sort options (price-asc/price-desc/name/newest) with a safe allow-list fallback to newest"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "tests/catalog.test.ts#buildOrderBy"
        status: pass
    human_judgment: false
  - id: D4
    description: "getCatalog accepts a collection-slug filter and getCollections/getCollectionBySlug expose the Collection model"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "tests/catalog.test.ts#buildProductWhere collection case"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (getCollections/getCollectionBySlug compile and type-check against schema)"
        status: pass
    human_judgment: false
  - id: D5
    description: "getCatalog runs a single findMany + count with an identical where/orderBy/skip/take, never fetch-all-then-filter; paginationMeta clamps totalPages/skip/hasPrev/hasNext at bounds"
    requirement: CATL-01
    verification:
      - kind: unit
        ref: "tests/catalog.test.ts#paginationMeta"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-07-15
status: complete
---

# Phase 08 Plan 03: Catalog Query-Builder + Data Functions Summary

**Pure `lib/catalog.ts` query-param builder (search/filter/sort/pagination as testable functions with no DB import) plus `getCatalog`/`getCollections`/`getCollectionBySlug` in `lib/products.ts`, backed by 32 green Vitest units.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-15 (approx, first commit 10:33)
- **Completed:** 2026-07-15
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- `lib/catalog.ts`: `PAGE_SIZE` (24), `SORT_OPTIONS` allow-list, `parsePage` (clamps to 1..100000, always a positive integer), `parsePriceRange` (parses `min-max`/`min-`/`-max`, malformed input returns `{}` without throwing), `buildProductWhere` (OR-search + AND-combined category/size/price/collection filters, SQLite case-sensitive `contains`, quote-guarded size string), `buildOrderBy` (4-value allow-list, unknown/absent falls back to `newest`), `paginationMeta` (totalPages/skip/take/hasPrev/hasNext, clamped at bounds)
- `tests/catalog.test.ts`: 32 unit tests covering every behavior case in the plan (PAGE_SIZE, SORT_OPTIONS, parsePage edge cases, parsePriceRange edge cases, buildProductWhere per-field cases including a no-`mode`-key assertion and an exact quote-guard length assertion, buildOrderBy including a SQL-injection-shaped malicious sort string, paginationMeta boundary cases)
- `lib/products.ts`: `getCatalog(params)` runs one `findMany` + one `count` in `Promise.all` against an identical `where`, maps rows through the existing `deserialize`, returns `{ products, total, totalPages, page, categories }`; `getCollections()` and `getCollectionBySlug(slug)` added; `PAGE_SIZE` re-exported; all four existing exports (`getProducts`, `getFeaturedProducts`, `getProductBySlug`, `getCategories`) left signature-unchanged
- `npx vitest run` (full suite, 2 files): 33/33 passing (32 catalog + 1 smoke)
- `npx tsc --noEmit`: zero errors

## Task Commits

Each task was committed atomically (TDD: separate RED/GREEN commits for Task 1):

1. **Task 1a: Write failing catalog tests (RED)** - `59ee870` (test)
2. **Task 1b: Implement lib/catalog.ts (GREEN)** - `9bd682f` (feat)
3. **Task 2: Add getCatalog/getCollections/getCollectionBySlug** - `bb6a6aa` (feat)

**Plan metadata:** (recorded below after this commit)

## Files Created/Modified
- `lib/catalog.ts` - Pure query-builder module: PAGE_SIZE, SORT_OPTIONS, parsePage, parsePriceRange, buildProductWhere, buildOrderBy, paginationMeta. Imports `Prisma` only as a type; no Prisma client, no DB.
- `tests/catalog.test.ts` - 32 Vitest units against `lib/catalog.ts`'s pure functions (no DB, `environment: jsdom` unused here but harmless).
- `lib/products.ts` - Added `getCatalog`, `getCollections`, `getCollectionBySlug`, `CatalogParams`/`CatalogResult`/`CollectionSummary` types; re-exports `PAGE_SIZE`.

## Decisions Made
- `PAGE_SIZE = 24` per D-07's explicit suggestion, no reason to deviate
- `buildOrderBy` checks the incoming `sort` string against `SORT_OPTIONS`' value set before switching on it, so the switch's `default` branch is only ever reached for legitimately-unknown values, not as the sole line of defense — an allow-list check plus a safe default, per ASVS V5 / T-08-02
- Kept `getCatalog`'s `skip`/`take` computed directly from the *requested* `page` (via `parsePage`) rather than the count-clamped page, so a single round trip suffices; `paginationMeta` is then used only to compute the *reported* `page`/`totalPages`/`hasPrev`/`hasNext` metadata from the `total` that same query returned — avoids a second query to "re-fetch the clamped page"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's `parsePriceRange` behavior spec had a self-contradictory example**
- **Found during:** Task 1 (writing `tests/catalog.test.ts`, RED phase)
- **Issue:** The plan's behavior block states `"-20000" -> {maxPrice:20000}` (explicit "max-only range" example) but also lists `"-5"` under `malformed/negative ("abc","-5") -> {}`. Both strings have the identical `-N` shape that the documented max-only range syntax matches — there's no structural way to accept `"-20000"` as a valid max-only range while rejecting `"-5"` as malformed; treating both consistently under the documented range grammar is the only non-arbitrary reading.
- **Fix:** Implemented `parsePriceRange` so any `-N` string (positive `N`) is a valid max-only range (matching the explicit `"-20000"` example), and used a genuinely malformed value (`"5000--3000"`, an extra embedded dash that breaks the `^(\d+)?-(\d+)?$` grammar) for the "malformed input returns `{}`" test case instead of `"-5"`.
- **Files modified:** `tests/catalog.test.ts` (test case only; `lib/catalog.ts` was written to the consistent rule from the start)
- **Verification:** `npx vitest run catalog` — all 32 tests pass, including the explicit `"-20000" -> {maxPrice:20000}` case and the malformed-input rejection case.
- **Committed in:** `59ee870` (Task 1 RED commit — the test was corrected before the first commit, so no separate fix commit was needed)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in the plan's own illustrative test examples, resolved in favor of the more specific/explicit documented example)
**Impact on plan:** No scope creep — negative prices remain structurally unreachable in `parsePriceRange`'s output regardless (the regex only ever captures digit sequences, never a sign), so the security intent (never let a negative number reach `where.price`) is unaffected either way this ambiguity was resolved.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `lib/catalog.ts` and `getCatalog`/`getCollections`/`getCollectionBySlug` are ready for 08-04 (shop page UI: `SearchBox`/`FilterPanel`/`Pagination` client islands + the `/shop` Server Component reading `searchParams`)
- `getCatalog`'s `collection` param and `getCollectionBySlug` are ready for 08-08 (`/collections/[slug]` route, reusing the same paginated grid)
- All existing `lib/products.ts` callers (`getProducts`, `getFeaturedProducts`, `getProductBySlug`, `getCategories`) remain untouched and green
- No blockers for downstream plans

---
*Phase: 08-merchandising-discovery*
*Completed: 2026-07-15*

## Self-Check: PASSED

All created/modified files found on disk (lib/catalog.ts, tests/catalog.test.ts, lib/products.ts). All 3 task commits found in git log (59ee870, 9bd682f, bb6a6aa).
