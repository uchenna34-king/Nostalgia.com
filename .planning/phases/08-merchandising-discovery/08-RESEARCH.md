# Phase 8: Merchandising & Discovery - Research

**Researched:** 2026-07-14
**Domain:** Prisma/SQLite data modeling + Next.js 14 App Router URL-driven search/filter/sort/pagination + client-side wishlist
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Search & Filter UX (DISC-01, DISC-02, DISC-03)**
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

**Catalog Scale & Image Model (CATL-01, PDP-01)**
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

**Collections (DISC-04)**
- **D-10:** **Collections are a curated grouping separate from category.** A product
  can belong to a collection (e.g. "Autumn Archive", "Essentials") independent of its
  category (Outerwear/Knitwear/…). Model collections as their own entity with a
  product relationship.
- **D-11:** Seed a couple of starter collections now for display; **collection
  management (create/edit) is deferred to the Phase 9 admin.**
- **D-12:** Collections are browsable via their own route/pages that scale beyond a
  handful of items (reuse the paginated grid).

**Wishlist (WISH-01)**
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

### Deferred Ideas (OUT OF SCOPE)
- Collection **management UI** (create/edit/curate) — Phase 9 (Admin).
- Real product photography for thousands of SKUs — owner supplies later.
- Reviews/ratings, SEO metadata, analytics — Phase 10 (Trust & Polish).
- Infinite scroll as an alternative to pagination — possible future enhancement.
- Search relevance ranking / typo tolerance / full-text index — revisit at Phase 11 Postgres migration if needed.

None of these belong in Phase 8.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|---------------------|
| DISC-01 | Customer can search products by keyword (name, description, category) and see relevant matches | Pattern 2 (combined `where` clause), Pitfall 2 (SQLite case-sensitivity), Pattern 1 (URL-driven `SearchBox`) |
| DISC-02 | Customer can filter the catalog by category, size, and price range | Pattern 2 (`where` combining category/size/price), Pitfall 3 (SQLite JSON-string `sizes` filtering) |
| DISC-03 | Customer can sort the catalog (price, newest, name) | Pattern 2 (`orderBy` mapping for the four sort options) |
| DISC-04 | Customer can browse curated collections/categories that scale beyond a handful of items | Pattern 3 (`Collection` implicit many-to-many model), Architectural Responsibility Map (`/collections/[slug]` reuses the paginated grid) |
| WISH-01 | Customer can add and remove products to a wishlist that persists across sessions | Pattern 4 (`WishlistContext` mirroring `CartContext`), Open Question 1 (data-fetch wiring) |
| PDP-01 | Product detail pages show richer content (multi-image gallery + details) driven by per-product image sets | Pattern 3 (`ProductImage` ordering), Recommended Project Structure (`Gallery.tsx`), Open Question 2 (richer-field set) |
| CATL-01 | Catalog data model + image handling support thousands of products, each with multiple images, without redesign | Pattern 3 (schema + indexes), Don't Hand-Roll (push filter/sort/pagination into SQL, never fetch-all-then-filter), Runtime State Inventory (migration path for existing seed data) |
</phase_requirements>

## Summary

Phase 8 is a data-model change (JSON columns → relations) plus a query/UI change (category-only
filter → full search/filter/sort/pagination) layered onto an already-working Next.js 14 App
Router + Prisma/SQLite storefront. Nothing here requires new infrastructure or a framework
upgrade — the locked stack (Next.js 14.2.35, Prisma 5.22.0, React 18, no external state library)
is sufficient. The two areas that need care are (1) SQLite's real limitations around
case-insensitive text search and JSON-array filtering, which must be worked around without
baking SQLite-only tricks into query code that has to also run on Postgres after the Phase 11
migration, and (2) correctly splitting the URL-driven search/filter UI between a Server
Component (data fetching, initial render) and small Client Components (`useSearchParams` /
`useRouter` / `usePathname`), which Next.js requires to be wrapped in `<Suspense>`.

A second, easily-missed finding: because the current "catalog" is 100% seed data (`prisma/seed.ts`
deletes and recreates every product on every run, and there is no `prisma/migrations/` directory
yet — the project has only ever used `prisma db push`), the "migrate existing seed data into the
new image model" requirement (D-09) does **not** need a JSON-parsing backfill script. It is
satisfied by changing the schema, pushing it, updating `seed.ts` to write `ProductImage` rows and
`Collection` links directly, and re-running `npm run seed`. A backfill script is the right pattern
for real production data (documented below for completeness and for Phase 9/11 awareness) but
would be over-engineering for this phase's actual data.

**Primary recommendation:** Extend the existing Prisma schema with `ProductImage` (ordered,
`productId` FK) and `Collection` (implicit many-to-many to `Product`) models, add indexes for
`category`/`price`/`createdAt`, keep `sizes` as the existing JSON-string column (not in scope to
normalize), rewrite `lib/products.ts` around a single `getProducts({ q, category, size,
minPrice, maxPrice, sort, page })` function built with Prisma `where`/`orderBy`/`skip`/`take` +
a matching `count`, drive `/shop` from `searchParams` on the Server Component with small
`"use client"` islands (`SearchBox`, `FilterPanel`, `Pagination`) each wrapped in `<Suspense>`,
add a `WishlistContext` that is a structural clone of `CartContext`, and add `Collection`
detail routes that reuse the same paginated grid as `/shop`.

