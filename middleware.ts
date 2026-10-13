import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  CURRENCY_COOKIE,
  CURRENCY_COOKIE_MAX_AGE,
  currencyFromCountry,
  parseCurrency,
} from "@/lib/currency";

// First-layer, defense-in-depth gate for /admin: redirects anonymous (no valid
// JWT) visitors to /signin before the route renders. This is NOT the
// authorization boundary on its own — it only enforces "is authenticated", it
// cannot tell owner from non-owner (Edge runtime, JWT claims only), and it does
// NOT protect Server Actions. The authoritative owner-email decision (and the
// authenticated-non-owner 404) is made server-side by requireOwner() in
// lib/admin.ts, which every admin layout, Server Action, and Route Handler
// MUST call. (D-02)
//
// Not next-auth's withAuth(): that picks the session cookie's name from
// NEXTAUTH_URL ("__Secure-…" only if it starts with https://), while sign-in
// on Vercel always sets the secure cookie. A NEXTAUTH_URL that doesn't match
// the live origin made it miss a valid session and bounce the owner back to
// /signin. Reading the protocol off the request keeps the two in step.
async function adminGate(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:",
  });
  if (token) return NextResponse.next();

  const signIn = new URL("/signin", req.nextUrl.origin);
  signIn.searchParams.set(
    "callbackUrl",
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );
  return NextResponse.redirect(signIn);
}

/**
 * First visit only (the matcher skips requests that already carry the
 * cookie): default the shopper's currency from Vercel's country header — NG
 * or unknown → NGN, anywhere else → USD (D-09). Not httpOnly: the toggle and
 * the before-paint script read it. A value off the allow-list is replaced.
 */
function currencyCookie(req: NextRequest) {
  const res = NextResponse.next();
  if (parseCurrency(req.cookies.get(CURRENCY_COOKIE)?.value)) return res;
  res.cookies.set({
    name: CURRENCY_COOKIE,
    value: currencyFromCountry(req.headers.get("x-vercel-ip-country")),
    path: "/",
    maxAge: CURRENCY_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
  });
  return res;
}

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p === "/admin" || p.startsWith("/admin/")) return adminGate(req);
  return currencyCookie(req);
}

export const config = {
  matcher: [
    "/admin/:path*",
    {
      // Every page except /admin (above), API routes, Next internals, private
      // media and files with an extension. TWO backslashes here make ONE in
      // the pattern; a single one silently matches nothing
      // (tests/currency-middleware.test.ts guards it).
      source: "/((?!admin|api|_next|media|.*\\..*).*)",
      missing: [{ type: "cookie", key: "nostalgia-currency" }],
    },
  ],
};
