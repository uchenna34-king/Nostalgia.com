# Phase 10: Trust & Polish - Research

**Researched:** 2026-07-24
**Domain:** Reviews/ratings, size guides, policy pages, Next.js 14 SEO, Vercel Analytics, perf/a11y verification
**Confidence:** HIGH (schema/query patterns, SEO APIs, package legitimacy) / MEDIUM (exact perf-measurement workflow, analytics consent-gating shape)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Verified purchasers only — a user may review a product only if signed in AND owns an `Order` whose `items` snapshot contains that product. Every review shows a "Verified purchase" treatment. One review per user per product (planner decides edit-vs-replace on re-submit).
- **D-02:** Auto-publish with owner removal. No approval queue. Owner hides/deletes via `/admin` reusing `requireOwner()`. No customer report/flag flow.
- **D-03:** Review shape = 1-5 star rating (required) + title + body text. Lean: title required, body optional. Store `createdAt`, `userId`, `productId`, rating, title, body.
- **D-04:** Aggregate rating surfaces on PDP (avg + count + list), product cards (compact average), and Product JSON-LD `aggregateRating`. Zero reviews -> graceful empty state, omit `aggregateRating` from JSON-LD.
- **D-05:** Per-category size charts (Outerwear, Knitwear, Tees, Accessories); product shows the chart matching its `category`; no per-product overrides.
- **D-06:** On-brand modal/drawer from a "Size guide" link near the size selector; honors locked aesthetic + reduced-motion.
- **D-07:** Placeholder measurement data now, static `lib/size-guides` config keyed by category; not admin-editable this phase.
- **D-08:** Provider = Vercel Web Analytics + Speed Insights (`@vercel/analytics`, `@vercel/speed-insights`); cookieless; must no-op locally without keys; wrapped in a provider-agnostic `trackEvent()` (`lib/analytics.ts`).
- **D-09:** Full-funnel events via `trackEvent()`: `view_product`, `add_to_cart`, `begin_checkout`, `purchase`, `search`.
- **D-10:** Cookie-consent banner gates analytics — do not initialize/emit until accepted; persist choice (e.g. localStorage); decline = analytics stays off.
- **D-11:** Two separate pages `/shipping` and `/returns`, each with own metadata.
- **D-12:** Placeholder policy copy (Claude-drafted, on-brand); static content, not DB/admin-managed this phase.
- **D-13:** Linked from footer (site-wide) AND PDP; not added to checkout.
- **D-14:** SEO — `generateMetadata` on dynamic routes + static `metadata` on content pages; `app/sitemap.ts` + `app/robots.ts`; Product JSON-LD (name, image, description, `offers`, `aggregateRating` when reviews exist); OG/Twitter tags on key pages.
- **D-15:** Targets — WCAG 2.1 AA and Lighthouse >=90 perf / 100 a11y on home, `/shop`, PDP. Includes next/image, semantic landmarks, focus states, alt text, contrast within locked palette, reduced-motion.

### Claude's Discretion
- Exact `Review` schema fields + one-review-per-user enforcement mechanism; verified-purchase lookup implementation; review list pagination/sort; size-guide config shape; `trackEvent()` signature/payloads; consent-banner storage/copy; policy-page copy; full SEO tag/JSON-LD set; precise perf/a11y remediation checklist.

### Deferred Ideas (OUT OF SCOPE)
- Stock auto-decrement / server-side sold-out rejection at checkout (Phase 11).
- Review photos/media (needs file-upload infra, out of scope for M2).
- Review reporting/flagging, replies, helpful-votes.
- Admin-editable size guides & policy pages.
- GA4 / richer marketing analytics + A/B testing.
- Confirmation emails, order history, real OAuth/Stripe, deployment, Postgres migration (Phase 11).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRST-01 | Customer can read and submit product reviews/ratings on product pages | `Review` Prisma model + `@@unique([productId,userId])`, verified-purchase eligibility via `Order.items` JSON scan, aggregate rating via `groupBy`/`aggregate`, UI-SPEC review form/list contract |
| TRST-02 | Product pages surface size guides | Static `lib/size-guides.ts` config keyed by category + `SizeGuideModal` client component (dialog a11y pattern) |
| TRST-03 | Shipping & returns information pages exist and are linked | `/shipping`, `/returns` static App Router pages with `metadata` export; Footer + PDP link wiring |
| SEO-01 | Pages emit correct metadata, sitemap, and structured data | `generateMetadata`, `app/sitemap.ts` (`MetadataRoute.Sitemap`), `app/robots.ts` (`MetadataRoute.Robots`), Product JSON-LD `<script>` pattern |
| PERF-01 | Site meets defined performance and accessibility targets | `next/image` migration, semantic landmarks, `jest-axe` component tests, manual `npx lighthouse` runs on Windows (Chrome confirmed installed) |
| ANLY-01 | Key storefront events are tracked in analytics | `@vercel/analytics` + `@vercel/speed-insights` (confirmed no-op outside Vercel deploys by design), `lib/analytics.ts` `trackEvent()` gated by consent, call sites at 5 events |
</phase_requirements>

## Summary

Phase 9 already established the two precedents Phase 10 needs most: a proper related table pattern (`ProductSizeStock` with `@@unique([productId, size])`) instead of JSON columns, and a Prisma-free "pure logic" module style (`lib/catalog.ts`, `lib/orders.ts`) paired with Prisma-importing query modules (`lib/products.ts`, `lib/admin.ts`) that are verified in-browser rather than under Vitest. Phase 10 follows both conventions: `Review` becomes a real relational table with a compound unique constraint enforcing one-review-per-user-per-product at the DB level (portable to Postgres unchanged), and a new `lib/reviews.ts` (Prisma-importing) holds the verified-purchase check and rating aggregation, while pure helpers (rating validation, JSON-LD builder, size-guide lookup) stay Prisma-free and Vitest-testable.

The trickiest real unknown is verified-purchase eligibility: `Order.items` is a JSON string keyed by product `slug`, not `productId`, and Prisma has no portable way to query inside that JSON across SQLite and future Postgres without raw, dialect-specific SQL. The correct approach is NOT a raw JSON query — it's fetching the user's own (small) order set with `where: { userId }` (already indexed) and scanning the parsed items in application code, reusing the existing `parseOrderItems` helper from `lib/orders.ts`. This scales with orders-per-customer, not table size, so it stays cheap regardless of catalog growth.