## Architectural Responsibility Map

This app is a Next.js App Router monolith with no separate API tier: Server Components call
`lib/products.ts` directly, which calls Prisma directly. "Frontend Server (SSR)" and "API/Backend"
are therefore the same tier in this codebase.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Search input, debounce, live URL updates | Browser / Client | Frontend Server (SSR) | `"use client"` component owns keystroke state + debounced `router.replace`; the Server Component reads the resulting `searchParams` for the actual fetch |
| Filter panel (category/size/price) + sort control | Browser / Client | Frontend Server (SSR) | Same URL-driven pattern as search |
| Search/filter/sort/pagination query execution | Frontend Server (SSR) | Database / Storage | `lib/products.ts` builds the Prisma `where`/`orderBy`/`skip`/`take`; Prisma/SQLite executes it |
| Pagination controls (page links, total pages) | Browser / Client | Frontend Server (SSR) | Links are rendered client-side from `searchParams` + a server-computed `count`; no separate "next page" fetch endpoint needed (full navigation via `<Link>`/`router.replace`) |
| Collections browsing (`/collections/[slug]`) | Frontend Server (SSR) | Database / Storage | Same grid + pagination path as `/shop`, filtered by collection instead of category |
| Wishlist add/remove/list | Browser / Client | — | `localStorage` only, per D-13 — no server or DB involvement by design |
| PDP multi-image gallery (main image + thumbnails) | Browser / Client | Frontend Server (SSR) | Selected-image state is client-only; the ordered `ProductImage[]` is fetched server-side and passed down as props |
| Catalog data model (`Product`, `ProductImage`, `Collection`) + image storage | Database / Storage | Frontend Server (SSR) | Schema/indexes live in Prisma; images are static file paths under `public/products/`, not blobs in the DB |

