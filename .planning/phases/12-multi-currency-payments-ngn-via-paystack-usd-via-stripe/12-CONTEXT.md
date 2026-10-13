# Phase 12: Multi-currency payments — NGN via Paystack, USD via Stripe - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning
**Source:** In-session discussion with the owner (2026-10-13). Owner answers: business is Nigeria-registered; Paystack for naira, Stripe for dollars; "₦ required, $ optional"; "add an address step".

<domain>
## Phase Boundary

Nostalgia becomes a **naira-first store with a dollar option**. Every price on the
site shows in the shopper's chosen currency (₦ by default, $ for visitors outside
Nigeria, switchable anywhere). Naira orders pay through **Paystack**, dollar orders
through **Stripe**. Checkout gains a **delivery address** step, and shipping is
priced by destination (Nigeria vs international) in the order's currency. The owner
sets naira prices (required) and optional dollar prices in /admin, plus one store
exchange rate that prices every product without a hand-set dollar price. Orders
permanently record their currency, payment provider and delivery address, and every
order display and confirmation email formats amounts in the order's own currency.

**Not in this phase:** other currencies (GHS, KES, ZAR…), refunds through the
provider APIs, VAT/tax calculation, live FX feeds, saved address books, carrier
integrations, admin-editable shipping rates, stock decrement on payment (see
Deferred).
</domain>

<decisions>
## Implementation Decisions

### Money & currencies
- **D-01:** Exactly two currencies, `NGN` (primary and default) and `USD`, held in one
  allow-list in a new **pure, Prisma-free `lib/currency.ts`** (same discipline as
  `lib/orders.ts` / `lib/shipping.ts`). Every amount in the system is an **integer in
  minor units** (kobo / cents, both 1/100). Any currency string from a client, cookie
  or provider is checked against the allow-list before use.
- **D-02:** One formatter, `formatMoney(amountMinor, currency)`, built on
  `Intl.NumberFormat` with whole units ("₦45,000", "$35"). It replaces **both**
  `formatPrice` in `lib/products.ts` and the duplicated `formatCents` in
  `lib/email-content.ts`. Because `lib/currency.ts` is Prisma-free, the email module
  can import it directly, which ends that documented duplication.

### Product pricing (owner chose "₦ required, $ optional")
- **D-03:** `Product` carries three price columns:
  - `priceNgn Int`: kobo, **required**, typed by the owner.
  - `priceUsdOverride Int?`: cents, an optional hand-set dollar price.
  - `priceUsd Int`: cents, the **effective** dollar price the storefront, sorting,
    filtering and checkout read. It equals the override when set, otherwise the
    naira price converted at the store rate. It maps onto the existing `price`
    column (`@map("price")`) so no column rename is needed, and the existing price
    index keeps working.
  - Add an index on `priceNgn`.
- **D-04:** Auto dollar price = naira ÷ rate, **rounded UP to the next whole dollar**
  (never undercharges against the naira price), computed with integer-safe
  arithmetic: `Math.ceil(kobo / (rate * 100)) * 100`. One pure helper in
  `lib/currency.ts` is the only implementation the app uses. The bulk recompute SQL
  (D-06) must produce identical numbers, and a test must prove it on boundary values.
- **D-05:** Store exchange rate lives in a new singleton **`StoreSettings`** row
  (`id = 1`, `usdNgnRate Int` = whole naira per $1, `updatedAt`). The migration seeds
  it at **₦1,500 = $1 (PLACEHOLDER; the owner sets the real rate)**. Valid range
  100–100,000.
- **D-06:** Owner-gated **`/admin/settings`** page edits the rate. Saving it
  recomputes the effective `priceUsd` of every product **without** an override in
  **one parameterized SQL UPDATE** (`$executeRaw` tagged template, never string-built),
  then revalidates the storefront routes. Product create/update computes `priceUsd`
  the same way at save time.