For aggregate ratings, avoid both N+1 (one query per product) and full-relation loading (pulling every review row into the catalog query). Use `prisma.review.groupBy({ by: ["productId"], where: { productId: { in: pageProductIds } }, _avg: { rating: true }, _count: { rating: true } })` as one extra query per catalog PAGE (bounded to 24 IDs) or per single PDP product — genuinely flat cost, not N+1, and it requires zero schema changes beyond the `Review` relation itself.

SEO-01 maps directly onto stable, already-shipped Next.js 14 App Router conventions (`generateMetadata`, `app/sitemap.ts`, `app/robots.ts`, inline JSON-LD `<script>` with the `<`-escape mitigation) — all confirmed against current official Next.js docs. `@vercel/analytics` is confirmed by Vercel's own docs to no-op in development by design (no code needed to satisfy the dev-fallback constraint), so the phase's real analytics work is the consent-gating layer on top, plus wrapping `track()` in a `trackEvent()` abstraction. PERF-01's Lighthouse targets cannot be fully automated in a 30-second CI-style command on this project (no CI runner configured, no `@lhci/cli` setup) — the pragmatic, Windows-compatible approach is `npx lighthouse http://localhost:3002/<route> --only-categories=performance,accessibility --output=json` run manually per route (Chrome is confirmed installed on this machine at `C:\Program Files\Google\Chrome\Application\chrome.exe`), paired with automated component-level a11y regression tests via `jest-axe` (works with Vitest's `expect.extend`, confirmed via web search) for the new Phase 10 components.

