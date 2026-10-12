import { blobConfigured } from "@/lib/product-images";

export const runtime = "nodejs";

// Only names storeProductPhoto generates: a random UUID, always WebP.
const PHOTO_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

function notFound() {
  return new Response("Not found", { status: 404 });
}

/**
 * Product photos uploaded to a private Vercel Blob store. Private blobs need
 * credentials to read, so the shop fetches them server-side and serves them
 * itself. Names are random UUIDs and never reused, so the response is cached
 * for a year by browsers and Vercel's CDN: the store is only read once per
 * photo, not per shopper.
 */
export async function GET(
  _req: Request,
  { params }: { params: { file: string } },
) {
  if (!PHOTO_NAME.test(params.file) || !blobConfigured()) return notFound();

  try {
    const { get } = await import("@vercel/blob");
    const photo = await get(`products/${params.file}`, { access: "private" });
    if (!photo || photo.statusCode !== 200) return notFound();
    return new Response(photo.stream, {
      headers: {
        // Always WebP: every upload is re-encoded before it is stored.
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    const err = e as Error;
    console.error("product photo read failed", { name: err?.name, message: err?.message });
    return notFound();
  }
}