**Why this matters for planning:** Do not create an internal `/api/search` route for this phase —
the Server Component + `searchParams` pattern is the standard Next.js App Router approach and
avoids a redundant client-fetch layer. An API route would only be justified by a future
client-only consumer (there isn't one here).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` / `prisma` | 5.22.0 (already installed — locked stack) | ORM + migrations | Already the project's data layer; adding models is additive, no reason to change ORM |
| `next` | 14.2.35 (already installed — locked stack) | App Router, Server/Client Components, routing | Locked stack per PROJECT.md; `useSearchParams`/`usePathname`/`useRouter` from `next/navigation` are the framework's own URL-state primitives |
| `react` | 18.3.1 (already installed) | UI | Locked stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `use-debounce` | `^10.1.1` `[VERIFIED: npm registry]` | `useDebouncedCallback` for the ~300ms debounced search input | This is the exact pattern Next.js's own official "Adding Search and Pagination" tutorial uses `[CITED: nextjs.org/learn/dashboard-app/adding-search-and-pagination]` — small (zero deps), 8 years old, ~6.4M weekly downloads, no postinstall script |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `use-debounce` | Hand-rolled `useRef`/`setTimeout` debounce hook | Zero extra dependency, but reinvents a ~15-line solved problem; `use-debounce` is trivial, well-tested, and matches the pattern Next.js documents — prefer the library |
| Implicit Prisma many-to-many for `Collection` ↔ `Product` | Explicit join model (`CollectionProduct`) | Explicit join is only needed if the join itself needs extra fields (e.g. curation order within a collection); not required by D-10/D-11/D-12 — use implicit m-n |
| Server Component `searchParams` + Prisma | A dedicated `/api/products` route consumed by `fetch` from the client | Adds a network hop and duplicate serialization for no benefit in a monolith with no other API consumer; not justified here |
| Hand-rolled PDP gallery (`useState` + thumbnail buttons) | `react-image-gallery` or similar carousel library | The locked design system is bespoke (film-grain, custom typography); a generic carousel library fights the aesthetic and adds swipe/lightbox features this phase doesn't need. Hand-roll it (see Architecture Patterns below) |

**Installation:**
```bash
npm install use-debounce
```

**Version verification:** `npm view use-debounce version` → `10.1.1`, published 2026-03-29,
package first published 2018-11-09 `[VERIFIED: npm registry]`. `npm view next version` /
`npm view prisma version` return newer majors (16.x / 7.x) than what's installed — **do not
upgrade**; Next.js 14.2.35 and Prisma 5.22.0 are the locked, already-installed, already-verified
versions (`npx next --version` confirms 14.2.35 is what actually runs). Upgrading is out of scope
for this phase.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|--------------|---------|-------------|
| `use-debounce` | npm | ~8 yrs (first published 2018-11-09) | ~6.47M/week | github.com/xnimorz/use-debounce | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

No other new external packages are required for this phase — search/filter/sort/pagination is
built on the already-installed Prisma client, and the gallery/wishlist are hand-rolled React
patterns matching the existing `CartContext`/`ProductCard` code.

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├─ ProductCard "wishlist" toggle ──────► WishlistContext (localStorage, client-only)
  │                                             ▲
  │                                             │ mirrors
  │                                        CartContext (localStorage, client-only)
  │
  ├─ SearchBox (client, useDebouncedCallback)
  │       │  router.replace(pathname + ?q=...&page=1)
  │       ▼
  ├─ FilterPanel (client: category/size/price + sort)
  │       │  router.replace(pathname + ?category=&size=&price=&sort=)
  │       ▼
  └─ Pagination (client: reads/writes ?page=)
          │
          ▼
   URL (?q=&category=&size=&price=&sort=&page=)  ◄── shareable, back-button friendly (D-01)
          │
          ▼
  /shop  Server Component  ──── reads searchParams ───► lib/products.ts: getProducts({...})
          │                                                     │
          │                                          builds Prisma where/orderBy/skip/take
          │                                                     ▼
          │                                          Prisma Client ──► SQLite (dev.db)
          │                                                     │
          │                                          Product ⋈ ProductImage (ordered)
          │                                                     │
          ◄──────────── rows + total count ────────────────────┘
          │
          ▼
   ProductGrid (server-rendered) + Pagination controls (total pages from count)

/product/[slug] Server Component ── getProductBySlug (includes ProductImage[] ordered)
          │
          ▼
   Gallery (client component: selectedIndex state, main image + thumbnails)

/collections/[slug] Server Component ── same getProducts() path, filtered by collection ──►
   reuses ProductGrid + Pagination
```

### Recommended Project Structure
```
prisma/
├── schema.prisma          # + ProductImage, Collection models, indexes
└── seed.ts                # writes ProductImage rows + Collection links (not JSON images)

lib/
└── products.ts             # getProducts({q,category,size,minPrice,maxPrice,sort,page}),
                             # getProductBySlug, getCollections, getCollectionBySlug,
                             # getCategories, PAGE_SIZE const, formatPrice

app/
├── shop/
│   └── page.tsx             # Server Component: reads searchParams, calls getProducts()
├── collections/
│   └── [slug]/page.tsx      # Server Component: same grid, filtered by collection
├── product/[slug]/page.tsx  # Server Component: passes ProductImage[] to Gallery
└── wishlist/
    └── page.tsx             # Client (or server shell + client list): reads WishlistContext

components/
├── shop/
│   ├── SearchBox.tsx         # "use client" — useDebouncedCallback + router.replace, in <Suspense>
│   ├── FilterPanel.tsx       # "use client" — category/size/price + sort, in <Suspense>
│   └── Pagination.tsx        # "use client" — page links from count, in <Suspense>
├── Gallery.tsx                # "use client" — main image + thumbnails
├── WishlistButton.tsx         # "use client" — heart/save toggle, used in ProductCard + PDP
└── ProductCard.tsx            # extended with WishlistButton

context/
├── CartContext.tsx            # existing, unchanged
└── WishlistContext.tsx        # new — structural clone of CartContext
```

### Pattern 1: Server Component reads `searchParams`, Client islands write them
**What:** The page itself (`app/shop/page.tsx`) stays an `async` Server Component that receives
`searchParams` as a prop and does the Prisma fetch. Only the small interactive pieces
(`SearchBox`, `FilterPanel`, `Pagination`) are `"use client"` and call `useSearchParams` /
`useRouter` / `usePathname` from `next/navigation`.
**When to use:** Any URL-driven filter/search/pagination UI in the App Router.
**Example (search box):**
```tsx
// Source: pattern from Next.js official "Adding Search and Pagination" tutorial
// https://nextjs.org/learn/dashboard-app/adding-search-and-pagination [CITED]
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export default function SearchBox({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const pathname = usePathname();

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1"); // reset to page 1 on every new search/filter
    if (term) params.set("q", term);
    else params.delete("q");
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <input
      placeholder={placeholder}
      defaultValue={searchParams.get("q")?.toString()}
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
}
```
```tsx
// app/shop/page.tsx — Server Component
export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: {
    q?: string; category?: string; size?: string;
    price?: string; sort?: string; page?: string;
  };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { products, total, categories } = await getProducts({
    q: searchParams.q,
    category: searchParams.category,
    size: searchParams.size,
    price: searchParams.price,
    sort: searchParams.sort,
    page,
  });
  // render grid + <Suspense><Pagination totalPages={Math.ceil(total / PAGE_SIZE)} /></Suspense>
}
```
**Any component using `useSearchParams` must be wrapped in `<Suspense>`** (see Pitfall 1).

### Pattern 2: Combined search + filter `where` clause in Prisma
**What:** One `where` object combining OR (search across 3 fields) with AND (category/size/price),
plus a matching `count` for pagination totals.
**Example:**
```ts
// Source: pattern from Prisma filtering/sorting + pagination docs [CITED: prisma.io/docs/orm/prisma-client/queries]
import type { Prisma } from "@prisma/client";

const where: Prisma.ProductWhereInput = {
  AND: [
    q
      ? {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { category: { contains: q } },
          ],
        }
      : {},
    category && category !== "All" ? { category } : {},
    size ? { sizes: { contains: `"${size}"` } } : {}, // sizes is still a JSON string column — see Pitfall 3
    minPrice != null ? { price: { gte: minPrice } } : {},
    maxPrice != null ? { price: { lte: maxPrice } } : {},
  ],
};

