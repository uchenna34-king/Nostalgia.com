---
phase: 12-multi-currency-payments-ngn-via-paystack-usd-via-stripe
type: outline
plan_count: 18
waves: 8
granularity: standard
mvp_mode: false
tdd_mode: opportunistic (task-level tdd="true" on every pure module and route)
security_enforcement: true
asvs_level: 1
block_on_severity: high
created: 2026-10-13
---

# Phase 12: Multi-currency payments (NGN via Paystack, USD via Stripe) — Plan Outline

> Chunked-mode outline. No PLAN.md files are written yet. Each row below becomes one
> `.planning/phases/12-multi-currency-payments-ngn-via-paystack-usd-via-stripe/12-NN-PLAN.md`.

**Phase completion definition (D-32, non-negotiable):** deployed and UAT-ready on Paystack
**TEST** and Stripe **TEST** keys. Live keys, real charges, and every owner-only item are listed in
`12-OWNER-SETUP.md` (plan 12-18) and never carried out by an executor.

**Why 18 plans:** the phase touches about 115 files (51 new, about 64 modified or read-checked).
At 2-3 tasks per plan and 5 files or fewer per task, that cannot fit in fewer plans without
exceeding the ~50% context budget. Granularity sets how far to compress, not a plan-count target.

---

## Plan Table

| Plan ID | Objective | Wave | Depends On | Requirements |
|---------|-----------|------|------------|--------------|
| `12-01` | Pure, Prisma-free `lib/currency.ts` (D-01, D-02 formatter, D-04 auto-USD, D-05 rate bounds, D-09 cookie constants, D-10 before-paint script), built test-first: exact `₦45,000`/`$35` strings and a BigInt-oracle fuzz proving `autoUsdMinor` never undercharges. | 1 | — | CURR-01, CURR-02 |
| `12-02` | Pure payment libraries: `resolveProvider` + `demoCheckoutAllowed` (D-18, D-24, strict-equality flags), `verifyWebhookSignature` + the single shared `evaluatePaystackTransaction` verdict (D-20), and the fetch-based `lib/paystack.ts` client (D-19, null if no key, string `amount`, `metadata.cancel_action`, 10 s timeout). | 2 | `12-01` | PAYM-01, PAYM-02, ORDR-01 |
| `12-03` | Address and order helpers: `lib/countries.ts` (249 ISO codes, unshippable subtraction, `Intl.DisplayNames` labels), `lib/address.ts` (`validateAddress`, 37 Nigerian states, phone rule, the one shared error-message map, `addressLines`), and additive `lib/orders.ts` helpers (`parseShippingAddress`, provider allow-list and labels, `orderCurrency` legacy-USD fallback, derived `orderShippingMinor`) (D-15, D-25, UI-SPEC A-7). | 2 | `12-01` | SHIP-01, ORDR-01 |
| `12-04` | Dual-currency display layer (D-10, D-FONT-1..3): the `<Money>`/`<CurrencySymbol>` dual-span components, the unlayered `data-currency` CSS rule guarded by a compile test, `CURRENCY_SCRIPT` in the root `<head>` (root layout still reads no cookies, per D-12), and the vendored Inter latin-ext woff2 so `₦` renders in Inter. | 2 | `12-01` | CURR-01 |
| `12-05` | Currency choice (D-09, D-11, D-12): first-visit geo cookie in `middleware.ts` (admin branch kept exactly as it behaves today; matcher backslash trap guarded by a test), `getCurrency()` server helper, `CurrencyContext`, and the `CurrencyToggle` (bar variant beside ThemeToggle, menu variant in the mobile sheet) that drops a stale `?price=` param and refreshes. | 2 | `12-01` | CURR-01 |
| `12-06` | Checkout presentational components built interface-first (D-15, D-21 notice, D-27 trust line): `AddressForm` (8 fields, Nigeria state select vs free text, blur/submit validation through the shared `validateAddress`, focus-first-invalid), `OrderSummary` (Paying-in line, zone caption, provider-named trust line, Pay button bound by `form="checkout-form"`), `PaymentNotice` (failed/cancelled/pending, focused on mount), plus the checkout error-copy map. | 3 | `12-01`, `12-03` | SHIP-01, PAYM-01 |
| `12-07` | Schema + hand-authored expand-only migration (D-03, D-05, D-08, D-25, D-30): three Product price columns, Order currency/provider/address columns, singleton `StoreSettings` seeded at ₦1,500; offline `migrate diff` then hand-edit; static SQL contract test; **no `prisma generate`**; then the **[BLOCKING] owner checkpoint** that rehearses on a Neon branch and applies with `npx prisma migrate deploy`. | 3 | `12-02`, `12-03`, `12-04`, `12-05` (ordering) | CURR-02, SHIP-01, ORDR-01 |
| `12-08` | Regenerate the Prisma client (after the migration is applied) and land every compile-forced server consumer: `prisma/seed.ts` (compile only, never run), `lib/products.ts` price mapping, currency-aware `lib/catalog.ts` with major→minor `?price=` (D-28), `lib/settings.ts` with the parameterized `$executeRaw` recompute (D-04, D-06), and admin product pricing (₦ required, $ optional, auto preview, "auto" marker) (D-07). | 4 | `12-07`, `12-01` | CURR-02, CURR-01 |
| `12-09` | Cart dual-price snapshots (D-13 cart side, D-14): pure `lib/cart.ts` normaliser (drops legacy single-`price` entries), per-currency `subtotals`, `updatePrices` (for the 409 quote), `AddToCart` snapshot, cart page + drawer via `<Money>` with "Calculated at checkout" / "Estimated total", and serif→sans price values (D-FONT-2). | 5 | `12-08`, `12-04` | CURR-01 |
| `12-10` | `lib/payments.ts` `markOrderPaid` atomic compare-and-set with email only when `count === 1` (D-22), and the Stripe webhook switched onto it with `payment_status`, `amount_total` and lowercase `currency` checks (D-22, D-23), test-first. | 5 | `12-08` | PAYM-01, PAYM-02, ORDR-01 |
| `12-11` | Owner-gated `/admin/settings` exchange-rate page (D-05, D-06): `requireOwner()`-first server action calling `setUsdNgnRate`, revalidation of storefront routes, impact/example lines, >20% change confirm, placeholder note, and the Settings link in `AdminNav`. | 5 | `12-08` | CURR-02 |
| `12-12` | Confirmation email in the order's own currency (D-02 `formatCents` removed, D-26): `formatMoney(…, order.currency)` lines/total, derived Shipping row, "Delivering to" address block, 96 px nowrap amount column, UTF-8 charset check. | 5 | `12-08`, `12-03` | ORDR-01, SHIP-01 |
| `12-13` | Account and admin order displays in the order's own currency (D-26, UI-SPEC A-7, A-17): account `OrderList`/`OrderDetail` (derived Shipping row, address block), admin `OrderTable` (+ "Paid via" column), admin order detail (Payment `dl`, Delivery address with `tel:` link, legacy copy). IDOR-scoped queries untouched. | 5 | `12-08`, `12-03` | ORDR-01, SHIP-01 |
| `12-14` | Destination shipping + checkout (D-14..D-19, D-23, D-24, D-27, Open Question 6): zone × currency `lib/shipping.ts`; `POST /api/checkout` with `{items, currency, address, expectedTotal}`, DB repricing per currency, provider routing, Paystack init / Stripe session, 503 `payments_unavailable`, 409 `price_changed`, cancel-on-provider-error; `/checkout` becomes a server wrapper (server-evaluated provider names, `?payment=` read server-side) around a new `CheckoutClient`. | 6 | `12-02`, `12-03`, `12-05`, `12-06`, `12-08`, `12-09` | CURR-01, PAYM-01, PAYM-02, SHIP-01, ORDR-01 |
| `12-15` | Paystack webhook (raw body, HMAC-SHA512 timing-safe verify before parsing, `charge.success` only, shared verdict, always 200 after verify) and server-verified callback (`/order/success` only on a verified match; failed / cancelled / pending otherwise; every redirect built from `NEXTAUTH_URL`) (D-20, D-21, A-5), plus `purchase` analytics carrying `currency` (D-27). | 6 | `12-02`, `12-10` | PAYM-01, PAYM-02 |
| `12-16` | Storefront product surfaces + wishlist (D-13 wishlist side, D-16 PDP copy, D-29): `WishlistItem.prices` + legacy discard, ProductCard / EditRail / PDP through `<Money>`, PDP "Free shipping over … in Nigeria", two JSON-LD Offers; then retire the legacy `Product.price` field and `formatPrice` (D-02 completion). | 7 | `12-04`, `12-08`, `12-09`, `12-13`, `12-14` | CURR-01 |
| `12-17` | Shop/collection sort and `?price=` filter follow the active currency (D-12, D-28): pages pass `getCurrency()`, `FilterPanel` gets a `<CurrencySymbol>` prefix + a shared unit description; free-delivery copy in TrustStrip and `/shipping` rendered from `lib/shipping.ts` constants through `<Money>` (D-16). | 7 | `12-04`, `12-05`, `12-08`, `12-14` | CURR-01, SHIP-01 |
| `12-18` | Phase close-out (D-31, D-32): author `12-OWNER-SETUP.md`, finalize `12-VALIDATION.md` (task IDs, Nyquist sign-off) after a full green suite, then two human-verify checkpoints: local in-browser verification and deployed UAT on Paystack TEST + Stripe TEST keys. | 8 | all (`12-01`…`12-17`) | CURR-01, CURR-02, PAYM-01, PAYM-02, SHIP-01, ORDR-01 |

---

## Wave Structure

| Wave | Plans (execution order) | Rationale |
|------|-------------------------|-----------|
| 1 | `12-01` | `lib/currency.ts` is imported by everything else (types, formatter, cookie constants). |
| 2 | `12-02`, `12-03`, `12-04`, `12-05` | All depend only on `12-01`; none touches Prisma's new fields. File-disjoint (see below). |
| 3 | `12-06`, `12-07` | `12-06` needs `lib/address.ts` (12-03). `12-07` is placed **after all schema-independent work** (ordering dependency on 12-02..12-05). Reason: once the migration is applied, the currently deployed (old) code cannot create products in /admin (`priceNgn` is NOT NULL). Starting that window as late as possible keeps it as short as possible. |
| 4 | `12-08` | The only plan that runs `prisma generate`; it needs the owner-applied migration from `12-07`. |
| 5 | `12-09`, `12-10`, `12-11`, `12-12`, `12-13` | All need the regenerated client / new Product fields (12-08). File-disjoint. |
| 6 | `12-14`, `12-15` | `12-14` needs cart `prices` (12-09) and the checkout components (12-06). `12-15` needs `markOrderPaid` (12-10). File-disjoint. |
| 7 | `12-16`, `12-17` | Both need `FREE_SHIPPING_OVER` / `SHIPPING_RATES` from 12-14. `12-16` also retires `formatPrice`, so every other caller must already be migrated (12-08 ProductTable, 12-09 cart, 12-13 orders, 12-14 checkout). File-disjoint. |
| 8 | `12-18` | Docs, sign-off, and human verification run only once every code surface exists. |

