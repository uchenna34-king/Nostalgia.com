# Phase 12: Multi-currency payments - Pattern Map

**Mapped:** 2026-10-13
**Files analyzed:** about 45 (new and modified)
**Analogs found:** all new files have an analog or a RESEARCH.md snippet. Paystack fetch client, HMAC verify and the CSS currency switch have no direct analog; use RESEARCH.md Patterns 1, 4, 5, 6.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `lib/currency.ts` (new, pure) | utility | transform | `lib/shipping.ts`, `lib/site-gate.ts` (script const), `lib/auth-flags.ts` | role-match |
| `lib/currency-server.ts` (new) | utility | request-response | none; RESEARCH Pattern 4 | none |
| `lib/settings.ts` (new) | service | CRUD | `lib/reviews.ts` / `lib/products.ts` Prisma reads | role-match |
| `lib/shipping.ts` (modify) | utility | transform | itself (lines 13-19) | exact |
| `lib/address.ts`, `lib/countries.ts` (new, pure) | utility | transform | `lib/orders.ts` (allow-list guard), `lib/registration-rules.ts` | role-match |
| `lib/orders.ts` (modify: parseShippingAddress, providers allow-list) | utility | transform | itself, `parseOrderItems` lines 40-57 | exact |
| `lib/payment-provider.ts` (new, pure) | utility | transform | `lib/auth-flags.ts` | exact |
| `lib/paystack.ts` (new) | service | request-response | `lib/stripe.ts` (idiom) + RESEARCH Pattern 1 | partial |
| `lib/paystack-verify.ts` (new, pure) | utility | transform | RESEARCH Pattern 1 snippet | none |
| `lib/payments.ts` (new) | service | CRUD (CAS) | `app/api/stripe/webhook/route.ts` lines 72-83 | role-match |
| `app/api/checkout/route.ts` (modify) | route | request-response | itself | exact |
| `app/api/stripe/webhook/route.ts` (modify) | route | event-driven | itself | exact |
| `app/api/paystack/webhook/route.ts` (new) | route | event-driven | `app/api/stripe/webhook/route.ts` | exact |
| `app/api/paystack/callback/route.ts` (new) | route | request-response (redirect) | `app/api/checkout/route.ts` (origin rule) | partial |
| `middleware.ts` (modify) | middleware | request-response | itself | exact |
| `components/Money.tsx` (new) | component | transform | RESEARCH Pattern 5 | none |
| `components/CurrencyToggle.tsx` (new) | component | event-driven | `components/ThemeToggle.tsx` | exact |
| `context/CurrencyContext.tsx` (new) | provider | pub-sub | `context/CartContext.tsx`, `context/GoogleEnabledContext.ts` | role-match |
| `components/Providers.tsx` (modify) | provider | n/a | itself lines 44-56 | exact |
| `app/layout.tsx` + `app/globals.css` (modify) | config | n/a | `SESSION_HINT_SCRIPT` use, globals.css unlayered rule | exact |
| `context/CartContext.tsx`, `lib/wishlist.ts`, `context/WishlistContext.tsx` (modify) | store | CRUD (localStorage) | themselves | exact |
| `app/checkout/page.tsx`, `app/cart/page.tsx`, `components/CartDrawer.tsx`, `app/wishlist/page.tsx`, `components/ProductCard.tsx`, `components/AddToCart.tsx`, `components/EditRail.tsx`, `app/product/[slug]/page.tsx`, `components/home/TrustStrip.tsx`, `app/shipping/page.tsx` (modify) | component | request-response | themselves | exact |
| `lib/products.ts`, `lib/catalog.ts`, `lib/seo.ts` (modify) | service/utility | transform | themselves | exact |
| `lib/email-content.ts`, `emails/OrderConfirmation.tsx` (modify) | utility | transform | themselves | exact |
| `app/admin/settings/page.tsx` + `actions.ts` (new) | page + server action | CRUD | `app/admin/reviews/page.tsx`, `app/admin/reviews/actions.ts` | exact |
| `app/admin/products/actions.ts`, `components/admin/ProductForm.tsx`, `ProductTable.tsx`, `OrderTable.tsx`, `app/admin/orders/[id]/page.tsx`, `AdminNav.tsx` (modify) | action/component | CRUD | themselves | exact |
| `components/account/OrderList.tsx`, `OrderDetail.tsx` (modify) | component | transform | themselves | exact |
| `prisma/schema.prisma` + new migration (modify/new) | migration | batch | `prisma/migrations/*` (4 existing) | role-match |
| tests (new): currency, shipping, address, payments, paystack-verify, paystack webhook/callback, currency-middleware, currency-css, currency-script | test | n/a | `tests/stripe-webhook.test.ts`, `tests/checkout-shipping.test.ts`, `tests/admin-middleware.test.ts`, `tests/site-gate-css.test.ts` | exact |
| `12-OWNER-SETUP.md` (new) | doc | n/a | `.planning/phases/11-go-live/11-OWNER-SETUP.md` | exact |

