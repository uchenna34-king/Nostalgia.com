"use server";

import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront-revalidate";
import {
  categoryByLabel,
  getSection,
  isProductDepartment,
} from "@/lib/taxonomy";
import { isValidBlurDataUrl } from "@/lib/product-images";
import { toSlug } from "@/lib/slug";
import { effectiveUsdMinor, toMinorUnits } from "@/lib/currency";
import { getUsdNgnRate } from "@/lib/settings";

export type ProductActionResult = { ok: true } | { ok: false; error: string };

type ParsedProduct = {
  name: string;
  slug: string;
  category: string;
  department: string;
  subcategory: string | null;
  description: string;
  materials: string | null;
  care: string | null;
  /** Kobo, typed by the owner (required). */
  priceNgn: number;
  /** Cents, a hand-set dollar price, or null to follow the store rate. */
  priceUsdOverride: number | null;
  featured: boolean;
  variants: { size: string; stock: number }[];
  images: {
    url: string;
    alt: string | null;
    blurDataUrl: string | null;
    position: number;
  }[];
  collectionIds: string[];
};

function field(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// Editors serialize their row arrays into a single JSON hidden field, so parsing
// is a defensive JSON.parse rather than fragile parallel FormData arrays.
function jsonRows(fd: FormData, key: string): unknown[] {
  const raw = fd.get(key);
  if (typeof raw !== "string") return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "P2002"
  );
}

// Refresh the admin list and every storefront route and cached read a product
// change can affect (SC#2).
function revalidateAfterWrite() {
  revalidatePath("/admin/products");
  revalidateStorefront();
}

// Explicit field-by-field extraction — never spread raw FormData into Prisma
// `data` (mass-assignment mitigation, mirroring app/api/checkout/route.ts).
// Returns the parsed product, or the error code to show the owner.
function parseProductInput(fd: FormData): ParsedProduct | string {
  const name = field(fd, "name");
  // Typed by hand, so normalise it to the URL-safe shape the storefront links
  // to (falling back to the name); a slug with spaces made its page 404.
  const slug = toSlug(field(fd, "slug") || name);
  const description = field(fd, "description");
  if (!name || !slug || !description) return "invalid_product_input";

  // Placement must be a real place in lib/taxonomy.ts — the storefront routes
  // only render what the tree knows, so a typo here would hide the product.
  const cat = categoryByLabel(field(fd, "category"));
  if (!cat) return "invalid_product_input";
  const category = cat.label; // canonical casing
  const department = field(fd, "department") || "unisex";
  if (!isProductDepartment(department)) return "invalid_product_input";
  const sectionSlug = field(fd, "subcategory");
  if (sectionSlug && !getSection(cat, sectionSlug)) return "invalid_product_input";
  const subcategory = sectionSlug || null;

  // Whole naira / dollars, no commas or decimals (D-07); toMinorUnits also
  // keeps the result inside the INTEGER column.
  const priceNgn = toMinorUnits(field(fd, "priceNgn"));
  if (priceNgn === null) return "invalid_price_ngn";
  const usdTyped = field(fd, "priceUsd");
  const priceUsdOverride = usdTyped ? toMinorUnits(usdTyped) : null;
  if (usdTyped && priceUsdOverride === null) return "invalid_price_usd";

  const materials = field(fd, "materials") || null;
  const care = field(fd, "care") || null;
  const featured = fd.get("featured") === "on" || fd.get("featured") === "true";

  const seen = new Set<string>();
  const variants: { size: string; stock: number }[] = [];
  for (const row of jsonRows(fd, "variants")) {
    if (!row || typeof row !== "object") continue;
    const size = String((row as { size?: unknown }).size ?? "").trim();
    const stockNum = Number((row as { stock?: unknown }).stock);
    if (!size || seen.has(size)) continue;
    if (!Number.isFinite(stockNum) || stockNum < 0) continue;
    seen.add(size);
    variants.push({ size, stock: Math.floor(stockNum) });
  }

  const images: ParsedProduct["images"] = [];
  for (const row of jsonRows(fd, "images")) {
    if (!row || typeof row !== "object") continue;
    const url = String((row as { url?: unknown }).url ?? "").trim();
    if (!url) continue;
    const alt = String((row as { alt?: unknown }).alt ?? "").trim() || null;
    // Client-supplied, so only keep it if it looks like one of our placeholders.
    const blur = (row as { blurDataUrl?: unknown }).blurDataUrl;
    const blurDataUrl = isValidBlurDataUrl(blur) ? blur : null;
    images.push({ url, alt, blurDataUrl, position: images.length });
  }

  const collectionIds = jsonRows(fd, "collectionIds")
    .map((x) => String(x))
    .filter(Boolean);

  return {
    name,
    slug,
    category,
    department,
    subcategory,
    description,
    materials,
    care,
    priceNgn,
    priceUsdOverride,
    featured,
    variants,
    images,
    collectionIds,
  };
}

