# Phase 9: Store Operations / Admin - Research

**Researched:** 2026-07-20
**Domain:** Next.js 14 App Router admin back-office (owner-gated CRUD + inventory + order fulfillment) on Prisma/SQLite
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Admin Access & Authorization (ADMN-01)**
- D-01: A single store owner, identified by email. The gate reads an `OWNER_EMAIL` env var; use a placeholder default `owner@nostalgia.test` for now and set the real owner Google email in `.env` at go-live (Phase 11). Do NOT hardcode a real email in source.
- D-02: The admin dashboard and all admin routes/mutations are gated by comparing the authenticated session email to `OWNER_EMAIL`. The block MUST be a real server-side check (middleware and/or per-route/server-action guard), not just hidden UI. Non-owners → blocked (redirect to sign-in or 403/404, planner's discretion). In dev the demo login accepts any typed email, so the owner tests locally by signing in as `OWNER_EMAIL`.
- D-03: No `User.role` field — single-owner-by-email is sufficient. Role-based / multi-staff admin is explicitly deferred.

**Product Management (ADMN-02)**
- D-04: Admin can create, edit, and delete products through the UI; changes appear on the storefront (SC#2). Editable fields: name, slug, price (cents), category, description, materials, care, sizes, featured, plus images and collection membership.
- D-05: Product images are managed by URL entry — admin adds/reorders/removes `ProductImage` rows (url + alt + position). No file-upload/storage infra this phase.
- D-06: Collection management is folded in here (deferred from Phase 8 D-11): admin can create/edit/delete `Collection`s and assign products to them.
- D-07: Product delete must not corrupt order history. `Order.items` is a JSON snapshot, so past orders are safe; planner decides hard-delete vs a guard/soft-delete — just don't break existing-order display.

**Inventory (ADMN-03)**
- D-08: Stock is tracked per size. Each product's sizes carry their own stock count. This needs a proper structure (e.g. a related `ProductVariant`/`ProductSizeStock` row: `productId` + `size` + `stock`) rather than the current JSON `sizes` array — researcher/planner choose the exact model; it must work on SQLite now and survive the Phase 11 Postgres migration. Admin sets/adjusts per-size counts.
- D-09: Storefront out-of-stock behavior: a size at 0 stock is disabled/marked "Sold out" in the PDP size selector and cannot be added to cart. A product whose sizes are ALL 0 is HIDDEN from `/shop` and collection listings (removed until restocked). ⇒ The Phase 8 catalog query path (`getCatalog`/`getCollections`) MUST become stock-aware and filter out fully-sold-out products.
- D-10: Stock is admin-managed only this phase — no auto-decrement on customer checkout. Auto-decrement is deferred to Phase 11.

**Order Management & Fulfillment (ADMN-04)**
- D-11: Admin can view ALL orders (items, total, customer email, date, status) — SC#4. The order list is read-only except the fulfillment controls below.
- D-12: Fulfillment is a fixed status flow: pending → paid → fulfilled → cancelled, advanced by the admin via a dropdown/action. The existing `Order.status` string is formalized to these values.
- D-13: Each order gains an optional tracking number (and notes) the admin can set — add `trackingNumber String?` (and optional `notes String?`) to `Order`.

**Admin UI Shape**
- D-14: The admin lives under its own route section (e.g. `/admin`) with its own layout/nav — a back-office surface that still respects the locked "nostalgic luxury streetwear" aesthetic. Exact dashboard layout/nav is a UI-SPEC concern — UI-SPEC is already approved (see `09-UI-SPEC.md`).

### Claude's Discretion
- Exact per-size stock model (variant table vs JSON map), admin route structure and layout, form-validation UX, the non-owner block mechanism (redirect vs 403 vs 404), hard-delete vs guarded delete for products, and precisely how the stock-aware filter is added to the Phase 8 `getCatalog` path — planner/researcher choose, consistent with the locked design system, dev-runnability, and the SQLite-now/Postgres-later constraint.

### Deferred Ideas (OUT OF SCOPE)
- Auto-decrement stock on customer purchase — Phase 11.
- File upload / cloud image storage for real photography — later.
- Role-based / multi-staff admin (`User.role`, permissions, invitations) — future.
- Real owner Google email — set `OWNER_EMAIL` in `.env` at Phase 11 go-live.
- Order editing beyond status/tracking (refunds, line-item edits, customer notifications) — not in scope.
- Reviews / SEO / size guides / analytics — Phase 10.

**Note:** The UI-SPEC (`09-UI-SPEC.md`, approved 2026-07-17, 6/6 dimensions) already resolves several of the above discretion items: non-owner block = unauthenticated → redirect to sign-in, authenticated non-owner → plain 404-style "Not found" (admin existence not revealed); image reorder = arrow/drag row controls, no file upload; per-size stock editor = compact row per size with number input; delete = destructive-red button with confirmation copy. Treat the UI-SPEC as locked alongside CONTEXT.md.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMN-01 | Only authenticated admins can reach the admin dashboard; all others are blocked | `requireOwner()` server-side guard pattern (Architecture Patterns §1), applied at layout + every Server Action/route — see Common Pitfalls §1 on why layout-only checks are insufficient |
| ADMN-02 | Admin can create, edit, and delete products through the UI, and changes appear on the storefront | Server Action CRUD pattern + `revalidatePath` fan-out (Architecture Patterns §3), verified-safe hard-delete (Code Examples, Assumptions Log) |
| ADMN-03 | Admin can set and adjust per-product stock; out-of-stock state reflects on the storefront | `ProductSizeStock` relational model (Architecture Patterns §2) + stock-aware `getCatalog`/`buildProductWhere` filter (Code Examples) + PDP sold-out disabling |
| ADMN-04 | Admin can view all orders and update fulfillment status | Fixed-allow-list status transition (mirrors existing `buildOrderBy` pattern), `trackingNumber`/`notes` fields (Architecture Patterns §4) |
</phase_requirements>

## Summary

Phase 9 is architecturally straightforward — it adds a `/admin` route section on top of an already-working stack (NextAuth JWT sessions, Prisma/SQLite, Server Components + Server Actions) — but it introduces the project's **first real relational break** from the JSON-array convention established in Phases 1–8, and its **first authorization surface** (everything before this phase was either public or "any authenticated user"). Both of these are well-trodden patterns with strong official guidance, not exploratory territory.

The per-size stock structure should be a new `ProductSizeStock` model (`productId + size` unique, `stock Int`, `position Int` for display order) that mirrors the existing `ProductImage` model's shape exactly — same cascade-delete relation, same `position`-based ordering convention already used in this codebase. This relation replaces the JSON `sizes` column's role: `Product.sizes` becomes a derived array from `ProductSizeStock` rows, and the Phase 8 `buildProductWhere` size filter (currently a fragile quote-guarded JSON `contains` hack) simplifies to a real relational filter. The stock-aware "hide fully sold-out products" requirement (D-09) becomes a single added `AND` clause: `{ variants: { some: { stock: { gt: 0 } } } }`.

The owner gate is a session-email string comparison, not a role system (D-03 explicitly rules out `User.role`). The critical research finding here is that **Next.js Server Actions are public HTTP endpoints with zero built-in authorization** (confirmed via official Next.js docs) — a `layout.tsx`-level check protects page *rendering* but does not protect Server Actions or Route Handlers, which are independently callable. The plan must wire a single reusable `requireOwner()` guard and call it at the top of every admin Server Component entry, every admin Server Action, and every admin Route Handler — not rely on the layout alone.

Order fulfillment reuses the exact allow-list pattern already established in `lib/catalog.ts`'s `buildOrderBy` (validate an untrusted value against a fixed `Set` before use) — apply the same technique to `Order.status` transitions.

**Primary recommendation:** Add `ProductSizeStock` (mirroring `ProductImage`'s shape/position pattern) via `prisma db push` (continue the project's existing no-migrations-folder workflow; defer formal `prisma migrate dev` history to the Phase 11 Postgres cutover), build one `lib/admin.ts` `requireOwner()` helper reused across every admin Server Component/Action/Route, and make the Phase 8 catalog `where`-builder stock-aware with one additional relational `AND` clause.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Owner-email session gate | Frontend Server (SSR) | — | NextAuth `getServerSession` runs server-side in Server Components/Actions/Route Handlers; no client-trusted check |
| Admin dashboard rendering (`/admin/*`) | Frontend Server (SSR) | — | Server Components fetch via Prisma directly, matching the existing storefront pattern (`lib/products.ts`) |
| Product/Collection CRUD | API / Backend | Frontend Server | Server Actions (`"use server"`) are the mutation boundary; Prisma writes happen there, not in the browser |
| Per-size stock storage | Database / Storage | — | New `ProductSizeStock` relation, SQLite now, same schema shape survives the Phase 11 Postgres switch |
| Stock-aware catalog filtering | Database / Storage | API / Backend | Filter belongs in the Prisma `where` clause (`lib/catalog.ts`), not a post-fetch JS filter — keeps pagination counts correct |
| PDP sold-out size disabling | Browser / Client | Frontend Server | Data (`variant.stock`) is fetched server-side; the disabled/greyed interaction state is a client (`AddToCart.tsx`) concern |
| Order fulfillment status update | API / Backend | Database / Storage | Server Action validates against a fixed allow-list, then a single Prisma `update` |
| Session/auth storage | Database / Storage | — | Unchanged — existing NextAuth Prisma adapter (`Account`/`Session`/`User`) |

## Standard Stack

### Core

No new runtime dependencies are required. The phase is built entirely on packages already installed and locked by `PROJECT.md`.

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 14.2.35 `[VERIFIED: package.json]` | App Router Server Components, Server Actions, `revalidatePath`, `notFound()`/`redirect()` | Already the project's framework; Server Actions are the idiomatic Next 14 mutation mechanism `[CITED: nextjs.org/docs/app/guides/data-security]` |
| `next-auth` | 4.24.11 `[VERIFIED: package.json]` | `getServerSession(authOptions)` for the owner-email check | Already wired (`lib/auth.ts`); v4's `getServerSession` is the documented App Router server-side session pattern `[CITED: next-auth.js.org/tutorials/securing-pages-and-api-routes]` |
| `@prisma/client` / `prisma` | 5.22.0 `[VERIFIED: package.json]` | `ProductSizeStock` model, product/collection/order CRUD, `@@unique([productId, size])` composite constraint | Already the project's ORM; composite unique constraints are natively supported on SQLite `[CITED: prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints]` |

**Note on registry currency:** `npm view` confirms `next@16.2.10`, `next-auth@4.24.14`, and `prisma@7.8.0` are the current latest published versions on npm as of this research `[VERIFIED: npm registry]` — materially newer than what's installed. Per `PROJECT.md`, the tech stack is **LOCKED**; this phase must NOT upgrade any of these. Flagged only so the planner doesn't mistake the installed versions for stale/wrong.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| *(none — no new packages)* | — | — | Form validation, slug generation, and status-transition validation are all small enough to hand-roll consistently with the existing `app/api/checkout/route.ts` runtime type-guard style (see Don't Hand-Roll) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `requireOwner()` + per-action guard | `next-auth/middleware` `withAuth` with a role-based `authorized` callback | `withAuth` runs on the Edge runtime; it CAN read `token.email` (JWT-only, no DB call) so it's technically viable for the "unauthenticated → redirect" fast-path, but it cannot produce the UI-SPEC's "authenticated non-owner → 404" behavior (404 requires RSC rendering, not an edge redirect/rewrite) and it does NOT cover Server Actions. Recommended split: optional middleware for the fast unauthenticated-redirect only; mandatory `requireOwner()` everywhere else. |
| Hand-rolled slugify (lowercase + hyphenate) | `slugify` npm package | A tiny (~10 line) hand-rolled function covers this project's ASCII product names fine and avoids a new dependency; only reach for a package if Unicode/transliteration edge cases appear |
| Native `<select multiple>` / checklist for collection↔product assignment | A multi-select UI library (e.g. `react-select`) | Owner-only, low-cardinality (dozens of products) tool — native controls are sufficient and keep the "no new deps" posture; UI-SPEC explicitly allows "multi-select or checklist" |
| Arrow-button image reorder | Drag-and-drop library (`@dnd-kit/core`, `react-beautiful-dnd`) | UI-SPEC explicitly permits "drag-or-arrow reorder" — arrow buttons need zero new dependencies and are simpler to make keyboard-accessible |

**Installation:** None — no `npm install` needed for this phase.

## Package Legitimacy Audit

**No external packages are introduced by this phase.** All admin functionality (CRUD, auth gate, stock, fulfillment) is built on already-installed, already-audited dependencies (`next`, `next-auth`, `@prisma/client`). The Package Legitimacy Gate is not applicable — table omitted per the "no new packages" condition.

If the planner later decides a package is warranted (e.g. a slug/URL-validation helper), run `gsd-tools query package-legitimacy check --ecosystem npm <pkg>` before adding it and update this audit.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────┐
                         │  Browser (owner, signed in via /signin)  │
                         └───────────────┬───────────────────────────┘
                                         │ GET /admin/*  (page nav)
                                         │ POST (Server Action invocation)
                                         ▼
                    ┌───────────────────────────────────────────────────┐
                    │  Next.js 14 App Router — Frontend Server (SSR)     │
                    │                                                     │
                    │  middleware.ts (OPTIONAL, fast-path only)          │
                    │   └─ unauthenticated /admin/* → redirect /signin   │
                    │                                                     │
                    │  app/admin/layout.tsx                              │
                    │   └─ requireOwner()  ──────────────┐               │
                    │        session.email !== OWNER_EMAIL │               │
                    │        → notFound()                 │               │
                    │                                      ▼               │
                    │  app/admin/products/page.tsx    lib/admin.ts        │
                    │  app/admin/products/[id]/...    requireOwner()      │
                    │  app/admin/collections/...       isOwnerEmail()     │
                    │  app/admin/orders/...                                │
                    │        │  (Server Component read)                   │
                    │        ▼                                             │
                    │  lib/products.ts / lib/catalog.ts (extended)         │
                    │        │  Prisma read (stock-aware where)            │
                    │        ▼                                             │
                    │  ┌─────────────────────────────────────────────┐    │
                    │  │  Server Actions ("use server")                │    │
                    │  │  app/admin/products/actions.ts                │    │
                    │  │  app/admin/collections/actions.ts             │    │
                    │  │  app/admin/orders/actions.ts                  │    │
                    │  │   1. await requireOwner()   ◄── MANDATORY,    │    │
                    │  │      independent of layout guard (Server      │    │
                    │  │      Actions are directly-callable public     │    │
                    │  │      endpoints)                                │    │
                    │  │   2. validate input (allow-list / type-guard) │    │
                    │  │   3. prisma.product/collection/order.{...}    │    │
                    │  │   4. revalidatePath(...) for every affected   │    │
                    │  │      storefront route                          │    │
                    │  └───────────────────┬─────────────────────────┘    │
                    └───────────────────────┼──────────────────────────────┘
                                            ▼
                    ┌───────────────────────────────────────────────────┐
                    │  Prisma / SQLite (prisma/dev.db)                    │
                    │  Product ──< ProductImage                           │
                    │  Product ──< ProductSizeStock  (NEW)                │
                    │  Product >──< Collection                            │
                    │  Order  (status, trackingNumber, notes — formalized)│
                    └───────────────────────────────────────────────────┘
                                            │  revalidated paths re-render
                                            ▼
                    ┌───────────────────────────────────────────────────┐
                    │  Public storefront (unchanged route tree)           │
                    │  /shop, /collections/[slug], /product/[slug]        │
                    │   └─ getCatalog()/getCollections() now filter out   │
                    │      fully-sold-out products (D-09)                 │
                    │   └─ AddToCart.tsx disables 0-stock sizes           │
                    └───────────────────────────────────────────────────┘
```

### Recommended Project Structure

```
app/
├── admin/
│   ├── layout.tsx              # requireOwner() gate + admin nav shell (D-14, UI-SPEC)
│   ├── page.tsx                # optional landing/redirect to /admin/products
│   ├── products/
│   │   ├── page.tsx            # dense product table (UI-SPEC "Products list")
│   │   ├── actions.ts          # create/update/delete Server Actions
│   │   ├── new/page.tsx        # product form (create)
│   │   └── [id]/edit/page.tsx  # product form (edit) — reuses same <ProductForm>
│   ├── collections/
│   │   ├── page.tsx
│   │   ├── actions.ts
│   │   ├── new/page.tsx
│   │   └── [id]/edit/page.tsx
│   └── orders/
│       ├── page.tsx            # read-only order table
│       ├── actions.ts          # updateOrderStatus/updateFulfillment Server Action
│       └── [id]/page.tsx       # order detail + fulfillment control
lib/
├── admin.ts                    # NEW: OWNER_EMAIL, isOwnerEmail(), requireOwner()
├── catalog.ts                  # EXTENDED: stock-aware where clause, relational size filter
├── products.ts                 # EXTENDED: Product type gains `variants`, `sizes` now derived
components/
├── admin/
│   ├── ProductForm.tsx         # client island: details + sizes/stock + images + collections
│   ├── SizeStockEditor.tsx     # per-size number-input rows (UI-SPEC)
│   ├── ImageUrlEditor.tsx      # ordered URL rows + arrow reorder (UI-SPEC)
│   ├── CollectionPicker.tsx    # multi-select/checklist of products
│   ├── ProductTable.tsx        # admin product list table
│   ├── OrderTable.tsx          # admin order list table
│   └── FulfillmentForm.tsx     # status <select> + trackingNumber + notes
middleware.ts                   # OPTIONAL: fast unauthenticated redirect only
prisma/
├── schema.prisma                # + ProductSizeStock, + Order.trackingNumber/notes
└── seed.ts                      # + per-size stock seeding, unchanged collections
```

### Pattern 1: Owner Gate — `requireOwner()` as the single enforcement point

**What:** One small module (`lib/admin.ts`) that every admin Server Component, Server Action, and Route Handler calls first.
**When to use:** At the top of `app/admin/layout.tsx` (protects all page rendering under `/admin`) AND at the first line of every exported Server Action in `app/admin/**/actions.ts` AND in any admin Route Handler.
**Why both layout and per-action:** Next.js's own security guidance states Server Actions are public HTTP endpoints callable directly (e.g. via `curl` with a valid session cookie), completely bypassing the React render tree — a `layout.tsx` check only prevents *rendering* the admin UI, it does not prevent someone who has discovered/guessed an action's endpoint from invoking it directly `[CITED: nextjs.org/docs/app/guides/data-security]`.

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

/**
 * Server-side owner gate. Call at the top of every admin Server Component
 * (via app/admin/layout.tsx) and as the FIRST line of every admin Server
 * Action / Route Handler — Server Actions are independently callable public
 * endpoints and are not protected by the layout check alone.
 *
 * - No session at all -> redirect to sign-in (UI-SPEC: "unauthenticated -> redirect").
 * - Session but wrong email -> notFound() (UI-SPEC: "authenticated non-owner ->
 *   plain 404-style Not found"; admin existence is not revealed).
 */
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

```typescript
// app/admin/layout.tsx
import { requireOwner } from "@/lib/admin";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireOwner(); // MUST run before any JSX is returned — notFound()/redirect()
                         // must be called before streaming starts or the response
                         // status code locks at 200 [CITED: nextjs.org/docs/app/api-reference/file-conventions/not-found]
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <div className="flex-1">{children}</div>
    </div>
  );
}
```

```typescript
// app/admin/products/actions.ts
"use server";
import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteProduct(id: string) {
  await requireOwner(); // repeated on purpose — see Pattern rationale above
  await prisma.product.delete({ where: { id } }); // safe: no FK from Order (see Assumptions Log)
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/"); // featured grid
  // collection detail pages are dynamic per-slug; revalidate the index,
  // individual /collections/[slug] pages self-refresh on next visit since
  // they are not statically cached beyond the default revalidation window
}
```

### Pattern 2: Per-size stock as a relation, mirroring `ProductImage`

**What:** A `ProductSizeStock` model shaped exactly like the existing `ProductImage` model (same cascade + `position` ordering convention already proven in this codebase).
**When to use:** Replaces the JSON `sizes` string column as the source of truth for both "what sizes exist" and "how many are in stock."

```prisma
// prisma/schema.prisma
model Product {
  // ...existing fields unchanged...
  sizes       String          // KEEP the column for backward-compat read paths
                               // during migration, OR drop it once all readers
                               // (lib/products.ts, checkout route, seed.ts) are
                               // switched to `variants` — planner's call; see
                               // State of the Art table.
  variants    ProductSizeStock[]
}

model ProductSizeStock {
  id        String  @id @default(cuid())
  productId String
  size      String
  stock     Int     @default(0)
  position  Int     @default(0)  // mirrors ProductImage.position exactly
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, size])
  @@index([productId])
}
```

**Why this shape:** `@@unique([productId, size])` is natively supported on SQLite `[CITED: prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints]` and prevents duplicate size rows per product at the DB layer, not just in application code. `onDelete: Cascade` matches `ProductImage`'s existing relation exactly, so deleting a `Product` cleanly removes its stock rows without a separate cleanup step. `position` reuses `ProductImage`'s exact convention for admin-controlled display order (S/M/L/XL vs numeric 28/30/32/34/36 vs "One Size" — order is data, not something to infer from string sorting).

**Migration mechanics — stay on `db push`, don't start `migrate dev` yet:** This repo has no `prisma/migrations` directory (`[VERIFIED: filesystem check — prisma/migrations does not exist]`) and already uses `npm run db:push` (`prisma db push`) as its only schema-sync workflow (`[VERIFIED: package.json]`). `db push` is Prisma's own recommended workflow for prototyping without a migration history `[CITED: prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema]`. Prisma migration files contain provider-specific raw SQL — a SQLite-generated migration file has near-zero reuse value once Phase 11 switches the datasource to Postgres, since the DDL syntax differs. **Recommendation:** keep using `prisma db push` through Phase 9 (consistent with existing convention, zero extra process), and start a formal `prisma migrate dev` history at Phase 11 once the Postgres target is fixed — that is the point where a real migration history starts paying for itself (CI, rollback, team review). After schema changes, re-run `npm run seed` (the seed script already truncates and reseeds in FK-safe order — `order -> productImage -> collection -> product`; add `productSizeStock` deletion to that same order, before `product`, since it's a child of `product`).

### Pattern 3: Server Action CRUD + multi-path revalidation

**What:** Every mutating admin action is a `"use server"` function co-located per resource (`app/admin/products/actions.ts` etc.), following the same shape already demonstrated by the project's manual runtime validation in `app/api/checkout/route.ts` (explicit type guards, never spread raw input into Prisma).
**When to use:** All product/collection/order mutations.

```typescript
// app/admin/products/actions.ts (excerpt — create)
"use server";
import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

