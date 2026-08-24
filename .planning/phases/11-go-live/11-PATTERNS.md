# Phase 11: Go Live - Pattern Map

**Mapped:** 2026-08-24
**Files analyzed:** 13
**Analogs found:** 11 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `app/api/stripe/webhook/route.ts` | route/controller | event-driven (webhook) | `app/api/checkout/route.ts` | role-match (untrusted-input idiom); RESEARCH Pattern 2 supplies the webhook-specific body |
| `lib/email.ts` | service | request-response (outbound API call) | `lib/stripe.ts` | exact (null-if-no-key idiom) |
| `emails/OrderConfirmation.tsx` | component (email template) | transform (data → HTML) | none in codebase | no analog — new domain (React Email) |
| `app/account/orders/[id]/page.tsx` | route/page (Server Component) | CRUD (read, scoped) | `app/admin/orders/[id]/page.tsx` | exact (structure), differs only in scoping (`userId` + `findFirst` vs `requireOwner()` + `findUnique`) |
| `app/account/page.tsx` (restructure) | route/page (Server Component + client island) | CRUD (read, scoped) | `app/admin/orders/page.tsx` + current `app/account/page.tsx` | role-match |
| `components/account/OrderList.tsx` | component | CRUD (render list) | `components/admin/OrderTable.tsx` | exact (table/row shape), extended for 4-state pills + responsive card fallback per UI-SPEC |
| `components/account/AccountSignedOut.tsx` | component (client island) | request-response (auth action) | current `app/account/page.tsx` (signed-out branch) | exact |
| `prisma/schema.prisma` (modified) | config | — | itself (datasource block) | exact — RESEARCH Code Examples has the literal block |
| `lib/db.ts` (modified) | config/singleton | — | itself | exact — RESEARCH confirms no code change needed, only `schema.prisma` datasource changes; leave file as-is |
| `lib/auth.ts` (modified) | config/service | request-response | itself (`hasGoogle` conditional, lines 7-9, 21-29) | exact — mirror the existing spread-conditional idiom |
| `app/api/checkout/route.ts` (modified) | route/controller | request-response | itself | exact — only two localized edits (origin fallback line ~108, add `sendOrderConfirmation` call in stub branch ~122-133) |
| `.env.example` (modified) | config | — | itself | exact — RESEARCH Code Examples has the literal additions block |
| `package.json` (modified) | config | — | n/a | no analog — build script change is a one-line edit |

## Pattern Assignments

### `app/api/stripe/webhook/route.ts` (route, event-driven)

**Analog:** `app/api/checkout/route.ts` (house idiom for untrusted input) + RESEARCH.md Pattern 2 (webhook-specific raw-body verification, already a complete drafted implementation)

**Imports pattern** (checkout route, lines 1-6):
```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
```
Webhook route swaps `getServerSession`/`authOptions` for `headers` from `next/headers`, `Stripe` type import, and adds `sendOrderConfirmation` from the new `lib/email.ts`. Full drafted import block is in RESEARCH.md Pattern 2 lines 274-279.

**Critical divergence from the checkout analog (RESEARCH Pitfall 1):** checkout route does `body = await req.json()` (line 33). The webhook route MUST do `body = await req.text()` instead — never call `.json()` first, or Stripe signature verification fails irrecoverably. Use the drafted handler verbatim from RESEARCH.md lines 286-341 (already cites `stripe.webhooks.constructEvent`, `runtime = "nodejs"`, idempotency via `order.status !== "paid"` check, and always-2xx-once-verified behavior).

**"Never trust the client" pattern to carry over** (checkout route lines 8-21, `isIncomingItem` type guard + validation): the webhook's equivalent trust boundary is the Stripe signature itself (`constructEvent` throws on tamper) — no separate payload validation needed beyond checking `session.metadata?.orderId` exists (RESEARCH lines 312-316), matching checkout's pattern of returning early with a logged reason rather than throwing.

**Error handling pattern:** checkout route returns `NextResponse.json({ error: "..." }, { status: 400 })` on bad input (lines 34, 41, 47, 52, 91). Webhook route mirrors this for `missing_signature` (400) and `invalid_signature` (400), but returns `200 { received: true }` for all *recognized-but-inapplicable* cases (no orderId, order not found, already paid) — per Stripe's "always ack quickly with 2xx" guidance cited in RESEARCH.

---

### `lib/email.ts` (service, request-response)

**Analog:** `lib/stripe.ts` (exact match — the "null client if no key" idiom)

**Full analog file** (`lib/stripe.ts`, 8 lines):
```typescript
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;

/** Stripe client, or null when no key is configured (stub checkout is used). */
export const stripe = key ? new Stripe(key) : null;

export const stripeEnabled = Boolean(key);
```

