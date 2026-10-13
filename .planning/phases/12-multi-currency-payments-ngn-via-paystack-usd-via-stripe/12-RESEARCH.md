# Phase 12: Multi-currency payments — NGN via Paystack, USD via Stripe - Research

**Researched:** 2026-10-13
**Domain:** Multi-currency storefront (Next.js 14.2.35 App Router, Prisma 5.22 on Neon Postgres, NextAuth v4, stripe@17.7.0), Paystack REST integration, Edge middleware cookie, before-paint CSS currency switching, Postgres migration/backfill
**Confidence:** HIGH on code/DB/Next/Intl/Stripe findings (verified by running things in this session); MEDIUM on Paystack behaviours that the official docs do not spell out (listed explicitly in Assumptions Log and Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

> Copied verbatim in substance from `12-CONTEXT.md`. D-01 to D-32 are LOCKED. Research below answers HOW, never WHETHER.

### Locked Decisions

**Money & currencies**
- **D-01:** Exactly two currencies, `NGN` (primary and default) and `USD`, held in one allow-list in a new **pure, Prisma-free `lib/currency.ts`** (same discipline as `lib/orders.ts` / `lib/shipping.ts`). Every amount in the system is an **integer in minor units** (kobo / cents, both 1/100). Any currency string from a client, cookie or provider is checked against the allow-list before use.
- **D-02:** One formatter, `formatMoney(amountMinor, currency)`, built on `Intl.NumberFormat` with whole units ("₦45,000", "$35"). It replaces **both** `formatPrice` in `lib/products.ts` and the duplicated `formatCents` in `lib/email-content.ts`. Because `lib/currency.ts` is Prisma-free, the email module can import it directly, which ends that documented duplication.

**Product pricing (owner chose "₦ required, $ optional")**
- **D-03:** `Product` carries three price columns: `priceNgn Int` (kobo, **required**, typed by the owner); `priceUsdOverride Int?` (cents, optional hand-set dollar price); `priceUsd Int` (cents, the **effective** dollar price the storefront, sorting, filtering and checkout read; equals the override when set, otherwise the naira price converted at the store rate; maps onto the existing `price` column via `@map("price")` so no column rename is needed and the existing price index keeps working). Add an index on `priceNgn`.
- **D-04:** Auto dollar price = naira ÷ rate, **rounded UP to the next whole dollar** (never undercharges), integer-safe: `Math.ceil(kobo / (rate * 100)) * 100`. One pure helper in `lib/currency.ts` is the only implementation the app uses. The bulk recompute SQL (D-06) must produce identical numbers, and a test must prove it on boundary values.
- **D-05:** Store exchange rate lives in a new singleton **`StoreSettings`** row (`id = 1`, `usdNgnRate Int` = whole naira per $1, `updatedAt`). The migration seeds it at **₦1,500 = $1 (PLACEHOLDER; the owner sets the real rate)**. Valid range 100–100,000.
- **D-06:** Owner-gated **`/admin/settings`** page edits the rate. Saving it recomputes the effective `priceUsd` of every product **without** an override in **one parameterized SQL UPDATE** (`$executeRaw` tagged template, never string-built), then revalidates the storefront routes. Product create/update computes `priceUsd` the same way at save time.
- **D-07:** Admin product form takes **"Price (₦)" (required)** and **"Price ($), optional"** in **major units**. The server multiplies by 100 and validates non-negative integers. The dollar field's helper text previews the auto price at the current rate ("Leave blank to use the rate: $34"). Replaces today's "Price (cents)" input. The admin product table shows both prices and marks rate-following dollar prices as "auto".
- **D-08:** Migration backfill: `priceUsdOverride` = current `price`; `priceNgn` = current price × 1,500 rounded to nearest ₦500; owner reviews in /admin; existing orders backfilled `currency = 'USD'`.

**Choosing the currency (shopper side)**
- **D-09:** Active currency lives in cookie **`nostalgia-currency`** (`NGN`|`USD`, 1 year, `SameSite=Lax`, path `/`, not httpOnly). First visit: **middleware** sets it from `x-vercel-ip-country` (`NG` → NGN, any other → USD, header absent → NGN). Matcher widens from `/admin/:path*` to page routes (excluding `_next`, `api`, static files, `/media`). **The /admin auth branch must behave exactly as today**, existing tests stay green.
- **D-10:** Every price renders through one **`<Money>`** that outputs BOTH currencies' text, CSS shows only the active one. A blocking inline `<head>` script sets `data-currency` on `<html>` from the cookie before first paint (same idiom as `THEME_SCRIPT` / `SESSION_HINT_SCRIPT`). Static pages stay static, no hydration mismatch, no flash, instant switching. Hidden span uses `display:none`. No `data-currency` attribute means NGN.
- **D-11:** Currency toggle in the Nav beside `ThemeToggle` ("₦ NGN" / "$ USD", accessible name and pressed state). Switching writes the cookie, flips `data-currency` on `<html>`, updates a small client `CurrencyContext`, calls `router.refresh()`.
- **D-12:** Server code that needs the currency (only /shop and collection price sort/filter) uses a `getCurrency()` server helper: cookie, then geo header, then NGN, all through the allow-list. Those routes are already `force-dynamic`, so the root layout must **not** start reading cookies.

**Cart & wishlist**
- **D-13:** Cart and wishlist items snapshot **both** prices (`prices: { NGN, USD }`). Subtotals computed per currency, rendered with `<Money>`. Switching currency never touches the cart. Legacy localStorage entries without both prices are **discarded on load** (`nostalgia-cart`, `nostalgia-wishlist`).
- **D-14:** Cart page and drawer show **"Calculated at checkout"** for shipping. Checkout shows the real fee once a country is chosen (default Nigeria).

**Checkout, delivery address & shipping**
- **D-15:** `/checkout` gains a delivery-address form before "Pay now": full name, phone (required), address line 1, line 2 (optional), city, state/region, postal code (optional), country (select, default Nigeria). Nigeria: state is a select of the 36 states + FCT; other countries free-text region. Client validation is UX only; **the server validates authoritatively** (required fields, length caps, phone character set, country against an ISO-3166 alpha-2 allow-list, NG state against the state list).
- **D-16:** Shipping priced by **zone × currency** in `lib/shipping.ts` (single pure source of truth). Zones: `domestic` (country `NG`) and `international`. New signature `calculateShipping(subtotalMinor, currency, country)`. Placeholder rates (flag for owner): domestic ₦5,000 fee, free from ₦250,000 / $5 fee, free from $200; international ₦60,000 fee, free from ₦750,000 / $40 fee, free from $500. Hardcoded "$200" copy (PDP, TrustStrip, `/shipping`) renders from these constants through `<Money>`.
- **D-17:** `POST /api/checkout` accepts `{ items, currency, address }`: validates currency and address, recomputes every unit price from the DB in that currency, computes shipping via `calculateShipping`, persists the `Order` with `currency`, `paymentProvider`, `shippingAddress`, `total`, then hands off to the provider. "Never trust client totals" stays.

**Payment providers**
- **D-18:** NGN → Paystack, USD → Stripe. Optional env switch **`USD_PAYMENT_PROVIDER`** (`stripe` default | `paystack`), strict string equality like `ALLOW_DEMO_LOGIN`.
- **D-19:** **Paystack via REST `fetch`** (no SDK) in new `lib/paystack.ts`, null-if-no-key idiom (`PAYSTACK_SECRET_KEY`). `initializeTransaction` sends email, amount in minor units, currency, `reference` = order id, `callback_url`, `metadata.orderId`, and a cancel-return URL if Paystack supports one. `verifyTransaction(reference)`. Hosted redirect checkout, not popup. Origin from `NEXTAUTH_URL` with **no fallback** (Phase 11 D-09).
- **D-20:** **`POST /api/paystack/webhook`**: raw body, verify `x-paystack-signature` (HMAC-SHA512 with the secret key), **timing-safe compare** before parsing; act only on `charge.success`; look up order by `data.reference`; require `data.status === "success"`, `data.amount === order.total`, `data.currency === order.currency`, `order.paymentProvider === "paystack"`; then shared `markOrderPaid`; always 200 once signature verified.
- **D-21:** **`GET /api/paystack/callback`**: takes `reference`, calls `verifyTransaction` server-side, same checks as D-20; success → `markOrderPaid` then redirect `/order/success?order=<id>`; anything else → redirect `/checkout?payment=failed` (or `cancelled`) with a calm "you weren't charged, try again" notice.
- **D-22:** New **`lib/payments.ts` → `markOrderPaid(orderId, { provider, amount, currency })`**: atomic compare-and-set `prisma.order.updateMany({ where: { id, status: "pending", total: amount, currency, paymentProvider: provider }, data: { status: "paid" } })`; send the shared confirmation email **only when `count === 1`**. The Stripe webhook switches to it too, gaining checks for `session.payment_status === "paid"`, `session.amount_total === order.total`, `session.currency === order.currency.toLowerCase()`.
- **D-23:** Stripe flow otherwise unchanged (`currency` from `order.currency.toLowerCase()`, line items as today incl. shipping line when > 0). Stripe's own address collection is **not** used.
- **D-24:** **Demo/stub checkout closed on production.** When the chosen provider has no key, the stub (order as paid + shared confirmation email + `demo=1`) runs only if `ALLOW_DEMO_CHECKOUT === "true"` or `NODE_ENV !== "production"`; otherwise **503 `payments_unavailable`** and no order. Strict-equality flag idiom.

**Orders, emails, account & admin**
- **D-25:** `Order` gains `currency String @default("USD")`, `paymentProvider String?` (`paystack`|`stripe`|`demo`, app-level allow-list), `shippingAddress String?` (JSON snapshot, parsed defensively by a helper in `lib/orders.ts`). `total` documented as minor units of `currency`.
- **D-26:** Every order display formats with **the order's own currency** (account OrderList/OrderDetail, admin OrderTable and detail, confirmation email incl. delivery-address block). Admin order detail also shows address, currency and provider. Totals never summed across currencies.
- **D-27:** Checkout trust line names the provider ("Secure checkout · Paystack" / "· Stripe"). `begin_checkout` and `purchase` analytics gain a `currency` field; payload stays non-PII.

**Catalog & SEO**
- **D-28:** /shop and collection **price sort and `?price=` filter use the active currency's column**; `?price=min-max` read in **major units**. Filter inputs show the currency symbol.
- **D-29:** Product JSON-LD `offers` becomes **two Offers (NGN and USD)** with the same availability.

**Data migration & environment**
- **D-30:** **Hand-authored Prisma migration; never `prisma migrate dev`** (local `.env` points at PRODUCTION Neon). Generate SQL offline with `prisma migrate diff --from-schema-datamodel <old> --to-schema-datamodel <new> --script`, add backfill + `StoreSettings` seed by hand. `prisma validate`/`generate` fine locally. **Applying to Neon is a blocking owner checkpoint.** On deploy, Vercel's `prisma migrate deploy` applies it.
- **D-31:** New env vars `PAYSTACK_SECRET_KEY` (sk_test_ for UAT), optional `USD_PAYMENT_PROVIDER`, optional `ALLOW_DEMO_CHECKOUT`. Paystack webhook URL registered in dashboard. **`.env.example` is deny-listed**; document every variable in new `12-OWNER-SETUP.md`.
- **D-32:** Phase completion = **deployed and UAT-ready on Paystack TEST + Stripe TEST keys**. Live keys are an owner action.

### Claude's Discretion
- File/module layout beyond the files named above, component names, and the internal shape of `<Money>` and the toggle.
- Country list source (static ISO list vs `Intl.DisplayNames` for names) and the Nigerian states list file.
- Exact copy for the failed/cancelled-payment notice and helper texts (within the locked design system: cream/ink/sepia, Fraunces/Inter, existing button/input classes).
- Test file organization, as long as every new pure module and route handler gets unit tests in the existing Vitest mock style (see `tests/stripe-webhook.test.ts`, `tests/checkout-shipping.test.ts`).

### Deferred Ideas (OUT OF SCOPE)
- More African currencies (GHS, KES, ZAR). Admin-editable shipping rates. Saved addresses / address book. Refunds via provider APIs. Live FX feed. VAT calculation. Verve/Paystack marks in footer `PaymentMarks`.
- **Stock decrement on payment + server-side sold-out rejection at checkout** (deferred from Phase 9 D-10; `markOrderPaid` is the natural future home; flag to owner as a go-live overselling risk).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CURR-01 | Shopper sees every price in naira by default (dollars outside Nigeria), can switch anywhere; cart, checkout and order use the chosen currency | Middleware cookie + `x-vercel-ip-country` (Q4), dual-render `<Money>` + before-paint script + unlayered CSS (Q5), `Intl` output matrix (Q3), full render-site inventory (Q5/Q11), cart/wishlist snapshot normalisation (Q11) |
| CURR-02 | Owner sets ₦ price (required) + optional $ price; blank $ follows a store rate set in admin | Prisma schema + offline-generated, **PGlite-verified** migration/backfill SQL (Q6), `autoUsdMinor` proof and exact `$executeRaw` statement run through the real Prisma client (Q7), admin action mass-assignment pattern (Q11) |
| PAYM-01 | Naira orders via Paystack; paid only by verified callback or signed webhook whose amount and currency match | Paystack API facts (Q1), signature code (Q1), shared `evaluatePaystackTransaction` predicate, `markOrderPaid` CAS (Q8), callback/webhook test design (Q10) |
| PAYM-02 | Dollar orders via Stripe (or Paystack USD via config switch), paid only by signed Stripe webhook whose amount and currency match | Stripe typings check (Q2), `USD_PAYMENT_PROVIDER` routing, Paystack USD caveats (Q1), `markOrderPaid` (Q8) |
| SHIP-01 | Delivery address at checkout; shipping priced by destination in order currency; address visible in admin, account, email | State list + ISO list + phone rule (Q9), `calculateShipping(subtotal, currency, country)` zone table, `parseShippingAddress` in `lib/orders.ts`, email block (Q11) |
| ORDR-01 | Orders record currency + provider; every display/email uses order currency; production never creates unpaid demo orders | Order columns (Q6), `formatMoney` per-order currency, legacy fallback `USD`, `ALLOW_DEMO_CHECKOUT` gate (Q10/Q11), Vercel `NODE_ENV` note |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` or `./.claude/CLAUDE.md` exists in the project. Directives that DO apply and are treated with CLAUDE.md authority:

- **Aesthetic LOCKED** (cream/ink/sepia, Fraunces/Inter, grain). Tech stack LOCKED (Next 14 App Router / TS / Tailwind / Prisma / NextAuth / Stripe). `[VERIFIED: .planning/STATE.md]`
- **Project skill `neon-postgres`** (`.claude/skills/neon-postgres/SKILL.md`): pooled URL for app runtime, **direct URL for migrations**, branches are instant copy-on-write clones, manage schema as code and avoid ad-hoc migrations against the DB. `[VERIFIED: file read]`
- **Environment hard limits (from the orchestrator):** `.env` points at PRODUCTION Neon; never run `prisma migrate dev|deploy`, `db push`, `npm run seed` or anything that connects to the DB. `.env`/`.env.example` are deny-listed (do not plan edits to `.env.example`; use `12-OWNER-SETUP.md`). Do not run `next build` (dev server on :3002 shares `.next`). `npx vitest run` and `npx tsc --noEmit` are fine.
- `prisma/seed.ts` does `order.deleteMany()` / `product.deleteMany()`: it is destructive and must never be run against the production DB. It still has to be edited so `tsc` stays green (it writes `price:`).

## Summary

The phase is large but well-bounded, and every moving part has a verified, low-risk implementation path. The most important new facts: (1) **Paystack's own docs are explicit** about the pieces D-19 to D-21 depend on: `callback_url` per transaction, `metadata.cancel_action` for the cancel redirect, the `x-paystack-signature` header (HMAC-SHA512 of the payload with the secret key), retries (live: every 3 min for 4 tries then hourly for 72 h; test: hourly for 10 h; 30 s timeout), and the instruction to verify status **and amount** before delivering value. (2) `Intl.NumberFormat("en-US", {currencyDisplay:"narrowSymbol"})` is the only locale/option pair that prints exactly `₦45,000` and `$35`; the obvious `en-NG` prints `US$35` and `en-US` default prints `NGN 45,000`. (3) The migration SQL that `prisma migrate diff` generates **cannot be applied as-is** (`priceNgn INTEGER NOT NULL` with no default fails on a non-empty table); the hand-authored version in this document (nullable add, backfill, `SET NOT NULL`, singleton seed) was executed end to end against real Postgres semantics (PGlite) on top of all four existing migrations with legacy rows, and the recompute statement plus the `updateMany` compare-and-set were run through the real Prisma 5.22 client against that database. (4) A Next.js matcher trap: the `.*\\..*` file-extension exclusion must contain exactly one backslash in the pattern string (written `"\\."` in TS), and gating the page matcher on `missing: [{type:"cookie"}]` means the middleware only runs on a visitor's first request.

Two risks need owner attention rather than engineering: **Stripe availability for a Nigeria-registered business is unverified** (the D-18 `USD_PAYMENT_PROVIDER=paystack` switch may become the primary dollar path; Paystack USD requires international payments enabled and a Zenith USD domiciliary account, ~3.9% fee), and **stock is still never decremented** (overselling), already flagged as deferred.

**Primary recommendation:** Build the pure layers first (`lib/currency.ts`, `lib/shipping.ts`, `lib/address.ts`, `lib/paystack-verify.ts` with one shared `evaluatePaystackTransaction` predicate, `lib/payments.ts` `markOrderPaid`), land the schema/migration behind the owner checkpoint (test it on a Neon branch copy first), then wire routes, then the UI sweep driven by the render-site inventory in Q5. Keep every money rule in one pure function that the UI, route and webhook all import (the lesson from the `lib/shipping.ts` header).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| First-visit currency default (geo) | CDN / Edge middleware | Frontend server (`getCurrency()` fallback) | Only the edge sees `x-vercel-ip-country` before caching; server fallback covers the same-request render |
| Active-currency display (which price is visible) | Browser (inline script + CSS) | — | Needs to be instant, flash-free, and must not make static pages dynamic |
| Currency persistence + toggle | Browser (cookie + context) | Frontend server (`router.refresh()` re-reads cookie) | Cookie is the single source; client code reads it for checkout POST/analytics |
| Price truth (what is charged) | API / Backend (`/api/checkout`) | Database | Prices are recomputed from DB in the order currency; client totals are display only |
| Exchange-rate conversion (auto USD) | Database (bulk UPDATE) + pure lib helper | API (admin actions) | Bulk recompute must be one SQL statement; per-product at save time uses the same helper |
| Shipping fee | Pure lib (`lib/shipping.ts`) | API charges it, UI displays it | Single function prevents the documented UI/API drift bug |
| Address validation | API / Backend (authoritative) | Browser (UX only) | Server validates against ISO list / NG states / lengths |
| Payment initiation | API / Backend | External (Paystack / Stripe hosted pages) | Secret keys server-only; hosted redirect checkout |
| Payment confirmation (truth) | API / Backend (signed webhooks + server-side verify) | Database (atomic CAS) | Browser redirects are never trusted; `markOrderPaid` is the only writer of `paid` |
| Confirmation email | API / Backend (`sendOrderConfirmation`) | — | Fired only on the CAS winner |
| Order/amount display | Frontend server / client | — | Always formatted with the order's own currency, never the shopper's toggle |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 14.2.35 (installed) | App Router, middleware, route handlers | Locked stack `[VERIFIED: node_modules/next/package.json]` |
| @prisma/client + prisma | 5.22.0 (installed) | ORM, `$executeRaw`, `updateMany` CAS | Locked stack; CAS and raw recompute were executed against it this session `[VERIFIED: run]` |
| stripe | 17.7.0 (installed) | USD Checkout Sessions + webhook verification | Locked stack; `Session.payment_status`, `amount_total`, `currency` typings confirmed `[VERIFIED: node_modules/stripe/types/Checkout/Sessions.d.ts]` |
| Node built-in `fetch` + `AbortSignal.timeout` | Node 20+ | Paystack REST calls | D-19: no SDK dependency |
| Node built-in `crypto` | built-in | HMAC-SHA512 + `timingSafeEqual` | Standard; never hand-roll |
| Intl.NumberFormat / Intl.DisplayNames | built-in (ICU 78.2 locally) | Money formatting, country names | Runs identically in Node and modern browsers `[VERIFIED: run on Node 24.14.1]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.10 (installed) | Unit tests | All new pure modules + routes |
| next-auth/jwt | installed | `getToken` in the admin branch of the middleware | Unchanged |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| plain `fetch` to Paystack | `@paystack/paystack-sdk` 1.2.1 (npm, modified 2026-08-24) | Rejected by D-19. Also flagged `SUS` by the legitimacy seam (`no-repository`, ~2k weekly downloads). Two thin endpoints do not justify a dependency |
| JS "oracle" test for D-04 SQL parity | `@electric-sql/pglite` as a devDependency | See Don't Hand-Roll / Validation. Optional; the one-time real-Postgres proof is already recorded in this document |

**Installation:** none. This phase adds **no new runtime or dev dependencies** (recommended).

**Version verification:** `npm view @paystack/paystack-sdk version` → 1.2.1; `npm view stripe version` → 23.0.0 (registry latest; project is pinned to ^17.4.0 / 17.7.0 installed and must not be bumped in this phase). `[VERIFIED: npm registry, 2026-10-13]`

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none added to the project) | — | — | — | — | — | No installs recommended |
| @paystack/paystack-sdk | npm | — (v1.2.1, 2026-08-24) | ~2k/wk | none listed | SUS (`no-repository`) | NOT USED (D-19 plain fetch). Not installed |
| @electric-sql/pglite | npm | v0.5.9 published 2026-10-12 | ~24M/wk | github.com/electric-sql/pglite | SUS (`too-new`: latest version is 1 day old; the project itself is long-established, 4 maintainers, no postinstall) | OPTIONAL devDependency only. If the planner picks it, add a `checkpoint:human-verify` before install and pin to an older vetted exact version. Used in this research only inside a scratch directory outside the project |

