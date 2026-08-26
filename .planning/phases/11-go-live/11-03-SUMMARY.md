---
plan: 11-03
phase: 11-go-live
title: Account order list (Server Component)
status: complete
completed: 2026-08-24
requirements: [LIVE-04]
---

# Plan 11-03 — Summary

Restructured `/account` into an async Server Component and added the order list (detail route is 11-06).

## Done
- `app/account/page.tsx`: now async Server Component using `getServerSession(authOptions)`; **falsy-`userId` guard (redirect) BEFORE** the single `findMany({where:{userId}})` — blocks the Prisma `undefined`-filter IDOR that would else return all orders. Greeting unchanged.
- `components/account/OrderList.tsx` (new): pure `toOrderRows()`, table (>=640px) / card stack (<640px), 4-state text-labelled status pills (`paid` uses `sepia-deep` on cream-dark, not raw sepia; admin `pillClass` NOT copied), branded empty state, `sr-only` h2 for heading order. Reuses `parseOrderItems`/`formatPrice` (`.toFixed(0)` kept).
- `components/account/AccountAuthActions.tsx` (new): client island for signed-out + sign-out.
- `tests/account-orders.test.tsx` (new): 17 tests incl. axe + `findMany` called exactly once.

## Verify
- `npx tsc --noEmit` clean. `npx vitest run` 134/134. `app/account/orders/[id]` intentionally not created (11-06).
