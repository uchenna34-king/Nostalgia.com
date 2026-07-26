# Roadmap: Nostalgia

## Overview

Nostalgia began as a verified storefront vertical slice — browse → cart → sign in →
test-mode checkout → success — delivered across seven phases (Milestone 1). Milestone 2,
"Ready for the world," turns that slice into a real store: first it becomes discoverable
and built to scale (Merchandising), then runnable without code (Admin), then trustworthy
and findable (Trust & Polish), and finally it goes live with real login, real payments,
real emails, and a production database — the moment a real customer can complete a real,
paid purchase.

## Milestones

- ✅ **M1 — Storefront vertical slice** — Phases 1–7 (shipped 2026-07-13)
- 🚧 **M2 — Ready for the world** — Phases 8–11 (in progress)

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

<details>
<summary>✅ M1 — Storefront vertical slice (Phases 1–7) — SHIPPED 2026-07-13</summary>

- [x] **Phase 1: Project scaffold + design system** - Next.js app + locked palette/type, grain, marquee
- [x] **Phase 2: Data layer + product catalog** - Prisma schema + ~10 seeded products
- [x] **Phase 3: Storefront UI** - Home, `/shop` with filters, `/product/[slug]`
- [x] **Phase 4: Cart** - Context + localStorage, drawer + `/cart`, subtotal, empty state
- [x] **Phase 5: Auth** - NextAuth Google + dev-demo fallback, sign-in + account
- [x] **Phase 6: Checkout** - Login-gated Stripe test mode + stub, order persistence, success page
- [x] **Phase 7: Polish + verification** - Responsive, error states, branded 404, end-to-end walkthrough

</details>

### 🚧 M2 — Ready for the world (Phases 8–11)

- [x] **Phase 8: Merchandising & Discovery** - Search, filter/sort, scalable collections, wishlist, richer PDPs, catalog built for thousands (completed 2026-07-16)
- [x] **Phase 9: Store Operations / Admin** - No-code admin for product CRUD, inventory, and order/fulfillment management (completed 2026-07-22)
- [ ] **Phase 10: Trust & Polish** - Reviews, size guides, shipping/returns, SEO, performance, accessibility, analytics
- [ ] **Phase 11: Go Live** - Real Google OAuth + real Stripe, confirmation emails, order history, Postgres, deployment

## Phase Details

<details>
<summary>✅ Milestone 1 phase details (delivered)</summary>

### Phase 1: Project scaffold + design system

**Goal**: A running Next.js app rendering the locked Nostalgia design system.
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01
**Success Criteria** (what must be TRUE):

  1. App runs at `localhost:3000` with palette, Fraunces/Inter, film-grain, and marquee.

**Plans**: Delivered

### Phase 2: Data layer + product catalog

**Goal**: Persistence and a seeded catalog to render.
**Depends on**: Phase 1
**Requirements**: DATA-01
**Success Criteria** (what must be TRUE):

  1. Prisma schema (Product/User/Order) exists and ~10 products are seeded across categories.

**Plans**: Delivered

### Phase 3: Storefront UI

**Goal**: Customers can browse the catalog.
**Depends on**: Phase 2
**Requirements**: STORE-01, STORE-02, STORE-03
**Success Criteria** (what must be TRUE):

  1. Home shows editorial hero, marquee, and featured grid.
  2. `/shop` lists products with category filters; `/product/[slug]` shows gallery + size selector.

**Plans**: Delivered

### Phase 4: Cart

**Goal**: Customers can build a cart without logging in.
**Depends on**: Phase 3
**Requirements**: CART-01
**Success Criteria** (what must be TRUE):

  1. Add/remove/update qty works via drawer and `/cart`, with correct subtotal and empty state.

**Plans**: Delivered

### Phase 5: Auth

**Goal**: Customers can sign in.
**Depends on**: Phase 4
**Requirements**: AUTH-01
**Success Criteria** (what must be TRUE):

  1. NextAuth sign-in works via Google or dev-demo fallback; session shows in nav + account.

**Plans**: Delivered

### Phase 6: Checkout

**Goal**: Customers can place an order.
**Depends on**: Phase 5
**Requirements**: PAY-01, ORDER-01
**Success Criteria** (what must be TRUE):

  1. Login-gated checkout runs Stripe test mode (or stub), recomputes totals server-side, persists the Order, and shows a success page that clears the cart.

**Plans**: Delivered

### Phase 7: Polish + verification

**Goal**: The slice is coherent and verified.
**Depends on**: Phase 6
**Requirements**: POLISH-01
**Success Criteria** (what must be TRUE):

  1. Layout is responsive, error states are friendly, 404 is branded, and the full browse→buy flow is verified in-browser.

**Plans**: Delivered

</details>

### Phase 8: Merchandising & Discovery

