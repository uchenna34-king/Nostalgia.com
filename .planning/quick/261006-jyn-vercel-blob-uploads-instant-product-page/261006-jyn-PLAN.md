---
quick_id: 261006-jyn
type: quick
autonomous: true
---

# Quick 261006-jyn: Vercel Blob uploads + instant product-page images

**Goal:** Owner uploads product photos from /admin (stored in Vercel Blob), and a
shopper clicking a catalogue card sees the photo immediately instead of an empty box.

## Tasks

1. **Upload pipeline** — `ProductImage.blurDataUrl` (additive migration);
   `lib/product-images.ts` (sharp: ≤2000px WebP, EXIF stripped, 20px blur data URL;
   Blob `put`, dev fallback to `public/uploads/`); owner-gated
   `POST /api/admin/upload`; editor gets upload/drag-drop with in-browser
   downscale (Vercel 4.5 MB body cap); form blocks save while uploading;
   action validates client-sent blur strings.
2. **Instant PDP** — shared `CARD_SIZES`/`HERO_SIZES`; `ProductLink` preloads the
   hero on hover/focus/touch and hands the card photo to `product/[slug]/loading.tsx`;
   Gallery lays the cached card-size copy (with blur) under the hero; cards use blur;
   PDP's independent queries run in parallel.
3. **Backfill script** for pre-existing images (`scripts/backfill-image-blurs.ts`,
   dry run by default).

## Verify
- vitest (new: product-images, image-upload-editor), `tsc`, `next build`.
- Browser: hover triggers hero preload; skeleton + gallery reuse the cached image.
- Anonymous POST to the upload route is refused.

## Out of scope
- ISR for the PDP: blocked because the page reads the session for review eligibility,
  and the site makes every visitor sign in first.
