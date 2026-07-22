"use server";

import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type ProductActionResult = { ok: true } | { ok: false; error: string };

type ParsedProduct = {
  name: string;
  slug: string;
  category: string;
  description: string;
  materials: string | null;
  care: string | null;
  price: number;
  featured: boolean;
  variants: { size: string; stock: number }[];
  images: { url: string; alt: string | null; position: number }[];
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

// Refresh every storefront route a product change can affect (SC#2).
function revalidateStorefront() {
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/collections/[slug]", "page");
}

// Explicit field-by-field extraction — never spread raw FormData into Prisma
// `data` (mass-assignment mitigation, mirroring app/api/checkout/route.ts).
function parseProductInput(fd: FormData): ParsedProduct | null {
  const name = field(fd, "name");
  const slug = field(fd, "slug");
  const category = field(fd, "category");
  const description = field(fd, "description");
  if (!name || !slug || !category || !description) return null;

  const priceNum = Number(field(fd, "price"));
  if (!Number.isFinite(priceNum) || priceNum < 0) return null;
  const price = Math.round(priceNum);

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
    images.push({ url, alt, position: images.length });
  }

  const collectionIds = jsonRows(fd, "collectionIds")
    .map((x) => String(x))
    .filter(Boolean);

  return {
    name,
    slug,
    category,
    description,
    materials,
    care,
    price,
    featured,
    variants,
    images,
    collectionIds,
  };
}

export async function createProduct(
  formData: FormData,
): Promise<ProductActionResult> {
  await requireOwner();
  const input = parseProductInput(formData);
  if (!input) return { ok: false, error: "invalid_product_input" };

  try {
    await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        price: input.price,
        category: input.category,
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

  revalidateStorefront();
  return { ok: true };
}

export async function updateProduct(
  id: string,
  formData: FormData,
): Promise<ProductActionResult> {
  await requireOwner();
  const input = parseProductInput(formData);
  if (!input) return { ok: false, error: "invalid_product_input" };

  try {
    await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        price: input.price,
        category: input.category,
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

  revalidateStorefront();
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<void> {
  await requireOwner();
  // Hard delete is safe: Order.items is a JSON snapshot with NO foreign key to
  // Product, so past orders keep their record (D-07). Cascade removes the
  // product's ProductImage / ProductSizeStock child rows automatically.
  await prisma.product.delete({ where: { id } });
  revalidateStorefront();
}
