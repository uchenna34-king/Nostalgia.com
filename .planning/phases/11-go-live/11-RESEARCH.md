# Phase 11: Go Live - Research

**Researched:** 2026-08-24
**Domain:** Production cutover — hosting (Vercel), managed Postgres (Neon), Stripe webhook fulfillment, transactional email (Resend + React Email), NextAuth env-gated demo provider, customer order history
**Confidence:** MEDIUM-HIGH (core patterns CITED against official docs and cross-checked via WebSearch + `npm view`; two exact-version claims flagged for owner-visible checkpoints per the Package Legitimacy Gate)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hosting & Database**
- D-01: Host is Vercel (native Next.js 14 App Router support; `@vercel/analytics` + `@vercel/speed-insights` already dependencies). Consequence: serverless runtime, `lib/db.ts` must be adapted for pooled connections.
- D-02: Database is Neon Postgres. Runtime uses the **pooled** connection string; Prisma migrations use the **direct** connection string via `directUrl` in `schema.prisma`. Both env-driven.
- D-08: Cutover is a fresh Postgres baseline + reseed. The three existing SQLite-flavoured migrations (`0_init`, `20260726172011_add_reviews`, `20260727122723_add_review_hidden`) cannot replay against Postgres — replaced by one clean Postgres init migration. All local data is seed/test data; nothing carried across.
- D-08a: `Order.status` stays a `String` with the existing app-level allow-list (`ORDER_STATUSES`/`isValidOrderStatus` in `lib/orders.ts`). A Postgres enum was considered and rejected.

**Authentication**
- D-03: The `demo` credentials provider is kept, gated behind a new `ALLOW_DEMO_LOGIN` environment variable. `true` on the UAT deployment; `false` at go-live removes the provider with no code edit. Rationale: it currently sits outside the `hasGoogle` guard, so on any public URL it lets anyone sign in as **any** email, including `OWNER_EMAIL` (which grants `/admin`).
- D-10: The Google Cloud OAuth project is created now, in "Testing" mode, not deferred. Testing mode works immediately with UAT testers added by email (limit 100), no review required.

**Payments**
- D-04: A new `/api/stripe/webhook` route handler is the single source of truth for payment status — verifies the Stripe signature and transitions the order from `pending` to `paid`. Closes a verified gap: `app/api/checkout/route.ts` creates the order `pending` and nothing anywhere marks it paid (grep for `webhook|constructEvent` returns zero hits).
- D-04a: Webhook-only was chosen over verifying the Stripe session on the success page, because the webhook is the only path that survives a customer closing the tab immediately after paying.

**Email**
- D-05: Email service is Resend, using React Email templates so the receipt carries the locked Nostalgia palette and Fraunces type.
- D-06: A single shared `sendOrderConfirmation(orderId)` is called from **both** the Stripe webhook (real payments) **and** the demo/stub checkout branch.
- D-06a: With no verified sending domain, Resend can only deliver to the owner's own Resend account address. Testers will exercise the send path but not receive mail until a domain is verified. Accepted and must be stated plainly in verification notes.

**Order History**
- D-07: `/account` gains an order list (reference, date, total, status) and a new `/account/orders/[id]` detail route showing line items with images, tracking number, and status. `Order` already carries `items` (JSON) and `trackingNumber`. `app/account/page.tsx` is currently `"use client"` with no data fetching; delivering this requires restructuring it.

**Domain & URLs**
- D-09: Ship on the free `*.vercel.app` URL. Every URL and sender address must be environment-driven with no hardcoding — including `NEXTAUTH_URL`, the Stripe `success_url`/`cancel_url` origin (currently falls back to a hardcoded `http://localhost:3002` in `app/api/checkout/route.ts:108`), the Google OAuth redirect URI, and the Resend `from` address.

**Launch Gating**
- D-11: Phase completion = deployed and UAT-ready on Stripe TEST keys. Real Neon Postgres, real Google sign-in, real emails, working order history, demo login on for testers — no real money moves. Live-key cutover is explicitly out of this phase.
- D-12: Placeholder copy is flagged, not written. The phase produces a pre-launch checklist enumerating every placeholder that must be replaced and where — including `/shipping`/`/returns` copy and the "We'll send a confirmation shortly" promise on the order success page.

### Scope Fence (explicitly NOT in this phase)
- Flipping Stripe to live keys or enabling real charges.
- Publishing the Google OAuth consent screen from "Testing" to "Production".
- Writing real shipping/returns policy text.
- Purchasing or attaching a custom domain.
- Real product photography or real catalog data.

### Claude's Discretion
- Exact Prisma connection-pooling approach for Vercel serverless (driver adapter vs. pooled connection string) — **resolved below**: pooled connection string + `directUrl`, not the driver adapter.
- Which Stripe webhook events to subscribe to beyond checkout completion.
- React Email template structure and file layout.
- Whether the order success page shows a "confirming payment…" state while awaiting the webhook (D-04 selected webhook-only; success page stays presentational by default).
- Naming and location of the pre-launch checklist artifact.
- Structure of the account order list/detail components, subject to the locked aesthetic.

### Deferred Ideas (OUT OF SCOPE)
- Live Stripe keys / real charges.
- Custom domain purchase and DNS verification.
- Publishing the Google OAuth consent screen to Production.
- Real shipping and returns policy copy.
- Real product photography and real catalog data.
- Admin "resend confirmation email" action.
- Re-measuring Lighthouse performance on real hosting (carried forward from Phase 10, not a Phase 11 requirement).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIVE-01 | Customer can sign in with real Google OAuth in production | Google OAuth client already conditionally wired in `lib/auth.ts` (`hasGoogle`); Owner Setup Guide covers account creation and redirect URI registration. No code research gap — see Architecture Patterns Pattern 1 for the `ALLOW_DEMO_LOGIN` gate that must ship alongside it. |
| LIVE-02 | Customer can pay with real Stripe (test cards graduating to live keys) | Stripe checkout session creation already exists (`app/api/checkout/route.ts`); this phase adds the missing webhook confirmation leg — see Pattern 2 (raw-body signature verification) and the idempotency guard. |
| LIVE-03 | Customer receives an order confirmation email after purchase | Resend + React Email package selection, install command, and shared `sendOrderConfirmation()` pattern — see Standard Stack and Pattern 3. |
| LIVE-04 | Signed-in customer can view order history on the account page | Admin order list/detail (Phase 9) is the closest analog; Server Component data-fetching pattern documented and adapted for per-user scoping (IDOR-safe) — see Pattern 4 and Security Domain. |
| LIVE-05 | Production runs on hosted Postgres, migrated from SQLite | Migration squash-and-replace procedure (D-08) confirmed against Prisma's own documented SQLite→Postgres provider-change workflow — see Runtime State Inventory and Common Pitfalls. |
| LIVE-06 | App is deployed to a hosted Node platform and is publicly reachable | Vercel build/env-var setup, `prisma generate` postinstall (already present), `prisma migrate deploy` build-command guidance — see Architecture Patterns and Environment Availability. |
</phase_requirements>

## Summary

