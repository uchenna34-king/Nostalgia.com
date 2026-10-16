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
import { CATEGORIES, categoryByLabel } from "@/lib/taxonomy";
import { toSlug } from "@/lib/slug";
import { MAX_MINOR, autoUsdMinor, formatMoney, toMinorUnits } from "@/lib/currency";

// The largest whole naira/dollar amount the INTEGER price columns hold; the
// server applies the same limit through toMinorUnits.
const MAX_PRICE_MAJOR = Math.floor(MAX_MINOR / 100);

export type ProductFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  /** Kobo. */
  priceNgn?: number;
  /** Cents, or null when the dollar price follows the store rate. */
  priceUsdOverride?: number | null;
  category?: string;
  department?: string;
  subcategory?: string | null;
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
  if (error === "invalid_price_ngn") return "Enter the naira price as a whole number.";
  if (error === "invalid_price_usd")
    return "The dollar price must be a whole number, or left blank.";
  if (error === "rate_unavailable")
    return "The store exchange rate isn't set. Set it in Settings, then save again.";
  return "Couldn't save — check the highlighted fields and try again.";
}

/** Whole units for an input, from minor units; blank when there's no value. */
function majorInput(minor: number | null | undefined): string {
  return minor === null || minor === undefined ? "" : String(minor / 100);
}

export default function ProductForm({
  initial,
  collections,
  usdNgnRate,
}: {
  initial?: ProductFormInitial;
  collections: CollectionOption[];
  /** Whole naira per $1 from StoreSettings, or null if it isn't set yet. */
  usdNgnRate: number | null;
}) {
  const router = useRouter();
  const editing = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  // A new product's slug follows its name until the owner edits it.
  const [slugEdited, setSlugEdited] = useState(Boolean(initial?.slug));
  // Typed in whole naira / dollars (D-07). A blank dollar price follows the
  // store rate, so an edit of an auto-priced product stays auto.
  const [priceNgn, setPriceNgn] = useState(majorInput(initial?.priceNgn));
  const [priceUsd, setPriceUsd] = useState(majorInput(initial?.priceUsdOverride));
  const [ngnTouched, setNgnTouched] = useState(false);
  // A legacy category outside the taxonomy starts blank, so saving forces a
  // real placement rather than silently keeping an unreachable one.
  const [category, setCategory] = useState(
    categoryByLabel(initial?.category)?.label ?? "",
  );
  const [department, setDepartment] = useState(initial?.department ?? "unisex");
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "");
  const sections = categoryByLabel(category)?.sections ?? [];
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
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData();
    fd.set("name", name);
    fd.set("slug", slug);
    fd.set("priceNgn", priceNgn);
    fd.set("priceUsd", priceUsd);
    fd.set("category", category);
    fd.set("department", department);
    fd.set("subcategory", subcategory);
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
      setNgnTouched(true);
      setSaving(false);
    }
  }

  // Live price helpers (UI-SPEC 7a), recomputed on every keystroke.
  const ngnMinor = toMinorUnits(priceNgn);
  const ngnInvalid = ngnTouched && ngnMinor === null;
  const usdTyped = priceUsd.trim() !== "";
  const usdInvalid = usdTyped && toMinorUnits(priceUsd) === null;
  let usdHelper: string;
  if (usdInvalid) {
    usdHelper = "Enter a whole number of dollars, or leave blank to use the store rate.";
  } else if (usdTyped) {
    usdHelper = "Fixed price. It won't change when the store rate changes.";
  } else if (usdNgnRate === null) {
    usdHelper = "The store exchange rate isn't set yet. Open Settings to set it.";
  } else if (ngnMinor !== null) {
    const auto = formatMoney(autoUsdMinor(ngnMinor, usdNgnRate), "USD");
    const rate = formatMoney(usdNgnRate * 100, "NGN");
    usdHelper = `Leave blank to use the store rate: ${auto} (${rate} = $1).`;
  } else {
    usdHelper =
      "Leave blank to price this automatically from the naira price at the store rate.";
  }

  const inputClass =
    "w-full border border-ink/20 bg-cream-dark px-3 py-2 text-sm";
  const labelClass =
    "block text-xs uppercase tracking-[0.15em] text-ink-soft mb-1";
  const hintClass = "mt-1 text-xs text-ink-soft";
  const fieldErrorClass = "mt-1 text-xs text-[#9B2C2C] dark:text-ink";

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
              onChange={(e) => {
                setName(e.target.value);
                if (!slugEdited) setSlug(toSlug(e.target.value));
              }}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Slug</label>
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
              // Show the address it will actually get (the server applies
              // the same toSlug on save).
              onBlur={() => setSlug(toSlug(slug))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pf-price-ngn" className={labelClass}>
                Price (₦)
              </label>
              <input
                id="pf-price-ngn"
                type="number"
                min={0}
                max={MAX_PRICE_MAJOR}
                step={1}
                inputMode="numeric"
                className={`${inputClass} tabular-nums`}
                value={priceNgn}
                onChange={(e) => setPriceNgn(e.target.value)}
                onBlur={() => setNgnTouched(true)}
                aria-describedby="pf-price-ngn-hint"
                aria-invalid={ngnInvalid || undefined}
                required
              />
              <p
                id="pf-price-ngn-hint"
                className={ngnInvalid ? fieldErrorClass : hintClass}
              >
                {ngnInvalid
                  ? "Enter the naira price as a whole number, for example 45000."
                  : "Whole naira, no commas. Example: 45000."}
              </p>
            </div>
            <div>
              <label htmlFor="pf-price-usd" className={labelClass}>
                Price ($), optional
              </label>
              <input
                id="pf-price-usd"
                type="number"
                min={0}
                max={MAX_PRICE_MAJOR}
                step={1}
                inputMode="numeric"
                className={`${inputClass} tabular-nums`}
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                aria-describedby="pf-price-usd-hint"
                aria-invalid={usdInvalid || undefined}
              />
              <p
                id="pf-price-usd-hint"
                className={usdInvalid ? fieldErrorClass : hintClass}
              >
                {usdHelper}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="pf-department" className={labelClass}>
                Department
              </label>
              <select
                id="pf-department"
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="unisex">Women &amp; Men</option>
                <option value="women">Women</option>
                <option value="men">Men</option>
              </select>
            </div>
            <div>
              <label htmlFor="pf-category" className={labelClass}>
                Category
              </label>
              <select
                id="pf-category"
                className={inputClass}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory(""); // sections belong to one category
                }}
                required
              >
                <option value="" disabled>
                  Choose…
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pf-section" className={labelClass}>
                Section
              </label>
              <select
                id="pf-section"
                className={inputClass}
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={sections.length === 0}
              >
                <option value="">
                  {sections.length ? "Whole category" : "No sections"}
                </option>
                {sections.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
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
          <ImageUrlEditor
            value={images}
            onChange={setImages}
            onBusyChange={setUploading}
          />
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
        <button type="submit" className="btn-primary" disabled={saving || uploading}>
          {saving ? "Saving…" : uploading ? "Uploading photos…" : "Save product"}
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
