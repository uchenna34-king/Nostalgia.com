---
plan: 10-11
phase: 10-trust-polish
title: SEO — metadata, Product JSON-LD, sitemap, robots
status: complete
completed: 2026-07-28
requirements: [SEO-01]
---

# Plan 10-11 — Summary

**Objective:** Ship the discoverability layer (SEO-01, D-14): per-page metadata, Product
structured data, a sitemap, and a robots policy.

## What was built

| Task | Result | Verify |
|------|--------|--------|
| 1. `lib/seo.ts` | Pure/Prisma-free `buildProductJsonLd` (schema.org Product + Offer; `aggregateRating` **only** when `rating.count > 0` per D-04) and `serializeJsonLd` (escapes every `<` to `<`). | `tests/seo.test.ts` 5/5 green — the last RED logic scaffold |
| 2. Metadata + JSON-LD | `generateMetadata` (+ OG/Twitter) on the PDP, `/shop` (category-aware title), and collection detail; `metadataBase` added to `app/layout.tsx` (NEXTAUTH_URL fallback). PDP renders exactly one escaped `application/ld+json` script. | live-verified |
| 3. sitemap + robots | `app/sitemap.ts` (`MetadataRoute.Sitemap`): home, `/shop`, `/shipping`, `/returns`, every product (with `lastModified`) + collection. `app/robots.ts`: allow `/`, disallow `/admin`, `/api`, `/account`, `/checkout`, sitemap pointer. Base from `NEXTAUTH_URL`, never the request Origin. | live-verified |

## Verification

- `tests/seo.test.ts` 5/5 · `tsc` clean for all 10-11 files.
- **In-browser:** PDP tab title `"Sepia Wool Overcoat — Nostalgia"`; exactly **1** JSON-LD script parsing to `@type: "Product"` with `aggregateRating {ratingValue: "4.5", reviewCount: 2}` — matching the on-page summary exactly (D-04, one source) — and `offers` InStock at `"340.00"`; no raw `</script>` in the payload. `/sitemap.xml` → 16 URLs (home + shop + 2 policy + 10 products + 2 collections), **zero private routes**. `/robots.txt` → correct allow/disallow + `Sitemap:` line.

## Scope boundaries honored

Policy-page metadata stayed owned by 10-08 (only referenced in the sitemap); ratings stayed owned by 10-03 (consumed, never recomputed); the root title/description was left intact — only `metadataBase` was added.
