// The shopper's ship-to region (D-33, 12-REGION-SPEC.md): the country their
// order is going to, kept in a cookie beside nostalgia-currency. Pure and
// Prisma-free: imported by Edge middleware and client components, like
// lib/currency.ts.
import { isShippableCountry } from "@/lib/countries";

/** Nigeria, the brand's home market: the default when nothing better is known. */
export const DEFAULT_REGION = "NG";

export const REGION_COOKIE = "nostalgia-region";

/** On <html>: "international" when the region isn't Nigeria; absent = domestic. */
export const ZONE_ATTR = "data-zone";

/** The region for an untrusted value: a shippable ISO code, else null. */
export function parseRegion(value: unknown): string | null {
  return isShippableCountry(value) ? value : null;
}

/** First-visit default from the geo header: that country if we ship there, else Nigeria. */
export function regionFromCountry(country: string | null | undefined): string {
  return parseRegion(country) ?? DEFAULT_REGION;
}

/** The region in a `document.cookie` string, through the allow-list. */
export function readRegionCookie(cookies: string): string | null {
  const m = cookies.match(new RegExp(`(?:^|; )${REGION_COOKIE}=([A-Z]{2})(?:;|$)`));
  return m ? parseRegion(m[1]) : null;
}

/**
 * Blocking inline <head> script (same idiom as CURRENCY_SCRIPT): marks
 * <html data-zone="international"> before first paint when the region cookie
 * isn't Nigeria, so <ShipZone> copy is right from the first frame. Same rule
 * as zoneFor() in lib/shipping.ts (tests/region.test.ts holds them together).
 * Any two capital letters count here; CurrencyContext re-applies the
 * attribute from the allow-listed value once mounted.
 */
export const REGION_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${REGION_COOKIE}=([A-Z]{2})(?:;|$)/);if(m&&m[1]!=="${DEFAULT_REGION}")document.documentElement.setAttribute("${ZONE_ATTR}","international")}catch(e){}})()`;
