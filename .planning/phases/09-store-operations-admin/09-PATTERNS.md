# Phase 9: Store Operations / Admin - Pattern Map

**Mapped:** 2026-07-20
**Files analyzed:** 20
**Analogs found:** 17 / 20

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `prisma/schema.prisma` — `ProductSizeStock` model | model | CRUD | `ProductImage` model (`prisma/schema.prisma` lines 30-39) | exact |
| `prisma/schema.prisma` — `Order.trackingNumber`/`notes` | model | CRUD | `Order` model (`prisma/schema.prisma` lines 49-58) | exact (in-place field add) |
| `lib/admin.ts` (`OWNER_EMAIL`, `isOwnerEmail`, `requireOwner`) | utility/middleware | request-response | `lib/auth.ts` (session/provider config) + session check in `app/api/checkout/route.ts` lines 25-28 | role-match |
| `lib/orders.ts` (`ORDER_STATUSES`, `isValidOrderStatus`) | utility | transform | `lib/catalog.ts` `SORT_OPTIONS`/`buildOrderBy` allow-list (lines 11-18, 134-155) | exact |
| `lib/catalog.ts` — extend `buildProductWhere` (stock-aware + relational size filter) | utility | transform | itself — extend in place, same file | exact (existing file) |
| `lib/products.ts` — extend `deserialize`/`Product` type with `variants` | service | CRUD | itself — extend in place, same file | exact (existing file) |
| `app/admin/layout.tsx` | route (layout) | request-response | `app/layout.tsx` (root layout, shell composition) | role-match |
| `app/admin/page.tsx` | route | request-response | `app/account/page.tsx` (authenticated Server Component page) | role-match |
| `app/admin/products/page.tsx` | route | CRUD (read) | `app/shop/page.tsx` (Server Component data fetch + list render) | exact |
| `app/admin/products/actions.ts` | controller (server action) | CRUD | `app/api/checkout/route.ts` (POST route handler: auth check → validate → Prisma write) | role-match (first true Server Action in repo) |
| `app/admin/products/new/page.tsx` / `[id]/edit/page.tsx` | route | CRUD | `app/checkout/page.tsx` (form-bearing page shell) | partial |
| `app/admin/collections/page.tsx` | route | CRUD (read) | `app/collections/page.tsx` (Server Component list) | exact |
| `app/admin/collections/actions.ts` | controller (server action) | CRUD | `app/admin/products/actions.ts` (sibling, same phase) | exact (internal) |
| `app/admin/orders/page.tsx` | route | CRUD (read) | `app/account/page.tsx` (authenticated list of user-scoped data) | role-match |
| `app/admin/orders/actions.ts` | controller (server action) | CRUD | `app/admin/products/actions.ts` (sibling) | exact (internal) |
| `app/admin/orders/[id]/page.tsx` | route | request-response | `app/order/success/page.tsx` (single-order detail Server Component) | role-match |
| `components/admin/ProductForm.tsx` | component (client form) | request-response | `components/SignInForm.tsx` (`"use client"` form island) | exact |
| `components/admin/SizeStockEditor.tsx`, `ImageUrlEditor.tsx`, `CollectionPicker.tsx` | component | request-response | `components/AddToCart.tsx` (`"use client"` island with local state array rendering) | role-match |
| `components/admin/ProductTable.tsx`, `OrderTable.tsx` | component | CRUD (read) | `components/ProductGrid.tsx` + `components/ProductCard.tsx` (list rendering of Server Component data) | role-match |
| `middleware.ts` (optional fast-path redirect) | middleware | request-response | none exists yet — no analog | no analog |

## Pattern Assignments

### `prisma/schema.prisma` — new `ProductSizeStock` model (model, CRUD)

**Analog:** `ProductImage` model, `prisma/schema.prisma` lines 30-39

```prisma
model ProductImage {
  id        String  @id @default(cuid())
  productId String
  url       String
  position  Int     @default(0)
  alt       String?
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}
```

**Copy exactly this shape** (cuid id, `productId` FK, `position Int @default(0)`, `onDelete: Cascade`, `@@index([productId])`), adding `size String`, `stock Int @default(0)`, and `@@unique([productId, size])`:

```prisma
model ProductSizeStock {
  id        String  @id @default(cuid())
  productId String
  size      String
  stock     Int     @default(0)
  position  Int     @default(0)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, size])
  @@index([productId])
}
```

Add `variants ProductSizeStock[]` to `Product` (mirrors the existing `images ProductImage[]` line at `prisma/schema.prisma` line 22).