// The three price columns (D-03). The effective dollar price is always
// computed here, from the override or the store rate: never taken from the
// browser. lib/settings.ts re-prices rate-following products when the rate changes.
function prices(input: ParsedProduct, rate: number) {
  return {
    priceNgn: input.priceNgn,
    priceUsdOverride: input.priceUsdOverride,
    priceUsd: effectiveUsdMinor(input.priceNgn, input.priceUsdOverride, rate),
  };
}

export async function createProduct(
  formData: FormData,
): Promise<ProductActionResult> {
  await requireOwner();
  const input = parseProductInput(formData);
  if (typeof input === "string") return { ok: false, error: input };
  const rate = await getUsdNgnRate();
  if (rate === null) return { ok: false, error: "rate_unavailable" };

  try {
    await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        ...prices(input, rate),
        category: input.category,
        department: input.department,
        subcategory: input.subcategory,
        description: input.description,
        materials: input.materials,
        care: input.care,
        featured: input.featured,
        // Dual-write: variants are the stock source of truth; the JSON `sizes`
        // column stays live for Phase 8 reads + checkout size validation.
        sizes: JSON.stringify(input.variants.map((v) => v.size)),
        variants: {
          create: input.variants.map((v, i) => ({
            size: v.size,
            stock: v.stock,
            position: i,
          })),
        },
        images: { create: input.images },
        collections: input.collectionIds.length
          ? { connect: input.collectionIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "slug_taken" };
    throw e;
  }

  revalidateAfterWrite();
  return { ok: true };
}

export async function updateProduct(
  id: string,
  formData: FormData,
): Promise<ProductActionResult> {
  await requireOwner();
  const input = parseProductInput(formData);
  if (typeof input === "string") return { ok: false, error: input };
  const rate = await getUsdNgnRate();
  if (rate === null) return { ok: false, error: "rate_unavailable" };

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        ...prices(input, rate),
        category: input.category,
        department: input.department,
        subcategory: input.subcategory,
        description: input.description,
        materials: input.materials,
        care: input.care,
        featured: input.featured,
        sizes: JSON.stringify(input.variants.map((v) => v.size)),
        // Replace child rows wholesale so removed sizes/images actually disappear.
        variants: {
          deleteMany: {},
          create: input.variants.map((v, i) => ({
            size: v.size,
            stock: v.stock,
            position: i,
          })),
        },
        images: { deleteMany: {}, create: input.images },
        collections: { set: input.collectionIds.map((cid) => ({ id: cid })) },
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "slug_taken" };
    throw e;
  }

  revalidateAfterWrite();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<void> {
  await requireOwner();
  // Hard delete is safe: Order.items is a JSON snapshot with NO foreign key to
  // Product, so past orders keep their record (D-07). Cascade removes the
  // product's ProductImage / ProductSizeStock child rows automatically.
  await prisma.product.delete({ where: { id } });
  revalidateAfterWrite();
}
