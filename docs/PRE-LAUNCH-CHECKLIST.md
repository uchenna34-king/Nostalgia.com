# Pre-Launch Checklist

## How to use

Phase 11 shipped a UAT-ready deployment on Stripe **TEST** keys, with demo login **ON**
(D-11). Every item below was deliberately postponed out of Phase 11 per D-12 — nothing
here was skipped or forgotten, it was flagged for the owner to perform on their own
explicit launch signal. Work through this list in order before taking the store live for
real customers and real money. Each item states exactly WHERE the change is made and
WHAT it flips.

- [ ] 1. Swap Stripe TEST keys to live keys
- [ ] 2. Disable demo login (`ALLOW_DEMO_LOGIN=false`)
- [ ] 3. Publish the Google OAuth consent screen (Testing → Production)
- [ ] 4. Buy and attach a custom domain, verify it with Resend
- [ ] 5. Replace `/shipping` placeholder copy
- [ ] 6. Replace `/returns` placeholder copy
- [ ] 7. Review the order-success email promise
- [ ] 8. Real product photography / catalog data (completeness note only)

## Go-Live Actions

### 1. Swap Stripe TEST keys to live keys

Completes **LIVE-02**, deferred per **D-11**.

**WHERE:** The Vercel project's environment variable store, for the Stripe secret key,
publishable key, and `STRIPE_WEBHOOK_SECRET` — plus the Stripe Dashboard's Test/Live
mode toggle, and a newly registered **LIVE**-mode webhook endpoint for the checkout
completion event pointing at the deployed `/api/stripe/webhook`.

**WHAT flips:** Real charges become possible — the store can take real customer money.

This is reserved for the owner's explicit signal per the governing constraint "we are
still in the demo phase and the production phase is when i will let u know." It must
not be performed autonomously by an agent.

### 2. Disable demo login (`ALLOW_DEMO_LOGIN=false`)

Governed by **D-03**; closes the **T-11-07-05** open-door acceptance carried forward
from Phase 11.

**WHERE:** The Vercel project's environment variable store — set `ALLOW_DEMO_LOGIN=false`.

**WHAT flips:** The demo credentials provider is removed from `lib/auth.ts` with **no
code edit required**. Today, any email address — including `OWNER_EMAIL`, which grants
`/admin` — can sign in as anyone on the public URL via demo login. This is a deliberate,
time-boxed UAT convenience, not a bug, but it must not remain on for a real launch.

**This is a HARD gate.** It MUST be completed before any real-payment or public launch.

### 3. Publish the Google OAuth consent screen (Testing → Production)

Deferred per **D-10**, part of the Phase 11 scope fence.

**WHERE:** Google Cloud Console → APIs & Services → OAuth consent screen → **Publish App**.

**WHAT flips:** The 100-test-user cap and the "unverified app" warning are removed, so
any Google account can sign in, not just testers added by email. Note this may trigger
Google's app-verification review depending on the OAuth scopes requested.

### 4. Buy and attach a custom domain, verify it with Resend

Deferred per **D-09** (scope fence); resolves the **D-06a** email-delivery limitation.

**WHERE:**
- A domain registrar, or Vercel Domains, for purchase and DNS.
- The Resend Dashboard → Domains area, to add the domain and publish its DNS
  verification records (SPF/DKIM).

**WHAT flips:** Because every URL and sender address in this app is environment-driven
(D-09), attaching a domain is a **config-only** change:
- `NEXTAUTH_URL` → the new domain
- `EMAIL_FROM` (Resend sender) → an address on the verified domain, away from the
  `onboarding@resend.dev` sandbox sender
- The Google OAuth redirect URI and authorized JS origin → the new domain
- The Stripe checkout success/cancel origin → the new domain

Once verified, order confirmation email delivers to **all** customers (not just the
owner's own Resend account address — see the Known UAT Limitation below), and the
Google consent screen shows the real, branded domain instead of a `*.vercel.app` URL.

### 5. Replace the `/shipping` placeholder copy

Deferred per **D-12**.

**WHERE:** `app/shipping/page.tsx`, the `PLACEHOLDER copy (D-12)` marker near line 12.

**WHAT flips:** The on-brand draft copy is replaced with the owner's real, binding
shipping terms — processing times, rates, and delivery windows. These are a business
commitment the owner supplies; they must not be invented by an agent.

### 6. Replace the `/returns` placeholder copy

Deferred per **D-12**.

**WHERE:** `app/returns/page.tsx`, the `PLACEHOLDER copy (D-12)` marker near line 12
(currently drafted with a 30-day window).

**WHAT flips:** The on-brand draft copy is replaced with the owner's real, binding
returns policy and window — condition requirements, refunds, and exchanges. A business
commitment the owner supplies, not to be invented.

### 7. Review and, if needed, replace the order-success email promise

Deferred per **D-12**; ties to **LIVE-03**.

**WHERE:** `app/order/success/page.tsx`, near line 42 — the line "We'll send a
confirmation shortly and let you know when it ships."

**WHAT flips:** Once real email delivery is confirmed after domain verification (item
4 above), reword this line if needed so the promise on the page matches actual,
verified behavior.

### 8. Real product photography and real catalog data

**Already out of scope** for Milestone 2 per `.planning/PROJECT.md`. Listed here only
for completeness — it is not a Phase 11 or go-live deliverable owned by this checklist.

## Known UAT Limitation — Email Delivery (D-06a)

With no verified sending domain, the Resend **sandbox** sender (`onboarding@resend.dev`)
delivers **only to the owner's own Resend-account address**. UAT testers exercise the
full send path — the webhook or stub checkout branch calls `sendOrderConfirmation`
exactly as production would — but they will **not** receive the email in their own
inbox.

**Testers and reviewers verify a send by checking the Resend Dashboard delivery log**,
not an inbox. This is accepted, expected, and documented behavior — not a defect to be
discovered during UAT. Go-live action 4 above (custom domain + Resend verification) is
what resolves it, after which delivery reaches real customer inboxes.
