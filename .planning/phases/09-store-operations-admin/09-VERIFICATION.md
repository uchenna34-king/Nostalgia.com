---
phase: 9
slug: store-operations-admin
status: passed
verified: 2026-07-21
method: inline execution — per-plan in-browser verification (executor stalls documented on this Windows machine; verification performed live at localhost:3002 rather than via a separate verifier agent)
---

# Phase 9 — Verification (goal-backward)

**Phase goal:** The owner can run the store with no code — manage products, inventory, and orders.

## Success Criteria (from ROADMAP)

### SC#1 — Only authenticated admins reach the dashboard; everyone else is blocked ✅
- Signed out → `/admin` redirects to `/signin?callbackUrl=/admin` (middleware).
- Authenticated non-owner (`friend@nostalgia.test`) → `/admin` returns a branded 404 (`notFound()`); admin existence hidden.
- Owner (`owner@nostalgia.test`) → `/admin` renders the dashboard.
- Server-side gate `requireOwner()` (lib/admin.ts); every admin Server Action re-checks it as its first line (verified: `requireOwner` count == exported-action count in products/collections/orders actions).
- [ADMN-01] — plans 09-02, 09-03.

### SC#2 — Admin can create/edit/delete products; changes appear on the storefront ✅
- Created "Test Cardigan" (size M, stock 5) via `/admin/products/new` → appeared on `/shop` at `/product/test-cardigan` (revalidatePath).
- Edit page pre-populates all fields incl. per-size stock; delete is a hard delete (Order.items has no FK — order history safe, D-07).
- Images managed by URL (add/reorder/remove); collection membership via checklist. Collection CRUD works (Autumn Archive 4 / Essentials 5).
- [ADMN-02] — plan 09-04.

### SC#3 — Admin sets/adjusts per-product stock; out-of-stock reflects on the storefront ✅
- Per-size stock editor writes `ProductSizeStock` rows (admin-managed only, no auto-decrement, D-10).
- Fully-sold-out product hidden from `/shop` (9 of 10 shown; `corduroy-cap` absent); a sold-out size is disabled on the PDP (`heritage-cable-knit` size S), a fully-sold-out PDP shows a disabled "Sold out".
- Single `buildProductWhere` in-stock clause covers `/shop` AND collection pages.
- [ADMN-03] — plans 09-01, 09-04, 09-05.

### SC#4 — Admin views all orders and updates fulfillment status ✅
- `/admin/orders` lists all orders (id, date, customer email, item count, total, status pill).
- `/admin/orders/[id]` detail renders line items + fulfillment form.
- Status advanced `paid → fulfilled` with tracking number → persisted to DB and reflected in the list; status validated against the `ORDER_STATUSES` allow-list before write.
- [ADMN-04] — plan 09-06.

## Quality gates
- Tests: `npx vitest run` → 56/56 pass (incl. new admin/catalog-stock/orders suites).
- Types: `npx tsc --noEmit` → exit 0.
- Security (ASVS L1): every admin Server Action gates on `requireOwner()` first; explicit field extraction (no mass-assignment); order status allow-listed; hard-delete verified safe.
- Storefront regression: home + shop render unchanged after the root-layout chrome gate.

## Deviations (carried from plan summaries)
- `components/AppFrame.tsx` chrome gate added + root `app/layout.tsx` modified so `/admin` excludes film-grain/storefront chrome (D-14) without restructuring all storefront routes.
- Editor rows submitted as JSON hidden fields; actions return typed results + client navigation (not redirect-in-action); `CollectionTable.tsx` added as the client parallel to `ProductTable`.
- `.env`/`.env.example` not editable (harness permission block) — `OWNER_EMAIL` defaults to `owner@nostalgia.test`; **user must set the real owner email in `.env` at Phase 11 go-live.**

## Deferred to Phase 11 (intentional, per CONTEXT D-10)
- Auto-decrement of stock on customer checkout; server-side sold-out rejection at checkout (checkout still validates size membership, not stock).

**Verdict: PASSED — all 4 success criteria met, ADMN-01..04 delivered.**
