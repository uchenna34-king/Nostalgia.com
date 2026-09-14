"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import CartDrawer from "@/components/CartDrawer";
import AnnouncementBar from "@/components/AnnouncementBar";

/**
 * Chrome gate. The storefront gets the full frame (film-grain overlay, Nav,
 * Footer, CartDrawer); the /admin back-office renders bare children — no grain,
 * no storefront chrome — so app/admin/layout.tsx can supply its own dense admin
 * shell (D-14). Footer is a Server Component, so it is passed in as a prop
 * rather than imported into this client component.
 */
export default function AppFrame({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }
  return (
    <div className="grain flex min-h-screen flex-col">
      <AnnouncementBar />
      <Nav />
      <div className="flex-1">{children}</div>
      {footer}
      <CartDrawer />
    </div>
  );
}