**Packages removed due to SLOP verdict:** none
**Packages flagged SUS:** `@paystack/paystack-sdk` (not used), `@electric-sql/pglite` (optional; planner inserts `checkpoint:human-verify` if adopted)

## Architecture Patterns

### System Architecture Diagram

```
                    FIRST VISIT                                   EVERY PAGE VIEW
 Browser ──GET /shop──▶ Edge middleware ──(no nostalgia-currency cookie)──▶ Set-Cookie NGN|USD
    │                    (matcher: missing cookie)   from x-vercel-ip-country
    │                                                               │
    ▼                                                               ▼
 <head> inline script reads cookie ──▶ <html data-currency="USD">   Server components (static or dynamic)
    │   (blocking, before paint)                                    render <Money> = BOTH spans
    ▼                                                               (/shop, collections use getCurrency():
 CSS (unlayered) hides the inactive span  ◀──────────────────────── cookie ▸ geo header ▸ NGN)
    │
    │  Nav toggle ──▶ write cookie + flip data-currency + CurrencyContext + router.refresh()
    ▼
 /checkout (client): items(prices{NGN,USD}) + address form + active currency
    │  POST /api/checkout {items, currency, address}
    ▼
 /api/checkout ── auth ▸ allow-list currency ▸ validate address ▸ reprice from DB(currency column)
    │              ▸ calculateShipping(subtotal, currency, country) ▸ resolveProvider(currency, env)
    │              ▸ no key? ─▶ (ALLOW_DEMO_CHECKOUT|!production) stub paid + email  else 503
    │              ▸ prisma.order.create {currency, paymentProvider, shippingAddress, total, pending}
    ├─ NGN (or USD + USD_PAYMENT_PROVIDER=paystack) ─▶ Paystack /transaction/initialize
    │        reference = order.id, callback_url, metadata{orderId, cancel_action}
    │        ◀─ authorization_url ──▶ browser redirect to Paystack hosted page
    └─ USD ─▶ stripe.checkout.sessions.create(currency = order.currency.toLowerCase())
             ◀─ session.url ──▶ browser redirect to Stripe hosted page

 Paystack hosted page ──success──▶ GET /api/paystack/callback?reference=…  (browser; NOT trusted)
        │                             └▶ verifyTransaction(server→Paystack, secret key)
        │                                evaluatePaystackTransaction(tx, order) ─ok─▶ markOrderPaid ─▶ 303 /order/success
        │                                                                    └─not ok─▶ 303 /checkout?payment=failed|cancelled
        └──charge.success──▶ POST /api/paystack/webhook  (raw body ▸ HMAC-SHA512 timingSafeEqual ▸ parse)
                                └▶ same predicate ▸ markOrderPaid ▸ always 200 once signature ok
 Stripe ──checkout.session.completed──▶ POST /api/stripe/webhook (constructEvent ▸ payment_status/amount_total/currency)
                                └▶ markOrderPaid

 markOrderPaid: updateMany WHERE id,status='pending',total,currency,paymentProvider SET paid
                count==1 ─▶ sendOrderConfirmation(id)   count==0 ─▶ no-op (race loser / replay / mismatch)
```

### Recommended Project Structure

```
lib/
├── currency.ts          # PURE: CURRENCIES, parseCurrency, currencyFromCountry, formatMoney, autoUsdMinor,
│                        #       effectiveUsdMinor, CURRENCY_COOKIE, CURRENCY_SCRIPT, RATE_MIN/RATE_MAX
├── currency-server.ts   # getCurrency() (cookies()/headers() from next/headers) - server only
├── settings.ts          # getUsdNgnRate() / setUsdNgnRate() (Prisma) - NOT imported by pure modules
├── shipping.ts          # PURE: zones x currency table, calculateShipping(subtotalMinor, currency, country), FREE_SHIPPING_OVER
├── address.ts           # PURE: ShippingAddress type, validateAddress(raw) -> {ok,address}|{ok:false,errors}, NIGERIA_STATES
├── countries.ts         # PURE: ISO_COUNTRY_CODES (249) + countryName(code) via Intl.DisplayNames (client display)
├── orders.ts            # + parseShippingAddress(json), PAYMENT_PROVIDERS allow-list (existing file, additive)
├── payment-provider.ts  # PURE: resolveProvider(currency, env), demoCheckoutAllowed(env)  (idiom of lib/auth-flags.ts)
├── paystack-verify.ts   # PURE (no network, no key read): verifyWebhookSignature, evaluatePaystackTransaction
├── paystack.ts          # fetch: initializeTransaction, verifyTransaction, paystackEnabled (null-if-no-key idiom)
├── payments.ts          # markOrderPaid (imports prisma + email)
└── (modified) products.ts, catalog.ts, seo.ts, email-content.ts, wishlist.ts, analytics.ts
components/
├── Money.tsx            # NO "use client": usable from server and client trees
├── CurrencyToggle.tsx   # "use client", sits beside ThemeToggle
context/CurrencyContext.tsx   # "use client", mounted in components/Providers.tsx
middleware.ts            # admin gate (verbatim) + first-visit currency cookie
app/api/paystack/{webhook,callback}/route.ts
app/admin/settings/{page.tsx,actions.ts}
prisma/migrations/2026101x…_multi_currency/migration.sql
```

### Pattern 1: Paystack REST (verified facts, sources in Sources section)