## Pattern Assignments

### `lib/currency.ts` (utility, transform)

Analogs: `lib/shipping.ts` (pure, header explaining single source of truth), `lib/site-gate.ts:30-34` (script constant lives in lib/), `lib/auth-flags.ts:18-26` (strict equality).

Before-paint script idiom to copy (`lib/site-gate.ts:34`):
```ts
export const SESSION_HINT_SCRIPT = `(function(){try{if(localStorage.getItem("${SESSION_HINT_KEY}"))document.documentElement.classList.add("${SESSION_HINT_CLASS}")}catch(e){}})()`;
```
Allow-list guard idiom (`lib/orders.ts:14-23`): `const STATUS_SET = new Set<string>(ORDER_STATUSES); export function isValidOrderStatus(v): v is OrderStatus`. Use the same for `parseCurrency`.
Body content: RESEARCH Pattern 3 (formatter, `en-US` + `narrowSymbol`) and Pattern 5 (CURRENCY_SCRIPT). Must stay Prisma-free so `lib/email-content.ts` and middleware (Edge) can import it.

### `lib/shipping.ts` (modify)

Current (lines 13-19) is the whole file body: `FREE_SHIPPING_THRESHOLD = 20000`, `SHIPPING_FEE = 1500`, `calculateShipping(subtotal)`. Keep the header comment (drift-bug history). Replace with zone x currency table and `calculateShipping(subtotalMinor, currency, country)`; export `FREE_SHIPPING_OVER = { domestic: {NGN, USD}, international: {...} }` for `<Money>` copy in PDP, TrustStrip, `/shipping`. Update `tests/checkout-shipping.test.ts` lines 1-14 (imports removed constants).

### `lib/payment-provider.ts` (utility)

Copy `lib/auth-flags.ts:18-26` shape: env passed as `Record<string,string|undefined>`, strict `=== "true"` / `=== "paystack"`, no trimming, import-free.

### `lib/orders.ts` (modify)

Add `parseShippingAddress(json: string | null)` mirroring `parseOrderItems` (lines 40-57): try/catch, return null on failure, `String(x.field ?? "")` coercion. Add `PAYMENT_PROVIDERS` allow-list like `ORDER_STATUSES` (lines 5-23). Also the derived-shipping helper (UI-SPEC A-7).

### `lib/paystack.ts` (service)

Idiom from `lib/stripe.ts:3-8`:
```ts
const key = process.env.STRIPE_SECRET_KEY;
export const stripe = key ? new Stripe(key) : null;
export const stripeEnabled = Boolean(key);
```
Body: RESEARCH Pattern 1 "Exact calls" (fetch, `AbortSignal.timeout(10_000)`, `cache: "no-store"`).

### `lib/payments.ts` (service, CAS)

Replace the check-then-update at `app/api/stripe/webhook/route.ts:77-83`:
```ts
if (order.status === "pending") {
  await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });
  await sendOrderConfirmation(order.id);
}
```
with `updateMany` CAS per RESEARCH Pattern 6. Imports: `@/lib/db`, `@/lib/email`.

