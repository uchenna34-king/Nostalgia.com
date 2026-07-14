# Constraints (from SPECs)

All constraints below derive from the single ingested SPEC. Precedence: SPEC
(rank 2, default ordering ADR > SPEC > PRD > DOC). No ADR overrides any of these.

---

## CON-architecture-stack

- type: protocol
- source: docs/superpowers/specs/2026-07-13-nostalgia-storefront-design.md
- scope: application architecture

Next.js (App Router) + TypeScript + Tailwind CSS. NextAuth with a Google provider
plus a dev-mock provider fallback so login works before real Google OAuth keys are
added. Prisma + SQLite for local products/users/orders (no external DB). Stripe
test-mode Checkout Session with a stub mode that simulates a successful order when
no Stripe key is present. Cart via React context + `localStorage`: adding to cart
requires no login; checkout requires login.

---

## CON-dev-fallback-runnable

- type: nfr
- source: docs/superpowers/specs/2026-07-13-nostalgia-storefront-design.md
- scope: local runnability

The app MUST run on a local dev server (`npm run dev`) and be end-to-end functional
WITHOUT real Google/Stripe credentials (dev fallbacks for auth and payments), while
remaining wired to accept real credentials via `.env`. Previewable in the browser at
every interval so progress is visible and reviewable.

---

## CON-visual-system

- type: nfr
- source: docs/superpowers/specs/2026-07-13-nostalgia-storefront-design.md
- scope: aesthetic / design system

Aesthetic "Nostalgic Luxury Streetwear": serif editorial + minimal luxury + bold
streetwear. Palette cream `#F4EEE4`, ink `#1A1A1A`, accent sepia `#A6552F`. Serif
display type (Fraunces / Playfair via `next/font`) for headings; a clean grotesque
sans for UI text. Film-grain texture overlay, marquee ticker banner, large calm
product imagery, strong black CTAs, confident hover states.

---

## CON-pages-routes

- type: api-contract
- source: docs/superpowers/specs/2026-07-13-nostalgia-storefront-design.md
- scope: route surface

Required routes: `/` (grain hero + serif wordmark, "latest drop", marquee, featured
grid, editorial section, footer), `/shop` (product grid + category filters),
`/product/[slug]` (gallery, size selector, add-to-cart, details), `/cart` (cart
drawer + full page, quantity edit, subtotal), `/checkout` (requires login; creates
Stripe or stub session), `/order/success` (order confirmation). Shared components:
sticky nav with cart count, footer, product card, grain overlay, sign-in button
(Google real + dev fallback), cart drawer.

---

## CON-data-model

- type: schema
- source: docs/superpowers/specs/2026-07-13-nostalgia-storefront-design.md
- scope: persistence schema

Product: `slug`, `name`, `price`, `category`, `images[]`, `sizes[]`, `description`.
User: managed by NextAuth (Prisma adapter). Order: `user`, `items` (JSON), `total`,
`status`, `createdAt`. Seeded with ~8–12 sample products across a few categories
(Outerwear, Knitwear, Tees, Accessories).

---

## CON-error-handling

- type: nfr
- source: docs/superpowers/specs/2026-07-13-nostalgia-storefront-design.md
- scope: error states

Empty cart state, checkout-without-login redirect to sign-in, and Stripe/stub
failure must all show friendly messaging. Manual end-to-end verification in the
local browser: browse → add to cart → sign in → checkout → success.

---

## CON-scope-boundary

- type: nfr
- source: docs/superpowers/specs/2026-07-13-nostalgia-storefront-design.md
- scope: out-of-scope for v1

Explicitly deferred to later milestones: admin dashboard, product search, reviews,
wishlist, inventory management, email receipts, and real (live-mode) payment
go-live.
