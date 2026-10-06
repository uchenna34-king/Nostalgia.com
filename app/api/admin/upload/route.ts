import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/admin";
import {
  BlobNotConfiguredError,
  processProductPhoto,
  storeProductPhoto,
} from "@/lib/product-images";

export const runtime = "nodejs";

// Vercel caps a function request body at 4.5 MB. The admin editor downsizes
// photos in the browser before sending, so a real upload sits well under this.
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Owner-only product photo upload: one file per request. Returns the stored
 * URL plus its blur placeholder; the product form saves both on the
 * ProductImage row when the product is saved.
 */
export async function POST(req: Request) {
  await requireOwner();

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not_an_image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  let processed: Awaited<ReturnType<typeof processProductPhoto>>;
  try {
    processed = await processProductPhoto(Buffer.from(await file.arrayBuffer()));
  } catch {
    // sharp rejects anything it can't decode, whatever the declared type.
    return NextResponse.json({ error: "not_an_image" }, { status: 400 });
  }

  try {
    const url = await storeProductPhoto(processed.webp);
    return NextResponse.json({ url, blurDataUrl: processed.blurDataUrl });
  } catch (e) {
    if (e instanceof BlobNotConfiguredError) {
      return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
    }
    throw e;
  }
}
