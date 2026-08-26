---
plan: 11-02
phase: 11-go-live
title: Gate demo login behind ALLOW_DEMO_LOGIN
status: complete
completed: 2026-08-24
requirements: [LIVE-01]
---

# Plan 11-02 — Summary

Gated the `demo` CredentialsProvider behind `ALLOW_DEMO_LOGIN` and fixed the sign-in page.

## Done
- `lib/auth-flags.ts` (new): import-free `buildProviderFlags(env)`; `allowDemoLogin` uses strict `=== "true"` (no coercion). Unit-testable without Prisma.
- `lib/auth.ts`: demo provider moved inside `...(allowDemoLogin ? [...] : [])`; exports `demoLoginEnabled`; `console.warn` when neither provider is configured; `authorize()` logic unchanged.
- `components/SignInForm.tsx`: Google button now calls the Google provider (was silently calling demo when Google keys absent); demo block gated on its own flag so both can show at once; owner email no longer rendered (disclosure fix); no redundant `aria-label` (WCAG 2.5.3).
- `app/signin/page.tsx`: passes `demoEnabled`; `ownerEmail` gated on `demoLoginEnabled`.
- `tests/demo-login-gate.test.tsx` (new): 9-row truth table + SignInForm state/axe/disclosure tests.

## Deviation
- Module named `lib/auth-flags.ts` (outline said `lib/auth-providers.ts`) — self-consistent, no wave conflict. (Checker warning 1.)

## Verify
- `npx tsc --noEmit` clean. `npx vitest run` 134/134. `ALLOW_DEMO_LOGIN` stays true for UAT (flip deferred to 11-08 checklist, D-11).
