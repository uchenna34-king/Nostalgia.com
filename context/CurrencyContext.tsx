"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CURRENCY_ATTR,
  CURRENCY_COOKIE,
  CURRENCY_COOKIE_MAX_AGE,
  DEFAULT_CURRENCY,
  parseCurrency,
  type Currency,
} from "@/lib/currency";
import { DEFAULT_REGION, REGION_COOKIE, ZONE_ATTR, parseRegion, readRegionCookie } from "@/lib/region";
import { zoneFor } from "@/lib/shipping";

/** Where the order ships (a shippable ISO code) and the currency it is paid in. */
export type Preferences = { region: string; currency: Currency };

type CurrencyContextValue = {
  /** The shopper's currency, or null until mounted (server render). */
  currency: Currency | null;
  /** The ship-to region (D-33), or null until mounted. */
  region: string | null;
  /** Applies both at once, as the region picker's Save does. */
  setPreferences: (next: Preferences) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Pages whose server render sorts/filters by price in the active currency. */
function isPricedListing(pathname: string | null): boolean {
  return !!pathname && (pathname === "/shop" || pathname.startsWith("/shop/") || pathname.startsWith("/collections/"));
}

/** <html data-zone> for a region: "international" outside Nigeria, absent at home. */
function applyZone(region: string) {
  const root = document.documentElement;
  if (zoneFor(region) === "international") root.setAttribute(ZONE_ATTR, "international");
  else root.removeAttribute(ZONE_ATTR);
}

/**
 * Client view of the shopper's currency and ship-to region (D-11, D-33). The
 * applied values live on <html data-currency> / <html data-zone>, set before
 * paint from the cookies; this reads them after mount (never during render,
 * which would disagree with the server HTML) and changes them on request.
 * Prices and zone copy switch through CSS, so most of the page needs no
 * context at all — this is for code that needs the values in JS (the region
 * picker, the checkout POST and address form, analytics).
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cookies = "";
    try {
      cookies = document.cookie;
    } catch {
      // Cookies blocked: fall back to the defaults below.
    }
    const region = readRegionCookie(cookies) ?? DEFAULT_REGION;
    // REGION_SCRIPT accepts any two capitals; re-apply from the allow-listed value.
    applyZone(region);
    setPrefs({
      region,
      currency: parseCurrency(document.documentElement.getAttribute(CURRENCY_ATTR)) ?? DEFAULT_CURRENCY,
    });
  }, []);

  const setPreferences = useCallback(
    (next: Preferences) => {
      const region = parseRegion(next.region);
      const currency = parseCurrency(next.currency);
      if (!prefs || !region || !currency) return;
      if (region === prefs.region && currency === prefs.currency) return;

      const attrs = `; Path=/; Max-Age=${CURRENCY_COOKIE_MAX_AGE}; SameSite=Lax${
        window.location.protocol === "https:" ? "; Secure" : ""
      }`;
      try {
        document.cookie = `${CURRENCY_COOKIE}=${currency}${attrs}`;
        document.cookie = `${REGION_COOKIE}=${region}${attrs}`;
      } catch {
        // Cookies blocked: the attributes and state still carry the choice for this visit.
      }
      document.documentElement.setAttribute(CURRENCY_ATTR, currency);
      applyZone(region);
      setPrefs({ region, currency });

      // Listings sort/filter by price on the server: re-run them when the
      // currency changes (the region alone doesn't touch a price). A ?price=
      // range typed in one currency means nothing in the other, so drop it.
      // Read from window.location, not useSearchParams: that hook in a root
      // provider would push every static page into client rendering.
      if (currency !== prefs.currency && isPricedListing(pathname)) {
        const params = new URLSearchParams(window.location.search);
        if (params.has("price")) {
          params.delete("price");
          params.delete("page");
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname!, { scroll: false });
        } else {
          router.refresh();
        }
      }
    },
    [prefs, pathname, router],
  );

  const value = useMemo(
    () => ({ currency: prefs?.currency ?? null, region: prefs?.region ?? null, setPreferences }),
    [prefs, setPreferences],
  );
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
