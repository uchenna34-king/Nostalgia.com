# Phase 11: Go Live - Context

**Gathered:** 2026-07-29
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase performs the production cutover of an already-complete storefront: real
identity, real payment confirmation, real database, real transactional email, and a
publicly reachable deployment. It adds **no new storefront features**.

**Critical scope reframe (owner decision, this discussion):** the phase stops at
*deployed and UAT-ready*, **not** at *taking real money*. The owner explicitly stated
"we are still in the demo phase and the production phase is when i will let u know."

The phase is DONE when the app is live on its real URL against real Neon Postgres, with
real Google sign-in, real confirmation emails, and working order history — but with
**Stripe still in TEST mode**. Flipping to live payments is then a key swap plus an env
flag, deliberately reserved for the owner's explicit signal. See D-11 and the scope
fence below.

</domain>

<decisions>
## Implementation Decisions

### Hosting & Database

- **D-01:** Host is **Vercel**. Chosen for native Next.js 14 App Router support
  (image optimization, ISR, route handlers with zero config) and because
  `@vercel/analytics` + `@vercel/speed-insights` are already dependencies in
  `package.json`. Consequence: serverless runtime, so Prisma needs a pooled
  connection — `lib/db.ts` must be adapted rather than left as-is.
- **D-02:** Database is **Neon Postgres**. Runtime uses the **pooled** connection
  string; Prisma migrations use the **direct** connection string via `directUrl` in
  `schema.prisma`. Both are env-driven.
- **D-08:** Cutover is a **fresh Postgres baseline + reseed**. The three existing
  migrations (`0_init`, `20260726172011_add_reviews`, `20260727122723_add_review_hidden`)
  contain SQLite-flavoured SQL and **cannot replay against Postgres** — they are
  replaced by one clean Postgres init migration. All local data is seed/test data
  regenerable via `prisma/seed.ts`; nothing is carried across.
- **D-08a:** `Order.status` **stays a `String`** with the existing app-level allow-list
  (`ORDER_STATUSES` / `isValidOrderStatus` in `lib/orders.ts`). A Postgres enum was
  considered and rejected: every write is already guarded, and an enum turns every
  future status change into a migration.

### Authentication

- **D-03:** The `demo` credentials provider is **kept, but gated behind a new
  `ALLOW_DEMO_LOGIN` environment variable**. It is `true` on the UAT deployment so
  fellow developers can test the finished build exactly as they do locally; setting it
  `false` at go-live removes the provider with no code edit and nothing to remember to
  delete.

  *Rationale (owner initially asked for it always-on; this gate was proposed and
  accepted):* the provider currently sits **outside** the `hasGoogle` guard in
  `lib/auth.ts`, so on any publicly reachable URL it lets anyone sign in as **any**
  email address — including the `OWNER_EMAIL`, which grants `/admin`. The env gate
  preserves the UAT capability without shipping an open door.
