# Phase 10: Trust & Polish - Context

**Gathered:** 2026-07-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the Nostalgia storefront **trustworthy, discoverable, fast, and accessible** — the
last hardening track before go-live. Six capabilities:

- **Reviews & ratings (TRST-01):** verified purchasers leave star + title + text reviews on
  product pages; aggregate ratings surface on the storefront.
- **Size guides (TRST-02):** per-category measurement charts reachable from the product page.
- **Shipping & returns (TRST-03):** dedicated policy pages, linked where shoppers need them.
- **SEO (SEO-01):** per-page metadata, sitemap, robots, and structured data.
- **Performance & accessibility (PERF-01):** meet defined Lighthouse + WCAG AA targets.
- **Analytics (ANLY-01):** track the key conversion funnel, behind a consent banner.

**Not in this phase:** real Google OAuth, real Stripe live keys, confirmation emails, order
history, SQLite→Postgres migration, deployment (all Phase 11). No real product photography
(images supplied later — structure only, per PROJECT out-of-scope). No stock auto-decrement
(deferred to Phase 11). No promotions/recommendations/i18n (v2 backlog).

</domain>

<decisions>
## Implementation Decisions

### Reviews & Ratings (TRST-01)
- **D-01:** **Verified purchasers only.** A user may review a product only if signed in AND
  they own an `Order` whose `items` snapshot contains that product. Show a **"Verified
  purchase"** treatment on every review (all reviews are verified by definition). One review
  per user per product (planner decides edit-vs-replace on re-submit).
- **D-02:** **Auto-publish with owner removal.** Submitted reviews appear immediately (no
  approval queue). The **owner can hide/delete** any review from the existing `/admin` area
  (reuse the Phase 9 `requireOwner()` gate). No customer-facing report/flag flow this phase.
- **D-03:** **Review shape = 1–5 star rating (required) + title + body text.** Stars required;
  title/body required or optional is planner's discretion (lean: title required, body
  optional). Store `createdAt`, `userId`, `productId`, rating, title, body.
- **D-04:** **Aggregate rating surfaces in three places:** the PDP (average + count + review
  list), the product cards on `/shop`/collections (compact star average), and the **Product
  JSON-LD `aggregateRating`** (ties into SEO-01). Products with zero reviews render a graceful
  empty state ("No reviews yet") and omit `aggregateRating` from JSON-LD.

### Size Guides (TRST-02)
- **D-05:** **Per-category charts** — one measurement chart per category (Outerwear, Knitwear,
  Tees, Accessories). A product displays the chart matching its `category`. No per-product
  overrides this phase.
- **D-06:** **Presentation = on-brand modal/drawer** opened from a **"Size guide" link near the
  size selector** on the PDP. Stays in the buying flow; no navigation away. Must honor the
  locked aesthetic + reduced-motion support.
- **D-07:** **Placeholder measurement data now.** Build the structure (e.g. a static
  `lib/size-guides` config keyed by category) with realistic placeholder numbers; the owner
  swaps in real measurements later — mirrors the "images supplied later" pattern. Not
  admin-editable this phase.

### Analytics + Consent (ANLY-01)
- **D-08:** **Provider = Vercel Web Analytics + Speed Insights** (`@vercel/analytics`,
  `@vercel/speed-insights`). Cookieless, zero-config, matches the planned Vercel deploy target,
  and **must no-op locally without keys** (dev-runnable constraint). Wrap all event calls in a
  **provider-agnostic `trackEvent()` abstraction** (e.g. `lib/analytics.ts`) so the provider
  can be swapped without touching call sites.
- **D-09:** **Full-funnel events via `trackEvent()`:** `view_product`, `add_to_cart`,
  `begin_checkout`, `purchase`, `search`. Wire each at its natural call site (PDP, AddToCart,
  checkout start, success page, search input).
- **D-10:** **Cookie-consent banner gates analytics.** *Note:* Vercel Web Analytics is
  cookieless, so a banner is **not strictly required** — but the user explicitly wants one.
  Implement a lightweight, on-brand consent banner; **do not initialize/emit analytics until
  the user accepts** (persist the choice, e.g. localStorage). Treat it as future-proofing for
  any cookie-based tooling added at go-live. Decline = analytics stays off.

