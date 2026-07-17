# Phase 9: Store Operations / Admin - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver an **authenticated, no-code admin area** where the single store owner runs the
store without touching code: **product CRUD** (including images and collection
membership), **per-size inventory** management, and **order viewing + fulfillment**.
The admin dashboard and every admin action are **owner-gated** — non-owners and
anonymous visitors are hard-blocked server-side.

Requirements in scope: ADMN-01 (admin-gated dashboard), ADMN-02 (product CRUD → reflects
on storefront), ADMN-03 (per-product/-size stock → out-of-stock reflects on storefront),
ADMN-04 (view all orders + update fulfillment status).

**Not in this phase:** reviews / SEO / size guides / analytics (Phase 10); real Google
OAuth, real Stripe, confirmation emails, Postgres, deployment (Phase 11); customer-facing
account/order-history changes; refunds or line-item order edits.

</domain>

<decisions>
## Implementation Decisions

### Admin Access & Authorization (ADMN-01)
- **D-01:** A **single store owner, identified by email**. The gate reads an
  `OWNER_EMAIL` env var; use a **placeholder default `owner@nostalgia.test`** for now and
  set the real owner Google email in `.env` at go-live (Phase 11). Do NOT hardcode a real
  email in source.
- **D-02:** The admin dashboard and all admin routes/mutations are gated by comparing the
  authenticated session email to `OWNER_EMAIL`. The block MUST be a real server-side check
  (middleware and/or per-route/server-action guard), not just hidden UI. Non-owners →
  blocked (redirect to sign-in or 403/404, planner's discretion). In dev the demo login
  accepts any typed email, so the owner tests locally by signing in as `OWNER_EMAIL`.
- **D-03:** No `User.role` field — single-owner-by-email is sufficient. Role-based /
  multi-staff admin is explicitly deferred (see Deferred Ideas).

### Product Management (ADMN-02)
- **D-04:** Admin can **create, edit, and delete products** through the UI; changes appear
  on the storefront (SC#2). Editable fields: name, slug, price (cents), category,
  description, materials, care, sizes, featured, plus images and collection membership.
- **D-05:** Product **images are managed by URL entry** — admin adds / reorders / removes
  `ProductImage` rows (url + alt + position). **No file-upload/storage infra this phase**
  (real photography + uploads come later, per PROJECT out-of-scope). This keeps the phase
  about the *structure*, not the images.
- **D-06:** **Collection management is folded in here** (deferred from Phase 8 D-11): admin
  can create / edit / delete `Collection`s and assign products to them.
- **D-07:** Product **delete** must not corrupt order history. `Order.items` is a JSON
  snapshot, so past orders are safe; planner decides hard-delete vs a guard/soft-delete —
  just don't break existing-order display.

### Inventory (ADMN-03)
- **D-08:** Stock is tracked **per size**. Each product's sizes carry their own stock count.
  This needs a proper structure (e.g. a related `ProductVariant` / `ProductSizeStock` row:
  `productId` + `size` + `stock`) rather than the current JSON `sizes` array — researcher/
  planner choose the exact model; it must work on SQLite now and survive the Phase 11
  Postgres migration. Admin sets/adjusts per-size counts.
- **D-09:** **Storefront out-of-stock behavior:** a size at 0 stock is disabled / marked
  "Sold out" in the PDP size selector and cannot be added to cart. A product whose sizes are
  **ALL 0 is HIDDEN** from `/shop` and collection listings (removed until restocked).
  ⇒ The Phase 8 catalog query path (`getCatalog` / `getCollections`) MUST become
  **stock-aware** and filter out fully-sold-out products.
- **D-10:** Stock is **admin-managed only this phase — no auto-decrement on customer
  checkout**. Auto-decrement is deferred to Phase 11 (real checkout rework). This satisfies
  ADMN-03 (admin sets/adjusts + storefront reflects) without touching the order path now.

### Order Management & Fulfillment (ADMN-04)
- **D-11:** Admin can **view ALL orders** (items, total, customer email, date, status) —
  SC#4. The order list is read-only except the fulfillment controls below.
- **D-12:** Fulfillment is a **fixed status flow: pending → paid → fulfilled → cancelled**,
  advanced by the admin via a dropdown/action. The existing `Order.status` string is
  formalized to these values.
- **D-13:** Each order gains an **optional tracking number** (and notes) the admin can set —
  add `trackingNumber String?` (and optional `notes String?`) to `Order`.

### Admin UI Shape (UI-SPEC + planner discretion)
- **D-14:** The admin lives under its **own route section (e.g. `/admin`)** with its own
  layout/nav — a back-office surface that still respects the locked "nostalgic luxury
  streetwear" aesthetic. Exact dashboard layout/nav is a UI-SPEC concern (ROADMAP UI hint =
  yes → a `/gsd-ui-phase 9` pass is appropriate before or during planning).

### Claude's Discretion
- Exact per-size stock model (variant table vs JSON map), admin route structure and layout,
  form-validation UX, the non-owner block mechanism (redirect vs 403 vs 404),
  hard-delete vs guarded delete for products, and precisely how the stock-aware filter is
  added to the Phase 8 `getCatalog` path — planner/researcher choose, consistent with the
  locked design system, dev-runnability, and the SQLite-now / Postgres-later constraint.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project decisions & scope
- `.planning/PROJECT.md` — locked aesthetic + tech stack, single-owner / no-code framing, "images supplied later" scope
- `.planning/ROADMAP.md` §"Phase 9: Store Operations / Admin" — goal + 4 success criteria (UI hint: yes)
- `.planning/REQUIREMENTS.md` — ADMN-01..04 acceptance text
- `.planning/phases/08-merchandising-discovery/08-CONTEXT.md` §D-11 — collection management deferred INTO this phase

### Existing implementation to extend
- `prisma/schema.prisma` — `Product`, `ProductImage`, `Collection`, `Order` (already has a `status` string, default "pending"), `User` (no role field). Add per-size stock structure + `Order.trackingNumber`/`notes`; formalize `Order.status` values.
- `lib/auth.ts` — NextAuth config: Google provider + dev-demo credentials provider (accepts any typed email, default `friend@nostalgia.test`). The owner gate hooks into the session here.
- `app/api/auth/[...nextauth]/route.ts` — auth route handler.
- `lib/products.ts` + `lib/catalog.ts` — Phase 8 catalog query builders (`getCatalog`/`getCollections`/`getProductBySlug`). MUST become stock-aware (hide fully-sold-out products); the pure `where`-builder in `lib/catalog.ts` is the likely home for the stock filter.
- `app/api/checkout/route.ts` — creates `Order` with `status: "pending"`; already validates `size` (Phase 8 review). Fulfillment status values are formalized here.
- `app/product/[slug]/page.tsx` + `components/AddToCart.tsx` — PDP size selector; per-size sold-out disabling lands here.
- `components/ProductCard.tsx`, `app/shop/page.tsx`, `app/collections/[slug]/page.tsx` — sold-out badges + hidden-when-fully-sold-out filtering.
- `prisma/seed.ts` — seed per-size stock counts + starter collections.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/auth.ts` `getServerSession`/session pattern — reuse for the owner-email gate.
- Phase 8 `lib/catalog.ts` query-piece builder — extend with a stock-aware `where` clause.
- `components/ProductCard.tsx` / `ProductGrid.tsx` / `Pagination.tsx` (Phase 8) — reuse to list/manage products in the admin.
- `lib/products.ts` `formatPrice` (integer cents) — reuse across admin views.

### Established Patterns
- Server Components fetch via `lib/products.ts`; interactivity lives in `"use client"` islands. Admin forms follow the same split: client form islands + server actions (or admin route handlers) for mutations.
- Prisma models use `cuid` ids; arrays (sizes, order items) are JSON-encoded strings — **per-size stock is the first break from the JSON-array pattern toward a real related table.**
- Prices are integer cents throughout.

### Integration Points
- New `/admin` route section gated by the owner-email check (middleware and/or per-route/server-action guard).
- Schema migration: add per-size stock structure + `Order.trackingNumber`/`notes`; formalize `Order.status` enum values.
- **Phase 8 `getCatalog`/`getCollections` must filter out fully-sold-out products** — the key cross-phase link.
- Product/collection create/edit/delete via server actions or admin API routes; storefront reflects changes immediately (SSR/`force-dynamic`).

</code_context>

<specifics>
## Specific Ideas

- The admin should read as a **back-office surface** but stay on-brand (nostalgic luxury streetwear) — not a generic dashboard theme.
- Collection management (create/edit/curate + product assignment) explicitly lands here, closing the Phase 8 D-11 deferral.
- The owner tests locally by signing in via the dev-demo login using the `OWNER_EMAIL` address.
- Fulfillment reads as a simple linear pipeline (pending → paid → fulfilled → cancelled) with an optional tracking number — enough for a single owner shipping orders by hand.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-decrement stock on customer purchase** — Phase 11 (real checkout/order rework).
- **File upload / cloud image storage** for real photography — later (go-live or beyond); this phase manages images by URL.
- **Role-based / multi-staff admin** (`User.role`, permissions, invitations) — future; single owner-by-email now.
- **Real owner Google email** — set `OWNER_EMAIL` in `.env` at Phase 11 go-live.
- **Order editing beyond status/tracking** (refunds, line-item edits, customer notifications) — not in scope.
- Reviews / SEO / size guides / analytics — Phase 10.

None of these belong in Phase 9.

</deferred>

---

*Phase: 9-Store Operations / Admin*
*Context gathered: 2026-07-17*