This phase wires four already-scaffolded seams to real external services rather than building new product surface: the Prisma datasource (SQLite → Neon Postgres), the payment confirmation gap (no webhook exists today — verified by a zero-hit grep for `webhook|constructEvent`), transactional email (no `resend`/`react-email` dependency exists today), and customer-facing order history (an admin-only view exists to mirror). Every other piece — Google OAuth provider wiring, Stripe checkout session creation, the `Order` model, the demo credentials provider — already exists in the codebase and needs environment/gating changes, not new architecture.

The single resolved "Claude's Discretion" item is Prisma connection pooling for Vercel: **use a plain pooled connection string (`DATABASE_URL` with `-pooler` in the hostname) plus `directUrl` in `schema.prisma`, not the `@prisma/adapter-neon` driver adapter.** The driver adapter requires enabling the `driverAdapters` **preview feature** in Prisma 5.22 (the version this project is pinned to), and the current `@prisma/adapter-neon` package on npm (`7.9.1`) targets Prisma's newer major-version line, not 5.x — using it would mean pairing a preview feature with a version-mismatched adapter package for zero functional gain on a low-traffic storefront. The pooled-connection-string approach is the long-standing, stable, zero-new-dependency path and is what the Owner Setup Guide already describes to the owner (pooled vs. direct Neon connection strings).

For email, `resend` (current: `6.22.0`) and the unified `react-email` package (current: `6.9.2`) are the correct install — **not** `@react-email/components`, which is deprecated on the npm registry (`npm view @react-email/components deprecated` returns "Package no longer supported"). For the webhook, the critical implementation detail is that Next.js App Router route handlers must read the **raw** body via `req.text()` before any JSON parsing — calling `req.json()` first makes Stripe signature verification irrecoverably fail because the reconstructed JSON string won't byte-for-byte match what Stripe signed.

