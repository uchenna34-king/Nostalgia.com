# Phase 8: Merchandising & Discovery - Context

**Gathered:** 2026-07-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the Nostalgia catalog **findable and browsable at scale**. This phase delivers
product search, filtering + sorting, curated collections, a persistent wishlist,
richer product-detail pages, and a data model + image handling that supports
**thousands of products with multiple images each** — without a later redesign.
Real product photography is supplied later by the owner; this phase builds the
structure and image handling, not the images.

Requirements in scope: DISC-01 (search), DISC-02 (filter), DISC-03 (sort),
DISC-04 (collections), WISH-01 (wishlist), PDP-01 (richer PDP), CATL-01 (scalable
catalog + image model).

**Not in this phase:** admin/CRUD for products or collections (Phase 9), reviews /
SEO / analytics (Phase 10), real payments / go-live (Phase 11).

</domain>

<decisions>
## Implementation Decisions

### Search & Filter UX (DISC-01, DISC-02, DISC-03)
- **D-01:** Search + filters are **server-side, driven by URL query params**
  (`?q=&category=&size=&price=&sort=&page=`). State lives in the URL so results are
  shareable and back-button friendly.
- **D-02:** Results update **live** as the user types (debounced ~300ms) and toggles
  filters — no explicit "Apply" button.
- **D-03:** Search matches across **name, description, and category**.
- **D-04:** Filters: **category, size, and price range**. Sort options: **price
  (low→high, high→low), newest, name**.
- **D-05:** Filters render as a panel on the `/shop` page (sidebar on desktop,
  collapsible on mobile); the existing category pills remain as a fast path.

### Catalog Scale & Image Model (CATL-01, PDP-01)
- **D-06:** **Normalize product images into a related `ProductImage` table**
  (many ordered images per product), migrating away from today's JSON `images`
  string on `Product`. This is the structure that scales to thousands of products
  with real photography later.
- **D-07:** `/shop` uses **server-side pagination** (numbered pages via `?page=`),
  not infinite scroll. Pick a sensible page size (e.g. 24).
- **D-08:** PDP shows a **multi-image gallery**: a large main image with selectable
  thumbnails, driven by the product's `ProductImage` set. Richer detail content
  (materials/care/fit copy) is included where data allows; exact fields at planner's
  discretion.
- **D-09:** Existing seed data + the 10 current products must be **migrated** into
  the new image model so nothing breaks. Placeholder SVGs stay until the owner
  supplies real photos.

### Collections (DISC-04)
- **D-10:** **Collections are a curated grouping separate from category.** A product
  can belong to a collection (e.g. "Autumn Archive", "Essentials") independent of its
  category (Outerwear/Knitwear/…). Model collections as their own entity with a
  product relationship.
- **D-11:** Seed a couple of starter collections now for display; **collection
  management (create/edit) is deferred to the Phase 9 admin.**
- **D-12:** Collections are browsable via their own route/pages that scale beyond a
  handful of items (reuse the paginated grid).

### Wishlist (WISH-01)
- **D-13:** Wishlist persists in **localStorage for everyone** — no login required —
  mirroring the existing cart pattern. Persists across sessions on the device.
- **D-14:** Wishlist is reachable from the nav (like the cart) and supports add/remove
  from product cards and PDPs; a wishlist page lists saved items.

### Claude's Discretion
- Exact debounce timing, page size, gallery interaction niceties (zoom/hover),
  filter panel styling, and the precise richer-PDP field set — planner/executor
  choose, consistent with the locked "nostalgic luxury streetwear" design system.
- Search implementation detail (Prisma `contains`/`LIKE` vs. an index) — researcher/
  planner choose an approach that works on SQLite now and won't block the Phase 11
  Postgres migration.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project decisions & scope
- `.planning/PROJECT.md` — locked aesthetic + tech stack, milestone framing
- `.planning/ROADMAP.md` §"Phase 8" — goal + success criteria for this phase
- `.planning/REQUIREMENTS.md` — DISC-01..04, WISH-01, PDP-01, CATL-01 acceptance text

### Existing implementation to extend
- `prisma/schema.prisma` — current `Product` model (images/sizes as JSON strings) → migrate to `ProductImage`
- `lib/products.ts` — `getProducts`/`getProductBySlug`/`getCategories`/`formatPrice` helpers to extend
- `app/shop/page.tsx` — current server-side category filter via `searchParams` (extend to full search/filter/sort/paginate)
- `app/product/[slug]/page.tsx` — current PDP + gallery (enrich to multi-image)
- `components/ProductCard.tsx` — reused across grids (add wishlist affordance)
- `context/CartContext.tsx` — the localStorage pattern to mirror for the wishlist
- `prisma/seed.ts` — seed data to migrate into the new image + collection models

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `context/CartContext.tsx`: localStorage + React context pattern — clone for `WishlistContext`.
- `components/ProductCard.tsx`: catalog grid card — extend with a wishlist toggle.
- `lib/products.ts`: query helpers — extend with search/filter/sort/paginate + collections.
- `app/shop/page.tsx`: already reads `searchParams` for category — the natural home for URL-driven filtering.

### Established Patterns
- Server Components fetch via `lib/products.ts`; interactivity is isolated in `"use client"` components (AddToCart, Cart). Search box, filter panel, wishlist toggle follow the same split.
- Prices are integer cents; `formatPrice` centralizes formatting.
- Images are currently `JSON.parse`d from a string column — this phase replaces that with a relation.

### Integration Points
- Prisma migration: `Product.images` (JSON) → `ProductImage` rows; add `Collection` + join.
- Nav gains a wishlist entry beside the cart.
- Providers wrapper adds `WishlistProvider` alongside `CartProvider`.

</code_context>

<specifics>
## Specific Ideas

- Collection naming in the brand voice, e.g. "Autumn Archive", "Essentials".
- Keep the existing category pills on `/shop` as a fast path alongside the new filter panel.
- Wishlist should feel like a sibling of the cart (nav placement, add/remove affordances).

</specifics>

<deferred>
## Deferred Ideas

- Collection **management UI** (create/edit/curate) — Phase 9 (Admin).
- Real product photography for thousands of SKUs — owner supplies later.
- Reviews/ratings, SEO metadata, analytics — Phase 10 (Trust & Polish).
- Infinite scroll as an alternative to pagination — possible future enhancement.
- Search relevance ranking / typo tolerance / full-text index — revisit at Phase 11 Postgres migration if needed.

None of these belong in Phase 8.

</deferred>

---

*Phase: 8-Merchandising & Discovery*
*Context gathered: 2026-07-14*
