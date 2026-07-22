---
phase: 09-store-operations-admin
plan: 02
status: complete
completed: 2026-07-21
requirements: [ADMN-01]
---

# 09-02 Summary — Owner-email auth gate

## What was built
- **`lib/admin.ts`**: `OWNER_EMAIL` (env-driven, placeholder default `owner@nostalgia.test`, trimmed+lowercased), `isOwnerEmail()` (case/whitespace-insensitive), and `requireOwner()` — the authoritative server gate: `getServerSession(authOptions)` → anonymous `redirect("/signin?callbackUrl=/admin")`, authenticated non-owner `notFound()` (404 hides admin existence), owner returns session. Doc comment records the D-02 per-action contract.
- **`middleware.ts`**: `withAuth({ pages: { signIn: "/signin" } })` with `matcher: ["/admin/:path*"]` — first-layer anonymous redirect, documented as defense-in-depth only (NOT the authorization boundary; does not cover Server Actions).
- **`tests/admin.test.ts`**: TDD (RED→GREEN) coverage of `isOwnerEmail` (owner match, case/space-insensitive, non-owner, null/undefined/empty). 4/4 pass.

## Verification
- `npx vitest run tests/admin.test.ts` → 4/4 pass.
- `npx tsc --noEmit` → exit 0.
- Full owner/non-owner/anonymous behavior verified in-browser after 09-03 wires the /admin pages.

## Deviations
- **`.env` / `.env.example` NOT edited** — the harness blocks reads/writes of `.env*` files (permission boundary). Functionally unaffected: `requireOwner()` defaults to `owner@nostalgia.test` when `OWNER_EMAIL` is unset, so dev works with no env change. **Action for user at go-live:** add `OWNER_EMAIL=<real owner google email>` to `.env` (and `OWNER_EMAIL=owner@nostalgia.test` to `.env.example` as the committed template).

## Notes
- No `lib/auth.ts` change needed — the dev-demo credentials provider already upserts any typed email, so the owner signs in locally as `OWNER_EMAIL`.
- Contract for downstream: every admin Server Action (09-04, 09-06) calls `requireOwner()` as its first line.
