import { cookies, headers } from "next/headers";
import { CURRENCY_COOKIE, currencyFromCountry, parseCurrency, type Currency } from "@/lib/currency";

/**
 * The shopper's currency on the server (D-12): the cookie, else the same
 * country default the middleware uses (the first request can't see the
 * cookie that request is setting), else NGN. Only for routes that are already
 * dynamic (/shop, /collections) — never call it from the root layout, which
 * would make every page dynamic.
 */
export function getCurrency(): Currency {
  return (
    parseCurrency(cookies().get(CURRENCY_COOKIE)?.value) ??
    currencyFromCountry(headers().get("x-vercel-ip-country"))
  );
}