| Question | Answer | Tag |
|----------|--------|-----|
| Initialize endpoint | `POST https://api.paystack.co/transaction/initialize`, headers `Authorization: Bearer <secret>`, `Content-Type: application/json` | `[CITED: docs-v2.production.paystack.co/api/transaction]` |
| Required body | `email` (string), `amount` (documented as **String**, in the subunit of the currency; every official example sends a quoted string, e.g. `"amount": "500000"`) | `[CITED]` |
| Optional body used here | `currency` (defaults to the integration currency), `reference`, `callback_url` (fully qualified URL; overrides the dashboard URL for this transaction), `metadata`, `channels` | `[CITED]` |
| `reference` rules | "Unique transaction reference. Only `-`, `.`, `=` and alphanumeric characters allowed." No max length is documented. A cuid (25 lowercase alphanumerics) is valid | `[CITED]` (no length limit documented: `[ASSUMED]` that 25 chars is fine, which is standard usage) |
| Duplicate reference | Initialize is expected to reject a reference already used. We create a fresh `Order` (new cuid) per checkout, so reuse cannot happen | `[ASSUMED]` |
| Response | `{ "status": true, "message": "Authorization URL created", "data": { "authorization_url": "https://checkout.paystack.com/…", "access_code": "…", "reference": "…" } }` | `[CITED]` |
| `amount` type | Send `String(amountMinor)` to follow the docs. JSON integers are also widely accepted | docs `[CITED]`; integer acceptance `[ASSUMED]` |
| `metadata` type | API reference says "Stringified JSON object"; the metadata page shows a plain JSON object literal for `cancel_action`. Send a plain object `{ orderId, cancel_action }`; if Paystack answers 400, fall back to `JSON.stringify(...)`. Never depend on metadata for correctness: `reference === order.id` is the key | `[CITED]` for both shapes; which one init accepts in JSON bodies `[ASSUMED]` -> UAT item |
| Cancel redirect | **Supported:** `metadata: { cancel_action: "https://…" }` ("You can redirect your users to a chosen URL when they cancel a payment"). Use `${NEXTAUTH_URL}/checkout?payment=cancelled`. What the hosted page does when `cancel_action` is absent is not documented | `[CITED: …/payments/metadata]`; absent-case `[ASSUMED]` |
| Callback redirect | After payment Paystack redirects to `callback_url` and appends the reference. The docs say `?reference=YOUR_REFERENCE`; in practice `?trxref=…&reference=…` (both equal). Read `reference`, fall back to `trxref`. With no `callback_url` (per-transaction or dashboard) the customer is not sent back | `[CITED]` for `reference`; `trxref` `[ASSUMED]` |
| Verify | `GET https://api.paystack.co/transaction/verify/:reference` with the secret key. **`response.status` is the API-call flag; the transaction status is `response.data.status`**. Statuses: `abandoned`, `failed`, `ongoing`, `pending`, `processing`, `queued`, `reversed`, `success` | `[CITED: …/payments/verify-payments]` |
| Verify fields to check | `data.status === "success"`, `data.amount` (kobo/cents integer), `data.currency` ("NGN"), `data.reference`. Sample also has `gateway_response` ("Successful") and `requested_amount` | `[CITED]` |
| **Amount pitfall** | The official verify sample shows `amount: 40333` next to `requested_amount: 30050` and `fees: 10283` (amount = requested + fees, i.e. a fee-bearing setup). With Paystack's default (merchant bears fees) `amount` equals what we requested. D-20's strict `data.amount === order.total` is therefore correct by default but would reject every payment if the owner ever enables "customer bears fees". Mitigation: document in `12-OWNER-SETUP.md` that fee-bearer must stay on merchant; UAT verifies `amount` equals the order total in test mode. Optionally also accept `requested_amount === order.total` (decide once, test both branches) | `[CITED]` sample; behaviour `[ASSUMED]` |
| Official guidance | "It's very important that you call the Verify endpoint to confirm the status of the transactions before delivering value. Just because the callback_url was visited doesn't prove that transaction was successful." and "verify the amount … If the amount doesn't match, don't deliver value" | `[CITED: …/payments/accept-payments]` |
| Webhook header | `x-paystack-signature` = **HMAC SHA512** of the event payload signed with your **secret key** (hex digest). Verify before processing | `[CITED: …/payments/webhooks]` |
| Webhook ack/retries | Return `200 OK` immediately. No 200 means retry: **live** every 3 minutes for the first 4 tries then hourly for 72 h; **test** hourly for 10 h; 30 s timeout per attempt. Events can be listed/resent via the Webhook Events API | `[CITED]` |
| Source IPs | `52.31.139.75`, `52.49.173.169`, `52.214.14.220` (same for test and live). **Recommendation: do not enforce**; the signature is the control and the list can change. Optionally log-only | `[CITED]` |
| `charge.success` payload | `{ "event": "charge.success", "data": { "status": "success", "reference": "…", "amount": <int>, "currency": "NGN", "gateway_response": "…", … } }`. The official page lists the event but its sample did not render in the fetched copy; shape confirmed from several third-party guides | event name `[CITED]`; field shape `[ASSUMED]` -> verify in the first test-mode delivery (log nothing sensitive) |
| Webhooks in test mode | Yes: the docs give a test-mode retry schedule. Test and live webhook URLs are configured separately in Settings -> API Keys & Webhooks | `[CITED]` / `[ASSUMED]` for the dashboard path |
| Local webhook testing | Paystack cannot reach localhost. Use a tunnel (ngrok / cloudflared) and paste the https URL + `/api/paystack/webhook` into the dashboard. For this phase, UAT happens on the deployed Vercel URL (D-32), so a tunnel is optional | `[CITED]` |
| Test cards (official) | Success (no validation): `4084 0840 8408 4081`, exp 09/27 (any future), CVV 408. Declined: `4084 0800 0000 5408`, CVV 001. PIN: `5078 5078 5078 5078 12` PIN 1111. PIN+OTP: `5060 6666 6666 6666 666` PIN 1234 OTP 123456. Bank-auth simulation: `5192 6027 2058 4796` CVV 123 | `[CITED: …/payments/test-payments]` |
| USD for Nigerian merchants | Only Kenya- and Nigeria-based businesses can accept USD and be paid in USD. Needs "Accept international payments" enabled (request from Dashboard Preferences, reply within ~48 working hours) **and** a Zenith Bank USD domiciliary account added under Settings -> Accounts (Paystack review within 24 h). USD card fee quoted at 3.9%. Test-mode behaviour for USD is not documented | `[CITED: support.paystack.com/en/articles/2130690]`; test mode `[ASSUMED]` -> UAT item |
| Official Node SDK | `@paystack/paystack-sdk` 1.2.1 exists (PaystackOSS) but the legitimacy seam rates it SUS (no repo URL on the registry). Plain `fetch` is reasonable: two endpoints, one signature check. Use `AbortSignal.timeout(10_000)` on both calls, treat network/non-2xx/`status:false` as a provider error (never as "paid") | `[VERIFIED: npm + seam]` |

**Exact calls (recommended `lib/paystack.ts` core):**

```ts
// lib/paystack.ts - mirror of lib/stripe.ts null-if-no-key idiom
const key = process.env.PAYSTACK_SECRET_KEY;
export const paystackEnabled = Boolean(key);
const BASE = "https://api.paystack.co";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; data?: unknown; message?: string } | null;
  if (!res.ok || !json || json.status !== true) throw new Error(`paystack_${res.status}`);
  return json as T;
}

export async function initializeTransaction(i: {
  email: string; amountMinor: number; currency: "NGN" | "USD"; reference: string; callbackUrl: string; cancelUrl: string;
}) {
  const r = await call<{ data: { authorization_url: string; access_code: string; reference: string } }>(
    "/transaction/initialize",
    { method: "POST", body: JSON.stringify({
        email: i.email, amount: String(i.amountMinor), currency: i.currency, reference: i.reference,
        callback_url: i.callbackUrl, metadata: { orderId: i.reference, cancel_action: i.cancelUrl },
    }) },
  );
  return r.data;
}

export async function verifyTransaction(reference: string) {
  const r = await call<{ data: PaystackTx }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  return r.data;
}
```

**Signature + decision predicate (pure, in `lib/paystack-verify.ts`):**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex"); // 128 hex chars
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(header.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b); // timingSafeEqual THROWS on unequal lengths -> guard first
}

export type PaystackTx = { status: string; reference: string; amount: number; currency: string };
export type TxVerdict = "paid" | "failed" | "pending" | "mismatch";

/** ONE rule for webhook AND callback, so they can never drift (same lesson as lib/shipping.ts). */
export function evaluatePaystackTransaction(
  tx: PaystackTx,
  order: { id: string; total: number; currency: string; paymentProvider: string | null },
): TxVerdict {
  if (tx.reference !== order.id || order.paymentProvider !== "paystack") return "mismatch";
  if (tx.status !== "success") {
    return tx.status === "failed" || tx.status === "abandoned" || tx.status === "reversed" ? "failed" : "pending";
  }
  return tx.amount === order.total && tx.currency === order.currency ? "paid" : "mismatch";
}
```

### Pattern 2: Stripe fields (verified against stripe@17.7.0 typings)

- `session.payment_status: 'no_payment_required' | 'paid' | 'unpaid'` (`types/Checkout/Sessions.d.ts:1881`); `session.amount_total: number | null` ("Total of all items after discounts and taxes are applied", line 56); `session.currency: string | null` (line 105, lowercase ISO). `[VERIFIED: typings]`
- The existing route builds one `line_items` entry per product (`unit_amount: i.unitPrice`, `quantity`) plus a separate shipping line when `shipping > 0`, with no tax, discount or `automatic_tax` configured, so `amount_total === Σ unit_amount×qty + shipping === order.total` exactly. Keep it that way: do **not** enable Stripe Tax or promo codes in this phase or the equality check will start rejecting real payments. `[VERIFIED: app/api/checkout/route.ts:164-196]`
- Guard order in the Stripe webhook: `payment_status === "paid"` first. `unpaid` is the delayed-payment (bank-debit style) case, where Stripe later sends `checkout.session.async_payment_succeeded`; with card-only methods this never occurs. Recommend: ignore (200) when not `paid`; optionally also handle `async_payment_succeeded` with the identical code path since `markOrderPaid` is now idempotent (this retires the old "subscribe to one event only" double-email pitfall). `[CITED: docs.stripe.com fulfil-orders, via search]`
- Compare `session.currency === order.currency.toLowerCase()`; Stripe returns lowercase.
- If `USD_PAYMENT_PROVIDER=paystack`, USD orders carry `paymentProvider = "paystack"`, so the Stripe webhook's CAS cannot flip them and the Paystack paths apply with `currency: "USD"` in the init body.

### Pattern 3: Currency display (measured in this session)

Node 24.14.1 (ICU 78.2), `style:"currency", minimumFractionDigits:0, maximumFractionDigits:0`, amounts 4,500,000 kobo and 3,500 cents:

| locale | currencyDisplay | NGN 45,000 | USD 35 |
|--------|-----------------|-----------|--------|
| en-NG | default | `₦45,000` | `US$35` |
| en-US | default | `NGN 45,000` | `$35` |
| en-GB | default | `NGN 45,000` | `US$35` |
| (none) | default | `NGN 45,000` | `US$35` |
| **en-US** | **narrowSymbol** | **`₦45,000`** | **`$35`** |
| en-NG | narrowSymbol | `₦45,000` | `$35` |

**Recommendation:** `new Intl.NumberFormat("en-US", { style:"currency", currency, currencyDisplay:"narrowSymbol", minimumFractionDigits:0, maximumFractionDigits:0 })`, constructed once per currency at module scope. Never rely on `en-NG` default (prints `US$`) or `en-US` default (prints `NGN`). 123,456,789 kobo renders `₦1,234,568` (round-half-up on whole units); `0` renders `₦0`/`$0`; `formatToParts(45000)` = `₦` + `45` + `,` + `000` with a plain comma and no NBSP. `Intl.supportedValuesOf('currency')` includes NGN. `[VERIFIED: ran on this machine]`

Browser parity: `narrowSymbol` is supported by all current evergreen browsers; a browser lacking it would print `NGN 45,000`. Because `<Money>` is a plain (non-"use client") component it renders on the server for static/dynamic server trees (no client re-render, so no hydration text mismatch); it only re-executes in the browser when imported from a client component (cart, drawer, checkout, wishlist), and those trees first render from an empty localStorage state, so the first client render matches the server. Lock the exact strings with a unit test (`formatMoney(4500000,"NGN") === "₦45,000"`, `formatMoney(3500,"USD") === "$35"`). Rule for callers: every catalog price and shipping constant must be a whole major unit (the admin multiplies by 100, auto-USD rounds up to whole dollars) because the formatter drops fractional units. `[ASSUMED]` for browser support claim; formatter behaviour `[VERIFIED]`.

### Pattern 4: Middleware (Next 14.2.35)

Facts verified from the Next 14 docs and by executing Next's own matcher compiler (`getMiddlewareMatchers`) in this repo:

- `NextRequest` in 14.2 exposes `geo` and `ip`, but they are removed in Next 15. Use the documented **`x-vercel-ip-country`** request header instead (ISO 3166-1 alpha-2). It is also testable by constructing `new NextRequest(url, { headers })`. `[CITED: vercel.com/docs/headers/request-headers]`
- "Middleware runs before cached content and routes are matched", so a `Set-Cookie` added in middleware is applied even to statically generated pages. `[CITED: nextjs.org/docs/14 middleware]`
- **Matcher supports `missing` (and `has`) with `type: "cookie"`.** Gate the page matcher on `missing: [{ type: "cookie", key: "nostalgia-currency" }]` and the middleware only executes on the visitor's first request (and on cookie-less bots), never on later page views. The admin matcher stays unconditional.
- Matcher values must be static constants.
- **Trap (verified):** the file-extension exclusion needs exactly one backslash in the pattern string. In a TS file that is `".*\\..*"` inside the string. Writing a single `\.` in the TS source silently becomes `.` and the pattern `.*..*` excludes every path, so the middleware never runs on pages. I proved the working pattern with Next's own compiler: it matches `/`, `/shop`, `/product/x`, `/cart`, `/checkout`, `/account/orders/abc`, `/order/success`, `/signin`, `/wishlist`, `/shipping`, `/returns`, `/collections/x`, and rejects `/admin`, `/admin/products`, `/api/*`, `/_next/*`, `/media/*`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/products/x-1.svg`.

```ts
// middleware.ts (shape; admin body = today's code, byte-for-byte behaviour)
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { CURRENCY_COOKIE, currencyFromCountry, parseCurrency } from "@/lib/currency";

async function adminGate(req: NextRequest) { /* existing getToken / redirect to /signin code, unchanged */ }

function currencyCookie(req: NextRequest) {
  if (parseCurrency(req.cookies.get(CURRENCY_COOKIE)?.value)) return NextResponse.next(); // already chosen
  const res = NextResponse.next();
  res.cookies.set({
    name: CURRENCY_COOKIE,
    value: currencyFromCountry(req.headers.get("x-vercel-ip-country")), // NG->NGN, other->USD, absent->NGN
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",           // httpOnly stays false: client reads it
  });
  return res;
}

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p === "/admin" || p.startsWith("/admin/")) return adminGate(req);   // tests/admin-middleware.test.ts calls middleware() directly with /admin URLs
  return currencyCookie(req);
}

