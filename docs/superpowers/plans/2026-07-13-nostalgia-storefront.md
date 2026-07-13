# Nostalgia Storefront Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Each
> phase ends in a state runnable and viewable at `http://localhost:3000`.

**Goal:** Build a runnable clothing-brand storefront vertical slice: browse →
product → cart → Google login → Stripe test-mode checkout → success.

**Architecture:** Next.js App Router + TypeScript + Tailwind. NextAuth (Google +
dev-mock fallback). Prisma + SQLite for products/users/orders. Stripe Checkout in
test mode with a stub fallback when no key is present. Cart in React context +
localStorage.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, NextAuth, Prisma, SQLite,
Stripe, next/font (Fraunces + Inter).

## Global Constraints

- Palette: cream `#F4EEE4`, ink `#1A1A1A`, accent sepia `#A6552F`.
- Serif display type (Fraunces) for headings; sans (Inter) for UI.
- App must run with `npm run dev` and work end-to-end WITHOUT real Google/Stripe
  keys (dev fallbacks), while being ready to accept real keys via `.env`.
- Aesthetic: nostalgic luxury streetwear (serif editorial + minimal luxury +
  bold streetwear), grain texture, marquee ticker.
- Verification is browser-based at each phase via the local preview.

---

### Phase 1: Project scaffold + design system
**Deliverable:** Next.js app runs, shows a styled "NOSTALGIA" landing with grain,
fonts, and palette applied.

**Files:** `package.json`, `next.config.js`, `tailwind.config.ts`,
`tsconfig.json`, `postcss.config.js`, `app/layout.tsx`, `app/globals.css`,
`app/page.tsx`, `lib/fonts.ts`, `.env.example`, `.gitignore`.

- [ ] Scaffold Next.js + TS + Tailwind, configure palette + fonts (Fraunces/Inter).
- [ ] Global grain overlay + base typography in `globals.css`.
- [ ] Placeholder home page with wordmark to confirm styling.
- [ ] Run `npm run dev`, verify at localhost:3000. Commit.

### Phase 2: Data layer + product catalog
**Deliverable:** Products stored in SQLite, seed script populates ~10 items,
helper functions read them.

**Files:** `prisma/schema.prisma`, `prisma/seed.ts`, `lib/db.ts`,
`lib/products.ts`, product image assets (SVG placeholders in `public/products`).

- [ ] Prisma schema: Product, User (NextAuth), Order.
- [ ] Seed ~10 products across Outerwear/Knitwear/Tees/Accessories.
- [ ] `getProducts`, `getProductBySlug`, `getCategories` helpers.
- [ ] Run seed, verify data. Commit.

### Phase 3: Storefront UI (home, shop, product)
**Deliverable:** Full browsable storefront — home hero, marquee, featured grid,
`/shop` with filters, `/product/[slug]` detail with size selector.

**Files:** `components/Nav.tsx`, `components/Footer.tsx`, `components/Marquee.tsx`,
`components/ProductCard.tsx`, `components/Hero.tsx`, `app/page.tsx`,
`app/shop/page.tsx`, `app/product/[slug]/page.tsx`.

- [ ] Sticky nav (wordmark, links, cart count) + footer.
- [ ] Home: hero + marquee + featured grid + editorial section.
- [ ] Shop grid with category filter.
- [ ] Product detail: gallery, size selector, add-to-cart button, details.
- [ ] Verify all pages in browser. Commit.

### Phase 4: Cart
**Deliverable:** Add to cart works, cart drawer + `/cart` page, quantity edit,
subtotal, persists across reload.

**Files:** `context/CartContext.tsx`, `components/CartDrawer.tsx`,
`app/cart/page.tsx`, wire nav cart count + product add-to-cart.

- [ ] Cart context with localStorage persistence.
- [ ] Add/remove/update qty; subtotal computation.
- [ ] Cart drawer + full cart page + empty state.
- [ ] Verify add → drawer → reload persists. Commit.

### Phase 5: Auth (NextAuth Google + dev fallback)
**Deliverable:** Sign in with Google button; a dev-mock credentials provider lets
login work without real keys. Session shown in nav.

**Files:** `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts`,
`components/SignInButton.tsx`, `app/signin/page.tsx`, session provider wrapper.

- [ ] NextAuth config: Google provider (if env keys) + dev Credentials fallback.
- [ ] Prisma adapter for users.
- [ ] Sign-in page + nav session UI (avatar / sign out).
- [ ] Verify login via dev fallback. Commit.

### Phase 6: Checkout (Stripe test mode + stub)
**Deliverable:** Checkout requires login; creates a Stripe test Checkout Session,
or a stubbed success when no Stripe key; order saved; success page.

**Files:** `app/checkout/page.tsx`, `app/api/checkout/route.ts`,
`app/order/success/page.tsx`, `lib/stripe.ts`, order-create helper.

- [ ] Checkout route: if logged out → redirect to sign-in.
- [ ] `/api/checkout`: real Stripe session if key present, else stub redirect.
- [ ] Persist Order on success; clear cart; success page.
- [ ] Verify full flow browse→cart→login→checkout→success. Commit.

### Phase 7: Polish + end-to-end verification
**Deliverable:** Responsive/mobile pass, error states, hover/interaction polish,
final browser walkthrough.

- [ ] Mobile nav + responsive grids.
- [ ] Empty/error states messaging.
- [ ] Final end-to-end verification screenshot. Commit.

---

## Self-Review

- **Spec coverage:** aesthetic (Ph1/3), architecture (Ph1–6), all pages (Ph3–6),
  data model (Ph2), error handling (Ph4/6/7), local preview (every phase). Covered.
- **Out of scope** items (admin, search, reviews, etc.) intentionally excluded.
- No placeholders in deliverables; each phase independently viewable.