### Shipping & Returns (TRST-03)
- **D-11:** **Two separate pages: `/shipping` and `/returns`.** Each is its own route with its
  own metadata (feeds SEO-01). Not a combined page.
- **D-12:** **Placeholder policy copy drafted by Claude** — on-brand, plausible shipping and
  returns text; owner edits the real terms later. Content is **static** (page components /
  content files), not DB- or admin-managed this phase.
- **D-13:** **Linked from the footer (site-wide) AND the PDP** (near the size guide /
  add-to-cart, where purchase questions arise). Not added to checkout this phase.

### SEO (SEO-01) — Claude's Discretion, defaults locked
- **D-14:** Standard Next.js App Router approach: `generateMetadata` on dynamic routes (PDP,
  collections, shop) + static `metadata` on content/policy pages; `app/sitemap.ts` and
  `app/robots.ts`; **Product JSON-LD** (name, image, description, `offers` with price/currency/
  availability, and `aggregateRating` from D-04 when reviews exist). Open Graph/Twitter tags on
  key pages. Exact tag set is planner/researcher discretion.

### Performance & Accessibility (PERF-01) — Claude's Discretion, defaults locked
- **D-15:** Targets: **WCAG 2.1 AA** and **Lighthouse ≥90 performance / 100 accessibility** on
  home, `/shop`, and PDP. Includes image optimization (next/image), semantic landmarks, focus
  states, alt text, color-contrast within the locked palette, and reduced-motion. Planner
  refines the exact checklist and how it's measured.

### Claude's Discretion
- Exact `Review` schema fields + one-review-per-user enforcement; the verified-purchase lookup
  implementation (querying `Order.items` JSON); review list pagination/sort on the PDP; size-
  guide config shape; the `trackEvent()` signature and per-event payloads; consent-banner
  storage + copy; policy-page copy; the full SEO tag/JSON-LD set; and the precise perf/a11y
  remediation checklist — all planner/researcher choices, consistent with the locked design
  system, dev-runnability, and the SQLite-now / Postgres-later constraint.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project decisions & scope
- `.planning/PROJECT.md` — locked aesthetic + tech stack, dev-fallback-runnable constraint,
  "images/content supplied later" framing, M2 sequencing (trust before go-live).
- `.planning/ROADMAP.md` §"Phase 10: Trust & Polish" — goal + 4 success criteria (UI hint: yes).
- `.planning/REQUIREMENTS.md` — TRST-01, TRST-02, TRST-03, SEO-01, PERF-01, ANLY-01 acceptance text.
- `.planning/phases/09-store-operations-admin/09-CONTEXT.md` + `09-VERIFICATION.md` — the
  `/admin` + `requireOwner()` gate that review moderation reuses; `Order`/`Order.items`
  snapshot shape used for verified-purchase checks; stock-aware catalog behavior reviews build on.

### Existing implementation to extend
- `prisma/schema.prisma` — add a **`Review`** model (`productId`, `userId`, `rating`, `title`,
  `body`, `createdAt`; relations to `Product` and `User`). `Order`/`Order.items` (JSON snapshot)
  is the source for verified-purchase eligibility. Must work on SQLite now, survive the Phase 11
  Postgres migration.
- `lib/orders.ts` — existing order queries; extend to answer "has user U purchased product P?".
- `lib/admin.ts` (`requireOwner()`) + `app/admin/**` — add a reviews-moderation surface behind
  the owner gate (list / hide / delete).
- `lib/products.ts` + `lib/catalog.ts` — include aggregate rating (avg + count) when returning
  products for cards + PDP, without breaking the Phase 8 stock-aware query path.
- `app/product/[slug]/page.tsx` — reviews section + submit form, "Size guide" modal trigger,
  shipping/returns links, `generateMetadata`, and Product JSON-LD land here.
- `components/ProductCard.tsx` — compact star-average display on grids.
- `components/AddToCart.tsx` — `add_to_cart` event; the size selector is where the size-guide
  link sits.
