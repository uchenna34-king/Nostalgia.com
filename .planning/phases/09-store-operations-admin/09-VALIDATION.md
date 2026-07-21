---
phase: 9
slug: store-operations-admin
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-20
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Populated from the 6 plans' acceptance criteria after plan-check (2026-07-21).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (installed Phase 8) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run <changed-test-file>` |
| **Full suite command** | `npx vitest run` |
| **Type gate** | `npx tsc --noEmit` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's `npx vitest run <file>` (or `npx tsc --noEmit` for type-only tasks)
- **After every plan wave:** Run `npx vitest run` + `npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite green + `next build` clean
- **Max feedback latency:** 15 seconds

---

## Per-Plan Verification Map

| Plan | Wave | Requirement | Automated Command(s) | Test Type | Status |
|------|------|-------------|----------------------|-----------|--------|
| 09-01 | 1 | ADMN-03, ADMN-04 | `npx prisma validate` · `npx prisma db push` (idempotent 2nd run) · `npm run seed` (exit 0, self-asserts sold-out fixtures) · `npx tsc --noEmit` | schema/integration | ⬜ pending |
| 09-02 | 1 | ADMN-01 | `npx vitest run tests/admin.test.ts` · `npx tsc --noEmit` | unit | ⬜ pending |
| 09-03 | 2 | ADMN-01 | `npx tsc --noEmit` · source-assert `requireOwner` in admin layout | unit + manual | ⬜ pending |
| 09-04 | 3 | ADMN-02, ADMN-03 | grep: `await requireOwner` count == `export async function` count per actions file · `npx tsc --noEmit` | source-assert + manual | ⬜ pending |
| 09-05 | 3 | ADMN-03 | `npx vitest run tests/catalog.test.ts` · `npx tsc --noEmit` | unit | ⬜ pending |
| 09-06 | 3 | ADMN-04 | `npx vitest run tests/orders.test.ts` · `npx tsc --noEmit` | unit | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/admin.test.ts` — `requireOwner`/`isOwnerEmail` gate (09-02, ADMN-01)
- [ ] `tests/catalog.test.ts` — extend with stock-aware `buildProductWhere` clause assertions (09-05, ADMN-03)
- [ ] `tests/orders.test.ts` — `ORDER_STATUSES` allow-list + `isValidOrderStatus` guard (09-06, ADMN-04)
- [ ] vitest already installed (Phase 8) — no framework install needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Non-owner blocked from `/admin` (redirect/404), owner reaches dashboard | ADMN-01 | Session + browser render | Sign in via dev-demo as `owner@nostalgia.test` → /admin renders; sign in as another email → /admin 404s |
| Product create/edit/delete reflects on storefront | ADMN-02 | Cross-route revalidation | Create a product in /admin → GET /shop shows it; delete → gone from /shop, past orders still render |
| Sold-out size disabled on PDP; all-sold-out product hidden | ADMN-03 | Visual/interaction | `corduroy-cap` (fully sold out) absent from /shop; `heritage-cable-knit` size S disabled on its PDP |
| Order fulfillment status advances + tracking/notes persist | ADMN-04 | Admin UI flow | In /admin/orders set an order pending→paid→fulfilled, add tracking number → persists in list/detail |

---

## Validation Sign-Off

- [x] All plans have automated verify commands or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (3 test files above)
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter
- [ ] `wave_0_complete` — set true during execution once the 3 test files exist and pass

**Approval:** approved 2026-07-21 (plan-time; wave_0_complete flips during execution)
