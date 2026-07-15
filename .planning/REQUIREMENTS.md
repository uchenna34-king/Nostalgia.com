# Requirements: Nostalgia

**Defined:** 2026-07-14
**Core Value:** A real customer can complete a real, paid purchase end-to-end (real Google login + real Stripe payment + email confirmation).

Milestone 1 ("Storefront vertical slice") is delivered and verified. Its
requirements are recorded under **Delivered** below. The **Active** requirements
below are Milestone 2 ("Ready for the world") and map to roadmap Phases 8–11.

## Delivered (Milestone 1 — Phases 1–7)

Shipped and verified end-to-end in-browser. Kept for traceability.

### Foundation

- [x] **SETUP-01**: Next.js scaffold + locked design system (palette, Fraunces/Inter, film-grain, marquee, branded 404, reduced-motion)
- [x] **DATA-01**: Prisma schema (Product/User/Order) with ~10 seeded products across Outerwear/Knitwear/Tees/Accessories

### Storefront

- [x] **STORE-01**: Home page with editorial hero, marquee ticker, and featured grid
- [x] **STORE-02**: `/shop` product grid with category filters
- [x] **STORE-03**: `/product/[slug]` detail with image gallery and size selector

### Cart & Checkout

- [x] **CART-01**: Cart (React context + localStorage) with add/remove/update qty, subtotal, slide-out drawer, `/cart` page, and empty state
- [x] **AUTH-01**: NextAuth sign-in — Google provider + dev-demo credentials fallback, Prisma adapter, sign-in + account pages
- [x] **PAY-01**: Login-gated Stripe test-mode checkout + stub fallback, with server-side total recompute
- [x] **ORDER-01**: Order persisted to DB; success page confirms and clears the cart
- [x] **POLISH-01**: Responsive layout, friendly error states, hover polish, verified end-to-end walkthrough

## v1 Requirements (Milestone 2 — "Ready for the world")

Committed scope for the current milestone. Each maps to exactly one phase (8–11).

### Merchandising & Discovery (Phase 8)

- [x] **DISC-01**: Customer can search products by keyword (name, description, category) and see relevant matches
- [x] **DISC-02**: Customer can filter the catalog by category, size, and price range
- [x] **DISC-03**: Customer can sort the catalog (e.g. price, newest, name)
- [x] **DISC-04**: Customer can browse curated collections/categories that scale beyond a handful of items
- [ ] **WISH-01**: Customer can add and remove products to a wishlist that persists across sessions
- [x] **PDP-01**: Product detail pages show richer content (multi-image gallery + details) driven by per-product image sets
- [x] **CATL-01**: Catalog data model + image handling support thousands of products, each with multiple images, without redesign (structure only; real images supplied later)

### Store Operations / Admin (Phase 9)

- [ ] **ADMN-01**: Only authenticated admins can reach the admin dashboard; all others are blocked
- [ ] **ADMN-02**: Admin can create, edit, and delete products through the UI, and changes appear on the storefront
- [ ] **ADMN-03**: Admin can set and adjust per-product stock; out-of-stock state reflects on the storefront
- [ ] **ADMN-04**: Admin can view all orders and update fulfillment status

### Trust & Polish (Phase 10)

- [ ] **TRST-01**: Customer can read and submit product reviews/ratings on product pages
- [ ] **TRST-02**: Product pages surface size guides
- [ ] **TRST-03**: Shipping & returns information pages exist and are linked
- [ ] **SEO-01**: Pages emit correct metadata, a sitemap, and structured data for search engines
- [ ] **PERF-01**: Site meets defined performance and accessibility targets
- [ ] **ANLY-01**: Key storefront events are tracked in analytics

### Go Live (Phase 11)

- [ ] **LIVE-01**: Customer can sign in with real Google OAuth in production
- [ ] **LIVE-02**: Customer can pay with real Stripe (test cards graduating to live keys)
- [ ] **LIVE-03**: Customer receives an order confirmation email after purchase
- [ ] **LIVE-04**: Signed-in customer can view order history on the account page
- [ ] **LIVE-05**: Production runs on hosted Postgres, migrated from SQLite
- [ ] **LIVE-06**: App is deployed to a hosted Node platform and is publicly reachable

## v2 Requirements

Deferred beyond Milestone 2. Tracked, not in the current roadmap.

### Post-launch

- **INTL-01**: Internationalization / multi-currency / tax handling
- **REC-01**: Personalized recommendations and "related products"
- **PROMO-01**: Discount codes, gift cards, and promotions
- **CMS-01**: Editorial/marketing content pages beyond the storefront

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real product photography | Owner supplies images later; M2 builds image handling, not images |
| Native mobile app | Web-first; responsive storefront is sufficient |
| Multi-vendor / marketplace | Single-brand store only |
| Internationalization / multi-currency | Not required for the primary success metric; revisit post-launch |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Complete |
| STORE-01 | Phase 3 | Complete |
| STORE-02 | Phase 3 | Complete |
| STORE-03 | Phase 3 | Complete |
| CART-01 | Phase 4 | Complete |
| AUTH-01 | Phase 5 | Complete |
| PAY-01 | Phase 6 | Complete |
| ORDER-01 | Phase 6 | Complete |
| POLISH-01 | Phase 7 | Complete |
| DISC-01 | Phase 8 | Complete |
| DISC-02 | Phase 8 | Complete |
| DISC-03 | Phase 8 | Complete |
| DISC-04 | Phase 8 | Complete |
| WISH-01 | Phase 8 | Pending |
| PDP-01 | Phase 8 | Complete |
| CATL-01 | Phase 8 | Complete |
| ADMN-01 | Phase 9 | Pending |
| ADMN-02 | Phase 9 | Pending |
| ADMN-03 | Phase 9 | Pending |
| ADMN-04 | Phase 9 | Pending |
| TRST-01 | Phase 10 | Pending |
| TRST-02 | Phase 10 | Pending |
| TRST-03 | Phase 10 | Pending |
| SEO-01 | Phase 10 | Pending |
| PERF-01 | Phase 10 | Pending |
| ANLY-01 | Phase 10 | Pending |
| LIVE-01 | Phase 11 | Pending |
| LIVE-02 | Phase 11 | Pending |
| LIVE-03 | Phase 11 | Pending |
| LIVE-04 | Phase 11 | Pending |
| LIVE-05 | Phase 11 | Pending |
| LIVE-06 | Phase 11 | Pending |

**Coverage:**

- Milestone 2 (v1) requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-14*
*Last updated: 2026-07-14 after ingest bootstrap*