- `components/Footer.tsx` — currently links only shop/categories; add `/shipping` + `/returns`.
- `app/layout.tsx` — root metadata already lives here; analytics provider + consent banner
  mount at the root (or via `components/Providers.tsx`).
- Checkout flow (`app/checkout/**`, `app/api/checkout/route.ts`) + success/`app/order/**` —
  `begin_checkout` and `purchase` event call sites.
- Phase 8 search input (in `components/shop/` or `app/shop`) — `search` event call site.
- **New files (planner names them):** `app/sitemap.ts`, `app/robots.ts`, `lib/analytics.ts`
  (`trackEvent`), size-guide config + `SizeGuideModal`, a consent-banner component,
  `app/shipping/page.tsx`, `app/returns/page.tsx`, review components.

### External docs referenced during discussion
- None — no external specs/ADRs cited. Requirements fully captured in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/admin.ts` `requireOwner()` + `app/admin/**` (Phase 9) — reuse verbatim for review
  moderation; no new auth mechanism needed.
- `lib/orders.ts` + `Order.items` JSON snapshot — already contains purchased product identity;
  the verified-purchase check reads from here.
- `lib/catalog.ts` / `lib/products.ts` query builders (Phase 8) — extend to attach aggregate
  ratings; keep the stock-aware `where` clause intact.
- `components/ProductCard.tsx`, PDP, `Footer.tsx`, `AddToCart.tsx` — extend in place for stars,
  size-guide link, and policy links.
- Reduced-motion + locked-palette conventions (M1) — the size-guide modal and consent banner
  must follow them.

### Established Patterns
- Server Components fetch via `lib/*`; interactivity lives in `"use client"` islands. The review
  form, size-guide modal, and consent banner are client islands; submit-review is a **server
  action guarded by session + verified-purchase** (mirrors Phase 9's action-first `requireOwner`
  pattern, but gated on ownership-of-purchase instead).
- Prisma `cuid` ids; prices integer cents; arrays JSON-encoded — but relational tables are now
  established (Phase 9 `ProductSizeStock`), so **`Review` is a proper related table**, not JSON.
- Metadata currently only on `app/layout.tsx` — SEO-01 introduces per-route `generateMetadata`.

### Integration Points
- **Reviews ↔ catalog:** aggregate rating must join into the Phase 8 catalog query path used by
  both `/shop` and collection pages.
- **Reviews ↔ SEO:** Product JSON-LD `aggregateRating` is populated from the same aggregate.
- **Analytics ↔ consent:** `trackEvent()` must be a no-op until consent is accepted AND when no
  Vercel key is present (dev).
- **Policy pages ↔ footer/PDP:** new routes wired into existing nav surfaces.

</code_context>

<specifics>
## Specific Ideas

- Reviews should read as **trustworthy by construction** — only real buyers, every review a
  "Verified purchase". Volume is secondary to credibility.
- Size guide should feel **in-context** (modal from the PDP), on-brand, never a jarring page jump.
- Analytics should be **privacy-respecting** — cookieless provider, and the user still wants a
  consent banner in front of it as a deliberate trust signal.
- Shipping/returns are **real, separate pages** a shopper (and search engines) can find, with
  placeholder-but-plausible copy the owner refines before go-live.

</specifics>

<deferred>
## Deferred Ideas

- **Stock auto-decrement on purchase / server-side sold-out rejection at checkout** — Phase 11
  (carried from Phase 9 D-10).
- **Review photos / media** — would need the file-upload/storage infra that's explicitly out of
  scope for M2; revisit post-launch.
- **Review reporting/flagging by customers, replies, helpful-votes** — not this phase; owner
  removal is sufficient for a single-owner store now.
- **Admin-editable size guides & policy pages (no-code content management)** — future; static
  placeholder content now.
- **GA4 / richer marketing analytics + A/B testing** — beyond ANLY-01's key-event funnel.
- **Confirmation emails, order history, real OAuth/Stripe, deployment, Postgres** — Phase 11.

None of these belong in Phase 10.

</deferred>

---

*Phase: 10-Trust & Polish*
*Context gathered: 2026-07-23*
