---
phase: 11-go-live
type: planning-handoff
status: plans-verified
plans_total: 8
plans_written: 8
plan_checker_run: true
created: 2026-08-24
resume_command: continue phase 11 — run gsd-plan-checker, then execute wave 1
---

# Phase 11 (Go Live) — Planning Handoff

**Purpose:** resumption point after a chat wipe. Read this, then continue.

## Where planning stands

All 8 PLAN.md files are **written and committed**. Planning artifacts complete:
CONTEXT, DISCUSSION-LOG, OWNER-SETUP, RESEARCH (682 lines), VALIDATION, UI-SPEC
(verified 6/6), PATTERNS, PLAN-OUTLINE, and 11-01…11-08 PLAN.md.

**Plan-checker: PASSED** (no blockers; 2 cosmetic warnings — see below). No plan has been
executed — no application code changed in this phase yet. Planning is COMPLETE.

**Checker warnings (non-blocking, documentation-level):**
1. 11-02 uses `lib/auth-flags.ts`; the outline named it `lib/auth-providers.ts`. Internally
   self-consistent, no wave conflict. Note in 11-02-SUMMARY at execution.
2. 11-07 `T-11-07-05` marks a `high` EoP (`ALLOW_DEMO_LOGIN=true` on public URL) as
   `accept` under a "block on high" header. Substantively justified by D-11 (time-boxed,
   owner-locked, compensating control = 11-08 checklist). Reword to `transfer` or cite the
   D-11 exception at execution.

## The 8 plans

| Plan | Wave | Deps | Reqs | Autonomous | Objective |
|------|------|------|------|-----------|-----------|
| 11-01 | 1 | — | LIVE-05 | no | Prisma→Neon Postgres cutover; delete SQLite migrations, re-baseline; all 6 env vars into `.env.example` |
| 11-02 | 1 | — | LIVE-01 | yes | Gate demo provider behind `ALLOW_DEMO_LOGIN` (strict `=== "true"`); fix sign-in so Google+demo coexist |
| 11-03 | 1 | — | LIVE-04 | yes | `/account` → Server Component + order LIST scoped by `session.user.id` |
| 11-04 | 1 | — | LIVE-03 | no | Install `resend`+`react-email` (blocking legitimacy checkpoint); `sendOrderConfirmation()` |
| 11-05 | 2 | 11-04 | LIVE-02, LIVE-03 | yes | `/api/stripe/webhook` (raw-body verify, pending→paid, idempotent); wire email both call sites; drop localhost fallback |
| 11-06 | 2 | 11-03 | LIVE-04 | no | `/account/orders/[id]` detail, IDOR-scoped by id+userId, `notFound()` on miss |
| 11-07 | 3 | 01,02,04,05,06 | LIVE-01/02/05/06 | no | `vercel-build` script; owner Vercel/GitHub/Google/Stripe-webhook cutover; prove flow on live URL |
| 11-08 | 4 | 11-07 | LIVE-02/03/06 | yes | `docs/PRE-LAUNCH-CHECKLIST.md` — every deferred go-live action |

All six LIVE-01…LIVE-06 are covered. Waves verified conflict-free (no file written
twice within a wave; `.env.example` owned only by 11-01; `package.json` split across
waves 1/3).

## Locked constraints the executor MUST hold

- **D-11 scope fence:** phase ends at **deployed + UAT-ready on Stripe TEST keys**. NO
  live keys, NO consent-screen publish, `ALLOW_DEMO_LOGIN` stays `true`, NO custom
  domain, NO real policy copy. All of those are enumerated in 11-08's checklist as
  deferred owner actions — never executed.
- **D-06a:** no verified email domain → Resend `onboarding@resend.dev` delivers only to
  the owner's own Resend address. UAT verifies via the Resend dashboard log, not inboxes.
- Prices stay `.toFixed(0)` (`$285`, no cents) — deliberate; do not "fix".
- Accessibility must not regress from Phase 10's a11y-100: status never colour-only;
  no heading-level skips; `paid` pill uses `sepia-deep` on `cream-dark`.

## Key findings surfaced during planning (carry forward)

1. **Demo provider is currently an open door** — sits outside the `hasGoogle` guard, so
   any public URL lets anyone sign in as any email incl. `OWNER_EMAIL` → `/admin`. 11-02
   closes it.
2. **Prisma `undefined`-filter IDOR** — `findMany({where:{userId:undefined}})` returns
   ALL orders. 11-03 and 11-06 require a falsy-`userId` guard *before* the query.
3. **`@react-email/components` is deprecated** on npm — RESEARCH removed it; 11-04
   installs `resend` + unified `react-email` only.
4. **`NEXTAUTH_URL` does triple duty** (auth callback + Stripe redirect origin + sitemap
   base). Unset on Vercel → paying customers redirect to `localhost:3002`. 11-07 sets it
   explicitly; 11-05 removes the hardcoded fallback.
5. Owner email was printed in sign-in help copy — a disclosure on a public URL. 11-02
   removes it from rendered text.

## Working-tree note (already resolved this session)

A prior out-of-band commit (`871db48`) added a shipping fee to `Order.total` that Stripe
never charged (books ≠ payments, every sub-$200 order off by $15) plus a global
`.toFixed(2)` price change. Both reverted in `540f395`. A Google credential-shaped string
that had appeared in the tracked `.env.example` was removed and confirmed **never
committed to git history**.

## Resume — do this next

Planning is done and verified. The next action is **execution**, but it needs owner
input: several Wave 1 plans are `autonomous:false` because they require real external
accounts (Neon, Resend) whose credentials only the owner can supply — see
`11-OWNER-SETUP.md`.

- **`/gsd-execute-phase 11`** starts Wave 1. Expect it to pause at checkpoints for:
  Neon connection strings (11-01), and the `resend`/`react-email` install approval (11-04).
- Fully autonomous Wave 1 plans (no owner input): 11-02 (demo-login gate), 11-03 (order
  list). These can run without accounts.
- Owner should work through `11-OWNER-SETUP.md` (Neon → Google → Stripe → Resend → Vercel)
  in parallel; the deploy plan (11-07) needs all of them.

ROADMAP now shows Phase 11 "In Progress". Latest commits: `206a3bd` (summary),
`7b445e1` (11-08), `61d69cf` (11-07).
