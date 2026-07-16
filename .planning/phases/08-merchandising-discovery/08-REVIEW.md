---
phase: 08-merchandising-discovery
reviewed: 2026-07-16T00:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - app/api/checkout/route.ts
  - app/collections/[slug]/page.tsx
  - app/collections/page.tsx
  - app/product/[slug]/page.tsx
  - app/shop/page.tsx
  - app/wishlist/page.tsx
  - components/Gallery.tsx
  - components/Nav.tsx
  - components/ProductCard.tsx
  - components/ProductGrid.tsx
  - components/Providers.tsx
  - components/WishlistButton.tsx
  - components/shop/FilterPanel.tsx
  - components/shop/Pagination.tsx
  - components/shop/SearchBox.tsx
  - context/WishlistContext.tsx
  - lib/catalog.ts
  - lib/products.ts
  - lib/wishlist.ts
  - prisma/schema.prisma
  - prisma/seed.ts
  - tests/catalog.test.ts
  - tests/wishlist.test.ts
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-07-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Reviewed the merchandising/discovery catalog, collections, wishlist, and checkout code added in this phase. The pure query-builder helpers in `lib/catalog.ts` (`buildProductWhere`, `buildOrderBy`, `paginationMeta`) are well-designed — sort keys are allow-listed, size filtering is quote-guarded, and `parsePage`/`parsePriceRange` never throw on hostile input. However, `getCatalog` in `lib/products.ts` does not actually apply the clamped page/skip it computes, producing a page that reports itself as valid (via `totalPages`) while returning zero products. The checkout API route trusts client-supplied request-body shapes without runtime validation (crash-prone) and builds Stripe redirect URLs from an untrusted `Origin` header (open-redirect risk). Two client components (`FilterPanel`, `SearchBox`) use uncontrolled `defaultValue` inputs that silently desync from the URL when filters are cleared elsewhere. Test coverage is solid for the pure `lib/catalog.ts` and `lib/wishlist.ts` helpers, but there is no test exercising `getCatalog`'s actual DB-query behavior, which is exactly where the pagination bug lives.

## Critical Issues

### CR-01: `getCatalog` reports a valid page while returning zero products for it

**File:** `lib/products.ts:104-145` (root cause at lines 106, 122, 136-145)
**Issue:** `page = parsePage(params.page)` (line 106) is only clamped to `[1, MAX_PAGE]` (100000), not to the catalog's actual `totalPages`. `skip = (page - 1) * PAGE_SIZE` (line 122) is computed from this unclamped `page` and used directly in the `prisma.product.findMany` call. Separately, `paginationMeta(total, page, PAGE_SIZE)` (line 136) computes a *different*, correctly-clamped `page`/`totalPages` that is returned as metadata — but that clamped value is never fed back into the `skip` used for the row query.

Concretely: with 50 products (`PAGE_SIZE=24`, so `totalPages=3`) and a request for `?page=10`, `skip` becomes `216`, so `findMany` returns `[]`, while the returned `totalPages` is `3` and `Pagination.tsx` (which independently clamps `page` to `totalPages`) renders "page 3" as the active page. The user sees an empty product grid on a pagination control that claims page 3 is valid and has content. This is trivially reachable via a bookmarked/shared URL, a stale link after a search/filter shrinks the result set, or simply hand-editing `?page=`.
**Fix:**
```ts
// Run the count first (or in Promise.all as now), but recompute skip/take
// from the *clamped* page before running the row query — or clamp the
// query itself in a second step:
const [total, categories] = await Promise.all([
  prisma.product.count({ where }),
  getCategories(),
]);
const meta = paginationMeta(total, page, PAGE_SIZE);
const rows = await prisma.product.findMany({
  where,
  orderBy,
  include: { images: { orderBy: { position: "asc" } } },
  skip: meta.skip,
  take: meta.take,
});
```

## Critical Issues (continued)

### CR-02: Checkout API has no runtime validation of the request body — crashes or silently corrupts totals on malformed input

**File:** `app/api/checkout/route.ts:7-49`
**Issue:** `body` is only *type-asserted* as `{ items?: IncomingItem[] }` (line 15); nothing verifies at runtime that `items` is actually an array, or that each item's `qty`/`slug` has the expected type.
- If `body.items` is a truthy non-array value (e.g. an object), `incoming.map(...)` (lines 28, 35) throws a `TypeError`, producing an unhandled 500 instead of the intended `400 bad_request`.
- If `i.qty` is missing, `null`, or a non-numeric string, `Math.floor(i.qty)` (line 39) evaluates to `NaN`. `Math.max(1, Math.min(20, NaN))` is also `NaN`, so `qty: NaN` flows into `total = lineItems.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)` (line 55), producing `total: NaN`. In stub mode (no Stripe key, lines 64-77) this is written straight to `prisma.order.create({ data: { total, status: "paid", ... } })` — Prisma will reject a `NaN` for the `Int` column, again surfacing as an unhandled 500 rather than a clean validation error, and in the interim the order object is already conceptually "paid" with a bogus amount.
**Fix:** Validate the body with a schema (e.g. `zod`) before processing:
```ts
const ItemSchema = z.object({
  slug: z.string().min(1),
  size: z.string().min(1),
  qty: z.number().int().positive(),
});
const BodySchema = z.object({ items: z.array(ItemSchema).min(1) });
const parsed = BodySchema.safeParse(await req.json().catch(() => null));
if (!parsed.success) {
  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}
const incoming = parsed.data.items;
```

### CR-03: Stripe success/cancel URLs are built from an untrusted `Origin` request header