**Primary recommendation:** Use pooled connection string (not driver adapter) for Prisma+Neon+Vercel; verify Stripe webhooks via raw-body `constructEvent`; guard idempotency via the `Order.status` transition itself (no separate event-ledger table needed for this app's single-event-type flow); install `resend` + `react-email` (not `@react-email/components`); restructure `app/account/page.tsx` into a Server Component that queries orders scoped by `session.user.id`, mirroring the existing admin order-list pattern but with per-user IDOR-safe scoping.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Google OAuth sign-in | API/Backend (NextAuth route handler) | Browser (OAuth redirect round-trip) | `app/api/auth/[...nextauth]/route.ts` already exists; the OAuth handshake is a browser redirect but session issuance/verification is server-side. |
| Demo login gate (`ALLOW_DEMO_LOGIN`) | API/Backend | — | Pure server-side provider-array construction in `lib/auth.ts`; no client involvement. |
| Stripe checkout session creation | API/Backend | — | Already implemented in `app/api/checkout/route.ts`; recomputes prices server-side, never trusts client totals. |
| Payment confirmation (webhook) | API/Backend | — | New `/api/stripe/webhook` route; Stripe calls this server-to-server, no browser involvement. |
| Order confirmation email | API/Backend | — | `sendOrderConfirmation()` runs server-side only, called from both the webhook and the stub checkout branch. |
| Customer order history | Frontend Server (SSR) | Database/Storage | `/account` and `/account/orders/[id]` become Server Components querying Prisma directly, mirroring the existing admin pattern — no new API layer needed. |
| Database persistence | Database/Storage | — | Neon Postgres, pooled connection at runtime, direct connection for migrations. |
| Hosted deployment | CDN/Static + API/Backend | — | Vercel serves static assets via its edge network and runs route handlers/Server Components as Node.js serverless functions. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | `^17.4.0` (already a dependency; current registry latest is `22.5.0` — no upgrade required or in scope this phase) | Node SDK — `stripe.webhooks.constructEvent`, checkout sessions | Already installed and already used for checkout session creation; only the webhook verification call is new. |
| `next-auth` | `^4.24.11` (already a dependency) | Session/auth, provider array | Already installed; only the `ALLOW_DEMO_LOGIN` conditional is new. |
| `resend` | `^6.22.0` [VERIFIED: npm registry, checked 2026-08-24] | Transactional email API client | Official SDK for the locked email provider (D-05); simple `fetch`-based client, first-class React Email integration via the `react` property on `emails.send()`. |
| `react-email` | `^6.9.2` [VERIFIED: npm registry, checked 2026-08-24] | React component library + renderer for HTML email, unified package (replaces the deprecated `@react-email/components`) | As of React Email v6, all components ship from the single `react-email` package. `@react-email/components` is marked deprecated on the registry ("Package no longer supported") — do not install it. |
| `@prisma/client` / `prisma` | `^5.22.0` (already pinned — do not bump this phase) | ORM client + CLI | Already the project's ORM; only `schema.prisma`'s `datasource` block and the migrations folder change. |

### Supporting

None required beyond the above. No new HTTP client, no new validation library — `app/api/checkout/route.ts`'s existing hand-rolled request validation pattern (type guards, allow-lists) is the established idiom and should be reused for the webhook route rather than introducing `zod` for a single-shape payload already validated by Stripe's signature check.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pooled connection string + `directUrl` | `@prisma/adapter-neon` driver adapter | Requires `previewFeatures = ["driverAdapters"]` in Prisma 5.22 (not GA) [CITED: prisma.io/docs, GitHub discussion #21346]; the current adapter package on npm is versioned `7.9.1`, targeting Prisma's newer major line — pairing it with a pinned `5.22.0` client is an unsupported/unverified combination. Revisit if the project ever upgrades to Prisma 6/7, where the adapter is more mature. |
| `resend` + `react-email` | `@react-email/components` | Deprecated on the npm registry [VERIFIED: `npm view @react-email/components deprecated`]. Functionally superseded by the unified `react-email` package since v6. |
| Order-status-transition idempotency guard | A separate `ProcessedWebhookEvent` ledger table keyed by Stripe event ID | Stripe's own docs recommend an event-ID ledger for general dedup across many event types [CITED: docs.stripe.com/webhooks]. This app only listens for one event type against one state transition (`pending` → `paid`), so checking `order.status !== "paid"` before writing is sufficient and needs no new table. Revisit if more event types are added later. |

**Installation:**
```bash
npm install resend react-email
```

**Version verification (2026-08-24, via `npm view <pkg> version`):**
- `resend` → `6.22.0` (last published 2026-08-21)
- `react-email` → `6.9.2` (last published 2026-08-07)
- `@react-email/components` → `1.0.12`, `deprecated: "Package no longer supported. Contact Support at https://www.npmjs.com/support for more info."` — **do not install**
- `stripe` (already installed at `^17.4.0`) → registry latest `22.5.0` (no action needed; upgrading Stripe SDK major versions is out of scope for this phase)
- `@prisma/adapter-neon` → `7.9.1` (confirms the major-version mismatch noted above; not recommended for this phase)

## Package Legitimacy Audit

| Package | Registry | Age (latest publish) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----------------------|-----------|--------------|---------|-------------|
| `resend` | npm | latest version published 2026-08-21 (3 days before this research) | ~9.99M/week | `github.com/resend/resend-node` | SUS (`too-new`) | **Approved with checkpoint.** The `too-new` signal fires purely on recency of the latest patch release, not on the package's overall age — `resend` is an actively maintained, high-download, officially-repo'd package matching the locked D-05 decision. Planner must still add a `checkpoint:human-verify` task before `npm install`, per protocol. |
| `react-email` | npm | latest version published 2026-08-07 | ~3.73M/week | `github.com/resend/react-email` | SUS (`too-new`) | **Approved with checkpoint.** Same reasoning as above — official Resend-org repo, high download volume, same `too-new` false-positive pattern. Planner must add a `checkpoint:human-verify` task before `npm install`. |
| `@react-email/components` | npm | — | — | — | N/A (excluded from recommendation) | **REMOVED.** Registry-flagged deprecated; not installed under any recommendation in this document. |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `resend`, `react-email` — both flagged solely on latest-publish recency (`too-new`), not on downloads, repo absence, or postinstall scripts (both have `postinstall: null`, confirmed via `npm view <pkg> scripts.postinstall`). The planner must add a `checkpoint:human-verify` task before either package is installed, per the Package Legitimacy Gate protocol, even though the underlying evidence (9.99M and 3.73M weekly downloads, official `resend`-org GitHub repos) strongly supports legitimacy.

*Package names were discovered via WebSearch and cross-checked against `resend.com/docs/send-with-nextjs` (official documentation) and the npm registry directly — tagged `[CITED]`/`[VERIFIED: npm registry]` accordingly below, not `[ASSUMED]`.*

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────┐
                         │   Customer Browser       │
                         └───────────┬───────────────┘
                                     │
                 ┌───────────────────┼───────────────────────┐
                 │                   │                        │
         Google OAuth          POST /api/checkout      GET /account
         redirect round-trip   (existing route)         (Server Component)
                 │                   │                        │
                 ▼                   ▼                        ▼
     app/api/auth/[...nextauth]  recomputes prices    prisma.order.findMany
     (existing, unchanged        from DB, creates      scoped by session
     except provider array)      Order(status=pending)  .user.id (NEW)
                 │                   │                        │
                 │          ┌────────┴────────┐               │
                 │          │                 │               │
                 │     Stripe key set?   No Stripe key
                 │          │                 │               │
                 │          ▼                 ▼               │
                 │   Stripe Checkout    Order(status=paid)     │
                 │   Session (redirect)  directly (stub mode)  │
                 │          │                 │               │
                 │   customer pays on         │               │
                 │   Stripe-hosted page       │               │
                 │          │                 │               │
                 │          ▼                 │               │
                 │   Stripe sends             │               │
                 │   checkout.session         │               │
                 │   .completed webhook       │               │
                 │          │                 │               │
                 │          ▼                 │               │
                 │   POST /api/stripe/webhook │               │
                 │   (NEW) — verifies         │               │
                 │   signature via raw body,  │               │
                 │   looks up Order by        │               │
                 │   metadata.orderId,        │               │
                 │   no-ops if already paid,  │               │
                 │   else Order.status=paid   │               │
                 │          │                 │               │
                 │          └────────┬────────┘               │
                 │                   ▼                        │
                 │        sendOrderConfirmation(orderId) (NEW) │
                 │        called from BOTH branches above      │
                 │                   │                         │
                 │                   ▼                         │
                 │        Resend API → customer email          │
                 │                   │                         │
                 └───────────────────┴─────────────────────────┘
                                     │
                            /order/success page
                            (presentational, unchanged
                             per D-04's webhook-only choice)
```

### Recommended Project Structure

```
app/
├── api/
│   ├── auth/[...nextauth]/route.ts     # existing, unchanged except lib/auth.ts provider array
│   ├── checkout/route.ts               # existing; hardcoded localhost:3002 fallback removed (D-09)
│   └── stripe/
│       └── webhook/route.ts            # NEW — signature verification + idempotent status transition
├── account/
│   ├── page.tsx                        # RESTRUCTURED: Server Component, queries orders by session.user.id
│   └── orders/
│       └── [id]/page.tsx               # NEW — order detail, mirrors app/admin/orders/[id]/page.tsx but IDOR-scoped
components/
├── account/
│   ├── AccountSignedOut.tsx            # NEW (optional) — small client island for signIn()/signOut() buttons
│   ├── OrderList.tsx                   # NEW — mirrors components/admin/OrderTable.tsx shape
│   └── OrderDetail.tsx                 # NEW — mirrors app/admin/orders/[id]/page.tsx's item-rendering block
emails/
└── OrderConfirmation.tsx               # NEW — React Email template, Nostalgia palette + Fraunces
lib/
├── auth.ts                             # CHANGED — ALLOW_DEMO_LOGIN gate added to demo provider
├── db.ts                               # unchanged code; behavior changes via schema.prisma datasource only
├── email.ts                            # NEW — sendOrderConfirmation(orderId), null-if-no-key idiom
└── stripe.ts                           # unchanged (stripeEnabled flag already exists)
prisma/
├── schema.prisma                       # CHANGED — provider "postgresql", url + directUrl
└── migrations/                         # REPLACED — single fresh init migration (D-08)
```

### Pattern 1: Env-conditional demo provider (mirrors the existing `hasGoogle` idiom)

**What:** Gate the `demo` CredentialsProvider behind `ALLOW_DEMO_LOGIN`, using the exact same spread-conditional idiom already used for the Google provider in `lib/auth.ts`.
**When to use:** Any environment-driven capability toggle in this codebase — this is the established project idiom (also used for `stripeEnabled` in `lib/stripe.ts`).
**Example:**
```typescript
// lib/auth.ts — minimal diff from the existing hasGoogle pattern
const hasGoogle = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
const allowDemoLogin = process.env.ALLOW_DEMO_LOGIN === "true";

providers: [
  ...(hasGoogle ? [GoogleProvider({ /* unchanged */ })] : []),
  ...(allowDemoLogin
    ? [
        CredentialsProvider({
          id: "demo",
          name: "Google (demo)",
          // ...unchanged authorize() body
        }),
      ]
    : []),
],
```
Source pattern: existing `lib/auth.ts` line 22-29 (`hasGoogle` spread-conditional), applied identically to the demo provider per D-03.

### Pattern 2: Stripe webhook signature verification (Next.js 14 App Router)

**What:** Verify the raw request body against the `stripe-signature` header before trusting any event payload.
**When to use:** The new `/api/stripe/webhook` route handler — the single source of truth for marking orders paid (D-04).
**Critical detail:** Next.js App Router route handlers do not auto-parse the body the way `pages/api` did. You must read the **raw** body via `req.text()`. Calling `req.json()` first consumes the stream and reformats it — `JSON.stringify(JSON.parse(raw)) !== raw` in general, so the signature check fails irrecoverably once JSON parsing has happened first. [CITED: multiple sources cross-checked against docs.stripe.com/webhooks' "Stripe requires the raw body of the request... any manipulation... causes the verification to fail."]
```typescript
// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/email";

// Prisma with a plain pg connection string requires the Node.js runtime,
// not Edge — this is the App Router default, but state it explicitly since
// webhook routes are sometimes mistakenly set to edge for "fast cold starts".
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!stripe) {
    // No Stripe key configured (stub/demo mode) — nothing to verify.
    return NextResponse.json({ received: true });
  }

  const body = await req.text(); // raw body — NEVER req.json() before this
  const signature = headers().get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("stripe webhook: signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      console.error("stripe webhook: checkout.session.completed with no orderId metadata", { eventId: event.id });
      return NextResponse.json({ received: true });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      console.error("stripe webhook: order not found for metadata.orderId", { orderId, eventId: event.id });
      return NextResponse.json({ received: true });
    }

    // Idempotency guard: Stripe may deliver the same event more than once
    // (retries, or a second Event object for the same operation). Checking
    // the order's current status is sufficient here because this app has a
    // single one-way transition (pending -> paid) driven by a single event
    // type — a duplicate delivery becomes a safe no-op instead of a second
    // email send. A separate event-ID ledger table is unnecessary at this
    // scale; revisit if more event types are added later.
    if (order.status !== "paid") {
      await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });
      await sendOrderConfirmation(orderId);
    }
  }

  // Always acknowledge quickly with 2xx once signature is verified, per
  // Stripe's own guidance — do not let downstream errors turn into a Stripe
  // retry storm for events already durably recorded.
  return NextResponse.json({ received: true });
}
```
Source: pattern cross-checked against `docs.stripe.com/webhooks` ("Handle duplicate events", "Quickly return a 2xx response", raw-body requirement) [CITED: docs.stripe.com/webhooks] and WebSearch-verified Next.js App Router raw-body examples [CITED, cross-checked].

**Register the webhook in `app/api/checkout/route.ts`'s existing session creation** — no change needed there beyond ensuring `metadata: { orderId: order.id }` (already present at line 155) stays intact; the webhook depends on it.

### Pattern 3: Shared `sendOrderConfirmation()` (D-06)

**What:** One function, called from both the webhook (real payments) and the stub/demo checkout branch, so UAT testers exercise the real send path.
**When to use:** Any place an order transitions to `paid`.
```typescript
// lib/email.ts
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { parseOrderItems } from "@/lib/orders";
import OrderConfirmationEmail from "@/emails/OrderConfirmation";

