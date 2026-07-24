---
phase: 10-trust-polish
type: plan-outline
created: 2026-07-24
granularity: standard
requirements: [TRST-01, TRST-02, TRST-03, SEO-01, PERF-01, ANLY-01]
plan_count: 12
---

# Phase 10 — Trust & Polish: Plan Outline

Chunked-mode outline only. Waves order the work so **Wave 0 test scaffolding +
`jest-axe` install land first**, then the **schema/migration and shared review query
lib land before any UI that consumes them**, features are built as vertical slices,
analytics wiring + SEO follow their foundations, and the **cross-cutting perf/a11y
verification runs last**. Executors run **sequentially on master** (worktrees disabled),
so waves express logical dependency ordering, not parallel isolation.

| Plan ID | Objective | Wave | Depends On | Requirements |
|---------|-----------|------|------------|--------------|
| 10-01 | **Wave 0 — test scaffolding & install.** `npm install -D jest-axe`; create the 5 Wave-0 test files as failing RED scaffolds that encode the pure-logic + a11y contracts: `tests/reviews.test.ts` (isValidRating, hasPurchased slug-match, getRatingSummaries zero-default), `tests/size-guides.test.ts`, `tests/seo.test.ts` (JSON-LD shape + `<`-escape), `tests/analytics.test.ts` (consent gating), `tests/a11y.test.tsx` (ReviewForm / SizeGuideModal / ConsentBanner via jest-axe). Targets the not-yet-existing `lib/reviews.ts`/`lib/size-guides.ts`/`lib/seo.ts`/`lib/analytics.ts`. | 0 | — | TRST-01, TRST-02, SEO-01, ANLY-01, PERF-01 |
| 10-02 | **Review schema + migration + seed (D-01, D-03).** Add relational `Review` model to `prisma/schema.prisma` (`productId`, `userId`, `rating`, `title`, `body`, `createdAt`, `updatedAt`; `@@unique([productId, userId])`, `@@index` on each FK; `onDelete: Cascade`), mirroring the Phase 9 `ProductSizeStock` precedent; add `reviews Review[]` back-relations to `Product` + `User`. **Run explicit `npx prisma migrate dev --name add-reviews`** (schema-push NOT auto-injected) and update the seed to insert a few sample verified-purchase reviews. | 1 | — | TRST-01 |
| 10-03 | **Shared review query layer (D-01, D-04).** Create `lib/reviews.ts` (Prisma-importing): `hasPurchased(userId, slug)` via in-app scan of the user's own `paid`/`fulfilled` orders reusing `parseOrderItems` (no raw JSON SQL), bounded `getRatingSummaries(ids[])` / `getRatingSummary(id)` via `groupBy`/`aggregate` (never N+1, never `include:{reviews}`), review `upsert`/list, plus pure `isValidRating` allow-list. Merge `rating {avg,count}` into `lib/products.ts` read path defaulting missing ids to `{avg:0,count:0}` — **leaving Phase 8 `buildProductWhere`/stock-aware `where` untouched.** Turns `tests/reviews.test.ts` green. | 2 | 10-01, 10-02 | TRST-01 |
| 10-04 | **Reviews read UI (D-04, UI-SPEC §1–2).** Shared `RatingStars` glyph (single 24×24 SVG at 16/20/28px, a11y numeric pairing per WCAG 1.4.1); PDP aggregate summary row + anchored `ReviewList` (first 5 + "Load more", verified-purchase tag) + zero-reviews empty state; compact star row on `ProductCard.tsx` (omit when zero). Consumes the 10-03 rating merge; adds `revalidatePath` awareness for `/shop`. | 3 | 10-03 | TRST-01 |
| 10-05 | **Reviews write (D-01, D-02, D-03, UI-SPEC §1).** `ReviewForm` client island (radiogroup star input, title required / body optional, all UI-SPEC states: signed-out, no-purchase, already-reviewed, submitting, success `aria-live`, error `role=alert`) + `submitReview` **Server Action that re-checks session + `hasPurchased` server-side (never trust client)** and `upsert`s one-review-per-user, then `revalidatePath` on PDP + `/shop` + collections. Turns `tests/a11y.test.tsx -t ReviewForm` green. | 3 | 10-03, 10-04 | TRST-01 |
| 10-06 | **Admin review moderation (D-02).** `app/admin/reviews/` list + `hideReview`/`deleteReview` server actions gated by the existing Phase 9 `requireOwner()` (reused verbatim); destructive-confirm copy per UI-SPEC. Owner-only surface, no customer report/flag flow this phase. | 3 | 10-03 | TRST-01 |
| 10-07 | **Size guides (D-05, D-06, D-07, UI-SPEC §3).** Prisma-free `lib/size-guides.ts` static per-category config (Outerwear/Knitwear/Tees/Accessories, placeholder measurements) + `getSizeGuide(category)`; `SizeGuideModal` client island honoring the full dialog a11y contract (role=dialog/aria-modal, focus trap, Escape, scroll-lock, focus restoration, reduced-motion) + semantic `<table>`; "Size guide" trigger in `AddToCart.tsx`. Turns `tests/size-guides.test.ts` + `tests/a11y.test.tsx -t SizeGuideModal` green. | 4 | 10-01 | TRST-02 |
| 10-08 | **Shipping & returns (D-11, D-12, D-13, UI-SPEC §5).** Separate static `app/shipping/page.tsx` + `app/returns/page.tsx` (each with its own `metadata` export + Claude-drafted on-brand placeholder copy); wire real `<Link>`s from `Footer.tsx` ("The House" column) and convert the existing PDP shipping/returns bullet copy into links. Not added to checkout. | 4 | — | TRST-03 |
| 10-09 | **Analytics foundation + consent gate (D-08, D-10, UI-SPEC §4).** Install `@vercel/analytics` + `@vercel/speed-insights` (no-op in dev by design); Prisma-free `lib/analytics.ts` (`trackEvent()` gated by localStorage consent, swallow errors); `ConsentBanner` client island (`z-40` fixed, non-CLS, not a focus trap, reduced-motion); `Providers.tsx` `AnalyticsGate` mounting `<Analytics/>`/`<SpeedInsights/>` only post-accept. Turns `tests/analytics.test.ts` + `tests/a11y.test.tsx -t ConsentBanner` green. | 4 | 10-01 | ANLY-01 |
| 10-10 | **Analytics call sites (D-09).** Wire the five funnel events through `trackEvent()` at their natural sites: `view_product` (PDP), `add_to_cart` (`AddToCart`), `begin_checkout` (checkout start), `purchase` (success page), `search` (shop search input). Payloads carry only non-PII fields (slug/amount/itemCount — never email/userId). | 5 | 10-09 | ANLY-01 |
| 10-11 | **SEO (D-04, D-14, SEO-01).** Prisma-free `lib/seo.ts` `buildProductJsonLd` (schema.org Product/Offer, `aggregateRating` only when reviews exist, `<`-escape); inline JSON-LD `<script>` + `generateMetadata` (+OG/Twitter) on PDP and dynamic shop/collection routes; static `metadata` on policy/content pages; `app/sitemap.ts` + `app/robots.ts`. Reuses the 10-03 rating source so JSON-LD and the on-page summary never disagree. Turns `tests/seo.test.ts` green. | 5 | 10-01, 10-03 | SEO-01 |
| 10-12 | **Performance & accessibility verification (D-15, PERF-01).** `next/image` migration + semantic landmarks/focus-states/alt/contrast/reduced-motion remediation on home, `/shop`, PDP; full `tests/a11y.test.tsx` suite green (fix any violations). **`checkpoint:human-verify` before any `lighthouse` use** (package flagged SUS on recency), then manual per-route `npx lighthouse` against a **production build** (`npm run build && npm run start`) targeting perf ≥90 / a11y 100; document scores. Final cross-cutting pass. | 6 | all (final pass) | PERF-01 |

