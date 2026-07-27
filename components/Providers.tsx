"use client";

import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import ConsentBanner from "@/components/ConsentBanner";
import { hasConsent, subscribeConsent } from "@/lib/analytics";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Mounts Vercel analytics only after consent (D-10). `consented` starts false
 * (avoids a hydration mismatch / SSR flash) and is set post-mount from
 * hasConsent(); subscribeConsent re-reads it live so accepting mounts analytics
 * immediately, with no page reload. Conditional mounting is the only correct
 * gate — the components expose no runtime "paused" prop.
 */
function AnalyticsGate() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(hasConsent());
    return subscribeConsent(() => setConsented(hasConsent()));
  }, []);

  if (!consented) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <WishlistProvider>
          {children}
          <ConsentBanner />
          <AnalyticsGate />
        </WishlistProvider>
      </CartProvider>
    </SessionProvider>
  );
}
