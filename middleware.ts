import withAuth from "next-auth/middleware";

// First-layer, defense-in-depth gate for /admin: redirects anonymous (no valid
// JWT) visitors to /signin before the route renders. This is NOT the
// authorization boundary on its own — it only enforces "is authenticated", it
// cannot tell owner from non-owner (Edge runtime, JWT claims only), and it does
// NOT protect Server Actions. The authoritative owner-email decision (and the
// authenticated-non-owner 404) is made server-side by requireOwner() in
// lib/admin.ts, which every admin layout, Server Action, and Route Handler
// MUST call. (D-02)
export default withAuth({
  pages: { signIn: "/signin" },
});

export const config = {
  matcher: ["/admin/:path*"],
};