export const config = {
  matcher: [
    "/admin/:path*",
    {
      source: "/((?!admin|api|_next|media|.*\\..*).*)",   // TWO backslashes in the TS literal = one in the pattern
      missing: [{ type: "cookie", key: "nostalgia-currency" }],
    },
  ],
};
```

- **Same-request visibility:** the first request's server components cannot read the cookie that the same middleware pass is setting, and they do not need to. `getCurrency()` falls back to the same `x-vercel-ip-country` header through the same `currencyFromCountry()`, so server and edge always agree. The browser also sees the new cookie before running the inline script (response headers are processed before the document body), so `data-currency` is correct on the first paint. Use one shared pure `currencyFromCountry` in both places. `[ASSUMED]` for browser header-before-script ordering (standard HTTP behaviour); the Vercel header on the SSR request `[CITED]`.
- **Cost:** with the `missing`-cookie gate, per-page-view middleware work drops to zero after the first request. Without it, middleware would run on every page request (cheap, but needless Edge invocations). `[ASSUMED]` on plan billing limits.
- **Tests:** keep `tests/admin-middleware.test.ts` untouched (it calls `middleware()` with `/admin/*` URLs and `// @vitest-environment node`). Add `tests/currency-middleware.test.ts` (also `@vitest-environment node`) covering: no cookie + `x-vercel-ip-country: NG` -> `set-cookie` contains `nostalgia-currency=NGN`; `GB` -> `USD`; header absent -> `NGN`; valid cookie present -> no `set-cookie`; garbage cookie (`EUR`) -> re-set; attributes include `Path=/`, `SameSite=lax`, `Max-Age=31536000`, no `HttpOnly`; plus a matcher test using the compiled-regex approach so the backslash trap is guarded.

### Pattern 5: Dual-render `<Money>` + before-paint script (D-10)

Read from this repo: `app/layout.tsx` already has `suppressHydrationWarning` on `<html>` (scoped to that element), already hosts `THEME_SCRIPT` and `SESSION_HINT_SCRIPT`, and `lib/site-gate.ts` shows the "script constant lives in lib/, tested" idiom. `app/globals.css:123` shows the critical precedent: a rule outside every `@layer` so Tailwind cannot purge it, guarded by `tests/site-gate-css.test.ts` (PostCSS + Tailwind compile).

```ts
// lib/currency.ts
export const CURRENCY_COOKIE = "nostalgia-currency";
export const CURRENCY_ATTR = "data-currency";
/** Blocking <head> script. try/catch because document.cookie can throw (sandboxed iframes). Allow-list in the regex. No backslashes needed. */
export const CURRENCY_SCRIPT =
  `(function(){try{var m=document.cookie.match(/(?:^|; )${CURRENCY_COOKIE}=(NGN|USD)(?:;|$)/);if(m)document.documentElement.setAttribute("${CURRENCY_ATTR}",m[1])}catch(e){}})()`;
```

```tsx
// app/layout.tsx <head>: add next to the existing two scripts
<script dangerouslySetInnerHTML={{ __html: CURRENCY_SCRIPT }} />
```

```css
/* app/globals.css - OUTSIDE every @layer (Tailwind purges layered rules whose class it never sees; compiled output of this exact rule was verified to survive intact). Default = NGN when the attribute is absent. */
:root:not([data-currency="USD"]) [data-money="USD"],
:root[data-currency="USD"] [data-money="NGN"] {
  display: none;
}
```

```tsx
// components/Money.tsx - no "use client"
import { formatMoney, type Currency } from "@/lib/currency";
export default function Money({ amounts, className }: { amounts: Record<Currency, number>; className?: string }) {
  return (
    <>
      <span data-money="NGN" className={className}>{formatMoney(amounts.NGN, "NGN")}</span>
      <span data-money="USD" className={className}>{formatMoney(amounts.USD, "USD")}</span>
    </>
  );
}
```

Design notes: hide only the inactive span so the active one keeps its natural `display` (no override fights inside flex/grid parents). `display:none` removes the inactive text from the accessibility tree and from copy/paste. No hydration warning: the attribute is added to `<html>` (already `suppressHydrationWarning`) before hydration, and `Money`'s own markup is identical on server and client. In jsdom tests (no CSS) both spans exist, so tests querying a price string will see two nodes; use `getAllByText` or query by `[data-money="NGN"]`. **Order amounts (account, admin, email) must NOT use `<Money>`**; they use `formatMoney(total, order.currency)` so a shopper who toggles currency never sees an order re-labelled. Add `tests/currency-css.test.ts` cloning `site-gate-css.test.ts` to guard the compiled rule, and a jsdom test that evaluates `CURRENCY_SCRIPT` against several `document.cookie` values (none, `NGN`, `USD`, `EUR`, mixed with other cookies).

### Pattern 6: Atomic compare-and-set and the decision of who may write `paid`

```ts
// lib/payments.ts
export async function markOrderPaid(
  orderId: string,
  p: { provider: "paystack" | "stripe"; amount: number; currency: string },
): Promise<{ transitioned: boolean }> {
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, status: "pending", total: p.amount, currency: p.currency, paymentProvider: p.provider },
    data: { status: "paid" },
  });
  if (count !== 1) return { transitioned: false };
  await sendOrderConfirmation(orderId); // swallows its own failures (lib/email.ts)
  return { transitioned: true };
}
```

Verified in this session by running real Prisma 5.22.0 against Postgres (PGlite via socket): 8 simultaneous `updateMany` calls returned counts `[1,0,0,0,0,0,0,0]` (sum 1) and a call with a wrong `total` returned 0. Caveat: the run used `connection_limit=1`, so the calls queued; the true-concurrency guarantee comes from Postgres itself: in READ COMMITTED a second `UPDATE` waits for the first to commit, then **re-evaluates its WHERE clause against the updated row**, finds `status` no longer `pending`, and updates nothing. A single `UPDATE … WHERE` is atomic, Neon's pooler does not change that. `[CITED: postgresql.org/docs/current/transaction-iso.html §13.2.1]` `[VERIFIED: run]`. Therefore exactly one caller sees `count === 1`, so the email cannot be double-sent by webhook/callback/retry races. `sendOrderConfirmation` itself never throws, so a mail outage cannot undo the `paid` write.

### Anti-Patterns to Avoid
- **Computing the active currency in the root layout** (`cookies()` there makes every page dynamic). Only `getCurrency()` in /shop and collections.
- **Putting the currency CSS inside `@layer`** (silently purged; see `globals.css:113-125` history).
- **Using `<Money>` for order amounts** or summing orders across currencies.
- **Trusting the callback redirect** as proof of payment, or building any redirect from a request parameter.
- **`order.update({status:"paid"})` anywhere outside `markOrderPaid`.**
- **Formatting with `en-NG`/`en-US` defaults** (wrong symbols, see table).
- **Applying `prisma migrate dev` / `db push`** (production DB). **Editing the generated migration SQL less than the backfill requires** (it would fail on a non-empty table).
- **Enabling Stripe automatic tax / promo codes / `shipping_address_collection`** while `amount_total === order.total` is enforced.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC compare | `===` on hex strings | `crypto.createHmac("sha512")` + `timingSafeEqual` after a length guard | Timing side channel; `timingSafeEqual` throws on unequal lengths |
| Stripe signature | custom parser | `stripe.webhooks.constructEvent` (already used) | Handles timestamp tolerance and v1 schemes |
| Currency formatting | string concatenation of symbols | one `formatMoney` over `Intl.NumberFormat` | Grouping/rounding; one place to change; kills `formatPrice`/`formatCents` duplication |
| Country names | hand-typed name table | `Intl.DisplayNames(['en'], {type:'region'})` for labels, static ISO code list for validation | All 249 ISO codes resolve in Node's ICU (verified); codes are the stored truth |
| Atomic "pending -> paid" | read-then-write | `updateMany` with the full guard | Race-free; the email fires once |
| Bulk dollar recompute | loop of per-product updates | one `$executeRaw` UPDATE | Atomic and O(1) round trips; D-06 |
| Phone validation | full libphonenumber | lenient shape check (below) | Couriers call the number; strictness rejects real customers |
| Shipping math in UI + API | duplicated constants | `lib/shipping.ts` only | The documented drift bug (commit 540f395) |
| One shared payment verdict | webhook-local and callback-local `if` chains | `evaluatePaystackTransaction` | Two code paths, one rule |

**Key insight:** every dangerous rule in this phase (what is "paid", what a shipping fee is, what the dollar price is) must exist exactly once as a pure function that routes, webhooks, UI and tests all import.

## Runtime State Inventory

> This phase changes the meaning/shape of stored data (price columns, order rows, client storage). Every category answered explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `Product.price` (cents, USD) keeps its physical column but becomes the Prisma field `priceUsd`; new `priceNgn`/`priceUsdOverride` columns need values for every existing row. Existing `Order` rows are all USD, `items` JSON `unitPrice` is USD cents. No row anywhere stores a currency string today | **Data migration** in the hand-authored SQL (backfill per D-08, `Order.currency` via column DEFAULT `'USD'`, `StoreSettings` seed). **Code edit** for all new writes (explicit `currency`, `paymentProvider`, `shippingAddress`) |
| Live service config | Paystack dashboard: test secret key, webhook URL `https://<domain>/api/paystack/webhook` (test and live URLs are separate), "Accept international payments" + Zenith USD account only if Paystack carries dollars. Stripe dashboard webhook for `checkout.session.completed` already exists (Phase 11) and is unchanged. Vercel env: add `PAYSTACK_SECRET_KEY`; optional `USD_PAYMENT_PROVIDER`, `ALLOW_DEMO_CHECKOUT`; `NEXTAUTH_URL` must stay set (no fallback origin) | Owner actions, documented in `12-OWNER-SETUP.md`. Not in git |
| OS-registered state | None: verified, no scheduled tasks/services reference prices or currency | None |
| Secrets/env vars | New `PAYSTACK_SECRET_KEY` (also the webhook-signing key). `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` unchanged. No secret is renamed | Add to Vercel (and local only if the owner wants local Paystack testing) |
| Build artifacts / installed packages | Generated Prisma client must be regenerated after the schema change (`postinstall` does it on Vercel; locally run `prisma generate`). **After regenerating locally, the dev server (which talks to PRODUCTION Neon) breaks until the migration is applied**, because every Product query now selects `priceNgn`. Customer browsers hold `nostalgia-cart` / `nostalgia-wishlist` in the old single-`price` shape; D-13 discards them on load. A new `nostalgia-currency` cookie appears | Sequence the owner checkpoint right after the schema plan (see Pitfall 2). Add normalisers that drop legacy localStorage shapes |

## Database: schema, migration, backfill (Q6)

### Schema diff (validated with `prisma validate` and `prisma format` on scratch copies; the real `schema.prisma` was not touched)

```prisma
model Product {
  id               String   @id @default(cuid())
  slug             String   @unique
  name             String
  // Naira price in kobo, typed by the owner (required).
  priceNgn         Int
  // Optional hand-set dollar price in cents; null = follow the store rate.
  priceUsdOverride Int?
  // EFFECTIVE dollar price (cents): override when set, else autoUsdMinor(priceNgn, rate). Keeps the legacy "price" column + index.
  priceUsd         Int      @map("price")
  /* …unchanged… */
  @@index([priceUsd])   // physically the existing "Product_price_idx": the diff emitted NO change for it
  @@index([priceNgn])
}

model Order {
  /* …unchanged… */
  total           Int      // minor units (kobo / cents) of `currency`
  currency        String   @default("USD") // NGN | USD (allow-list in lib/currency.ts)
  paymentProvider String?  // paystack | stripe | demo (allow-list in lib/orders.ts)
  shippingAddress String?  // JSON snapshot (lib/orders.ts parseShippingAddress)
}

// Singleton row (id = 1)
model StoreSettings {
  id         Int      @id
  usdNgnRate Int      // whole naira per $1
  updatedAt  DateTime @updatedAt
}
```

### Offline generated SQL (`prisma migrate diff --from-schema-datamodel old.prisma --to-schema-datamodel new.prisma --script`, run in a scratch dir with a dummy `DATABASE_URL`; needs no DB)

```sql
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "priceNgn" INTEGER NOT NULL,
ADD COLUMN     "priceUsdOverride" INTEGER;
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "shippingAddress" TEXT;
-- CreateTable
CREATE TABLE "StoreSettings" ( "id" INTEGER NOT NULL, "usdNgnRate" INTEGER NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id") );
-- CreateIndex
CREATE INDEX "Product_priceNgn_idx" ON "Product"("priceNgn");
```

**This raw output must be edited:** `ADD COLUMN "priceNgn" INTEGER NOT NULL` with no default fails on a table that already has rows. Also there is no backfill and no settings seed.

### Hand-authored migration (file: `prisma/migrations/20261013120000_multi_currency/migration.sql`; timestamp must sort after `20261006120000_product_image_blur`)

```sql
-- Phase 12: multi-currency payments. Hand-authored from `prisma migrate diff … --script`
-- (never `migrate dev`: the local .env points at the production database).

-- AlterTable: Product. priceNgn is added NULLABLE so the backfill can fill existing rows, then tightened.
ALTER TABLE "Product" ADD COLUMN     "priceNgn" INTEGER,
ADD COLUMN     "priceUsdOverride" INTEGER;

-- Backfill (D-08). "price" (the column behind Product.priceUsd) is untouched, so every existing
-- dollar price stays exactly as typed.
--   priceUsdOverride = price                       (keep the hand-typed dollar price)
--   priceNgn         = price(cents) * 1500 kobo/cent, rounded to the nearest 500 naira (50000 kobo); numeric math
UPDATE "Product"
SET "priceUsdOverride" = "price",
    "priceNgn" = (ROUND("price"::numeric * 1500 / 50000) * 50000)::integer;

ALTER TABLE "Product" ALTER COLUMN "priceNgn" SET NOT NULL;

-- AlterTable: Order. Existing rows were all charged in USD (the column default).
ALTER TABLE "Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "shippingAddress" TEXT;

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" INTEGER NOT NULL,
    "usdNgnRate" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("id")
);

-- Singleton row. 1500 is a PLACEHOLDER; the owner sets the real rate in /admin/settings.
INSERT INTO "StoreSettings" ("id", "usdNgnRate", "updatedAt")
VALUES (1, 1500, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- CreateIndex
CREATE INDEX "Product_priceNgn_idx" ON "Product"("priceNgn");
```

**Verified (this session, real Postgres semantics via PGlite in a scratch dir, nothing near the production DB):** applied all four existing migrations in order, inserted legacy products priced 4500, 26000, 18000, 6000, 9500, 12345, 33, 1, 0, 34001 cents and a legacy order, then applied the file above. Results: `priceUsdOverride === price` for every row; `priceNgn` = 6,750,000 / 39,000,000 / 27,000,000 / 9,000,000 / 14,250,000 / 18,500,000 / 50,000 / 0 / 0 / 51,000,000 kobo (e.g. $45 -> ₦67,500, $123.45 -> ₦185,000); legacy order `currency = 'USD'`, `paymentProvider`/`shippingAddress` null; `StoreSettings` = `(1, 1500, now)`; columns `priceNgn` NOT NULL, `priceUsdOverride` nullable, `Order.currency` NOT NULL default `'USD'`; indexes `Product_price_idx` (untouched) and `Product_priceNgn_idx` present. Note the rounding: a $0.01 product backfills to ₦0 (irrelevant for real stock; the owner reviews prices in /admin per D-08). `[VERIFIED: run]`

Notes for the planner:
- `StoreSettings.updatedAt` has no DB default (Prisma `@updatedAt` is app-level), so the raw seed insert must set it, as above.
- Generate-the-diff step is still worth doing in the plan (the task must not be skipped), but the committed file is the hand-edited one.
- Do not run `prisma migrate dev` to "check drift". To sanity-check the final schema vs migrations offline you would need a shadow DB; skip it. `prisma validate` is enough.
- `prisma migrate deploy` runs through `DIRECT_URL` (unpooled Neon endpoint), per the project's `neon-postgres` skill.