**Goal**: Customers can find products fast in a catalog built to scale to thousands of items with per-product image sets.
**Depends on**: Phase 7 (Milestone 1 complete)
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, WISH-01, PDP-01, CATL-01
**Success Criteria** (what must be TRUE):

  1. Customer can search products by keyword and see relevant matches.
  2. Customer can filter (category, size, price) and sort (price, newest, name) the catalog, with results updating live.
  3. Customer can save products to a wishlist that persists across sessions.
  4. Product detail pages show a multi-image gallery and richer details driven by per-product image sets.
  5. The catalog data model and image handling support thousands of products with multiple images each, without a redesign.

**Plans**: 8/8 plans complete

- [x] 08-01-PLAN.md — Test harness (Vitest) + use-debounce install
- [x] 08-02-PLAN.md — Catalog data model: ProductImage + Collection + indexes, reseed
- [x] 08-03-PLAN.md — Catalog query builder (lib/catalog.ts) + getCatalog/collections + unit tests
- [x] 08-04-PLAN.md — Wishlist reducer + WishlistContext + WishlistButton
- [x] 08-05-PLAN.md — Shop UI: URL-driven search/filter/sort/pagination
- [x] 08-06-PLAN.md — Richer PDP: multi-image gallery + materials/care + save
- [x] 08-07-PLAN.md — Wishlist UI: card toggle + nav entry + /wishlist page
- [x] 08-08-PLAN.md — Collections index + detail routes (reuse paginated grid)

**UI hint**: yes

### Phase 9: Store Operations / Admin

**Goal**: The owner can run the store with no code — manage products, inventory, and orders.
**Depends on**: Phase 8 (admin manages the scaled catalog structure)
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04
**Success Criteria** (what must be TRUE):

  1. Only authenticated admins can reach the admin dashboard; everyone else is blocked.
  2. Admin can create, edit, and delete products through the UI, and the changes appear on the storefront.
  3. Admin can set and adjust per-product stock, and out-of-stock state reflects on the storefront.
  4. Admin can view all orders and update fulfillment status.

**Plans**: 6/6 plans complete
**UI hint**: yes

### Phase 10: Trust & Polish

**Goal**: The store earns customer trust and is discoverable, fast, and accessible.
**Depends on**: Phase 9
**Requirements**: TRST-01, TRST-02, TRST-03, SEO-01, PERF-01, ANLY-01
**Success Criteria** (what must be TRUE):

  1. Customer can read and submit product reviews/ratings on product pages.
  2. Product pages surface size guides, and shipping & returns pages exist and are linked.
  3. Pages emit correct metadata, a sitemap, and structured data for search engines.
  4. Site meets defined performance and accessibility targets, and key events are tracked in analytics.

**Plans**: 2/12 plans executed

- [x] 10-01-PLAN.md
- [x] 10-02-PLAN.md
- [ ] 10-03-PLAN.md
- [ ] 10-04-PLAN.md
- [ ] 10-05-PLAN.md
- [ ] 10-06-PLAN.md
- [ ] 10-07-PLAN.md
- [ ] 10-08-PLAN.md
- [ ] 10-09-PLAN.md
- [ ] 10-10-PLAN.md
- [ ] 10-11-PLAN.md
- [ ] 10-12-PLAN.md

**UI hint**: yes

### Phase 11: Go Live

**Goal**: A real customer can complete a real, paid purchase end-to-end on production — the primary success metric.
**Depends on**: Phase 10
**Requirements**: LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06
**Success Criteria** (what must be TRUE):

  1. A customer signs in with real Google OAuth and pays with real Stripe (live keys).
  2. Customer receives an order confirmation email after purchase.
  3. Signed-in customer can view their order history on the account page.
  4. The app runs on a hosted Node platform against hosted Postgres (migrated from SQLite) and is publicly reachable.

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → … → 7 (done) → 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Project scaffold + design system | M1 | ✓ | Complete | 2026-07-13 |
| 2. Data layer + product catalog | M1 | ✓ | Complete | 2026-07-13 |
| 3. Storefront UI | M1 | ✓ | Complete | 2026-07-13 |
| 4. Cart | M1 | ✓ | Complete | 2026-07-13 |
| 5. Auth | M1 | ✓ | Complete | 2026-07-13 |
| 6. Checkout | M1 | ✓ | Complete | 2026-07-13 |
| 7. Polish + verification | M1 | ✓ | Complete | 2026-07-13 |
| 8. Merchandising & Discovery | M2 | 8/8 | Complete    | 2026-07-16 |
| 9. Store Operations / Admin | M2 | 6/6 | Complete | 2026-07-22 |
| 10. Trust & Polish | M2 | 2/12 | In Progress|  |
| 11. Go Live | M2 | 0/TBD | Not started | - |