- **D-07:** Admin product form takes **"Price (₦)" (required)** and
  **"Price ($), optional"** in **major units** (naira/dollars, not kobo/cents). The
  server multiplies by 100 and validates non-negative integers. The dollar field's
  helper text previews the auto price at the current rate ("Leave blank to use the
  rate: $34"). This replaces today's owner-hostile "Price (cents)" input. The admin
  product table shows both prices and marks rate-following dollar prices as "auto".
- **D-08:** Migration backfill for existing products:
  - `priceUsdOverride` = the current `price`, so every existing dollar price stays
    exactly as the owner typed it.
  - `priceNgn` = current price × 1,500, rounded to the nearest ₦500.
  - The owner reviews these in /admin.
  - Existing orders are backfilled as `currency = 'USD'`, since that is what they
    were charged in.

### Choosing the currency (shopper side)
- **D-09:** The active currency lives in a cookie **`nostalgia-currency`**
  (`NGN`|`USD`, 1 year, `SameSite=Lax`, path `/`, not httpOnly because client code
  reads it).
  - First visit: **middleware** sets it from Vercel's `x-vercel-ip-country` header.
    `NG` → NGN, any other country → USD, header absent (local dev) → NGN.
  - The middleware matcher widens from `/admin/:path*` to page routes (excluding
    `_next`, `api`, static files, `/media`).
  - **The /admin auth branch must behave exactly as it does today**, and its existing
    tests stay green.
- **D-10:** **Every price renders through one `<Money>` component that outputs BOTH
  currencies' text**, and CSS shows only the active one.
  - A blocking inline `<head>` script sets `data-currency` on `<html>` from the cookie
    before first paint. This is the same idiom as `THEME_SCRIPT` and
    `SESSION_HINT_SCRIPT` in `app/layout.tsx`.
  - Results: static pages (home) stay static, there is no hydration mismatch (server
    and client render identical markup), no flash of the wrong currency, and
    switching is instant without a reload.
  - The hidden span uses `display:none` so assistive tech reads only the active price.
  - No `data-currency` attribute means NGN.
- **D-11:** A **currency toggle in the Nav** sits beside `ThemeToggle` ("₦ NGN" /
  "$ USD", accessible name and pressed state). Switching:
  - writes the cookie
  - flips `data-currency` on `<html>`
  - updates a small client `CurrencyContext` (for code that needs the value in JS:
    checkout POST, analytics)
  - calls `router.refresh()` so server-side price sort/filter re-runs.
- **D-12:** Server code that needs the currency (only /shop and collection price
  sort/filter) uses a `getCurrency()` server helper: cookie, then geo header, then
  NGN, all through the allow-list. Those routes are already `force-dynamic`, so the
  root layout must **not** start reading cookies (it would make every page dynamic).

### Cart & wishlist
- **D-13:**
  - Cart and wishlist items snapshot **both** prices (`prices: { NGN, USD }`) instead
    of a single `price`.
  - Subtotals are computed per currency and rendered with `<Money>`.
  - Switching currency never touches the cart.
  - Legacy localStorage entries without both prices are **discarded on load**
    (`nostalgia-cart`, `nostalgia-wishlist`). This is acceptable because the store is
    still pre-launch behind the sign-in gate.
- **D-14:** The cart page and drawer show **"Calculated at checkout"** for shipping,
  because the destination isn't known until the address is entered. Checkout shows
  the real fee once a country is chosen (default Nigeria).

### Checkout, delivery address & shipping (owner chose "add an address step")
- **D-15:** `/checkout` gains a delivery-address form before "Pay now". Fields:
  - **full name**, **phone** (required: Nigerian couriers need it)
  - **address line 1**, address line 2 (optional)
  - **city**, **state/region**, postal code (optional: many Nigerian addresses have
    none)
  - **country** (select, default Nigeria)
  - For Nigeria, state is a select of the 36 states + FCT. Other countries get a
    free-text region.
  - Client-side validation is for UX only. **The server validates authoritatively**:
    required fields, length caps, phone character set, country against an ISO-3166
    alpha-2 allow-list, and NG state against the state list.
- **D-16:** Shipping is priced by **zone × currency** in `lib/shipping.ts`, which
  remains the single pure source of truth that keeps UI, API and charge from
  drifting:
  - Zones: `domestic` (country `NG`) and `international` (everything else).
  - Each zone has a fee and a free-delivery threshold **in both currencies**.
  - New signature: `calculateShipping(subtotalMinor, currency, country)`.
  - Placeholder rates, flagged for the owner, not final:
    - domestic: ₦5,000 fee, free from ₦250,000 / $5 fee, free from $200
    - international: ₦60,000 fee, free from ₦750,000 / $40 fee, free from $500
  - Hardcoded "$200" copy (PDP "Free shipping over $200", TrustStrip "Complimentary
    over $200", `/shipping` page) renders from these constants through `<Money>`.
- **D-17:** `POST /api/checkout` accepts `{ items, currency, address }`:
  - validates `currency` (allow-list) and `address` (D-15)
  - recomputes every unit price from the DB in that currency (`priceNgn` or
    `priceUsd`). **The existing "never trust client totals" invariant stays.**
  - computes shipping via `calculateShipping`
  - persists the `Order` with `currency`, `paymentProvider`, `shippingAddress` and
    `total` (minor units of `currency`)
  - then hands off to the provider (D-18).

### Payment providers
- **D-18:** Routing by currency: **NGN → Paystack, USD → Stripe.** An optional env
  switch **`USD_PAYMENT_PROVIDER`** (`stripe` default | `paystack`) sends dollar
  orders through Paystack instead, with no code change, in case Stripe onboarding
  for a Nigerian business doesn't work out (Paystack accepts USD for approved
  Nigerian merchants). It uses strict string equality, mirroring
  `lib/auth-flags.ts`'s `ALLOW_DEMO_LOGIN`.
- **D-19:** **Paystack via its REST API using `fetch`** (no SDK dependency) in a new
  `lib/paystack.ts`, using the same null-if-no-key idiom as `lib/stripe.ts`
  (`PAYSTACK_SECRET_KEY`).
  - `initializeTransaction` sends: email, amount in minor units, currency,
    `reference` = order id, `callback_url`, `metadata.orderId`, and a cancel-return
    URL if Paystack supports one (researcher confirms the field).
  - `verifyTransaction(reference)`.
  - Uses Paystack's hosted redirect checkout (mirrors the Stripe Checkout redirect),
    not the inline popup.
  - Redirect/callback origin comes from `NEXTAUTH_URL` with **no fallback** (Phase 11
    D-09).
- **D-20:** **`POST /api/paystack/webhook`**:
  - reads the **raw** body and verifies `x-paystack-signature` (HMAC-SHA512 of the
    raw body with the secret key) using a **timing-safe compare** before parsing
  - acts only on `charge.success`
  - looks up the order by `data.reference`
  - requires `data.status === "success"`, `data.amount === order.total`,
    `data.currency === order.currency` and `order.paymentProvider === "paystack"`
  - then calls the shared `markOrderPaid` (D-22)
  - always 200 once the signature is verified (mirrors the Stripe webhook's D-04
    guidance).
- **D-21:** **`GET /api/paystack/callback`** (the transaction's `callback_url`):
  - takes `reference`, calls `verifyTransaction` server-side with the secret key, and
    applies the same checks as D-20
  - success: `markOrderPaid`, then redirect to `/order/success?order=<id>`
  - anything not successful (failed/abandoned/unknown): redirect to
    `/checkout?payment=failed` (or `cancelled`), where the page shows a calm "you
    weren't charged, try again" notice
  - A customer sees confirmation immediately even if the webhook lags. The webhook
    still covers customers who close the tab. This deliberately differs from
    Stripe's webhook-only Phase 11 D-04a: Paystack's own docs require verifying
    before giving value, and this verification is server-to-server, never trusting
    the browser.
- **D-22:** New **`lib/payments.ts` → `markOrderPaid(orderId, { provider, amount, currency })`**:
  - an **atomic compare-and-set**:
    `prisma.order.updateMany({ where: { id, status: "pending", total: amount, currency, paymentProvider: provider }, data: { status: "paid" } })`
  - sends the shared confirmation email **only when `count === 1`**, so a
    webhook/callback race can never double-send
  - **The Stripe webhook switches to it too.** It gains checks for
    `session.payment_status === "paid"`, `session.amount_total === order.total` and
    `session.currency === order.currency.toLowerCase()`.
- **D-23:** Stripe flow otherwise unchanged:
  - `currency` comes from the order (`order.currency.toLowerCase()`).
  - Line items stay as today (products + shipping line when > 0).
  - Stripe's own address collection is **not** used; the address is collected once,
    on our checkout, for both providers.
- **D-24:** **Demo/stub checkout is closed on production.** When the chosen provider
  has no key, the stub (create order as paid + shared confirmation email + `demo=1`)
  runs only if `ALLOW_DEMO_CHECKOUT === "true"` or `NODE_ENV !== "production"`.
  Otherwise checkout returns **503 `payments_unavailable`** and creates no order.
  This stops a missing key on Vercel from silently producing free "paid" orders. It
  uses the strict-equality flag idiom from `lib/auth-flags.ts`.

### Orders, emails, account & admin
- **D-25:** `Order` gains:
  - `currency String @default("USD")`: the default backfills legacy rows; the app
    always writes currency explicitly.
  - `paymentProvider String?`: `paystack` | `stripe` | `demo`, app-level allow-list.
  - `shippingAddress String?`: a JSON snapshot, mirroring the `items` JSON idiom,
    parsed defensively by a helper in `lib/orders.ts`.
  - `total` is documented as minor units of `currency`.
- **D-26:** Every order display formats with **the order's own currency**:
  - account OrderList/OrderDetail, admin OrderTable and order detail, and the
    confirmation email (lines + total + a delivery-address block)
  - admin order detail also shows the delivery address, currency and provider
  - totals are never summed across currencies anywhere.
- **D-27:**
  - The checkout trust line names the provider ("Secure checkout · Paystack" /
    "· Stripe"), replacing the hardcoded "Stripe test mode".
  - `begin_checkout` and `purchase` analytics events gain a `currency` field. The
    payload stays non-PII (no address data in analytics).

### Catalog & SEO
- **D-28:** /shop and collection **price sort and the `?price=` filter use the active
  currency's column** (`priceNgn` / `priceUsd`). `?price=min-max` is read in **major
  units** of the active currency. This also fixes the existing bug where typed values
  were compared against cents. Filter inputs show the currency symbol.
- **D-29:** Product JSON-LD `offers` becomes **two Offers (NGN and USD)** with the
  same availability. No server-side currency guess is needed on the PDP, and both
  are real prices.

### Data migration & environment
- **D-30:** **Hand-authored Prisma migration; never `prisma migrate dev`.** The local
  `.env` points at the **production Neon database**.
  - Generate SQL offline with `prisma migrate diff --from-schema-datamodel <old>
    --to-schema-datamodel <new> --script`, then add the backfill statements and the
    `StoreSettings` seed row by hand.
  - `prisma validate` / `prisma generate` are fine locally.
  - **Applying the migration to Neon is a blocking owner checkpoint** (ask first). On
    deploy, Vercel's existing `prisma migrate deploy` applies it.
  - In-browser verification depends on that checkpoint.
- **D-31:**
  - New env vars: `PAYSTACK_SECRET_KEY` (sk_test_ for UAT), optional
    `USD_PAYMENT_PROVIDER`, optional `ALLOW_DEMO_CHECKOUT`.
  - The Paystack webhook URL (`https://<domain>/api/paystack/webhook`) is registered
    in the Paystack dashboard.
  - **`.env.example` is deny-listed for the agent.** Do not plan edits to it. Document
    every variable in a new `12-OWNER-SETUP.md` instead (mirrors
    `11-OWNER-SETUP.md`).
- **D-32:** Phase completion = **deployed and UAT-ready on Paystack TEST + Stripe
  TEST keys** (mirrors Phase 11 D-11). Live keys are an owner action.

### Claude's Discretion
- File/module layout beyond the files named above, component names, and the
  internal shape of `<Money>` and the toggle.
- Country list source (static ISO list vs `Intl.DisplayNames` for names) and the
  Nigerian states list file.
- Exact copy for the failed/cancelled-payment notice and helper texts (within the
  locked design system as defined in `DESIGN.md` + `app/globals.css`: black-and-white
  palette, Bodoni display at 400, Inter for reading text and prices, existing button/input
  classes).
- Test file organization, as long as every new pure module and route handler gets
  unit tests in the existing Vitest mock style (see `tests/stripe-webhook.test.ts`,
  `tests/checkout-shipping.test.ts`).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current payment & order code (to be changed)
- `app/api/checkout/route.ts`: checkout route (server-side repricing, stub branch, Stripe session, D-09 origin rule)
- `app/api/stripe/webhook/route.ts`: Stripe webhook (raw body, signature, pending→paid guard, shared email)
- `lib/stripe.ts`: null-if-no-key client idiom to mirror for Paystack
- `lib/shipping.ts`: single-source shipping math and the drift-bug history in its header comment
- `lib/orders.ts`: Order item snapshot types + defensive JSON parsing idiom
- `lib/email.ts`, `lib/email-content.ts`, `emails/OrderConfirmation.tsx`: confirmation email (shared send path, D-06 of Phase 11)
- `lib/products.ts` (`formatPrice`, `deserialize`), `lib/catalog.ts` (price where/orderBy, `parsePriceRange`)
- `context/CartContext.tsx`, `lib/wishlist.ts`, `context/WishlistContext.tsx`: client snapshots with `price`
- `app/checkout/page.tsx`, `app/cart/page.tsx`, `components/CartDrawer.tsx`, `app/order/success/page.tsx`
- `app/admin/products/actions.ts`, `components/admin/ProductForm.tsx`, `components/admin/ProductTable.tsx`, `app/admin/orders/[id]/page.tsx`, `components/admin/OrderTable.tsx`
- `components/account/OrderList.tsx`, `components/account/OrderDetail.tsx`
- `lib/seo.ts`: Product JSON-LD (`priceCurrency: "USD"` today)
- `middleware.ts`: /admin first-layer auth gate (must stay behaviourally identical)
- `app/layout.tsx`: static root layout + before-paint inline script idiom (`THEME_SCRIPT`, `SESSION_HINT_SCRIPT` in `lib/site-gate.ts`)
- `lib/auth-flags.ts`: strict-equality env flag idiom
- `prisma/schema.prisma`, `prisma/migrations/`: Postgres (Neon) migration history

### Prior phase decisions
- `.planning/phases/11-go-live/11-CONTEXT.md`: D-04/D-04a (webhook as truth), D-06 (single shared confirmation email), D-08/D-08a (migrations, String status), D-09 (no fallback origin), D-11 (done = UAT on test keys), D-12 (placeholders flagged, not written)
- `.planning/phases/11-go-live/11-OWNER-SETUP.md`: owner setup doc format to mirror
- `.planning/phases/10-trust-polish/10-UI-SPEC.md`, `.planning/phases/11-go-live/11-UI-SPEC.md`: design contracts for the locked aesthetic

### External
- Paystack API: transaction initialize/verify, webhooks + `x-paystack-signature`, supported currencies (NGN; USD for approved Nigerian merchants). Researcher must confirm request/response shapes against current docs.
- Stripe Checkout Sessions: `currency`, `amount_total`, `payment_status` on `checkout.session.completed`.
</canonical_refs>

<specifics>
## Specific Ideas

- Naira is the brand's home currency ("by Africans, for Africans"), so ₦ is the default everywhere and $ is the courtesy option.
- Owner-facing inputs are always in naira/dollars, never kobo/cents.
- The toggle should feel native to the existing Nav (same scale and treatment as ThemeToggle), not a bolted-on dropdown.
- Failed/cancelled Paystack payments return the customer to checkout with their cart intact and a calm note: no charge was made.
</specifics>

<deferred>
## Deferred Ideas

- More African currencies (GHS, KES, ZAR). The model extends by adding a column and an allow-list entry per currency.
- Admin-editable shipping rates (constants in `lib/shipping.ts` for now, owner edits via a code change).
- Saved addresses / address book; pre-filling from the last order.
- Refunds through Paystack/Stripe APIs (manual via dashboards for now).
- Live FX rate feed (the owner sets the rate by hand).
- VAT (7.5% Nigeria) calculation and display.
- Verve / Paystack marks in the footer `PaymentMarks`.
- **Stock decrement on payment + server-side sold-out rejection at checkout.** Deferred from Phase 9 (D-10) and still not implemented. `markOrderPaid` is the natural future home. Flag to the owner as a go-live risk (overselling).
</deferred>

---

*Phase: 12-multi-currency-payments-ngn-via-paystack-usd-via-stripe*
*Context gathered: 2026-10-13 via in-session discussion*
