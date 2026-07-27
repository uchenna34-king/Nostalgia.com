"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {SECTIONS.map((section) => {
        const active =
          pathname === section.href || pathname?.startsWith(section.href + "/");
        return (
          <Link
            key={section.href}
            href={section.href}
            className={`border-l-2 py-2 pl-3 text-xs font-medium uppercase tracking-[0.15em] transition-colors ${
              active
                ? "border-sepia text-sepia"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
