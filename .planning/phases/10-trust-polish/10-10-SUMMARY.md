---
plan: 10-10
phase: 10-trust-polish
title: Funnel analytics call sites
status: complete
completed: 2026-07-28
requirements: [ANLY-01]
---

# Plan 10-10 — Summary

**Objective:** Wire the five D-09 funnel events through 10-09's `trackEvent()` at their
natural call sites. Call sites only — no analytics infrastructure added.

## What was built

| Event | Site | Payload (non-PII) |
|-------|------|-------------------|
| `view_product` | `components/ViewProductTracker.tsx` (NEW client island, renders `null`), mounted first inside the PDP `<main>` | `{ productSlug }` |
| `add_to_cart` | `components/AddToCart.tsx` — **success path only**, right after `addItem` (the no-size/sold-out branch returns before it) | `{ productSlug, size }` |
| `begin_checkout` | `app/checkout/page.tsx` — ref-guarded effect declared **above** the early returns (Rules of Hooks), fires once when authenticated with a non-empty cart | `{ itemCount, amount }` |
| `purchase` | `app/order/success/page.tsx` — ref-guarded effect, fires once when an order ref is present | `{ orderId, demo }` |
| `search` | `components/shop/SearchBox.tsx` — inside the existing 300ms debounced `handleSearch`, non-empty terms only | `{ query }` |

## Verification

- `npx tsc --noEmit` clean — the strict `EventName` union from 10-09 means a green typecheck proves all five names and payload shapes are valid.
- Presence greps: each of the five `trackEvent("...")` calls appears exactly at its intended file (1 each).
- **No call site imports `@vercel/analytics` directly** — verified against import lines specifically (an initial file-wide grep false-positived on my own comment prose mentioning the package).
- `npx vitest run` — 85 passing, no regression. The single remaining failure is the ReviewForm a11y scaffold awaiting 10-05.

## PII discipline

Payloads carry only product slug, size, item count, cart subtotal (cents), opaque `orderId` (cuid transaction ref), demo flag, and search term. The checkout page renders `session.user.email` elsewhere but it never enters an event payload; `orderId` is a transaction reference, not a user identifier.

**Deferred:** the PDP is the only place `view_product` fires; the manual dev funnel walkthrough is folded into the 10-12 phase gate (analytics no-ops locally by design, so code-level verification is the meaningful gate here).