const orderBy: Prisma.ProductOrderByWithRelationInput =
  sort === "price-asc" ? { price: "asc" } :
  sort === "price-desc" ? { price: "desc" } :
  sort === "name" ? { name: "asc" } :
  { createdAt: "desc" }; // "newest" + default

const [rows, total] = await Promise.all([
  prisma.product.findMany({
    where, orderBy,
    include: { images: { orderBy: { position: "asc" } } },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  }),
  prisma.product.count({ where }),
]);
```

### Pattern 3: Ordered one-to-many `ProductImage`, implicit many-to-many `Collection`
**What:** `ProductImage` has a `productId` FK + `position Int` for ordering (Prisma has no
native ordered-list column type — ordering is always `orderBy` at query time). `Collection` uses
Prisma's implicit many-to-many (no join model needed) since a product may reasonably belong to
more than one curated collection.
**Example:**
```prisma
// Source: pattern from Prisma relations docs [CITED: prisma.io/docs/orm/prisma-schema/data-model/relations]
model Product {
  id          String          @id @default(cuid())
  slug        String          @unique
  name        String
  price       Int
  category    String
  description String
  sizes       String          // unchanged JSON-encoded string[] — not in scope this phase
  featured    Boolean         @default(false)
  createdAt   DateTime        @default(now())
  images      ProductImage[]
  collections Collection[]

  @@index([category])
  @@index([price])
  @@index([createdAt])
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  url       String
  position  Int     @default(0)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}