### `app/api/paystack/webhook/route.ts` (route, event-driven)

Analog: `app/api/stripe/webhook/route.ts`.
- Lines 8-11: `export const runtime = "nodejs";` with the comment.
- Lines 27-31: raw body first: `const body = await req.text();` (never `req.json()` before verify). Header: `headers().get("x-paystack-signature")` (line 32 pattern).
- Lines 33-48: missing signature -> 400 `missing_signature`; invalid -> 400 `invalid_signature` with short log only.
- Lines 36-38 / 22-25: no key -> `NextResponse.json({ received: true })`.
- Lines 63-70: look up order, log and ack 200 when absent.
- Lines 86-89: always ack 2xx once signature verified.
Verify via `verifyWebhookSignature` and `evaluatePaystackTransaction` (RESEARCH Pattern 1), then `markOrderPaid`. Test with the mock style below.

### `app/api/stripe/webhook/route.ts` (modify)

Keep lines 1-62; replace 72-83 with checks `session.payment_status === "paid"`, `session.amount_total === order.total`, `session.currency === order.currency.toLowerCase()` then `markOrderPaid(orderId, {provider:"stripe", amount, currency})`. Existing `tests/stripe-webhook.test.ts` mocks `prisma.order.update`; extend mocks with `updateMany` and `vi.mock("@/lib/payments")` or mock `updateMany`.

### `app/api/paystack/callback/route.ts` (route)

Origin rule from `app/api/checkout/route.ts:110-130` (copy verbatim): `const origin = process.env.NEXTAUTH_URL; if (!origin) { console.error(...); return NextResponse.json({ error: "server_misconfigured" }, { status: 500 }); }`. Redirects with `NextResponse.redirect(new URL(..., origin), 303)`. Read `reference` then fall back to `trxref`.

### `app/api/checkout/route.ts` (modify)

Keep: auth guard lines 27-30; `req.json()` try/catch 32-37; `isIncomingItem` guard 15-24 (extend for `currency`, `address` with the same unknown-narrowing style); DB repricing 52-89 (change `unitPrice: p.price` at line 80 to `currency === "NGN" ? p.priceNgn : p.priceUsd`); shipping line 95 becomes `calculateShipping(subtotal, currency, address.country)`; userId handling 97-108; origin rule 110-130.
Stub branch (lines 132-151) wrapped in `demoCheckoutAllowed(env)` else 503 `payments_unavailable`; order create data gains `currency`, `paymentProvider`, `shippingAddress: JSON.stringify(address)`. Stripe branch lines 164-195: replace both `currency: "usd"` (lines 171, 184) with `order.currency.toLowerCase()`. Paystack branch: create pending order, `initializeTransaction`, return `{ url: authorization_url }`.
Test mock style: `tests/checkout-shipping.test.ts:20-40` (`vi.mock("next-auth")`, `@/lib/auth`, `@/lib/db`); fixtures there use `price: 4500` and must gain `priceNgn`/`priceUsd`.

### `middleware.ts` (modify)

Move current body (lines 18-32) verbatim into `adminGate(req)`; add path branch `p === "/admin" || p.startsWith("/admin/")` in `middleware()` (tests call `middleware()` directly with /admin URLs, `tests/admin-middleware.test.ts:1-30`). Matcher per RESEARCH Pattern 4 (two backslashes in TS literal; `missing` cookie gate). Keep header comment block.

### `components/CurrencyToggle.tsx` (component)

Analog: `components/ThemeToggle.tsx`. Copy: `"use client"`, `className` prop (line 18), null-until-mounted placeholder to avoid hydration mismatch (lines 55-59: `<span aria-hidden className={`block h-6 w-6 ${className}`} />`), `aria-label` + `aria-pressed` (lines 66-68), button classes `flex items-center text-ink transition-colors hover:text-sepia` (line 69), try/catch around storage (47-51; here cookie write). Mount it next to `<ThemeToggle />` at `components/Nav.tsx:181` (import at line 9). Visual spec: 12-UI-SPEC.md Surface 1.

