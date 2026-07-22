"use server";

import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CollectionActionResult = { ok: true } | { ok: false; error: string };

type ParsedCollection = {
  name: string;
  slug: string;
  description: string | null;
  productIds: string[];
};

function field(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function jsonIds(fd: FormData, key: string): string[] {
  const raw = fd.get(key);
  if (typeof raw !== "string") return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
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

function revalidateStorefront() {
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/shop");
  revalidatePath("/");
}

function parseCollectionInput(fd: FormData): ParsedCollection | null {
  const name = field(fd, "name");
  const slug = field(fd, "slug");
  if (!name || !slug) return null;
  const description = field(fd, "description") || null;
  const productIds = jsonIds(fd, "productIds");
  return { name, slug, description, productIds };
}

export async function createCollection(
  formData: FormData,
): Promise<CollectionActionResult> {
  await requireOwner();
  const input = parseCollectionInput(formData);
  if (!input) return { ok: false, error: "invalid_collection_input" };

  try {
    await prisma.collection.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        products: input.productIds.length
          ? { connect: input.productIds.map((id) => ({ id })) }
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

export async function updateCollection(
  id: string,
  formData: FormData,
): Promise<CollectionActionResult> {
  await requireOwner();
  const input = parseCollectionInput(formData);
  if (!input) return { ok: false, error: "invalid_collection_input" };

  try {
    await prisma.collection.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        products: { set: input.productIds.map((pid) => ({ id: pid })) },
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: "slug_taken" };
    throw e;
  }

  revalidateStorefront();
  return { ok: true };
}

export async function deleteCollection(id: string): Promise<void> {
  await requireOwner();
  // Deleting a collection detaches its products (implicit m2m join rows) but
  // never deletes the products themselves.
  await prisma.collection.delete({ where: { id } });
  revalidateStorefront();
}