Executors run **sequentially on master** (no worktrees), so waves set the order, not parallelism. Every
wave is still file-disjoint.

---

## File Ownership (disjoint within every wave)

| Wave | Plan | Files (new = N, modified = M, deleted = D, read-only check = R) |
|------|------|------------------------------------------------------------------|
| 1 | 12-01 | N `lib/currency.ts`, N `tests/currency.test.ts` |
| 2 | 12-02 | N `lib/payment-provider.ts`, N `lib/paystack-verify.ts`, N `lib/paystack.ts`, N `tests/payment-provider.test.ts`, N `tests/paystack-verify.test.ts`, N `tests/paystack.test.ts` |
| 2 | 12-03 | N `lib/countries.ts`, N `lib/address.ts`, N `tests/address.test.ts`, M `lib/orders.ts` (additive), M `tests/orders.test.ts` |
| 2 | 12-04 | N `components/Money.tsx`, N `tests/money.test.tsx`, M `app/globals.css`, M `app/layout.tsx`, N `tests/currency-css.test.ts`, N `app/fonts/Inter-latin-ext-normal.woff2`, M `lib/fonts.ts`, M `tailwind.config.ts`, N `tests/fonts.test.ts` |
| 2 | 12-05 | M `middleware.ts`, N `lib/currency-server.ts`, N `tests/currency-middleware.test.ts`, N `tests/currency-server.test.ts`, N `context/CurrencyContext.tsx`, N `components/CurrencyToggle.tsx`, N `tests/currency-toggle.test.tsx`, M `components/Providers.tsx`, M `components/Nav.tsx`, M `tests/admin-link.test.tsx` |
| 3 | 12-06 | N `components/checkout/AddressForm.tsx`, N `components/checkout/OrderSummary.tsx`, N `components/checkout/PaymentNotice.tsx`, N `components/checkout/messages.ts`, N `tests/address-form.test.tsx`, N `tests/checkout-summary.test.tsx` |
| 3 | 12-07 | M `prisma/schema.prisma`, N `prisma/migrations/20261013120000_multi_currency/migration.sql`, N `tests/migration-multi-currency.test.ts` |
| 4 | 12-08 | M `prisma/seed.ts`, M `lib/products.ts` (**B1, partial**), M `lib/catalog.ts`, M `tests/catalog.test.ts`, M `app/api/checkout/route.ts` (**B2, interim**), M `tests/checkout-shipping.test.ts` (**B3, interim**), N `lib/settings.ts`, N `tests/settings.test.ts`, M `app/admin/products/actions.ts`, M `tests/admin-product-placement.test.ts`, M `tests/slug.test.ts`, M `components/admin/ProductForm.tsx`, M `components/admin/ProductTable.tsx`, M `app/admin/products/page.tsx`, M `app/admin/products/[id]/edit/page.tsx`, M `app/admin/products/new/page.tsx` |
| 5 | 12-09 | N `lib/cart.ts`, N `tests/cart.test.ts`, M `context/CartContext.tsx`, M `app/checkout/page.tsx` (**B4, interim**), M `components/AddToCart.tsx`, M `app/cart/page.tsx`, M `components/CartDrawer.tsx` |
| 5 | 12-10 | N `lib/payments.ts`, N `tests/payments.test.ts`, M `app/api/stripe/webhook/route.ts`, M `tests/stripe-webhook.test.ts` (rewrite) |
| 5 | 12-11 | N `app/admin/settings/page.tsx`, N `app/admin/settings/actions.ts`, N `components/admin/RateForm.tsx`, M `components/admin/AdminNav.tsx`, N `tests/admin-settings.test.ts` |
| 5 | 12-12 | M `lib/email-content.ts`, M `emails/OrderConfirmation.tsx`, M `tests/email.test.ts`, R `lib/email.ts` (passes the full order row; modify only if `tsc` demands it) |
| 5 | 12-13 | M `components/account/OrderList.tsx`, M `components/account/OrderDetail.tsx`, M `components/admin/OrderTable.tsx`, M `app/admin/orders/page.tsx`, M `app/admin/orders/[id]/page.tsx`, M `tests/account-orders.test.tsx`, M `tests/account-order-detail.test.tsx`, N `tests/admin-orders.test.tsx`, R `app/account/page.tsx`, R `app/account/orders/[id]/page.tsx` |
| 6 | 12-14 | M `lib/shipping.ts`, N `tests/shipping.test.ts`, M `app/api/checkout/route.ts` (**final**), N `tests/checkout-route.test.ts`, D `tests/checkout-shipping.test.ts` (**final: deleted**), M `app/checkout/page.tsx` (**final: server wrapper**), N `components/checkout/CheckoutClient.tsx` |
| 6 | 12-15 | N `app/api/paystack/webhook/route.ts`, N `tests/paystack-webhook.test.ts`, N `app/api/paystack/callback/route.ts`, N `tests/paystack-callback.test.ts`, M `app/order/success/page.tsx`, M `tests/analytics.test.ts` |
| 7 | 12-16 | M `lib/wishlist.ts`, M `tests/wishlist.test.ts`, M `context/WishlistContext.tsx`, M `app/wishlist/page.tsx`, M `lib/seo.ts`, M `tests/seo.test.ts`, M `components/ProductCard.tsx`, M `components/EditRail.tsx`, M `app/product/[slug]/page.tsx`, M `lib/products.ts` (**B1 final**), N `tests/storefront-money.test.tsx`, R `components/WishlistButton.tsx` |
| 7 | 12-17 | M `app/shop/[[...slug]]/page.tsx`, M `app/collections/[slug]/page.tsx`, M `components/shop/FilterPanel.tsx`, N `tests/filter-panel.test.tsx`, M `components/home/TrustStrip.tsx`, M `app/shipping/page.tsx`, N `tests/shipping-copy.test.tsx` |
| 8 | 12-18 | N `.planning/phases/12-…/12-OWNER-SETUP.md`, M `.planning/phases/12-…/12-VALIDATION.md` |

**Never touched by any plan:** `.env`, `.env.example` (deny-listed; D-31 documents variables in
`12-OWNER-SETUP.md` instead), `package.json` / `package-lock.json` (this phase installs nothing),
`lib/analytics.ts` (its payload type already accepts `currency`), `components/PaymentMarks.tsx`
(Deferred), `tests/admin-middleware.test.ts`, `tests/site-gate-css.test.ts`, `tests/a11y.test.tsx`
(must stay green **without edits**).

### Interim edits (the only files touched by two plans; always in different waves)

Regenerating the Prisma client turns `Product.price` into `priceUsd`, and the change spreads through
about 30 files at compile time. That is far more than one plan can hold. Each plan below must end
with `tsc` clean and `vitest` green, so four files get a small interim edit that **keeps today's
behaviour exactly**. A named later plan then gives each its final form. Nothing is reduced in scope:
each file still reaches its full Phase-12 form in this phase.

| ID | File | Interim edit (plan, exact scope) | Final owner |
|----|------|-------------------------------|-------------|
| B1 | `lib/products.ts` | `12-08`: `Product` gains `priceNgn` and `priceUsd` (minor units); `deserialize` maps fields explicitly and never passes `priceUsdOverride` to client props; the existing `price` field is still populated with the `priceUsd` value; `getCatalog` gains optional `currency` (defaults to NGN). | `12-16` removes `Product.price` and deletes `formatPrice` once every caller is migrated. |
| B2 | `app/api/checkout/route.ts` | `12-08`: one line, the unit price reads `p.priceUsd` (the same physical `price` column, so the USD charge is identical). | `12-14` full rewrite. |
| B3 | `tests/checkout-shipping.test.ts` | `12-08`: product fixtures gain `priceUsd` (and `priceNgn`) so the B2 line resolves; assertions unchanged. | `12-14` deletes the file and replaces it with `tests/checkout-route.test.ts`. |
| B4 | `app/checkout/page.tsx` | `12-09`: reads `item.prices.USD` and `subtotals.USD` so today's USD-only checkout compiles and behaves exactly as before. | `12-14` turns it into a server wrapper around `CheckoutClient`. |

The plan writer for 12-08 and 12-09 must state in the task action that the interim edit's final form
lands in the named plan. That is sequencing, not scope reduction, and the prohibited "for now" style
wording must not be used.

---

## Per-Plan Notes for the Plan Writer

### `12-01` — Currency core (`lib/currency.ts`)

- **autonomous:** true. **Weight:** light (2 tasks, same 2 files).
- **Tasks:** T1 `tdd` allow-list and display: `CURRENCIES`, `type Currency`, `DEFAULT_CURRENCY = "NGN"`,
  `isCurrency`/`parseCurrency` (Set-based guard, same idiom as `ORDER_STATUSES` in `lib/orders.ts`),
  `currencyFromCountry` (`NG`→NGN, other→USD, null/empty→NGN), `formatMoney` (`Intl.NumberFormat("en-US",
  {style:"currency", currencyDisplay:"narrowSymbol", min/max fraction 0})`, one formatter per currency built
  at module scope), `CURRENCY_LABELS` ("₦ NGN"/"$ USD") + names, `CURRENCY_COOKIE`, `CURRENCY_ATTR`,
  `CURRENCY_COOKIE_MAX_AGE` (31536000), `CURRENCY_SCRIPT` (RESEARCH Pattern 5, regex allow-list
  `(NGN|USD)`, try/catch). T2 `tdd` money rules: `RATE_MIN=100`, `RATE_MAX=100_000`, `isValidRate`,
  `autoUsdMinor` (`Math.ceil(kobo/(rate*100))*100`), `effectiveUsdMinor`, `toMinorUnits(major)`.
- **Tests (`tests/currency.test.ts`):** exact strings `₦45,000`, `$35`, `₦0`, `₦1,234,568`; `parseCurrency`
  rejects `EUR`, `ngn`, `""`, `undefined`; `currencyFromCountry` matrix; evaluate `CURRENCY_SCRIPT` in jsdom
  for cookie none / NGN / USD / EUR / mixed with other cookies; `autoUsdMinor` boundary table + 4,000-case
  seeded fuzz against a BigInt ceil-division oracle + never-undercharge property (`cents*rate >= kobo` and
  `< kobo + 100*rate`); `isValidRate` rejects 99, 100001, 1500.5, NaN, `"1500"`.
- **Must stay Prisma-free and Node-API-free:** imported by Edge middleware (12-05) and the email builder (12-12).
  No `react.cache` (breaks vitest).