### `context/CurrencyContext.tsx` + `components/Providers.tsx`

Analog: `context/CartContext.tsx` (createContext null + `useX` hook that throws outside provider, lines 34, 127-131). Mount inside `Providers.tsx` provider chain (lines 44-56), e.g. wrapping `CartProvider`. Initial state must not read cookies during render (hydrate in `useEffect`, like CartContext lines 47-58).

### `app/layout.tsx` + `app/globals.css`

Add `<script dangerouslySetInnerHTML={{ __html: CURRENCY_SCRIPT }} />` beside lines 45 and 48. Do NOT read cookies in the layout (D-12). CSS rule outside every `@layer` (precedent near `app/globals.css:123`); guard with a test cloned from `tests/site-gate-css.test.ts` (PostCSS + Tailwind compile helper lines 8-27; assertion on collapsed whitespace `.toContain(...)`).

### `components/Money.tsx`

No analog; RESEARCH Pattern 5. No `"use client"`.

### `context/CartContext.tsx`, `lib/wishlist.ts`, `context/WishlistContext.tsx` (modify)

CartContext: type at lines 12-19 (`price: number; // cents` -> `prices: {NGN, USD}`), `subtotal` lines 100-109 -> per-currency `subtotals`, load at lines 47-58 filter legacy entries lacking both prices before `setItems`. Wishlist type `lib/wishlist.ts:8-13`; add a pure `isValidWishlistItem`/normaliser and apply on load in `WishlistContext`. Update `tests/wishlist.test.ts`.

### `lib/products.ts`, `lib/catalog.ts`, `lib/seo.ts`

- `lib/products.ts`: `Product.price` (line 22) -> `prices` (NGN/USD); `deserialize` row type (line ~42) gains `priceNgn`; delete `formatPrice` (line 239-241) after migrating its 10 call sites (admin order detail, cart, checkout, PDP, wishlist, OrderDetail, OrderList, OrderTable, ProductTable, CartDrawer, EditRail, ProductCard) to `<Money>` / `formatMoney`.
- `lib/catalog.ts`: `parsePriceRange` (39-65) now read as major units, x100 in the where builder; clauses at 138-142 take the active column (`priceNgn` or `price`/`priceUsd`); `buildOrderBy` cases at 175-178 likewise.
- `lib/seo.ts:29-30`: single Offer `priceCurrency: "USD", price: (product.price / 100).toFixed(2)` becomes two Offers. Update `tests/seo.test.ts`.

### `lib/email-content.ts` (modify)

Delete `formatCents` (lines 50-58) and its duplication comment; import `formatMoney` from `@/lib/currency`. Add `currency` and `shippingAddress` to `OrderEmailSource` (lines 9-16); lines 108-109 and 116 use `formatMoney(x, order.currency)`. Update `tests/email.test.ts`.

### `app/admin/settings/page.tsx` + `actions.ts` (new)

Analog: `app/admin/reviews/actions.ts` and `page.tsx`. Action rule (lines 20-22 of actions): `"use server"`, `await requireOwner();` as FIRST statement, then Prisma, then a `revalidateXSurfaces()` helper listing paths (lines 11-17: `/`, `/shop`, `/product/[slug]` "page", `/collections/[slug]` "page"). Page: server component querying prisma directly (reviews/page.tsx lines 1-12), owner-gated by `app/admin/layout.tsx`. Recompute uses `prisma.$executeRaw` tagged template with ceil expression `CEIL(price_ngn::numeric / (${rate} * 100)) * 100` (exact statement in RESEARCH Q7). Add link in `components/admin/AdminNav.tsx`.

### `app/admin/products/actions.ts` (modify)