**Apply identically in `lib/email.ts`:**
```typescript
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
```
Then guard `sendOrderConfirmation()`'s body with `if (!resend) { console.warn(...); return; }` — same shape as any `if (!stripe)` check elsewhere in the codebase (e.g. `app/api/checkout/route.ts` line 116).

**Domain-module purity note (per prompt's discretion item):** `lib/orders.ts` and `lib/catalog.ts` are explicitly Prisma-import-free (see `lib/orders.ts` header comment, lines 1-2: "Prisma-import-free... so it stays unit-testable without a DB — mirrors lib/catalog.ts"). `lib/email.ts` CANNOT fully follow that split — it needs `prisma.order.findUnique` to hydrate the order before sending (RESEARCH Pattern 3, lines 368-369). Recommend the planner split this into two pieces to preserve testability where possible: (a) a pure formatting/mapping step (order + items → email props) that stays Prisma-free and unit-testable, mirroring `parseOrderItems`'s pure-function style, and (b) the `sendOrderConfirmation(orderId)` wrapper itself, which is necessarily impure (DB read + network call) — same shape as `app/api/checkout/route.ts`'s route handlers, which are also impure by necessity.

**Reused pure helper:** `parseOrderItems` from `lib/orders.ts` (lines 39-53) — call directly inside `sendOrderConfirmation`, exactly as RESEARCH Pattern 3 shows.

---

### `app/account/orders/[id]/page.tsx` (page, CRUD read)

**Analog:** `app/admin/orders/[id]/page.tsx` (full file read — 73 lines)

**Structure to copy verbatim, with one scoping change:**
```typescript
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { parseOrderItems } from "@/lib/orders";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);           // NEW vs admin analog
  if (!session?.user) redirect("/signin?callbackUrl=/account");  // NEW vs admin analog

  const userId = (session.user as { id?: string }).id;
  const order = await prisma.order.findFirst({                  // findFirst, NOT findUnique
    where: { id: params.id, userId },                            // scoped by BOTH id AND userId
  });
  if (!order) notFound();
  // ...rest identical to app/admin/orders/[id]/page.tsx: parseOrderItems, date formatting,
  // items list with formatPrice, total row.
}
```

**Authorization pattern source:** `lib/admin.ts` `requireOwner()` (lines 22-38) establishes the house idiom — redirect anonymous users, `notFound()` (not a distinct error) when authenticated-but-not-authorized, so existence is never revealed. Order detail must follow the same *shape* but is NOT `requireOwner()` itself (that's owner-only) — it is `getServerSession` + `userId`-scoped `findFirst`, per RESEARCH's explicit "Don't Hand-Roll" table entry and UI-SPEC Contract #4 ("Query must be scoped by both `id` AND `userId` in a single `findFirst`... so a non-owner and a non-existent id are indistinguishable at the data layer").

**Item rendering block to copy verbatim** (`app/admin/orders/[id]/page.tsx` lines 33-53): the `<ul>` of items with `formatPrice(item.unitPrice * item.qty)` and the total row (lines 54-59). Drop the `FulfillmentForm` column (owner-only feature, not customer-facing) — UI-SPEC's `max-w-3xl` single-column receipt layout confirms this.

**Not-found styling:** UI-SPEC Contract #4 mandates plain `notFound()` → the existing branded `app/not-found.tsx`, no bespoke "not yours" messaging — do not diverge from the admin analog's `notFound()` call by adding custom copy.

---

### `app/account/page.tsx` (restructure, CRUD read)

**Analog (list-query shape):** `app/admin/orders/page.tsx` (full file, 25 lines)
**Analog (signed-out/signed-in branching + greeting to keep):** current `app/account/page.tsx` (full file, 45 lines)

**Query + row-mapping pattern to copy** (`app/admin/orders/page.tsx` lines 1-23), scoped by `userId` instead of unscoped:
```typescript
const orders = await prisma.order.findMany({
  where: { userId },                    // NEW vs admin analog (admin sees all)
  orderBy: { createdAt: "desc" },
});

const rows = orders.map((o) => ({
  id: o.id,
  total: o.total,
  status: o.status,
  itemCount: parseOrderItems(o.items).reduce((sum, i) => sum + i.qty, 0),
  createdAt: o.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
}));
```
RESEARCH Pattern 4 (lines 398-427) has the full drafted restructure combining this with `getServerSession` and the existing "Hello, {name}" greeting — use it directly.

**Client/server split:** current `app/account/page.tsx` is entirely `"use client"` using `useSession`/`signIn`/`signOut` from `next-auth/react` (lines 1-4). The restructure moves data-fetching server-side via `getServerSession(authOptions)` (the same server-side call `lib/admin.ts` and `app/api/checkout/route.ts` already use) and extracts only the signed-out branch (button-driven `signIn()`) into a small `"use client"` island — `components/account/AccountSignedOut.tsx` — copying the current file's signed-out JSX (lines 15-23) verbatim into that new component. The signed-in branch's `signOut()` button (lines 34-40) can likely stay inline as a small client island too, or be folded into the same component — planner's call per RESEARCH's Assumption A1 (low risk either way).

**Greeting block to keep unchanged:** lines 26-32 of current `app/account/page.tsx` (`eyebrow`, `h1` "Hello, {name}", email line) — UI-SPEC's empty-state contract explicitly says "below the existing 'Hello, {name}' greeting block — do not replace the greeting."

---

### `components/account/OrderList.tsx` (component, CRUD render)

**Analog:** `components/admin/OrderTable.tsx` (full file, 78 lines)

**Table shape to copy** (lines 36-79): `<table>` with `thead`/`tbody`, `border-b border-cream-dark`, header row `text-xs uppercase tracking-[0.15em] text-ink-soft`, order-id link cell with `aria-label={`View order ${o.id.slice(-8)}`}` and `#{o.id.slice(-8)}` visible text (lines 55-63) — UI-SPEC Contract 3 requires this exact truncation/format, already matches verbatim.

**Empty state to copy** (lines 23-33), adapted per UI-SPEC Contract 1 wording ("No orders yet" / "When you place an order, it'll show up here." / "Browse the collection" CTA) — the admin version's copy differs slightly and should NOT be reused verbatim; only the visual shape (`bg-cream-dark px-6 py-16 text-center` card) carries over.

**Status pill — DO NOT copy verbatim.** UI-SPEC explicitly flags this (see UI-SPEC lines 73-77, 112-123): `OrderTable.tsx`'s `pillClass()` (lines 15-19) uses raw `text-sepia` on `bg-sepia/15`, which is only AA-safe because that table's rows sit on plain `cream`. The new customer-facing list must extend to 4 states (`pending`/`paid`/`fulfilled`/`cancelled`) using `sepia-deep` (not raw `sepia`) for the `paid` state specifically because it can appear on a `cream-dark` mobile-card background. Use UI-SPEC's table in section "Status presentation" (lines 116-123) as the literal source of truth, not the admin `pillClass` function.

**Responsive card fallback (new — no existing analog):** UI-SPEC Contract 5 (lines 133-141) mandates `hidden sm:block` table / `sm:hidden` card-list split with no horizontal scroll. No existing component in the codebase does this responsive table→card transform; build fresh following the UI-SPEC's literal markup guidance.

**Column difference:** admin table has a `Customer` (email) column (line 44, `o.email`) — the customer-facing `OrderList` must drop this column (a customer doesn't need to see their own email repeated) per UI-SPEC's column set: `Order | Date | Items | Total | Status`.

---

### `prisma/schema.prisma` (config)

**Analog:** itself — this is a datasource-block edit, no other file in the codebase has a second `datasource` block to compare against.

**Exact replacement block** (RESEARCH.md Code Examples, lines 520-526):
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — hostname contains "-pooler"
  directUrl = env("DIRECT_URL")     // direct — used only by `prisma migrate`
}
```
Current block (read directly, lines 5-8):
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```
`Order.status` field (schema.prisma lines 84-96) is unchanged — D-08a keeps it a `String` with the existing allow-list comment; do not touch this field.

---

### `lib/auth.ts` (modified, config)

**Analog:** itself — the existing `hasGoogle` conditional is the pattern to mirror for the new gate.

**Existing pattern** (`lib/auth.ts` lines 7-9, 21-29):
```typescript
const hasGoogle = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
// ...
providers: [
  ...(hasGoogle
    ? [GoogleProvider({ clientId: ..., clientSecret: ... })]
    : []),
  CredentialsProvider({ id: "demo", ... }),   // currently UNCONDITIONAL — this is the gap
```

**Change required (D-03):** wrap the `CredentialsProvider({ id: "demo", ... })` block (currently unconditional, starting at line 29) in the same spread-conditional idiom, using **strict string equality** per RESEARCH Pitfall 5 (`=== "true"`, not `Boolean(...)`, to avoid the `"false"`-string-is-truthy footgun):
```typescript
const allowDemoLogin = process.env.ALLOW_DEMO_LOGIN === "true";
// ...
providers: [
  ...(hasGoogle ? [GoogleProvider({ ... })] : []),
  ...(allowDemoLogin ? [CredentialsProvider({ id: "demo", ... })] : []),
],
```

---

### `app/api/checkout/route.ts` (modified)

**Two localized edits to the existing file** (already read in full, 155 lines):

1. **Origin fallback (line ~108):** `const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3002";` — RESEARCH Pitfall 4 flags the port mismatch (3002 vs. actual dev default 3000) as a stale value. Per D-09, remove the hardcoded fallback or correct it to `3000`, but require `NEXTAUTH_URL` in every deployed environment.

2. **Stub-mode branch (lines ~115-127):** add `sendOrderConfirmation(order.id)` call after `prisma.order.create(...)`, per D-06/RESEARCH Pattern 3:
```typescript
if (!stripe) {
  const order = await prisma.order.create({ /* unchanged, status: "paid" */ });
  await sendOrderConfirmation(order.id); // NEW
  return NextResponse.json({ url: `${origin}/order/success?order=${order.id}&demo=1` });
}
```
Add `import { sendOrderConfirmation } from "@/lib/email";` to the top import block (alongside the existing `stripe`/`prisma`/`authOptions` imports at lines 1-5).

---

### `.env.example` (modified)

**Analog:** itself — append RESEARCH's literal block (lines 530-547) to the existing file's variable set. Read current `.env.example` before editing to preserve existing key ordering/grouping conventions and avoid duplicate keys (`OWNER_EMAIL` may already be referenced by `lib/admin.ts` but per RESEARCH is NOT yet in `.env.example` — confirm and add).

---

## Shared Patterns

### Env-conditional capability ("real service if key present, fallback otherwise")
**Source:** `lib/auth.ts` `hasGoogle` (lines 7-9), `lib/stripe.ts` `stripeEnabled` (line 8)
**Apply to:** `ALLOW_DEMO_LOGIN` gate in `lib/auth.ts`, the `resend`-or-null construction in `lib/email.ts`. Both new files must use this exact spread-conditional / null-coalescing idiom rather than inventing a new capability-check style.

### Never trust the client / server-side recompute
**Source:** `app/api/checkout/route.ts` — recomputes prices from DB (lines 55-84), validates sizes against the product's real size list (lines 66-71), clamps quantity (line 72), never derives redirect origin from `Origin` header (lines 105-109 comment).
**Apply to:** `app/api/stripe/webhook/route.ts` — the trust boundary shifts from "validate every field" to "verify the Stripe signature, then trust the verified payload," but the *principle* (never trust unverified input) is identical. Do not skip signature verification for convenience.

### Server-side authorization repeated per entry point, never-reveal-existence
**Source:** `lib/admin.ts` `requireOwner()` (lines 22-38) — redirect if anonymous, `notFound()` if authenticated-but-unauthorized.
**Apply to:** `app/account/orders/[id]/page.tsx` (redirect if anonymous, `notFound()` via `findFirst` returning null if not-owner-of-order — collapses "doesn't exist" and "not yours" into one code path, exactly matching `requireOwner()`'s never-reveal-existence philosophy).

### Prisma-import-free pure domain modules
**Source:** `lib/orders.ts` header comment (lines 1-2), `lib/catalog.ts` (referenced, not read — confirmed by comment).
**Apply to:** `lib/email.ts` — split pure formatting from the DB-touching send wrapper where feasible (see `lib/email.ts` pattern assignment above for the concrete split recommendation).

### Defensive JSON parsing, never throw
**Source:** `lib/orders.ts` `parseOrderItems()` (lines 39-53) — try/catch, returns `[]` on failure rather than throwing.
**Apply to:** reused directly (not re-implemented) by `app/account/orders/[id]/page.tsx`, `app/account/page.tsx`, `components/account/OrderList.tsx`, and `lib/email.ts`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `emails/OrderConfirmation.tsx` | component (email template) | transform | No React Email / email-template code exists anywhere in the codebase today — this is a new domain. Use RESEARCH.md's Standard Stack + UI-SPEC's "Email template constraints" section (table-based layout, inline styles, hex colors, `sepia-deep` not `sepia`, plain-text alternative, `Preview` preheader) as the authoritative spec instead of a codebase analog. |
| `components/account/OrderList.tsx` (responsive card-fallback half only) | component | CRUD render | The table half has a strong analog (`OrderTable.tsx`); the `<640px` card-list transform has no precedent in the codebase (no other table anywhere does a table→card responsive swap) — build fresh per UI-SPEC Contract 5's literal markup. |

## Metadata

**Analog search scope:** `app/api/`, `app/account/`, `app/admin/orders/`, `components/admin/`, `lib/`, `prisma/schema.prisma`
**Files scanned:** `lib/auth.ts`, `lib/stripe.ts`, `lib/admin.ts`, `lib/db.ts`, `lib/orders.ts`, `app/api/checkout/route.ts`, `app/admin/orders/page.tsx`, `app/admin/orders/[id]/page.tsx`, `components/admin/OrderTable.tsx`, `app/account/page.tsx` (current), `prisma/schema.prisma`
**Pattern extraction date:** 2026-08-24