type ProductInput = {
  name: string;
  slug: string;
  price: number; // cents
  category: string;
  description: string;
  materials?: string;
  care?: string;
  featured: boolean;
};

// Explicit field-by-field extraction — NEVER `Object.fromEntries(formData)`
// spread directly into `prisma.product.create({ data })`. Spreading raw
// FormData is a mass-assignment vector: a forged extra field could set
// columns the form never intended to expose [CITED: nextjs.org/docs/app/guides/data-security].
function parseProductInput(formData: FormData): ProductInput | null {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const priceRaw = Number(formData.get("price"));
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || !slug || !Number.isFinite(priceRaw) || priceRaw < 0 || !category || !description) {
    return null;
  }
  return {
    name,
    slug,
    price: Math.round(priceRaw),
    category,
    description,
    materials: String(formData.get("materials") ?? "") || undefined,
    care: String(formData.get("care") ?? "") || undefined,
    featured: formData.get("featured") === "on",
  };
}

export async function createProduct(formData: FormData) {
  await requireOwner();
  const input = parseProductInput(formData);
  if (!input) throw new Error("invalid_product_input");
  const product = await prisma.product.create({ data: input });
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  return product.id;
}
```

### Pattern 4: Stock-aware catalog filtering (extends Phase 8's `lib/catalog.ts`)

**What:** One additional `AND` clause in `buildProductWhere`, plus a relational replacement for the existing JSON quote-guard size filter.

```typescript
// lib/catalog.ts — additions to buildProductWhere (D-09)
// Replaces the fragile quote-guarded JSON `contains` hack now that `size`
// is a real relation, not a JSON string column.
const sizeClause: Prisma.ProductWhereInput = size
  ? { variants: { some: { size, stock: { gt: 0 } } } }
  : {};

