"use client";

import Link from "next/link";
import { deleteCollection } from "@/app/admin/collections/actions";

type Row = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

export default function CollectionTable({
  collections,
}: {
  collections: Row[];
}) {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-sepia">
            Curation
          </p>
          <h1 className="mt-2 font-serif text-3xl text-ink">Collections</h1>
        </div>
        <Link href="/admin/collections/new" className="btn">
          Add collection
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="rounded-sm bg-cream-dark px-6 py-16 text-center">
          <h2 className="font-serif text-xl text-ink">No collections yet</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Create a collection to group products on the storefront.
          </p>
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-dark text-xs uppercase tracking-[0.15em] text-ink-soft">
            <tr>
              <th className="py-3 pr-4 font-medium">Collection</th>
              <th className="py-3 pr-4 font-medium">Slug</th>
              <th className="py-3 pr-4 font-medium">Products</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id} className="border-b border-cream-dark/60">
                <td className="py-3 pr-4 text-ink">{c.name}</td>
                <td className="py-3 pr-4 text-ink-soft">{c.slug}</td>
                <td className="py-3 pr-4 tabular-nums text-ink">
                  {c.productCount}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/collections/${c.id}/edit`}
                      aria-label={`Edit ${c.name}`}
                      className="text-sepia hover:text-ink"
                    >
                      Edit
                    </Link>
                    <form
                      action={deleteCollection.bind(null, c.id)}
                      onSubmit={(e) => {
                        if (
                          !confirm(
                            `Delete '${c.name}'? Products stay, but they'll no longer belong to this collection. This can't be undone.`,
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <button
                        type="submit"
                        aria-label={`Delete ${c.name}`}
                        className="text-[#9B2C2C] hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