---

### `Order.trackingNumber` / `Order.notes` (model, in-place field add)

**Analog:** existing `Order` model, `prisma/schema.prisma` lines 49-58 — `status String @default("pending")` is the pattern to mirror for optional fields:

```prisma
model Order {
  id        String   @id @default(cuid())
  userId    String?
  email     String
  items     String
  total     Int
  status    String   @default("pending")
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}
```

Add `trackingNumber String?` and `notes String?` directly beneath `status`, following the existing `String?` nullable convention already used for `userId String?`.

---

### `lib/admin.ts` (utility/middleware, request-response) — Owner gate

**Analog:** session-check pattern in `app/api/checkout/route.ts` lines 25-28, combined with `authOptions` from `lib/auth.ts`:

```typescript
// app/api/checkout/route.ts lines 24-28 — the session-check idiom to copy
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
```

`lib/auth.ts` confirms `authOptions` (`session: { strategy: "jwt" }`, `pages: { signIn: "/signin" }`) is the single source of truth to import — do not duplicate config.

Build `lib/admin.ts` combining this session check with `redirect()`/`notFound()` instead of a 401 JSON response (since admin entry points are pages/Server Actions, not a public API route):

```typescript
// lib/admin.ts
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const OWNER_EMAIL =
  (process.env.OWNER_EMAIL ?? "owner@nostalgia.test").trim().toLowerCase();

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === OWNER_EMAIL;
}

export async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/signin?callbackUrl=/admin");
  }
  if (!isOwnerEmail(session.user.email)) {
    notFound();
  }
  return session;
}
```

**Critical repetition rule** (see RESEARCH.md Pattern 1 / Pitfall 1): `await requireOwner()` must be the first statement in `app/admin/layout.tsx` AND the first line of every exported function in every `app/admin/**/actions.ts` file — the layout check alone does not protect Server Actions.

---

### `lib/orders.ts` — allow-list status validation (utility, transform)

**Analog:** `SORT_OPTIONS` + `buildOrderBy`, `lib/catalog.ts` lines 11-18 and 134-155:

```typescript
// lib/catalog.ts lines 11-18
export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
];
```

```typescript
// lib/catalog.ts lines 134-144 — the Set-based allow-list-before-use idiom
const SORT_VALUES = new Set(SORT_OPTIONS.map((o) => o.value));

export function buildOrderBy(
  sort: string | undefined,
): Prisma.ProductOrderByWithRelationInput {
  const key = sort && SORT_VALUES.has(sort) ? sort : "newest";
  switch (key) {
    case "price-asc":
      return { price: "asc" };
    ...
```

Copy this Set-based `has()` check shape exactly for `lib/orders.ts`:

```typescript
export const ORDER_STATUSES = ["pending", "paid", "fulfilled", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_SET = new Set<string>(ORDER_STATUSES);
export function isValidOrderStatus(value: string): value is OrderStatus {
  return STATUS_SET.has(value);
}
```

Keep this file Prisma-import-free (types only), matching `lib/catalog.ts`'s doc comment at lines 1-6 — it must stay unit-testable without a DB, per the project's existing `tests/catalog.test.ts` convention.

---

### `lib/catalog.ts` — extend `buildProductWhere` (utility, transform)

**File to modify (not new).** Current size clause, lines 106-110:

```typescript
// SQLite-specific: sizes is JSON text, not a native array — quote-guard the
// contains so "M" cannot match inside another size token like "SM".
const sizeClause: Prisma.ProductWhereInput = size
  ? { sizes: { contains: `"${size}"` } }
  : {};
```

Current `AND` return, lines 122-131:

```typescript
return {
  AND: [
    searchClause,
    categoryClause,
    sizeClause,
    minPriceClause,
    maxPriceClause,
    collectionClause,
  ],
};
```

**Replace** `sizeClause` with the relational form and **add** `inStockClause` to the `AND` array (per RESEARCH.md Pattern 4 — this is the exact recommended diff, already research-verified against this file):

```typescript
const sizeClause: Prisma.ProductWhereInput = size
  ? { variants: { some: { size, stock: { gt: 0 } } } }
  : {};

const inStockClause: Prisma.ProductWhereInput = {
  variants: { some: { stock: { gt: 0 } } },
};

return {
  AND: [searchClause, categoryClause, sizeClause, minPriceClause, maxPriceClause, collectionClause, inStockClause],
};
```