- **Decisions:** D-01, D-02 (formatter), D-04 (helper), D-05 (range), D-09 (constants), D-10 (script constant).
- **Threats:** T-12-10 (cookie value allow-listed in both `parseCurrency` and the script regex).

### `12-02` — Payment provider libraries

- **autonomous:** true. **Weight:** medium (3 tasks, 6 new files).
- **T1 `tdd` `lib/payment-provider.ts`:** `type CheckoutProvider = "paystack" | "stripe"`,
  `resolveProvider(currency, env)` (NGN→paystack; USD→`env.USD_PAYMENT_PROVIDER === "paystack"` ? paystack : stripe),
  `demoCheckoutAllowed(env)` (`env.ALLOW_DEMO_CHECKOUT === "true" || env.NODE_ENV !== "production"`). Copy the
  `lib/auth-flags.ts` idiom: env passed in, strict equality, no trim, no case-folding. Tests: `"paystack"`,
  `"Paystack"`, `" paystack"`, unset; `"true"`, `"TRUE"`, `"1"`, unset × NODE_ENV production/test.
- **T2 `tdd` `lib/paystack-verify.ts`:** `verifyWebhookSignature(rawBody, header, secret)` (HMAC-SHA512 hex,
  length guard **before** `timingSafeEqual`), `type PaystackTx`, `type TxVerdict`, `evaluatePaystackTransaction(tx,
  order)` returning `paid | failed | pending | mismatch` (failed for `failed`/`abandoned`/`reversed`, pending for
  in-flight states: this is what lets 12-15 send `?payment=pending`, UI-SPEC A-5). Tests compute real HMACs
  with `node:crypto`: valid, one byte changed, wrong secret, missing/empty header, different-length header
  (returns false, no throw), uppercase hex accepted; verdict matrix covers wrong amount, currency, provider and reference.
- **T3 `tdd` `lib/paystack.ts`:** null-if-no-key idiom from `lib/stripe.ts` (`PAYSTACK_SECRET_KEY`,
  `paystackEnabled`), `initializeTransaction({email, amountMinor, currency, reference, callbackUrl, cancelUrl})`
  posting `amount: String(amountMinor)`, `metadata: {orderId, cancel_action}` as a plain object (fallback to
  stringified metadata is a UAT item, A1), `verifyTransaction(reference)` with `encodeURIComponent`,
  `AbortSignal.timeout(10_000)`, `cache: "no-store"`; non-2xx / `status:false` / network error → throw (never "paid").
  Tests stub `fetch`; set the env var before `vi.resetModules()` + dynamic import. **Never log the key, body or response.**
- **No package installs:** `@paystack/paystack-sdk` is rejected (D-19; RESEARCH rates it SUS).
- **Decisions:** D-18, D-19, D-20 (predicate + signature), D-24 (helper).
- **Threats:** T-12-01 (signature), T-12-02 (verdict requires amount + currency + provider + reference), T-12-08
  (demo gate helper), T-12-09 (no secret/body logging), T-12-03 (reference encoded into the verify path).

### `12-03` — Address, countries, order helpers

- **autonomous:** true. **Weight:** medium (2 tasks).
- **T1 `tdd` `lib/countries.ts` + `lib/address.ts` (+ `tests/address.test.ts`):** `ISO_COUNTRY_CODES` (the 249
  codes in RESEARCH Q9, static; never derived from `Intl`), `UNSHIPPABLE_COUNTRIES = ["KP","IR","SY","CU"]`
  (RESEARCH Open Question 3; flagged for owner confirmation in 12-OWNER-SETUP), `SHIPPABLE_COUNTRY_CODES`,
  `isShippableCountry`, `countryName(code)` via `Intl.DisplayNames` with code fallback, `countryOptions()`
  (NG first, rest by localised name). `type ShippingAddress` (`fullName, phone, line1, line2?, city, region,
  postalCode?, country`), `ADDRESS_LIMITS` (RESEARCH caps), `NIGERIA_STATES` (37 exact entries,
  "Federal Capital Territory", "Nasarawa"), `isPlausiblePhone`, `validateAddress(raw: unknown)` →
  `{ok:true,address}` | `{ok:false,errors}` (trim, reject ASCII control chars, NG state exact match, uppercase
  2-letter country in the shippable list), `addressErrorMessage(field, code, max?)` holding the UI-SPEC
  Copywriting error strings (one set for client and server), `addressLines(address)` (name, line1, line2,
  "City, Region postal", country name, phone) shared by admin, account and email.
- **T2 `tdd` `lib/orders.ts` additions (+ extend `tests/orders.test.ts`):** `PAYMENT_PROVIDERS`
  (`paystack|stripe|demo`), `isPaymentProvider`, `paymentProviderLabel` (Paystack / Stripe / "Demo (no real
  payment)" / "—"), `orderCurrency(order)` = `parseCurrency(order.currency) ?? "USD"`, `parseShippingAddress(json)`
  (defensive like `parseOrderItems`; returns null on corrupt or legacy null), `orderShippingMinor(order)` =
  total minus Σ line totals clamped at 0 (UI-SPEC A-7). **Additive only**; existing exports unchanged.
- **A-7 decision (recorded here):** derived Shipping row, no new `shippingFee` column. Derivation is correct for
  legacy orders too (their stored total already included shipping), whereas a column would need a JSON-parsing
  backfill and would change D-25's locked column list.
- **Decisions:** D-15 (server rules), D-25 (parser + provider allow-list), D-26 (legacy USD fallback helper).
- **Threats:** T-12-11 (control characters rejected, caps, normalised output only).

### `12-04` — Dual-currency display layer + ₦ font

- **autonomous:** true. **Weight:** medium (3 tasks).
- **T1 `tdd` `components/Money.tsx`** (no `"use client"`): default `Money({amounts, className?})` renders two
  sibling spans `data-money="NGN"` / `data-money="USD"` with no wrapper element; named `CurrencySymbol`.
  `tests/money.test.tsx` uses `[data-money]` selectors or `getAllByText` (Pitfall 14).
- **T2 CSS + script:** unlayered rule in `app/globals.css` (outside every `@layer`, next to the existing
  site-gate precedent): `:root:not([data-currency="USD"]) [data-money="USD"], :root[data-currency="USD"]
  [data-money="NGN"] { display: none; }`. Add `<script dangerouslySetInnerHTML={{__html: CURRENCY_SCRIPT}} />`
  beside `THEME_SCRIPT`/`SESSION_HINT_SCRIPT` in `app/layout.tsx`. `tests/currency-css.test.ts` clones
  `tests/site-gate-css.test.ts` (PostCSS + Tailwind compile, `// @vitest-environment node`). Gate: `app/layout.tsx`
  contains no `cookies(` call (D-12, keeps static pages static).
- **T3 fonts (D-FONT-1..3):** fetch the Inter **latin-ext** variable woff2 over HTTPS from fonts.gstatic.com, the
  same Google release named in the `lib/fonts.ts` header comment (css2 API, modern UA, take the `/* latin-ext */`
  block). Save as `app/fonts/Inter-latin-ext-normal.woff2`; register a second `localFont` `interExt` with
  `variable: "--font-inter-ext"`, `preload: false` and a `unicode-range` declaration matching Google's latin-ext
  range (it includes U+20A0-20AB). Add `interExt.variable` to the `<html>` className and append
  `var(--font-inter-ext)` straight after `var(--font-inter)` in `tailwind.config.ts` `fontFamily.sans`.
  `tests/fonts.test.ts` (node env) checks the `wOF2` magic bytes, size > 10 KB, and that both config references exist.
  If the download is impossible, record D-FONT-3 (system fallback) in the SUMMARY and do not block.
- **Decisions:** D-10, D-FONT-1, D-FONT-2 (rule recorded; value edits happen in 12-09/12-06/12-14), D-FONT-3.
- **Threats:** T-12-16 (font binary integrity: HTTPS from fonts.gstatic.com only, magic-byte check, no executable content).

### `12-05` — Currency choice (middleware, server helper, context, toggle)

- **autonomous:** true. **Weight:** medium (3 tasks).
- **T1 `tdd` `middleware.ts` + `lib/currency-server.ts`:** move today's body **verbatim** into `adminGate(req)`;
  `middleware()` branches on `p === "/admin" || p.startsWith("/admin/")`; otherwise set the cookie from
  `x-vercel-ip-country` via `currencyFromCountry` (no `request.geo`; Path=/, Max-Age 1 year, SameSite=Lax, Secure on
  https, **not** httpOnly). Matcher: `"/admin/:path*"` plus `{source: "/((?!admin|api|_next|media|.*\\..*).*)",
  missing: [{type:"cookie", key:"nostalgia-currency"}]}`, two backslashes in the TS literal (Pitfall 4).
  `getCurrency()` reads cookie → geo header → NGN, always through `parseCurrency` (no `react.cache`).
  Tests: `tests/currency-middleware.test.ts` (`// @vitest-environment node`, cookie set for NG/GB/absent, no
  `set-cookie` when valid, re-set for `EUR`, attributes, a matcher test that compiles the source and checks the
  page and excluded path lists from RESEARCH Pattern 4); `tests/currency-server.test.ts` mocks `next/headers`.
  `tests/admin-middleware.test.ts` must pass **unedited**.
- **T2 `tdd` `context/CurrencyContext.tsx` + `components/CurrencyToggle.tsx`:** context initialised from
  `document.documentElement` `data-currency` in `useEffect` (default NGN; never reads cookies during render);
  `setCurrency` writes the cookie, flips the attribute, updates state, and on `/shop` or `/collections/*` with a
  `price` param calls `router.replace` on the cleaned URL, otherwise `router.refresh()` (UI-SPEC Surface 1
  steps 1-6, A-6). Toggle `variant: "bar" | "menu"`: same-size placeholder until mounted (Pitfall 15),
  `role="group"`, `aria-pressed`, label-in-name `aria-label`, symbol-only below `xl`, sr-only `role="status"`
  announcement set only by user action. Test: cookie write, attribute flip, `router.refresh` / `replace` (mock
  `next/navigation`), pressed state, no-op on the active currency.
- **T3 mount:** `CurrencyProvider` in `components/Providers.tsx` (wrapping `CartProvider`); `<CurrencyToggle
  variant="bar" />` immediately left of `<ThemeToggle />` in `components/Nav.tsx`, and `variant="menu"` as the last
  block of `#mobile-nav` with `tabIndex` following `mobileOpen` (UI-SPEC A-3). **Update `tests/admin-link.test.tsx`**:
  it renders `<Nav />` with only `usePathname` mocked, so add a `vi.mock("@/components/CurrencyToggle", …)` like
  its ThemeToggle mock or the suite breaks. The A-4 width check at 1024/1100/1280 px is deferred to 12-18's browser checkpoint.