model Collection {
  id          String    @id @default(cuid())
  slug        String    @unique
  name        String
  description String?
  products    Product[]
}
```

### Pattern 4: Client-only wishlist context (mirrors `CartContext`)
**What:** Same `createContext` + `localStorage` hydration pattern as `context/CartContext.tsx`,
keyed by product `slug` (a `Set<string>` or `string[]` of slugs is sufficient — no size/qty
needed for a wishlist).
**Example:**
```tsx
// Adapted from context/CartContext.tsx (existing project pattern)
"use client";
const STORAGE_KEY = "nostalgia-wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSlugs(JSON.parse(raw) as string[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  }, [slugs, hydrated]);

  const toggle = (slug: string) =>
    setSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  const isWishlisted = (slug: string) => slugs.includes(slug);

  // ...value + provider, same shape as CartContext
}
```
Add `WishlistProvider` inside `components/Providers.tsx` alongside `CartProvider`, and a
"Wishlist" link in `components/Nav.tsx` beside "Cart" (same `count` badge pattern using
`slugs.length`). Since the wishlist stores only slugs, the wishlist **page** re-fetches full
product data server-side (`getProductsBySlugs(slugs)`) — the client passes the slug list up via
a small client wrapper that calls a server action or a client component that already has the
slugs from context and requests `/api`-free product data via a Server Component that reads slugs
from... in practice, simplest: make `/wishlist` a Client Component page that reads
`WishlistContext` and fetches product details through a tiny server action or an existing
`getProductBySlug` call issued from a client-side `useEffect` via a Route Handler, **or** — more
in keeping with the existing all-Server-Component-data-fetching pattern — expose a `POST
/api/products/by-slugs` route (still no client state duplication, all products stay per-slug DB
reads). Planner's discretion on this specific wiring; either approach is a few lines given
`getProductBySlug` already exists.

### Anti-Patterns to Avoid
- **Fetching `useSearchParams` without `<Suspense>`:** breaks the production build (see Pitfall 1).
- **Filtering `sizes` with `mode: "insensitive"` or Prisma's typed JSON `array_contains`:** neither
  works on SQLite for this column (see Pitfalls 2–3) — use plain `contains` string matching.
- **Writing a JSON-parsing backfill script for the 10 seed products:** unnecessary — `seed.ts`
  already fully truncates and recreates the catalog; just update the seed data shape (see
  Runtime State Inventory).
- **A dedicated `/api/search` fetch endpoint:** redundant in this Server-Component-first app; use
  `searchParams` directly (see Architectural Responsibility Map note).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Debounced search input | A custom `setTimeout`/`clearTimeout` hook from scratch | `use-debounce`'s `useDebouncedCallback` | Trivial to get subtly wrong (stale closures, missing cleanup on unmount); the library is 8 years old, tiny, and is what Next.js's own tutorial uses |
| Total-count pagination math | Ad-hoc "fetch one extra row to detect next page" tricks | `prisma.product.count({ where })` run with the same `where` as the `findMany` | Prisma's `count` is a real `SELECT COUNT(*)`; it's cheap and exact — no reason to approximate |
| Case-insensitive text matching on SQLite | A JS-side `.toLowerCase().includes()` filter applied *after* fetching all rows | Prisma `contains` (case-sensitive on SQLite, acceptable per this phase's decisions) or a `COLLATE NOCASE` migration if truly needed | Filtering in JS after fetching defeats `skip`/`take` pagination and `count` — it would require loading the entire table into memory, which breaks the "thousands of products" scale requirement (CATL-01) |

**Key insight:** The catalog-scale requirement (CATL-01) is at risk from any pattern that fetches
all rows and filters/sorts/paginates in JavaScript. Every filter, sort, and page-size decision
must be pushed into the Prisma `where`/`orderBy`/`skip`/`take` so it stays a single indexed SQL
query regardless of catalog size.

## Runtime State Inventory

This phase changes the `Product` schema (removes the `images` JSON column, adds `ProductImage`
and `Collection`) and is a data-migration-shaped phase, so this inventory is included.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `prisma/dev.db` (SQLite, dev-only) currently holds 10 products with `images` as a JSON-encoded `string[]` and `sizes` as a JSON-encoded `string[]`. There is **no `prisma/migrations/` directory** — the project has only ever used `prisma db push`, never `prisma migrate dev`. | Code edit, not a data-preserving migration: since `prisma/seed.ts` unconditionally `deleteMany()`s and recreates every `Product` on each run, the correct action is (1) update `schema.prisma`, (2) `prisma db push` (will prompt/require `--accept-data-loss` since the `images` column is dropped — expected and fine, it's dev seed data), (3) update `seed.ts` to create `ProductImage` rows + `Collection` links instead of a JSON `images` array, (4) `npm run seed`. **A JSON-parsing backfill script is not needed for this phase's actual data** (see Pattern discussion above) — document the expand/contract backfill pattern in code comments only if the planner wants defensive documentation for future real-data migrations (Phase 9+). |
| Live service config | None — this app has no external services (no n8n, no CMS, no third-party dashboards) that reference product image paths or category names. | None. |
| OS-registered state | None — no scheduled tasks, pm2 processes, or OS-level registrations reference the `images` column or category/collection strings. | None. |
| Secrets/env vars | None — `DATABASE_URL` in `.env` is unaffected by this schema change (same SQLite file path). | None. |
| Build artifacts | Prisma Client types (`node_modules/@prisma/client` generated types) are stale after any `schema.prisma` change until `prisma generate` (or `postinstall`) reruns. `next build`'s type-checking will fail against old generated types if this step is skipped. | Run `npx prisma generate` (or reinstall) immediately after each schema edit, before running `tsc`/`next build`. |

**Nothing found in "Live service config" and "OS-registered state" categories** — verified by
inspecting the repo for external service integrations (none beyond Stripe/NextAuth/Google, none
of which reference product data) and confirming this is a local dev-only Next.js app with no
process manager or task scheduler config in the repo.

## Common Pitfalls

### Pitfall 1: `useSearchParams` without `<Suspense>` breaks the production build
**What goes wrong:** Any `"use client"` component that calls `useSearchParams()` from
`next/navigation` opts its segment into client-side rendering; without a `<Suspense>` boundary
around it, `next build` fails with "Missing Suspense boundary with useSearchParams"
`[CITED: nextjs.org/docs/messages/missing-suspense-with-csr-bailout]`.
**Why it happens:** `useSearchParams` needs the actual request URL, which isn't known at
static-render time — Next.js requires an explicit opt-in boundary so the rest of the page can
still be statically optimized.
**How to avoid:** Wrap `SearchBox`, `FilterPanel`, and `Pagination` each in their own
`<Suspense fallback={...}>` in `app/shop/page.tsx` (or one shared boundary around all three);
the Server Component's own `searchParams` prop read does **not** need `Suspense` — only the
client-side hook usage does.
**Warning signs:** Works fine in `next dev` but fails only during `next build`/`next start` —
always run a production build before considering this phase done, `npm run dev` alone will not
catch this.

### Pitfall 2: `mode: "insensitive"` does not work on SQLite
**What goes wrong:** Adding `mode: "insensitive"` to a `contains` filter (the natural first
instinct for case-insensitive search) either throws a Prisma validation error or is silently
ignored on the `sqlite` provider — it is only implemented for PostgreSQL and MongoDB
`[CITED: prisma.io/docs/orm/prisma-client/queries/case-sensitivity]`.
**Why it happens:** SQLite's default text collation is `BINARY` (case-sensitive); Prisma's
`mode` option maps to database-specific collation features that SQLite's driver doesn't expose
the same way.
**How to avoid:** For this phase, accept default case-sensitive `contains` matching (this is
within the locked decision's discretion: "Search implementation detail ... researcher/planner
choose an approach that works on SQLite now and won't block the Phase 11 Postgres migration").
If case-insensitivity is required now, the only SQLite-side fix is `COLLATE NOCASE` added via a
hand-edited migration SQL file (ASCII-only) — but this is a SQLite-specific shim that does **not**
translate to Postgres (which would instead use `mode: "insensitive"` or `citext`), so if used it
must be isolated behind a comment flagging it as SQLite-only and revisited in Phase 11. Simplest
path: ship case-sensitive search now, note it as a known limitation, and switch to
`mode: "insensitive"` for free once Postgres lands in Phase 11 (query code doesn't need to change
structurally, just add the `mode` field guarded by provider).
**Warning signs:** A user searches "Wool" and gets no results for a product named "wool
overcoat" (or vice versa) — test search with mixed-case input during verification.

### Pitfall 3: Prisma's typed JSON filtering (`array_contains`) does not work on SQLite either
**What goes wrong:** `sizes` remains a plain `String` column storing JSON (`'["S","M","L"]'`), not
Prisma's native `Json` type, and even if it were the native `Json` type, SQLite has no JSON
filter support in Prisma at all (`Json` filtering with `array_contains`/`path` is PostgreSQL/MySQL
only) `[CITED: prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields]`.
**Why it happens:** SQLite stores `Json`-typed columns as `TEXT` with no native JSON operators
Prisma can push down to.
**How to avoid:** Filter the size the same way search does — a plain string `contains` on the
raw JSON text, quote-guarded so `"M"` doesn't accidentally match inside another token: `{ sizes:
{ contains: '"' + size + '"' } }`. This is not a real relational filter and is a known
limitation to flag for later (normalizing `sizes` into its own table is out of scope for D-06,
which only calls out `images`).
**Warning signs:** Filtering by size "M" also matches a product whose only size is "SM" if the
quote-guard is dropped — verify with a size-substring edge case in test fixtures.

### Pitfall 4: `prisma db push` on a column being dropped requires accepting data loss
**What goes wrong:** Removing the `images` column from `Product` via `prisma db push` will refuse
to run non-interactively (or prompt) because it detects data loss on that column.
**Why it happens:** `db push` diffs the schema against the live SQLite file and flags any
destructive change.
**How to avoid:** Since the plan is to immediately reseed anyway, run `prisma db push
--accept-data-loss`, then `npm run seed` right after. Document this in the plan's task steps so
the executor doesn't get stuck on an interactive prompt in a non-TTY environment.
**Warning signs:** `db push` hangs waiting for a y/n confirmation, or errors out in CI/non-TTY
contexts without `--accept-data-loss`.

### Pitfall 5: Resetting `page` to 1 on every filter/search change
**What goes wrong:** If a filter or search term changes but `?page=` isn't reset, a user can land
on "page 4" of a 1-page result set and see an empty grid, looking like a bug.
**Why it happens:** URL params persist across `router.replace` calls unless explicitly overwritten.
**How to avoid:** Every client control that changes `q`/`category`/`size`/`price`/`sort` must also
`params.set("page", "1")` before replacing the URL (shown in Pattern 1's example).
**Warning signs:** Applying a narrow filter while on a later page shows "no products" even though
matches exist on page 1.

## Code Examples

Verified patterns from official sources (also see full examples under Architecture Patterns above):

### Combining `count` + `findMany` for pagination totals
```ts
// Source: pattern documented at prisma.io/docs/orm/prisma-client/queries/pagination [CITED]
const [products, total] = await Promise.all([
  prisma.product.findMany({ where, orderBy, skip, take }),
  prisma.product.count({ where }),
]);
const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
```

### `<Suspense>`-wrapped client search box in a Server Component page
```tsx
// Source: pattern from Next.js official tutorial [CITED: nextjs.org/learn/dashboard-app/adding-search-and-pagination]
import { Suspense } from "react";
import SearchBox from "@/components/shop/SearchBox";