// Same null-if-no-key idiom as lib/stripe.ts's `stripeEnabled`.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  if (!resend) {
    console.warn("sendOrderConfirmation: RESEND_API_KEY not set — skipping send", { orderId });
    return;
  }
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const items = parseOrderItems(order.items);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: order.email,
    subject: "Your Nostalgia order is confirmed",
    react: OrderConfirmationEmail({ order, items }),
  });
  if (error) {
    console.error("sendOrderConfirmation: Resend API error", { orderId, error });
  }
}
```
```typescript
// app/api/checkout/route.ts — stub-mode branch (D-06), one new call added
if (!stripe) {
  const order = await prisma.order.create({ /* unchanged, status: "paid" */ });
  await sendOrderConfirmation(order.id); // NEW
  return NextResponse.json({ url: `${origin}/order/success?order=${order.id}&demo=1` });
}
```
Source: `resend.emails.send({ react: ... })` API shape [CITED: resend.com/docs/send-with-nextjs]; null-if-no-key idiom is the project's own established pattern (`lib/stripe.ts`).

### Pattern 4: Customer order history — Server Component, IDOR-scoped (D-07)

**What:** Restructure `app/account/page.tsx` from a `"use client"` component with no data fetching into an async Server Component that queries `prisma.order` directly, mirroring `app/admin/orders/page.tsx`'s pattern — but scoped to the signed-in user, not "all orders."
**When to use:** `/account` and the new `/account/orders/[id]`.
```typescript
// app/account/page.tsx — restructured
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseOrderItems } from "@/lib/orders";
import AccountSignedOut from "@/components/account/AccountSignedOut"; // client island

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return <AccountSignedOut />;

  const userId = (session.user as { id?: string }).id;
  const orders = userId
    ? await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const rows = orders.map((o) => ({
    id: o.id,
    total: o.total,
    status: o.status,
    itemCount: parseOrderItems(o.items).reduce((sum, i) => sum + i.qty, 0),
    createdAt: o.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
  }));

  return (/* header + <OrderList orders={rows} /> + sign-out control */);
}
```
```typescript
// app/account/orders/[id]/page.tsx — mirrors app/admin/orders/[id]/page.tsx,
// but scoped by BOTH id AND userId — a customer must never see another
// customer's order by guessing the id (IDOR — see Security Domain).
const order = await prisma.order.findFirst({
  where: { id: params.id, userId: session.user.id },
});
if (!order) notFound();
```
Source: adapted directly from `app/admin/orders/page.tsx` (Server Component, `prisma.order.findMany`, row-mapping shape) and `app/admin/orders/[id]/page.tsx` (item rendering via `parseOrderItems` + `formatPrice`), both already in the codebase. The scoping change (`userId` filter, `findFirst` not `findUnique`) is the only structural difference from the admin analog, and is the security-relevant one — [ASSUMED: this composition pattern (async Server Component + small client island for interactive bits) is standard Next.js App Router practice; not sourced from a specific external doc this session, low risk].

### Anti-Patterns to Avoid
- **Trusting `req.json()` in the webhook route:** irreversibly breaks Stripe signature verification. Always `req.text()` first.
- **Matching order history by `session.user.email` instead of `session.user.id`:** email is the demo provider's user-supplied credential (`credentials.email` in `lib/auth.ts`'s `authorize()`); scoping by email alone would let the demo provider's arbitrary-email login view a real Google-authenticated customer's history if the emails ever collide. Scope by `userId`.
- **Using `DIRECT_URL`/unpooled connection as the runtime `DATABASE_URL`:** works fine locally, exhausts Neon's connection ceiling under concurrent Vercel serverless invocations in production.
- **Installing `@prisma/adapter-neon` without checking Prisma's major version:** silently mismatches this project's pinned `5.22.0` client against a `7.9.1` adapter — avoided entirely by not using the adapter this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Webhook signature verification | Manual HMAC-SHA256 timestamp/signature parsing | `stripe.webhooks.constructEvent(body, signature, secret)` | Stripe documents a manual fallback but strongly recommends the official library; manual implementations are a common source of timing-attack and replay-window bugs [CITED: docs.stripe.com/webhooks "Verify manually" section is explicitly the fallback, not the recommendation]. |
| HTML email templating | Hand-built HTML strings / inline styles for the receipt | React Email components (`emails/OrderConfirmation.tsx`) rendered via Resend's `react` property | Email HTML has notoriously inconsistent client rendering (Outlook, Gmail clipping, etc.); React Email's component library already solves table-based layout fallbacks. |
| Webhook event de-duplication (general case) | A custom generic event-processing framework | The order's own `status` field as the idempotency check (this app's specific case) | This app has exactly one meaningful transition driven by exactly one event type — a status check is simpler and correct; don't over-engineer a ledger table for a single-transition flow. |
| Order status validation | New Postgres CHECK constraint or enum | Existing `isValidOrderStatus()` / `ORDER_STATUSES` in `lib/orders.ts` (D-08a) | Already built, already tested (`tests/orders.test.ts`), and the schema comment explicitly documents this as an intentional portability choice — don't reintroduce a DB-level constraint this phase. |
| Owner-only authorization on new routes | A new auth check pattern for `/account/orders/[id]` | `getServerSession(authOptions)` + `userId` scoping (not `requireOwner()`, which is owner-only) | `requireOwner()` is deliberately owner-scoped (`lib/admin.ts`); customer order history needs session-scoping, a different but equally simple check — don't conflate the two gates. |

**Key insight:** Every "Don't Hand-Roll" item above already has an established idiom somewhere in this codebase (`stripeEnabled`, `hasGoogle`, `isValidOrderStatus`, `requireOwner`). The consistent theme across this phase is: extend existing idioms to new environment variables and new routes, don't invent new patterns.

## Runtime State Inventory

> Included because this phase performs a database-provider migration (SQLite → Postgres, D-08) and a squash-and-replace of the migrations folder.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Local dev SQLite (`prisma/dev.db`, gitignored per `.gitignore` line 30) contains seed/test `Product`, `Order`, `User`, `Review`, NextAuth `Account`/`Session` rows. Confirmed via D-08: "All local data is seed/test data regenerable via `prisma/seed.ts`; nothing is carried across." | **Data migration: none.** After the Neon cutover, run `npm run seed` (existing `prisma/seed.ts` script) against the new Postgres database. No SQLite→Postgres data transfer is needed or planned. |
| Live service config | None found. No external service (Vercel, Neon, Stripe, Resend, Google Cloud) currently has any configuration referencing the SQLite file path, table names, or the app's current dev URL — this is a first-time setup for all five services (per `11-OWNER-SETUP.md`), not a migration of existing live config. | None. |
| OS-registered state | None found. No `package.json` script, `pm2` config, `launchd`/`systemd` unit, or Windows Task Scheduler reference exists in this repo — it is a plain `next dev`/`next build`/`next start` project with no background-process registration. | None. |
| Secrets/env vars | `DATABASE_URL` changes **value semantics** (was `file:./dev.db`, becomes a Postgres connection string) but the **key name is unchanged** — no code reads `DATABASE_URL` by string-matching its old value. `DIRECT_URL` is a **brand-new** env var with zero prior code references (confirmed via `git show HEAD:.env.example`, which lists only `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`/`SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` today). `ALLOW_DEMO_LOGIN`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL` are all brand-new keys this phase introduces. | **Code edit only** for `DATABASE_URL` (schema.prisma datasource block reads the same key, new value shape). **New key, no migration** for `DIRECT_URL` and the five new variables — all must be added to `.env.example` (currently committed with empty placeholders per project convention) as part of this phase. |
| Build artifacts | `prisma/migrations/0_init/`, `prisma/migrations/20260726172011_add_reviews/`, `prisma/migrations/20260727122723_add_review_hidden/`, and `prisma/migrations/migration_lock.toml` (currently `provider = "sqlite"`, confirmed by direct read) all contain SQLite-dialect SQL and metadata. | **Delete and regenerate, not edit.** Per Prisma's own documented workflow [CITED: prisma.io — "there must not be a ./prisma/migrations folder" before running `prisma migrate dev` against a new provider], remove the entire `prisma/migrations/` folder, change `schema.prisma`'s `provider` to `"postgresql"`, then run `prisma migrate dev --name init` against the new Neon database to generate one fresh Postgres-dialect migration. `migration_lock.toml` regenerates automatically with `provider = "postgresql"`. |

