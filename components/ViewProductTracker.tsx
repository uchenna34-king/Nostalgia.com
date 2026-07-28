"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Fires the `view_product` funnel event (D-09) from the client, since the PDP
 * itself is a Server Component and trackEvent is browser-only. Renders nothing —
 * it is a call-site adapter, not analytics infrastructure (no consent logic, no
 * @vercel/analytics import; trackEvent self-gates on consent).
 */
export default function ViewProductTracker({
  productSlug,
}: {
  productSlug: string;
}) {
  useEffect(() => {
    trackEvent("view_product", { productSlug });
  }, [productSlug]);
  return null;
}
