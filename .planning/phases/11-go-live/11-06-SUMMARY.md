---
plan: 11-06
phase: 11-go-live
title: Order detail route (IDOR-scoped)
status: complete-code / human-verify-pending
completed: 2026-08-24
requirements: [LIVE-04]
---

# Plan 11-06 — Summary

Added the customer order detail route. Code + unit tests done; the plan's Task 3
running-app walkthrough is an owner manual step and remains pending.

## Done
- `app/account/orders/[id]/page.tsx` (new): `findFirst({where:{id,userId}})` scoped by BOTH id and `session.user.id`; falsy-`userId` guard BEFORE the query (blocks the Prisma `undefined`-filter IDOR); `notFound()` on miss (not 403 — "not yours" == "doesn't exist", per requireOwner precedent); anonymous → `/signin`; `force-dynamic`.
- `components/account/OrderDetail.tsx` (new): server-rendered receipt; reuses `parseOrderItems`/`formatPrice` (`.toFixed(0)`); `#{id.slice(-8)}` reference; conditional tracking block (no invented delivery copy); 4-state pills with `sepia-deep` for `paid`; h1→h2 heading order; defensive fallback for unknown status.
- `tests/account-order-detail.test.tsx` (new): 7 tests — reference, items/total, text status label, tracking present/absent, heading order, axe clean.

## Note
- Executor dropped mid-run (connection lost) after writing both source files; the test file was written by the orchestrator and verified. Both source files were complete and tsc-clean on recovery.

## Pending (owner)
- Task 3 blocking human-verify: end-to-end walkthrough of list+detail on a running app incl. an IDOR check (edit URL to a non-owned id → branded 404). Do at UAT.

## Verify
- `npx tsc --noEmit` clean. `npx vitest run tests/account-order-detail.test.tsx` 7/7.
