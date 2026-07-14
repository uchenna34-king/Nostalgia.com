---
phase: 8
slug: merchandising-discovery
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-14
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (Wave 0 installs — no test framework exists yet) |
| **Config file** | `vitest.config.ts` (Wave 0) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

Unit tests cover the **pure logic** of this phase; **UI flows** are verified in the
browser preview (the project's established E2E method from Milestone 1).

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite green + browser E2E walkthrough
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|-------------|-----------------|-----------|-------------------|--------|
| 08-catalog-query-builder | 1 | DISC-01/02/03 | Server recomputes filters from URL params; never trusts client | unit | `npx vitest run catalog` | ⬜ pending |
| 08-price-range-parse | 1 | DISC-02 | Malformed price params rejected, not thrown | unit | `npx vitest run price` | ⬜ pending |
| 08-wishlist-reducer | 2 | WISH-01 | add/remove/toggle idempotent, persists | unit | `npx vitest run wishlist` | ⬜ pending |
| 08-pagination-math | 1 | CATL-01 | page/skip/take + total pages correct at bounds | unit | `npx vitest run paginat` | ⬜ pending |
| 08-search-ui | 3 | DISC-01 | Debounced search updates URL + results | manual (browser) | E2E walkthrough | ⬜ pending |
| 08-filter-ui | 3 | DISC-02/03 | Filter/sort toggles update URL + grid live | manual (browser) | E2E walkthrough | ⬜ pending |
| 08-pdp-gallery | 3 | PDP-01 | Thumbnails switch main image | manual (browser) | E2E walkthrough | ⬜ pending |
| 08-collections | 3 | DISC-04 | Collection pages list their products, paginated | manual (browser) | E2E walkthrough | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `vitest.config.ts` installed and wired (`npx vitest run` executes)
- [ ] `lib/catalog.ts` (query builder) authored test-first — pure, no Prisma client needed
- [ ] `test/` fixtures for URL-param → where/orderBy cases

*Pure logic (query builder, price parse, pagination math, wishlist reducer) is
extracted into testable modules so it can be unit-tested without a DB or browser.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Search-as-you-type updates results | DISC-01 | Debounce + URL nav is a browser behavior | Type in search, confirm grid + URL update |
| Filter/sort live update | DISC-02/03 | Server round-trip + URL state | Toggle category/size/price/sort, confirm grid |
| PDP multi-image gallery | PDP-01 | Visual interaction | Click thumbnails, confirm main image swaps |
| Wishlist persists across reload | WISH-01 | localStorage | Add to wishlist, reload, confirm still saved |
| Collection pages paginate | DISC-04/CATL-01 | Visual + paging | Open a collection, page through |

---

## Validation Sign-Off

- [ ] All pure-logic tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 installs Vitest and covers query-builder/reducer logic
- [ ] No watch-mode flags (CI-style `vitest run`)
- [ ] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
