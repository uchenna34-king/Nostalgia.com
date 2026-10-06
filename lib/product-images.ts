import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Product photo pipeline: every upload is re-encoded once, here, so shoppers
 * never download a raw 8 MB phone photo.
 *
 *  - Full image: auto-rotated from EXIF, capped at 2000px on the long edge,
 *    WebP. Re-encoding also drops EXIF/GPS metadata from the owner's camera.
 *  - Blur placeholder: a ~20px WebP inlined as a data URL and stored on the
 *    ProductImage row. next/image paints it (blurred) the instant the page
 *    renders, then swaps in the real photo — no empty cream box.
 */

const MAX_EDGE = 2000;
const BLUR_WIDTH = 20;
// A 20px WebP is a few hundred bytes; anything far bigger isn't one of ours.
const MAX_BLUR_LENGTH = 4000;

export class BlobNotConfiguredError extends Error {
  constructor() {
    super("BLOB_READ_WRITE_TOKEN is not set");
  }
}

export async function makeBlurDataUrl(input: Buffer): Promise<string> {
  const tiny = await sharp(input)
    .rotate()
    .resize({ width: BLUR_WIDTH })
    .webp({ quality: 40 })
    .toBuffer();
  return `data:image/webp;base64,${tiny.toString("base64")}`;
}

export async function processProductPhoto(input: Buffer): Promise<{
  webp: Buffer;
  blurDataUrl: string;
}> {
  const webp = await sharp(input)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
  return { webp, blurDataUrl: await makeBlurDataUrl(webp) };
}

/** Only accept placeholders shaped like the ones makeBlurDataUrl produces. */
export function isValidBlurDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_BLUR_LENGTH &&
    /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}

/**
 * Store a processed photo and return its public URL. Uses Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set. Without it, local dev writes to
 * public/uploads/ (gitignored) so the admin upload flow still works offline;
 * production refuses rather than writing to a read-only, ephemeral disk.
 */
export async function storeProductPhoto(webp: Buffer): Promise<string> {
  const name = `${randomUUID()}.webp`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`products/${name}`, webp, {
      access: "public",
      contentType: "image/webp",
      // Names are random UUIDs, so a stored URL never changes content —
      // safe for browsers and the CDN to cache for a year.
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") throw new BlobNotConfiguredError();

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), webp);
  return `/uploads/${name}`;
}