- **Decisions:** D-09, D-11, D-12 (helper; wiring in 12-17), D-28 (stale `price` param dropped on switch).
- **Threats:** T-12-10 (every read allow-listed; middleware never trusts the cookie's value).

### `12-06` — Checkout presentational components

- **autonomous:** true. **Weight:** medium (2 tasks). These have no cart or shipping imports: amounts arrive as props,
  so 12-14 only has to wire them.
- **T1 `tdd` `components/checkout/AddressForm.tsx`** (`"use client"`): renders `<form id="checkout-form" noValidate>`
  + `<fieldset disabled={disabled}>`, the 8 fields with exact `name`/`autoComplete`/max lengths from UI-SPEC Surface 3,
  Nigeria→state `<select>` of `NIGERIA_STATES` (first option "Select a state"), other→free-text region (value and
  error cleared on swap), blur/change/submit validation through `validateAddress` + `addressErrorMessage`, focus
  first invalid field, `aria-invalid` + `aria-describedby`, error red `text-[#9B2C2C] dark:text-ink` (A-11).
  Props: `onValidSubmit(address)`, `onCountryChange(code)`, `serverErrors?`, `disabled`. No prefill except
  country NG (A-19). Test: fields and autocomplete tokens, state swap, invalid submit focuses the first field and does
  not call `onValidSubmit`, valid submit returns the normalised address.
- **T2 `tdd` `OrderSummary.tsx`, `PaymentNotice.tsx`, `messages.ts`:** `OrderSummary` props `{currency, subtotal,
  shipping, total, country, provider, loading, error}` renders "Paying in ₦ NGN", zone caption "Within Nigeria" /
  "International · {name}", "Free" at 0, total value in `font-sans tabular-nums` (D-FONT-2), Pay button
  `type="submit" form="checkout-form"` with "Redirecting to {Provider}…" busy label, trust line "Secure checkout ·
  {Provider}" (D-27), `role="alert"` error line, `aria-live="polite"` on shipping/total. `PaymentNotice({kind})`
  for failed / cancelled / pending with the exact UI-SPEC copy: neutral panel, `role="status"`, focused on mount,
  unknown kind renders nothing. `messages.ts`: `checkoutErrorMessage(code)` for `not_authenticated`,
  `payments_unavailable`, `payment_provider_error`, `price_changed`, `invalid_address`, generic.
- **Decisions:** D-15 (client UX), D-21 (notice), D-27 (trust line), UI-SPEC A-5, A-11, A-15, A-19.
- **Threats:** T-12-11 (all values rendered as React children; no `dangerouslySetInnerHTML`).

### `12-07` — Schema + migration + [BLOCKING] owner apply

- **autonomous:** **false** (checkpoint). **Weight:** light (1 auto task + 1 checkpoint).
- **T1 auto:** copy the current `prisma/schema.prisma` to the session scratchpad as `old.prisma`, then edit the real
  schema per RESEARCH Q6: `priceNgn Int`, `priceUsdOverride Int?`, `priceUsd Int @map("price")` (keep
  `@@index([priceUsd])`, which is physically the existing `Product_price_idx`), `@@index([priceNgn])`; Order
  `currency String @default("USD")`, `paymentProvider String?`, `shippingAddress String?`, comment on `total`
  as minor units of `currency`; `model StoreSettings { id Int @id; usdNgnRate Int; updatedAt DateTime @updatedAt }`.
  Run `npx prisma migrate diff --from-schema-datamodel <scratch>/old.prisma --to-schema-datamodel prisma/schema.prisma
  --script` with a **dummy** `DATABASE_URL`/`DIRECT_URL` in the command's environment (shell variables override
  `.env`, so production is never read), then hand-author
  `prisma/migrations/20261013120000_multi_currency/migration.sql` exactly as the RESEARCH "Hand-authored
  migration" block: nullable add → backfill (`priceUsdOverride = price`, `priceNgn = ROUND(price*1500/50000)*50000`)
  → `SET NOT NULL` → Order columns → `StoreSettings` table → `INSERT … (1, 1500, CURRENT_TIMESTAMP) ON CONFLICT DO
  NOTHING` → `Product_priceNgn_idx`. `npx prisma validate`. **Do NOT run `prisma generate`, `npm install`,
  `prisma migrate dev`, `prisma migrate deploy`, `prisma db push`, `prisma migrate reset` or the seed.** The
  generated client deliberately stays on the old schema until the migration is applied, so `tsc` stays green and
  the owner's dev server against production Neon keeps working throughout (Pitfall 2 avoided outright).
  `tests/migration-multi-currency.test.ts` (node env, static): the SQL statement order (nullable add before
  backfill before SET NOT NULL), the ON CONFLICT seed with 1500, the `'USD'` default, the new index, no `DROP`
  statements; `schema.prisma` contains the `@map("price")` line and the `StoreSettings` model.
