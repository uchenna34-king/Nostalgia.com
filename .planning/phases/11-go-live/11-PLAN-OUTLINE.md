---
phase: 11-go-live
type: outline
plan_count: 8
waves: 4
granularity: standard
mvp_mode: false
security_enforcement: true
asvs_level: 1
block_on_severity: high
created: 2026-08-24
---

# Phase 11: Go Live — Plan Outline

> Chunked-mode outline. No PLAN.md files written yet. Each row below becomes one
> `.planning/phases/11-go-live/11-NN-PLAN.md`.

**Phase completion definition (D-11, non-negotiable):** deployed and UAT-ready on Stripe
**TEST** keys. Not real charges. Not a published OAuth consent screen. Not
`ALLOW_DEMO_LOGIN=false`. Not a custom domain. Not real policy copy. Those are enumerated
by 11-08 as deferred go-live actions, never executed.

---

## Plan Table

| Plan ID | Objective | Wave | Depends On | Requirements |
|---------|-----------|------|------------|--------------|
| `11-01` | Cut the Prisma datasource over to Neon Postgres (D-02): `provider = "postgresql"` + `directUrl`, delete the three SQLite-dialect migrations and regenerate one clean init migration (D-08), confirm `lib/db.ts` needs no code change under the pooled-connection-string approach (D-01), and land the complete `.env.example` env contract for all six new variables (D-09). | 1 | — | LIVE-05 |
| `11-02` | Gate the `demo` credentials provider behind `ALLOW_DEMO_LOGIN` using strict `=== "true"` equality (D-03), extract a Prisma-free `buildProviderFlags` helper so the gate is unit-testable, and deliver the UI-SPEC Contract 8 sign-in layout that reads as intentional with both providers (UAT) and with Google alone (go-live). | 1 | — | LIVE-01 |
| `11-03` | Restructure `app/account/page.tsx` from a client component into an async Server Component that lists the signed-in customer's orders scoped by `session.user.id` (D-07), with a client island for sign-in/sign-out and an `OrderList` mirroring `components/admin/OrderTable.tsx` plus the UI-SPEC responsive card fallback. | 1 | — | LIVE-04 |
| `11-04` | Install `resend` + `react-email` behind a blocking package-legitimacy checkpoint, build `emails/OrderConfirmation.tsx` to the UI-SPEC email constraints, and expose the single shared `sendOrderConfirmation(orderId)` (D-05, D-06) using the project's null-if-no-key idiom so an unset `RESEND_API_KEY` is a safe no-op. | 1 | — | LIVE-03 |
| `11-05` | Add `/api/stripe/webhook` as the single source of truth for payment status (D-04) — raw-body signature verification, `pending`→`paid` transition, order-status idempotency guard — then wire `sendOrderConfirmation` into BOTH the webhook and the stub checkout branch (D-06) and remove the hardcoded `localhost:3002` origin fallback (D-09). | 2 | `11-04` | LIVE-02, LIVE-03 |
| `11-06` | Add the `/account/orders/[id]` detail route showing line items with images, tracking number, and status (D-07), scoped by BOTH `id` AND `userId` via `findFirst` so a guessed id returns not-found, plus a human-verify checkpoint covering the whole order-history surface. | 2 | `11-03` | LIVE-04 |
| `11-07` | Produce the deployment surface and drive the owner-performed Vercel cutover: a `vercel-build` script running `prisma migrate deploy` before `next build`, the per-environment Vercel env var contract, Google redirect URI and Stripe TEST-mode webhook endpoint registration, and confirmation the app is publicly reachable on its `*.vercel.app` URL (D-01, D-09, D-10, D-11). | 3 | `11-01`, `11-02`, `11-04`, `11-05`, `11-06` | LIVE-01, LIVE-02, LIVE-05, LIVE-06 |
| `11-08` | Author `docs/PRE-LAUNCH-CHECKLIST.md` enumerating every placeholder and every deferred go-live action (D-12) — live-key swap, `ALLOW_DEMO_LOGIN=false`, consent-screen publish, custom domain, `/shipping` + `/returns` copy, the order-success email promise — and record the D-06a Resend delivery constraint as a stated UAT limitation rather than a bug to be discovered. | 4 | `11-07` | LIVE-02, LIVE-03, LIVE-06 |