**Canonical question answered:** After every file in the repo is updated, the only runtime systems with prior state are (a) the gitignored local SQLite file, which is dev-only and intentionally not migrated, and (b) the `prisma/migrations/` folder's SQL dialect, which must be deleted and regenerated rather than edited. No live external service, OS registration, or unchanged-key secret carries hidden risk into this cutover.

## Common Pitfalls

### Pitfall 1: Consuming the webhook body as JSON before signature verification
**What goes wrong:** `stripe.webhooks.constructEvent()` throws `SignatureVerificationError` even though the request genuinely came from Stripe.
**Why it happens:** Next.js App Router route handlers give you a `Request` object with a body stream; calling `.json()` parses and discards the exact byte sequence Stripe signed. Stripe's HMAC is computed over the literal raw bytes — any re-serialization (even semantically identical JSON) produces a different string and fails the signature check.
**How to avoid:** Always call `await req.text()` first and pass that raw string to `constructEvent`. Never call `.json()` on the same request object beforehand.
**Warning signs:** Signature verification fails in production but the Stripe CLI's local `stripe listen --forward-to` testing worked — a strong sign JSON parsing was inserted somewhere in the request lifecycle (e.g. a global body-parsing middleware).

### Pitfall 2: Runtime `DATABASE_URL` pointed at the direct (unpooled) connection
**What goes wrong:** Works fine in local dev and even in low-concurrency manual testing; under real concurrent traffic (or even a burst of automated UAT clicks), Postgres starts refusing connections with "too many clients already" or Neon's compute-side connection-limit errors.
**Why it happens:** Vercel serverless functions are short-lived; many can cold-start concurrently, and each holds its own Postgres connection if not pooled. Neon's pooler (PgBouncer, transaction mode) exists specifically to absorb this. [CITED: neon.com/docs, cross-checked with `11-OWNER-SETUP.md`'s own explanation to the owner.]
**How to avoid:** `DATABASE_URL` (used by Prisma Client at runtime, the `url` in `schema.prisma`) must be the **pooled** connection string (hostname contains `-pooler`). `DIRECT_URL` (used only via `directUrl`, only touched by `prisma migrate deploy`) must be the unpooled one.
**Warning signs:** Intermittent 500s that correlate with traffic spikes rather than a specific code path.

### Pitfall 3: Driver-adapter/Prisma-version mismatch
**What goes wrong:** Build-time or runtime errors referencing an unknown preview feature, or a Prisma Client/adapter API mismatch.
**Why it happens:** `@prisma/adapter-neon` on the registry is currently versioned `7.9.1`, tracking Prisma's newer major-version line, while this project is pinned to `prisma`/`@prisma/client` `^5.22.0`. Using the adapter in 5.22 additionally requires `previewFeatures = ["driverAdapters"]` in `schema.prisma`, since it is not GA at that version. [VERIFIED: npm registry version check; CITED: GitHub discussion #21346, prisma.io blog "Support for Serverless Database Drivers... Is Now in Preview".]
**How to avoid:** Don't install `@prisma/adapter-neon` this phase. Use the plain pooled-connection-string approach (Standard Stack, Pattern resolved above).
**Warning signs:** Any build log mentioning "preview feature" or a Prisma Client constructor signature that doesn't match the version installed.

### Pitfall 4: The existing hardcoded `localhost:3002` fallback (`app/api/checkout/route.ts:108`)
**What goes wrong:** In production, if `NEXTAUTH_URL` is ever unset (e.g. a misconfigured Vercel environment, or a preview deployment without the env var), Stripe checkout silently redirects paying customers to `http://localhost:3002` — a broken, non-existent-in-production URL — instead of failing loudly.
**Why it happens:** The current code is `process.env.NEXTAUTH_URL ?? "http://localhost:3002"`. Note this fallback port (3002) doesn't even match the project's own documented local dev default — `.env.example`'s `NEXTAUTH_URL` default and Next.js's own default dev port are both `3000`; 3002 appears to be a stale value from an earlier local config, not a deliberately chosen port.
**How to avoid:** Per D-09, this must become fully env-driven with no hardcoded origin. Recommend either (a) removing the fallback entirely and throwing/logging loudly if `NEXTAUTH_URL` is unset at request time, or (b) at minimum correcting the fallback to match the project's actual documented default (`http://localhost:3000`) for local-dev-only safety, while still requiring `NEXTAUTH_URL` in every deployed environment (Vercel preview + production, per the Owner Setup Guide's env var table).
**Warning signs:** Order success/cancel redirects landing on `localhost` in a deployed environment; this would only be caught by an actual end-to-end UAT click-through, not by unit tests — an argument for including it explicitly in the pre-launch checklist (D-12).

