"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/products";
import { deleteProduct } from "@/app/admin/products/actions";

type Row = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  featured: boolean;
  thumbnail: string | null;
  totalStock: number;
};

export default function ProductTable({ products }: { products: Row[] }) {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-sepia">Catalog</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">Products</h1>
        </div>
        <Link href="/admin/products/new" className="btn">
          Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-sm bg-cream-dark px-6 py-16 text-center">
          <h2 className="font-serif text-xl text-ink">No products yet</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Add your first product to see it on the storefront.
          </p>
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cream-dark text-xs uppercase tracking-[0.15em] text-ink-soft">
            <tr>
              <th className="py-3 pr-4 font-medium">Product</th>
              <th className="py-3 pr-4 font-medium">Category</th>
              <th className="py-3 pr-4 font-medium">Price</th>
              <th className="py-3 pr-4 font-medium">Stock</th>
              <th className="py-3 pr-4 font-medium">Featured</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-cream-dark/60">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {p.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnail}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-sm bg-cream-dark" />
                    )}
                    <span className="text-ink">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-ink-soft">{p.category}</td>
                <td className="py-3 pr-4 tabular-nums text-ink">
                  {formatPrice(p.price)}
                </td>
                <td className="py-3 pr-4 tabular-nums text-ink">
                  {p.totalStock}
                </td>
                <td className="py-3 pr-4 text-ink-soft">
                  {p.featured ? "Yes" : "—"}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      aria-label={`Edit ${p.name}`}
                      className="text-sepia hover:text-ink"
                    >
                      Edit
                    </Link>
                    <form
                      action={deleteProduct.bind(null, p.id)}
                      onSubmit={(e) => {
                        if (
                          !confirm(
                            `Delete '${p.name}'? This removes it from the storefront. Past orders keep their record. This can't be undone.`,
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <button
                        type="submit"
                        aria-label={`Delete ${p.name}`}
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
