import Link from "next/link";
import { requireOwner } from "@/lib/admin";
import AdminNav from "@/components/admin/AdminNav";

// The requireOwner() call below gates admin PAGE RENDERING only. Admin Server
// Actions and Route Handlers (09-04/09-06) are independently-callable public
// endpoints that this layout does NOT protect — each MUST call requireOwner()
// as its own first line. (D-02)
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // FIRST STATEMENT — nothing may run before the owner gate (load-bearing: if any
  // await/JSX runs first, the 200 status locks before redirect()/notFound() fire).
  const session = await requireOwner();

  return (
    <div className="flex min-h-screen bg-cream text-ink">
      <aside className="flex w-56 shrink-0 flex-col gap-8 bg-cream-dark px-6 py-8">
        <Link href="/admin" className="block leading-tight">
          <span className="block font-serif text-lg text-ink">Nostalgia</span>
          <span className="block text-xs uppercase tracking-[0.25em] text-sepia">
            Admin
          </span>
        </Link>
        <AdminNav />
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-cream-dark px-8 py-4">
          <span className="text-xs uppercase tracking-[0.15em] text-ink-soft">
            {session.user?.email}
          </span>
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.15em] text-sepia hover:text-ink"
          >
            View store
          </Link>
        </header>
        <main className="flex-1 px-8 pt-16">{children}</main>
      </div>
    </div>
  );
}
