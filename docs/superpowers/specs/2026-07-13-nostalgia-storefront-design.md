# Nostalgia — Storefront Design Spec

**Date:** 2026-07-13
**Status:** Approved
**Owner:** Kingston

## 1. Summary

Nostalgia is a clothing-brand storefront web app. A visitor can browse the
collection, open a product, add items to a cart, sign in with Google, and check
out through Stripe. The v1 target is a **full vertical slice running locally
end-to-end**, wired for real credentials but functional without them (dev
fallbacks for auth and payments).

## 2. Aesthetic — "Nostalgic Luxury Streetwear"

A deliberate fusion of three references:

- **Serif editorial (vintage/retro):** large serif display type for headings,
  warm cream base, subtle film-grain texture, editorial photo layouts.
- **Minimal luxury:** generous whitespace, restrained palette, large calm
  product imagery, refined spacing.
- **Bold streetwear:** oversized type moments, a "latest drop" hero, strong
  black CTAs, a marquee ticker banner, confident hover states.

**Palette:** cream `#F4EEE4`, ink `#1A1A1A`, accent sepia `#A6552F`.
**Type:** serif display (Fraunces / Playfair via `next/font`) + a clean
grotesque sans for UI text.

## 3. Architecture

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **NextAuth** — Google provider, plus a **dev mock provider** fallback so login
  works before real Google OAuth keys are added.
- **Prisma + SQLite** — local data for products, users, orders. No external DB.
- **Stripe (test mode)** via Checkout Session, with a **stub mode** that
  simulates a successful order when no Stripe key is present, so the full flow
  runs immediately.
- **Cart** — React context + `localStorage`. Adding to cart requires no login;
  checkout requires login.

## 4. Pages & Components

| Route | Purpose |
|-------|---------|
| `/` | Home: grain hero + serif wordmark, "latest drop", marquee ticker, featured grid, editorial section, footer |
| `/shop` | Product grid with category filters |
| `/product/[slug]` | Gallery, size selector, add-to-cart, details |
| `/cart` | Cart drawer + full cart page, quantity edit, subtotal |
| `/checkout` | Requires login; creates Stripe (or stub) session |
| `/order/success` | Order confirmation |

Shared components: sticky nav with cart count, footer, product card, grain
overlay, sign-in button (Google real + dev fallback), cart drawer.

## 5. Data Model

- **Product:** `slug`, `name`, `price`, `category`, `images[]`, `sizes[]`,
  `description`.
- **User:** managed by NextAuth (Prisma adapter).
- **Order:** `user`, `items` (JSON), `total`, `status`, `createdAt`.

Seeded with ~8–12 sample products across a few categories (e.g. Outerwear,
Knitwear, Tees, Accessories).

## 6. Error Handling & Testing

- Empty cart state, checkout-without-login redirect to sign-in, Stripe/stub
  failure → friendly messaging.
- Seed script populates products.
- Manual end-to-end verification in the local browser preview:
  browse → add to cart → sign in → checkout → success.

## 7. Out of Scope (later milestones)

Admin dashboard, product search, reviews, wishlist, inventory management, email
receipts, and real (live-mode) payment go-live. Changes will be made at
intervals as the build progresses.

## 8. Local Preview

The app must run on a local dev server (`npm run dev`) and be previewable in the
browser at every interval so progress is visible and reviewable.