---

## Wave Structure

| Wave | Plans | Rationale |
|------|-------|-----------|
| 1 | `11-01`, `11-02`, `11-03`, `11-04` | Four file-disjoint foundations. Verified: zero `files_modified` overlap across the four (see File Ownership below). |
| 2 | `11-05`, `11-06` | `11-05` needs `sendOrderConfirmation` to exist (`11-04`); `11-06` reuses the order-summary helpers and component idiom from `11-03`. |
| 3 | `11-07` | Deployment can only be verified once every code surface exists. |
| 4 | `11-08` | The checklist enumerates the real deployed URL and any residual placeholders, so it is authored after the cutover. |

## File Ownership (parallel-safety check)

**Wave 1 — no file appears twice:**

| Plan | Files |
|------|-------|
| `11-01` | `prisma/schema.prisma`, `prisma/migrations/**` (delete + regenerate), `.env.example`, `lib/db.ts` |
| `11-02` | `lib/auth.ts`, `lib/auth-providers.ts` (new), `components/SignInForm.tsx`, `app/signin/page.tsx`, `tests/auth.test.ts` (new) |
| `11-03` | `lib/orders.ts` (additive only), `app/account/page.tsx`, `components/account/OrderList.tsx` (new), `components/account/AccountSignedOut.tsx` (new), `tests/orders.test.ts` (extend) |
| `11-04` | `package.json`, `package-lock.json`, `lib/email.ts` (new), `emails/OrderConfirmation.tsx` (new), `tests/email.test.ts` (new) |

**Wave 2 — no file appears twice:**

| Plan | Files |
|------|-------|
| `11-05` | `app/api/stripe/webhook/route.ts` (new), `app/api/checkout/route.ts`, `tests/stripe-webhook.test.ts` (new) |
| `11-06` | `app/account/orders/[id]/page.tsx` (new), `components/account/OrderDetail.tsx` (new) |

**Cross-wave note:** `package.json` is written by `11-04` (wave 1, dependency install) and again by
`11-07` (wave 3, `vercel-build` script). Different waves, so no conflict. `.env.example` is owned
by `11-01` alone — every new variable from every plan lands there in one pass, deliberately, to
avoid four plans racing on the same file.

---

## Per-Plan Notes for the Plan Writer

### `11-01` — Postgres cutover + env contract

- **autonomous:** `false`. The `[BLOCKING]` schema task cannot run without owner-supplied Neon
  connection strings.
- **Task shape (3):** (1) `schema.prisma` datasource → `postgresql` with `url`/`directUrl`, plus
  full deletion of `prisma/migrations/` including `migration_lock.toml`; (2) `.env.example` gains
  all six new keys with empty placeholders (`DIRECT_URL`, `ALLOW_DEMO_LOGIN`,
  `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`) and `lib/db.ts` is
  inspected and confirmed unchanged; (3) `[BLOCKING]` `npx prisma migrate dev --name init` against
  the owner's empty Neon database, then `npm run seed`.
- **Do NOT plan `prisma db push`.** D-08 and RESEARCH Pitfall 3 require migrations. The `db:push`
  script already in `package.json` is not the cutover mechanism.
- **`lib/db.ts` resolution:** CONTEXT D-01 anticipated a code change; RESEARCH resolved it — the
  pooled-connection-string approach means only the datasource block changes. The task must state
  this explicitly ("verified no code change required, per RESEARCH Standard Stack") rather than
  silently skipping the file, so the D-01 expectation is visibly closed.
- **Explicitly rejected:** `@prisma/adapter-neon` (registry `7.9.1` vs this project's pinned
  `5.22.0`, and `driverAdapters` is preview at 5.22 — RESEARCH Pitfall 3).
- **Threats:** `T-11-01` Information Disclosure / medium / connection strings committed — mitigate:
  `.env.example` carries empty placeholders only, `.env` stays gitignored, no real value in any
  plan or commit. `T-11-02` Denial of Service / **high** / runtime `DATABASE_URL` pointed at the
  unpooled connection exhausts Neon under concurrent serverless invocations — mitigate: pooled
  string (hostname contains `-pooler`) for `url`, direct string for `directUrl` only, documented
  inline in both `schema.prisma` and `.env.example` (RESEARCH Pitfall 2).
