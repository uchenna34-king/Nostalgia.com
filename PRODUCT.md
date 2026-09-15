# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Shoppers building an everyday wardrobe of quality streetwear-adjacent basics. This is a
considered, non-occasion purchase — more deliberate than fast fashion, but routine
self-purchase rather than gifting or a special event.

## Product Purpose

Nostalgia is an online storefront for a "nostalgic luxury streetwear" clothing brand.
Customers browse an editorial catalog, add items to a cart, sign in, and pay. Success
means a real customer completes a real, paid purchase end-to-end — real login, real
payment, and an email confirmation.

## Positioning

The substantive claim a competing streetwear brand couldn't truthfully copy is **craft
and materials** — better fabric, better construction — not archival storytelling or
drop scarcity. "Nostalgic" describes the mood and aesthetic; the mechanism that earns
trust and justifies price is build quality.

## Operating Context

Browse → cart (persists via localStorage, no login required) → sign in (Google OAuth,
or a `ALLOW_DEMO_LOGIN`-gated dev-demo fallback for UAT) → Stripe checkout → order
confirmation email → order visible in account order history. The owner runs the store
through a no-code admin dashboard: product CRUD, inventory/stock, and order fulfillment
status. The store is currently in a demo/UAT phase on Stripe TEST keys; real payments
are deliberately deferred to the owner's explicit go-live signal (tracked in
`docs/PRE-LAUNCH-CHECKLIST.md`).

## Capabilities and Constraints

- Keyword search, filter (category/size/price), sort, wishlist, multi-image product
  detail galleries, reviews/ratings, size guides, shipping/returns pages, SEO metadata
  + sitemap, and analytics event tracking are all built.
- The catalog data model and image handling are built to hold thousands of products
  with multiple images each, without a redesign.
- **Undecided:** the specific "craft & materials" claims (fabric names, construction
  detail, care instructions) are not yet written — do not invent specific material or
  construction claims in copy or design until the owner supplies them.
- **Undecided:** whether the everyday-basics positioning should shift size range, fit
  guidance, or price-point signaling from what's currently shipped — not yet confirmed.

## Brand Commitments

- "Nostalgia" is the committed, real brand name — used throughout the codebase (nav,
  emails, page metadata), not a placeholder.
- A real logo/brand asset file was referenced as existing, but its location was not
  supplied in this session. **Treat as not yet supplied.** Do not fabricate a founder
  story, logo mark, or brand history; current UI carries brand identity through the
  aesthetic tokens below, not a supplied logo.
- Locked aesthetic (existing, verified brand system — see `.planning/PROJECT.md`):
  cream `#F4EEE4`, ink `#1A1A1A`, sepia `#A6552F`; Bodoni Moda serif display (at 400 —
  see the Contrast Rule in `DESIGN.md`) + Inter sans; film-grain overlay; marquee
  ticker. This is durable brand identity, not open for casual redirection.
  (Superseded Fraunces in the wordmark redesign.)

## Evidence on Hand

- **No real product photography yet.** The catalog uses placeholder SVG imagery
  (`public/products/*.svg`) standing in for real photos the owner will supply later.
  Design work must stay believable with placeholder imagery and upgrade gracefully
  when real photography lands.
- **No confirmed founder story, logo file, testimonials, case studies, or press.**
  State this absence explicitly in future work; do not invent any of it.
- Real, functioning (not placeholder) integrations: Stripe TEST-mode checkout, Google
  OAuth (Testing mode, capped at 100 test users), Resend transactional email, and Neon
  Postgres. See `docs/PRE-LAUNCH-CHECKLIST.md` for what's still deferred to go-live.

## Product Principles

1. Craft and material quality are the substantive claim; "nostalgic" is mood, not
   mechanism — design and copy should earn trust through construction/quality signals,
   not archival styling alone.
2. Everyday-wearable, not occasion-wear — the shopping experience should read as
   considered daily-wardrobe building, not a special-event splurge.
3. Real product photography and real brand assets are deliberately deferred; design
   must stay credible on placeholder imagery and upgrade cleanly once real assets land.
4. The store must stay fully runnable on dev fallbacks (no real credentials required)
   until the owner's explicit go-live signal.

## Accessibility & Inclusion

Performance and accessibility targets were set and worked in Phase 10 (`PERF-01`); no
accessibility standard beyond that (e.g. a specific WCAG level) has been confirmed.
