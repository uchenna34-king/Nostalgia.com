---
phase: 10
slug: trust-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-24
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `10-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 (installed; jsdom env, `globals: true`, `@testing-library/react` present) |
| **Config file** | `vitest.config.ts` (existing — no changes needed) |
| **Quick run command** | `npx vitest run tests/<new-file>.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds (current 56-test suite) |

**New devDependency required (Wave 0):** `npm install -D jest-axe` — not yet installed; blocks the `tests/a11y.test.tsx` component-a11y suite.

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/<new-file>.test.ts` (fast, targeted)
- **After every plan wave:** Run `npx vitest run` (full suite) **and** `npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite green + `tsc` clean + the three manual in-browser checks confirmed
- **Max feedback latency:** ~15 seconds (targeted); ~30 seconds (full suite)

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | Wave 0 File | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| TRST-01 | Rating validation rejects out-of-range values (allow-list idiom) | unit | `npx vitest run tests/reviews.test.ts -t isValidRating` | `tests/reviews.test.ts` | ⬜ pending |
| TRST-01 | `hasPurchased` matches by slug against parsed-items array (mockable) | unit | `npx vitest run tests/reviews.test.ts -t hasPurchased` | `tests/reviews.test.ts` | ⬜ pending |
| TRST-01 | Rating merge defaults missing product ids to `{avg:0,count:0}` | unit | `npx vitest run tests/reviews.test.ts -t getRatingSummaries` | `tests/reviews.test.ts` | ⬜ pending |
| TRST-01 | One-review-per-user `@@unique` rejects duplicate insert | integration (live SQLite) | manual: submit twice in-browser, confirm edit-not-duplicate | N/A in-browser | ⬜ pending |
| TRST-01 | Review form / submit-state a11y (roles, aria-live, radiogroup) | component (jest-axe) | `npx vitest run tests/a11y.test.tsx -t ReviewForm` | `tests/a11y.test.tsx` | ⬜ pending |
| TRST-02 | `getSizeGuide(category)` returns correct chart, sane fallback | unit | `npx vitest run tests/size-guides.test.ts` | `tests/size-guides.test.ts` | ⬜ pending |
| TRST-02 | `SizeGuideModal` dialog a11y (role=dialog, focus trap, Escape, restoration) | component (jest-axe) | `npx vitest run tests/a11y.test.tsx -t SizeGuideModal` | `tests/a11y.test.tsx` | ⬜ pending |
| TRST-03 | `/shipping`, `/returns` render with correct `<title>`/metadata | manual/in-browser | curl/browser-inspect after `npm run dev` | N/A in-browser | ⬜ pending |
| SEO-01 | `buildProductJsonLd` correct schema shape + escapes `<` | unit | `npx vitest run tests/seo.test.ts` | `tests/seo.test.ts` | ⬜ pending |
| SEO-01 | `/sitemap.xml`, `/robots.txt` valid shapes + correct URLs | manual/in-browser | curl `localhost:3002/sitemap.xml` and `/robots.txt` | N/A in-browser | ⬜ pending |
| PERF-01 | New components zero structural a11y violations | component (jest-axe) | `npx vitest run tests/a11y.test.tsx` | `tests/a11y.test.tsx` | ⬜ pending |
| PERF-01 | Lighthouse perf ≥90 / a11y 100 on home, `/shop`, PDP | manual (prod build) | `npm run build && npm run start` → `npx lighthouse http://localhost:3002/<route> --only-categories=performance,accessibility --output=json --chrome-flags="--headless=new"` | N/A manual | ⬜ pending |
| ANLY-01 | `trackEvent()` no-ops without consent; calls `track()` only when accepted | unit (mock `@vercel/analytics`) | `npx vitest run tests/analytics.test.ts` | `tests/analytics.test.ts` | ⬜ pending |
| ANLY-01 | Call sites fire right event at right moment | component/manual | `npx vitest run tests/analytics.test.ts -t call-sites` (optional) or manual | `tests/analytics.test.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D jest-axe` — new devDependency (blocks the a11y suite)
- [ ] `tests/reviews.test.ts` — TRST-01 pure logic (rating validation, eligibility matching, rating-merge defaults)
- [ ] `tests/size-guides.test.ts` — TRST-02 config lookup
- [ ] `tests/seo.test.ts` — SEO-01 JSON-LD builder
- [ ] `tests/analytics.test.ts` — ANLY-01 consent-gating logic
- [ ] `tests/a11y.test.tsx` — PERF-01 component-level a11y
- [ ] `lib/reviews.ts`, `lib/size-guides.ts`, `lib/analytics.ts`, `lib/seo.ts` — none exist yet (all new; tests target these)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| One-review-per-user DB constraint actually rejects a duplicate | TRST-01 | Needs a live SQLite DB write; not isolable under jsdom | Sign in as a verified purchaser, submit a review twice for the same product; confirm the second submit edits the existing review rather than creating a duplicate |
| `/shipping` + `/returns` metadata + render | TRST-03 | Next.js Server Component pages aren't isolable under jsdom without mocking the framework | After `npm run dev -- -p 3002`, load each route; inspect `<title>` and page content |
| `/sitemap.xml` + `/robots.txt` shapes | SEO-01 | Prisma-importing special files, not easily mocked under Vitest | `curl localhost:3002/sitemap.xml` and `/robots.txt`; validate URL set and structure |
| Lighthouse perf ≥90 / a11y 100 | PERF-01 | Requires a production build; scores are environment-measured, not unit-assertable | `npm run build && npm run start`, then run `npx lighthouse` per route (home, `/shop`, PDP) with `--only-categories=performance,accessibility`; Chrome confirmed installed on this machine |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`jest-axe` install + 5 new test files)
- [ ] No watch-mode flags (all commands use `vitest run`, not `vitest`)
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter (after planner wires tasks)

**Approval:** pending
