---
plan: 10-07
phase: 10-trust-polish
title: Size guides — static config, a11y modal, PDP trigger
status: complete
completed: 2026-07-27
requirements: [TRST-02]
---

# Plan 10-07 — Summary

**Objective:** Deliver Size Guides (TRST-02, D-05/D-06/D-07): a static per-category config, an
accessible in-context modal, and a trigger beside the size selector.

## What was built

| Task | Result | Verify |
|------|--------|--------|
| 1. `lib/size-guides.ts` | Prisma-free `SIZE_GUIDES` (Outerwear/Knitwear/Tees/Accessories), `SIZE_GUIDE_CATEGORIES`, `getSizeGuide()` (trim + case-insensitive; **undefined** for unknown per the test contract). Placeholder "in (cm)" measurements (D-07). | `tests/size-guides.test.ts` 3/3 green |
| 2. `components/SizeGuideModal.tsx` | `"use client"` dialog (prop `sizeGuide`, per the a11y fixture) with the full UI-SPEC §3 a11y contract: role/aria-modal, focus-in, focus trap, Escape, body scroll lock, focus restoration, 44px close, reduced-motion. Semantic `<table>` (caption, `th scope=col`/`scope=row`), `overflow-x-auto`. | `tests/a11y.test.tsx -t SizeGuideModal` green |
| 3. `components/AddToCart.tsx` | "Size guide" trigger beside the "Size" eyebrow (flex-wraps with the size-error span); opens the modal for `getSizeGuide(product.category)` with a Tees fallback for unknown categories. Existing size/cart behavior untouched. | `tsc` clean |

## Verification

- `tests/size-guides.test.ts` 3/3 · `tests/a11y.test.tsx -t SizeGuideModal` 1/1 green · `tsc` clean for all three files.
- **In-browser (dev :3002, PDP sepia-wool-overcoat):** trigger renders; click opens `dialog` "Size guide — Outerwear" with a clean 4-column table (Size/Chest/Length/Sleeve, correct measurements, no duplicated size cells); **Escape closed it, body scroll-lock released (`overflow` restored), focus returned to the "Size guide" trigger** (verified via DOM query).

## Contract reconciliation (test = source of truth over plan prose)

- The RED scaffolds define `SizeGuide` as `{category, caption, columns, rows: {size, cells}[]}` and prop name `sizeGuide` (the plan's `guide`/`rows: string[][]` prose was superseded).
- `size-guides.test` requires `cells.length === columns.length`; the a11y fixture supplies `cells.length === columns.length - 1` with the label in `row.size`. The modal renders `row.size` as the row header + the **trailing** `columns.length - 1` cells — robust to both shapes, so both fixtures render balanced, axe-clean tables.
- `getSizeGuide` returns `undefined` for unknown (test contract); the D-07 "safe default" is honored at the call site (`?? getSizeGuide("Tees")`), so the trigger never crashes.
