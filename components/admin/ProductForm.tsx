"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SizeStockEditor, { type Variant } from "./SizeStockEditor";
import ImageUrlEditor, { type Img } from "./ImageUrlEditor";
import CollectionPicker, { type CollectionOption } from "./CollectionPicker";
import {
  createProduct,
  updateProduct,
  type ProductActionResult,
} from "@/app/admin/products/actions";

export type ProductFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  price?: number;
  category?: string;
  description?: string;
  materials?: string | null;
  care?: string | null;
  featured?: boolean;
  variants?: Variant[];
  images?: Img[];
  collectionIds?: string[];
};

function messageFor(error: string): string {
  if (error === "slug_taken") return "That slug is already in use.";
  return "Couldn't save — check the highlighted fields and try again.";
}

export default function ProductForm({
  initial,
  collections,
}: {
  initial?: ProductFormInitial;
  collections: CollectionOption[];
}) {
  const router = useRouter();
  const editing = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [materials, setMaterials] = useState(initial?.materials ?? "");
  const [care, setCare] = useState(initial?.care ?? "");
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [variants, setVariants] = useState<Variant[]>(initial?.variants ?? []);
  const [images, setImages] = useState<Img[]>(initial?.images ?? []);
  const [collectionIds, setCollectionIds] = useState<string[]>(
    initial?.collectionIds ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("slug", slug);
    fd.set("price", price);
    fd.set("category", category);
    fd.set("description", description);
    fd.set("materials", materials);
    fd.set("care", care);
    if (featured) fd.set("featured", "on");
    fd.set("variants", JSON.stringify(variants));
    fd.set("images", JSON.stringify(images));
    fd.set("collectionIds", JSON.stringify(collectionIds));

    const result: ProductActionResult = editing
      ? await updateProduct(initial!.id!, fd)
      : await createProduct(fd);

    if (result.ok) {
      router.push("/admin/products");
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
        {editing ? "Edit product" : "New product"}
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink">
        {editing ? name || "Edit product" : "Add product"}
      </h1>

      {error && (
        <p className="mt-6 border border-[#9B2C2C] bg-[#9B2C2C]/5 px-4 py-3 text-sm text-[#9B2C2C]">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-6">
        {/* Details */}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 font-serif text-lg text-ink">Details</legend>
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <label className={labelClass}>Price (cents)</label>
              <input
                type="number"
                min={0}
                className={`${inputClass} tabular-nums`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Materials</label>
              <input
                className={inputClass}
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Care</label>
              <input
                className={inputClass}
                value={care}
                onChange={(e) => setCare(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured on the home page
          </label>
        </fieldset>

        {/* Sizes & stock */}
        <fieldset>
          <legend className="mb-2 font-serif text-lg text-ink">
            Sizes &amp; stock
          </legend>
          <SizeStockEditor value={variants} onChange={setVariants} />
        </fieldset>

        {/* Images */}
        <fieldset>
          <legend className="mb-2 font-serif text-lg text-ink">Images</legend>
          <ImageUrlEditor value={images} onChange={setImages} />
        </fieldset>

        {/* Collections */}
        <fieldset>
          <legend className="mb-2 font-serif text-lg text-ink">
            Collections
          </legend>
          <CollectionPicker
            options={collections}
            value={collectionIds}
            onChange={setCollectionIds}
          />
        </fieldset>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Saving…" : "Save product"}
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
