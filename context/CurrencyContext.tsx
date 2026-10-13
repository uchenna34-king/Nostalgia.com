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

type CurrencyContextValue = {
  /** The shopper's currency, or null until mounted (server render). */
  currency: Currency | null;
  setCurrency: (next: Currency) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Pages whose server render sorts/filters by price in the active currency. */
function isPricedListing(pathname: string | null): boolean {
  return !!pathname && (pathname === "/shop" || pathname.startsWith("/shop/") || pathname.startsWith("/collections/"));
}

/**
 * Client view of the shopper's currency (D-11). The applied value lives on
 * <html data-currency>, set before paint from the cookie; this reads it after
 * mount (never during render, which would disagree with the server HTML) and
 * changes it on request. Prices themselves switch through CSS, so most of the
 * page needs no context at all — this is for code that needs the value in JS
 * (the toggle, the checkout POST, analytics).
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setState] = useState<Currency | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setState(
      parseCurrency(document.documentElement.getAttribute(CURRENCY_ATTR)) ?? DEFAULT_CURRENCY,
    );
  }, []);

  const setCurrency = useCallback(
    (next: Currency) => {
      if (next === currency) return;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      try {
        document.cookie = `${CURRENCY_COOKIE}=${next}; Path=/; Max-Age=${CURRENCY_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
      } catch {
        // Cookies blocked: the attribute and state still carry the choice for this visit.
      }
      document.documentElement.setAttribute(CURRENCY_ATTR, next);
      setState(next);

      // Listings sort/filter by price on the server: re-run them. A ?price=
      // range typed in one currency means nothing in the other, so drop it.
      // Read from window.location, not useSearchParams: that hook in a root
      // provider would push every static page into client rendering.
      if (isPricedListing(pathname)) {
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
    [currency, pathname, router],
  );

  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
