---
phase: 11-go-live
plan: 04
subsystem: infra
tags: [resend, react-email, email, transactional-mail, prisma, nextjs]

# Dependency graph
requires:
  - phase: 11-go-live (plan 01)
    provides: ".env.example six-variable Phase 11 contract (RESEND_API_KEY, EMAIL_FROM already declared as empty placeholders)"
provides:
  - "lib/email-content.ts — pure, DB-free, network-free order-email content builder"
  - "emails/OrderConfirmation.tsx — Outlook/Gmail-safe branded email template"
  - "lib/email.ts — sendOrderConfirmation(orderId): Promise<void>, the single shared D-06 entry point"
affects: ["11-05 (webhook + checkout call-site wiring)", "pre-launch checklist / D-12"]

# Tech tracking
tech-stack:
  added: ["resend ^6.25.0", "react-email ^6.9.3"]
  patterns:
    - "null-if-no-key idiom mirrored from lib/stripe.ts (resend client + emailEnabled flag)"
    - "Prisma-import-free pure content module mirroring lib/orders.ts / lib/catalog.ts discipline"
    - "React Email table-based layout + inline styles + web-safe font fallback stacks for Outlook/Gmail safety"

key-files:
  created:
    - lib/email-content.ts
    - lib/email.ts
    - emails/OrderConfirmation.tsx
    - tests/email.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Package legitimacy gate (Task 1) approved via live npm view evidence: resend 6.25.0 and react-email 6.9.3, both official resend/* GitHub org, no postinstall scripts, millions of weekly downloads. Deprecated @react-email/components excluded from every install."
  - "Plain-text renderer sourced from react-email's own re-export of @react-email/render's render() (Options.plainText: true) — no separate @react-email/render direct dependency was needed; `react-email`'s package.json already re-exports it."
  - "sendOrderConfirmation(orderId: string): Promise<void> — arity 1, exported exactly once, recipient derived solely from the looked-up order row's email column."

requirements-completed: [LIVE-03]

coverage:
  - id: D1
    description: "Pure email-content builder (orderReference, formatCents, buildOrderConfirmationContent) with defensive corrupt-JSON handling and DB-total-is-authority math"
    requirement: "LIVE-03"
    verification:
      - kind: unit
        ref: "tests/email.test.ts#orderReference / formatCents / buildOrderConfirmationContent (12 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "sendOrderConfirmation(orderId) — safe no-op with no key, no-op on unknown order, recipient/from/subject correctness, plain-text alternative present, error swallowing, single-export/arity guarantees"
    requirement: "LIVE-03"
    verification:
      - kind: unit
        ref: "tests/email.test.ts#sendOrderConfirmation (11 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Outlook/Gmail-safe branded email template (table layout, inline styles, web-safe fonts, locked palette, 600px width, preheader, no raw-HTML injection)"
    requirement: "LIVE-03"
    verification:
      - kind: unit
        ref: "grep-based structural checks (dangerouslySetInnerHTML=0, className=0, no localhost, Georgia/BlinkMacSystemFont/8A4524 present)"
        status: pass
      - kind: integration
        ref: "npm run build (Next.js production build compiles emails/ + lib/email.ts cleanly)"
        status: pass
    human_judgment: true
    rationale: "D-06a: only the Resend account owner can receive a real send (no verified sending domain). Actual rendered-email visual QA (Outlook/Gmail rendering, palette correctness) requires the owner to trigger a send and open the received message per the Task 3 human-check — this cannot be automated or verified by a tester."

# Metrics
duration: ~30min
completed: 2026-08-31
status: complete
---

# Phase 11 Plan 04: Resend + React Email order confirmation Summary

**`sendOrderConfirmation(orderId)` — a null-if-no-key, single-export, Outlook-safe transactional email sender built on Resend + React Email, sharing one content-building pure module with its HTML/plain-text template.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-31T13:53:24+01:00
- **Tasks:** 3 (1 pre-approved checkpoint + 2 auto/TDD tasks)
- **Files modified:** 6 (2 created source, 1 created template, 1 created test, package.json + package-lock.json)

## Accomplishments

- Installed `resend` (^6.25.0) and `react-email` (^6.9.3) behind an already-satisfied package-legitimacy gate; confirmed the deprecated `@react-email/components` is nowhere in the dependency tree.
- Built `lib/email-content.ts`: a pure, Prisma-free, network-free, env-free content builder (`orderReference`, `formatCents`, `buildOrderConfirmationContent`) that degrades safely on corrupt `Order.items` JSON and never re-sums line items in place of the DB's authoritative `total`.
- Built `emails/OrderConfirmation.tsx`: a table-based, inline-styled, web-safe-font, locked-palette email template satisfying every UI-SPEC Contract 6 constraint, verified structurally via grep (no `dangerouslySetInnerHTML`, no `className`, no hardcoded origins).
- Built `lib/email.ts`: `sendOrderConfirmation(orderId): Promise<void>`, mirroring `lib/stripe.ts`'s null-if-no-key idiom, deriving the recipient solely from the looked-up order row, rendering both an HTML React element and a plain-text alternative from the same component, and swallowing/logging any Resend failure so a mail outage can never propagate into the Stripe webhook.
- 23 new unit tests (12 content-builder + 11 send-function), full suite 169/169, `tsc --noEmit` clean, `npm run build` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Package legitimacy gate** — pre-approved by the orchestrator/owner before this session began (see "Package Legitimacy Approval" below); no separate commit, recorded here as the mitigation evidence for `T-11-04-SC`.
2. **Task 2: Install deps + pure content module** — `ad425af` (feat) — `lib/email-content.ts`, `tests/email.test.ts` (RED then GREEN), `package.json`/`package-lock.json`.
3. **Task 3: Email template + sendOrderConfirmation** — `f2e91a7` (feat) — `emails/OrderConfirmation.tsx`, `lib/email.ts`, extended `tests/email.test.ts` (RED then GREEN).

**Plan metadata:** committed via this SUMMARY + STATE/ROADMAP update (sequential mode, no separate orchestrator step).

## Package Legitimacy Approval (T-11-04-SC)

Live `npm view` evidence gathered 2026-08-31, presented to and approved by the project owner ("lets begin on the installation") prior to this execution session:

| Package | Version resolved | Last publish | Repo | Postinstall | Weekly downloads |
|---|---|---|---|---|---|
| `resend` (^6.22.0) | 6.25.0 | 2026-08-28 | github.com/resend/resend-node | none | ~10.39M |
| `react-email` (^6.9.2) | 6.9.3 | 2026-08-25 | github.com/resend/react-email | none | ~3.91M |
| `@react-email/render` | 2.1.0 | — | github.com/resend/react-email (same monorepo) | none | ~11.99M |

`@react-email/components` (registry-deprecated, "Package no longer supported") was confirmed excluded from every install command in this plan and is absent from `package.json` after install (verified: `d['@react-email/components']` → `not present`).

Re-verified live at the start of this session (`npm view resend version time.modified repository.url scripts.postinstall`) — matched the pre-supplied evidence exactly (6.25.0, 2026-08-28, resend/resend-node, no postinstall).

## Plain-text renderer source

`react-email` (v6.9.3) re-exports `@react-email/render`'s `render()` directly (`export * from "@react-email/render"` in `react-email`'s `dist/index.d.mts`). Probed via `node -e "import('react-email').then(m=>console.log(Object.keys(m).filter(k=>/render/i.test(k))))"` → `['render', 'renderWhiteSpace']`. No separate `@react-email/render` direct dependency was installed — `react-email`'s own export satisfies `lib/email.ts`'s need for `render(element, { plainText: true })`.

## Exported signature for plan 11-05

```ts
// lib/email.ts
export async function sendOrderConfirmation(orderId: string): Promise<void>
```

- Arity 1 (asserted in tests) — accepts only an order id, nothing else (T-11-04-01 mitigation).
- No-ops safely (resolves, sends nothing, throws nothing) when `RESEND_API_KEY` is unset, or when `orderId` does not resolve to a row.
- Recipient (`to`) is read exclusively from the looked-up order's own `email` column.
- `from` is read from `process.env.EMAIL_FROM`.
- Wraps the Resend send in try/catch; a thrown error or a returned `{ error }` payload is logged via `console.error` (order id + error name/message only, no key, no payload) and swallowed — never throws.
- Also exports `emailEnabled: boolean` (mirrors `stripeEnabled`), not a send function, so `lib/email.ts` still exports exactly one function (asserted in tests).
- Plan 11-05 calls this identically from both the Stripe webhook and the demo/stub checkout branch (D-06). Neither call site was added by this plan — scope fence respected, `app/api/checkout/route.ts` and `.env.example` are unmodified (`git status --short` confirmed clean on both).

## D-06a — UAT constraint, stated in full

With no verified sending domain (deferred by D-09 and the phase scope fence), Resend's `onboarding@resend.dev` sender **can only deliver to the email address the Resend account itself is registered under.** Every other recipient — including every UAT tester — will see the send succeed from the app's side and receive nothing.

Consequences hard-coded into this plan's verification, per the plan's `<uat_constraint>`:

1. **Verification of a real send is done in the Resend dashboard send log** (Resend → Emails / Logs), **not** in anybody's inbox. A row appearing in that log with the right recipient and subject IS the pass condition.
2. **"The tester did not get the email" is not a bug.** It is the documented, accepted consequence of shipping on `*.vercel.app` without a domain. Do not open a defect for it, and do not spend time debugging deliverability.
3. **The owner is the only person who can eyeball the rendered email.** The Task 3 human-check therefore asks the owner — not a tester — to look at the actual received message (readable without web fonts, 600px centred, palette correct, line items and total present, order reference matches).
4. This constraint must carry into the phase's UAT notes and the pre-launch checklist (D-12), where "verify a Resend sending domain" becomes a listed go-live item, and where `/order/success`'s "We'll send a confirmation shortly" promise becomes literally true once plan 11-05 wires the call sites.

This plan's Task 3 human-check (owner-only, trigger one send + inspect the Resend dashboard log + open the received message) is **pending** — it requires plan 11-05's call-site wiring and a deployed/running app with `RESEND_API_KEY` configured, both out of this plan's scope. Recorded here as a carry-forward item, not a plan blocker (the plan's own acceptance criteria — unit tests, `tsc`, `npm run build` — are all satisfied without it).

## Files Created/Modified

- `lib/email-content.ts` — pure content builder: `OrderEmailSource`, `OrderEmailLine`, `OrderEmailContent` types; `orderReference`, `formatCents`, `buildOrderConfirmationContent`.
- `emails/OrderConfirmation.tsx` — default-exported React Email template consuming `OrderEmailContent`; table/Row/Column layout, inline styles, Georgia/BlinkMacSystemFont fallback stacks, `#8A4524` accent, 600px container, `Preview` preheader.
- `lib/email.ts` — `sendOrderConfirmation(orderId)`, `emailEnabled` flag, Resend client construction mirroring `lib/stripe.ts`.
- `tests/email.test.ts` — 23 tests across content-builder and send-function behavior, RED-then-GREEN for both Task 2 and Task 3.
- `package.json` / `package-lock.json` — `resend` and `react-email` added to `dependencies`.

## Decisions Made

- Reused `react-email`'s own re-export of `@react-email/render`'s `render()` rather than adding a separate `@react-email/render` dependency — one fewer direct dependency, same approved provenance (same monorepo).
- Called the `OrderConfirmationEmail` component as a plain function (`OrderConfirmationEmail({ content })`) from the `.ts` (non-JSX) `lib/email.ts`, rather than converting `lib/email.ts` to `.tsx` — the component has no hooks/context dependency, so a direct invocation returns an equivalent React element; keeps `lib/email.ts` a plain TypeScript module per the plan's `<files>` list.
- Status label/color mapping in `lib/email-content.ts` duplicates (rather than imports) `components/account/OrderDetail.tsx`'s `STATUS_META` table, matching that component's own stated rationale for duplication over cross-import (keeps plans decoupled) and reusing UI-SPEC's four-state hex values verbatim.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed non-constructible Resend mock in the test file's own `vi.mock("resend", ...)` factory**
- **Found during:** Task 3 (initial test run after implementing `lib/email.ts`)
- **Issue:** The `resend` module mock used an arrow function (`vi.fn().mockImplementation(() => ({...}))`) as the `Resend` class stand-in. Arrow functions are not constructible in JS, so `new Resend(key)` in `lib/email.ts` threw `TypeError: ... is not a constructor`, failing 8 of the new tests.
- **Fix:** Changed the mock to a plain (non-arrow) function (`function MockResend() { return {...}; }`), which JS permits `new` to call with an explicit-return-object override.
- **Files modified:** `tests/email.test.ts`
- **Verification:** All 23 tests in `tests/email.test.ts` pass; full suite 169/169.
- **Committed in:** `f2e91a7` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (test-file-only mock bug, Rule 1)
**Impact on plan:** No production-code impact; the fix was entirely within the test file's own mocking setup. No scope creep.

## Pre-existing Uncommitted Change (not caused by this plan)

`package.json`/`package-lock.json` carried a pre-existing, uncommitted `"pg": "^8.23.0"` dependency addition from a prior session (present before this plan began — `git diff package.json` at session start showed only this line). It is unused anywhere in the codebase (`grep -rn "from \"pg\"\|require(\"pg\")"` returns zero hits outside `node_modules`) and unrelated to LIVE-03/this plan's scope. Since `npm install resend react-email` necessarily rewrites the same `dependencies` block, this pre-existing addition could not be cleanly separated from this plan's `package.json`/`package-lock.json` diff without an unsupported interactive `git add -p` step; it is therefore bundled into this plan's Task 2 commit (`ad425af`) rather than fixed, removed, or silently dropped, per the deviation rules' scope boundary ("only auto-fix issues directly caused by the current task's changes... out-of-scope discoveries... do NOT fix them"). Flagged here for a future phase/owner decision on whether `pg` should be kept, removed, or explains a prior abandoned Neon-driver-adapter exploration.

## Issues Encountered

None beyond the auto-fixed test-mock bug above.

## User Setup Required

None new — `RESEND_API_KEY` and `EMAIL_FROM` were already declared as empty placeholders in `.env.example` by plan 11-01 (per its "Confirm RESEND_API_KEY and EMAIL_FROM land there" note, satisfied). This plan's `user_setup` block (Resend Dashboard API key creation, account email note, send-log bookmark) is documentation the owner will act on when ready to test a real send end-to-end — no code change is blocked on it, since `sendOrderConfirmation` is a safe no-op without the key.

## Next Phase Readiness

- `sendOrderConfirmation(orderId)` is ready for plan 11-05 to wire into both the Stripe webhook (`/api/stripe/webhook`, once built) and the demo/stub branch of `app/api/checkout/route.ts` — exact signature and behavior documented above, no source re-reading required.
- D-06a's UAT constraint (owner-only real-send verification via the Resend dashboard log) is documented here and must carry into the phase's UAT notes and the D-12 pre-launch checklist.
- Task 3's human-check (owner triggers a real send + inspects the received message) remains pending until plan 11-05 lands and `RESEND_API_KEY`/`EMAIL_FROM` are configured in a running environment — not a blocker for this plan's completion, since every automatable acceptance criterion (unit tests, `tsc`, `npm run build`, structural greps) passed.
- Flag the pre-existing unused `pg` dependency (see above) for a future cleanup decision — not blocking, not part of LIVE-03.

---

*Phase: 11-go-live*
*Completed: 2026-08-31*

## Self-Check: PASSED

All created files verified present on disk (`lib/email-content.ts`, `lib/email.ts`, `emails/OrderConfirmation.tsx`, `tests/email.test.ts`, this SUMMARY). Both task commits (`ad425af`, `f2e91a7`) verified present in `git log --oneline --all`.