- **Verify:** `npx prisma validate`, `npx prisma migrate status`, `npm test`.

### `11-02` — Demo-login gate + sign-in layout

- **autonomous:** `true`.
- **Wave 0 test gap:** `tests/auth.test.ts` does not exist. Create it in this plan before the gate
  logic is considered done.
- **Extraction:** put the flag logic in a Prisma-free module (`lib/auth-providers.ts`) exporting
  something like `buildProviderFlags({ hasGoogle, allowDemoLogin })`, mirroring the
  "Prisma-import-free pure domain module" idiom from `lib/orders.ts`/`lib/catalog.ts`. Importing
  `lib/auth.ts` directly into a test drags in `PrismaAdapter` and real provider constructors.
- **Current-state fact the plan must handle:** `components/SignInForm.tsx` renders the demo block
  under `!googleEnabled`, so today enabling Google hides demo login entirely. UAT needs BOTH
  visible. `app/signin/page.tsx` is already a Server Component passing `googleEnabled` as a prop —
  add a second `demoEnabled` prop read from the server. Do not introduce a `NEXT_PUBLIC_` variable
  for this.
- **UI-SPEC Contract 8** governs both layouts: two-provider gets a centered "or" divider and
  "Demo login (for testers)" labelling (not "Dev mode"); one-provider gets the Google button alone
  with no reserved empty space and no leftover dev copy. Same Google button markup in both.
- **Threats:** `T-11-03` Elevation of Privilege / **critical** / `Boolean(process.env.ALLOW_DEMO_LOGIN)`
  treats the literal string `"false"` as truthy, leaving an open door where anyone signs in as
  `OWNER_EMAIL` and reaches `/admin` on a public URL — mitigate: strict `=== "true"`, with a unit
  test asserting the provider is excluded for `undefined`, `""`, `"false"`, and `"TRUE"`
  (RESEARCH Pitfall 5; this is the highest-severity item in the phase).
- **Verify:** `npx vitest run tests/auth.test.ts`.

### `11-03` — Order history list on `/account`

- **autonomous:** `true`.
- **Task shape (3):** (1) additive pure helpers in `lib/orders.ts` (order-summary row mapping,
  reusing `parseOrderItems`) with `tests/orders.test.ts` extended for the userId-scoping assertion;
  (2) `components/account/OrderList.tsx` + `components/account/AccountSignedOut.tsx`;
  (3) restructure `app/account/page.tsx` into an async Server Component wiring the two together.
- **Analog:** `app/admin/orders/page.tsx` (Server Component + `prisma.order.findMany` + row mapping)
  and `components/admin/OrderTable.tsx`. The only structural difference is the `userId` filter.
