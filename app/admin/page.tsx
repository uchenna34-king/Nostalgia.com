import Link from "next/link";
import { prisma } from "@/lib/db";

// Rendering is owner-gated by app/admin/layout.tsx (requireOwner) — this page
// relies on that layout gate and does not re-check.
export default async function AdminDashboard() {
  const [products, collections, orders] = await Promise.all([
    prisma.product.count(),
    prisma.collection.count(),
    prisma.order.count(),
  ]);

  const stats = [
    { label: "Products", value: products, href: "/admin/products" },
    { label: "Collections", value: collections, href: "/admin/collections" },
    { label: "Orders", value: orders, href: "/admin/orders" },
  ];

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-sepia">Dashboard</p>
      <h1 className="mt-2 font-serif text-3xl text-ink">Overview</h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.href}
            href={stat.href}
            className="block rounded-sm bg-cream-dark px-6 py-8 transition-colors hover:text-sepia"
          >
            <span className="block font-serif text-4xl tabular-nums text-ink">
              {stat.value}
            </span>
            <span className="mt-2 block text-xs uppercase tracking-[0.15em] text-ink-soft">
              {stat.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
