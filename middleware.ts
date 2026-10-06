import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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
export async function middleware(req: NextRequest) {
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

export const config = {
  matcher: ["/admin/:path*"],
};