<Suspense fallback={<div className="h-10" />}>
  <SearchBox placeholder="Search the collection..." />
</Suspense>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `Product.images` as a JSON-encoded `string[]` column | Related `ProductImage` table with `position` ordering | This phase (D-06) | Enables per-image metadata (alt text, ordering) and scales to many images per product without column-size or parsing concerns |
| Category-only `?category=` filter on `/shop` | Full `?q=&category=&size=&price=&sort=&page=` URL-driven state | This phase (D-01) | Shareable/bookmarkable filtered views; sets up the URL-state pattern the rest of M2 (admin previews, Phase 10 SEO) can build on |
| Client-side `getProducts(category)` returning the whole category | Server-side paginated `getProducts({...filters, page})` returning a page + total count | This phase (D-07) | Required for "thousands of products" (CATL-01) — unbounded `findMany` without `take` does not scale |

**Deprecated/outdated:**
- The `deserialize()` JSON-parsing helper in `lib/products.ts` for `images` goes away entirely
  once `ProductImage` is a real relation — Prisma returns typed rows directly via `include`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `use-debounce` is the right dependency to add (vs. hand-rolling) | Standard Stack / Don't Hand-Roll | Low — trivial to swap for a hand-rolled hook later; either choice is functionally equivalent, this is a style/dependency-count judgment call, not a correctness one |
| A2 | Wishlist page fetches full product data via a small server action / route handler keyed by the slug list from `WishlistContext`, rather than duplicating product data into localStorage | Pattern 4 | Low-medium — if the planner instead chooses to cache minimal product data (name/price/image) directly in the wishlist's localStorage entry (like `CartItem` does), that's also valid and avoids the extra fetch; either approach satisfies WISH-01, this is Claude's Discretion per CONTEXT.md |
| A3 | Default sort is "newest" (`createdAt desc`) when no `?sort=` is present | Pattern 2 | Low — CONTEXT.md leaves exact defaults to planner/executor discretion; any of the four documented sort options is a reasonable default |
| A4 | Page size of 24 products per page | Recommended Project Structure / Pattern 1 | Low — CONTEXT.md explicitly says "e.g. 24," this is a suggestion not a lock |

**If this table is empty:** N/A — see entries above; all are low-risk, discretion-level choices
explicitly delegated to the planner/executor by CONTEXT.md, not compliance- or security-relevant
assumptions requiring user confirmation.

## Open Questions