- **UI-SPEC:** Contract 1 (zero-orders empty state), Contract 2 (four `ORDER_STATUSES` as
  colour + text pairs, never colour alone — WCAG 1.4.1), Contract 3 (order reference display),
  Contract 5 (`<640px` degrades to a card list with no horizontal page scroll — no codebase
  precedent, build from the spec's literal markup).
- **D-08a holds:** `Order.status` stays a `String`; `ORDER_STATUSES`/`isValidOrderStatus` in
  `lib/orders.ts` remain the status authority. Do not add a Postgres enum or CHECK constraint.
- **Threats:** `T-11-04` Information Disclosure / **high** / scoping order history by
  `session.user.email` instead of `session.user.id` lets the demo provider's arbitrary-email login
  read a real Google customer's history on email collision — mitigate: scope by `userId`, asserted
  by unit test (RESEARCH Anti-Patterns).
- **Verify:** `npx vitest run tests/orders.test.ts`.

### `11-04` — Resend + React Email + `sendOrderConfirmation`

- **autonomous:** `false`. Package Legitimacy Gate.
- **Task order is load-bearing:** a `checkpoint:human-verify` with `gate="blocking-human"` must sit
  BEFORE `npm install`. RESEARCH's Package Legitimacy Audit marks both `resend` (`6.22.0`) and
  `react-email` (`6.9.2`) as `SUS` on a `too-new` recency signal. The audit's own analysis supports
  legitimacy (~9.99M and ~3.73M weekly downloads, official `github.com/resend` repos,
  `postinstall: null`), but the checkpoint is required regardless and is never auto-approvable.
  Verification URLs: `npmjs.com/package/resend`, `npmjs.com/package/react-email`.
- **Do NOT install `@react-email/components`** — registry-flagged deprecated ("Package no longer
  supported"). All components ship from the unified `react-email` package as of v6.
- **`lib/email.ts`:** exact `lib/stripe.ts` null-if-no-key idiom. `RESEND_API_KEY` unset →
  `console.warn` + return, never throw. A missing key must never break checkout.
- **`emails/OrderConfirmation.tsx`:** no codebase analog — UI-SPEC Contract 6 is the authority
  (table-based layout, inline styles, hex colours not Tailwind tokens, `sepia-deep` not `sepia`,
  plain-text alternative, `Preview` preheader). Locked Nostalgia palette + Fraunces.
- **Wave 0 test gap:** `tests/email.test.ts` — mock the `Resend` client; cover the no-key no-op
  branch and the `to`/`from`/`react` call shape when configured. No network calls.
- **D-06a must be stated in this plan's verification notes:** with no verified sending domain,
  Resend delivers only to the owner's own Resend account address. Testers exercise the send path
  but will not receive mail. Known, accepted, documented — not a bug (RESEARCH Pitfall 7).
- **Threats:** `T-11-SC` Tampering / **high** / supply-chain on two `SUS`-flagged installs —
  mitigate: blocking human checkpoint before install, lockfile committed. `T-11-05` Information
  Disclosure / medium / confirmation email sent to an attacker-influenced address — mitigate: `to`
  is read from the persisted `Order.email` written by the server-side checkout route, never from
  webhook payload or client input.
- **Verify:** `npx vitest run tests/email.test.ts`.

### `11-05` — Stripe webhook + shared email wiring

- **autonomous:** `true`. Unit-testable end to end via mocks; the real-payment leg is owner UAT
  under `11-07`.
- **Task shape (3):** (1) `app/api/stripe/webhook/route.ts` with `export const runtime = "nodejs"`;
  (2) `tests/stripe-webhook.test.ts` covering signature-failure 400 and the idempotent no-op;
  (3) two localized edits to `app/api/checkout/route.ts` — `sendOrderConfirmation(order.id)` in the
  stub branch, and removal of the hardcoded origin fallback.
- **RESEARCH Pattern 2 is the implementation authority.** The single most failure-prone detail:
  read the raw body with `await req.text()` and pass that string to
  `stripe.webhooks.constructEvent`. Parsing the request as JSON first consumes the stream and
  re-serializes it, so the HMAC no longer matches and verification fails irrecoverably
  (RESEARCH Pitfall 1).
- **Idempotency:** guard on the order's own `status !== "paid"` before writing and before sending.
  D-06's single shared function means a duplicate delivery would otherwise send a second email.
  No `ProcessedWebhookEvent` ledger table — one event type, one one-way transition (RESEARCH
  Alternatives Considered).
- **Event scope:** `checkout.session.completed` only. RESEARCH Open Question 2 recommends deferring
  `checkout.session.expired` / `payment_intent.payment_failed`; abandoned `pending` orders stay
  visible and correctable in the existing admin fulfillment UI.
- **`metadata.orderId` is the join key** and already exists in the checkout session creation
  (~line 155). The plan must not disturb it; the webhook depends on it.
- **D-09 origin fix:** `app/api/checkout/route.ts:108` currently reads
  `process.env.NEXTAUTH_URL ?? "http://localhost:3002"`. Remove the hardcoded fallback so a
  deployed environment with `NEXTAUTH_URL` unset fails loudly instead of silently redirecting a
  paying customer to `localhost`. Note the stale port: the project's documented default is `3000`
  (RESEARCH Pitfall 4).
- **Always return 2xx once the signature verifies**, per Stripe's guidance — downstream errors must
  not trigger a retry storm.
- **Threats:** `T-11-06` Spoofing / **critical** / forged `checkout.session.completed` marks an
  order paid without payment — mitigate: `constructEvent` on the raw body before any DB write,
  400 on failure, nothing in the payload trusted before verification. `T-11-07` Tampering /
  medium / replay of a captured delivery — mitigate: SDK's default 5-minute timestamp tolerance
  (do not override it) plus the status-transition guard. `T-11-08` Tampering / medium / open
  redirect via a client-derived origin — mitigate: redirect targets come from `NEXTAUTH_URL` only,
  never the `Origin` header (the existing route already holds this line; keep it).
- **Verify:** `npx vitest run tests/stripe-webhook.test.ts`, then `npm test`.

### `11-06` — `/account/orders/[id]` detail route

- **autonomous:** `false`. Carries the `checkpoint:human-verify` for the order-history surface.
- **Analog:** `app/admin/orders/[id]/page.tsx` — structurally exact. The one and only structural
  difference is the scoping, and it is the security-relevant one:
  `findFirst({ where: { id: params.id, userId: session.user.id } })`, then `notFound()`.
  `findUnique` by id alone is the bug this plan exists to avoid.
- **Do not reach for `requireOwner()`.** That gate is owner-tier by design (`lib/admin.ts`);
  customer order history needs session-tier `userId` scoping. Conflating them is called out in
  RESEARCH's Don't Hand-Roll table.
- **Reuses** `parseOrderItems` and `formatPrice`, exactly as the admin detail page does.
- **UI-SPEC Contract 4** governs the not-found / not-yours presentation — never reveal that an
  order exists but belongs to someone else.
- **Checkpoint scope:** sign in, view the order list, open a detail page, confirm line items,
  images, tracking number and status render; confirm the `<640px` card fallback; confirm a
  fabricated order id renders not-found. The two-account IDOR walkthrough is listed as manual-only
  in `11-VALIDATION.md` (no integration-test DB harness this phase).
- **Threats:** `T-11-09` Information Disclosure / **high** / IDOR — customer A enumerates
  customer B's order id — mitigate: compound `id` + `userId` `findFirst` with `notFound()` on no
  match.
- **Verify:** `npm test` plus the human checkpoint.

### `11-07` — Deployment + owner-driven Vercel cutover

- **autonomous:** `false`. Every external action here is the owner's, per CONTEXT `<specifics>`.
  `11-OWNER-SETUP.md` already contains the step-by-step instructions; this plan drives and verifies
  them, it does not rewrite them.
- **RESEARCH Open Question 1 — decide explicitly, do not leave implicit.** Recommended resolution:
  add `"vercel-build": "prisma migrate deploy && next build"` to `package.json`. Vercel prefers a
  `vercel-build` script over `build`, so migrations apply automatically on deploy while local
  `npm run build` stays untouched. `migrate deploy` is the non-interactive command; `migrate dev`
  must never appear in a deployed build (RESEARCH Pitfall 6). The existing
  `postinstall: prisma generate` stays — it regenerates the client, not the schema.
- **Env var contract** the owner enters in Vercel (values never appear in any plan or commit):
  `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY` (**TEST**),
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (**TEST**), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
  `EMAIL_FROM`, `OWNER_EMAIL`, `ALLOW_DEMO_LOGIN=true`.
- **`ALLOW_DEMO_LOGIN` stays `true`** on this deployment (D-03, D-11). Flipping it is a checklist
  item in `11-08`, not an action here.
- **Ordering trap** (already documented in `11-OWNER-SETUP.md` Steps 6→7→8): the Vercel URL does
  not exist until the first deploy, so the Google redirect URI and the Stripe webhook endpoint can
  only be registered afterwards. The first deploy failing on a missing `NEXTAUTH_URL` is an
  expected, accepted hiccup — plan for the two-pass sequence rather than treating pass one's
  failure as a defect.
- **UAT verification covered here** (manual per `11-VALIDATION.md`): Google sign-in round-trip
  (LIVE-01), Stripe TEST card `4242 4242 4242 4242` producing a `paid` order via the webhook
  (LIVE-02), `prisma migrate deploy` applying cleanly (LIVE-05), and a 200 on the public
  `*.vercel.app` URL (LIVE-06).
- **Threats:** `T-11-10` Information Disclosure / **high** / Vercel Preview deployments inheriting
  production secrets, or `ALLOW_DEMO_LOGIN=true` reaching an environment the owner believes is
  locked — mitigate: scope env vars per Vercel environment explicitly and record which environment
  each value belongs to; never paste a real value into a repo file.
- **Verify:** owner-confirmed public URL returns 200; Stripe dashboard shows a delivered
  `checkout.session.completed`; the order's status is `paid`.

### `11-08` — Pre-launch checklist (D-12)

- **autonomous:** `false`. Ends in a `checkpoint:human-verify` where the owner confirms nothing is
  missing — this document is the go-live contract.
- **Location (Claude's discretion per D-12):** `docs/PRE-LAUNCH-CHECKLIST.md`. Chosen over a
  `.planning/` path because it is an operational artifact the owner uses at go-live, and it should
  survive milestone archiving.
- **Must enumerate, at minimum:**
  1. Swap Stripe TEST → LIVE keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) and
     re-register the webhook endpoint in live mode for a fresh `STRIPE_WEBHOOK_SECRET`.
  2. Set `ALLOW_DEMO_LOGIN=false` and verify demo sign-in is unreachable on the public URL — with
     the explicit note that nothing surfaces this failure automatically (RESEARCH Pitfall 5).
  3. Publish the Google OAuth consent screen from "Testing" to "Production".
  4. Purchase and attach a custom domain; update `NEXTAUTH_URL`, the Google redirect URI, and the
     Stripe success/cancel origins.
  5. Verify a sending domain in Resend and change `EMAIL_FROM` off `onboarding@resend.dev` —
     this is what lifts the D-06a delivery constraint.
  6. Replace `/shipping` placeholder copy (`app/shipping/page.tsx`) — owner-supplied business
     commitment, carried forward from Phase 10 D-12.
  7. Replace `/returns` placeholder copy (`app/returns/page.tsx`) — same.
  8. Reconcile the "We'll send a confirmation shortly" promise on `app/order/success/page.tsx`
     against real Resend delivery.
  9. Confirm no deployed environment is missing `NEXTAUTH_URL` — the removed `localhost` fallback
     now fails loudly, which is intended, but only an end-to-end click-through catches it.
  10. Real product photography and real catalog data (already Out of Scope for M2, listed so the
      owner sees the full picture).
  11. Re-measure Lighthouse performance on real hosting — carried forward from `10-12-SUMMARY.md`,
      newly actionable now that real hosting exists, not a Phase 11 requirement.
- **D-06a UAT note** must be recorded plainly here (and in the phase's verification notes) so
  "the tester didn't get the email" is never debugged as a phantom bug.
- **Write nothing the owner must supply.** Shipping terms, return windows, and refund policy are
  business commitments. The checklist names the file, the placeholder, and what decision is
  needed — it does not invent copy. This is the entire point of D-12.
- **`app/order/success/page.tsx` is flagged, not edited.** UI-SPEC Contract 7's optional
  "confirming payment…" state is explicitly optional under D-04's webhook-only choice, and omitting
  it is stated as no contract violation. Not planned.
- **Threats:** `T-11-11` Elevation of Privilege / **high** / the checklist omits the
  `ALLOW_DEMO_LOGIN=false` flip and the open demo door ships to production — mitigate: item 2 above
  is mandatory, carries an explicit verification step, and the owner checkpoint confirms it.
- **Verify:** file exists; every scope-fence item from `11-CONTEXT.md` appears; owner checkpoint.

---

## Multi-Source Coverage Audit

### GOAL — ROADMAP Phase 11

| Goal element | Covered by | Status |
|--------------|------------|--------|
| Real Google OAuth sign-in | `11-02`, `11-07` | COVERED |
| Real Stripe payment | `11-05`, `11-07` | COVERED **on TEST keys only** — live-key cutover deliberately deferred to `11-08`'s checklist per D-11, which supersedes ROADMAP's "live keys" wording |
| Order confirmation email | `11-04`, `11-05` | COVERED |
| Order history on the account page | `11-03`, `11-06` | COVERED |
| Hosted Node platform + hosted Postgres, publicly reachable | `11-01`, `11-07` | COVERED |

### REQ — REQUIREMENTS.md

| Req | Plans | Status |
|-----|-------|--------|
| LIVE-01 | `11-02`, `11-07` | COVERED |
| LIVE-02 | `11-05`, `11-07`, `11-08` | COVERED |
| LIVE-03 | `11-04`, `11-05`, `11-08` | COVERED |
| LIVE-04 | `11-03`, `11-06` | COVERED |
| LIVE-05 | `11-01`, `11-07` | COVERED |
| LIVE-06 | `11-07`, `11-08` | COVERED |

Every phase requirement ID appears in at least one plan's `requirements` field.

### RESEARCH — 11-RESEARCH.md

| Item | Plan | Status |
|------|------|--------|
| Pattern 1 — env-conditional demo provider | `11-02` | COVERED |
| Pattern 2 — raw-body webhook signature verification | `11-05` | COVERED |
| Pattern 3 — shared `sendOrderConfirmation()` | `11-04`, `11-05` | COVERED |
| Pattern 4 — IDOR-scoped Server Component order history | `11-03`, `11-06` | COVERED |
| Pooled connection string, not `@prisma/adapter-neon` | `11-01` | COVERED |
| `resend` + `react-email`, never `@react-email/components` | `11-04` | COVERED |
| Package Legitimacy Gate (2 × `SUS`) | `11-04` | COVERED |
| Pitfall 1 — JSON-before-verify | `11-05` | COVERED |
| Pitfall 2 — unpooled runtime URL | `11-01` | COVERED |
| Pitfall 3 — driver-adapter version mismatch | `11-01` | COVERED |
| Pitfall 4 — hardcoded `localhost:3002` | `11-05` | COVERED |
| Pitfall 5 — `ALLOW_DEMO_LOGIN` truthiness | `11-02` | COVERED |
| Pitfall 6 — `migrate dev` in a deployed build | `11-07` | COVERED |
| Pitfall 7 — phantom email-delivery bug | `11-04`, `11-08` | COVERED |
| Open Question 1 — auto vs manual `migrate deploy` | `11-07` | RESOLVED (`vercel-build` script) |
| Open Question 2 — additional webhook events | `11-05` | RESOLVED (deferred; `checkout.session.completed` only) |
| Wave 0 gap — `tests/auth.test.ts` | `11-02` | COVERED |
| Wave 0 gap — `tests/stripe-webhook.test.ts` | `11-05` | COVERED |
| Wave 0 gap — `tests/email.test.ts` | `11-04` | COVERED |
| Wave 0 gap — extend `tests/orders.test.ts` | `11-03` | COVERED |
| Wave 0 gap — no local Postgres for a migrate dry run | `11-01`, `11-07` | RESOLVED — accept first-deploy-time verification, per D-11's UAT-ready (not production-money) gating |
| Runtime State Inventory — delete + regenerate migrations | `11-01` | COVERED |
| Runtime State Inventory — reseed after cutover | `11-01` | COVERED |

### CONTEXT — locked decisions

| Decision | Plans | Status |
|----------|-------|--------|
| D-01 Vercel host, serverless-aware Prisma | `11-01`, `11-07` | COVERED |
| D-02 Neon, pooled runtime + `directUrl` migrations | `11-01` | COVERED |
| D-03 `ALLOW_DEMO_LOGIN` gate on the demo provider | `11-02` | COVERED |
| D-04 / D-04a webhook is the single source of payment truth | `11-05` | COVERED |
| D-05 Resend + React Email templates | `11-04` | COVERED |
| D-06 one shared `sendOrderConfirmation`, called from both branches | `11-04`, `11-05` | COVERED |
| D-06a Resend delivery limited to the owner's address during UAT | `11-04`, `11-08` | COVERED |
| D-07 `/account` order list + `/account/orders/[id]` detail | `11-03`, `11-06` | COVERED |
| D-08 fresh Postgres baseline + reseed | `11-01` | COVERED |
| D-08a `Order.status` stays a `String` | `11-01`, `11-03` | COVERED (by explicit non-action) |
| D-09 every URL and sender address env-driven, no hardcoding | `11-01`, `11-05`, `11-07` | COVERED |
| D-10 Google Cloud project now, in Testing mode | `11-07` | COVERED |
| D-11 phase ends at deployed + UAT-ready on TEST keys | `11-07`, `11-08` | COVERED |
| D-12 placeholders flagged, not written | `11-08` | COVERED |

### Scope-fence items — verified ABSENT from all plans

- Stripe live keys / real charges — flagged in `11-08` only.
- Publishing the Google consent screen — flagged in `11-08` only.
- `ALLOW_DEMO_LOGIN=false` — flagged in `11-08` only; stays `true` in `11-07`.
- Custom domain purchase — flagged in `11-08` only.
- Real shipping/returns policy copy — flagged in `11-08` only.
- Real product photography / catalog data — flagged in `11-08` only.

**No unplanned items. No scope reduction. No phase split required.**

---

## Threat Register Summary (ASVS L1, block on `high`)

| Threat ID | Category | Component | Severity | Plan | Disposition |
|-----------|----------|-----------|----------|------|-------------|
| `T-11-01` | Information Disclosure | `.env.example`, `schema.prisma` | medium | `11-01` | mitigate |
| `T-11-02` | Denial of Service | Prisma runtime connection | high | `11-01` | mitigate |
| `T-11-03` | Elevation of Privilege | `lib/auth.ts` demo provider | critical | `11-02` | mitigate |
| `T-11-04` | Information Disclosure | `/account` order query | high | `11-03` | mitigate |
| `T-11-SC` | Tampering | `npm install resend react-email` | high | `11-04` | mitigate |
| `T-11-05` | Information Disclosure | `sendOrderConfirmation` recipient | medium | `11-04` | mitigate |
| `T-11-06` | Spoofing | `/api/stripe/webhook` | critical | `11-05` | mitigate |
| `T-11-07` | Tampering | webhook replay / duplicate delivery | medium | `11-05` | mitigate |
| `T-11-08` | Tampering | checkout redirect origin | medium | `11-05` | mitigate |
| `T-11-09` | Information Disclosure | `/account/orders/[id]` IDOR | high | `11-06` | mitigate |
| `T-11-10` | Information Disclosure | Vercel env var scoping | high | `11-07` | mitigate |
| `T-11-11` | Elevation of Privilege | go-live checklist completeness | high | `11-08` | mitigate |

Every threat has a severity and a disposition. No `accept` dispositions at `high` or above.

---

## Artifacts This Phase Produces

**New source files:** `app/api/stripe/webhook/route.ts`, `app/account/orders/[id]/page.tsx`,
`components/account/OrderList.tsx`, `components/account/OrderDetail.tsx`,
`components/account/AccountSignedOut.tsx`, `lib/email.ts`, `lib/auth-providers.ts`,
`emails/OrderConfirmation.tsx`, `docs/PRE-LAUNCH-CHECKLIST.md`.

**New tests:** `tests/auth.test.ts`, `tests/stripe-webhook.test.ts`, `tests/email.test.ts`.

**New exported symbols:** `sendOrderConfirmation(orderId)`, `buildProviderFlags(...)`,
`demoLoginEnabled`, `OrderConfirmationEmail`, plus additive order-summary helpers in
`lib/orders.ts`.

**New environment variables:** `DIRECT_URL`, `ALLOW_DEMO_LOGIN`, `STRIPE_WEBHOOK_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`. `DATABASE_URL` keeps its key name and changes value
shape from `file:./dev.db` to a pooled Postgres connection string.

**Removed:** `prisma/migrations/0_init/`, `prisma/migrations/20260726172011_add_reviews/`,
`prisma/migrations/20260727122723_add_review_hidden/`, the SQLite `migration_lock.toml`, and the
hardcoded `http://localhost:3002` fallback in `app/api/checkout/route.ts`.

---

*Phase: 11-go-live · Outline created 2026-08-24 · 8 plans across 4 waves*