- **T2 `checkpoint:human-action` gate="blocking" [BLOCKING]:** the owner (not the agent: `.env` is deny-listed and
  points at production) (1) creates a Neon branch of production (console or `npx neonctl branches create`),
  (2) runs `DIRECT_URL=<branch direct URL> npx prisma migrate deploy`, (3) spot-checks backfilled `priceNgn`,
  `Order.currency = 'USD'`, and the `StoreSettings` row, (4) applies to production with `npx prisma migrate deploy`
  (direct, non-pooled URL per the neon-postgres skill), (5) pastes `npx prisma migrate status` ("up to date").
  Alternative the checkpoint must offer (D-30's deploy path): point local `.env` at the rehearsal branch and let
  Vercel's `vercel-build` apply to production at deploy. Warn: once production is migrated, the **currently
  deployed** site's /admin "Add product" fails until this phase deploys, so do not add products on the live site in
  the meantime. Resume signal: "applied" + migrate status output.
- **Decisions:** D-03, D-05 (model + seed), D-08, D-25 (columns), D-30.
- **Threats:** T-12-13 (expand-only SQL, no DROP, branch rehearsal, owner applies, never `migrate dev`/`db push`/`reset`).

### `12-08` — Regenerate client + server data layer + admin product pricing

- **autonomous:** true. **Weight:** **heavy** (3 tasks, 16 files, most edits small). The heaviest plan in the phase.
  It cannot be split: every file in it stops compiling the moment the client is regenerated.
- **T1 regenerate + data layer:** `npx prisma generate` (Windows: if it fails with EPERM because the :3002 dev server
  holds the query-engine DLL, stop and ask the owner to pause the dev server, then rerun). `prisma/seed.ts`:
  replace every `price:` with `priceNgn` (backfill rule), `priceUsd`, `priceUsdOverride`, and make reviewer
  snapshots read `priceUsd`. **Compile only, never executed** (it calls `deleteMany`). `lib/products.ts` interim edit B1.
  `lib/catalog.ts`: `buildProductWhere({…, currency})` filters `priceNgn` or `priceUsd`, `minPrice`/`maxPrice`
  read as **major units** ×100 (D-28, fixes the cents bug); `buildOrderBy(sort, currency)` keeps its allow-list and
  sorts by the active column. Update `tests/catalog.test.ts`. Interim edits B2 and B3.
- **T2 `tdd` `lib/settings.ts` + product actions:** `getRateSettings()` (rate, updatedAt, auto count, fixed count),
  `getUsdNgnRate()` (null if no row), `setUsdNgnRate(rate)` exactly as RESEARCH Q7: `isValidRate` guard, then
  `$transaction([storeSettings.upsert, $executeRaw\`UPDATE "Product" SET "price" = (CEIL("priceNgn"::numeric /
  (${rate}::numeric * 100)) * 100)::int WHERE "priceUsdOverride" IS NULL\`])`, returning the updated count. The column
  is `"price"` because of `@map` (Pitfall 3). `tests/settings.test.ts` mocks `$transaction`/`$executeRaw` and checks
  the template text contains `CEIL("priceNgn"::numeric / (` and `WHERE "priceUsdOverride" IS NULL` and that the
  bound value is the integer rate (D-04 parity). `app/admin/products/actions.ts`: `requireOwner()` stays first;
  parse `priceNgn` (required) and `priceUsd` (optional) field by field in **major units**, non-negative integers,
  ≤ 10,000,000 naira; ×100; `priceUsd = effectiveUsdMinor(...)` with the DB rate; a missing rate row returns the error
  `rate_unavailable`; errors `invalid_price_ngn` / `invalid_price_usd`. Never spread FormData into Prisma data, and never
  accept the effective price from the client. Update `tests/admin-product-placement.test.ts` and `tests/slug.test.ts`
  (post `priceNgn`, mock `storeSettings.findUnique`).
- **T3 admin UI:** `ProductForm` gets the `usdNgnRate` prop, Name and Slug full width, a two-column row "Price (₦)"
  (required, hint) + "Price ($), optional" with the live helper states from UI-SPEC 7a (`autoUsdMinor` preview, fixed,
  invalid, missing rate), real `htmlFor`/`id` pairs, `messageFor` codes; edit mode pre-fills ₦ from `priceNgn/100`
  and $ from `priceUsdOverride/100` (blank stays auto). `ProductTable`: stacked ₦ / $ cell with an "auto" pill +
  sr-only suffix, plus the footnote linking `/admin/settings` (the page arrives in 12-11; UI-SPEC A-17).
  Pages: `products/page.tsx` passes `priceNgn/priceUsd/priceUsdOverride`; `[id]/edit/page.tsx` and `new/page.tsx`
  pass the rate from `getUsdNgnRate()`.
- **Mid-plan note:** `tsc` is red between T1 and T3 (the admin files compile again only after T3). Per-task verify
  runs the touched vitest files; the plan's final gate is `npx tsc --noEmit` + full `npx vitest run`.
- **Decisions:** D-03, D-04, D-06 (lib + product save), D-07, D-28 (catalog), D-30 (seed never run).
- **Threats:** T-12-06 (field-by-field parse, computed price only, owner gate first), T-12-07 (tagged template, one
  bound validated integer, template-text test), T-12-13 (seed never executed).

### `12-09` — Cart dual-price snapshots

- **autonomous:** true. **Weight:** medium (2 tasks, 7 files).
- **T1 `tdd` `lib/cart.ts` + `context/CartContext.tsx` (+ B4):** pure `type CartItem` (`prices: Record<Currency,
  number>`), `isValidCartItem`, `normaliseCartItems(raw: unknown)` (drops legacy single-`price` entries and
  invalid qty/strings, D-13), `subtotalsOf(items)`, `applyPriceUpdates(items, updates)`. Context: load through the
  normaliser, expose `subtotals`, add `updatePrices(updates)` (used by 12-14's 409 path), keep the `nostalgia-cart` key.
  Re-export `CartItem` from the context. Apply interim edit B4 to `app/checkout/page.tsx`. Test: `tests/cart.test.ts`.
- **T2 surfaces:** `AddToCart` snapshot `prices: {NGN: product.priceNgn, USD: product.priceUsd}`; `app/cart/page.tsx`
  line totals and subtotal via `<Money>` + `tabular-nums`, Shipping always "Calculated at checkout", label
  "Estimated total" (A-8), value `font-sans` (D-FONT-2), `FREE_SHIPPING_THRESHOLD` import removed;
  `CartDrawer` `<Money>` subtotal `font-sans text-xl tabular-nums`, the "Shipping calculated at checkout." line, line totals.
- **Decisions:** D-13 (cart), D-14, D-FONT-2 (cart page total, drawer subtotal).
- **Threats:** T-12-17 (snapshot drift handled server-side in 12-14; `updatePrices` heals the snapshot).

### `12-10` — `markOrderPaid` + Stripe webhook

- **autonomous:** true. **Weight:** medium (2 tasks, 4 files).
- **T1 `tdd` `lib/payments.ts`:** `markOrderPaid(orderId, {provider, amount, currency})` = `prisma.order.updateMany({
  where: {id, status:"pending", total: amount, currency, paymentProvider: provider}, data: {status:"paid"} })`;
  `sendOrderConfirmation` only when `count === 1`; returns `{transitioned}`. Tests check the exact `where`, one email on
  count 1, none on count 0, and that two sequential calls (second returns 0) send exactly one email.
- **T2 `tdd` Stripe webhook:** keep raw-body + `constructEvent` + no-key no-op + always-2xx; replace the
  check-then-update with: `session.payment_status === "paid"` (otherwise 200 no-op, Pitfall 12),
  `session.amount_total === order.total`, `session.currency === order.currency.toLowerCase()`, then
  `markOrderPaid(id, {provider:"stripe", amount: order.total, currency: order.currency})`. Rewrite
  `tests/stripe-webhook.test.ts` (fixtures with `total/currency/paymentProvider`; mismatch cases; existing signature
  cases kept). No `checkout.session.async_payment_succeeded` handler (card-only, per RESEARCH).
- **Known narrow edge, recorded rather than worked around (D-22's where clause is locked):** a legacy pending order
  created before deploy has `paymentProvider = NULL`, so a webhook arriving after deploy cannot flip it. The store is
  pre-launch and in TEST mode; 12-OWNER-SETUP tells the owner to reconcile any such order manually.
- **Region-scoped gate:** after this plan, a status-to-paid write appears only in `lib/payments.ts` and (from 12-14)
  in the demo branch of the checkout route.
- **Decisions:** D-22, D-23 (webhook currency check).
- **Threats:** T-12-01 (constructEvent kept), T-12-02 (amount/currency/provider in checks and CAS), T-12-04 (CAS email gate).

### `12-11` — `/admin/settings` exchange rate

- **autonomous:** true. **Weight:** light-medium (2 tasks, 5 files).
- **T1 `tdd` `app/admin/settings/actions.ts`:** `"use server"`, `await requireOwner()` as the **first statement**,
  parse the rate as an integer, `isValidRate`, `setUsdNgnRate`, revalidate `/admin/products`, `/admin/settings`, `/`,
  `/shop/[[...slug]]`, `/product/[slug]`, `/collections`, `/collections/[slug]`; returns `{ok, updated}` or an error
  code. `tests/admin-settings.test.ts`: owner gate called first (and a rejection stops everything), invalid rates
  rejected without DB calls, `setUsdNgnRate` called with the integer, revalidation list.
- **T2 page + form + nav:** server `page.tsx` reads `getRateSettings()`; a missing row shows the UI-SPEC banner.
  Client `components/admin/RateForm.tsx`: live example line via `autoUsdMinor(4_500_000, typed)`, impact line,
  "Last updated", placeholder note while the rate is 1500, disabled states, `window.confirm` above a 20% change (A-13),
  success / failure copy, `router.refresh()`. `AdminNav` gains `{href:"/admin/settings", label:"Settings"}` after Reviews.
- **Decisions:** D-05, D-06.
- **Threats:** T-12-06 (owner gate first, integer-only input), T-12-15 (range check + large-change confirm).

### `12-12` — Confirmation email in order currency

- **autonomous:** true. **Weight:** medium (2 tasks).
- **T1 `tdd` `lib/email-content.ts`:** `OrderEmailSource` gains `currency: string` and `shippingAddress: string |
  null` (the full Prisma row from `lib/email.ts` already satisfies this after 12-08); delete the duplicated cents
  formatter and its duplication comment; format every amount with `formatMoney(…, orderCurrency(order))`; add
  `formattedShipping` (derived via `orderShippingMinor`, "Free" at 0) and `addressLines` (null for legacy orders).
  Update `tests/email.test.ts` (NGN case, USD legacy case, address present and absent).
- **T2 `emails/OrderConfirmation.tsx`:** amount column 80→96 px with `whiteSpace:"nowrap"`, Shipping row after the
  `Hr`, "Delivering to" block (12 px uppercase label, 14 px lines joined with `<br />`, plain React children), omitted
  for legacy orders; extend `tests/email.test.ts` so the rendered HTML declares UTF-8 and contains `₦`.
- **Decisions:** D-02 (email formatter retired), D-26 (email).
- **Threats:** T-12-11 (escaped children only), T-12-09 (no new logging of address/email).

### `12-13` — Account + admin order displays

- **autonomous:** true. **Weight:** medium (2 tasks, 8 modified/new + 2 read-only).
- **T1 `tdd` account:** `OrderList` (`Row`/`OrderInput` gain `currency`; totals via `formatMoney(total,
  orderCurrency(o))`), `OrderDetail` (item lines + derived Shipping row + Total in order currency; Delivery address
  block after totals, omitted for legacy orders). Pages `app/account/page.tsx` and `app/account/orders/[id]/page.tsx`
  are **read-only**: they pass full Prisma rows and their `userId`-scoped queries must not change (T-12-12). Update
  both account tests: the existing `$285` fixture stays green through the USD fallback; add NGN and address cases.
- **T2 `tdd` admin:** `OrderTable` total per order currency + "Paid via" column (A-17, label from
  `paymentProviderLabel`); `app/admin/orders/page.tsx` maps `currency` and `paymentProvider`; `app/admin/orders/[id]/page.tsx`
  gets items/Shipping/Total in order currency, a Payment `dl` (Currency `₦ NGN`/`$ USD`, Paid via), and a Delivery
  address block (`tel:` href with digits and `+` only, legacy copy). New `tests/admin-orders.test.tsx`. No totals are
  ever summed across currencies.
- **Decisions:** D-26, UI-SPEC A-7, A-17.
- **Threats:** T-12-12 (queries untouched), T-12-11 (React children; the `tel:` href is sanitised).

### `12-14` — Destination shipping + checkout route + checkout page

- **autonomous:** true. **Weight:** **heavy** (3 tasks, 7 files; the route test matrix is the bulk).
- **T1 `tdd` `lib/shipping.ts`:** keep the drift-bug header comment; `type ShippingZone`, `SHIPPING_RATES`
  (D-16 placeholder values in minor units, flagged), `zoneFor`, `calculateShipping(subtotalMinor, currency, country)`,
  `FREE_SHIPPING_OVER`; remove the two legacy constants. `tests/shipping.test.ts`: 2 zones × 2 currencies × freeOver
  −1/==/+1.
- **T2 `tdd` `POST /api/checkout`:** order of operations from RESEARCH "Checkout route skeleton": auth 401 → JSON 400 →
  items guard → `parseCurrency` 400 → `validateAddress` 400 `{error:"invalid_address", fields}` → `NEXTAUTH_URL` 500 (no
  fallback) → DB repricing (`priceNgn` or `priceUsd`) → `calculateShipping` → optional `expectedTotal` mismatch → **409
  `{error:"price_changed", prices:[{slug, NGN, USD}]}`, no order** (Open Question 6 resolved) → `resolveProvider`; no
  key: `demoCheckoutAllowed` ? demo order (`status:"paid"`, `paymentProvider:"demo"`, `sendOrderConfirmation`,
  `/order/success?order=…&demo=1&currency=…`) : **503 `payments_unavailable`, no order** → create the pending order with
  `currency`, `paymentProvider`, `shippingAddress: JSON.stringify(address)`, `total` → Paystack
  `initializeTransaction({reference: order.id, callbackUrl: origin + "/api/paystack/callback", cancelUrl: origin +
  "/checkout?payment=cancelled"})` or Stripe `sessions.create` (currency `order.currency.toLowerCase()`, line items
  unchanged incl. shipping line when > 0, `metadata.orderId` kept, `success_url` carries `&currency=`, **no**
  `shipping_address_collection`, `automatic_tax` or promo codes) → provider throw: mark the order `cancelled`, return 502.
  `tests/checkout-route.test.ts` covers RESEARCH Q10's full matrix (NGN→Paystack amount, USD→Stripe `usd` with the
  line-item sum equal to `Order.total` checked **by amount**, the `USD_PAYMENT_PROVIDER` variants, per-currency column,
  invalid currency/address/country/state 400, production no-key 503, `ALLOW_DEMO_CHECKOUT`, 409, persisted columns,
  provider-throw cancel). Delete `tests/checkout-shipping.test.ts` (B3 final).
- **T3 checkout page:** `app/checkout/page.tsx` becomes a server component (reading the `searchParams` prop makes it
  dynamic) that computes `providers = {NGN: resolveProvider("NGN", process.env), USD: resolveProvider("USD",
  process.env)}` (A-14: the browser never infers the provider) and normalises `payment` to failed / cancelled / pending /
  null. Reading the prop on the server avoids `useSearchParams` (Pitfall 7 / A-21). New `components/checkout/CheckoutClient.tsx`
  holds the moved client logic: session gate + `/signin` redirect, empty bag, item rows via `formatMoney(prices[currency]
  * qty, currency)`, currency from `CurrencyContext` (A-16), country state → `calculateShipping`, `AddressForm`,
  `OrderSummary`, `PaymentNotice`, POST `{items:[{slug,size,qty}], currency, address, expectedTotal}`, server field
  errors mapped into `AddressForm`, 409 → `updatePrices` + `price_changed` copy, `begin_checkout` with `currency` (no
  address data), `pageshow` persisted reset. No "Stripe test mode" text remains.
- **Mid-plan note:** after T1 the interim checkout page (B4) no longer compiles until T3; the final gate is `tsc` + full suite.
- **Decisions:** D-14 (real fee at checkout), D-15 (server-authoritative validation), D-16 (`lib/shipping.ts`), D-17,
  D-18, D-19 (init + origin), D-23, D-24, D-25 (writes), D-27 (provider name + analytics), D-FONT-2 (checkout total via
  OrderSummary).
- **Threats:** T-12-02 (DB repricing in the allow-listed currency, server shipping), T-12-05 (redirect URLs only from
  `NEXTAUTH_URL`), T-12-08 (503 before any order on production), T-12-09 (analytics carries currency only),
  T-12-10 (POSTed currency re-validated), T-12-17 (409 quote), T-12-18 (no tax/promo/address collection, so
  `amount_total` equality holds).

### `12-15` — Paystack webhook + callback + purchase analytics

- **autonomous:** true. **Weight:** medium (3 tasks, 6 files).
- **T1 `tdd` `app/api/paystack/webhook/route.ts`:** `runtime = "nodejs"`; no key → `{received:true}`; `await req.text()`
  **first**; `verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"), secret)` else 401 with no DB read;
  `JSON.parse` in try (malformed → 200); act only on `charge.success`; `findUnique` by `data.reference`;
  `evaluatePaystackTransaction(...) === "paid"` → `markOrderPaid(id, {provider:"paystack", amount: order.total,
  currency: order.currency})`; otherwise log ids only; always 200 after verification. Tests use the **real** signature
  function with an HMAC header computed in the test and mock `@/lib/payments`.
- **T2 `tdd` `app/api/paystack/callback/route.ts`:** `runtime = "nodejs"`, `dynamic = "force-dynamic"` (Pitfall 6);
  `NEXTAUTH_URL` required (500); `reference` then `trxref`; `/^[A-Za-z0-9_-]{10,64}$/` before any provider call;
  `verifyTransaction` → `findUnique` → verdict: `paid` → `markOrderPaid` → 303 `/order/success?order=<id>&currency=<cur>`;
  `failed` → `?payment=failed` (abandoned → `?payment=cancelled`); `pending` → `?payment=pending` (A-5); `mismatch`,
  unknown order, throw → `?payment=failed`. Never auto-cancel on `abandoned` (Pitfall 17). Tests include the
  open-redirect case (a hostile `callbackUrl` param and a `//evil.test` reference: location always starts with
  `NEXTAUTH_URL`) and "verify throws never yields success".
- **T3 `app/order/success/page.tsx`:** `purchase` event gains `currency` from the query string through `parseCurrency`;
  the page stays presentational. Extend `tests/analytics.test.ts` so a `currency` field is forwarded unchanged and the
  payload stays non-PII.
- **Decisions:** D-20, D-21, D-27 (purchase currency), UI-SPEC A-5.
- **Threats:** T-12-01, T-12-02, T-12-03, T-12-04 (duplicate delivery and callback+webhook race safe via CAS),
  T-12-05, T-12-09 (ids and verdicts only in logs).

### `12-16` — Product surfaces + wishlist + JSON-LD + `formatPrice` retirement

- **autonomous:** true. **Weight:** medium-heavy (3 tasks, 11 files + 1 read-only).
- **T1 `tdd` wishlist:** `WishlistItem.prices`, `isValidWishlistItem`/`normaliseWishlistItems` (legacy entries
  discarded, D-13), `WishlistContext` loads through it (`nostalgia-wishlist` key), `app/wishlist/page.tsx` renders `<Money
  amounts={item.prices}>` + `tabular-nums`. Update `tests/wishlist.test.ts`. `WishlistButton` is read-only (the type flows through).
- **T2 `tdd` `lib/seo.ts`:** `ProductJsonLdInput` carries `priceNgn`/`priceUsd`; `offers` becomes two Offers (`NGN`, `USD`,
  `(minor/100).toFixed(2)`, same availability) (D-29); `serializeJsonLd` unchanged. Update `tests/seo.test.ts`.
- **T3 surfaces + cleanup:** ProductCard / EditRail / PDP price via `<Money amounts={{NGN: p.priceNgn, USD: p.priceUsd}}>`
  inside the existing wrappers; wishlist and cart snapshots carry `prices`; PDP JSON-LD input; PDP free-delivery bullet →
  `<Link href="/shipping">Free shipping over <Money amounts={FREE_SHIPPING_OVER.domestic}/> in Nigeria</Link>` (A-9,
  Open Question 4). Then the `lib/products.ts` final form (B1): drop `Product.price` and delete the legacy formatter. Every
  caller is migrated by this point; the gate is a repo-wide grep returning 0 in `app`, `components`, `lib`. New
  `tests/storefront-money.test.tsx` (ProductCard + EditRail render both `data-money` spans).
- **Comment-text discipline:** this plan negative-greps the retired formatter name and the literal `$200` in the PDP. The plan
  writer must describe them by concept in `<action>` text or add the `planner-discipline-allow` marker.
- **Decisions:** D-02 (completion), D-13 (wishlist), D-16 (PDP copy), D-29.
- **Threats:** none new at HIGH; T-12-10 indirectly (display only, never trusted for charging).

### `12-17` — Shop/collection currency + free-delivery copy

- **autonomous:** true. **Weight:** light-medium (2 tasks, 7 files).
- **T1 catalog UI:** `app/shop/[[...slug]]/page.tsx` and `app/collections/[slug]/page.tsx` pass `currency: getCurrency()`
  to `getCatalog` (they are already `force-dynamic`; D-12); `FilterPanel` price inputs gain a `<CurrencySymbol />` prefix
  (`pl-8 pr-3`) and `aria-describedby="price-unit"` pointing to one sr-only dual-span description ("Prices in naira" /
  "Prices in US dollars"), with `inputMode="numeric"`, `step={1}`. New `tests/filter-panel.test.tsx`.
- **T2 copy:** `TrustStrip` `note` becomes a `ReactNode`: "Complimentary over <Money domestic freeOver/> in Nigeria";
  `/shipping` domestic and international paragraphs use `SHIPPING_RATES` fee and freeOver through `<Money>` and keep the
  `PLACEHOLDER copy (D-12)` comment, adding a note that rates are placeholders until the owner confirms. New
  `tests/shipping-copy.test.tsx`; grep gate: no literal `$200` remains in either file.
- **Decisions:** D-12 (wiring), D-16 (copy), D-28 (pages + symbol), UI-SPEC A-9.
- **Threats:** T-12-10 (server reads the currency only through `getCurrency()`'s allow-list).

### `12-18` — Owner setup, validation sign-off, browser + deployed UAT

- **autonomous:** **false**. **Weight:** light (1 auto task + 2 checkpoints).
- **T1 auto docs + gate:** run `npx vitest run` (alone) then `npx tsc --noEmit`; author `12-OWNER-SETUP.md` mirroring
  `11-OWNER-SETUP.md`: `PAYSTACK_SECRET_KEY` (sk_test_ for UAT; server-only, never `NEXT_PUBLIC_*`); Paystack TEST and live
  webhook URL `https://<domain>/api/paystack/webhook` (registered separately); **"merchant bears fees"** fee-bearer setting
  (otherwise `data.amount ≠ order.total` and every payment is rejected; Open Question 2 / Pitfall 10);
  optional `USD_PAYMENT_PROVIDER=paystack` with the Paystack USD enablement checklist (international payments + Zenith USD
  account, ~3.9%) and the **Stripe-for-a-Nigeria-registered-business caveat** (Open Question 1); optional
  `ALLOW_DEMO_CHECKOUT` (needed on Vercel Preview, where `NODE_ENV=production`, Pitfall 11); the **placeholder ₦1,500 rate**
  (set in /admin/settings) and **placeholder shipping rates** (`lib/shipping.ts` constants, code change); migration apply
  steps + the vercel-build path + "don't add products during a deploy"; confirm `UNSHIPPABLE_COUNTRIES`; keep Stripe
  tax/promo/address collection off; `NEXTAUTH_URL` must stay set; abandoned pending orders (Pitfall 17); legacy pending
  Stripe orders (12-10 note); **stock is still never decremented (overselling risk, Deferred)**; Paystack test cards; the
  UAT checklist. Finalize `12-VALIDATION.md`: per-task IDs from the map below, `nyquist_compliant: true`,
  `wave_0_complete: true`, statuses.
- **T2 `checkpoint:human-verify` local browser** (owner's dev server on :3002 against the migrated DB; demo checkout is allowed
  in non-production): toggle on home / shop / PDP / cart / drawer / checkout / wishlist with no flash on reload and no
  hydration warnings; nav at 1024 / 1100 / 1280 px (A-4); /shop sort + `?price=` follow the currency and the param drops on
  switch; checkout address form (state swap, inline errors, focus); `?payment=failed|cancelled|pending` notices; admin ₦/$
  price + auto preview; rate change re-prices auto products; order detail shows currency / provider / address; ₦ glyph in
  Inter (or D-FONT-3 recorded).
- **T3 `checkpoint:human-verify` deployed UAT on TEST keys (D-32):** owner completes 12-OWNER-SETUP and deploys; RESEARCH
  manual checks 1-5 and 8: Paystack success card → paid once + one email; decline; Cancel → `?payment=cancelled` with the bag
  intact (confirms `cancel_action` and the metadata shape, A1); `reference`/`trxref` (A2); webhook delivery after closing the
  tab (A4) and `data.amount == total` (A5); Stripe TEST USD → paid via webhook; geo cookie from a non-NG IP shows `$` without a
  flash; `npx prisma migrate status` up to date on production; Paystack USD only if the switch is used (A6).
- **Decisions:** D-16 (placeholders flagged), D-31, D-32, D-30 (migration confirmed applied).
- **Threats:** T-12-09 (secret handling documented), T-12-14 (fee-bearer: transfer to owner configuration + UAT check),
  T-12-18 (accept: documented, Stripe tax/promo stay off).

---

## Validation Map (fills `12-VALIDATION.md` task IDs; 12-18 writes them in)

| VALIDATION row | Owning task(s) |
|----------------|----------------|
| CURR-01 `parseCurrency`/`currencyFromCountry`/`formatMoney`/`CURRENCY_SCRIPT` | 12-01-T1 |
| CURR-01 middleware cookie + matcher + admin branch | 12-05-T1 (+ `tests/admin-middleware.test.ts` unedited) |
| CURR-01 compiled CSS rule | 12-04-T2 |
| CURR-01 `<Money>` + toggle | 12-04-T1, 12-05-T2 |
| CURR-01 cart/wishlist normalisers, catalog columns | 12-09-T1, 12-16-T1, 12-08-T1 |
| CURR-02 `autoUsdMinor` fuzz + `isValidRate` | 12-01-T2 |
| CURR-02 settings recompute + product actions | 12-08-T2, 12-11-T1 |
| CURR-02 / ORDR-01 migration SQL contract (new row) | 12-07-T1 |
| PAYM-01 signature + verdict | 12-02-T2 |
| PAYM-01 `lib/paystack.ts` | 12-02-T3 |
| PAYM-01 webhook route | 12-15-T1 |
| PAYM-01 callback route | 12-15-T2 |
| PAYM-01/02 `markOrderPaid` | 12-10-T1 |
| PAYM-02 Stripe webhook | 12-10-T2 |
| PAYM-02 `resolveProvider` + Stripe branch | 12-02-T1, 12-14-T2 |
| SHIP-01 shipping, address, orders, checkout 400, email, account | 12-14-T1, 12-03-T1, 12-03-T2, 12-14-T2, 12-12-T1, 12-13-T1, 12-06-T1 |
| ORDR-01 persisted columns, 503 gate, order-currency displays, analytics, JSON-LD | 12-14-T2, 12-02-T1, 12-12-T1, 12-13-T1/T2, 12-15-T3, 12-16-T2 |

**Wave 0 strategy:** test-first (`tdd="true"`) inside each owning plan instead of a separate scaffold wave. New test files
belong to new modules, and VALIDATION.md requires every broken existing test to be updated in the same plan that changes its
code. Every task has an `<automated>` verify (vitest file list, or grep/file checks for docs and fonts). No three consecutive
tasks lack automated verification. The checkpoints (12-07-T2, 12-18-T2/T3) follow automated tasks.

---

## Multi-Source Coverage Audit

### GOAL (ROADMAP Phase 12 success criteria)

| Criterion | Plans | Status |
|-----------|-------|--------|
| 1. ₦ default in Nigeria, $ elsewhere, one toggle switches every price instantly, persists | 12-01, 12-04, 12-05, 12-09, 12-16, 12-17 | COVERED |
| 2. Owner sets ₦ (required) + optional $; rate in /admin/settings re-prices auto products | 12-07, 12-08, 12-11 | COVERED |
| 3. ₦ checkout with address, Paystack TEST, paid via verified callback + webhook, ₦ email with address | 12-02, 12-06, 12-10, 12-12, 12-14, 12-15, 12-18 | COVERED |
| 4. $ checkout through Stripe TEST; order records USD + Stripe; webhook marks paid | 12-10, 12-14, 12-18 | COVERED |
| 5. Shipping fee shown = charged = stored, NG + international, both currencies | 12-14 (one `calculateShipping` for UI, API and charge), 12-13/12-12 (derived display) | COVERED |
| 6. Production never creates a free "paid" demo order | 12-02, 12-14 | COVERED |

### REQ

| Req | Plans | Status |
|-----|-------|--------|
| CURR-01 | 12-01, 12-04, 12-05, 12-06, 12-08, 12-09, 12-14, 12-16, 12-17, 12-18 | COVERED |
| CURR-02 | 12-01, 12-07, 12-08, 12-11, 12-18 | COVERED |
| PAYM-01 | 12-02, 12-06, 12-10, 12-14, 12-15, 12-18 | COVERED |
| PAYM-02 | 12-02, 12-10, 12-14, 12-15, 12-18 | COVERED |
| SHIP-01 | 12-03, 12-06, 12-07, 12-12, 12-13, 12-14, 12-17, 12-18 | COVERED |
| ORDR-01 | 12-02, 12-03, 12-07, 12-10, 12-12, 12-13, 12-14, 12-18 | COVERED |

### CONTEXT (D-01 … D-32)

| D | Owner plan(s) | | D | Owner plan(s) |
|---|---------------|-|---|---------------|
| D-01 | 12-01 (enforced 12-05, 12-14) | | D-17 | 12-14 |
| D-02 | 12-01, 12-12, 12-16 | | D-18 | 12-02, 12-14 |
| D-03 | 12-07, 12-08 | | D-19 | 12-02, 12-14 |
| D-04 | 12-01, 12-08 | | D-20 | 12-02, 12-15 |
| D-05 | 12-07, 12-01, 12-08, 12-11 | | D-21 | 12-15, 12-06, 12-14 |
| D-06 | 12-08, 12-11 | | D-22 | 12-10 |
| D-07 | 12-08 | | D-23 | 12-14, 12-10 |
| D-08 | 12-07 | | D-24 | 12-02, 12-14 |
| D-09 | 12-05 (constants 12-01) | | D-25 | 12-07, 12-03, 12-14 |
| D-10 | 12-04 (script 12-01) | | D-26 | 12-12, 12-13 |
| D-11 | 12-05 | | D-27 | 12-06, 12-14, 12-15 |
| D-12 | 12-05, 12-17 | | D-28 | 12-08, 12-17, 12-05 |
| D-13 | 12-09, 12-16 | | D-29 | 12-16 |
| D-14 | 12-09, 12-14 | | D-30 | 12-07, 12-08 |
| D-15 | 12-03, 12-06, 12-14 | | D-31 | 12-18 |
| D-16 | 12-14, 12-16, 12-17, 12-18 | | D-32 | 12-18 |

UI-SPEC D-FONT-1/2/3 → 12-04 (D-FONT-2 value edits in 12-09, 12-06, 12-14).
**Deferred ideas verified absent from every plan:** other currencies, refunds through provider APIs, VAT, live FX feed, saved
addresses, carrier integrations, admin-editable shipping rates, Paystack/Verve marks in `PaymentMarks`, stock decrement
(the last one is only *flagged* in 12-OWNER-SETUP).

### RESEARCH

| Item | Plan | Status |
|------|------|--------|
| Pattern 1 Paystack REST + signature + shared verdict | 12-02, 12-15 | COVERED |
| Pattern 2 Stripe fields (`payment_status`, `amount_total`, `currency`) | 12-10, 12-14 | COVERED |
| Pattern 3 `en-US` + `narrowSymbol` formatter | 12-01 | COVERED |
| Pattern 4 middleware, `x-vercel-ip-country`, `missing` cookie gate | 12-05 | COVERED |
| Pattern 5 dual-render `<Money>` + script + unlayered CSS | 12-01, 12-04 | COVERED |
| Pattern 6 CAS `markOrderPaid` | 12-10 | COVERED |
| Hand-authored migration SQL (Q6) | 12-07 | COVERED |
| `$executeRaw` recompute + template-text parity test (Q7) | 12-08 | COVERED |
| Address data: states, ISO list, phone rule (Q9) | 12-03 | COVERED |
| Price-site inventory A-D (Q5/Q11) | 12-08, 12-09, 12-12, 12-13, 12-14, 12-16, 12-17 | COVERED (every file in the File Ownership index) |
| Inventory E (tests that break) | checkout-shipping → 12-08/12-14; stripe-webhook → 12-10; email → 12-12; seo, wishlist → 12-16; catalog, admin-product-placement, slug → 12-08; account-* → 12-13; admin-link (found during planning) → 12-05; must-stay-green trio untouched | COVERED |
| Runtime State Inventory (regen client, legacy localStorage, cookie, env) | 12-07/12-08 (generate only after apply), 12-09/12-16 (normalisers), 12-05, 12-18 | COVERED |
| Pitfalls 1-17 | 1→12-07; 2→12-07/12-08 sequencing; 3→12-08; 4→12-05; 5→12-04; 6→12-15; 7→12-14; 8→12-15; 9→12-02; 10→12-18 (+ strict compare 12-02/12-15); 11→12-18 (+12-02 tests); 12→12-10; 13→12-14/12-09; 14→12-04/12-16 tests; 15→12-05; 16→12-02/12-14/12-15; 17→12-15/12-18 | COVERED |
| Open Question 1 Stripe for a Nigerian business | 12-02 (switch tested), 12-18 (caveat + checklist) | RESOLVED |
| OQ2 fee-bearer / `requested_amount` | strict `amount` (12-02, 12-15) + owner setting + UAT (12-18) | RESOLVED |
| OQ3 unshippable destinations | 12-03 (`UNSHIPPABLE_COUNTRIES` KP, IR, SY, CU) + owner confirms (12-18) | RESOLVED |
| OQ4 free-shipping copy | 12-16 / 12-17 ("in Nigeria" + /shipping lists both zones) | RESOLVED |
| OQ5 abandoned pending orders | 12-18 owner note (out of scope) | RESOLVED |
| OQ6 stale cart vs server price | 12-14 (409 `price_changed` + fresh prices) + 12-09 (`updatePrices`) | RESOLVED (implemented) |
| OQ7 Paystack behaviours A1-A4 | 12-18 T3 blocking UAT items | RESOLVED |
| OQ8 Paystack USD in test mode | 12-18 T3 (only if the switch is used) | RESOLVED |
| OQ9 stock decrement | Deferred; flagged in 12-18 | RESOLVED (deferred per CONTEXT) |
| Validation Architecture + manual checks 1-8 | 12-18 (+ map above) | COVERED |
| Security Threats T1-T12 | Threat register below | COVERED |
| Optional PGlite devDependency | **Not adopted** (no installs; the one-time real-Postgres proof is recorded in RESEARCH; parity is guarded by the template-text test + the JS oracle) | RESOLVED |

### UI-SPEC assumptions

A-1 all UI plans · A-2 n/a (button classes reused) · A-3 12-05 · A-4 12-05 + 12-18 · **A-5 included** (12-02 verdict, 12-06
notice, 12-15 mapping) · A-6 12-05 · **A-7 included as a derived row** (12-03 helper; 12-12, 12-13) · A-8 12-09 · A-9 12-16,
12-17 · A-10 12-04 · A-11 12-06 · A-12 unchanged by design · A-13 12-11 · A-14 12-14 · A-15 12-06/12-14 · A-16 12-14 ·
**A-17 included** ("Paid via" column 12-13; products-table footnote 12-08) · A-18 12-03/12-06 · A-19 12-06 · A-20 12-01
tests · A-21 12-14.

**No unplanned items. No scope reduction. No phase split required.**

---

## Threat Register Summary (ASVS L1, block on HIGH)

| Threat ID | STRIDE | Component | Severity | Plan(s) | Disposition | Mitigation (D-ref) |
|-----------|--------|-----------|----------|---------|-------------|--------------------|
| T-12-01 | Spoofing | Paystack + Stripe webhooks | critical | 12-02, 12-10, 12-15 | mitigate | Raw body, HMAC-SHA512 + length-guarded `timingSafeEqual` before parse/DB; Stripe `constructEvent`; no IP allow-list reliance (D-20, D-22) |
| T-12-02 | Tampering | checkout route, verdicts, CAS | critical | 12-02, 12-10, 12-14, 12-15 | mitigate | DB repricing in the allow-listed currency; shared shipping fn; verdict + Stripe checks + CAS repeat amount/currency/provider (D-01, D-17, D-20, D-22) |
| T-12-03 | Spoofing | `/api/paystack/callback` | high | 12-15 (+12-02) | mitigate | Server-side `verifyTransaction` with the secret key; reference regex + `encodeURIComponent`; success page presentational (D-21) |
| T-12-04 | Repudiation / DoS-by-email | webhook retries, callback race | high | 12-10, 12-15 | mitigate | CAS `pending → paid`, email only on `count === 1` (D-22) |
| T-12-05 | Spoofing | callback + checkout redirects | high | 12-15, 12-14 | mitigate | Destinations = `NEXTAUTH_URL` + fixed paths + validated id; hostile-param tests (D-19, D-21) |
| T-12-06 | Tampering / EoP | admin product + rate actions | high | 12-08, 12-11 | mitigate | `requireOwner()` first; field-by-field parse; computed `priceUsd` only; integer bounds (D-05, D-06, D-07) |
| T-12-07 | Tampering | bulk recompute SQL | high | 12-08 | mitigate | One `$executeRaw` tagged template, single bound validated integer, template-text test (D-06) |
| T-12-08 | EoP | demo stub on production | critical | 12-02, 12-14 | mitigate | `demoCheckoutAllowed` strict equality; 503 before any order (D-24) |
| T-12-09 | Info disclosure | logs, analytics, client bundle | medium | 12-02, 12-14, 12-15, 12-18 | mitigate | Ids/verdicts only; no bodies/signatures/addresses/emails/keys logged; analytics carries currency only; key never `NEXT_PUBLIC_*` (D-27, D-31) |
| T-12-10 | Tampering | `nostalgia-currency` cookie | low | 12-01, 12-05, 12-14 | mitigate | Display preference only; every read through `parseCurrency`; POSTed currency re-validated (D-01, D-09) |
| T-12-11 | Tampering / Info | stored XSS via address | medium | 12-03, 12-06, 12-12, 12-13 | mitigate | Control chars rejected, caps; React children only (email included); sanitised `tel:` (D-15, D-25) |
| T-12-12 | Info disclosure | order IDOR | high | 12-13 | mitigate | Existing `userId` / owner-scoped queries left untouched (pages read-only) |
| T-12-13 | DoS / Tampering | migration against production | high | 12-07, 12-08 | mitigate | Expand-only hand-authored SQL, no DROP, Neon branch rehearsal, owner applies; never `migrate dev`/`db push`/`reset`; seed never run (D-30) |
| T-12-14 | DoS (availability) | Paystack fee-bearer config | medium | 12-18 (+12-15) | transfer | Owner keeps "merchant bears fees"; UAT verifies `amount == total` |
| T-12-15 | Tampering (integrity) | owner rate typo | medium | 12-11 | mitigate | 100-100,000 range + confirm above 20% change (D-05, D-06) |
| T-12-16 | Tampering | vendored font binary | low | 12-04 | mitigate | HTTPS from fonts.gstatic.com only, magic-byte + size test |
| T-12-17 | Tampering (integrity) | stale cart snapshot vs charge | medium | 12-14, 12-09 | mitigate | `expectedTotal` → 409 `price_changed` + fresh prices; no order created |
| T-12-18 | DoS (availability) | Stripe `amount_total` equality | low | 12-14, 12-18 | accept | No tax/promo/address collection in sessions; documented for the owner |
| T-12-SC | Tampering | package installs | n/a | — | n/a | **No npm/pip/cargo installs in this phase** (SDK rejected, PGlite not adopted) |

Every threat has a severity and a disposition. No `accept` at HIGH or above.

---

## Environment Constraints (copy the relevant lines into every PLAN.md)

- Windows machine; Bash tool is Git Bash. Use absolute paths.
- **Never run `next build`** (the owner's dev server on :3002 shares `.next`). Verify with `npx tsc --noEmit` and
  `npx vitest run` (run the full suite alone, not concurrently with `tsc`; a concurrent-run flake was observed).
- **Never** `prisma db push`, `prisma migrate dev`, `prisma migrate reset`, `prisma migrate deploy` (the owner runs it at the
  12-07 checkpoint), or `npm run seed`. `.env` points at the **production** Neon DB. `prisma validate` and offline
  `migrate diff` (with dummy URLs) are fine. **`prisma generate` runs only in 12-08**, after the migration is applied.
- `.env` and `.env.example` are deny-listed; document variables in `12-OWNER-SETUP.md` (D-31).
- Avoid `react.cache` in `lib/` (it breaks vitest).
- Executors run **sequentially on master** (no worktrees). Waves set order; files stay disjoint within a wave.
- Every commit message ends with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Fonts: fetch the Inter latin-ext woff2 from fonts.gstatic.com (the same Google release cited in `lib/fonts.ts`).
- No new dependencies. No `NEXT_PUBLIC_` variable for any Paystack value.

---

## Artifacts This Phase Produces

**New source files:** `lib/currency.ts`, `lib/currency-server.ts`, `lib/payment-provider.ts`, `lib/paystack-verify.ts`,
`lib/paystack.ts`, `lib/address.ts`, `lib/countries.ts`, `lib/settings.ts`, `lib/cart.ts`, `lib/payments.ts`,
`components/Money.tsx`, `components/CurrencyToggle.tsx`, `context/CurrencyContext.tsx`,
`components/checkout/AddressForm.tsx`, `components/checkout/OrderSummary.tsx`, `components/checkout/PaymentNotice.tsx`,
`components/checkout/messages.ts`, `components/checkout/CheckoutClient.tsx`, `components/admin/RateForm.tsx`,
`app/admin/settings/page.tsx`, `app/admin/settings/actions.ts`, `app/api/paystack/webhook/route.ts`,
`app/api/paystack/callback/route.ts`, `app/fonts/Inter-latin-ext-normal.woff2`,
`prisma/migrations/20261013120000_multi_currency/migration.sql`, `.planning/phases/12-…/12-OWNER-SETUP.md`.

**New tests:** `currency`, `payment-provider`, `paystack-verify`, `paystack`, `address`, `money`, `currency-css`, `fonts`,
`currency-middleware`, `currency-server`, `currency-toggle`, `address-form`, `checkout-summary`, `migration-multi-currency`,
`settings`, `cart`, `payments`, `admin-settings`, `admin-orders`, `shipping`, `checkout-route`, `paystack-webhook`,
`paystack-callback`, `storefront-money`, `filter-panel`, `shipping-copy` (all under `tests/`).

**New exported symbols:**
- `lib/currency.ts`: `CURRENCIES`, `Currency`, `DEFAULT_CURRENCY`, `isCurrency`, `parseCurrency`, `currencyFromCountry`,
  `formatMoney`, `CURRENCY_LABELS`, `toMinorUnits`, `RATE_MIN`, `RATE_MAX`, `isValidRate`, `autoUsdMinor`,
  `effectiveUsdMinor`, `CURRENCY_COOKIE`, `CURRENCY_ATTR`, `CURRENCY_COOKIE_MAX_AGE`, `CURRENCY_SCRIPT`
- `lib/currency-server.ts`: `getCurrency`
- `lib/payment-provider.ts`: `CheckoutProvider`, `resolveProvider`, `demoCheckoutAllowed`
- `lib/paystack-verify.ts`: `PaystackTx`, `TxVerdict`, `verifyWebhookSignature`, `evaluatePaystackTransaction`
- `lib/paystack.ts`: `paystackEnabled`, `initializeTransaction`, `verifyTransaction`
- `lib/address.ts`: `ShippingAddress`, `ADDRESS_LIMITS`, `NIGERIA_STATES`, `isPlausiblePhone`, `validateAddress`,
  `addressErrorMessage`, `addressLines`
- `lib/countries.ts`: `ISO_COUNTRY_CODES`, `UNSHIPPABLE_COUNTRIES`, `SHIPPABLE_COUNTRY_CODES`, `isShippableCountry`,
  `countryName`, `countryOptions`
- `lib/orders.ts` (additive): `PAYMENT_PROVIDERS`, `PaymentProvider`, `isPaymentProvider`, `paymentProviderLabel`,
  `orderCurrency`, `parseShippingAddress`, `orderShippingMinor`
- `lib/settings.ts`: `getRateSettings`, `getUsdNgnRate`, `setUsdNgnRate`
- `lib/cart.ts`: `CartItem`, `isValidCartItem`, `normaliseCartItems`, `subtotalsOf`, `applyPriceUpdates`
- `lib/payments.ts`: `markOrderPaid`
- `lib/shipping.ts`: `ShippingZone`, `SHIPPING_RATES`, `zoneFor`, `calculateShipping(subtotalMinor, currency, country)`,
  `FREE_SHIPPING_OVER`
- `lib/wishlist.ts`: `WishlistItem.prices`, `isValidWishlistItem`, `normaliseWishlistItems`
- `lib/catalog.ts`: `buildProductWhere({…, currency})`, `buildOrderBy(sort, currency)`; `lib/products.ts`: `Product.priceNgn`,
  `Product.priceUsd`, `getCatalog({…, currency?})`; `lib/seo.ts`: two-Offer `productJsonLd`
- `components/Money.tsx`: `Money` (default), `CurrencySymbol`; `context/CurrencyContext.tsx`: `CurrencyProvider`, `useCurrency`;
  `components/CurrencyToggle.tsx` (`variant: "bar" | "menu"`); `components/checkout/messages.ts`: `checkoutErrorMessage`;
  `CartContext`: `subtotals`, `updatePrices`; settings server action (e.g. `saveExchangeRate`)

**Routes:** `POST /api/paystack/webhook`, `GET /api/paystack/callback`, `/admin/settings`; `POST /api/checkout` contract
becomes `{items, currency, address, expectedTotal?}` with new 400 `invalid_address`, 409 `price_changed`, 503
`payments_unavailable`, 502 `payment_provider_error` responses.

**Database:** `Product.priceNgn` (NOT NULL), `Product.priceUsdOverride`, Prisma field `priceUsd` → column `price`,
index `Product_priceNgn_idx`; `Order.currency` (default `'USD'`), `Order.paymentProvider`, `Order.shippingAddress`;
table `StoreSettings` + row `(1, 1500)` (placeholder rate).

**Environment variables (documented in 12-OWNER-SETUP.md, never in `.env.example`):** `PAYSTACK_SECRET_KEY`;
optional `USD_PAYMENT_PROVIDER`; optional `ALLOW_DEMO_CHECKOUT`. **Cookie:** `nostalgia-currency`.

**Removed:** the legacy product price formatter in `lib/products.ts`, the duplicated cents formatter in `lib/email-content.ts`,
the two legacy shipping constants in `lib/shipping.ts`, `Product.price` / `CartItem.price` / `WishlistItem.price` (client
types), `tests/checkout-shipping.test.ts` (replaced by `tests/checkout-route.test.ts`), the "Stripe test mode" checkout
copy, and every literal "$200" free-shipping string.

---

*Phase: 12-multi-currency-payments-ngn-via-paystack-usd-via-stripe · Outline created 2026-10-13 · 18 plans across 8 waves*

## OUTLINE COMPLETE
