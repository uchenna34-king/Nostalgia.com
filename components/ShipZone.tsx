import type { ReactNode } from "react";
import type { ShippingZone } from "@/lib/shipping";

/**
 * Copy for one delivery zone (D-33). Render one per zone, side by side; the
 * unlayered rule in app/globals.css shows only the shopper's, keyed on
 * <html data-zone> set before first paint from the region cookie. Same idiom
 * as <Money>, so static pages can say "free delivery over …" in the
 * shopper's own zone and currency without reading a cookie on the server.
 */
export default function ShipZone({
  zone,
  className,
  children,
}: {
  zone: ShippingZone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span data-ship-zone={zone} className={className}>
      {children}
    </span>
  );
}