- **D-10:** The **Google Cloud OAuth project is created now, in "Testing" mode**, not
  deferred to launch. Testing mode works immediately with UAT testers added by email
  address (Google's limit is 100), with no review required. This means real Google
  sign-in is exercised during UAT rather than first attempted on launch day. It is also
  how the owner reaches `/admin`, since `requireOwner()` matches against `OWNER_EMAIL`.

### Payments

- **D-04:** A new **`/api/stripe/webhook` route handler is the single source of truth**
  for payment status. It verifies the Stripe signature and transitions the order from
  `pending` to `paid`.

  *This closes a verified gap, not a hypothetical one:* today `app/api/checkout/route.ts`
  creates the order with `status: "pending"` and **nothing anywhere marks it paid** — a
  grep for `webhook|constructEvent` across the repo returns zero hits. A real payment
  would currently leave a paid customer with a permanently pending order.
- **D-04a:** Webhook-only was chosen over verifying the Stripe session on the success
  page, because the webhook is the only path that survives a customer closing the tab
  immediately after paying.

### Email

- **D-05:** Email service is **Resend**, using React Email templates so the receipt
  carries the locked Nostalgia palette and Fraunces type rather than generic system
  styling.
- **D-06:** A single shared `sendOrderConfirmation(orderId)` is called from **both** the
  Stripe webhook (real payments) **and** the demo/stub checkout branch. This means UAT
  testers actually receive and can critique the real email, so layout problems surface
  now rather than on the first live order.
- **D-06a:** Known UAT constraint arising from D-09 — with no verified sending domain,
  **Resend can only deliver to the owner's own Resend account address**. Testers will
  exercise the send path but will not receive mail until a domain is verified. This is
  accepted, documented, and must be stated plainly in the phase's verification notes
  rather than discovered during UAT.

### Order History

- **D-07:** `/account` gains an **order list** (reference, date, total, status) and a
  new **`/account/orders/[id]` detail route** showing line items with images, tracking
  number, and status. The `Order` model already carries `items` (JSON) and
  `trackingNumber`, and the admin area already has order detail views to mirror — so
  this is largely reuse. Note `app/account/page.tsx` is currently a `"use client"`
  component with no data fetching; delivering this will require restructuring it.

### Domain & URLs

- **D-09:** Ship on the **free `*.vercel.app` URL** for now. Every URL and sender
  address must be **environment-driven with no hardcoding**, so attaching a custom
  domain later is a configuration change and not a code change. This specifically
  includes `NEXTAUTH_URL`, the Stripe `success_url`/`cancel_url` origin (currently
  falls back to a hardcoded `http://localhost:3002` in `app/api/checkout/route.ts:108`),
  the Google OAuth redirect URI, and the Resend `from` address.

### Launch Gating

- **D-11:** Phase completion = **deployed and UAT-ready on Stripe TEST keys**. Real
  Neon Postgres, real Google sign-in, real emails, working order history, demo login on
  for testers — but no real money can move. The live-key cutover is explicitly **out of
  this phase** and happens on the owner's signal.
- **D-12:** Placeholder copy is **flagged, not written**. The phase produces a
  pre-launch checklist enumerating every placeholder that must be replaced and where —
  including the `/shipping` and `/returns` copy carried forward from Phase 10 (D-12) and
  the "We'll send a confirmation shortly" promise on the order success page. Actual
  shipping terms and return windows are business commitments the owner supplies; they
  are not to be invented.

### Scope Fence (explicitly NOT in this phase)

- Flipping Stripe to **live keys** or enabling real charges.
- Publishing the Google OAuth consent screen from "Testing" to "Production".
- Writing real shipping/returns **policy text**.
- Purchasing or attaching a **custom domain**.
- Real product photography or real catalog data.

### Claude's Discretion

- Exact Prisma connection-pooling approach for Vercel serverless (driver adapter vs.
  pooled connection string) — resolve during research against current Prisma 5.22 +
  Neon guidance.
- Which Stripe webhook events to subscribe to beyond the checkout-completion event.
- React Email template structure and file layout.
- Whether the order success page shows a "confirming payment…" state while awaiting the
  webhook. D-04 selected webhook-only, so the success page stays presentational by
  default; add the confirming state only if it costs little.
- Naming and location of the pre-launch checklist artifact.
- Structure of the account order list/detail components, subject to the locked
  aesthetic.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level constraints
- `.planning/PROJECT.md` — locked aesthetic and locked tech stack; "Deploy target:
  Hosted Node platform with hosted Postgres"; SQLite-dev/Postgres-prod decision
- `.planning/REQUIREMENTS.md` — LIVE-01 … LIVE-06 definitions and traceability table
- `.planning/ROADMAP.md` § Phase 11 — goal and the four success criteria

### Code that this phase must change
- `lib/auth.ts` — NextAuth config; Google provider is conditional on `hasGoogle`, the
  `demo` credentials provider is currently **unconditional** (D-03 gates it)
- `lib/db.ts` — Prisma singleton; must adapt for Vercel serverless pooling (D-01)
- `lib/stripe.ts` — Stripe client, `null` when no key; `stripeEnabled` flag
- `app/api/checkout/route.ts` — creates `pending` order in Stripe mode and `paid` in
  stub mode; contains the hardcoded `http://localhost:3002` origin fallback (line 108)
- `app/account/page.tsx` — currently client-side, name/email only; D-07 extends it
- `app/order/success/page.tsx` — presentational; promises an email that does not yet
  exist
- `prisma/schema.prisma` — `datasource db { provider = "sqlite" }`; needs `postgresql`
  plus `directUrl` (D-02)
- `.env.example` — the env contract; every new variable must be added here

### Code this phase must respect but not break
- `lib/admin.ts` — `OWNER_EMAIL` gate and `requireOwner()`; the authorization model for
  `/admin`. Interacts directly with D-03 and D-10
- `lib/orders.ts` — `ORDER_STATUSES`, `isValidOrderStatus`, `parseOrderItems`; the
  status allow-list D-08a preserves, and the item parser order history will reuse
- `prisma/migrations/` — the three SQLite-flavoured migrations D-08 replaces

### Prior phase context
- `.planning/phases/10-trust-polish/10-12-SUMMARY.md` — carries the recommendation to
  re-measure Lighthouse performance on real hosting with real photography, and records
  that mobile performance was documented as an unmet target rather than marked passed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/orders.ts` `parseOrderItems()` — defensive JSON parser for `Order.items`, already
  used by admin order views; order history detail (D-07) reuses it directly.
- `lib/orders.ts` `ORDER_STATUSES` / `isValidOrderStatus()` — allow-list-before-use
  guard; D-08a keeps this as the status authority instead of a DB enum.
- `lib/admin.ts` `requireOwner()` — established authorization gate; the pattern any new
  privileged route must follow.
- Admin order list/detail views (Phase 9) — the closest analog for the customer-facing
  order history being added in D-07.
- `@vercel/analytics` + `@vercel/speed-insights` — already installed, already wired.

### Established Patterns
- **Env-conditional capability with a dev fallback.** `hasGoogle` in `lib/auth.ts` and
  `stripeEnabled` in `lib/stripe.ts` both follow "real service if key present, fallback
  otherwise". D-03's `ALLOW_DEMO_LOGIN` gate should match this idiom.
- **Never trust the client.** `app/api/checkout/route.ts` recomputes every price from
  the database, validates sizes against the product's real size list, clamps quantity,
  and refuses to derive redirect targets from the `Origin` header. The webhook (D-04)
  must hold the same line — verify the Stripe signature, trust nothing in the payload
  body.
- **Server-side authorization repeated per entry point.** `requireOwner()` is invoked as
  the first statement of every admin Server Action, not only at layout level, because
  Server Actions are independently callable HTTP endpoints.
- **Portability-conscious schema.** `Order.status` is a `String` with an explicit
  in-schema comment stating the choice was made "for SQLite-now / Postgres-later
  portability" — D-08a honors that original intent.

### Integration Points
- **New:** `/api/stripe/webhook` route handler → updates `Order.status` → calls
  `sendOrderConfirmation()`.
- **New:** `sendOrderConfirmation(orderId)` → called from both the webhook and the
  demo/stub branch of `app/api/checkout/route.ts` (D-06).
- **New:** `/account/orders/[id]` route + order list section on `/account`.
- **Changed:** `lib/db.ts` Prisma instantiation for serverless pooling.
- **Changed:** `prisma/schema.prisma` datasource provider and `directUrl`.
- **Changed:** `lib/auth.ts` provider array gains the `ALLOW_DEMO_LOGIN` condition.
- **Changed:** `.env.example` gains `ALLOW_DEMO_LOGIN`, `DIRECT_URL`,
  `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`.

</code_context>

<specifics>
## Specific Ideas

- **"we are still in the demo phase and the production phase is when i will let u know"**
  — the governing constraint for this phase. Nothing in the plans may assume authority
  to enable real payments.
- **"demo login ... active so we can easily get fellow developers to do UAT before
  rolling into deployment with everything fully built and ready"** — the demo provider
  is a deliberate UAT tool, not leftover scaffolding. It must keep working on the
  deployed UAT build.
- **"we will have to design these that will not bring in any last minute surprises,
  especially if we go live"** — applied to order history, the Postgres cutover, and
  go-live sequencing. Interpretation for planners: prefer designs that are provable
  *before* launch day, and state known limitations explicitly instead of discovering
  them under time pressure (see D-06a).
- The owner will personally perform all external account creation (Stripe, Google
  Cloud, Neon, Resend, Vercel) and has asked for written step-by-step instructions plus
  integration into the app. Credential entry is the owner's action, never the agent's;
  plans must produce instructions and an env contract, and must never contain real
  keys.

</specifics>

<deferred>
## Deferred Ideas

- **Live Stripe keys / real charges** — deliberately withheld until the owner signals.
  The phase leaves this as a key swap plus env flag.
- **Custom domain purchase and DNS verification** — deferred (D-09). Unblocks
  customer-deliverable email and a branded OAuth screen when it happens.
- **Publishing the Google OAuth consent screen to Production** — stays in Testing mode
  for UAT (D-10).
- **Real shipping and returns policy copy** — owner-supplied business commitment;
  flagged in the pre-launch checklist, not authored here (D-12).
- **Real product photography and real catalog data** — already Out of Scope for
  Milestone 2 per `.planning/PROJECT.md`.
- **Admin "resend confirmation email" action** — considered as an email-trigger option
  and not selected. Genuinely useful in operation; a candidate for a post-launch phase.
- **Re-measuring Lighthouse performance on real hosting** — carried forward from
  `10-12-SUMMARY.md`. Real hosting exists after this phase, so this becomes actionable,
  but it is not a Phase 11 requirement.

</deferred>

---

*Phase: 11-go-live*
*Context gathered: 2026-07-29*
