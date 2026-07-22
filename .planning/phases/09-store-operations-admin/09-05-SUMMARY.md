---
phase: 09-store-operations-admin
plan: 05
status: complete
completed: 2026-07-21
requirements: [ADMN-03]
---

# 09-05 Summary — Storefront stock-awareness

## What was built
- **`lib/catalog.ts` `buildProductWhere`** (TDD GREEN): added an always-on `inStockClause` (`variants: { some: { stock: { gt: 0 } } }`) to the AND array — one shared where-builder change hides fully-sold-out products from BOTH `/shop` (getCatalog) and every `/collections/[slug]` page (no new query path). Rewrote the `?size=` filter from the SQLite JSON quote-guard to the relational stock-aware form `variants: { some: { size, stock: { gt: 0 } } }` (resolves RESEARCH open question — matches only products offering that size in stock). Updated the module doc comment.
- **`components/AddToCart.tsx`**: size selector now maps `product.variants`; 0-stock sizes are disabled, struck-through, `aria-label="{size} (sold out)"`, and non-selectable. Auto-selects a lone size only if in stock. `handleAdd` blocks a sold-out selection. Fully-sold-out product → disabled "Sold out" add-to-cart button.
- **`tests/catalog.test.ts`** (TDD RED→GREEN): size filter now asserts the relational stock-aware clause + absence of the old `sizes` clause; new assertion that every `buildProductWhere` result carries the in-stock clause; updated the empty-params test.

## Verification (in-browser, localhost:3002)
- `/shop` shows 9 products (was 10): `corduroy-cap` (fully sold out) absent, `heritage-cable-knit` (partial) present.
- `/product/heritage-cable-knit`: size S `disabled` (`aria-label "S (sold out)"`), M/L selectable, "Add to cart" enabled.
- `/product/corduroy-cap` (direct URL — hidden from listings but reachable): "One Size" disabled, add-to-cart = disabled "Sold out".
- `npx vitest run tests/catalog.test.ts` → 33/33; full suite `npx vitest run` → 51/51; `npx tsc --noEmit` → exit 0.

## Notes
- No change to `app/product/[slug]/page.tsx` or `components/ProductCard.tsx` — 09-01 already added the `variants` include to `getProductBySlug`, and no partial-sold-out card badge is required (D-09 only hides *fully* sold-out).
- Deferred (D-10, flagged for Phase 11): server-side sold-out rejection at checkout — the checkout route still validates size *membership*, not *stock*. No auto-decrement this phase.
- Files: lib/catalog.ts, components/AddToCart.tsx, tests/catalog.test.ts.