1. **Should the wishlist page fetch full product details via a Route Handler, a Server Action, or duplicate a minimal product snapshot in localStorage (like `CartItem` does)?**
   - What we know: The wishlist must persist across sessions in `localStorage` with no login (D-13), and must support add/remove from cards and PDPs plus a list page (D-14).
   - What's unclear: Whether to store just `slug[]` (thin, requires a fetch to render the list) or a denormalized snapshot (`{slug, name, price, image}[]`, like `CartItem`, avoiding a fetch but risking stale display data if a product's price/name later changes).
   - Recommendation: Store just `slug[]` (thinner, always-fresh data) and fetch current product details server-side for the `/wishlist` page render — this matches the "richer PDP driven by live data" spirit of the phase and avoids showing stale prices. Planner's call; either satisfies WISH-01.

2. **Exact richer-PDP field set (materials/care/fit copy) beyond the gallery.**
   - What we know: D-08 says "richer detail content ... is included where data allows; exact fields at planner's discretion," and the current `Product` model has no dedicated fields for this copy.
   - What's unclear: Whether to add new `Product` columns (e.g. `materials`, `care`) now or reuse/extend `description` with structured sections.
   - Recommendation: Given CATL-01's "no redesign later" scale goal, add optional nullable `Product` columns now (e.g. `materialsCare String?`) even if seed data leaves them mostly empty — cheaper to add now than to re-migrate later when Phase 9's admin needs to edit them.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| Node.js | Dev server, scripts | ✓ | v24.14.1 | — |
| Prisma CLI | Schema push, generate, seed | ✓ | 5.22.0 (installed; registry latest is 7.8.0 — do not upgrade, out of scope) | — |
| Next.js | App Router, dev/build | ✓ | 14.2.35 (installed; registry latest is 16.2.10 — do not upgrade, out of scope) | — |
| SQLite dev database | Local persistence | ✓ | `prisma/dev.db` exists | — |
| `use-debounce` | Debounced search input | ✗ (not yet installed) | latest 10.1.1 on registry | `npm install use-debounce`; no fallback needed, install is trivial and low-risk |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** `use-debounce` — straightforward install, or hand-roll the
debounce hook if the planner prefers zero new dependencies (see Alternatives Considered).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed yet — no `jest`/`vitest`/`playwright` in `package.json`, no `tests/`/`__tests__/` directory found in the repo |
| Config file | none — see Wave 0 Gaps |
| Quick run command | `npx vitest run <file>` (once installed — see Wave 0 Gaps) |
| Full suite command | `npx vitest run` |

**Recommendation:** Add `vitest` (lightweight, fast, TS-native, no config ceremony) for
integration-style tests of `lib/products.ts` query logic run against a real, disposable SQLite
test database (`DATABASE_URL=file:./test.db`), reset via `prisma db push --force-reset` +
minimal fixture seed before the suite runs. This is more trustworthy than mocking Prisma, since
the pitfalls documented above (SQLite case-sensitivity, JSON `contains` quoting, pagination
count-matching) are exactly the kind of provider-specific behavior a mock would hide.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| DISC-01 | Search matches name/description/category, case-sensitive substring, returns expected products for a known fixture set | integration | `npx vitest run tests/products.search.test.ts` | ❌ Wave 0 |
| DISC-02 | Filter by category, size (quote-guarded JSON contains), and price range combine correctly (AND semantics) | integration | `npx vitest run tests/products.filter.test.ts` | ❌ Wave 0 |
| DISC-03 | Sort by price asc/desc, newest, name produces correctly ordered results | integration | `npx vitest run tests/products.sort.test.ts` | ❌ Wave 0 |
| DISC-04 | Collection query returns only products linked to that collection; pagination works on a collection route the same as `/shop` | integration | `npx vitest run tests/collections.test.ts` | ❌ Wave 0 |
| WISH-01 | Add/remove/persist wishlist slugs across a simulated reload (localStorage) | unit (jsdom) | `npx vitest run tests/wishlist-context.test.tsx` | ❌ Wave 0 |
| PDP-01 | Gallery renders ordered `ProductImage[]`, selecting a thumbnail updates the main image | unit (jsdom) / manual | `npx vitest run tests/gallery.test.tsx` + manual in-browser check of hover/interaction feel | ❌ Wave 0 |
| CATL-01 | `findMany` + `count` use identical `where`, pagination `skip`/`take` never loads the full table (assert query shape / row-count bound), indexes exist on `category`/`price`/`createdAt` | integration + schema check | `npx vitest run tests/products.pagination.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** run the single relevant test file (`npx vitest run tests/<area>.test.ts`)
- **Per wave merge:** `npx vitest run` (full suite) + `npx next build` (catches the
  `useSearchParams`/`Suspense` build-time failure from Pitfall 1, which `next dev` will not catch)
- **Phase gate:** full suite green + a production build (`next build`) succeeds, before
  `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Install `vitest` (+ `@vitejs/plugin-react` and `jsdom` if any component-level tests are
      written for `Gallery`/`WishlistContext`) — `npm install -D vitest jsdom @testing-library/react`
- [ ] `vitest.config.ts` — points test `DATABASE_URL` at a disposable SQLite file, not `dev.db`
- [ ] `tests/setup.ts` — shared fixture: pushes schema to the test DB and seeds a small known
      product/collection set before each test file runs