// NEW — D-09: hide products where every size has 0 stock. `none: { stock: { gt: 0 } }`
// would also match a product with zero variant rows at all (e.g. mid-migration
// or a malformed product); `some: { stock: { gt: 0 } }` is the correct/safe
// direction — it only shows products that DEFINITELY have at least one size in stock.
const inStockClause: Prisma.ProductWhereInput = {
  variants: { some: { stock: { gt: 0 } } },
};

return {
  AND: [searchClause, categoryClause, sizeClause, minPriceClause, maxPriceClause, collectionClause, inStockClause],
};
```

`getCollections()`/`getCollectionBySlug()` in `lib/products.ts` return metadata only (no product list), so they need no change — the fully-sold-out filter lives entirely in `getCatalog`'s `where`, which is what `/collections/[slug]/page.tsx` already calls (per `08-CONTEXT.md`/existing PDP related-products usage). This means **no new query path is needed** — the single `buildProductWhere` change in `lib/catalog.ts` covers `/shop` AND every collection detail page simultaneously.

### Pattern 5: Order fulfillment — allow-list status transition (mirrors `buildOrderBy`)

**What:** Reuse the exact allow-list-before-use technique already proven in `lib/catalog.ts`'s `SORT_OPTIONS`/`buildOrderBy` (ASVS V5 — never pass an unvalidated string into a Prisma write any more than into an `orderBy`).

```typescript
// lib/orders.ts (new, small — pure function, unit-testable without a DB,
// same style as lib/catalog.ts)
export const ORDER_STATUSES = ["pending", "paid", "fulfilled", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_SET = new Set<string>(ORDER_STATUSES);
export function isValidOrderStatus(value: string): value is OrderStatus {
  return STATUS_SET.has(value);
}
```

```typescript
// app/admin/orders/actions.ts
"use server";
import { requireOwner } from "@/lib/admin";
import { isValidOrderStatus } from "@/lib/orders";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateOrderFulfillment(
  orderId: string,
  status: string,
  trackingNumber: string,
  notes: string,
) {
  await requireOwner();
  if (!isValidOrderStatus(status)) throw new Error("invalid_status");
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      trackingNumber: trackingNumber.trim() || null,
      notes: notes.trim() || null,
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
```

Note: the allow-list intentionally does **not** enforce strict forward-only transitions (e.g. blocking `fulfilled → pending`). D-12 describes a "fixed status flow" for the *UI's* dropdown ordering, but a single trusted owner correcting a mis-click is a normal operational need; over-constraining transitions server-side adds complexity the phase doesn't ask for. Flagged as an open question below in case the planner wants to lock this down further.

### Anti-Patterns to Avoid

- **Relying on `middleware.ts` alone for the owner check:** `withAuth`'s `authorized` callback runs on the Edge runtime and can only see JWT token claims (email is fine, no DB access needed here) — but it cannot produce the UI-SPEC's differentiated "404 for wrong-owner vs redirect for unauthenticated" behavior, and it does not protect Server Actions at all. Middleware is optional and, if used, should only handle the "no session" fast-path.
- **Spreading raw `FormData`/JSON body into `prisma.<model>.create/update({ data })`:** mass-assignment risk — always extract and validate each field explicitly (Pattern 3), matching the existing `isIncomingItem` type-guard convention in `app/api/checkout/route.ts`.
- **Calling `notFound()`/`redirect()` after any JSX has been returned:** must happen before the first `return` in the Server Component/layout, or streaming locks the response at HTTP 200 `[CITED: nextjs.org/docs/app/api-reference/file-conventions/not-found]`.
- **Re-introducing the JSON quote-guard hack for the new relational size filter:** once `size` is a `ProductSizeStock` relation, `variants: { some: { size } }` is an exact, safe match — no need for the `contains: '"M"'` workaround that existed only because `sizes` was a JSON string column.
- **Filtering sold-out products in JavaScript after `findMany`:** breaks `prisma.product.count({ where })` parity with the returned rows, corrupting pagination (`total`/`totalPages`) exactly the kind of bug `08-RESEARCH.md` already warned against for `getCatalog`. The `inStockClause` must be in the Prisma `where`, not a post-fetch `.filter()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session verification | Custom cookie/JWT parsing | `getServerSession(authOptions)` (already wired in `lib/auth.ts`) | NextAuth already validates and decodes the session; re-parsing it manually duplicates trust logic and risks a bypass |
| CSRF protection on mutations | Custom CSRF token generation/verification | Next.js Server Actions' built-in Origin/Host header check | Automatic for any `"use server"` action; a hand-rolled token system would be redundant and is a common source of subtle bugs (token leakage, double-submit mistakes) |
| Unique-slug enforcement | App-level "check then insert" race-prone logic | Prisma's `@unique` on `Product.slug` + catch `P2002` on create/update | DB-level uniqueness is race-safe; app-level check-then-insert is not, even at low admin traffic |
| Duplicate-size prevention | Manual array `.find()` checks before insert | `@@unique([productId, size])` on `ProductSizeStock` | Enforced at the DB layer regardless of which code path writes the row |
| Order status validation | Free-text status field | Fixed `ORDER_STATUSES` allow-list (mirrors `SORT_OPTIONS` in `lib/catalog.ts`) | Prevents typos/garbage values from ever reaching the DB or the storefront status-pill rendering |

**Key insight:** Nothing in this phase needs a new library — every "don't hand-roll" item above is solved by a feature the project's existing dependencies (Prisma, NextAuth, Next.js Server Actions) already provide out of the box. The only genuine hand-rolling in this phase (slug generation, form field extraction) is intentionally small and consistent with the project's existing style of explicit runtime validation rather than a schema library.

## Common Pitfalls

### Pitfall 1: Treating the admin `layout.tsx` guard as sufficient
**What goes wrong:** A developer adds `requireOwner()` to `app/admin/layout.tsx` and assumes every admin capability is now protected, then writes Server Actions in `actions.ts` files without repeating the check.
**Why it happens:** The mental model "the layout wraps every page under it" is correct for *rendering*, but Server Actions are compiled to independent POST endpoints reachable directly (e.g. `curl` with a stolen/replayed session cookie), completely outside the React tree the layout protects `[CITED: nextjs.org/docs/app/guides/data-security]`.
**How to avoid:** `requireOwner()` is the first statement in every exported Server Action and Route Handler under `/admin`, with no exceptions — not just in the layout.
**Warning signs:** Any `actions.ts` file where a mutation touches `prisma` before an `await requireOwner()` call appears above it.

### Pitfall 2: `notFound()`/`redirect()` called after JSX starts streaming
**What goes wrong:** Owner-gate check is placed after some initial rendering/logging in the layout or a page, so the HTTP status code is already locked at 200 by the time `notFound()` fires, and/or partial admin UI flashes before the redirect.
**Why it happens:** It's easy to reorder `await requireOwner()` below an unrelated `await` (e.g., a data fetch) without noticing the ordering matters.
**How to avoid:** `await requireOwner()` is always the very first line of the function body, before any other `await` or JSX.
**Warning signs:** Any admin page/layout where `requireOwner()` isn't the first statement.

### Pitfall 3: Filtering sold-out products in application code instead of the Prisma `where`
**What goes wrong:** `getCatalog` fetches all matching rows then `.filter(p => p.variants.some(v => v.stock > 0))`s in JS — this desyncs `prisma.product.count({ where })` (used for `totalPages`) from the actually-displayed rows, producing empty trailing pages or an incorrect total, exactly the class of bug the Phase 8 catalog module was built to avoid (see its own doc comment: "Always a single indexed findMany + a matching count with an identical where — never fetch-all-then-filter/paginate in JS").
**Why it happens:** Relational "any variant in stock" filtering feels more natural to write as a JS `.some()` than a Prisma `some` filter, especially for someone unfamiliar with Prisma's relation filter syntax.
**How to avoid:** Add `inStockClause` to the same `where` object passed to both `prisma.product.count` and `prisma.product.findMany` (Pattern 4).
**Warning signs:** Any `.filter()` call on the array returned by `getCatalog`/`getProducts` for stock reasons.

### Pitfall 4: Mass-assigning form input directly into Prisma `create`/`update`
**What goes wrong:** `prisma.product.update({ where: { id }, data: Object.fromEntries(formData) })` — a forged extra form field (e.g. `id`, `createdAt`, or a field not shown in the UI) silently writes to columns the form never intended to expose.
**Why it happens:** It's the shortest code to write, and works fine until someone crafts a malicious/unexpected `FormData` body directly against the action endpoint (see Pitfall 1 — actions are directly callable).
**How to avoid:** Always explicit field-by-field extraction into a typed object before the Prisma call (Pattern 3) — matches the existing `isIncomingItem` convention in `app/api/checkout/route.ts`.
**Warning signs:** Any `Object.fromEntries(formData)` or `...body` spread passed straight into a Prisma `data:` argument.

### Pitfall 5: Forgetting to revalidate every storefront path a mutation affects
**What goes wrong:** After editing a product, `/admin/products` refreshes but `/shop`, `/`, or the relevant `/collections/[slug]` still show stale cached data.
**Why it happens:** Next.js's route cache is per-path; `revalidatePath("/admin/products")` does not implicitly revalidate unrelated paths.
**How to avoid:** Every mutation lists every affected storefront path explicitly (`/shop`, `/`, and, when a collection's product membership changes, `/collections/[slug]`). Since collection slugs are dynamic and there may be many, consider `revalidatePath("/collections/[slug]", "page")` (the dynamic-segment revalidation form) or, if unsure, `revalidatePath("/", "layout")` for a broader (if coarser) refresh on product/collection writes.
**Warning signs:** UAT step "edit a product, check `/shop`" passes but "edit a product, check its collection page" doesn't.

### Pitfall 6: Assuming `prisma db push` and `prisma migrate dev` are interchangeable
**What goes wrong:** Running `prisma migrate dev` once against a database that was only ever managed with `db push` prompts a database reset (data loss) because there's no migration history to reconcile against `[CITED: prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema]`.
**Why it happens:** Both commands "apply the schema," but `migrate dev` additionally expects and maintains a `prisma/migrations` history; introducing it mid-project without a deliberate baseline step triggers Prisma's drift-detection reset prompt.
**How to avoid:** Stay on `prisma db push` for this phase (Pattern 2's recommendation) — don't run `prisma migrate dev` unless the planner explicitly decides to start the formal migration history now (in which case, budget a `prisma migrate dev --create-only` + review step, not a blind `migrate dev`).
**Warning signs:** A plan task that runs `prisma migrate dev` without first checking whether `prisma/migrations/` exists.

## Code Examples

### Deriving `Product.sizes`/`variants` from the new relation
```typescript
// lib/products.ts — updated deserialize + type (illustrative)
// Source: pattern derived from this repo's existing ProductImage handling
export type ProductVariant = { size: string; stock: number };

export type Product = {
  // ...existing fields...
  sizes: string[];      // derived: variants.map(v => v.size), position-ordered
  variants: ProductVariant[]; // NEW: full stock detail for PDP sold-out UI
};

function deserialize(row: {
  // ...existing fields...
  variants: { size: string; stock: number }[]; // already ordered by position via the query
}): Product {
  return {
    ...row,
    images: row.images.map((img) => img.url),
    sizes: row.variants.map((v) => v.size),
    variants: row.variants,
  };
}

// Every existing `include: { images: { orderBy: { position: "asc" } } }` call
// site (getProducts, getFeaturedProducts, getProductBySlug, getCatalog) gains
// a matching `variants: { orderBy: { position: "asc" } }` include.
```

### PDP sold-out size disabling (`AddToCart.tsx`)
```typescript
// components/AddToCart.tsx — excerpt, using product.variants instead of product.sizes
{product.variants.map((v) => (
  <button
    key={v.size}
    disabled={v.stock === 0}
    onClick={() => { setSize(v.size); setError(false); }}
    className={`min-w-12 border px-4 py-2.5 text-sm transition-colors ${
      v.stock === 0
        ? "cursor-not-allowed border-ink/10 text-ink/30 line-through"
        : size === v.size
          ? "border-ink bg-ink text-cream"
          : "border-ink/25 text-ink hover:border-ink"
    }`}
  >
    {v.size}{v.stock === 0 && <span className="sr-only"> (sold out)</span>}
  </button>
))}
```
No `ProductCard.tsx`/`/shop` badge change is needed for partial sold-out states — D-09 only requires hiding *fully* sold-out products (handled entirely in the catalog `where`) and disabling sold-out sizes on the PDP; a product with some sizes in stock still appears normally in listings.

## State of the Art

| Old Approach (Phases 1–8) | Current Approach (Phase 9) | When Changed | Impact |
|--------------------------|------------------------------|---------------|--------|
| `Product.sizes` — JSON-encoded `string[]` column, no stock concept | `ProductSizeStock` relation (`productId + size` unique, `stock`, `position`) | Phase 9 (this phase) | First relational break from the JSON-array convention; enables real per-size stock and a real Prisma `where` filter instead of string-`contains` hacks |
| `buildProductWhere` size filter: quote-guarded JSON `contains: '"M"'` | `variants: { some: { size, stock: { gt: 0 } } } }` relation filter | Phase 9 | Removes a fragile string-matching workaround; also folds stock-awareness into the same clause |
| `Order.status`: free-form string, only ever set to `"pending"`/`"paid"` by the app itself | Formal allow-list `pending \| paid \| fulfilled \| cancelled`, admin-settable via validated Server Action | Phase 9 | First customer-order field the admin can mutate; introduces the allow-list-validation pattern for writes (previously only used for reads, e.g. `buildOrderBy`) |
| No authorization concept anywhere in the app (all routes public or "any authenticated user") | Owner-email gate (`requireOwner()`) as the first authorization boundary | Phase 9 | Establishes the access-control pattern the rest of the project (and Phase 11) will follow if multi-staff admin is ever added |

**Deprecated/outdated:** None — this is additive to an actively-maintained schema, not a rewrite of deprecated tooling.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `position`-based ordering (mirroring `ProductImage`) is the right convention for `ProductSizeStock`, rather than relying on string/numeric sort of `size` itself | Architecture Patterns §2 | Low — if wrong, sizes could render out of intended order (e.g. "XL" before "S") on the PDP/admin editor; easy to fix later since it's purely a display concern, no data-model change needed |
| A2 | Email comparison for `isOwnerEmail()` should be case-insensitive and trimmed | Pattern 1 (Code Example) | Low-medium — if the real Google OAuth email arrives with different casing than the `.env` value at Phase 11 go-live, a case-sensitive compare would incorrectly lock out the real owner; case-insensitive compare is the safer default and costs nothing |
| A3 | Recommendation to stay on `prisma db push` through Phase 9 and defer `prisma migrate dev` to Phase 11 | Pattern 2, Pitfall 6 | Medium — this is a workflow/process choice, not a data-safety one; if the planner disagrees and wants a migration history sooner, no data model changes are affected, only how schema changes are applied |
| A4 | Order status transitions are NOT strictly enforced forward-only (owner can move backward, e.g. correct a mistake) | Pattern 5 | Low — if the team wants strict linear enforcement instead, it's a small addition to `isValidOrderStatus`/the Server Action, not a schema change |

**None of the above are compliance, security-boundary, or retention-policy claims** — they are implementation-detail recommendations within the "Claude's Discretion" scope CONTEXT.md explicitly grants. All flagged for planner awareness, not because they're likely wrong.

## Open Questions

1. **Should the `/shop` size filter (`?size=M`) match "product offers this size at all" or "product has this size currently in stock"?**
   - What we know: D-09 is explicit about *fully* sold-out products being hidden and PDP sizes being disabled at 0 stock. It does not explicitly address the `/shop` size-filter's behavior for a product with that one size at 0 but other sizes in stock.
   - What's unclear: Whether a customer filtering `?size=M` should see a product that offers M but M is currently sold out (they'd land on the PDP only to find M disabled) vs. not seeing it at all in that filtered view.
   - Recommendation: Match the `inStockClause` semantics for consistency — `variants: { some: { size, stock: { gt: 0 } } }` (Pattern 4, as written) — so a size filter only returns products where that specific size is purchasable right now. Low-cost to flip to "any variant with this size regardless of stock" later if the owner prefers otherwise.

2. **Hard-delete vs. guarded delete for products with existing orders.**
   - What we know: `Order.items` is a JSON snapshot with no foreign key to `Product` (verified by reading `prisma/schema.prisma` — `Order` has no `productId`/relation to `Product` at all). Deleting a `Product` therefore cannot corrupt or cascade into `Order` rows under any circumstance — they are fully decoupled today.
   - What's unclear: Whether the owner might still want a "soft delete"/archive for products they intend to bring back in a future season (a UX preference, not a data-integrity requirement).
   - Recommendation: Hard-delete satisfies D-07 completely and is verified safe `[VERIFIED: prisma/schema.prisma read]`. The UI-SPEC's destructive-confirm copy ("This removes it from the storefront. Past orders keep their record. This can't be undone.") already assumes hard-delete. Go with hard-delete; a "soft delete/archive" feature would be a scope addition beyond ADMN-02, not a Phase 9 requirement.

3. **Does the demo credentials provider need any change for the owner to sign in as `OWNER_EMAIL`?**
   - What we know: `lib/auth.ts`'s `demo` CredentialsProvider already accepts any typed email and upserts a `User` row for it — this already supports "the owner tests locally by signing in as `OWNER_EMAIL`" (D-02) with zero code changes.
   - What's unclear: Nothing functionally — flagged only so the planner doesn't accidentally add unnecessary auth-provider changes.
   - Recommendation: No changes to `lib/auth.ts` are needed for this phase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 `[VERIFIED: package.json]`, jsdom environment, React Testing Library available |
| Config file | `vitest.config.ts` (`include: ["tests/**/*.test.{ts,tsx}"]`) |
| Quick run command | `npx vitest run tests/<file>.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

The existing convention (`tests/catalog.test.ts`) tests pure functions with **no DB and no mocking** — `lib/catalog.ts` is deliberately kept Prisma-import-free (types only) so its query-piece builders are unit-testable in isolation. This phase should extend that same convention for its own pure logic.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMN-01 | `isOwnerEmail()` matches case/whitespace-insensitively; rejects null/undefined/wrong email | unit | `npx vitest run tests/admin.test.ts` | ❌ Wave 0 |
| ADMN-01 | Non-owner authenticated session → `requireOwner()` triggers `notFound()`; no session → `redirect()` | manual-only (requires request context — Server Component test harness not present in this repo) | UAT: sign in as non-owner, hit `/admin`, confirm 404; sign out, hit `/admin`, confirm redirect | — |
| ADMN-02 | `buildProductWhere` still returns correct clauses with the new `inStockClause`/relational `sizeClause` added | unit | `npx vitest run tests/catalog.test.ts` (extend existing file) | ✅ extend existing |
| ADMN-02 | `parseProductInput`-style field extraction rejects missing/invalid fields, never passes through unexpected keys | unit | `npx vitest run tests/admin.test.ts` | ❌ Wave 0 |
| ADMN-02 | Product create/edit/delete via UI reflects on `/shop` and `/product/[slug]` | smoke/manual | UAT walkthrough | — |
| ADMN-03 | `getCatalog`/`getCollections` exclude a product whose every `ProductSizeStock.stock` is 0 | integration (needs seeded SQLite `dev.db`) | `npx vitest run tests/catalog.test.ts` (extend, or a new `tests/catalog.stock.test.ts` if DB fixtures are introduced) | ❌ Wave 0 (decide: pure-function unit test of the `where` shape is achievable now; an actual DB-backed integration test needs a seed/fixture strategy this repo doesn't yet have — recommend the former, defer the latter) |
| ADMN-03 | PDP disables a 0-stock size and cannot add it to cart | manual/UAT | UAT walkthrough | — |
| ADMN-04 | `isValidOrderStatus` accepts only the 4 allow-listed values | unit | `npx vitest run tests/orders.test.ts` | ❌ Wave 0 |
| ADMN-04 | Admin can view all orders, update status/tracking/notes | manual/UAT | UAT walkthrough | — |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/<relevant file>.test.ts`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/admin.test.ts` — covers `isOwnerEmail()` and the product-input field-extraction/validation function (ADMN-01, ADMN-02)
- [ ] `tests/orders.test.ts` — covers `isValidOrderStatus()` (ADMN-04)
- [ ] Extend `tests/catalog.test.ts` — covers the new `inStockClause` and relational `sizeClause` shape in `buildProductWhere` (ADMN-03)
- [ ] No new test framework/config needed — Vitest is already fully set up and this phase's pure-function testing needs fit the existing `jsdom`/no-DB pattern exactly

This repo has no DB-fixture/integration-test harness for Prisma-backed assertions (e.g. actually seeding `dev.db` and querying through `getCatalog`) — the recommended approach is to keep the stock-awareness assertion at the `buildProductWhere` shape level (pure function, matches existing convention) and treat the true end-to-end "sold-out product is hidden from `/shop`" behavior as a manual UAT step, consistent with how Phase 8 validated `getCatalog` end-to-end behavior.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No change | Reuses existing NextAuth Google/demo-credentials setup unmodified — this phase adds authorization, not a new authentication mechanism |
| V3 Session Management | Yes | Reuses existing NextAuth JWT session (`session: { strategy: "jwt" }`); every admin entry point re-derives the session server-side per request via `getServerSession` — no client-cached trust |
| V4 Access Control | **Yes — core of this phase** | `requireOwner()` invoked independently at every admin Server Component, Server Action, and Route Handler (Pattern 1) — never rely on UI hiding or a single upstream check |
| V5 Input Validation | Yes | Explicit field-by-field extraction into typed objects (Pattern 3) instead of spreading raw `FormData`/JSON; allow-list validation for `Order.status` (mirrors existing `buildOrderBy` pattern) and for the `sort`/`size` query params already in `lib/catalog.ts` |
| V6 Cryptography | No change | No new secrets, tokens, or crypto primitives introduced this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Broken access control — non-owner reaches admin CRUD/order data | Elevation of Privilege | `requireOwner()` at every entry point (Pattern 1); never trust that "the link isn't shown" is sufficient (UI-SPEC explicitly calls this out: "non-owners never see chrome" is a UX nicety, not the security boundary) |
| Server Action invoked directly (bypassing the rendered admin UI) | Tampering / Elevation of Privilege | Per-action `await requireOwner()` as the first line (Pitfall 1); Next.js's built-in Origin/Host CSRF check still applies but does not substitute for authorization |
| Mass assignment via `FormData`/JSON spread into Prisma `data:` | Tampering | Explicit field extraction (Pattern 3, Pitfall 4) — never pass client-controlled objects directly to `prisma.<model>.create/update` |
| IDOR on `/admin/orders/[id]` — guessing another order's ID | Information Disclosure | Not scoped by "ownership" (there is only one owner, who can legitimately see all orders per D-11) — but the route MUST still confirm `requireOwner()` before returning ANY order, including ones reached by ID guessing, since an unauthenticated/non-owner visitor must never see order emails/totals |
| Unvalidated `Order.status` write | Tampering | Allow-list validation (`isValidOrderStatus`, Pattern 5) before any Prisma write — same technique already proven for `buildOrderBy`'s `sort` param |
| Stored content in `Product.description`/`name` rendered on storefront | Tampering (stored XSS) | React auto-escapes text content by default; confirm no `dangerouslySetInnerHTML` is introduced for rendering admin-entered description/name text on the storefront |

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma`, `lib/auth.ts`, `lib/catalog.ts`, `lib/products.ts`, `app/api/checkout/route.ts` (this repo) — read directly to establish existing conventions, verified absence of `Order`→`Product` FK, verified `db:push`-only workflow, verified no `prisma/migrations` directory
- `package.json` — verified installed versions (`next@14.2.35`, `next-auth@4.24.11`, `prisma@5.22.0`/`@prisma/client@5.22.0`)
- `npm view next version` / `npm view next-auth version` / `npm view prisma version` — verified current npm registry versions (16.2.10 / 4.24.14 / 7.8.0) to confirm the project is intentionally pinned below latest, not accidentally stale

### Secondary (MEDIUM confidence — official docs found via WebSearch)
- [Next.js — Guides: Data Security](https://nextjs.org/docs/app/guides/data-security) — Server Actions as public endpoints, explicit auth/authz requirement
- [Next.js — File-system conventions: not-found.js](https://nextjs.org/docs/app/api-reference/file-conventions/not-found) — `notFound()` timing/streaming behavior
- [NextAuth.js — Securing pages and API routes](https://next-auth.js.org/tutorials/securing-pages-and-api-routes) — `getServerSession` App Router usage
- [NextAuth.js — Next.js configuration (`withAuth`)](https://next-auth.js.org/configuration/nextjs) — middleware `withAuth`, JWT-strategy requirement
- [Prisma — Working with composite IDs and constraints](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints) — `@@unique([a, b])` on SQLite
- [Prisma — Prototyping your schema (`db push`)](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema) — `db push` vs `migrate dev` workflow guidance, reset-on-mixed-use warning

### Tertiary (LOW confidence — community sources, cross-checked against official docs above before use)
- Various Medium/dev.to articles on Next.js Server Actions security surfaced consistent findings with the official Next.js data-security doc (Origin/Host CSRF check, action-ID rotation) — used only to corroborate, not as a sole source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all versions verified against `package.json` and npm registry directly
- Architecture: HIGH — patterns derived from reading this repo's actual existing code (ProductImage shape, buildOrderBy allow-list convention, checkout route's type-guard style) plus official Next.js/Prisma/NextAuth docs
- Pitfalls: HIGH — the two most load-bearing pitfalls (Server Actions as public endpoints; db push vs migrate dev reset behavior) are both sourced from official documentation, not inference

**Research date:** 2026-07-20
**Valid until:** 2026-08-19 (30 days — stable, locked tech stack; re-verify only if `PROJECT.md`'s tech-stack lock changes)
