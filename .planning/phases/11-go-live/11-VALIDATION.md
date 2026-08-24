---
phase: 11
slug: go-live
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-24
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest `^4.1.10` |
| **Config file** | `vitest.config.ts` (jsdom environment, globals on, `include: ["tests/**/*.test.{ts,tsx}"]`) |
| **Quick run command** | `npx vitest run tests/<file>.test.ts` |
| **Full suite command** | `npm test` (→ `vitest run`) |
| **Estimated runtime** | ~55 seconds (observed on full suite as of Phase 10) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/<file>.test.ts` for the file(s) touched
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-xx-xx | TBD | TBD | LIVE-01 | Elevation of Privilege (demo-login truthiness footgun) | `ALLOW_DEMO_LOGIN` gate uses strict `=== "true"`, excludes demo provider when unset/false | unit | `npx vitest run tests/auth.test.ts` | ❌ Wave 0 | ⬜ pending |
| 11-xx-xx | TBD | TBD | LIVE-02 | Spoofing (forged webhook payload) | `/api/stripe/webhook` rejects invalid/missing signature with 400 | unit | `npx vitest run tests/stripe-webhook.test.ts` | ❌ Wave 0 | ⬜ pending |
| 11-xx-xx | TBD | TBD | LIVE-02 | — | Webhook is idempotent — duplicate `checkout.session.completed` on an already-`paid` order is a safe no-op (no duplicate email) | unit | `npx vitest run tests/stripe-webhook.test.ts` | ❌ Wave 0 | ⬜ pending |
| 11-xx-xx | TBD | TBD | LIVE-03 | — | `sendOrderConfirmation` is a safe no-op when `RESEND_API_KEY` is unset | unit | `npx vitest run tests/email.test.ts` | ❌ Wave 0 | ⬜ pending |
| 11-xx-xx | TBD | TBD | LIVE-03 | — | `sendOrderConfirmation` calls Resend with expected `to`/`from`/`react` shape when configured | unit | `npx vitest run tests/email.test.ts` | ❌ Wave 0 | ⬜ pending |
| 11-xx-xx | TBD | TBD | LIVE-04 | Information Disclosure (IDOR) | Order history query scopes by `userId`, not by email | unit | `npx vitest run tests/orders.test.ts` (extend existing) | ✅ (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Task IDs are `TBD` pending the planner's actual plan/wave assignment — the planner must fill these in as tasks are created, per the Phase Requirements → Test Map in `11-RESEARCH.md`.

---

## Wave 0 Requirements

- [ ] `tests/auth.test.ts` — new file; covers `ALLOW_DEMO_LOGIN`/`hasGoogle` provider-array-construction logic (LIVE-01). Recommend extracting a pure `buildProviders({ hasGoogle, allowDemoLogin })` helper so it's testable without instantiating real NextAuth providers.
- [ ] `tests/stripe-webhook.test.ts` — new file; mocks `stripe.webhooks.constructEvent` to test signature-failure (400) and idempotent-no-op paths without a real Stripe event or DB (LIVE-02).
- [ ] `tests/email.test.ts` — new file; mocks the `Resend` client to test `sendOrderConfirmation`'s no-key-no-op branch and its call-shape when configured (LIVE-03).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth sign-in works end-to-end | LIVE-01 | Requires a live Google Cloud project + OAuth redirect round-trip; no meaningful local unit test | UAT click-through per `11-OWNER-SETUP.md` — sign in with a test-user Google account added to the OAuth consent screen |
| Real Stripe test-card payment marks order paid via webhook | LIVE-02 | Requires a live Stripe test-mode checkout session + registered webhook endpoint | Use test card `4242 4242 4242 4242` (any future expiry/CVC/postcode) per `11-OWNER-SETUP.md`; confirm `Order.status` transitions to `paid` and confirmation email fires |
| `/account/orders/[id]` returns 404 for another user's order id (IDOR) | LIVE-04 | No integration-test DB harness exists this phase; needs two real signed-in sessions | Sign in as two different test accounts, confirm each can only view their own order detail page |
| `prisma migrate deploy` applies cleanly against a fresh Neon database | LIVE-05 | No local Postgres available on this dev machine to pre-verify | Run `npx prisma migrate deploy` against the real (or a scratch) Neon branch before first production traffic; confirm zero errors |
| Deployed app responds 200 on its public Vercel URL | LIVE-06 | Requires actual deployment | Owner verifies post-deploy by visiting the `*.vercel.app` URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`tests/auth.test.ts`, `tests/stripe-webhook.test.ts`, `tests/email.test.ts`)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