- [ ] `tests/products.search.test.ts`, `tests/products.filter.test.ts`,
      `tests/products.sort.test.ts`, `tests/products.pagination.test.ts`,
      `tests/collections.test.ts` — cover DISC-01..04, CATL-01
- [ ] `tests/wishlist-context.test.tsx` — cover WISH-01
- [ ] `tests/gallery.test.tsx` — cover PDP-01 (thumbnail selection updates main image)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | No | Wishlist and search are explicitly unauthenticated by design (D-13) — no new auth surface this phase |
| V3 Session Management | No | No session changes |
| V4 Access Control | No | No new protected routes; collections/search are public, same as existing `/shop` |
| V5 Input Validation | Yes | All `searchParams` values (`q`, `category`, `size`, `price`, `sort`, `page`) are untrusted user input — validate/coerce before use: `page` must be a positive integer (clamp/default to 1, don't let a negative or huge value produce a pathological `skip`), `price` range must parse to numbers or be ignored, `sort` must be checked against an allow-list of the four known values (don't pass an arbitrary string into `orderBy` field selection), `category`/`size` should be checked against known values from `getCategories()`/known size list before being used in a `contains`, to avoid a malformed value silently returning zero results or (more importantly) to avoid ever string-interpolating them into raw SQL — always go through Prisma's parameterized `where` builders, never `$queryRawUnsafe` |
| V6 Cryptography | No | No new cryptographic surface |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| SQL injection via search/filter query params | Tampering | Prisma's `where`/`contains`/`gte`/`lte` builders are parameterized by default — this phase must not introduce any `$queryRaw`/`$queryRawUnsafe` string concatenation for search or filtering, even for the SQLite `COLLATE NOCASE` workaround (which is a schema/migration-time SQL edit, not a per-request query) |
| Unbounded `page`/`price` values causing large or negative `skip`/`take` | Denial of Service (minor) | Clamp `page` to `>= 1` and a sane upper bound before computing `skip`; clamp/validate `price` to non-negative numbers |
| localStorage wishlist tampering (user edits their own browser storage) | Tampering (self only, low impact) | No server trust is placed in wishlist contents — it never reaches the server as anything other than a list of slugs used for a read-only product lookup, so a tampered slug list can at most show a 404-safe empty state, not corrupt server data |

## Sources

### Primary (HIGH confidence)
None — Context7 MCP was unavailable in this research session; all findings below were obtained
via WebSearch/WebFetch against official documentation domains rather than a direct docs MCP.

### Secondary (MEDIUM confidence)
- [CITED: prisma.io/docs/orm/prisma-client/queries/case-sensitivity] — confirmed via direct
  WebFetch: `mode: "insensitive"` unsupported on SQLite; `COLLATE NOCASE` is the documented
  workaround, ASCII-only, requires hand-edited migration SQL
- [CITED: nextjs.org/learn/dashboard-app/adding-search-and-pagination] — confirmed via direct
  WebFetch: official debounced-search + `searchParams` + `use-debounce` pattern
- [CITED: nextjs.org/docs/messages/missing-suspense-with-csr-bailout] — `useSearchParams` requires
  a `<Suspense>` boundary in Client Components or the production build fails
- [CITED: prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields] —
  SQLite has no native JSON filter support in Prisma (`array_contains`/`path` are Postgres/MySQL only)
- `npm view` (registry): `use-debounce` 10.1.1, first published 2018-11-09, ~6.47M weekly downloads,
  no postinstall script `[VERIFIED: npm registry]`; `next` 14.2.35 and `prisma` 5.22.0 confirmed as
  the actually-installed/running versions via `npx next --version` and reading `package.json`
  `[VERIFIED: npm registry]`

### Tertiary (LOW confidence)
- WebSearch-only findings on Prisma relation modeling (one-to-many with `position` ordering,
  implicit many-to-many for `Collection`) and pagination `count`+`findMany` combination — pattern
  is standard/uncontroversial Prisma usage but was not cross-checked against a fetched docs page
  in this session; flagged `[CITED]` inline where a specific docs URL surfaced in results, `LOW`
  confidence tier otherwise per the classify-confidence seam
- WebSearch-only findings on PDP gallery hand-rolling vs. carousel libraries — general web
  consensus, not sourced from an authoritative spec (design/UX judgment call, not a correctness claim)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new core dependencies; the one addition (`use-debounce`) is
  registry-verified and matches Next.js's own documented pattern
- Architecture: MEDIUM — Server/Client split and Prisma relation patterns are well-established
  Next.js/Prisma conventions, confirmed against official docs pages, but this session had no
  Context7 access for deeper cross-verification
- Pitfalls: MEDIUM — the two most consequential findings (SQLite `mode: "insensitive"`
  unsupported, and `useSearchParams` requiring `Suspense`) were confirmed via direct WebFetch of
  official Prisma/Next.js documentation pages, not just search snippets

**Research date:** 2026-07-14
**Valid until:** 2026-08-13 (30 days — stable, framework-version-pinned findings; re-verify if
Next.js or Prisma versions change before Phase 8 executes)

## RESEARCH COMPLETE
