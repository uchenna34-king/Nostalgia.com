---
phase: 11-go-live
plan: 05
subsystem: payments
tags: [stripe, webhook, idempotency, checkout, email, nextjs-route-handler]

# Dependency graph
requires:
  - phase: 11-go-live (plan 04)
    provides: "lib/email.ts sendOrderConfirmation(orderId): Promise<void> — the single shared D-06 entry point"
provides:
  - "app/api/stripe/webhook/route.ts — signature-verified, idempotent pending->paid transition (D-04, LIVE-02)"
  - "checkout stub branch now calls sendOrderConfirmation (second of two D-06 call sites)"
  - "app/api/checkout/route.ts fully env-driven redirect origin, no hardcoded fallback (D-09)"
affects: ["11-07 (deployment — register production webhook endpoint)", "pre-launch checklist / D-12"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw-body signature verification via req.text() before any JSON parsing — the one deliberate exception to the codebase's .json()-first convention"
    - "Order.status === \"pending\" guard as the idempotency mechanism (no event-ledger table) — matches RESEARCH's documented single-transition rationale"
    - "Fail-loud 500 on missing required env var (NEXTAUTH_URL) rather than a silent hardcoded fallback — extends the project's existing null-if-no-key idiom to a required-in-production var"

key-files:
  created:
    - app/api/stripe/webhook/route.ts
    - tests/stripe-webhook.test.ts
  modified:
    - app/api/checkout/route.ts
    - tests/checkout-shipping.test.ts

key-decisions:
  - "Idempotency guard implemented as order.status === \"pending\" (not RESEARCH's !== \"paid\" sketch) so a fulfilled/cancelled order is never re-flipped to paid or re-emailed — matches the plan's explicit instruction, tested by dedicated fulfilled/cancelled cases."
  - "sendOrderConfirmation wired at exactly two call sites (webhook's pending->paid transition, checkout stub branch) and deliberately NOT in the Stripe test-mode session-creation branch, where the order stays pending until the webhook fires."
  - "checkout route's redirect origin has zero hardcoded fallback; unset NEXTAUTH_URL now returns 500 { error: \"server_misconfigured\" } before any Order row is created."

requirements-completed: [LIVE-02, LIVE-03]

coverage:
  - id: D1
    description: "Signature verification: raw body via req.text(), missing/invalid signature rejected 400 with zero DB writes"
    requirement: "LIVE-02"
    verification:
      - kind: unit
        ref: "tests/stripe-webhook.test.ts — missing-signature and constructEvent-throws cases, plus the raw-body-fidelity assertion"
        status: pass
    human_judgment: false
  - id: D2
    description: "Verified checkout.session.completed for a pending order transitions status to paid and sends exactly one confirmation email"
    requirement: "LIVE-02, LIVE-03"
    verification:
      - kind: unit
        ref: "tests/stripe-webhook.test.ts#a verified checkout.session.completed for a pending order..."
        status: pass
    human_judgment: false
  - id: D3
    description: "Idempotency: duplicate delivery on an already-paid order, and delivery on a fulfilled/cancelled order, are both safe no-ops"
    requirement: "LIVE-02"
    verification:
      - kind: unit
        ref: "tests/stripe-webhook.test.ts — duplicate-delivery test + it.each([\"fulfilled\",\"cancelled\"]) test"
        status: pass
    human_judgment: false
  - id: D4
    description: "Untrusted-payload guards: missing metadata.orderId, unknown orderId, and non-subscribed event types are all safe no-ops (200, no write, no email)"
    requirement: "LIVE-02"
    verification:
      - kind: unit
        ref: "tests/stripe-webhook.test.ts — three dedicated no-op cases"
        status: pass
    human_judgment: false
  - id: D5
    description: "Checkout stub branch sends the same shared confirmation email a real payment does; Stripe branch does not double-send; origin has no hardcoded fallback"
    requirement: "LIVE-03"
    verification:
      - kind: integration
        ref: "tests/checkout-shipping.test.ts (5 tests, updated to set NEXTAUTH_URL) + npm run build compiles the route with runtime=\"nodejs\""
        status: pass
      - kind: unit
        ref: "grep-based structural checks (no localhost, sendOrderConfirmation present, process.env.NEXTAUTH_URL present, metadata: { orderId unchanged)"
        status: pass
    human_judgment: true
    rationale: "D-06a: a real end-to-end send (stripe listen + test-card checkout + Resend dashboard log confirmation) requires a running deployment with STRIPE_WEBHOOK_SECRET set, explicitly deferred to plan 11-07 per this plan's own verification section — cannot be exercised in this session."

# Metrics
duration: ~40min
completed: 2026-08-31
status: complete
---

# Phase 11 Plan 05: Stripe webhook — payment confirmation Summary

**`/api/stripe/webhook` becomes the single source of truth for payment status: raw-body HMAC verification, an `order.status === "pending"` idempotency guard, and the shared `sendOrderConfirmation` wired into both the real-payment and demo/stub paths.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-08-31
- **Tasks:** 2 (both `type="auto"`, Task 1 TDD)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Created `app/api/stripe/webhook/route.ts`: `export const runtime = "nodejs"`, reads the raw body via `req.text()` (never `.json()`), verifies `stripe-signature` via `stripe.webhooks.constructEvent`, handles `checkout.session.completed` only, maps `session.metadata.orderId` to the Order row, and transitions `pending -> paid` + fires `sendOrderConfirmation(order.id)` exactly once per order — guarded by `order.status === "pending"` so any already-advanced status (`paid`, `fulfilled`, `cancelled`) is a safe no-op.
- Wrote 11 RED-then-GREEN tests in `tests/stripe-webhook.test.ts` covering every behavior case from the plan: stub/demo mode short-circuit, missing signature, forged/invalid signature, raw-body fidelity (constructEvent receives the exact `req.text()` string, not a re-serialized object), successful transition + single email, duplicate delivery on an already-`paid` order, `fulfilled`/`cancelled` orders never re-flipped, missing `metadata.orderId`, unknown `orderId`, and a non-subscribed event type.
- Edited `app/api/checkout/route.ts`: removed the hardcoded `http://localhost:3002` origin fallback entirely — `NEXTAUTH_URL` is now required, and its absence returns `500 { error: "server_misconfigured" }` before any Order is created (D-09). Added `sendOrderConfirmation(order.id)` to the stub-mode branch only, immediately after `prisma.order.create` and before the redirect response (D-06's second call site) — the Stripe test-mode branch below it deliberately does not call it, since that order stays `pending` until the new webhook confirms payment.
- Full suite: 180/180 passing. `npx tsc --noEmit` clean. `npm run build` compiles cleanly, including the new route with `runtime = "nodejs"` shown in the route manifest (`ƒ /api/stripe/webhook 0 B`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create `/api/stripe/webhook`** — `7200203` (feat) — `app/api/stripe/webhook/route.ts`, `tests/stripe-webhook.test.ts` (RED then GREEN).
2. **Task 2: Wire `sendOrderConfirmation` + remove origin fallback** — `bd95cad` (feat) — `app/api/checkout/route.ts`, `tests/checkout-shipping.test.ts` (deviation fix, see below).

**Plan metadata:** committed via this SUMMARY + STATE/ROADMAP update (sequential mode, no separate orchestrator step).

## The idempotency contract, precisely

The transition (`status: "paid"` write + `sendOrderConfirmation` call) fires **only when `order.status === "pending"` at the moment the verified event is processed.** This deliberately diverges from RESEARCH's drafted `!== "paid"` sketch: guarding on `=== "pending"` means a `fulfilled` or `cancelled` order is *never* re-flipped to `paid` and never re-emailed, whereas `!== "paid"` would incorrectly re-fire on those two states. No event-ID ledger table exists or is needed — this app has exactly one meaningful one-way transition (`pending -> paid`) driven by exactly one subscribed event type (`checkout.session.completed`), so the order's own status field is a sufficient, correct dedup key. Every other outcome (missing signature, forged signature, missing `metadata.orderId`, unknown order, wrong event type) is either a `400` with zero writes (signature failures) or a `200 { received: true }` no-op (everything else, per Stripe's "always ack 2xx once verified" guidance) — never a write without a matching email, and never an email without a matching write.

## D-06 call-site inventory (both now live)

| # | Call site | Order status at call time | Trigger |
|---|-----------|---------------------------|---------|
| 1 | `app/api/stripe/webhook/route.ts` | `pending -> paid` (real payment) | Verified `checkout.session.completed` |
| 2 | `app/api/checkout/route.ts` stub branch | `paid` (created paid immediately, no Stripe key) | Demo/UAT checkout with no `STRIPE_SECRET_KEY` configured |

The Stripe **test-mode** branch of `app/api/checkout/route.ts` (creates the order `pending`, returns a Stripe Checkout redirect URL) deliberately does **not** call `sendOrderConfirmation` — that order's email is the webhook's responsibility once payment is confirmed. Calling it in both places would double-send for every real/test-card payment.

## D-09: origin change

`app/api/checkout/route.ts`'s redirect origin changed from `process.env.NEXTAUTH_URL ?? "http://localhost:3002"` (a stale fallback — port 3002 didn't even match the project's documented dev default of 3000, per RESEARCH Pitfall 4) to a strict read of `process.env.NEXTAUTH_URL` with a fail-loud `500 { error: "server_misconfigured" }` guard before any order is created. `NEXTAUTH_URL` is already required by NextAuth and set in every deployed environment and local `.env.local`, so this introduces no new setup burden — it converts a silent-wrong-redirect failure mode into a loud, immediately-visible one.

## Files Created/Modified

- `app/api/stripe/webhook/route.ts` — new route handler, single source of truth for payment status (D-04).
- `tests/stripe-webhook.test.ts` — 11 tests, full behavior coverage per the plan's `<behavior>` block.
- `app/api/checkout/route.ts` — two localized edits (origin fallback removed, `sendOrderConfirmation` import + stub-branch call). Shipping-fee logic (`calculateShipping`, `lib/shipping.ts`) from an earlier, unrelated session change is untouched.
- `tests/checkout-shipping.test.ts` — deviation fix, see below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `tests/checkout-shipping.test.ts` broke because it never set `NEXTAUTH_URL`**
- **Found during:** Task 2 verification (`npm test` run after the origin-fallback removal)
- **Issue:** `tests/checkout-shipping.test.ts` (pre-existing, from an earlier unrelated session fixing a shipping-total bug) never set `process.env.NEXTAUTH_URL`. Once the fallback origin was removed, all 3 of its tests hit the new fail-loud `500` guard before reaching their shipping-total assertions.
- **Fix:** Added `process.env.NEXTAUTH_URL = "http://localhost:3000"` in that file's `beforeEach`, restored in `afterEach` — a realistic test value, not a code change to the route itself.
- **Files modified:** `tests/checkout-shipping.test.ts`
- **Verification:** All 5 tests in `tests/checkout-shipping.test.ts` pass; full suite 180/180.
- **Committed in:** `bd95cad` (Task 2 commit)

**2. [Test-authoring correction, not a production-code bug] Two self-inflicted test bugs found and fixed during Task 1's own RED/GREEN cycle**
- **Found during:** Task 1, first GREEN run of the newly-written tests against the newly-written implementation
- **Issue A:** The raw-body-fidelity test asserted `constructEvent` was called with `expect.any(String)` as the third argument (the webhook secret), but `STRIPE_WEBHOOK_SECRET` was never set in the test environment, so the implementation correctly passed `undefined` — the *test* was wrong, not the route.
- **Issue B:** The "missing `metadata.orderId`" test called the test helper with `undefined` as an explicit second argument, but the helper's JS default-parameter (`metadata = { orderId: "order_1" }`) still substitutes the default when `undefined` is passed explicitly — so the test was accidentally exercising the "has metadata" path.
- **Fix:** Set a realistic `STRIPE_WEBHOOK_SECRET` test value in `beforeEach`/restored in `afterEach`; changed the helper to accept `null` (not relying on default-parameter substitution) to explicitly signal "no metadata object at all."
- **Files modified:** `tests/stripe-webhook.test.ts` (during Task 1, before its commit — not a separate deviation from a later task)
- **Verification:** All 11 tests pass after the fix.
- **Committed in:** `7200203` (Task 1 commit — these were test-authoring corrections made during RED/GREEN, not a separate deviation after commit)

---

**Total deviations:** 1 auto-fixed production-adjacent issue (Rule 3, a sibling test file), plus test-authoring self-corrections during Task 1's own TDD cycle (not scope creep — no production code affected).
**Impact on plan:** No architectural changes. No files outside the plan's stated scope were touched except the one sibling test file, fixed because this plan's own change (the fail-loud origin guard) broke it.

## Issues Encountered

None beyond the auto-fixed items above.

## User Setup Required (deferred to 11-07 per this plan's own verification section)

- Register the production Stripe webhook endpoint (`https://<vercel-app>/api/stripe/webhook`, subscribed to `checkout.session.completed` only) and set its signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel.
- Confirm `NEXTAUTH_URL` is set in every deployed environment (preview and production) so the new fail-loud origin guard in `app/api/checkout/route.ts` never trips against a real customer.
- Local end-to-end verification (owner, TEST keys per D-11): run `stripe listen --forward-to localhost:3000/api/stripe/webhook`, set the printed `whsec_...` as `STRIPE_WEBHOOK_SECRET`, complete a test-card checkout, confirm the order flips `pending -> paid` and a send appears in the Resend log; re-send the same event via the Stripe CLI and confirm no second write/email (idempotency). Not exercised in this session — this plan's automated tests fully mock Stripe and require no real secret to pass.

## Next Phase Readiness

- `/api/stripe/webhook` and both D-06 call sites are complete and unit-tested; LIVE-02 (server-side payment confirmation) and the send-side of LIVE-03 (confirmation email fired at the moment an order becomes paid) are both now actually true, not just scaffolded.
- Plan 11-07 (deployment) inherits two explicit pre-launch checklist items (D-12) from this plan: register the production Stripe webhook endpoint with its signing secret, and confirm `NEXTAUTH_URL` in every deployed environment.
- The `/order/success` page's "We'll send a confirmation shortly" promise is now literally true for both the demo/stub path and the real Stripe path.

---

*Phase: 11-go-live*
*Completed: 2026-08-31*

## Self-Check: PASSED

All created files verified present on disk (`app/api/stripe/webhook/route.ts`, `tests/stripe-webhook.test.ts`, this SUMMARY). Both task commits (`7200203`, `bd95cad`) verified present in `git log --oneline --all`. `lib/email.ts` and `.env.example` confirmed untouched by this plan (`git log --oneline -- lib/email.ts .env.example` shows only 11-04's and 11-01's commits respectively).