### Pitfall 5: Leaving `ALLOW_DEMO_LOGIN` unset (undefined) vs. explicitly `"false"`
**What goes wrong:** If the gate is implemented as `Boolean(process.env.ALLOW_DEMO_LOGIN)` instead of `process.env.ALLOW_DEMO_LOGIN === "true"`, then setting the Vercel env var to the literal string `"false"` still evaluates truthy (any non-empty string is truthy in JS), silently leaving the open demo-login door open in production.
**Why it happens:** Classic JS truthiness footgun with string-valued env vars.
**How to avoid:** Use strict string equality: `process.env.ALLOW_DEMO_LOGIN === "true"`. This also makes "unset" and `"false"` behave identically (both gate closed), which is the safe default.
**Warning signs:** None visible until someone actually tests demo login against the production deployment — another argument for including "confirm demo login is unreachable" as an explicit pre-launch checklist item (D-12), not just an env var to remember.

### Pitfall 6: Running `prisma migrate dev` (interactive) as the Vercel build command
**What goes wrong:** `migrate dev` prompts for input in ambiguous-migration scenarios and is not designed for non-interactive CI; using it as a build command hangs or fails unpredictably.
**Why it happens:** `migrate dev` is a local-development command; `migrate deploy` is the non-interactive, CI/production-safe equivalent that only applies already-generated migration files. [CITED: multiple sources cross-checked; consistent with Prisma's own documented separation of the two commands.]
**How to avoid:** Vercel build command should be `prisma migrate deploy && next build` (or run `migrate deploy` as a separate pre-build step) — never `migrate dev` in any deployed context. Generate the actual migration file locally (or via a one-off script) with `migrate dev`, commit it, then let `migrate deploy` apply it at build time.
**Warning signs:** Vercel build logs showing a hang with no output progress, or a prompt-like message in the build log tail before timeout.

### Pitfall 7: Treating "tester didn't receive the email" as a bug during UAT
**What goes wrong:** Wastes debugging time chasing a phantom email-delivery bug.
**Why it happens:** D-06a is a known, accepted, and already-documented limitation: with no verified sending domain (deferred per D-09/scope fence), Resend can only deliver to the owner's own Resend account address. The send path itself works and is exercised; delivery to arbitrary tester inboxes does not, until a custom domain is verified (deferred).
**How to avoid:** State this plainly in the phase's verification/UAT notes (already required by D-06a) so it is not "discovered" mid-UAT.
**Warning signs:** N/A — this is a known-and-accepted constraint, not something to detect; the risk is re-litigating it as a surprise.

## Code Examples

Verified patterns from official sources (also see inline examples throughout Architecture Patterns above):

### `schema.prisma` datasource block (Prisma 5.22 + Neon pooled/direct)
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — hostname contains "-pooler"
  directUrl = env("DIRECT_URL")     // direct — used only by `prisma migrate`
}
```
Source: [CITED: prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer, neon.com/docs/guides/prisma — `directUrl` has been available since Prisma 4.10.0 and is the standard mechanism for this exact scenario at the 5.x line this project is pinned to].

### `.env.example` additions for this phase
```bash
# Database (Neon — see 11-OWNER-SETUP.md Step 1)
DATABASE_URL=""        # pooled connection string (hostname has "-pooler")
DIRECT_URL=""          # direct connection string, used for migrations only

# Demo login gate (D-03)
ALLOW_DEMO_LOGIN=""    # "true" for UAT, "false" (or unset) at real go-live

# Stripe webhook (D-04)
STRIPE_WEBHOOK_SECRET="" # from `stripe listen` locally, or the Stripe Dashboard webhook endpoint in production

# Resend (D-05)
RESEND_API_KEY=""
EMAIL_FROM=""           # e.g. "Nostalgia <onboarding@resend.dev>" until a domain is verified