### Vercel apply path and deploy-window compatibility

- `package.json` has `"vercel-build": "prisma migrate deploy && next build"`. Vercel's open-source Next builder looks for a `vercel-build` script and uses it instead of `build` (`packages/next/src/index.ts` in github.com/vercel/vercel: it checks `'vercel-build'` and sets `buildScriptName = 'vercel-build'`). So deploys run the migration first, with the previous deployment still serving until the new one is promoted. `[VERIFIED: vercel/vercel source]`
- The migration is an **expand-only** change, so old code keeps working against the migrated DB: old `Product` reads use the untouched `price` column; old `Order.create` (no currency) takes the `'USD'` default, which is exactly what old code charges; old code ignores new columns. The single incompatibility: **old code's admin `Product.create` fails** (`priceNgn` NOT NULL, no default) for the minutes between migration and promotion. A DB default of 0 was deliberately NOT recommended: it would silently create ₦0 products. Tell the owner not to add products during a deploy.
- **Cleanest ordering:** (1) plan lands schema + migration file + pure libs; (2) **owner checkpoint**: create a Neon branch of production (instant copy-on-write per the project's neon skill) as rollback and rehearsal, point `DIRECT_URL` at the branch, run `npx prisma migrate deploy`, spot-check prices; (3) repeat on production (or let the first Vercel deploy do it); (4) everything after this point, including in-browser verification on the local dev server (which uses the production DB), depends on step 3. A failed migration on Postgres is expected to roll back as a unit (single multi-statement script) but this is `[ASSUMED]`; the Neon branch is the safety net.
- `prisma/seed.ts` must be edited to compile (`price:` -> `priceNgn`, `priceUsd`, `priceUsdOverride`; reviewer snapshots read `priceUsd`) and must **not** be executed.

## Dollar auto-pricing: proof and exact SQL (Q7)

**Pure helper (the only app-side implementation):**

```ts
export const RATE_MIN = 100, RATE_MAX = 100_000;
export const isValidRate = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= RATE_MIN && (n as number) <= RATE_MAX;

/** kobo ÷ (rate naira per $ × 100 kobo per naira) = dollars; round UP to a whole dollar; return cents. */
export function autoUsdMinor(priceNgnMinor: number, usdNgnRate: number): number {
  return Math.ceil(priceNgnMinor / (usdNgnRate * 100)) * 100;
}
export function effectiveUsdMinor(p: { priceNgn: number; priceUsdOverride: number | null }, rate: number): number {
  return p.priceUsdOverride ?? autoUsdMinor(p.priceNgn, rate);
}
```

**Why float division cannot flip the ceiling here:** dividend `a` is an Int4 (< 2^31) and divisor `b = rate×100` is between 10^4 and 10^7. IEEE division is correctly rounded, so an exact quotient is represented exactly. For an inexact quotient the fractional part is at least `1/b ≥ 1e-7`, while the quotient is at most `2^31/10^4 ≈ 2.1e5`, so the relative gap to the next integer is at least `~5e-13`, far above double epsilon (`1.1e-16`). The result can never round across an integer boundary.

**Empirical proof (executed):** 4,221 `(kobo, rate)` pairs: every multiple of `b` for k in {0,1,2,3,10,100,1000} with offsets -2..+2 across rates {100, 1500, 1499, 1501, 1600, 99999, 100000, 7, 3...} (rates under 100 skipped as out of range) plus 4,000 seeded-random pairs with kobo up to 2e9 and rate 100..100000. Compared **JS `Math.ceil(a/b)*100`** vs an **exact BigInt ceil-division** vs **Postgres `(CEIL($1::numeric / ($2::numeric * 100)) * 100)::int`** vs the **all-integer SQL form**. **Mismatches: 0.** `[VERIFIED: run on PGlite]`

**Exact bulk recompute statement** (executed through the real Prisma 5.22.0 client against the migrated DB, returned the affected-row count; the SQL column is `"price"` because of `@map`):

```ts
import { prisma } from "@/lib/db";
import { isValidRate } from "@/lib/currency";

export async function setUsdNgnRate(rate: number) {
  if (!isValidRate(rate)) throw new Error("invalid_rate");
  const [, updated] = await prisma.$transaction([
    prisma.storeSettings.upsert({ where: { id: 1 }, update: { usdNgnRate: rate }, create: { id: 1, usdNgnRate: rate } }),
    prisma.$executeRaw`
      UPDATE "Product"
      SET "price" = (CEIL("priceNgn"::numeric / (${rate}::numeric * 100)) * 100)::int
      WHERE "priceUsdOverride" IS NULL`,
  ]);
  return updated; // rows recomputed
}
```

- The tagged template binds `${rate}` as a parameter (never string-built). The `::numeric` cast on the bound integer worked through Prisma; so did `${rate}::int` in the all-integer variant `((("priceNgn"::bigint + (${rate}::int * 100) - 1) / (${rate}::int * 100)) * 100)::int`. Either is acceptable; the numeric form matches D-04's wording. `[VERIFIED: run]`
- `$transaction([upsert, $executeRaw`…`])` (array form) worked: the new rate and the recompute commit together. Example check: ₦390,000 at rate 1,600 -> 24,400 cents; at 1,700 -> 23,000 cents (`390000/1700 = 229.41 -> 230`).
- Product create/update compute `priceUsd = effectiveUsdMinor(...)` in the server action using `rate = (await prisma.storeSettings.findUnique({where:{id:1}}))?.usdNgnRate`; if the row is missing, fail loudly (the migration seeds it). A save racing a simultaneous rate change can leave one product on the old rate until the next recompute; acceptable for a single-owner admin.
- Test strategy for "SQL == JS" (D-04): (a) default, no dependency: unit-test `autoUsdMinor` against a BigInt oracle on boundary + seeded-random values, and unit-test `setUsdNgnRate` by mocking `$executeRaw`/`$transaction` and asserting the **template text** contains the exact fragment `CEIL("priceNgn"::numeric / (` and `WHERE "priceUsdOverride" IS NULL`, and that the bound value is the integer rate. The real-Postgres proof above is recorded here. (b) optional stronger variant: `@electric-sql/pglite` as a devDependency running the same statement (needs the `checkpoint:human-verify` install gate; SUS only because its newest release is a day old).

## Address data (Q9)

**Nigeria: 36 states + FCT, exact spellings** (ISO 3166-2:NG names; "Nasarawa" is the standard spelling, the Wikipedia page even mixes it with "Nassarawa" in a changelog table). `[CITED: en.wikipedia.org/wiki/ISO_3166-2:NG]`

```ts
export const NIGERIA_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta",
  "Ebonyi","Edo","Ekiti","Enugu","Federal Capital Territory","Gombe","Imo","Jigawa","Kaduna","Kano",
  "Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun",
  "Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
] as const; // 37 entries. Store the exact value; a UI label may say "Abuja (FCT)" but the submitted/stored value is "Federal Capital Territory".
```

**Country allow-list (ISO 3166-1 alpha-2, 249 codes, from the lukes/ISO-3166-Countries-with-Regional-Codes dataset; all 249 resolve in Node's `Intl.DisplayNames`)**: keep codes as the stored/validated truth in a static `ISO_COUNTRY_CODES` array and use `Intl.DisplayNames(['en'], {type:'region'})` only for client-side labels (default `NG` first, rest sorted by localised name, with a try/catch fallback to the bare code). `Intl.supportedValuesOf` has no region key, so a static list is required for server validation. Note CLDR also knows ~31 non-ISO codes (`AC, CP, DG, EA, EU, EZ, IC, TA, UN, XK, XA, XB, ZZ`, legacy `UK, YU, SU …`) — the allow-list must NOT be derived from `Intl` (it would admit `ZZ`/`UN`). `UK` is invalid: Great Britain is `GB`. `XK` (Kosovo) is not ISO-assigned; excluded.

```
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO
FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE
JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO
MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW
PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM
TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
```

Owner decision flag: couriers cannot deliver to some ISO countries (e.g. KP, IR, SY, CU, sanctioned regions). Recommend a tiny `UNSHIPPABLE_COUNTRIES` constant (initially empty or `["KP","IR","SY","CU"]`) subtracted from the list, with the owner confirming. Not in scope of D-15; surface as an Open Question.

**Phone (lenient, server authoritative):** accept `+`, digits, spaces and `() . / -`; require 7 to 15 digits after stripping non-digits (E.164 max is 15); no country-specific format enforcement. Covers `08031234567`, `+234 803 123 4567`, `+44 20 7946 0958`, `(212) 555-0100`. Reject letters. Because phone is only there for couriers, over-strictness costs sales.

```ts
const PHONE_CHARS = /^\+?[0-9 ()./-]{7,24}$/;
export const isPlausiblePhone = (s: string) => PHONE_CHARS.test(s) && s.replace(/\D/g, "").length >= 7 && s.replace(/\D/g, "").length <= 15;
```

**Other server rules (recommended caps):** `fullName` 2-100, `line1` 3-200, `line2` ≤200 optional, `city` 2-100, `state` 2-100 (international free text; for NG must equal an `NIGERIA_STATES` entry exactly), `postalCode` ≤20 matching `/^[A-Za-z0-9 -]*$/` optional, `country` exactly two uppercase letters in the allow-list. Trim every string, reject ASCII control characters, store only the normalised object. Render everywhere as plain React children (the email template already escapes). The address is PII: never in analytics payloads, never in `console.*`.

## Complete inventory of price/currency sites to change (Q5, Q11)

Produced by grepping `formatPrice|formatCents|FREE_SHIPPING|SHIPPING_FEE|calculateShipping|\.price|price:|unitPrice|total|\$[0-9]|Stripe|USD|cents` across `app components lib emails context types tests prisma`. `tsc --noEmit` will catch every typed use of `price` once the Prisma client is regenerated (the field becomes `priceUsd`), but the strings and the SQL below are invisible to the compiler.

### A. Storefront price rendering -> `<Money amounts={{NGN, USD}}>`
| File:line | Today | Becomes |
|-----------|-------|---------|
| `components/ProductCard.tsx:54` (also :45 wishlist snapshot `price`) | `formatPrice(product.price)` | `<Money>` from `product.priceNgn/priceUsd`; snapshot `prices` |
| `components/EditRail.tsx:55` | `formatPrice(product.price)` | `<Money>` |
| `app/product/[slug]/page.tsx:221` (:175 JSON-LD input, :260 WishlistButton snapshot, **:272 copy "Free shipping over $200"**) | `formatPrice(product.price)` | `<Money>`; JSON-LD two Offers; copy renders from `FREE_SHIPPING_OVER` |
| `components/AddToCart.tsx:41` | cart snapshot `price: product.price` | `prices: { NGN: product.priceNgn, USD: product.priceUsd }` |
| `app/wishlist/page.tsx:43` | `formatPrice(item.price)` | `<Money amounts={item.prices}>` |
| `app/cart/page.tsx:50, 89, 101` (and :94 `FREE_SHIPPING_THRESHOLD` branch) | `formatPrice(item.price * item.qty)`, subtotal | line total and subtotal via `<Money>`; shipping row always "Calculated at checkout" (D-14) |
| `components/CartDrawer.tsx:96, 108` | same | same |
| `app/checkout/page.tsx:110, 120, 125-127, 133` (:33 analytics, :147 "Stripe test mode") | `formatPrice`, `calculateShipping(subtotal)` | `<Money>` for items; subtotal/shipping/total from `calculateShipping(subtotalMinor, currency, country)` in the ACTIVE currency (from `CurrencyContext`); provider-named trust line; analytics `currency` |
| `components/home/TrustStrip.tsx:29` | note `"Complimentary over $200"` (a plain string) | `note` becomes a ReactNode containing `<Money>` of the domestic threshold |
| `app/shipping/page.tsx:42` | "free on orders over $200" in a server component | `<Money>` thresholds per zone; also add the international row |
| `components/shop/FilterPanel.tsx:98-120` | unlabelled min/max numeric inputs | show active currency symbol; values in major units |

### B. Order displays -> `formatMoney(amount, parseOrderCurrency(order.currency))` (NOT `<Money>`)
| File:line | Change |
|-----------|--------|
| `components/account/OrderList.tsx:11, 19, 34, 133, 160` | add `currency` to `Row`/`OrderInput`/`toOrderRows`; format with the row's currency |
| `components/account/OrderDetail.tsx:10, 94, 102` | add `currency`, `shippingAddress`, `paymentProvider` props; address block; per-item and total via `formatMoney` |
| `app/admin/orders/page.tsx:16` + `components/admin/OrderTable.tsx:8, 67` | pass and use `currency`; optional provider/currency column |
| `app/admin/orders/[id]/page.tsx:45, 53` | `formatMoney`; show address, currency, provider |
| `lib/email-content.ts:9-16, 51-58, 100-116` + `emails/OrderConfirmation.tsx` | `OrderEmailSource` gains `currency`, `shippingAddress`; delete `formatCents`; `formattedUnitPrice/LineTotal/Total` via `formatMoney`; add address lines to `OrderEmailContent` and a block in the template (table layout, inline styles only, plain React children) |

Legacy rule for all of B: `parseCurrency(order.currency) ?? "USD"` (every pre-phase order was USD; also keeps `tests/account-order-detail.test.tsx`'s `$285` assertion green when its fixture has no `currency`). Show a dash for a null `paymentProvider`.

### C. Types / lib
| File:line | Change |
|-----------|--------|
| `lib/products.ts:22, 38-61, 239-241` | `Product.price` -> `priceNgn`, `priceUsd` (do not leak `priceUsdOverride` to client props); delete `formatPrice` |
| `lib/catalog.ts:139, 142, 176, 178` + `buildProductWhere`/`buildOrderBy` | take `currency`; `minPrice/maxPrice` are **major units**, multiply by 100, and filter `priceNgn` or `priceUsd`; sort by the same column. Also `app/shop/[[...slug]]/page.tsx:114` and collection pages pass `getCurrency()` |
| `lib/shipping.ts` | zones x currency table; `calculateShipping(subtotalMinor, currency, country)`; export `FREE_SHIPPING_OVER` for copy; the header comment's drift-bug story stays |
| `lib/seo.ts:8, 27-34` | `ProductJsonLdInput` carries `priceNgn`, `priceUsd`; `offers` = array of two Offers (`priceCurrency` "NGN"/"USD", `price` `(minor/100).toFixed(2)`, same availability) |
| `lib/wishlist.ts:11`, `context/CartContext.tsx:12-24, 46-58, 100-109` | `prices: Record<Currency, number>`; `subtotals` per currency; load-time normaliser drops legacy/invalid entries (positive integers for both currencies, qty positive int, strings present) |
| `lib/analytics.ts` | no type change needed (`payload?: Record<string, string|number|boolean>`); add `currency` at call sites `app/checkout/page.tsx:33` and `app/order/success/page.tsx:30` |
| `lib/orders.ts` | `ShippingAddress`, `parseShippingAddress`, `PAYMENT_PROVIDERS`, `isPaymentProvider` |
| `prisma/seed.ts:12, 37-331, 450, 488, 508` | compile fix only (never run) |
| `components/Providers.tsx`, `components/Nav.tsx` (next to `<ThemeToggle />` ~line 177), `app/layout.tsx` (script), `app/globals.css` (rule) | provider, toggle, script, CSS |

### D. Admin
`app/admin/products/actions.ts:25, 94-96, 139, 159, 206` (parse `priceNgn` required + `priceUsd` optional major units; explicit field-by-field, never spread FormData; validate non-negative **integers**, upper bound e.g. ≤ 10^9 kobo so Int4 cannot overflow; compute `priceUsd`), `app/admin/products/page.tsx:22` and `[id]/edit/page.tsx:34` (pass both prices; show "auto"), `components/admin/ProductForm.tsx:20, 52, 82, 160-167` ("Price (₦)" / "Price ($), optional" with helper preview), `components/admin/ProductTable.tsx:12, 70` (both prices + "auto" badge), `components/admin/AdminNav.tsx:6-11` (add Settings), new `app/admin/settings/page.tsx` + `actions.ts` (first statement `await requireOwner()`; rate validated by `isValidRate`; `revalidatePath` for `/admin/products`, `/`, `/shop/[[...slug]]`, `/product/[slug]`, `/collections/[slug]`, `/collections`).

### E. Existing tests that assert the old shapes (must be updated in the same plan that changes the code)
| Test | Why it breaks | Fix |
|------|---------------|-----|
| `tests/checkout-shipping.test.ts` | imports `FREE_SHIPPING_THRESHOLD`, `SHIPPING_FEE`, calls `calculateShipping(subtotal)`; body is `{items}` only; products use `price`; asserts Stripe `usd` | Rewrite for the new signature, `{items, currency, address}`, `priceUsd`/`priceNgn`. Keep the "Order.total equals the SUM of the actual provider charge" assertion for both providers. Note the original shipping-line lookup compares the name to `"Shipping"` while the route names it `"Shipping Delivery Fees"`, so that assertion was vacuous; assert by amount |
| `tests/stripe-webhook.test.ts` | mocks `prisma.order.update`, fixtures have no `total/currency/paymentProvider`; session events lack `payment_status/amount_total/currency` | Switch to `updateMany` expectations (or mock `@/lib/payments`) and richer fixtures; add the new mismatch cases |
| `tests/email.test.ts` (lines ~4, 28-34, 63, 72) | imports `formatCents` | use `formatMoney`; add NGN and address cases |
| `tests/seo.test.ts` (:8, 25-26) | single Offer, `priceCurrency` "USD" | two Offers |
| `tests/catalog.test.ts` (:143-150, 171-176) | `{price:{gte}}`, `orderBy {price}`; `parsePriceRange` semantics | `priceNgn`/`priceUsd` per currency; major->minor conversion test |
| `tests/wishlist.test.ts` (:13, 20) | fixtures with `price` | `prices` |
| `tests/admin-product-placement.test.ts` (:20), `tests/slug.test.ts` (:57) | post `price` form field; prisma mock has only `product.create` | post `priceNgn` (and optional `priceUsd`); mock `storeSettings.findUnique` returning a rate |
| `tests/account-order-detail.test.tsx`, `tests/account-orders.test.tsx` | fixtures lack `currency` | still green via the USD legacy fallback; add NGN cases |
| `tests/admin-middleware.test.ts`, `tests/site-gate-css.test.ts`, `tests/a11y.test.tsx` | — | must stay green untouched |

Baseline recorded today: `npx tsc --noEmit` is clean; `npx vitest run` = 31 files / 304 tests passing in ~70 s. One earlier run, started concurrently with `tsc`, showed 5 failures in `tests/email.test.ts` and two other files that did not reproduce on a rerun (shared-module-state/timing flake under load). Run the full suite alone, not in parallel with `tsc`.

## Test-writing patterns for the new code (Q10)

Existing house style (read from `tests/stripe-webhook.test.ts`, `tests/checkout-shipping.test.ts`, `tests/admin-middleware.test.ts`): module-level `vi.fn()` spies; `vi.mock("@/lib/db", () => ({ prisma: { … } }))` with arrow wrappers; `vi.resetModules()` in `beforeEach` and `await import("@/app/api/…/route")` inside each test; `vi.doMock`/`vi.doUnmock` for modules that vary per describe block (`@/lib/stripe` null vs configured); `new Request(url, {method:"POST", body})` to feed route handlers under the default jsdom environment; `// @vitest-environment node` pragma for middleware/NextRequest/jwt tests; `process.env` saved and restored in `afterEach`, or `vi.stubEnv`/`vi.unstubAllEnvs`. Each test asserts BOTH the HTTP result AND the side effects (write + email).

| New unit | Structure |
|----------|-----------|
| `lib/currency`, `lib/shipping`, `lib/address`, `lib/orders` additions, `lib/payment-provider`, `lib/paystack-verify` | Pure table-driven tests, no mocks. Signature test computes a real HMAC with `node:crypto` for the fixture body, then asserts: valid -> true; one-byte-changed body -> false; wrong secret -> false; missing/empty header -> false; header of different length -> false **without throwing**; uppercase hex -> true |
| `lib/paystack.ts` (fetch) | `vi.stubGlobal("fetch", vi.fn())` (or `vi.spyOn(globalThis, "fetch")`) returning `new Response(JSON.stringify({status:true,data:{…}}), {status:200})`. Assert URL, `method`, `Authorization: Bearer sk_test_x`, parsed body (`amount` is the **string** `"4500000"`, `reference`, `callback_url`, `metadata.cancel_action`), `signal` is an `AbortSignal`, and that the verify URL percent-encodes the reference. Error cases: HTTP 401/500, `{status:false}`, `fetch` rejecting (timeout) all throw. Set `process.env.PAYSTACK_SECRET_KEY` before `vi.resetModules()` + dynamic import because the key is read at module load |
| `app/api/paystack/webhook/route.ts` | Mirror `tests/stripe-webhook.test.ts`. Use the REAL `verifyWebhookSignature` (do not mock it): build `RAW_BODY`, compute the header with `createHmac("sha512", "sk_test_x")`. Cases: no key -> 200 no-op; missing header -> 401/400, no DB read; bad signature -> same, no `updateMany`, no email; valid + non-`charge.success` event -> 200 no-op; valid + unknown reference -> 200, no write; wrong amount, wrong currency, `status:"failed"`, `paymentProvider:"stripe"` -> 200, no write, no email; valid and matching -> `markOrderPaid` once (mock `@/lib/payments` to keep route tests focused, test `markOrderPaid` separately); duplicate delivery -> still 200; malformed JSON after a valid signature -> 200 |
| `app/api/paystack/callback/route.ts` | `new Request("http://localhost/api/paystack/callback?reference=…")`; `vi.mock("@/lib/paystack")` for `verifyTransaction`. Assert the `Response` status 3xx and `location` header: success -> `${NEXTAUTH_URL}/order/success?order=<id>`, failed/abandoned -> `/checkout?payment=failed`, unknown order -> `/checkout?payment=failed`, malformed/oversized reference -> no provider call, redirect to failed; `verifyTransaction` throwing -> redirect to failed (never success). Open-redirect test: pass `callbackUrl=https://evil.test` and a `reference` containing `//evil.test` and assert location always starts with `NEXTAUTH_URL` |
| `lib/payments.ts` `markOrderPaid` | Mock `@/lib/db` (`order.updateMany`) and `@/lib/email`. `count:1` -> email once with the id; `count:0` -> no email; assert the exact `where` (`id`, `status:"pending"`, `total`, `currency`, `paymentProvider`) and `data:{status:"paid"}`; two sequential calls where the second mock returns `count:0` -> exactly one email |
| `app/api/checkout/route.ts` | Extend the existing style. Matrix: NGN -> Paystack init called with `amount` as order total, no Stripe call; USD -> Stripe with `currency:"usd"` and line-item sum equals `Order.total`; `USD_PAYMENT_PROVIDER` unset/`"paystack"`/`"Paystack"`/`" paystack"` (only exact `"paystack"` switches); NGN uses `priceNgn`, USD uses `priceUsd` from the mocked product rows; invalid currency / missing address / bad country / NG with non-listed state -> 400 and no `order.create`; no key + `NODE_ENV=production` (`vi.stubEnv("NODE_ENV","production")`) -> 503 `payments_unavailable`, no `order.create`; no key + `ALLOW_DEMO_CHECKOUT="true"` -> stub order `paymentProvider:"demo"` + email; non-production default -> stub allowed (vitest's NODE_ENV is `test`). Persisted order carries `currency`, `paymentProvider`, `shippingAddress` JSON, `total`; provider throws -> order marked `cancelled` (recommended) and 502 |
| `middleware.ts` | `// @vitest-environment node`; see Pattern 4 |
| `<Money>` / toggle / context | `@testing-library/react`: both spans present with exact strings; toggle writes `document.cookie`, sets `documentElement` attribute, and `router.refresh` (mock `next/navigation`) |

## Common Pitfalls

### Pitfall 1: The generated migration fails on the real table
**What goes wrong:** `ADD COLUMN "priceNgn" INTEGER NOT NULL` with no default errors because Product already has rows. **How to avoid:** use the hand-authored SQL above (nullable add, backfill, SET NOT NULL). **Warning sign:** `column "priceNgn" … contains null values`.

### Pitfall 2: Regenerating the Prisma client breaks local dev against production data
**What goes wrong:** after `schema.prisma` changes and `prisma generate`, every Product query selects `priceNgn`, which does not exist in the production DB until the owner applies the migration; the dev server on :3002 starts erroring. **How to avoid:** schedule the owner checkpoint right after the schema plan; tell the owner in the plan that local pages will 500 until applied. Unit tests are unaffected (Prisma mocked). **Warning sign:** `The column Product.priceNgn does not exist`.

### Pitfall 3: `@map("price")` hides the real column name from raw SQL
Prisma field is `priceUsd`; SQL and `$executeRaw` must say `"price"`. Compile-time checks do not cover raw SQL. The recompute statement above is the only raw SQL; test it by template text.

### Pitfall 4: Middleware matcher backslash
`".*\\..*"` in a TS string (two backslashes). With one, the pattern degenerates to `.*..*` and the middleware silently never runs on pages. Guard with a test that runs the compiled regex.

### Pitfall 5: Currency CSS inside `@layer`
Silently purged by Tailwind. Keep it unlayered and add the compiled-CSS test (same bug as the sign-in gate).

### Pitfall 6: GET route handlers can be cached
Next 14 may statically evaluate a `GET` route handler. `/api/paystack/callback` must be dynamic: `export const dynamic = "force-dynamic"` (reading `req.url` also opts out, but be explicit). Also set `export const runtime = "nodejs"` on both Paystack routes (needs `node:crypto`).

### Pitfall 7: `/checkout` becomes dynamic-looking
Reading `?payment=failed` needs `useSearchParams`, which in Next 14 requires a `<Suspense>` boundary around the consuming component on a prerendered client page (the success page already does this; copy that shape) or the production build errors.

### Pitfall 8: Webhook body must be read raw
Use `await req.text()` first, verify, then `JSON.parse`. Never `req.json()` first (re-serialisation changes bytes). Prefer `req.headers.get("x-paystack-signature")` over `next/headers` in the new route; the route is then trivially testable with a plain `Request`.

### Pitfall 9: `timingSafeEqual` throws on unequal lengths
Guard `a.length === b.length` first (see the signature snippet), otherwise a malformed header turns a 4xx into a 500.

### Pitfall 10: Paystack fee-bearer changes `data.amount`
See the table: `amount` may include fees if the account passes fees to the customer. Document "merchant bears fees" in the owner setup and check the first test transaction; decide whether to also accept `requested_amount`.

### Pitfall 11: `NODE_ENV` is `production` on Vercel Preview deployments too
So D-24's stub is closed on previews unless `ALLOW_DEMO_CHECKOUT` is exactly `"true"` (`[ASSUMED]`: standard Vercel behaviour). Put this in `12-OWNER-SETUP.md`. UAT happens with real test keys anyway.

### Pitfall 12: Stripe `payment_status !== "paid"`
Ignore (200) for `unpaid`/`no_payment_required`; do not flip to paid. Keep Stripe methods card-only for this phase.

### Pitfall 13: Cart snapshot drift and rate changes
The checkout page displays totals from localStorage snapshots, but `/api/checkout` reprices from the DB. After a price edit or a rate change the provider page may show a different amount than the checkout page did (pre-existing behaviour, now more likely because auto-USD prices move when the rate moves). Mitigation within scope: label the checkout summary as an estimate or, better, return a server quote and show it before redirect (Open Question 6).

### Pitfall 14: Duplicate text in tests and AT
Both `<Money>` spans exist in jsdom (no CSS). Use `getAllByText`/attribute selectors. In real browsers `display:none` removes the inactive one from assistive tech, so do not add `aria-hidden` games.

### Pitfall 15: Toggle hydration
Render a same-size placeholder until mounted (copy `ThemeToggle`'s `null` state) because the active currency is only known from `document.documentElement` after hydration.

### Pitfall 16: Leaking the secret or PII in logs
Log ids and verdicts only (`orderId`, `reference`, event id, status string). Never log the raw webhook body, signature, address, email or the Paystack response.

### Pitfall 17: Abandoned pending orders
Every "Pay now" creates an order, as with Stripe today. Not fixed here; the admin list will show stale `pending` rows (owner-facing note in OWNER-SETUP). Do not auto-cancel from the callback for `abandoned`, because the webhook can still arrive later.

## Code Examples

### Checkout route skeleton (provider routing and demo gate)

```ts
// lib/payment-provider.ts  (pure; same idiom as lib/auth-flags.ts: strict equality, no trim, no case-folding)
import type { Currency } from "@/lib/currency";
export type Provider = "paystack" | "stripe";
export function resolveProvider(currency: Currency, env: Record<string, string | undefined>): Provider {
  if (currency === "NGN") return "paystack";
  return env.USD_PAYMENT_PROVIDER === "paystack" ? "paystack" : "stripe";
}
export function demoCheckoutAllowed(env: Record<string, string | undefined>): boolean {
  return env.ALLOW_DEMO_CHECKOUT === "true" || env.NODE_ENV !== "production";
}
```

```ts
// app/api/checkout/route.ts  (order of operations)
// 1 auth 401 -> 2 body JSON 400 -> 3 items guard 400 -> 4 parseCurrency(body.currency) ?? 400
// 5 validateAddress(body.address) -> 400 {error:"invalid_address", fields} -> 6 NEXTAUTH_URL 500 (before any order)
// 7 products from DB; unitPrice = currency === "NGN" ? p.priceNgn : p.priceUsd; size validation as today
// 8 shipping = calculateShipping(subtotal, currency, address.country); total = subtotal + shipping
// 9 provider = resolveProvider(currency, process.env); client = provider === "paystack" ? paystackEnabled : stripe
// 10 if (!client) { if (!demoCheckoutAllowed(process.env)) return 503 {error:"payments_unavailable"} (no order);
//                  create order {status:"paid", paymentProvider:"demo"} + sendOrderConfirmation + return demo url }
// 11 create order {status:"pending", currency, paymentProvider: provider, shippingAddress: JSON.stringify(address), total}
// 12 try { paystack: initializeTransaction({reference: order.id, …}) -> {url: authorization_url}
//          stripe : sessions.create({currency: order.currency.toLowerCase(), … success_url …&currency=USD}) -> {url} }
//    catch { await prisma.order.update({where:{id:order.id}, data:{status:"cancelled"}}); return 502 {error:"payment_provider_error"} }
```

### Callback and webhook shape

```ts
// app/api/paystack/callback/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const REF = /^[A-Za-z0-9_-]{10,64}$/;                      // refuse junk before it reaches a URL path
export async function GET(req: Request) {
  const origin = process.env.NEXTAUTH_URL; if (!origin) return new Response("server_misconfigured", { status: 500 });
  const u = new URL(req.url);
  const reference = u.searchParams.get("reference") ?? u.searchParams.get("trxref") ?? "";
  const fail = (kind: "failed" | "cancelled" = "failed") => NextResponse.redirect(new URL(`/checkout?payment=${kind}`, origin), 303);
  if (!REF.test(reference)) return fail();
  try {
    const tx = await verifyTransaction(reference);                       // server -> Paystack with the secret key
    const order = await prisma.order.findUnique({ where: { id: reference } });
    if (!order) return fail();
    if (evaluatePaystackTransaction(tx, order) !== "paid") return fail(tx.status === "abandoned" ? "cancelled" : "failed");
    await markOrderPaid(order.id, { provider: "paystack", amount: order.total, currency: order.currency });
    return NextResponse.redirect(new URL(`/order/success?order=${order.id}&currency=${order.currency}`, origin), 303);
  } catch { return fail(); }
}
// Redirect targets are built ONLY from NEXTAUTH_URL + fixed paths + the validated order id. No request parameter is ever a destination.
```

```ts
// app/api/paystack/webhook/route.ts
export const runtime = "nodejs";
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ received: true });                       // stub/demo: nothing to verify (mirrors Stripe route)
  const raw = await req.text();                                                   // RAW first
  if (!verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"), secret))
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });    // 400/401 both fine; no work done
  let event: { event?: string; data?: PaystackTx }; try { event = JSON.parse(raw); } catch { return NextResponse.json({ received: true }); }
  if (event.event === "charge.success" && event.data) {
    const order = await prisma.order.findUnique({ where: { id: String(event.data.reference) } });
    if (order && evaluatePaystackTransaction(event.data, order) === "paid")
      await markOrderPaid(order.id, { provider: "paystack", amount: order.total, currency: order.currency });
    else console.error("paystack webhook: not applied", { reference: event.data.reference });   // ids only
  }
  return NextResponse.json({ received: true });                                    // always 200 once the signature verified
}
```

The success page gets `currency` from the query string (validated with `parseCurrency`) only for the analytics `purchase` event; the page remains presentational (no data lookup).

### `calculateShipping` (all values minor units; placeholders per D-16, flagged for the owner)

```ts
export type ShippingZone = "domestic" | "international";
export const SHIPPING_RATES: Record<ShippingZone, Record<Currency, { fee: number; freeOver: number }>> = {
  domestic:      { NGN: { fee:   500_000, freeOver: 25_000_000 }, USD: { fee:   500, freeOver: 20_000 } },
  international: { NGN: { fee: 6_000_000, freeOver: 75_000_000 }, USD: { fee: 4_000, freeOver: 50_000 } },
};
export const zoneFor = (country: string): ShippingZone => (country === "NG" ? "domestic" : "international");
export function calculateShipping(subtotalMinor: number, currency: Currency, country: string): number {
  const r = SHIPPING_RATES[zoneFor(country)][currency];
  return subtotalMinor >= r.freeOver ? 0 : r.fee;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `request.geo` / `request.ip` in middleware | `x-vercel-ip-country` request header | `geo`/`ip` removed in Next 15; header documented by Vercel | Portable, unit-testable; use it now |
| Webhook-only fulfilment (Phase 11 D-04a, Stripe) | Webhook plus server-verified callback (Paystack) | Paystack docs: verify before delivering value | `markOrderPaid` CAS makes both paths safe together |
| Single `formatPrice` / duplicated `formatCents` | One `formatMoney` over `Intl` with `narrowSymbol` | This phase | One place to change, exact `₦`/`$` output |

**Deprecated/outdated:** `@paystack/paystack-sdk` is not deprecated, but is unnecessary here (D-19). Shipping constants `FREE_SHIPPING_THRESHOLD`/`SHIPPING_FEE` and `formatPrice`/`formatCents` are removed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tests, tsc, prisma CLI | yes | 24.14.1 local; Vercel runtime version not pinned (`package.json` has no `engines`), needs >= 18 for `AbortSignal.timeout` | none needed |
| npm / npx | scripts | yes | bundled | none |
| Prisma CLI 5.22 (offline `validate`, `format`, `migrate diff --script`, `generate`) | schema + migration SQL | yes | 5.22.0 | none |
| Vitest | all tests | yes | 4.1.10 (jsdom default env) | none |
| Neon production DB | applying migration, in-browser checks | reachable by the owner only; agent must not touch | n/a | Owner checkpoint (D-30); rehearse on a Neon branch |
| Paystack account + TEST secret key | PAYM-01 UAT | owner action (not verifiable here) | n/a | Stub checkout in non-production only (D-24) |
| Paystack USD enablement (international payments + Zenith USD account) | only if `USD_PAYMENT_PROVIDER=paystack` | unknown | n/a | Stripe for USD |
| Stripe TEST keys + webhook | PAYM-02 UAT | configured in Phase 11 (assumed still present) | stripe 17.7.0 | none |
| Resend | confirmation email | configured in Phase 11 | resend ^6.25 | email skipped when key unset |
| Tunnel (ngrok/cloudflared) | local webhook testing only | not needed: UAT is on the deployed Vercel URL (D-32) | n/a | none |
| PGlite (scratch, research only) | one-off SQL proof | used outside the project | 0.5.9 | not a project dependency |

**Missing dependencies with no fallback:** none for engineering; owner-supplied Paystack test key is required for UAT.
**Missing dependencies with fallback:** Paystack USD (use Stripe); Stripe availability for a Nigeria-registered business is unverified (Open Question 1).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10, `@testing-library/react` 16, jest-axe, jsdom 29 (default env; `// @vitest-environment node` per file for middleware/jwt/PostCSS tests) |
| Config file | `vitest.config.ts` (`include: tests/**/*.test.{ts,tsx}`, globals, `vite-tsconfig-paths`) |
| Quick run command | `npx vitest run tests/currency.test.ts tests/shipping.test.ts tests/paystack-verify.test.ts` (substitute the files touched by the task) |
| Full suite command | `npx vitest run` (about 70 s; run alone, not concurrently with `tsc`) plus `npx tsc --noEmit` (about 8 s) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CURR-01 | `parseCurrency` allow-list; `currencyFromCountry` (NG->NGN, GB->USD, null->NGN); `formatMoney` exact strings (`₦45,000`, `$35`, `₦0`); `CURRENCY_SCRIPT` evaluated against cookies (none/NGN/USD/EUR/with other cookies) sets/does not set `data-currency` | unit | `npx vitest run tests/currency.test.ts` | Wave 0 (new) |
| CURR-01 | Middleware sets `nostalgia-currency` on first visit (header NG/GB/absent), leaves a valid cookie alone, re-sets a garbage one, attributes correct; matcher regex compiled and tested against page vs excluded paths (backslash trap); admin branch untouched | unit (node env) | `npx vitest run tests/currency-middleware.test.ts tests/admin-middleware.test.ts` | new + existing (must stay green) |
| CURR-01 | Compiled `globals.css` keeps the unlayered currency rule | unit (PostCSS) | `npx vitest run tests/currency-css.test.ts` | Wave 0 (clone of `site-gate-css.test.ts`) |
| CURR-01 | `<Money>` renders both spans with exact strings; order amounts use `formatMoney` not `<Money>`; toggle writes cookie, flips attribute, calls `router.refresh`, has `aria-pressed`/name | component | `npx vitest run tests/money.test.tsx tests/currency-toggle.test.tsx` | Wave 0 |
| CURR-01 | Cart/wishlist normalisers drop legacy single-`price` entries and keep valid dual-price ones; per-currency subtotals; catalog `buildProductWhere`/`buildOrderBy` use `priceNgn` vs `priceUsd` with major->minor conversion | unit | `npx vitest run tests/cart.test.ts tests/wishlist.test.ts tests/catalog.test.ts` | cart new; wishlist/catalog updated |
| CURR-02 | `autoUsdMinor` boundary table + seeded fuzz vs BigInt oracle (4k cases) + "never undercharges" property (`cents * rate >= kobo`, `< kobo + 100 * rate`); `isValidRate` bounds 100/100000, rejects 99, 100001, 1500.5, NaN, "1500" | unit | `npx vitest run tests/currency.test.ts` | Wave 0 |
| CURR-02 | `setUsdNgnRate`/settings action: `requireOwner()` called first, rejects invalid rate, `$transaction` with upsert + `$executeRaw` whose template text contains `CEIL("priceNgn"::numeric / (` and `WHERE "priceUsdOverride" IS NULL` and bound value equals the integer rate; revalidates routes. Product actions: parse `priceNgn` required, `priceUsd` optional major units x100, reject negative/fractional/NaN/oversized, no FormData spread, computed `priceUsd` uses the DB rate | unit | `npx vitest run tests/admin-settings.test.ts tests/admin-product-placement.test.ts tests/slug.test.ts` | settings new; others updated |
| CURR-02 | Migration SQL: one-off real-Postgres proof recorded in this document; optional PGlite test applying `prisma/migrations/*` and asserting the backfill table | integration (optional devDependency, needs install gate) | `npx vitest run tests/migration-multi-currency.test.ts` | optional |
| PAYM-01 | `verifyWebhookSignature` matrix; `evaluatePaystackTransaction` matrix (paid/failed/pending/mismatch incl. wrong amount, wrong currency, wrong provider, wrong reference) | unit | `npx vitest run tests/paystack-verify.test.ts` | Wave 0 |
| PAYM-01 | `lib/paystack.ts` request shape (URL, bearer header, string `amount`, `reference`, `callback_url`, `metadata.cancel_action`, `AbortSignal`), error mapping, encoded verify path | unit (fetch stub) | `npx vitest run tests/paystack.test.ts` | Wave 0 |
| PAYM-01 | Webhook route: bad/missing signature writes nothing; non-`charge.success` no-op; mismatch no-op; match -> `markOrderPaid` once; always 200 after signature | route | `npx vitest run tests/paystack-webhook.test.ts` | Wave 0 |
| PAYM-01 | Callback route: success -> redirect to `/order/success`; failed/abandoned/unknown/malformed/verify-throws -> `/checkout?payment=...`; never success without a verified match; location always under `NEXTAUTH_URL` | route | `npx vitest run tests/paystack-callback.test.ts` | Wave 0 |
| PAYM-01, PAYM-02 | `markOrderPaid`: exact CAS `where`, email only on `count===1`, second call no email | unit | `npx vitest run tests/payments.test.ts` | Wave 0 |
| PAYM-02 | Stripe webhook: `payment_status!=="paid"`, amount mismatch, currency mismatch, wrong provider -> no write/email; match -> one `markOrderPaid`; existing signature/idempotency cases preserved | route | `npx vitest run tests/stripe-webhook.test.ts` | exists, rewrite |
| PAYM-02 | `resolveProvider` matrix (NGN->paystack; USD default stripe; exact `"paystack"` only); checkout route Stripe branch: `currency:"usd"`, line-item sum equals `Order.total` incl. shipping line | unit/route | `npx vitest run tests/payment-provider.test.ts tests/checkout-route.test.ts` | Wave 0 / rewrite of `checkout-shipping` |
| SHIP-01 | `calculateShipping` 2 zones x 2 currencies, `freeOver` boundary (`-1`, `==`, `+1`); `validateAddress` (required fields, caps, phone, ISO country, NG state exact list, control chars, normalised output); `parseShippingAddress` defensive on corrupt JSON; checkout route 400s on bad address and persists JSON; admin/account/email render address | unit/component | `npx vitest run tests/shipping.test.ts tests/address.test.ts tests/orders.test.ts tests/checkout-route.test.ts tests/email.test.ts tests/account-order-detail.test.tsx` | mix new/updated |
| ORDR-01 | Orders persist `currency`, `paymentProvider`; stub checkout: production without `ALLOW_DEMO_CHECKOUT` -> 503 and no `order.create`; `"true"` or non-production -> stub order with `paymentProvider:"demo"` + email; displays/emails format with order currency incl. legacy `USD` fallback; `begin_checkout`/`purchase` carry `currency`; JSON-LD two Offers | unit/route/component | `npx vitest run tests/checkout-route.test.ts tests/payment-provider.test.ts tests/email.test.ts tests/account-orders.test.tsx tests/account-order-detail.test.tsx tests/seo.test.ts tests/analytics.test.ts` | mix |

### Sampling Rate
- **Per task commit:** the quick-run line for the files that task touched, plus `npx tsc --noEmit` when types changed.
- **Per wave merge:** `npx vitest run` (full) and `npx tsc --noEmit`.
- **Phase gate:** full suite green and `tsc` clean before `/gsd-verify-work`; UAT items below done on the deployed site with Paystack TEST and Stripe TEST keys (D-32).

### Wave 0 Gaps
- [ ] New test files listed above (`currency`, `currency-middleware`, `currency-css`, `money`, `currency-toggle`, `cart`, `shipping`, `address`, `payment-provider`, `paystack-verify`, `paystack`, `paystack-webhook`, `paystack-callback`, `payments`, `checkout-route`, `admin-settings`).
- [ ] Rewrite `tests/checkout-shipping.test.ts` and `tests/stripe-webhook.test.ts`; update `email`, `seo`, `catalog`, `wishlist`, `admin-product-placement`, `slug`, `account-*` tests (section E).
- [ ] Framework install: none.

### Manual-only checks (cannot be automated here)
1. **Paystack hosted page (TEST):** pay NGN with `4084 0840 8408 4081` (09/27, CVV 408): lands on `/order/success`, order flips to `paid` once, one email. Decline with `4084 0800 0000 5408`: Paystack shows the failure; abandon/close and confirm no `paid`. Click Paystack's "Cancel payment": lands on `/checkout?payment=cancelled` with the cart intact (confirms `metadata.cancel_action`, and whether object vs string metadata is accepted).
2. **Real redirects on Vercel:** callback URL host equals `NEXTAUTH_URL`; `reference` vs `trxref` query names; a second visit to the callback URL does not send a second email.
3. **Webhook delivery:** register `https://<domain>/api/paystack/webhook` in the Paystack TEST dashboard; confirm a `charge.success` delivery returns 200 and the payload fields match the assumed shape; closing the tab before the redirect still results in `paid` via the webhook. Check `data.amount` equals the order total (fee-bearer setting).
4. **Stripe TEST (USD):** pay with a test card; webhook flips to `paid`; a tampered amount cannot be produced by the client.
5. **Geo cookie on Vercel:** from a non-Nigerian IP/VPN first visit shows `$` with no flash; Nigerian/unknown gets `₦`; cookie attributes in devtools (`SameSite=Lax`, one year, not HttpOnly); static home page still static (response served from cache with the cookie applied).
6. **In-browser toggle:** switch ₦/$ on home, shop, product, cart, drawer, checkout, wishlist; no flash on reload, no console hydration warnings, cart untouched, /shop price sort and `?price=` filter follow the currency, screen reader reads only the active price.
7. **Admin:** set ₦ and optional $ prices, change the rate and see auto prices move, orders show currency/provider/address.
8. **Migration:** rehearse on a Neon branch, then apply to production (D-30 owner checkpoint), spot-check backfilled prices; if Paystack USD is used, confirm USD test-mode works.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (checkout requires session) | Existing NextAuth `getServerSession` on `/api/checkout`; webhooks authenticated by HMAC, not sessions |
| V3 Session Management | no change | NextAuth unchanged; currency cookie holds no identity |
| V4 Access Control | yes | `requireOwner()` as first statement of every new admin action/page (`/admin/settings`, product actions); callback and webhook are public by design and gated by server-side verification |
| V5 Input Validation | yes | Allow-lists (currency, provider, ISO country, NG states), length caps, phone charset, integer/range checks for prices and rate, reference shape check, `parseShippingAddress` defensive parse |
| V6 Cryptography | yes | `node:crypto` HMAC-SHA512 + `timingSafeEqual`; Stripe `constructEvent`; no custom crypto |
| V7 Error handling / logging | yes | Ids and verdicts only; no bodies, signatures, addresses, emails or keys in logs |
| V8 Data protection | yes | Address is PII in `Order.shippingAddress`; excluded from analytics; shown only to the owning user and the owner |
| V13 API / webhooks | yes | Signature before parse, always-2xx after verification, replay-safe via CAS |
| V14 Configuration | yes | Secrets only in env; `NEXTAUTH_URL` required with no fallback; strict-equality flags |

## Security Threats

| # | Threat (STRIDE) | Mitigation | Decision |
|---|-----------------|------------|----------|
| T1 | **Webhook forgery** (Spoofing): attacker POSTs a fake `charge.success` or Stripe event | Raw body, HMAC-SHA512 with the secret key compared with `timingSafeEqual` (length-guarded) before any parse or DB access; Stripe `constructEvent`; missing key -> no-op; IP allow-list deliberately not relied on | D-20, D-22 |
| T2 | **Amount/currency tampering** (Tampering): client alters totals, currency or provider; provider event for a cheaper transaction reused | Server recomputes every unit price from the DB in the allow-listed currency; shipping via the shared pure function; `evaluatePaystackTransaction` and the Stripe checks require `status`, `amount`, `currency`, `reference`, provider to equal the stored order; `markOrderPaid` CAS repeats `total`/`currency`/`paymentProvider` in the WHERE | D-01, D-17, D-20, D-22 |
| T3 | **Callback reference spoofing** (Spoofing): attacker hits `/api/paystack/callback?reference=<other order>` or forges a "success" redirect | The redirect proves nothing; server-side `verifyTransaction` with the secret key plus the same predicate; reference shape-validated and `encodeURIComponent`-ed; only a genuinely paid, matching order reaches success; the success page is presentational and reveals only the last 8 characters | D-21 |
| T4 | **Replay / double-send** (Repudiation, DoS-by-email): provider retries (live: 4 tries then hourly for 72 h), webhook and callback race, replayed signed payload | Idempotent CAS `pending -> paid` (`count===1` gate on the email); replays of a valid signed event after the order is paid or cancelled change nothing; Postgres READ COMMITTED re-evaluates WHERE after the row lock | D-22 |
| T5 | **Open redirect in callback** (Spoofing): redirect built from query input | Destinations are `NEXTAUTH_URL` + fixed paths + the validated order id; no request parameter is ever a target; unit test with hostile `reference`/`callbackUrl` | D-19, D-21 |
| T6 | **Mass assignment in admin price/rate actions** (Tampering/Elevation) | `requireOwner()` first; field-by-field extraction (no `FormData` spread into Prisma `data`); computed `priceUsd` never accepted from the client; integer, non-negative, upper-bounded values; `isValidRate` 100..100000 | D-05, D-06, D-07 |
| T7 | **SQL injection in the bulk recompute** | One `$executeRaw` tagged template; the only interpolation is the bound, validated integer rate; no string concatenation; test asserts the template text and bound value | D-06 |
| T8 | **Stub checkout on production** (Elevation: free "paid" orders if a key is missing) | `demoCheckoutAllowed(env)`: `ALLOW_DEMO_CHECKOUT === "true"` or `NODE_ENV !== "production"`; otherwise 503 `payments_unavailable` before any order is created; provider-throw path cancels the pending order | D-24 |
| T9 | **Secret/PII leakage in logs and analytics** (Information disclosure) | Log ids/verdicts only; never log raw bodies, signatures, secrets, emails or addresses; analytics payloads carry `currency` and amounts only; `PAYSTACK_SECRET_KEY` never sent to the client or placed in `NEXT_PUBLIC_*` | D-27, D-31 |
| T10 | **Cookie tampering** (currency cookie set to junk) | Cookie is a display preference only; every read passes `parseCurrency`; checkout re-validates the POSTed currency and prices from the DB | D-01, D-09 |
| T11 | **Stored XSS via address** | Address strings rendered as React children (escaped), including in the email template; control characters rejected; JSON-LD continues to use `serializeJsonLd` | D-15, D-25 |
| T12 | **IDOR on orders** | Unchanged account/admin queries scoped by `userId` / owner gate; do not widen them when adding the address block | existing |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Paystack accepts `metadata` sent as a plain JSON object in the initialize body and honours `cancel_action` inside it (API reference calls metadata a "stringified JSON object") | Pattern 1 | Cancel redirect lost; fall back to `JSON.stringify(metadata)` or accept Paystack's default cancel behaviour |
| A2 | Callback appends both `trxref` and `reference` (docs mention only `reference`) | Pattern 1 | Code already reads `reference` first, `trxref` as fallback; low risk |
| A3 | A 25-character cuid is an acceptable Paystack `reference` (no length limit documented) and duplicate references are rejected | Pattern 1 | Initialize errors; mitigated by 502 path and a UAT run |
| A4 | `charge.success` webhook `data` contains `status`, `reference`, `amount`, `currency` (official sample did not render in the fetched copy; confirmed from third-party guides) | Pattern 1 | Webhook would never mark paid; callback still covers shoppers who stay; UAT item 3 |
| A5 | Merchant bears Paystack fees by default so `data.amount` equals the requested amount; `requested_amount` is present | Pitfall 10 | Every payment rejected as mismatch if fees are passed to the customer |
| A6 | Paystack USD works in test mode and needs only international payments + Zenith USD account | Pattern 1 | `USD_PAYMENT_PROVIDER=paystack` path untestable until enabled |
| A7 | Stripe can onboard a Nigeria-registered business directly (unverified; Atlas-style US entity is the known alternative) | Summary / Open Question 1 | Dollar orders have no processor unless Paystack USD is enabled |
| A8 | Vercel Preview deployments set `NODE_ENV=production` | Pitfall 11 | Stub unexpectedly open on previews; low risk (stricter default is the safe side) |
| A9 | `narrowSymbol` is supported by all browsers the store targets | Pattern 3 | Client-rendered prices would show `NGN 45,000`; unit-test strings, consider a manual symbol map fallback |
| A10 | A Prisma migration file on Postgres applies as one implicit transaction (failure leaves the DB unchanged) | Database section | Partial migration on failure; mitigated by rehearsing on a Neon branch |
| A11 | Middleware invocations are cheap/within plan limits; `missing`-cookie gating makes them first-visit-only | Pattern 4 | Slightly higher edge usage; no correctness impact |
| A12 | Vercel's runtime Node version is >= 18 (`AbortSignal.timeout`); project does not pin `engines` | Environment | Timeout helper missing; add `engines` or use `AbortController` |
| A13 | Browser applies `Set-Cookie` from the document response before running the inline script | Pattern 4 | First paint on the wrong currency for geo-USD visitors; standard HTTP behaviour, UAT item 5 |
| A14 | Free-shipping and shipping fee placeholders in D-16 are the owner's real policy | D-16 | Wrong charges; already flagged as placeholders |

## Open Questions

1. **Can the Nigeria-registered business open a Stripe account for USD?**
   - What we know: owner chose Stripe for dollars; Stripe direct onboarding for Nigerian entities could not be confirmed; Paystack (Stripe-owned) offers USD to approved Nigerian merchants (international payments + Zenith USD account, about 3.9% card fee).
   - What's unclear: whether Stripe TEST keys alone (for UAT) are available to the owner and whether live USD will use Stripe at all.
   - Recommendation: keep D-18's `USD_PAYMENT_PROVIDER=paystack` switch fully tested and documented in `12-OWNER-SETUP.md`, with a Paystack USD enablement checklist; owner decides before go-live.
2. **Paystack fee-bearer and `requested_amount`.** Decide once whether the webhook/callback also accepts `requested_amount === order.total`. Recommendation: strict `amount` by default, owner setup says "merchant bears fees", verify on the first TEST transaction; add the `requested_amount` branch only if the TEST payload shows fees added.
3. **Unshippable destinations.** All 249 ISO countries are allowed by default. Recommendation: add an owner-confirmed `UNSHIPPABLE_COUNTRIES` constant (candidate: KP, IR, SY, CU) subtracted from the list; empty is acceptable if the owner prefers.
4. **Free-shipping copy.** PDP/TrustStrip say one threshold, but domestic and international thresholds differ (₦250,000/$200 vs ₦750,000/$500). Recommendation: copy shows the domestic threshold labelled "in Nigeria" with a link to `/shipping`, which lists both zones.
5. **Abandoned `pending` orders** accumulate (inherited behaviour). Recommendation: out of scope; mention in owner notes; cancel only when initialization itself fails.
6. **Stale cart prices vs server price.** Checkout totals come from localStorage snapshots while the server reprices; a rate or price change can make the provider amount differ. Recommendation: have `/api/checkout` return a quote or verify the client-sent expected total and return 409 `price_changed` so the page refreshes; if descoped, label the summary as an estimate.
7. **Paystack behaviours to confirm in the first TEST run** (A1 to A4): metadata shape, `cancel_action`, `trxref`, webhook payload fields. Recommendation: UAT checklist items 1 to 3 are blocking; adjust `lib/paystack.ts` accordingly.
8. **Paystack USD in test mode** (A6): only relevant if the switch is used.
9. **Stock decrement and sold-out rejection** remain deferred (overselling risk); `markOrderPaid` is the natural future hook. Flag to the owner at go-live.

## Sources

### Primary (HIGH confidence)
- `https://docs-v2.production.paystack.co/payments/webhooks` (Paystack-owned docs host; fetched with curl because paystack.com returns 403 to WebFetch): signature header, HMAC SHA512, IPs, retry policy. **Verified.**
- `https://docs-v2.production.paystack.co/payments/accept-payments`, `/payments/verify-payments`, `/payments/metadata`, `/payments/test-payments`, `/api/transaction`: initialize/verify fields, `callback_url`, `cancel_action`, statuses, test cards, `requested_amount` sample. **Verified.**
- `https://support.paystack.com/en/articles/2130690`: USD requirements for Nigerian merchants. **Verified.**
- `https://nextjs.org/docs/14/app/building-your-application/routing/middleware`: matcher, `missing`, cookies, request headers. **Verified.**
- `https://vercel.com/docs/headers/request-headers`: `x-vercel-ip-country`. **Verified.**
- `https://www.postgresql.org/docs/current/transaction-iso.html` (Read Committed): UPDATE re-evaluates WHERE. **Verified.**
- `https://en.wikipedia.org/wiki/ISO_3166-2:NG`: state list. **Verified.**
- `https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json`: 249 alpha-2 codes. **Verified.**
- `https://raw.githubusercontent.com/vercel/vercel/main/packages/next/src/index.ts`: `vercel-build` script handling. **Verified.**
- Local verification: `node_modules/stripe/types/Checkout/Sessions.d.ts` (stripe 17.7.0); `node_modules/next` (14.2.35) matcher compiler via `getMiddlewareMatchers`; Node 24.14.1 `Intl` runs; PGlite 0.5.9 + Prisma 5.22.0 scratch runs (migration, recompute, CAS, `$transaction`); `npm view` and `package-legitimacy` seam results.

### Secondary (MEDIUM confidence)
- Stripe docs on `payment_status` and delayed payments (`docs.stripe.com/payments/checkout/fulfill-orders`), via web search summary, not fetched in full.
- `https://github.com/PaystackOSS/openapi` OpenAPI spec (listing only; schemas truncated).

### Tertiary (LOW confidence, flagged as assumptions)
- Third-party Paystack guides (mctaba.com, hookdeck.com) for the `charge.success` field shape and `trxref`; web-search results on Stripe availability for Nigerian businesses (no authoritative source found).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new is added and installed versions were read from disk.
- Architecture: HIGH, the money, migration, CAS, formatting and matcher claims were executed.
- Paystack specifics: MEDIUM, official docs cover most of it; the listed assumptions need the first TEST run.
- Pitfalls: HIGH for code/DB/Next items, MEDIUM for provider behaviour.

**Research date:** 2026-10-13
**Valid until:** 2026-11-12 for Next/Prisma/Stripe findings; 2026-10-20 for Paystack behaviours until confirmed in a TEST run.