**File:** `app/api/checkout/route.ts:58-61, 101-102`
**Issue:**
```ts
const origin =
  req.headers.get("origin") ??
  process.env.NEXTAUTH_URL ??
  "http://localhost:3002";
...
success_url: `${origin}/order/success?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${origin}/cart`,
```
The `Origin` header is attacker-controllable on any direct request to this endpoint (curl, Postman, a non-browser client, or any request that isn't a browser-mediated same-origin fetch). Stripe does not validate `success_url`/`cancel_url` against your domain — any HTTPS URL is accepted. A forged `Origin` lets an attacker cause a legitimate, authenticated checkout session to redirect the paying user to an attacker-controlled domain after payment, which is a classic open-redirect/phishing primitive in a payment flow and also leaks `order.id`/`session_id` as query params to that domain.
**Fix:** Never derive redirect targets from client-controlled headers. Use a fixed, server-configured base URL:
```ts
const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3002";
```
If multiple trusted origins are legitimately needed (e.g. staging + prod), validate `req.headers.get("origin")` against an explicit allow-list before using it, rather than trusting it unconditionally.

## Warnings

### WR-01: `size` from the client is persisted and forwarded to Stripe without validation against the product's actual sizes

**File:** `app/api/checkout/route.ts:43, 98`
**Issue:** `size: i.size` is taken verbatim from the client and never checked against `p.sizes` (the product's real size list). It is stored as-is in `Order.items` (JSON) and interpolated directly into `product_data.name: `${i.name} — ${i.size}`` sent to Stripe (line 98). An attacker can submit an arbitrary/oversized string as `size` (not just a wrong-but-valid size), which pollutes order records and could exceed Stripe's field-length limits, causing the `stripe.checkout.sessions.create` call to fail for an otherwise-valid cart.
**Fix:** Validate `i.size` is a member of `p.sizes` before accepting the line item; drop/reject items with an invalid size the same way items with an unknown `slug` are already dropped.

### WR-02: `FilterPanel` price inputs are uncontrolled and don't reflect filter changes made elsewhere

**File:** `components/shop/FilterPanel.tsx:106-124` (interacts with `clearFilters`, lines 52-60)
**Issue:** The min/max price `<input>` elements use `defaultValue={minPriceRaw || ""}` / `defaultValue={maxPriceRaw || ""}` — an uncontrolled pattern that only sets the DOM value on initial mount. When `clearFilters()` (or a category/size button) triggers a `router.replace()` that removes `?price=` from the URL, `FilterPanel` re-renders with new `searchParams`, but React does not reapply `defaultValue` to an already-mounted input. The price fields keep showing whatever the user last typed even though the URL/query no longer has a price filter applied, so the visible filter state and the actual applied filter silently diverge.
**Fix:** Either make the inputs controlled (`value` + local `onChange` state synced from `searchParams`), or force remount on external changes with a `key` tied to the URL, e.g. `key={searchParams.get("price") ?? "none"}`.

### WR-03: `SearchBox` input does not clear when `FilterPanel`'s "Clear filters" removes `?q=`

**File:** `components/shop/SearchBox.tsx:29` (root cause shared with `components/shop/FilterPanel.tsx:52-60`)
**Issue:** Same uncontrolled-input root cause as WR-02: `defaultValue={searchParams.get("q") ?? ""}` is only applied on mount. `FilterPanel.clearFilters()` deletes `q` from the URL and results correctly reset, but `SearchBox` is a sibling component instance that never remounts, so its visible text keeps showing the previous search term even though the query param (and results) have been cleared — a confusing "phantom" search box.
**Fix:** Same as WR-02 — control the input or key it off `searchParams.get("q")` so it remounts (and resets its DOM value) when the query param changes externally.

### WR-04: `Gallery` has no fallback when a product has zero images

**File:** `components/Gallery.tsx:13, 19-23`
**Issue:** `const activeImage = images[selectedIndex] ?? images[0];` still evaluates to `undefined` if `images` is an empty array, and the `<img src={activeImage}>` is rendered unconditionally with no broken-image fallback or empty-state guard. Currently every seeded product has 2 images so this isn't hit in practice, but nothing in `ProductPage` or `Gallery` guards against a future zero-image product (e.g. once admin product management ships in Phase 9), where this would render a broken image with no user-facing indication.
**Fix:** Guard for the empty case, e.g. `if (images.length === 0) return <div className="aspect-[3/4] bg-cream-dark" />;` before rendering the gallery.

## Info

### IN-01: `parsePriceRange` doesn't guard against an inverted range (`min > max`)

**File:** `lib/catalog.ts:39-54`
**Issue:** A URL like `?price=20000-5000` parses successfully to `{ minPrice: 20000, maxPrice: 5000 }`, which `buildProductWhere` turns into `price >= 20000 AND price <= 5000` — an impossible range that silently yields zero results with no indication to the user that their input was contradictory. `FilterPanel`'s min/max inputs don't prevent entering an inverted range either.
**Fix:** Swap `min`/`max` when `min > max` in `parsePriceRange`, or validate/clamp in `FilterPanel` before writing the URL param.

### IN-02: `Order.userId` silently ends up `null` for authenticated checkouts when the session lacks `user.id`

**File:** `app/api/checkout/route.ts:56`
**Issue:** `const userId = (session.user as { id?: string }).id ?? null;` falls back to `null` via an unchecked type cast rather than asserting the shape. If the NextAuth session callback (not in this review's scope) doesn't always populate `user.id`, an authenticated, emailed order is written with `userId: null`, orphaning it from the `User` relation despite the endpoint requiring a signed-in session. This isn't confirmed as a live bug without seeing `lib/auth.ts`'s session callback, but the silent fallback masks the failure mode rather than surfacing it.
**Fix:** If `user.id` is expected to always be present for an authenticated session, assert it explicitly (and log/error if absent) rather than silently degrading to `null`.

---

_Reviewed: 2026-07-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
