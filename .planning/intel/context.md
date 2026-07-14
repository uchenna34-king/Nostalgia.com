# Context (from DOCs)

Running notes keyed by topic, appended verbatim with source attribution.

---

## Topic: Goal & vertical slice

source: docs/superpowers/plans/2026-07-13-nostalgia-storefront.md

Build a runnable clothing-brand storefront vertical slice: browse → product →
cart → Google login → Stripe test-mode checkout → success. Each phase ends in a
state runnable and viewable at `http://localhost:3000`. No placeholders in
deliverables; each phase independently viewable.

---

## Topic: Tech stack (as planned)

source: docs/superpowers/plans/2026-07-13-nostalgia-storefront.md

Next.js 14, TypeScript, Tailwind CSS, NextAuth, Prisma, SQLite, Stripe,
`next/font` (Fraunces + Inter). NextAuth uses Google + dev-mock fallback. Stripe
Checkout runs in test mode with a stub fallback when no key is present. Cart in
React context + localStorage.

Note: the plan pins the sans typeface to Inter, which is a concrete choice within
the SPEC's "clean grotesque sans" allowance — a refinement, not a contradiction.

---

## Topic: Global constraints (from plan)

source: docs/superpowers/plans/2026-07-13-nostalgia-storefront.md

Palette cream `#F4EEE4`, ink `#1A1A1A`, accent sepia `#A6552F`. Serif display
(Fraunces) for headings; sans (Inter) for UI. App must run with `npm run dev`
end-to-end WITHOUT real Google/Stripe keys (dev fallbacks) while ready to accept
real keys via `.env`. Aesthetic: nostalgic luxury streetwear with grain texture
and marquee ticker. Verification is browser-based at each phase.

---

## Topic: Phase breakdown

source: docs/superpowers/plans/2026-07-13-nostalgia-storefront.md

- Phase 1 — Project scaffold + design system: Next.js app runs, styled
  "NOSTALGIA" landing with grain, fonts, palette.
- Phase 2 — Data layer + product catalog: Prisma schema (Product, User, Order),
  seed ~10 items across Outerwear/Knitwear/Tees/Accessories, read helpers
  (`getProducts`, `getProductBySlug`, `getCategories`).
- Phase 3 — Storefront UI: home (hero, marquee, featured grid, editorial),
  `/shop` with category filter, `/product/[slug]` detail with size selector.
- Phase 4 — Cart: context + localStorage persistence, add/remove/update qty,
  subtotal, cart drawer + `/cart` page + empty state.
- Phase 5 — Auth: NextAuth Google provider (if env keys) + dev Credentials
  fallback, Prisma adapter, sign-in page + nav session UI.
- Phase 6 — Checkout: login-gated; real Stripe session if key present else stub
  redirect; persist Order on success, clear cart, success page.
- Phase 7 — Polish + end-to-end verification: mobile/responsive, error states,
  hover polish, final walkthrough.

---

## Topic: Delivered state (v1)

source: orchestrator context (v1 built and verified) + plan phases 1–7

The v1 vertical slice is BUILT and verified. Delivered and working: storefront
(home / shop / product), cart drawer with localStorage persistence, auth
(NextAuth Google + dev-demo fallback), Stripe test-mode checkout with stub
fallback, order persistence, and the success page. All seven planned phases are
complete. Treat v1 as delivered when downstream planning derives current state.

---

## Topic: Out of scope

source: docs/superpowers/plans/2026-07-13-nostalgia-storefront.md

Admin, search, reviews, and similar items intentionally excluded from the v1
slice (aligns with the SPEC out-of-scope list in `constraints.md`).