Must stay in the Prisma `where` (not a post-`findMany` JS `.filter()`) — the file's own doc comment at `lib/products.ts` lines 99-103 ("Always a single indexed findMany + a matching count with an identical where — never fetch-all-then-filter/paginate in JS") is the binding convention; `getCatalog` calls `prisma.product.count({ where })` and `findMany({ where })` with the identical object (`lib/products.ts` lines 121-134).

---

### `lib/products.ts` — extend `deserialize`/`Product` type (service, CRUD)

**File to modify.** Current shape, lines 13-45:

```typescript
export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number; // cents
  category: string;
  description: string;
  images: string[];
  sizes: string[];
  featured: boolean;
  materials?: string | null;
  care?: string | null;
};

function deserialize(row: {
  ...
  images: { url: string }[];
}): Product {
  return {
    ...row,
    images: row.images.map((img) => img.url),
    sizes: JSON.parse(row.sizes) as string[],
  };
}
```

Every query site includes `images: { orderBy: { position: "asc" } }` (lines 51, 60, 68, 131) — add a matching `variants: { orderBy: { position: "asc" } }` include at each of those 4 call sites, and extend `deserialize` to derive `sizes` from `variants` instead of `JSON.parse`, adding a `variants: ProductVariant[]` field to the `Product` type (per RESEARCH.md Code Examples section).

**Also update** `app/api/checkout/route.ts` lines 62-72, which currently does `JSON.parse(p.sizes)` to validate an incoming size — this must be updated in lockstep with `lib/products.ts` once `sizes` is derived from `variants`, or checkout will validate against a stale/empty JSON column. This is a required cross-file consistency point, not optional.

---

### `app/admin/layout.tsx` (route/layout, request-response)

**Analog:** `app/layout.tsx` (root shell) — read for provider/composition convention, but the owner-gate content is new. Critical ordering rule from RESEARCH.md Pitfall 2: `await requireOwner()` must be the very first statement, before any other `await` or JSX, or `notFound()`/`redirect()` will fire after the response status locks at 200.

---

### `app/admin/products/page.tsx`, `app/admin/collections/page.tsx` (route, CRUD read)

**Analog:** `app/shop/page.tsx` and `app/collections/page.tsx` — Server Component pattern: fetch via a `lib/*.ts` function, pass plain data to presentational components. Same split applies to admin list pages: fetch via `lib/products.ts`/new admin query helpers, render via `components/admin/ProductTable.tsx`/`OrderTable.tsx`.

---

### `app/admin/products/actions.ts`, `app/admin/collections/actions.ts`, `app/admin/orders/actions.ts` (controller/server-action, CRUD)

**Analog:** `app/api/checkout/route.ts` — closest existing mutation-boundary code in the repo (auth check → explicit runtime validation of untrusted input → Prisma write). Reused conventions to copy:

1. **Auth-first pattern** (lines 25-28): session check before touching any input.
2. **Explicit field-by-field extraction, never spread raw input** (lines 13-22, `isIncomingItem` type guard) — same discipline applies to `FormData` extraction in the new Server Actions; never `Object.fromEntries(formData)` into `prisma.<model>.create({ data })`.
3. **Recompute/validate against the DB, never trust client values** (lines 50-56, 62-72) — for admin actions this manifests as re-validating slugs/sizes against `@unique`/`@@unique` constraints and catching Prisma's `P2002` error rather than a pre-check-then-insert race.

```typescript
// app/api/checkout/route.ts lines 13-22 — the type-guard idiom to mirror
function isIncomingItem(x: unknown): x is IncomingItem {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as Record<string, unknown>).slug === "string" &&
    typeof (x as Record<string, unknown>).size === "string" &&
    typeof (x as Record<string, unknown>).qty === "number" &&
    Number.isFinite((x as Record<string, unknown>).qty)
  );
}
```

This is the **first true Server Action (`"use server"`) in the repo** — there is no closer existing analog than this Route Handler; RESEARCH.md Pattern 3 already provides the concrete target shape (`parseProductInput`, `createProduct`) to implement directly.

---

### `components/admin/ProductForm.tsx` (component, request-response)

**Analog:** `components/SignInForm.tsx` — the only existing `"use client"` form island in the repo. Read it for the client-form conventions (controlled inputs, submit handling, error display) already established by the project; extend the same shape for multi-field product forms (name/slug/price/category/description/materials/care/featured).

---

### `components/admin/SizeStockEditor.tsx`, `ImageUrlEditor.tsx` (component, request-response)

**Analog:** `components/AddToCart.tsx` lines 36-53 — `"use client"` component rendering an array of local rows from `product.sizes`/`product.variants` with per-row interaction:

```tsx
<div className="flex flex-wrap gap-2">
  {product.sizes.map((s) => (
    <button
      key={s}
      onClick={() => { setSize(s); setError(false); }}
      className={`min-w-12 border px-4 py-2.5 text-sm transition-colors ${...}`}
    >
      {s}
    </button>
  ))}
</div>
```

Copy the per-row-keyed-array-with-local-state shape for the admin's per-size stock number-input rows and reorderable image URL rows (arrow-button reorder per UI-SPEC, not drag-and-drop).

---

### `components/admin/ProductTable.tsx`, `OrderTable.tsx` (component, CRUD read)

**Analog:** `components/ProductGrid.tsx` + `components/ProductCard.tsx` — Server-Component-fed presentational list rendering (data passed as props, no client fetch). Read `ProductCard.tsx` (lines 6-44) for the "plain prop-driven row/card, formatPrice import from `lib/products.ts`" convention; admin tables follow the same shape but as `<table>` rows instead of `<Link>` cards, since UI-SPEC calls for a "dense product table."

---

## Shared Patterns

### Owner Gate (Authorization)
**Source:** New `lib/admin.ts`, built from `app/api/checkout/route.ts` lines 25-28 + `lib/auth.ts` `authOptions`
**Apply to:** `app/admin/layout.tsx` AND the first line of every exported function in every `app/admin/**/actions.ts` file AND any admin Route Handler. Non-negotiable per-action repetition — see RESEARCH.md Pitfall 1.
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.email) { redirect("/signin?callbackUrl=/admin"); }
if (!isOwnerEmail(session.user.email)) { notFound(); }
```

### Explicit Field Extraction (never mass-assign)
**Source:** `app/api/checkout/route.ts` lines 13-22 (`isIncomingItem` type guard)
**Apply to:** every `parseXInput(formData)` function in `app/admin/**/actions.ts` — extract each field by name into a typed object; never `Object.fromEntries(formData)` or `...body` spread into a Prisma `data:` argument.

### Allow-list-before-use (never trust an unvalidated string)
**Source:** `lib/catalog.ts` lines 11-18, 134-155 (`SORT_OPTIONS`/`buildOrderBy`)
**Apply to:** `lib/orders.ts` `isValidOrderStatus`, and any other admin-settable enum-like field.

### Server Component data fetch / Client island split
**Source:** established throughout `app/shop/page.tsx` + `components/ProductGrid.tsx`/`AddToCart.tsx`/`SignInForm.tsx`
**Apply to:** every `app/admin/**/page.tsx` (Server Component, data fetch via `lib/*.ts`) paired with a `components/admin/*.tsx` `"use client"` island for interactivity/forms.

### Prisma `where`-clause-only filtering (never post-fetch JS filter)
**Source:** `lib/products.ts` lines 99-103 doc comment + `getCatalog` lines 104-143 (identical `where` passed to both `count` and `findMany`)
**Apply to:** the new `inStockClause` in `lib/catalog.ts` `buildProductWhere` — must be in the Prisma `where`, never a `.filter()` after `findMany`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `middleware.ts` | middleware | request-response | No `middleware.ts` exists in this repo yet; RESEARCH.md notes it is optional (fast unauthenticated-redirect only) — build directly from `withAuth`'s official NextAuth pattern cited in RESEARCH.md, not a repo analog. |
| `app/admin/products/new/page.tsx` / `[id]/edit/page.tsx` | route | CRUD | No existing "create/edit form page" route exists (checkout/signin are the only form-bearing pages, and they aren't CRUD-create shaped); use `components/admin/ProductForm.tsx` as the shared form component for both create and edit, per RESEARCH.md's recommended structure (`ProductForm.tsx` reused across `new/` and `[id]/edit/`). |
| `app/admin/orders/[id]/page.tsx` fulfillment control | component | CRUD (update) | No existing single-record admin update UI exists; build directly from RESEARCH.md Pattern 5's `updateOrderFulfillment` Server Action example, paired with a plain `<select>` (native controls per Alternatives Considered — no new UI library). |

## Metadata

**Analog search scope:** `prisma/schema.prisma`, `lib/*.ts`, `app/**/*.tsx`, `app/api/checkout/route.ts`, `components/*.tsx`
**Files scanned:** 12 read directly (schema.prisma, catalog.ts, auth.ts, checkout/route.ts, products.ts, AddToCart.tsx, ProductCard.tsx, signin/page.tsx) + directory listings of `app/` and `components/`
**Pattern extraction date:** 2026-07-20
