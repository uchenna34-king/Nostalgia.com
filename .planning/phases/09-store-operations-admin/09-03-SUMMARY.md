---
phase: 09-store-operations-admin
plan: 03
status: complete
completed: 2026-07-21
requirements: [ADMN-01]
---

# 09-03 Summary — Admin shell & dashboard

## What was built
- **`app/admin/layout.tsx`**: owner-gated shell. `await requireOwner()` is the first statement (render gate). Renders a cream-dark sidebar ("Nostalgia / Admin" wordmark + `AdminNav`) and a slim top bar (owner email + "View store"); locked cream/ink/sepia + Fraunces/Inter; no grain, no storefront chrome. Doc comment records the per-action gate contract for 09-04/09-06.
- **`components/admin/AdminNav.tsx`** (`"use client"`): Products/Collections/Orders links with sepia active state via `usePathname()`.
- **`app/admin/page.tsx`**: Server Component dashboard — real `Promise.all` counts (product/collection/order) as clickable stat cards; Fraunces display title + sepia eyebrow; `tabular-nums`.

## Deviation (necessary, to satisfy D-14 "no film-grain/marquee inside /admin")
The root `app/layout.tsx` wraps ALL routes (incl. /admin) with the storefront `Nav`/`Footer`/`CartDrawer` and the `grain` body overlay — a child layout cannot remove parent chrome. Rather than restructure all 9 storefront routes into a route group, added a small chrome gate:
- **`components/AppFrame.tsx`** (`"use client"`, NEW): `usePathname()` — on `/admin` renders bare children; elsewhere renders the full storefront frame (grain + Nav + Footer + CartDrawer). Footer (a Server Component) is passed in as a prop.
- **`app/layout.tsx`** (MODIFIED): body drops the hardcoded `grain flex...`; children now route through `<AppFrame footer={<Footer/>}>`. Storefront output is pixel-identical (verified).

## Verification (in-browser, localhost:3002)
- Storefront regression: home renders with Nav + grain, 0 console errors (chrome gate preserves storefront exactly).
- Owner gate — all three states:
  - Signed out → `/admin` redirects to `/signin?callbackUrl=/admin` (middleware).
  - Non-owner (`friend@nostalgia.test`) → `/admin` = branded 404 (`notFound()`), admin existence hidden.
  - Owner (`owner@nostalgia.test`) → `/admin` = dashboard (sidebar + top bar + "View store").
- Dashboard counts are real: `10 PRODUCTS, 2 COLLECTIONS, 0 ORDERS` (matches seed). `noGrain: true`, `noStorefrontNav: true`.
- `npx tsc --noEmit` → exit 0.

## Notes
- Screenshot tool times out in this environment (both storefront and admin) — verified structure/counts via accessibility tree + DOM queries instead.
- Files: app/admin/layout.tsx, app/admin/page.tsx, components/admin/AdminNav.tsx, components/AppFrame.tsx (new), app/layout.tsx (modified).
