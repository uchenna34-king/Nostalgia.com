"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCollection,
  updateCollection,
  type CollectionActionResult,
} from "@/app/admin/collections/actions";

export type ProductOption = { id: string; name: string };

export type CollectionFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  productIds?: string[];
};

function messageFor(error: string): string {
  if (error === "slug_taken") return "That slug is already in use.";
  return "Couldn't save — check the highlighted fields and try again.";
}

export default function CollectionForm({
  initial,
  products,
}: {
  initial?: CollectionFormInitial;
  products: ProductOption[];
}) {
  const router = useRouter();
  const editing = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [productIds, setProductIds] = useState<string[]>(
    initial?.productIds ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("slug", slug);
    fd.set("description", description);
    fd.set("productIds", JSON.stringify(productIds));

    const result: CollectionActionResult = editing
      ? await updateCollection(initial!.id!, fd)
      : await createCollection(fd);

    if (result.ok) {
      router.push("/admin/collections");
      router.refresh();
    } else {
      setError(messageFor(result.error));
      setSaving(false);
    }
  }

  const inputClass =
    "w-full border border-ink/20 bg-cream-dark px-3 py-2 text-sm";
  const labelClass =
    "block text-xs uppercase tracking-[0.15em] text-ink-soft mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.25em] text-sepia">
        {editing ? "Edit collection" : "New collection"}
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink">
        {editing ? name || "Edit collection" : "Add collection"}
      </h1>

      {error && (
        <p className="mt-6 border border-[#9B2C2C] bg-[#9B2C2C]/5 px-4 py-3 text-sm text-[#9B2C2C]">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Slug</label>
          <input
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={inputClass}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-xs uppercase tracking-[0.15em] text-ink-soft">
            Products
          </legend>
          {products.length === 0 ? (
            <p className="text-sm text-ink-soft">No products to assign yet.</p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={productIds.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Saving…" : "Save collection"}
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => router.push("/admin/collections")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