# Owner identity (D-10, already referenced by lib/admin.ts but not yet in .env.example)
OWNER_EMAIL=""
```
Source: cross-referenced against `11-OWNER-SETUP.md`'s "Complete variable reference" table and `git show HEAD:.env.example` (current committed contents).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `@react-email/components` as the import source for email components | Unified `react-email` package (single import) | React Email v6 | Install `react-email`, not `@react-email/components` — the latter is registry-deprecated. |
| `pgbouncer=true` query param required on every Neon pooled connection string for Prisma migrations to work through the pooler | Neon's PgBouncer now supports prepared statements and `DISCARD ALL`/`DEALLOCATE ALL`, making the parameter less strictly necessary | Neon platform update (undated in sources found) | Including `pgbouncer=true` is still harmless/commonly shown in examples; not including it is not fatal, but this project doesn't run migrations through the pooled URL anyway (uses `directUrl`), so the param's necessity/absence should not affect this project either way. |
| Driver-adapter-first guidance in newer Prisma docs (v6/v7 pages recommend `@prisma/adapter-neon` and even a `prisma.config.ts`-based setup) | This project is pinned to Prisma `5.22.0`, where driver adapters are a preview feature | N/A — version-dependent, not time-dependent | Don't follow Prisma's *latest*-version docs verbatim; the classic `url`/`directUrl` schema-based setup is what applies at 5.22. |

**Deprecated/outdated:**
- `@react-email/components`: superseded by the unified `react-email` package; flagged deprecated on the npm registry itself.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | The Server-Component-plus-small-client-island composition for `app/account/page.tsx` (async page fetches data; a separate `"use client"` component handles `signIn()`/`signOut()` button interactivity) is the correct minimal-diff restructuring approach. | Architecture Patterns, Pattern 4 | Low risk — this is standard, widely-documented Next.js App Router composition, not a niche or version-specific API. If wrong, worst case is a slightly different file split during planning, not a functional defect. |
| A2 | `pgbouncer=true` is not required in this project's `DATABASE_URL` because migrations run through `directUrl`, not the pooled string. | State of the Art | Low risk — if Neon's pooler behavior differs from documented, the symptom (a failed runtime query, not a failed migration) would surface immediately in manual/UAT testing before go-live. |
| A3 | Vercel's build command should be `prisma migrate deploy && next build` (rather than relying solely on the `postinstall: prisma generate` hook, which only regenerates the client, not the database schema). | Common Pitfalls, Pitfall 6 | Medium risk — if the planner instead leaves migration application as a manual owner step (e.g. running `prisma migrate deploy` locally against the direct URL before each deploy), that is also valid and arguably safer for a single-owner project; this should be confirmed as a planning decision, not silently assumed. |

## Open Questions

1. **Should `prisma migrate deploy` run automatically as part of the Vercel build, or manually by the owner before each deploy?**
   - What we know: Both are valid patterns; automatic (`prisma migrate deploy && next build` as the Vercel build command) is more common for teams, but this is a single-owner project where the owner already performs a two-pass manual deployment sequence (per `11-OWNER-SETUP.md`).
   - What's unclear: Whether adding an automatic migration-apply step to the build command is worth the added build-time dependency on `DIRECT_URL` being correctly set in Vercel's environment before the very first deploy (the Owner Setup Guide already notes "the first deploy may fail if `NEXTAUTH_URL` is missing" as an accepted, expected hiccup — an extra migration-apply step could add a similar first-deploy failure mode around `DIRECT_URL`).
   - Recommendation: Planner should pick one explicitly and document it in the plan; either is defensible, but it must not be left implicit.

2. **Should the webhook route additionally subscribe to `checkout.session.expired` or `payment_intent.payment_failed` to handle abandoned/failed checkouts?**
   - What we know: D-04/D-04a locked `checkout.session.completed` as the event that marks orders paid; CONTEXT.md leaves "which Stripe webhook events to subscribe to beyond checkout completion" as Claude's Discretion.
   - What's unclear: Whether leaving abandoned `pending` orders un-cleaned is acceptable for this phase (they simply remain `pending` forever, visible in admin as never fulfilled) or whether a cleanup path is expected.
   - Recommendation: Given D-11's "no last-minute surprises" framing is about the payment-confirmation path specifically (not abandoned-cart hygiene), and abandoned pending orders are already visible and correctable via the existing admin fulfillment UI (`updateOrderFulfillment`), recommend deferring additional event subscriptions — keep the webhook to `checkout.session.completed` only for this phase, consistent with minimal-diff.

## Environment Availability

| Dependency | Required By | Available (this dev machine) | Version | Fallback |
|------------|--------------|-------------------------------|---------|----------|
| Node.js | Build/runtime | ✓ | v24.14.1 | — (well above Next.js 14's minimum; Vercel's own Node runtime version is a separate, Vercel-project-level setting, not this machine's) |
| npm | Package install | ✓ | 11.11.0 | — |
| Stripe CLI | Local webhook testing (`stripe listen --forward-to`) | ✗ not installed | — | Not required for this research; `11-OWNER-SETUP.md` already instructs the owner to install it themselves for local testing. No fallback needed since production webhook testing happens via Stripe's dashboard-registered endpoint, not the CLI. |
| Git remote | Deploying via Vercel's GitHub import | ✗ none configured (`git remote -v` returns empty) | — | Expected — `11-OWNER-SETUP.md` Step 6 already documents this as the owner's first action ("There's currently no git remote on this project"). Not a phase blocker; it's an owner setup step, not a code task. |
| Vercel, Neon, Stripe, Resend, Google Cloud accounts | Hosting, DB, payments, email, auth | ✗ not verifiable from this environment (external managed services, owner-provisioned) | — | Owner performs all account creation per `11-OWNER-SETUP.md`; the code this phase produces must work correctly once the owner supplies real values, but the values themselves cannot be verified from the research/planning environment. |

**Missing dependencies with no fallback:** none — every missing item above has a documented, already-accepted resolution path (owner action, or simply not required for code-writing).

**Missing dependencies with fallback:** Stripe CLI (owner installs locally per Owner Setup Guide); git remote (owner creates per Owner Setup Guide Step 6).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.10` |
| Config file | `vitest.config.ts` (jsdom environment, globals on, `include: ["tests/**/*.test.{ts,tsx}"]`) |
| Quick run command | `npx vitest run tests/<file>.test.ts` |
| Full suite command | `npm test` (→ `vitest run`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|--------------|
| LIVE-01 | Google OAuth sign-in works in production | manual-only (OAuth redirect requires a live Google project; no meaningful local unit test) | — (UAT click-through per Owner Setup Guide) | N/A |
| LIVE-01 | `ALLOW_DEMO_LOGIN` gate correctly includes/excludes the demo provider | unit | `npx vitest run tests/auth.test.ts` | ❌ Wave 0 |
| LIVE-02 | Webhook rejects an invalid/missing signature with 400 | unit | `npx vitest run tests/stripe-webhook.test.ts` | ❌ Wave 0 |
| LIVE-02 | Webhook is idempotent — a second `checkout.session.completed` for an already-`paid` order does not re-send email or error | unit | `npx vitest run tests/stripe-webhook.test.ts` | ❌ Wave 0 |
| LIVE-02 | End-to-end real Stripe test-card payment marks the order paid | manual/UAT | — (Stripe test card `4242 4242 4242 4242` per Owner Setup Guide) | N/A |
| LIVE-03 | `sendOrderConfirmation` is a safe no-op when `RESEND_API_KEY` is unset | unit | `npx vitest run tests/email.test.ts` | ❌ Wave 0 |
| LIVE-03 | `sendOrderConfirmation` calls Resend with the expected `to`/`from`/`react` shape when configured | unit | `npx vitest run tests/email.test.ts` | ❌ Wave 0 |
| LIVE-04 | Order history query scopes correctly by `userId` (not by email) | unit | `npx vitest run tests/orders.test.ts` (extend existing file) | ✅ (extend) |
| LIVE-04 | `/account/orders/[id]` returns 404 for another user's order id (IDOR) | manual/UAT (or integration test if a test-DB harness is added) | — | N/A this phase (see Wave 0 gap) |
| LIVE-05 | `prisma migrate deploy` applies cleanly against a fresh Neon database with zero errors | smoke (manual/CI, not vitest) | `npx prisma migrate deploy` (run against a scratch Neon branch or the real target before first production traffic) | N/A — no local Postgres available on this research machine to pre-verify (see Environment Availability) |
| LIVE-06 | Deployed app responds 200 on its public Vercel URL | manual-only | — (owner verifies post-deploy) | N/A |

### Sampling Rate
- **Per task commit:** relevant `npx vitest run tests/<file>.test.ts` for the file(s) touched.
- **Per wave merge:** `npm test` (full suite).
- **Phase gate:** Full suite green before `/gsd-verify-work`; the manual/UAT items above (LIVE-01 OAuth, LIVE-02 real payment, LIVE-05 migration apply, LIVE-06 public reachability) are gated by the owner's UAT walkthrough per `11-CONTEXT.md`'s scope framing ("stops at deployed and UAT-ready"), not by an automated command.

### Wave 0 Gaps
- [ ] `tests/auth.test.ts` — new file; covers the `ALLOW_DEMO_LOGIN`/`hasGoogle` provider-array-construction logic. Recommend extracting the provider-list-building logic into a small pure function (e.g. `buildProviders({ hasGoogle, allowDemoLogin })` returning provider config objects) so it's testable without instantiating real NextAuth providers — mirrors the existing "Prisma-import-free, pure functions" idiom already used in `lib/orders.ts`/`lib/catalog.ts`.
- [ ] `tests/stripe-webhook.test.ts` — new file; mocks `stripe.webhooks.constructEvent` (via `vi.mock`) to test the signature-failure (400) and idempotent-no-op paths without needing a real Stripe event or a real database.
- [ ] `tests/email.test.ts` — new file; mocks the `Resend` client to test `sendOrderConfirmation`'s no-key-no-op branch and its call-shape when configured, without making a real network call.
- [ ] No local Postgres instance available on this research machine to pre-verify the `prisma migrate deploy` smoke path before the owner's real Neon database exists — this is expected (D-08's fresh-baseline approach targets Neon directly), but the planner should decide whether to (a) have the owner spin up a free scratch Neon branch for a pre-flight dry run, or (b) accept first-deploy-time verification as sufficient given D-11's "UAT-ready, not production-money" gating.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|--------------------|
| V2 Authentication | yes | NextAuth (`next-auth` `^4.24.11`) — Google OAuth provider (existing) + newly-gated demo `CredentialsProvider` (D-03). |
| V3 Session Management | yes | NextAuth JWT strategy (existing, `session: { strategy: "jwt" }`), `NEXTAUTH_SECRET` — owner generates a fresh production value distinct from local dev per `11-OWNER-SETUP.md` Step 0. |
| V4 Access Control | yes | `requireOwner()` (existing, `lib/admin.ts`) for admin routes — unchanged this phase. **New:** session-scoped ownership check (`userId` match) for `/account/orders/[id]`, a customer-tier analog to `requireOwner()`'s owner-tier check. |
| V5 Input Validation | yes | Stripe webhook signature verification (`stripe.webhooks.constructEvent`) **is** the input-validation control for the new webhook route — no payload field should be trusted until the signature check passes. Existing checkout route's server-side price/size/qty recomputation (unchanged, already ASVS-aligned per its own inline comments). |
| V6 Cryptography | yes | Never hand-roll the webhook HMAC verification — use the Stripe SDK (see Don't Hand-Roll). `NEXTAUTH_SECRET` generated via `crypto.randomBytes(32)` per Owner Setup Guide Step 0 (cryptographically appropriate, not a hand-picked string). |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Forged webhook POST (attacker sends a fake `checkout.session.completed` payload to mark an order paid without paying) | Spoofing / Tampering | `stripe.webhooks.constructEvent` signature verification before any DB write; reject with 400 on failure, never process an unverified payload. |
| IDOR on `/account/orders/[id]` (customer A guesses/enumerates customer B's order id) | Information Disclosure | Scope the Prisma query by `{ id: params.id, userId: session.user.id }` (via `findFirst`, not `findUnique`), returning `notFound()` on no match — same discipline as the existing admin detail page's IDOR comment, applied at customer scope instead of owner scope. |
| Open redirect via forged `Origin`/client-supplied URL | Tampering | Already mitigated in `app/api/checkout/route.ts` (uses `NEXTAUTH_URL`, never the `Origin` header) — same discipline must extend to any redirect-target logic touched this phase; no client input should ever construct a redirect URL. |
| `ALLOW_DEMO_LOGIN` truthiness footgun leaving the open demo-auth door unintentionally open in production | Elevation of Privilege | Strict string equality (`=== "true"`), not `Boolean(...)` — see Common Pitfalls Pitfall 5. This is the highest-severity item in this phase: an unguarded/mis-gated demo provider lets anyone sign in as `OWNER_EMAIL` and reach `/admin` on a public URL, per D-03's own stated rationale. |
| Webhook replay attack | Spoofing | Stripe's signature includes a timestamp; the SDK's `constructEvent` enforces a default 5-minute tolerance automatically — no extra code needed unless the tolerance parameter is deliberately overridden (don't override it). |

## Sources

### Primary (HIGH confidence)
- `npm view resend version` / `npm view react-email version` / `npm view @react-email/components deprecated` / `npm view stripe version` / `npm view @prisma/adapter-neon version` — direct registry queries, run 2026-08-24.
- `gsd-tools query package-legitimacy check --ecosystem npm resend react-email` — seam-verified verdicts, run 2026-08-24.
- Direct codebase reads: `lib/auth.ts`, `lib/db.ts`, `lib/stripe.ts`, `app/api/checkout/route.ts`, `app/account/page.tsx`, `app/order/success/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/migration_lock.toml`, `lib/orders.ts`, `lib/admin.ts`, `app/admin/orders/page.tsx`, `app/admin/orders/[id]/page.tsx`, `app/admin/orders/actions.ts`, `package.json`, `vitest.config.ts`, `tests/orders.test.ts`, `.gitignore`, `git show HEAD:.env.example`.

### Secondary (MEDIUM confidence)
- [docs.stripe.com/webhooks](https://docs.stripe.com/webhooks) — signature verification, raw-body requirement, duplicate-event handling, 2xx-response guidance, replay-attack tolerance. Fetched directly.
- [resend.com/docs/send-with-nextjs](https://resend.com/docs/send-with-nextjs) — package name, App Router route handler pattern, `react` property usage. Fetched directly.
- [neon.com/docs/guides/prisma](https://neon.com/docs/guides/prisma) — pooled vs. direct connection string distinction, driver-adapter recommendation for current Prisma versions (noted as version-dependent; this project targets the older `url`/`directUrl` schema-based setup, not the v7+ `prisma.config.ts` setup this page primarily documents).
- GitHub discussion [prisma/prisma#21346](https://github.com/prisma/prisma/discussions/21346) — `@prisma/adapter-neon` preview-feature status, cross-checked via WebSearch.
- [prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer) — `directUrl` mechanism, cross-checked via WebSearch.

### Tertiary (LOW confidence)
- General WebSearch results on "Vercel deploy Next.js Prisma postinstall build command" (build-command guidance: `prisma migrate deploy && next build`) — cross-checked across multiple independent sources in the same search but not fetched from a single authoritative doc page this session; treated as MEDIUM given cross-source agreement, flagged as Open Question 1 for planner confirmation rather than a hard requirement.
- WebSearch-only confirmation of the Next.js App Router raw-body (`req.text()`) webhook pattern — cross-checked against the official Stripe raw-body requirement (which is authoritative) but the specific Next.js code shape itself came from community sources, not a Next.js or Stripe official Next.js-specific guide page.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package names/versions directly verified via `npm view`; deprecation status of `@react-email/components` directly confirmed, not inferred.
- Architecture (Prisma pooling decision): HIGH — resolved via a version-mismatch fact (`@prisma/adapter-neon` at `7.9.1` vs. this project's pinned `5.22.0`) that is directly checkable and was checked, not assumed.
- Architecture (webhook/email code patterns): MEDIUM — core security-critical facts (raw-body requirement, signature verification API) are CITED against official Stripe/Resend docs; exact Next.js code shape is cross-checked community consensus, not an official framework-specific guide.
- Pitfalls: MEDIUM-HIGH — most pitfalls are derived directly from reading this project's actual code (the `localhost:3002` fallback, the truthiness footgun class of bug) rather than general web research, making them highly specific and verifiable against the repo itself.
- Package legitimacy: MEDIUM — both new packages flagged `SUS` by the automated seam on a `too-new` (latest-publish-recency) signal alone; manually cross-verified via download counts and official GitHub repos, but per protocol still requires a `checkpoint:human-verify` task in the plan.

**Research date:** 2026-08-24
**Valid until:** 2026-09-07 (14 days — shorter than the default 30 for stable domains, because this phase touches several fast-moving npm packages (`resend`, `react-email`) with sub-monthly release cadences observed during this research, and because Prisma's driver-adapter GA status is actively evolving across major versions).
