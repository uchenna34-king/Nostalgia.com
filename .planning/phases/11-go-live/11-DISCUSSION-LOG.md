# Phase 11: Go Live - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-29
**Phase:** 11-go-live
**Areas discussed:** Host + Postgres pairing, Payment confirmation path, Demo login in production, Email provider + trigger, Order history page shape, SQLite → Postgres cutover, Go-live sequencing, Owner content before launch

**Mode note:** Questions were batched (3 rounds of 4) rather than run as 4 single-question
turns per area. The owner asked to cover all eight areas and has a recorded preference for
forward momentum over extended Q&A.

**Pre-discussion codebase findings** that shaped the questions (each verified by reading
source, not assumed):

1. No Stripe webhook exists anywhere — `grep -rn "webhook|constructEvent"` returns zero
   hits, and `app/api/checkout/route.ts:127` creates orders as `pending` with nothing to
   transition them.
2. The `demo` credentials provider in `lib/auth.ts` sits outside the `hasGoogle` guard, so
   it is registered unconditionally.
3. No email integration of any kind — no `resend`, `nodemailer`, `sendgrid`, or `postmark`
   in the dependency tree — while `app/order/success/page.tsx` already promises a
   confirmation email.
4. `@vercel/analytics` and `@vercel/speed-insights` are already dependencies.
5. `lib/admin.ts` gates `/admin` on `OWNER_EMAIL`, making real Google OAuth a hard
   dependency for owner access once demo login is disabled.

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Host + Postgres pairing | Vercel vs long-lived Node host; which Postgres | ✓ |
| Payment confirmation path | No webhook exists; orders stuck at pending | ✓ |
| Demo login in production | Provider currently unconditional | ✓ |
| Email provider + trigger | Nothing installed | ✓ |
| Order history page shape | /account has no orders | ✓ |
| SQLite → Postgres cutover | Existing migrations are SQLite-flavoured | ✓ |
| Go-live sequencing | Test keys first vs straight to live | ✓ |
| Owner content before launch | Placeholder copy, real product data | ✓ |

**User's choice:** All eight.
**Notes:** The owner added an unprompted and load-bearing constraint: *"we are still in the
demo phase and the production phase is when i will let u know."* They also stated the intent
behind demo login — *"so we can easily get fellow developers to do UAT before rolling into
deployment with everything fully built and ready"* — and, for the second group, *"we will
have to design these that will not bring in any last minute surprises, especially if we go
live."* These reframed the phase from "launch" to "build to the door and wait."

---

## Host

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel | Native Next.js 14 fit; serverless means Prisma needs pooled connections | ✓ |
| Railway | Long-lived Node, Prisma unchanged, one provider; ~$5/mo, weaker Next tooling | |
| Render | Similar to Railway; free tier spins down ~30s, unacceptable for a storefront | |

**User's choice:** Vercel.
**Notes:** Consistent with the existing `@vercel/*` dependencies and the PROJECT.md deploy
target. Accepted consequence: `lib/db.ts` must change for serverless pooling.

---

## Database

| Option | Description | Selected |
|--------|-------------|----------|
| Neon | Pooled URL for runtime + direct URL for migrations — what Prisma on Vercel needs | ✓ |
| Supabase | Postgres plus auth/storage/realtime this project won't use | |
| Host's own Postgres | One provider, one bill; couples the DB to the host | |

**User's choice:** Neon.

---

## Demo login

| Option | Description | Selected |
|--------|-------------|----------|
| Env-flag gated | `ALLOW_DEMO_LOGIN`; true for UAT, one variable change closes it at go-live | ✓ |
| Always on | Exactly as requested; anyone with the URL can sign in as any email including the owner | |
| Off when NODE_ENV is production | Automatic, but kills demo login on the UAT deployment too | |

**User's choice:** Env-flag gated.
**Notes:** The owner's initial instruction was to keep the option "active". A concern was
raised — unconditional means anyone who finds the UAT URL can sign in as the `OWNER_EMAIL`
and reach `/admin` — and the env gate was offered as preserving the stated capability
without the exposure. The owner accepted it. This is the one place in the discussion where a
stated preference was pushed back on rather than implemented verbatim.

---

## Payment confirmation

| Option | Description | Selected |
|--------|-------------|----------|
| Webhook is source of truth | Signature-verified route flips order to paid, then emails | ✓ |
| Webhook + success page reads the order | Adds a "confirming payment…" state while the webhook lands | |
| Verify Stripe session on success page only | No webhook; a closed tab means a paid order never completes | |

**User's choice:** Webhook is the source of truth.
**Notes:** The rejected third option is what the code most nearly resembles today, which is
why the current state is broken rather than merely incomplete.

---

## Email service