`ParsedProduct.price` (line 25), parse at lines 94-96 (`Number(field(fd,"price"))`, finite, >= 0, `Math.round`) -> parse `priceNgn` (required) and `priceUsdOverride` (optional) in major units x100, validate integers; writes at lines 139, 159, 206 gain `priceNgn`, `priceUsdOverride`, computed `price` (`effectiveUsdMinor`). Reads rate from `lib/settings.ts`. `field()` helper lines 36-39 reused.

### `prisma/schema.prisma` + migration

Product (lines 11-36): `price Int @map("price")` renamed field `priceUsd` with `@map("price")`, add `priceNgn`, `priceUsdOverride`, `@@index([priceNgn])` next to `@@index([price])` (line 36). Order (lines 95-107): add `currency String @default("USD")`, `paymentProvider String?`, `shippingAddress String?`; update comment on `total`. New `StoreSettings`. Migration SQL: use RESEARCH Q6 hand-authored version (nullable add, backfill, SET NOT NULL, seed). Never run migrate dev/deploy. `prisma/seed.ts` writes `price:` and must be edited for tsc only; never run.

### Tests

- Webhook/route mock style: `tests/stripe-webhook.test.ts:1-46` (hoisted `vi.fn()` mocks, `vi.mock("@/lib/db", () => ({ prisma: { order: {...} } }))`, `vi.mock("@/lib/email")`, `vi.mock("next/headers", () => ({ headers: () => ({ get: ... }) }))`, assert both HTTP response and side effects).
- Middleware: `// @vitest-environment node`, `new NextRequest(url, { headers })`, call `middleware()` (admin-middleware.test.ts:1-30).
- Pure modules: `tests/checkout-shipping.test.ts:1-14` style.

## Shared Patterns

### Owner gate
`requireOwner()` from `@/lib/admin` first statement of every admin Server Action (`app/admin/reviews/actions.ts:20-22`). Apply to settings and product actions.

### Strict-equality env flags
`lib/auth-flags.ts:24` `env.X === "true"`. Apply to `ALLOW_DEMO_CHECKOUT`, `USD_PAYMENT_PROVIDER`.

### Null-if-no-key client
`lib/stripe.ts:3-8`. Apply to `lib/paystack.ts`.

### No fallback origin
`app/api/checkout/route.ts:121-130`. Apply to checkout, paystack callback.

### Raw-body webhook ack
`app/api/stripe/webhook/route.ts:21-48, 86-89`. Apply to Paystack webhook.

### Untrusted-input narrowing
`isIncomingItem` (checkout route 15-24) and `parseOrderItems` (`lib/orders.ts:40-57`). Apply to address and currency validation and to `parseShippingAddress`.

### Order amounts use order currency
Order displays use `formatMoney(total, order.currency)`, never `<Money>` (RESEARCH Pattern 5 note).

## No Analog Found

| File | Role | Reason |
|---|---|---|
| `lib/currency-server.ts` | utility | no existing `cookies()`/`headers()` helper; use RESEARCH Pattern 4 |
| `lib/paystack-verify.ts` | utility | HMAC + timingSafeEqual not used anywhere; RESEARCH Pattern 1 |
| `components/Money.tsx` | component | new dual-span idiom; RESEARCH Pattern 5 |
| `lib/countries.ts`, NG states list | data | no list exists; RESEARCH Q9 |

## Metadata

**Analog search scope:** `lib/`, `app/api/`, `app/admin/`, `components/`, `context/`, `tests/`, `middleware.ts`, `prisma/schema.prisma`
**Not fully read (planner should Read before editing):** `app/checkout/page.tsx`, `app/cart/page.tsx`, `components/CartDrawer.tsx`, `components/admin/ProductForm.tsx`, account order components, `emails/OrderConfirmation.tsx`, `prisma/migrations/*`. Locate price sites with `grep -rn "formatPrice\|\.price\b\|\$200"`.
**RESEARCH.md** was read only to line 460; later sections (Q6 SQL, Q7, Q9, Q11 inventory) are referenced, not excerpted.
**Date:** 2026-10-13