## Requirement Coverage Check

| Requirement | Covered by plans |
|-------------|------------------|
| TRST-01 (reviews/ratings) | 10-01, 10-02, 10-03, 10-04, 10-05, 10-06 |
| TRST-02 (size guides) | 10-01, 10-07 |
| TRST-03 (shipping/returns) | 10-08 |
| SEO-01 (metadata/sitemap/JSON-LD) | 10-01, 10-11 |
| PERF-01 (perf + a11y) | 10-01, 10-12 |
| ANLY-01 (analytics + consent) | 10-01, 10-09, 10-10 |

All six phase requirement IDs are covered. No deferred idea (stock auto-decrement,
review media, report/flag, admin-editable content, GA4, Phase 11 go-live items) is planned.

## Wave Ordering Rationale

- **Wave 0 (10-01)** — `jest-axe` install + 5 RED test scaffolds land first (VALIDATION.md Wave 0 gaps).
- **Wave 1 (10-02)** — `Review` schema + **explicit `prisma migrate dev`** + seed; nothing may read reviews before this.
- **Wave 2 (10-03)** — shared `lib/reviews.ts` query/aggregation layer + `products.ts` rating merge; the single source both UI and SEO consume.
- **Wave 3 (10-04–10-06)** — reviews UI verticals (read, write, admin moderation) on top of the shared lib.
- **Wave 4 (10-07–10-09)** — independent trust surfaces (size guide, policy pages) + analytics foundation, each depending only on Wave 0 scaffolds + existing components.
- **Wave 5 (10-10–10-11)** — analytics event wiring (after its foundation) + SEO (after ratings exist).
- **Wave 6 (10-12)** — cross-cutting perf/a11y verification runs last, auditing everything shipped above; includes the `lighthouse` SUS-package human checkpoint.
