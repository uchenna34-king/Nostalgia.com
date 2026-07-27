---
plan: 10-08
phase: 10-trust-polish
title: Shipping & returns policy pages + footer/PDP links
status: complete
completed: 2026-07-27
requirements: [TRST-03]
---

# Plan 10-08 — Summary

**Objective:** Ship the shipping & returns trust surface (TRST-03): two static policy
routes with their own metadata + on-brand placeholder copy, linked from the site-wide
Footer and the PDP purchase area.

## What was built

| Task | Result | Commit |
|------|--------|--------|
| 1. `/shipping` page | `app/shipping/page.tsx` — static Server Component, `metadata.title = "Shipping — Nostalgia"`, UI-SPEC §5 editorial layout (`container-x py-16` + `max-w-2xl`, eyebrow "Customer Care", serif h1, `mt-12` h2 sections: Processing & dispatch / Domestic / International + duties / Order tracking). Placeholder copy marked owner-replaceable (D-12); states free shipping over $200 to stay consistent with the PDP bullet. | `00bb5cf` |
| 2. `/returns` page | `app/returns/page.tsx` — mirrors the shipping structure, `metadata.title = "Returns — Nostalgia"`, sections: overview / Return window (30-day) / Condition & eligibility / How to start / Refunds / Exchanges. Placeholder copy (D-12). | `00bb5cf` |
| 3. Link wiring | `components/Footer.tsx` — added `<Link>`s to `/shipping` + `/returns` in the "The House" column (site-wide); the four original placeholder items untouched. `app/product/[slug]/page.tsx` — converted the "Free shipping over $200" and "30-day returns" bullets into links, preserving copy/"— " prefix/order; "Made in limited runs" stays plain text; `force-dynamic` untouched (D-13). | `00bb5cf` |

## Verification

- `npx tsc --noEmit` — **no error references any 10-08 file**; all four typecheck clean. (Remaining project-wide errors are the unchanged 10-01 RED scaffolds.)
- `npx vitest run` — 56 passing tests unaffected; the 3 failing a11y tests + 4 failing logic files are the pre-existing 10-01 RED baseline (no regression).
- **In-browser (dev server :3002):**
  - `/shipping` — tab title "Shipping — Nostalgia", renders inside storefront chrome (Nav/Footer/grain), editorial hierarchy on-brand (screenshot captured).
  - `/returns` — tab title "Returns — Nostalgia", all six sections render (page-text confirmed).
  - PDP (`/product/sepia-wool-overcoat`) — `link "Free shipping over $200" href="/shipping"` and `link "30-day returns" href="/returns"` present in the accessibility tree; "Made in limited runs" is plain text.
  - Footer — DOM query confirms `footer a[href="/shipping"]` and `[href="/returns"]` render site-wide.

## Notes

- Both routes own their base `metadata` — SEO plan 10-11 adds only `sitemap.ts`/`robots.ts` entries and must NOT redeclare these exports.
- Copy is Claude-drafted PLACEHOLDER (D-12): quiet-luxury voice, no PII/addresses/binding legal terms, each page carries a leading owner-replaceable comment. Owner must replace with real terms before go-live.
- Not added to checkout this phase (D-13 scope fence).
