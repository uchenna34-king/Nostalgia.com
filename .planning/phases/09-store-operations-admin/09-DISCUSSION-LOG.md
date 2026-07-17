# Phase 9: Store Operations / Admin - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 9-Store Operations / Admin
**Areas discussed:** Admin access model, Product & image editing, Inventory model, Order fulfillment (+ follow-ups: owner email, out-of-stock behavior, stock decrement)

---

## Admin access model

| Option | Description | Selected |
|--------|-------------|----------|
| Env email allowlist | `ADMIN_EMAILS` env var; no schema change; works with Google + dev-demo | |
| role field on User | DB-driven role column; flexible for staff; needs migration + promote path | |
| Single owner email | One owner identified by email; simplest | ✓ |

**User's choice:** Single owner email.
**Follow-up (Owner email):** Options — Your account email via `OWNER_EMAIL` env / A different email / **Placeholder for now** (✓). Chose a placeholder `OWNER_EMAIL` default (`owner@nostalgia.test`), real owner email set at go-live (Phase 11).
**Notes:** Dev-demo login accepts any typed email, so the owner tests locally by signing in as `OWNER_EMAIL`. No `User.role` field.

---

## Product & image editing

| Option | Description | Selected |
|--------|-------------|----------|
| URL entry (add/reorder/remove) | Manage ProductImage rows by URL + alt; no upload infra; collection CRUD folded in | ✓ |
| File upload | Upload files to storage (local/cloud); adds infra | |
| Text fields only | No image editing in admin | |

**User's choice:** URL entry (add/reorder/remove).
**Notes:** Real photography/uploads deferred (PROJECT out-of-scope). Collection create/edit + product-to-collection assignment lands here (closes Phase 8 D-11 deferral).

---

## Inventory model

| Option | Description | Selected |
|--------|-------------|----------|
| Integer count per product | One stock number per product; simplest | |
| Per-size stock | Stock per size variant; realistic for apparel; bigger model change | ✓ |
| In/out toggle only | Boolean in/out-of-stock; no quantity | |

**User's choice:** Per-size stock.
**Follow-up (Out-of-stock behavior):** Options — Disable size + sold-out when all 0 (product stays visible) / **Hide product when fully sold out** (✓) / Flag only, no hard block. Chose to hide fully-sold-out products from listings; per-size selector still disables 0-stock sizes.
**Follow-up (Decrement):** Options — **Admin-managed only this phase** (✓) / Auto-decrement on checkout. Chose admin-managed only; auto-decrement deferred to Phase 11.
**Notes:** Requires a real per-size stock structure (breaks from the JSON `sizes` array). Phase 8 `getCatalog`/`getCollections` must become stock-aware.

---

## Order fulfillment

| Option | Description | Selected |
|--------|-------------|----------|
| Advance a fixed status flow | pending → paid → fulfilled → cancelled via dropdown; else read-only | |
| Status flow + tracking number | The status flow plus an optional tracking-number/notes field | ✓ |
| Mark-fulfilled toggle only | Single fulfilled toggle, no intermediate states | |

**User's choice:** Status flow + tracking number.
**Notes:** `Order.status` (already exists, default "pending") formalized to the four values; add `trackingNumber`/`notes` to `Order`. Order list otherwise read-only.

---

## Claude's Discretion

- Exact per-size stock model (variant table vs JSON map), admin route structure/layout, form-validation UX, the non-owner block mechanism (redirect vs 403 vs 404), hard-delete vs guarded product delete, and how the stock-aware filter is added to the Phase 8 `getCatalog` path.
- Admin UI layout/nav routed to a UI-SPEC pass (ROADMAP UI hint = yes).

## Deferred Ideas

- Auto-decrement stock on customer purchase → Phase 11.
- File upload / cloud image storage for real photography → later (go-live+).
- Role-based / multi-staff admin (`User.role`, permissions) → future.
- Real owner Google email → set `OWNER_EMAIL` at Phase 11.
- Order editing beyond status/tracking (refunds, line-item edits) → out of scope.
