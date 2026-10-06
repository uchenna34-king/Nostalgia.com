---
quick_id: 261006-jyn
status: complete
commit: 6b12623
date: 2026-10-06
---

# Quick 261006-jyn Summary: Vercel Blob uploads + instant product-page images

## Delivered
- **Admin upload**: "Upload photos" + drag-and-drop in the product form. Browser
  downscales to 2400px WebP → `POST /api/admin/upload` (requireOwner first; image/*
  only, ≤4 MB, sharp must decode it) → sharp 2000px WebP q82 with EXIF stripped →
  Vercel Blob `products/<uuid>.webp` (public, 1-yr cache). Returns `{url, blurDataUrl}`.
  Without `BLOB_READ_WRITE_TOKEN`: dev writes `public/uploads/` (gitignored), and
  production returns 503 `storage_not_configured`.
- **Schema**: `ProductImage.blurDataUrl String?`, migration `20261006120000_product_image_blur`
  (applied to Neon with the user's OK). `Product.imageBlurs` sits alongside `images`.
- **Storefront**: blur placeholders on cards and the PDP; `ProductLink` preloads the PDP
  hero on hover/focus/touch; `product/[slug]/loading.tsx` skeleton shows the clicked card's
  photo; the Gallery underlay reuses the cached card image; PDP related/reviews/eligibility
  queries run in parallel.
- `next.config.js` remotePatterns: `*.public.blob.vercel-storage.com`.
- `scripts/backfill-image-blurs.ts` (dry run by default, `--write` to apply).

## Verification
- vitest 278/278 (new: 9 product-images + 3 upload-editor tests), tsc clean, `next build` clean.
- Browser (dev :3002): hovering a card fetched the w=1080 hero before the click. After the
  click, the skeleton and gallery reused that cached file with zero extra image requests.
- Anonymous POST /api/admin/upload → 303 to /signin; nothing stored.
- Not browser-verified: the admin upload UI (needs a Google owner sign-in; covered by
  component tests) and the real Blob put (no token locally).

## Follow-ups for the user
- Create a Vercel Blob store and connect it to the project (adds BLOB_READ_WRITE_TOKEN).
- Run `npx tsx scripts/backfill-image-blurs.ts --write` (50 rows can be filled).
- Data issue: product "orange cotton sweatshirt" points to `/products/sweatshirt4.jpg`, but the
  file is at `public/products/sweatshirts/` (uncommitted), and its slug contains spaces.
- Set the Vercel function region to `fra1` to match Neon (eu-central-1); each PDP database
  round trip currently crosses the Atlantic if the default iad1 is in use.
