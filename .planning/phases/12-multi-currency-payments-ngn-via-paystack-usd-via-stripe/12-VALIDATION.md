---
phase: 12
slug: multi-currency-payments-ngn-via-paystack-usd-via-stripe
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-13
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `12-RESEARCH.md` → "## Validation Architecture". The planner fills task IDs into the map below.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 + @testing-library/react 16 + jest-axe, jsdom 29 (default env; `// @vitest-environment node` per file for middleware / PostCSS / route tests that need it) |
| **Config file** | `vitest.config.ts` (`include: tests/**/*.test.{ts,tsx}`) |
| **Quick run command** | `npx vitest run <files touched by the task>` (+ `npx tsc --noEmit` when types change) |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` (run alone, never concurrently with tsc) |
| **Estimated runtime** | ~80 seconds (vitest ~70 s + tsc ~8 s) |

Baseline before this phase: `tsc` clean, 31 test files / 304 tests green.

---

## Sampling Rate

- **After every task commit:** quick run for the touched test files
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green, `tsc` clean
- **Max feedback latency:** 80 seconds

---

## Per-Task Verification Map

Requirement-level map. The planner assigns `{12-PP-TT}` task IDs and threat refs per PLAN.md.

| Requirement | Behavior proven | Test Type | Automated Command | File Exists | Status |
|-------------|-----------------|-----------|-------------------|-------------|--------|
| CURR-01 | `parseCurrency` allow-list; `currencyFromCountry`; `formatMoney` exact strings (`₦45,000`, `$35`, `₦0`); before-paint `CURRENCY_SCRIPT` sets `data-currency` only for valid cookie values | unit | `npx vitest run tests/currency.test.ts` | ❌ W0 | ⬜ pending |
| CURR-01 | Middleware sets `nostalgia-currency` on first visit (NG / other / absent header), leaves valid cookie alone; matcher compiled + tested (backslash trap); /admin branch unchanged | unit (node) | `npx vitest run tests/currency-middleware.test.ts tests/admin-middleware.test.ts` | ❌ W0 / ✅ | ⬜ pending |
| CURR-01 | Compiled `globals.css` keeps the unlayered currency visibility rule | unit (PostCSS) | `npx vitest run tests/currency-css.test.ts` | ❌ W0 | ⬜ pending |
| CURR-01 | `<Money>` renders both spans; toggle writes cookie, flips attribute, `router.refresh()`, `aria-pressed` + name | component | `npx vitest run tests/money.test.tsx tests/currency-toggle.test.tsx` | ❌ W0 | ⬜ pending |
| CURR-01 | Cart/wishlist normalisers drop legacy single-`price` entries; per-currency subtotals; catalog where/orderBy use `priceNgn`/`priceUsd` with major→minor `?price=` | unit | `npx vitest run tests/cart.test.ts tests/wishlist.test.ts tests/catalog.test.ts` | ❌ W0 / ✅ update | ⬜ pending |
| CURR-02 | `autoUsdMinor` boundary table + fuzz vs BigInt oracle + never-undercharges property; `isValidRate` bounds | unit | `npx vitest run tests/currency.test.ts` | ❌ W0 | ⬜ pending |
| CURR-02 | Settings action: `requireOwner()` first, rate validation, `$transaction` (upsert + parameterized `$executeRaw` recompute), revalidation; product actions parse ₦ required / $ optional major units ×100, reject bad input | unit | `npx vitest run tests/admin-settings.test.ts tests/admin-product-placement.test.ts tests/slug.test.ts` | ❌ W0 / ✅ update | ⬜ pending |
| PAYM-01 | `verifyWebhookSignature` matrix; `evaluatePaystackTransaction` matrix (paid / failed / pending / amount, currency, provider, reference mismatch) | unit | `npx vitest run tests/paystack-verify.test.ts` | ❌ W0 | ⬜ pending |
| PAYM-01 | `lib/paystack.ts` request shape (URL, bearer, string amount, reference, callback_url, `metadata.cancel_action`, timeout) + error mapping | unit (fetch stub) | `npx vitest run tests/paystack.test.ts` | ❌ W0 | ⬜ pending |
| PAYM-01 | Webhook route: bad signature writes nothing; non-`charge.success` no-op; mismatch no-op; match → `markOrderPaid` once; always 200 after signature | route | `npx vitest run tests/paystack-webhook.test.ts` | ❌ W0 | ⬜ pending |
| PAYM-01 | Callback route: verified success → `/order/success`; everything else → `/checkout?payment=…`; redirect host always `NEXTAUTH_URL` | route | `npx vitest run tests/paystack-callback.test.ts` | ❌ W0 | ⬜ pending |
| PAYM-01, PAYM-02 | `markOrderPaid` exact CAS `where`; email only on `count === 1` | unit | `npx vitest run tests/payments.test.ts` | ❌ W0 | ⬜ pending |
| PAYM-02 | Stripe webhook: `payment_status`, amount, currency, provider mismatches → no write/email; match → one `markOrderPaid`; existing signature cases kept | route | `npx vitest run tests/stripe-webhook.test.ts` | ✅ rewrite | ⬜ pending |
| PAYM-02 | `resolveProvider` matrix; checkout Stripe branch `currency: "usd"`, line-item sum equals `Order.total` | unit / route | `npx vitest run tests/payment-provider.test.ts tests/checkout-route.test.ts` | ❌ W0 | ⬜ pending |
| SHIP-01 | `calculateShipping` 2 zones × 2 currencies × threshold boundaries; `validateAddress`; `parseShippingAddress`; checkout 400 on bad address; address rendered in admin/account/email | unit / component | `npx vitest run tests/shipping.test.ts tests/address.test.ts tests/orders.test.ts tests/checkout-route.test.ts tests/email.test.ts tests/account-order-detail.test.tsx` | ❌ W0 / ✅ update | ⬜ pending |
| ORDR-01 | Orders persist currency + provider; production stub → 503 without `ALLOW_DEMO_CHECKOUT`; displays/emails use order currency (legacy USD fallback); analytics carry currency; JSON-LD two Offers | unit / route / component | `npx vitest run tests/checkout-route.test.ts tests/payment-provider.test.ts tests/email.test.ts tests/account-orders.test.tsx tests/account-order-detail.test.tsx tests/seo.test.ts tests/analytics.test.ts` | mix | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New test files: `currency`, `currency-middleware`, `currency-css`, `money`, `currency-toggle`, `cart`, `shipping`, `address`, `payment-provider`, `paystack-verify`, `paystack`, `paystack-webhook`, `paystack-callback`, `payments`, `checkout-route`, `admin-settings`
- [ ] Rewrite `tests/checkout-shipping.test.ts` (→ `checkout-route`) and `tests/stripe-webhook.test.ts`; update `email`, `seo`, `catalog`, `wishlist`, `admin-product-placement`, `slug`, `account-*` in the same plan that changes their code
- [ ] Framework install: none

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Paystack hosted checkout (TEST): success, decline, cancel | PAYM-01 | Third-party hosted page | Pay ₦ with `4084 0840 8408 4081` → `/order/success`, order paid once, one email. Decline `4084 0800 0000 5408` → no paid. "Cancel payment" → `/checkout?payment=cancelled`, cart intact |
| Real redirects + webhook delivery on Vercel | PAYM-01 | Needs deployed URL + Paystack dashboard | Register `https://<domain>/api/paystack/webhook`; close tab before redirect → still paid via webhook; repeat callback visit sends no second email; `data.amount` equals order total (merchant bears fees) |
| Stripe TEST (USD) | PAYM-02 | Third-party hosted page | Pay $ with a Stripe test card → webhook flips to paid; order records USD + stripe |
| Geo cookie on Vercel | CURR-01 | Needs Vercel geo header | Non-NG first visit shows $ without flash; NG/unknown shows ₦; cookie `SameSite=Lax`, 1 year, not HttpOnly |
| In-browser currency toggle | CURR-01 | Visual / hydration | Toggle on home, shop, PDP, cart, drawer, checkout, wishlist: no flash on reload, no hydration warnings, cart untouched, /shop price sort + filter follow currency |
| Admin pricing + rate | CURR-02 | Owner UI | Set ₦ + optional $; change rate → auto $ prices move; order detail shows currency/provider/address |
| Migration on Neon | CURR-02, ORDR-01 | Production database (owner checkpoint D-30) | Rehearse on a Neon branch, apply, spot-check backfilled ₦ prices, `Order.currency = 'USD'` on legacy rows, StoreSettings row |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 80s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
