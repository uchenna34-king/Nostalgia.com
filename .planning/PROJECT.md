# Nostalgia

## What This Is

Nostalgia is an online storefront for a "nostalgic luxury streetwear" clothing
brand — customers browse an editorial catalog, add items to a cart, sign in, and
pay. A verified vertical slice (Milestone 1) is already built and running; the
current work (Milestone 2, "Ready for the world") hardens it into a real store
that people can search, that the owner can run without code, and that can take a
real, paid order in production.

## Core Value

A real customer can complete a real, paid purchase end-to-end — real Google
login, real Stripe payment, and an email confirmation. Everything else serves
that outcome.

## Business Context

- **Customer**: Online shoppers buying Nostalgia streetwear.
- **Revenue model**: Direct-to-consumer product sales via Stripe checkout.
- **Success metric**: A real customer completes a real, paid purchase end-to-end.
- **Strategy notes**: Milestone 2 sequences three hardening tracks (merchandising,
  admin, trust) before go-live so the store is worth showing when it ships.

## Requirements

### Validated

<!-- Milestone 1 — shipped and verified end-to-end in-browser (2026-07-13). -->

- ✓ **Storefront** — home (editorial hero, marquee, featured grid), `/shop` with
  category filters, `/product/[slug]` detail with gallery + size selector — M1 (Phase 3)
- ✓ **Cart** — React context + localStorage, add/remove/update qty, subtotal,
  slide-out drawer + `/cart` page + empty state — M1 (Phase 4)
- ✓ **Auth** — NextAuth Google provider + dev-demo credentials fallback, Prisma
  adapter, sign-in + account pages — M1 (Phase 5)
- ✓ **Checkout** — login-gated Stripe test-mode session + stub fallback, server-side
  total recompute, Order persisted, success page that clears the cart — M1 (Phase 6)
- ✓ **Data layer** — Prisma schema (Product/User/Order) + 10 seeded products with
  placeholder SVG imagery — M1 (Phase 2)
- ✓ **Design system + scaffold** — Next.js app, locked palette/type, film-grain,
  marquee, branded 404, reduced-motion support — M1 (Phases 1, 7)

### Active

<!-- Milestone 2 — "Ready for the world". Phases 8–11. See REQUIREMENTS.md for IDs. -->

- [ ] Merchandising & discovery: search, filter/sort, scalable collections, wishlist,
  richer product detail pages, and a catalog structure built to hold thousands of
  products with per-product image sets (Phase 8)
- [ ] Store operations / admin: authenticated dashboard for product CRUD, inventory,
  and order/fulfillment management — no-code store management (Phase 9)
- [ ] Trust & polish: reviews/ratings, size guides, shipping & returns, SEO,
  performance, accessibility, analytics (Phase 10)
- [ ] Go live: real Google OAuth, real Stripe (live keys), confirmation emails,
  order history, SQLite → hosted Postgres, deployment (Phase 11)

### Out of Scope

- Real product photography — the owner will supply real images later; Milestone 2
  builds the image-handling structure, not the images themselves.
- Marketing/CMS site beyond the storefront — the storefront is the product.
- Native mobile app — web-first, responsive is sufficient.
- Multi-vendor / marketplace — single-brand store only.
- Internationalization, multi-currency, tax engines — not required for the primary
  success metric; revisit post-launch.

## Context

- **Delivered state**: The Milestone 1 vertical slice is built and verified. Type
  checks are clean and all flows (browse → add to cart → sign in → checkout →
  success) were confirmed in-browser. Treat M1 as complete.
- **Dev fallbacks**: The app runs fully via `npm run dev` without real Google/Stripe
  credentials (dev-demo auth + Stripe stub), while wired to accept real keys via
  `.env`. Go-live (Phase 11) swaps fallbacks for real credentials.
- **Scale target**: The catalog must be re-architected to hold thousands of products
  with per-product image sets. Milestone 1 seeded only ~10 items; Phase 8 replaces
  that with a data model + image handling that scales.
- **Persistence**: SQLite is dev-only. Production migrates to hosted Postgres in
  Phase 11.

## Constraints

- **Aesthetic (LOCKED)**: "Nostalgic luxury streetwear" — cream `#F4EEE4`, ink
  `#1A1A1A`, sepia `#A6552F`; Fraunces serif display + Inter sans; film-grain overlay;
  marquee ticker. — Brand identity; do not drift.
- **Tech stack (LOCKED)**: Next.js 14 (App Router) + TypeScript + Tailwind, Prisma,
  NextAuth, Stripe. — Established and verified in M1; new work builds on it.
- **Dev-fallback runnable**: App must stay end-to-end runnable locally without real
  credentials until go-live. — Keeps progress previewable at every phase.
- **Deploy target**: Hosted Node platform (e.g. Vercel) with hosted Postgres. — Where
  the primary success metric is proven.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Aesthetic locked to "nostalgic luxury streetwear" (palette, Fraunces/Inter, grain, marquee) | Brand identity is the product's signature; consistency matters | ✓ Good (validated in M1) |
| Tech stack locked: Next.js 14 App Router / TS / Tailwind / Prisma / NextAuth / Stripe | Proven end-to-end in M1; no reason to churn | ✓ Good (validated in M1) |
| Hardening tracks (A/B/C) before go-live (D) | Store should be worth showing when it ships; go-live is the finale | — Pending (M2 sequence) |
| Catalog re-architected for thousands of products + per-product image sets | Current ~10-item seed model won't scale; owner adds real inventory later | — Pending (Phase 8) |
| SQLite for dev, hosted Postgres for production (migrate in Phase 11) | Local runnability now, real durability at go-live | — Pending (Phase 11) |

---
*Last updated: 2026-07-14 after ingest bootstrap (Milestone 1 delivered; Milestone 2 planned)*
