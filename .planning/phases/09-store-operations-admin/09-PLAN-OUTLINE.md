# Phase 9 — Plan Outline (chunked mode)

Decomposition authored by orchestrator after the single-pass planner stalled (Windows SSE idle timeout). Per-plan content is written by scoped gsd-planner subagents, then verified by gsd-plan-checker.

| Plan ID | Objective | Wave | Depends On | Requirements |
|---------|-----------|------|------------|--------------|
| 09-01 | Data-layer foundation: add `ProductSizeStock` model (mirror `ProductImage`), formalize `Order.status` values + add `Order.trackingNumber`/`notes`; `[BLOCKING]` `npx prisma db push`; reseed with per-size stock + starter collections; extend `lib/products.ts` deserialize to surface variants | 1 | — | ADMN-03, ADMN-04 |
| 09-02 | Owner-email auth gate: `OWNER_EMAIL` env (placeholder `owner@nostalgia.test`), `requireOwner()` server helper, `middleware.ts` matcher for `/admin/**`, and the mandatory per-action/route re-check pattern (Server Actions are public endpoints) | 1 | — | ADMN-01 |
| 09-03 | Admin shell: `/admin` route group + layout/nav + dashboard landing per the approved 09-UI-SPEC (dense back-office, locked design system, no grain/marquee); every admin page calls `requireOwner()` | 2 | 09-02 | ADMN-01 |
| 09-04 | Product & collection management: product create/edit/delete Server Actions (explicit field extraction, `requireOwner()` first line), image-by-URL `ProductImage` add/reorder/remove, Collection CRUD (closes Phase 8 D-11), per-size stock editing; storefront revalidated on mutation | 3 | 09-01, 09-03 | ADMN-02, ADMN-03 |
| 09-05 | Storefront stock-awareness: `getCatalog`/`getCollections` `buildProductWhere` gains `{ variants: { some: { stock: { gt: 0 } } } }` (hide all-sold-out); PDP size selector disables sold-out sizes + blocks add-to-cart; sold-out badges | 3 | 09-01 | ADMN-03 |
| 09-06 | Orders & fulfillment: admin orders list (all orders, read-only) + order detail; status flow pending→paid→fulfilled→cancelled via allow-list-before-write; set `trackingNumber`/`notes` | 3 | 09-01, 09-03 | ADMN-04 |

**Requirement coverage:** ADMN-01 → 09-02, 09-03 · ADMN-02 → 09-04 · ADMN-03 → 09-01, 09-04, 09-05 · ADMN-04 → 09-01, 09-06.

## OUTLINE COMPLETE
Plan count: 6