**Primary recommendation:** Add `Review` as a real Prisma relation (not JSON) with a compound unique constraint; keep verified-purchase eligibility as an in-app JSON scan over a user's own small order set (no raw SQL); attach ratings via a bounded `groupBy`/`aggregate` query, never via `include`; implement SEO with the current official `generateMetadata`/`sitemap.ts`/`robots.ts`/JSON-LD APIs verbatim; let `@vercel/analytics`'s built-in dev no-op handle the dev-fallback constraint and add only a thin consent-gate on top; verify PERF-01 with `jest-axe` component tests (automated, in-suite) plus manual per-route `npx lighthouse` runs (documented, not scripted into `npm test`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Review submission (write) | API/Backend (Server Action + Prisma) | — | Mutates DB, must re-check ownership/eligibility server-side (mirrors Phase 9 `requireOwner()` pattern) |
| Review list + aggregate rating (read) | API/Backend (Prisma query) | Frontend Server (RSC render) | Query composition lives in `lib/reviews.ts`; RSC page renders the result |
| Review moderation (admin hide/delete) | API/Backend | — | Reuses `requireOwner()` gate verbatim, same tier as Phase 9 admin actions |
| Size guide content | Frontend Server (static `lib/size-guides.ts` + RSC read) | Browser/Client (modal open/close only) | No DB, no request — pure static data; only the dialog interaction is client-side |
| Shipping/returns pages | Frontend Server (SSR static content) | — | Fully static per D-12; no DB, no client state |
| SEO metadata/sitemap/robots/JSON-LD | Frontend Server (Next.js server-only file conventions) | — | `generateMetadata`, `sitemap.ts`, `robots.ts` only exist server-side by framework contract |
| Analytics event emission | Browser/Client (`trackEvent()` calls, `<Analytics/>`) | External Service (Vercel collector) | Client components fire events; Vercel's edge endpoint aggregates — no app-owned backend involved |
| Consent banner | Browser/Client (localStorage + client component) | — | Pure UI state, no server round-trip |
| Performance/accessibility | Cross-cutting (all tiers) | — | Applies to markup semantics (Frontend Server), images (`next/image`, Browser/Client), and query efficiency (API/Backend) simultaneously |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/analytics` | 2.0.1 [VERIFIED: npm registry] | Cookieless pageview + custom event tracking (ANLY-01) | Matches D-08 locked decision; official Vercel package; confirmed no-op in development by design [CITED: vercel.com/docs/analytics/using-web-analytics] |
| `@vercel/speed-insights` | 2.0.0 [VERIFIED: npm registry] | Core Web Vitals collection (PERF-01 support) | Companion to Analytics, same deploy target, same no-op-in-dev behavior |

### Supporting (dev/test only — not shipped to production bundle)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jest-axe` | 10.0.0 [VERIFIED: npm registry] | Automated structural a11y assertions (`toHaveNoViolations`) in Vitest component tests | New Phase 10 client components: review form, size-guide modal, consent banner |
| `lighthouse` | latest (flagged, see Package Legitimacy Audit) | Manual perf/a11y scoring against a running dev server | One-off/periodic verification runs against home, `/shop`, PDP — not wired into `npm test` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jest-axe` | `vitest-axe` | Vitest-native wrapper, but its last publish predates current Vitest 4.x majors (stale relative to this project's Vitest version); `jest-axe` is actively maintained (2025 publish) and works identically via `expect.extend` — lower compatibility risk |
| `groupBy`/`aggregate` per-page rating queries | Denormalized `avgRating`/`reviewCount` columns on `Product` (counter-cache pattern) | Denormalization avoids the extra query entirely but requires updating the counter on every review create/update/delete/admin-remove — more write-path surface area for a phase whose read path is the priority; revisit if catalog scale ever makes the extra groupBy query measurable |
| `npx lighthouse` manual runs | `@lhci/cli` with `lighthouserc.js` assertions | Full Lighthouse CI is the "correct" long-term setup but assumes a CI runner and thresholds config this solo local-dev project doesn't have yet — overkill for one verification pass before go-live |

**Installation:**
```bash
npm install @vercel/analytics @vercel/speed-insights
npm install -D jest-axe
# lighthouse run via npx (no persistent install needed):
npx lighthouse http://localhost:3002 --only-categories=performance,accessibility --output=json --output-path=./lighthouse-home.json --chrome-flags="--headless=new"
```

**Version verification:** `npm view @vercel/analytics version` -> 2.0.1; `npm view @vercel/speed-insights version` -> 2.0.0; `npm view jest-axe version` -> 10.0.0 (all confirmed live against the npm registry during this research session, 2026-07-24).

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@vercel/analytics` | npm | published 2026-03-12 (mature project, frequent releases) | 4.8M/wk | github.com/vercel/analytics | OK | Approved |
| `@vercel/speed-insights` | npm | published 2026-03-10 | 3.1M/wk | github.com/vercel/speed-insights | OK | Approved |
| `jest-axe` | npm | published 2025-03-03 | 2.2M/wk | github.com/nickcolley/jest-axe | OK | Approved |
| `axe-core` | npm | published 2026-06-10 | 59M/wk | github.com/dequelabs/axe-core | OK | Approved (transitive dep of jest-axe) |
| `vitest-axe` | npm | published 2022-10-21 (0.1.0, no version bump since) | 1.2M/wk | github.com/chaance/vitest-axe | OK | Not recommended — considered and rejected in favor of `jest-axe` (staleness risk vs. current Vitest 4.x), not removed for legitimacy reasons |
| `lighthouse` | npm | most recent publish 2026-07-20 (flagged "too-new" by the recency heuristic — the project itself is the long-established official GoogleChrome/lighthouse tool, just released a routine version 3 days before this research date) | 3.6M/wk | github.com/GoogleChrome/lighthouse | SUS ("too-new") | Flagged — planner must add a `checkpoint:human-verify` task before running `npm install -D lighthouse` (or confirm the `npx lighthouse` invocation pulls the expected official package) even though the recency flag is a false-positive artifact of a routine release cadence, not a hallucination/typosquat signal |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `lighthouse` — flagged purely on publish recency (routine release), not on identity/repo/download signals, which are all strong. Planner should still gate the install behind a `checkpoint:human-verify` per protocol.

## Architecture Patterns

### System Architecture Diagram

```
Customer (browser)
   |
   |-- GET /product/[slug] --------------------> PDP Server Component
   |                                                 |-- getProductBySlug(slug)  [lib/products.ts]
   |                                                 |     `-- attaches rating via getRatingSummaries([id]) [lib/reviews.ts]
   |                                                 |-- getReviewsForProduct(productId, page) [lib/reviews.ts]
   |                                                 |-- getReviewEligibility(userId, slug) [lib/reviews.ts]
   |                                                 |     `-- reads Order.items JSON via prisma.order.findMany({where:{userId}})
   |                                                 |         then parseOrderItems() + .some(slug match)   [lib/orders.ts pure helper reused]
   |                                                 `-- renders: rating summary, review list, submit form (client island), JSON-LD <script>, Size guide trigger, shipping/returns links
   |
   |-- POST submitReview (Server Action) ---------> requireEligibleReviewer(session, productSlug)
   |                                                 |-- re-check eligibility server-side (never trust client "is eligible" state)
   |                                                 `-- prisma.review.upsert({ where: { productId_userId }, ... })  [enforces D-01 one-per-user]
   |                                                     `-- revalidatePath(`/product/${slug}`)
   |
   |-- GET /shop, /collections/[slug] -------------> getCatalog() / getCollections() [lib/products.ts, unchanged stock-aware where]
   |                                                 `-- getRatingSummaries(pageProductIds) [lib/reviews.ts] merged in, one extra bounded groupBy query
   |
   |-- GET /sitemap.xml, /robots.txt ---------------> app/sitemap.ts, app/robots.ts (Next.js server-only conventions, read prisma directly)
   |
   |-- GET /shipping, /returns ---------------------> static App Router pages, `metadata` export, no DB
   |
   |-- Consent banner (client, post-mount) ---------> reads/writes localStorage["nostalgia-consent"]
   |         `-- accepted --> mounts <Analytics/> + <SpeedInsights/>; trackEvent() calls become live
   |         `-- declined/none --> trackEvent() no-ops; components stay unmounted
   |
   `-- trackEvent("view_product"|"add_to_cart"|"begin_checkout"|"purchase"|"search") [lib/analytics.ts]
             `-- gate 1: hasConsent() -> gate 2: @vercel/analytics track() (itself a no-op outside a Vercel deploy, by design)
                 `-- External: Vercel Analytics collector (only reachable in production deploys)

Admin (owner-gated, unchanged tier)
   |-- GET /admin/reviews --------------------------> requireOwner() -> list all reviews
   `-- POST hideReview/deleteReview (Server Action) -> requireOwner() -> prisma.review.delete(...)
```

### Recommended Project Structure
```
lib/
├── reviews.ts          # NEW — Prisma-importing: eligibility check, rating groupBy/aggregate, review CRUD queries
├── size-guides.ts       # NEW — Prisma-free: static per-category measurement config (pure data + a getSizeGuide(category) lookup)
├── analytics.ts         # NEW — Prisma-free, browser-only: trackEvent() wrapper + consent read/write helpers
├── seo.ts               # NEW — Prisma-free: pure buildProductJsonLd(product) builder (unit-testable escaping logic)
├── orders.ts            # EXTEND — no signature change; parseOrderItems() reused by lib/reviews.ts
├── catalog.ts           # UNCHANGED — stock-aware where clause stays untouched; rating is a separate query, not merged into where
├── products.ts          # EXTEND — Product type gains `rating: { avg: number; count: number }`, merged post-query
app/
├── sitemap.ts            # NEW
├── robots.ts             # NEW
├── shipping/page.tsx      # NEW — static metadata + placeholder copy
├── returns/page.tsx       # NEW — static metadata + placeholder copy
├── product/[slug]/page.tsx  # EXTEND — generateMetadata, JSON-LD script, reviews section, size-guide trigger
├── admin/reviews/          # NEW — page.tsx + actions.ts (requireOwner-gated hide/delete)
components/
├── ReviewList.tsx          # NEW
├── ReviewForm.tsx          # NEW (client island)
├── RatingStars.tsx         # NEW — shared 16/20/28px star glyph (single SVG path per D-13 UI-SPEC)
├── SizeGuideModal.tsx      # NEW (client island, dialog a11y contract)
├── ConsentBanner.tsx       # NEW (client island)
├── ProductCard.tsx         # EXTEND — compact rating row
├── AddToCart.tsx           # EXTEND — Size guide trigger link + add_to_cart trackEvent call
├── Footer.tsx              # EXTEND — /shipping + /returns links
├── Providers.tsx           # EXTEND — conditionally mounts <Analytics/>/<SpeedInsights/> post-consent
tests/
├── reviews.test.ts          # NEW — pure eligibility/rating-merge logic
├── size-guides.test.ts      # NEW
├── seo.test.ts              # NEW — JSON-LD escaping + shape
├── analytics.test.ts        # NEW — trackEvent gating logic
├── a11y.test.tsx            # NEW — jest-axe component checks
```

### Pattern 1: Compound-unique Review model (mirrors Phase 9 `ProductSizeStock`)
**What:** A real relational `Review` table with `@@unique([productId, userId])`.
**When to use:** Any "one row per (user, resource)" constraint — same shape as `ProductSizeStock`'s `@@unique([productId, size])`.
**Example:**
```prisma
// prisma/schema.prisma — add to existing schema
model Review {
  id        String   @id @default(cuid())
  productId String
  userId    String
  rating    Int      // 1-5, validated in app code (isValidRating), not a DB CHECK constraint
  title     String
  body      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([productId, userId])
  @@index([productId])
  @@index([userId])
}
```
Add `reviews Review[]` to both `Product` and `User` models. `@@unique` compound constraints are ANSI-portable — identical behavior on SQLite now and Postgres after the Phase 11 migration; no dialect-specific syntax introduced (unlike the pre-existing `contains` case-sensitivity workaround already isolated in `lib/catalog.ts`).

**Edit-vs-replace on resubmit:** use `prisma.review.upsert({ where: { productId_userId: { productId, userId } }, update: { rating, title, body }, create: { productId, userId, rating, title, body } })`. Upsert is atomic and preserves the row's `id`/`createdAt` on edit — recommended over delete-then-recreate, which risks a race window and loses `createdAt` provenance. [ASSUMED — this satisfies D-01/D-03 intent but the exact edit vs. hard-block-on-resubmit choice was left to planner discretion in CONTEXT.md; flagged in Assumptions Log]

### Pattern 2: Verified-purchase eligibility via in-app JSON scan (no raw SQL)
**What:** Answer "has user U purchased product P?" by fetching the user's own orders (indexed, small set) and scanning parsed `items` in JS — never a raw `json_extract`/`->>` query.
**When to use:** Any check against the `Order.items` JSON snapshot until it's normalized into a real `OrderItem` table (not this phase).
**Example:**
```typescript
// lib/reviews.ts (new, Prisma-importing — mirrors lib/products.ts split)
import { prisma } from "@/lib/db";
import { parseOrderItems } from "@/lib/orders"; // reuse existing pure helper

/** Orders counted as "purchased" for review eligibility — pending/cancelled excluded. */
const ELIGIBLE_STATUSES = ["paid", "fulfilled"] as const;

export async function hasPurchased(
  userId: string,
  productSlug: string,
): Promise<boolean> {
  const orders = await prisma.order.findMany({
    where: { userId, status: { in: [...ELIGIBLE_STATUSES] } },
    select: { items: true },
  });
  return orders.some((o) =>
    parseOrderItems(o.items).some((item) => item.slug === productSlug),
  );
}
```
**Why this works at this scale:** the query is `where: { userId }` (already an FK, effectively indexed by relation), so cost scales with orders-per-customer (small, bounded), never with total order-table size. [ASSUMED: restricting eligibility to `paid`/`fulfilled` orders (excluding `pending`/`cancelled`) — CONTEXT.md's D-01 says "owns an Order whose items snapshot contains that product" without specifying status filtering; flagged in Assumptions Log as a planner/user confirmation point.]

**What changes at Postgres migration:** nothing structurally required — if per-user order volume ever became large enough to matter (unlikely for a single-brand store), the real fix is normalizing `Order.items` into a relational `OrderItem` table, which is explicitly out of scope for both this phase and Phase 11 per CONTEXT.md.

### Pattern 3: Bounded rating aggregation (no N+1, no full-relation load)
**What:** One extra `groupBy`/`aggregate` query per catalog PAGE or per single PDP product — never one query per product.
**Example:**
```typescript
// lib/reviews.ts
export type RatingSummary = { avg: number; count: number };

export async function getRatingSummaries(
  productIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (productIds.length === 0) return new Map();
  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { productId: { in: productIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return new Map(
    grouped.map((g) => [
      g.productId,
      { avg: g._avg.rating ?? 0, count: g._count.rating },
    ]),
  );
}

// Single-product PDP variant — same cost profile, cleaner call site:
export async function getRatingSummary(productId: string): Promise<RatingSummary> {
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return { avg: agg._avg.rating ?? 0, count: agg._count.rating };
}
```
Call site in `lib/products.ts`: after `getCatalog()`/`getProductBySlug()` fetch rows, call `getRatingSummaries(rows.map(r => r.id))` and merge into the returned `Product[]`, defaulting missing entries to `{ avg: 0, count: 0 }` (D-04's zero-reviews empty state). **This never touches `buildProductWhere`'s stock-aware clause** — rating is a separate, subsequent query, so the Phase 8/9 catalog `where`/pagination path is untouched by construction.

### Pattern 4: Next.js 14 SEO — generateMetadata / sitemap.ts / robots.ts / JSON-LD
**What:** Current official App Router conventions for per-page metadata, sitemap, robots, and structured data.
**Example (PDP metadata):**
```typescript
// app/product/[slug]/page.tsx
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: `${product.name} — Nostalgia`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images[0] ? [{ url: product.images[0] }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description,
      images: product.images[0] ? [product.images[0]] : undefined,
    },
  };
}
```
[CITED: nextjs.org/docs/app/api-reference/functions/generate-metadata]

```typescript
// app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3002"; // same origin-resolution convention already used in app/api/checkout/route.ts — never trust request Origin

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([
    prisma.product.findMany({ select: { slug: true, createdAt: true } }),
    prisma.collection.findMany({ select: { slug: true } }),
  ]);
  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/shipping`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/returns`, changeFrequency: "yearly", priority: 0.3 },
    ...products.map((p) => ({
      url: `${BASE}/product/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...collections.map((c) => ({
      url: `${BASE}/collections/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
```
[CITED: nextjs.org/docs/app/api-reference/file-conventions/metadata/robots — Sitemap/Robots use `MetadataRoute.Sitemap`/`MetadataRoute.Robots` types]

```typescript
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3002";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/checkout"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
```

**Product JSON-LD (official pattern):**
```tsx
// lib/seo.ts — pure, Prisma-free, unit-testable
export function buildProductJsonLd(product: {
  name: string; images: string[]; description: string; price: number;
  inStock: boolean; rating: { avg: number; count: number };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: (product.price / 100).toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(product.rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.avg.toFixed(1),
            reviewCount: product.rating.count,
          },
        }
      : {}),
  };
}

// app/product/[slug]/page.tsx render site:
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(buildProductJsonLd(product)).replace(/</g, "\\u003c"),
  }}
/>
```
[CITED: nextjs.org/docs/app/guides/json-ld — official pattern including the `<` XSS-mitigation escape, verbatim]

### Pattern 5: Analytics — no-op-by-default + explicit consent gate
**What:** `@vercel/analytics` is confirmed by Vercel's own docs to not send data in development by design (detects `NODE_ENV !== "production"` / non-Vercel deploy automatically) [CITED: vercel.com/docs/analytics/using-web-analytics, vercel.com/docs/analytics/package]. This satisfies D-08's "must no-op locally" with zero extra app code. The phase's real work is the consent layer on top.
**Example:**
```typescript
// lib/analytics.ts — Prisma-free, browser-only
import { track } from "@vercel/analytics";

const CONSENT_KEY = "nostalgia-consent";
type ConsentValue = "accepted" | "declined";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(CONSENT_KEY);
  return v === "accepted" || v === "declined" ? v : null;
}

export function setConsent(value: ConsentValue): void {
  window.localStorage.setItem(CONSENT_KEY, value);
}

export function hasConsent(): boolean {
  return getConsent() === "accepted";
}

type EventName =
  | "view_product"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "search";

export function trackEvent(
  name: EventName,
  payload?: Record<string, string | number | boolean>,
): void {
  if (!hasConsent()) return; // gate 1: consent — required by D-10
  try {
    track(name, payload); // gate 2: @vercel/analytics itself no-ops outside a Vercel deploy
  } catch {
    // analytics must never break the app — swallow (dev-fallback constraint)
  }
}
```
```tsx
// components/Providers.tsx — conditional mount, post-consent, avoids hydration flash
"use client";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { hasConsent } from "@/lib/analytics";

function AnalyticsGate() {
  const [consented, setConsented] = useState(false);
  useEffect(() => { setConsented(hasConsent()); }, []);
  if (!consented) return null;
  return (<><Analytics /><SpeedInsights /></>);
}
```
Mount `<AnalyticsGate />` inside `Providers.tsx` alongside the existing `SessionProvider`/`CartProvider`/`WishlistProvider` nesting. The `ConsentBanner` component (per UI-SPEC) calls `setConsent("accepted"|"declined")` on button click and should trigger a re-check (e.g. a shared context or a custom event) so `AnalyticsGate` re-renders immediately after acceptance without requiring a page reload.

### Anti-Patterns to Avoid
- **Raw `json_extract`/`json_each` queries against `Order.items`:** works on SQLite, has a different syntax on Postgres (`->>`/`jsonb_array_elements`) — breaks silently at the Phase 11 migration. Always scan in application code instead (Pattern 2).
- **`include: { reviews: true }` on catalog queries:** pulls every review row for every product on every `/shop` page load — the literal N+1/over-fetch this research question warns against. Use `groupBy`/`aggregate` instead (Pattern 3).
- **Gating `<Analytics/>` only via a prop instead of conditional mount:** `@vercel/analytics`'s React component does not expose a runtime "paused" prop for consent — conditionally rendering the component (Pattern 5) is the correct mechanism, not passing a disable flag.
- **Embedding JSON-LD without the `<` escape:** `JSON.stringify` does not sanitize a `</script>`-breakout string; always apply the escape shown in Pattern 4.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One-review-per-user-per-product enforcement | App-level "check then insert" race-prone logic | Prisma `@@unique([productId, userId])` + `upsert` | DB-level constraint is atomic and race-free; mirrors the exact pattern already proven in `ProductSizeStock` |
| Rating average/count computation | Manual `SELECT * FROM Review WHERE productId = ?` + reduce in JS per product | `prisma.review.groupBy`/`aggregate` | Database-computed aggregation is a single indexed query; hand-rolled reduction re-implements what SQL already does efficiently |
| Cookie-consent state machine | Custom cookie-parsing / server-side consent middleware | `localStorage` + a client component (per UI-SPEC D-10) | Vercel Analytics is cookieless; a full consent-management-platform is unnecessary complexity for a single opt-in/opt-out toggle |
| Accessible modal dialog (size guide) | Hand-rolled focus trap from scratch | Native `<dialog>`-adjacent pattern already used by `CartDrawer`'s slide-transition technique (per UI-SPEC) + manual `role="dialog"`/focus-trap/Escape/restore-focus wiring | The codebase has zero dialog/modal libraries (locked "no shadcn/radix" constraint) — replicate `CartDrawer`'s existing hand-rolled a11y wiring rather than inventing a new pattern or reaching for a new dependency |
| Structured-data schema shape | Freeform custom JSON keys | schema.org `Product`/`Offer`/`AggregateRating` vocabulary exactly as Next.js's official guide shows | Search engines validate against schema.org vocabulary; inventing custom keys produces JSON-LD that Google's Rich Results Test rejects |

**Key insight:** every "don't hand-roll" item in this phase has a pre-existing, in-repo precedent to imitate (`ProductSizeStock`'s unique constraint, `CartDrawer`'s modal-adjacent a11y wiring, Phase 8's `groupBy`-style query composition) — the discipline here is pattern-matching to what Phase 8/9 already proved, not introducing new library dependencies.

## Common Pitfalls

### Pitfall 1: Matching reviews eligibility by `productId` when the snapshot only has `slug`
**What goes wrong:** `Review.productId` is the DB id (correct for the FK), but `Order.items[].slug` is the only product identifier stored in the JSON snapshot. A naive eligibility check that tries to compare `item.productId` will never match (the field doesn't exist in `OrderItem`).
**Why it happens:** The `Review` schema and the `Order.items` snapshot use two different product identifiers by design (Phase 6's checkout snapshot predates Phase 10).
**How to avoid:** `hasPurchased(userId, productSlug)` takes a **slug**, not an id; the PDP page already has `product.slug` in scope from `getProductBySlug`, so pass it directly — no extra lookup needed.
**Warning signs:** Eligibility always returns `false` even for a customer who obviously bought the item — check the join key first.

### Pitfall 2: Rating merge silently returning `undefined` instead of `{avg:0, count:0}`
**What goes wrong:** `Map.get(productId)` returns `undefined` for products with zero reviews; spreading/rendering an `undefined` rating crashes the PDP/card or produces `NaN` in a star-width calculation.
**Why it happens:** `groupBy` only returns rows that exist — a zero-review product has no row in the result set at all.
**How to avoid:** Always default with `summaries.get(id) ?? { avg: 0, count: 0 }` at the merge site in `lib/products.ts`, matching D-04's explicit "zero reviews -> graceful empty state, omit `aggregateRating`" requirement.
**Warning signs:** A product card renders "NaN out of 5" or throws during SSR for any product that predates the reviews feature (i.e., every seeded product on day one).

### Pitfall 3: `revalidatePath` omitted after review submission, stale rating on `/shop`
**What goes wrong:** A new review posts successfully, the PDP shows it (fresh render), but `/shop`'s product-card rating stays stale until the next unrelated deploy/revalidation.
**Why it happens:** `force-dynamic` is already set on the PDP (always fresh), but `/shop` and collection pages may rely on Next's default caching for the Server Component fetch.
**How to avoid:** Call `revalidatePath("/product/[slug]", "page")` AND `revalidatePath("/shop")` (and any collection paths the product belongs to) inside the review-submission Server Action, mirroring the exact `revalidatePath` calls already used in `app/admin/products/actions.ts`/`app/admin/orders/actions.ts`.
**Warning signs:** Rating shown on a product card doesn't match the rating shown on that product's own PDP.

### Pitfall 4: Treating `pending`/`cancelled` orders as proof of purchase
**What goes wrong:** A customer starts checkout, abandons it (stub/Stripe leaves the order `pending`), then attempts to leave a review — if eligibility counts `pending` orders, a customer who never actually paid can post a "Verified purchase" review.
**Why it happens:** `Order` rows are created before payment confirms in the Stripe path (see `app/api/checkout/route.ts` — `status: "pending"` created before the Stripe session even completes).
**How to avoid:** Restrict `ELIGIBLE_STATUSES` to `["paid", "fulfilled"]` only (Pattern 2). [ASSUMED — flagged in Assumptions Log; confirm with user/planner since CONTEXT.md doesn't explicitly specify status filtering.]
**Warning signs:** A "Verified purchase" review appears for an order that was never actually completed.

### Pitfall 5: JSON-LD script breaking page hydration or failing Rich Results validation
**What goes wrong:** Forgetting the `<` escape lets a maliciously-crafted product `description` (owner-entered via `/admin`, but still worth defending) break out of the `<script>` tag; separately, omitting required schema.org fields (`offers.priceCurrency`, `offers.availability`) causes Google's Rich Results Test to reject the markup even though it renders fine.
**Why it happens:** `JSON.stringify` alone is not XSS-safe for inline script embedding; schema.org validation is stricter than "valid JSON."
**How to avoid:** Always apply the `.replace(/</g, "\\u003c")` escape (Pattern 4) and validate the exact field set against the Next.js official example plus Google's Rich Results Test before considering SEO-01 done.
**Warning signs:** Rich Results Test / Schema Markup Validator reports errors even though the JSON parses fine in isolation.

### Pitfall 6: Lighthouse score measured against a cold/uncompiled dev build
**What goes wrong:** Running `npx lighthouse` against `npm run dev` produces misleadingly low performance scores (dev builds are unminified, unoptimized, include HMR overhead) — chasing a "≥90 performance" target against a dev server wastes effort and may not reflect production reality.
**Why it happens:** Next.js dev mode intentionally trades performance for fast iteration.
**How to avoid:** For the performance category specifically, run `npm run build && npm run start` (production build) before pointing Lighthouse at it; only the accessibility category is safe to measure against `npm run dev`, since a11y scoring doesn't depend on bundle optimization.
**Warning signs:** Performance score is far below 90 even after implementing `next/image`/optimization — check whether the audit ran against `dev` instead of `build && start`.

## Code Examples

See Architecture Patterns 1-5 above for the full verified code (Prisma schema, eligibility check, rating aggregation, SEO/JSON-LD, analytics gating) — all patterns include inline source citations.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON-encoded array columns for relational data (`sizes` string) | Real Prisma relation tables with `@@unique` compound constraints | Phase 9 (`ProductSizeStock`) | `Review` follows the same already-adopted pattern — no new precedent needed, just consistency |
| next/head manual `<meta>` tags (Pages Router era) | `generateMetadata` export + static `metadata` object (App Router) | Next.js 13+ App Router | This project is already on Next 14 App Router; SEO-01 uses the current, non-deprecated API directly |
| Google Analytics / gtag.js cookie-based tracking | Cookieless first-party analytics (Vercel Web Analytics) | D-08 locked choice | No cookie-consent legal requirement strictly needed, but the banner is kept per D-10 as a deliberate trust signal, not a legal necessity |

**Deprecated/outdated:**
- `next/head` for per-page metadata: superseded by the Metadata API (`generateMetadata`/`metadata` export) in the App Router — not used anywhere in this already-App-Router-only codebase, no migration needed.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Review edit-on-resubmit uses `upsert` (edit in place) rather than blocking resubmission entirely | Pattern 1 | Low — UI-SPEC's "Already reviewed" state assumes a single canonical review per user exists either way; upsert vs. block-resubmit is a minor behavioral choice, easy to change post-hoc |
| A2 | Verified-purchase eligibility counts only `paid`/`fulfilled` orders, excluding `pending`/`cancelled` | Pattern 2, Pitfall 4 | Medium — if the intended definition of "owns an Order" is looser (any non-deleted order regardless of status), a stricter check could wrongly block a legitimate reviewer; should be confirmed with the user before implementation locks in |
| A3 | `groupBy`/`aggregate` (query-time rating computation) is recommended over a denormalized counter-cache column | Standard Stack (Alternatives), Pattern 3 | Low — both are valid; if catalog scale grows dramatically, the extra per-page query becomes measurable and the counter-cache alternative should be revisited, but this is a performance optimization, not a correctness risk |
| A4 | `jest-axe` recommended over `vitest-axe` for accessibility test tooling | Standard Stack (Alternatives) | Low — both packages are legitimate (OK verdict); this is a maintenance-freshness judgment call, not a correctness one |

**If this table is empty:** N/A — see rows above; all other claims in this research are either `[VERIFIED: npm registry]` (package existence/versions) or `[CITED: official docs]` (Next.js/Vercel API behavior confirmed via web search against current documentation).

## Open Questions

1. **Should review eligibility count `pending` orders?**
   - What we know: `Order.status` defaults to `"pending"` and only becomes `"paid"` after Stripe/stub confirmation (see `app/api/checkout/route.ts`).
   - What's unclear: CONTEXT.md's D-01 doesn't specify a status filter explicitly.
   - Recommendation: Restrict to `["paid", "fulfilled"]` (A2 above) — confirm with user during planning if a looser definition was intended.

2. **Should `<SpeedInsights/>` be gated by consent alongside `<Analytics/>`, or mount unconditionally since it carries no user-identifying data?**
   - What we know: D-10 says "do not initialize/emit analytics until the user accepts," without carving out Speed Insights specifically.
   - What's unclear: Whether Speed Insights (pure performance timing, no user tracking) was meant to be included in "analytics" for consent purposes.
   - Recommendation: Gate both for simplicity and literal compliance with D-10's wording (Pattern 5 does this); revisit if the user wants Speed Insights running unconditionally for their own performance monitoring regardless of consent.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Google Chrome (for Lighthouse) | PERF-01 manual verification runs | Yes (confirmed at `C:\Program Files\Google\Chrome\Application\chrome.exe`) | not queried | — |
| `npm view` / npm registry access | Package legitimacy verification | Yes | — | — |
| Node.js / npm | Build/test/dev commands | Yes (project already runs `npm run dev`, `npx vitest run`) | matches existing package.json | — |
| Vercel account/project link | Actual analytics data collection in production | Not required this phase | — | `@vercel/analytics` no-ops without one; wiring is dev-verifiable structurally (consent gate, call sites) without live data |

**Missing dependencies with no fallback:** none identified.
**Missing dependencies with fallback:** Vercel project link (analytics data itself is unverifiable locally, but code correctness is).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 (already installed; jsdom environment, `globals: true`, `@testing-library/react` present) |
| Config file | `vitest.config.ts` (existing — no changes needed) |
| Quick run command | `npx vitest run tests/reviews.test.ts` (or the relevant new test file) |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRST-01 | Rating validation rejects out-of-range values (mirrors `isValidOrderStatus` allow-list idiom) | unit | `npx vitest run tests/reviews.test.ts -t isValidRating` | Wave 0 |
| TRST-01 | `hasPurchased` matches by slug against a fake parsed-items array (mockable, no DB) | unit | `npx vitest run tests/reviews.test.ts -t hasPurchased` | Wave 0 |
| TRST-01 | Rating merge defaults missing product ids to `{avg:0,count:0}` | unit | `npx vitest run tests/reviews.test.ts -t getRatingSummaries` | Wave 0 |
| TRST-01 | One-review-per-user DB constraint (`@@unique`) actually rejects a duplicate insert | integration (requires live SQLite DB) | manual: submit twice in-browser, confirm second submit edits not duplicates | N/A — in-browser only |
| TRST-01 | Review form / submit-state a11y (roles, aria-live regions, radiogroup semantics per UI-SPEC) | component (jest-axe) | `npx vitest run tests/a11y.test.tsx -t ReviewForm` | Wave 0 |
| TRST-02 | `getSizeGuide(category)` returns the correct chart, falls back sanely for an unknown category | unit | `npx vitest run tests/size-guides.test.ts` | Wave 0 |
| TRST-02 | `SizeGuideModal` dialog a11y contract (role=dialog, aria-modal, focus trap entry, Escape closes, focus restoration) | component (jest-axe + `@testing-library/react` interaction) | `npx vitest run tests/a11y.test.tsx -t SizeGuideModal` | Wave 0 |
| TRST-03 | `/shipping`, `/returns` pages render with correct `<title>`/metadata | manual/in-browser (Next.js Server Component pages aren't isolable under jsdom without mocking the framework) | curl or browser-inspect after `npm run dev` | N/A — in-browser only |
| SEO-01 | `buildProductJsonLd` emits correct schema shape + escapes `<` in stringified output | unit | `npx vitest run tests/seo.test.ts` | Wave 0 |
| SEO-01 | `/sitemap.xml`, `/robots.txt` return valid shapes with correct URLs | manual/in-browser (Prisma-importing special files, not easily mocked under Vitest) | curl `localhost:3002/sitemap.xml` and `/robots.txt` after `npm run dev` | N/A — in-browser only |
| PERF-01 | New Phase 10 components (ReviewForm, SizeGuideModal, ConsentBanner) have zero structural a11y violations | component (jest-axe) | `npx vitest run tests/a11y.test.tsx` | Wave 0 |
| PERF-01 | Lighthouse performance >=90 / accessibility 100 on home, `/shop`, PDP | manual (production build required, see Pitfall 6) | `npm run build && npm run start` then `npx lighthouse http://localhost:3002/<route> --only-categories=performance,accessibility --output=json --chrome-flags="--headless=new"` per route | N/A — manual, documented step, not part of `npm test` |
| ANLY-01 | `trackEvent()` no-ops when consent is absent/declined; calls `track()` only when accepted | unit (mock `@vercel/analytics`'s `track`) | `npx vitest run tests/analytics.test.ts` | Wave 0 |
| ANLY-01 | Call sites fire the right event name at the right moment (PDP mount, AddToCart click, checkout start, success page, search input) | component test (mock `trackEvent`, assert call args) or manual click-through | `npx vitest run tests/analytics.test.ts -t call-sites` (optional) or manual browser walkthrough | Optional |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/<new-file>.test.ts` (fast, targeted)
- **Per wave merge:** `npx vitest run` (full 56+ suite) and `npx tsc --noEmit`
- **Phase gate:** Full suite green + `npx tsc --noEmit` clean + the three manual in-browser checks (DB unique-constraint behavior, sitemap/robots shape, Lighthouse scores against a production build) all confirmed before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/reviews.test.ts` — covers TRST-01 pure logic (rating validation, eligibility matching, rating-merge defaults)
- [ ] `tests/size-guides.test.ts` — covers TRST-02 config lookup
- [ ] `tests/seo.test.ts` — covers SEO-01 JSON-LD builder
- [ ] `tests/analytics.test.ts` — covers ANLY-01 consent-gating logic
- [ ] `tests/a11y.test.tsx` — covers PERF-01 component-level a11y; requires `npm install -D jest-axe` first (not yet a devDependency)
- [ ] `lib/reviews.ts`, `lib/size-guides.ts`, `lib/analytics.ts`, `lib/seo.ts` — none exist yet, all new this phase

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Review submission re-checks `getServerSession` server-side inside the Server Action (never trusts client-asserted "eligible" state) — same idiom as `requireOwner()` |
| V3 Session Management | no (unchanged) | NextAuth session handling untouched this phase |
| V4 Access Control | yes | Review moderation (hide/delete) reuses `requireOwner()` verbatim; review submission gates on `hasPurchased()` server-side, re-validated on every submit, not cached client-side |
| V5 Input Validation | yes | Rating clamped to an explicit 1-5 allow-list (mirrors `isValidOrderStatus`/`buildOrderBy` allow-list idiom already in `lib/catalog.ts`/`lib/orders.ts`); title/body length-capped server-side before persisting; JSON-LD output escaped against script-breakout (Pattern 4) |
| V6 Cryptography | no | Not applicable — no new secrets/crypto introduced this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-forged "eligible reviewer" state (editing client JS/localStorage to bypass the eligibility check) | Tampering | Server Action re-runs `hasPurchased()` + session check as its first lines, exactly mirroring `requireOwner()`'s "first line of every admin action" discipline from Phase 9 |
| JSON-LD script-tag breakout via a maliciously crafted product description/name | Tampering / Injection | `<` escape on the stringified JSON-LD payload (Pattern 4), applied even though product content is owner-entered (defense in depth) |
| Review spam / rating manipulation via repeated resubmission | Tampering | DB-level `@@unique([productId, userId])` constraint makes more-than-one-review-per-user structurally impossible, not just app-logic-enforced |
| Analytics event payload leaking PII (e.g. customer email in a `purchase` event) | Information Disclosure | `trackEvent()` payloads should carry only non-PII fields (e.g. `productSlug`, `amount`, `itemCount`) — never `email`/`userId`/`name`; call-site review during implementation should confirm no PII crosses into `track()` arguments |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`) — `@vercel/analytics` 2.0.1, `@vercel/speed-insights` 2.0.0, `jest-axe` 10.0.0, `axe-core`, `vitest-axe`, `lighthouse` — versions/download counts/repo URLs confirmed live, 2026-07-24
- `gsd-tools query package-legitimacy check` — verdicts for all 6 packages above
- In-repo source: `prisma/schema.prisma`, `lib/catalog.ts`, `lib/products.ts`, `lib/orders.ts`, `lib/admin.ts`, `app/api/checkout/route.ts`, `vitest.config.ts`, `package.json`, `tests/*.test.ts` — read directly this session

### Secondary (MEDIUM confidence)
- [Functions: generateMetadata | Next.js](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — dynamic-route metadata API, verified current
- [Metadata Files: robots.txt | Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots) — `MetadataRoute.Robots`/`MetadataRoute.Sitemap` shapes
- [Guides: JSON-LD | Next.js](https://nextjs.org/docs/app/guides/json-ld) — official inline `<script>` + `<` escape pattern, code verbatim-matched
- [Using Web Analytics | Vercel](https://vercel.com/docs/analytics/using-web-analytics) and [Advanced Web Analytics Config | Vercel](https://vercel.com/docs/analytics/package) — confirmed no-op-in-development-by-design behavior
- WebSearch results confirming `jest-axe` + Vitest `expect.extend` compatibility pattern (multiple independent sources: alexop.dev, howtotestfrontend.com)

### Tertiary (LOW confidence)
- General WebSearch summaries on Lighthouse CI setup (blog posts, not official docs) — used only to confirm the pragmatic `npx lighthouse <url> --only-categories=...` invocation shape is standard practice, not for any load-bearing API detail

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — both core packages (`@vercel/analytics`, `@vercel/speed-insights`) verified live on the npm registry with legitimacy-gate OK verdicts, and their dev-mode-no-op behavior is documented in Vercel's own docs
- Architecture: HIGH — Review schema/query patterns directly extend already-proven, already-shipped Phase 8/9 precedents (`ProductSizeStock`, `groupBy`-style composition, Prisma-free/Prisma-importing module split)
- Pitfalls: HIGH — all six pitfalls are grounded in specifics of this exact codebase (slug-vs-id mismatch, `pending`-status orders, `force-dynamic`/`revalidatePath` conventions already in use)
- SEO/analytics API details: MEDIUM-HIGH — confirmed against current official Next.js/Vercel docs via WebSearch this session, not via a live Context7 lookup (no MCP docs tool was available in this session)
- Perf/a11y measurement workflow: MEDIUM — the `jest-axe` + manual `npx lighthouse` combination is a reasonable, Windows-compatible, non-hallucinated approach, but it is a recommendation synthesized from general best-practice sources rather than a single authoritative "this is the standard Next.js 14 perf-testing setup" doc

**Research date:** 2026-07-24
**Valid until:** 30 days (stable stack; Next.js 14 App Router APIs and Vercel Analytics package APIs are not fast-moving) — re-verify package versions if planning is delayed past 2026-08-24