| Option | Description | Selected |
|--------|-------------|----------|
| Resend | Simplest API; React Email templates carry the locked brand palette; 3,000/mo free | ✓ |
| Postmark | Best transactional deliverability; ~$15/mo past trial; non-React templates | |
| SendGrid | Free 100/day; clunkier API and fiddliest sender verification | |

**User's choice:** Resend.

---

## Email trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Both real and demo checkouts | Shared `sendOrderConfirmation(orderId)`; UAT exercises the real email | ✓ |
| Stripe webhook only | Template goes untested until the first live order | |
| Both, plus admin resend button | Useful in operation; adds an admin action + authorization | |

**User's choice:** Both real and demo checkouts.
**Notes:** Directly serves the "no last-minute surprises" instruction — the email template
gets exercised during UAT rather than first rendered for a paying customer.

---

## Order history

| Option | Description | Selected |
|--------|-------------|----------|
| List + detail page | `/account` list plus `/account/orders/[id]`; reuses Order.items and trackingNumber | ✓ |
| List only | Satisfies LIVE-04 literally; customers can't see items or tracking | |
| List + expandable rows | No new route; needs a client component and gives no linkable URL | |

**User's choice:** List + detail page.

---

## Database cutover

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh baseline + reseed | One clean Postgres init migration; local data is regenerable seed data | ✓ |
| Fresh baseline + Order.status as a Postgres enum | DB-level enforcement; makes every status change a migration | |
| Migrate existing local data across | Real work to preserve data `prisma/seed.ts` regenerates in one command | |

**User's choice:** Fresh baseline + reseed.
**Notes:** `Order.status` therefore stays a `String` guarded by `isValidOrderStatus`,
honoring the original in-schema comment about SQLite-now/Postgres-later portability.

---

## Domain

| Option | Description | Selected |
|--------|-------------|----------|
| Get one now | Real sender address, branded OAuth screen, owned URL; ~$10–15/yr | |
| Use the free `.vercel.app` URL | Works, except Resend can only deliver to the owner's own account address | ✓ |
| Not decided — build domain-agnostic | Same limitation; all URLs env-driven | |

**User's choice:** Use the free `.vercel.app` URL for now.
**Notes:** The email-delivery limitation was stated before the choice and accepted. It is
recorded in CONTEXT.md as D-06a so it appears in verification notes rather than surfacing
mid-UAT. The domain-agnostic requirement applies regardless — nothing may hardcode a URL or
sender address.

---

## Google OAuth timing

| Option | Description | Selected |
|--------|-------------|----------|
| Now, in Testing mode | Works immediately with up to 100 testers, no review; exercises OAuth during UAT | ✓ |
| Later, at go-live | Less setup now; leaves the riskiest go-live step untested until launch day | |

**User's choice:** Now, in Testing mode.

---

## Definition of done

| Option | Description | Selected |
|--------|-------------|----------|
| Deployed + UAT-ready on Stripe TEST keys | Real URL, real Postgres, real sign-in, real email; no real money moves | ✓ |
| Built and verified locally, deploy on signal | Nothing public; deployment problems stay undiscovered | |
| Fully live with real payments | The literal roadmap wording; contradicts the owner's stated position | |

**User's choice:** Deployed + UAT-ready on Stripe TEST keys.
**Notes:** This deliberately narrows the roadmap's Phase 11 success criteria, which say a
customer "pays with real Stripe (live keys)". The narrowing is the owner's explicit
decision, is recorded in CONTEXT.md, and must be reflected when the phase is verified —
the phase should not be marked as satisfying live-payment criteria it intentionally did
not attempt.

---

## Owner content

| Option | Description | Selected |
|--------|-------------|----------|
| Flag it, don't write it | Pre-launch checklist of every placeholder and its location | ✓ |
| Owner supplies real policies now | Removes a launch blocker entirely | |
| Out of scope, handle separately | Clean scope; placeholders become nobody's responsibility | |

**User's choice:** Flag it, don't write it.

---

## Claude's Discretion

- Prisma serverless pooling approach for Vercel + Neon (driver adapter vs. pooled URL) —
  to be resolved during research.
- Which Stripe webhook events to subscribe to beyond checkout completion.
- React Email template structure and file layout.
- Whether the success page shows a "confirming payment…" state.
- Naming and location of the pre-launch checklist artifact.
- Account order list/detail component structure, within the locked aesthetic.

## Deferred Ideas

- Live Stripe keys / real charges — owner's signal required.
- Custom domain purchase and DNS verification.
- Publishing the Google OAuth consent screen from Testing to Production.
- Real shipping and returns policy copy — owner-supplied business commitment.
- Real product photography and catalog data — already Out of Scope for Milestone 2.
- Admin "resend confirmation email" action — considered, not selected; post-launch candidate.
- Re-measuring Lighthouse performance on real hosting — carried forward from 10-12-SUMMARY.md.
