---
plan: 10-09
phase: 10-trust-polish
title: Analytics foundation + consent gate
status: complete
completed: 2026-07-27
requirements: [ANLY-01]
---

# Plan 10-09 — Summary

**Objective:** Build the analytics foundation and its consent gate (D-08/D-10, UI-SPEC §4):
a provider-agnostic `trackEvent()` that emits only after consent, a consent banner, and a
gated analytics mount. No event call sites wired (10-10's scope).

## What was built

| Task | Result | Verify |
|------|--------|--------|
| 1. packages + `lib/analytics.ts` | Installed `@vercel/analytics@^2.0.1` + `@vercel/speed-insights@^2.0.0` as runtime deps. Prisma-free consent state machine (`getConsent`/`setConsent`/`hasConsent`, `subscribeConsent` custom-event channel) + double-gated, error-swallowing `trackEvent(EventName, payload)` + `EventName` union of the five D-09 funnel events. | `tests/analytics.test.ts` 7/7 green |
| 2. `components/ConsentBanner.tsx` | Non-modal, non-CLS `z-40 fixed inset-x-0 bottom-0` bar; renders nothing on server/first paint, reveals post-mount only when `getConsent()` is null; exact UI-SPEC §4 copy; Accept (inverted primary) / "No thanks" (plain text) persist + dismiss permanently; reduced-motion. No aria-modal/focus-trap/backdrop. | `tests/a11y.test.tsx -t ConsentBanner` green |
| 3. `components/Providers.tsx` | `AnalyticsGate` mounts `<Analytics/>`+`<SpeedInsights/>` only after consent, re-rendering live via `subscribeConsent` (no reload); `<ConsentBanner/>` mounted site-wide inside the existing SessionProvider/CartProvider/WishlistProvider nesting. | `tsc` clean; suites green |

## Verification

- `tests/analytics.test.ts` 7/7 · `tests/a11y.test.tsx -t ConsentBanner` green.
- `npx tsc --noEmit` — no error in any 10-09 file.
- **In-browser (dev :3002), all three consent states:**
  - null → banner visible (`position:fixed`, `z-40`, `bottom:0`, exact copy, Accept/No thanks).
  - Accept → consent persisted `"accepted"`, banner dismissed, **both Vercel scripts mount** (`va.vercel-scripts.com` analytics + speed-insights); on reload banner stays gone (persistence).
  - Declined → banner dismissed, **zero analytics scripts** mount.

## Notes

- **Stale `.next` after mid-session `npm install`** produced a transient "React Client Manifest" RSC error on `/`; cleared `.next` and restarted the dev server — resolved. (Operational, not a code defect.)
- The five funnel call sites are intentionally NOT wired here — that is 10-10's scope.
- Advisory (carried from 10-01): `tsc` still reports jest-axe matcher-type errors in `tests/a11y.test.tsx` (`toHaveNoViolations` augmentation) — a pre-existing scaffold gap, not introduced here.
