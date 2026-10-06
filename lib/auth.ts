import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { buildProviderFlags } from "@/lib/auth-flags";
import { isOwnerEmail } from "@/lib/owner";

const { hasGoogle, allowDemoLogin } = buildProviderFlags(process.env);

/** The slice of an OAuth profile the sign-in gate reads. */
type OAuthProfile = { email?: string | null; email_verified?: boolean };

/**
 * The `signIn` callback's decision, kept pure so it can be unit-tested. Google
 * is let through only when Google itself vouches for the email — that proof
 * is what makes allowDangerousEmailAccountLinking safe. The demo provider has
 * already decided in its own authorize().
 */
export function oauthSignInAllowed({
  account,
  profile,
}: {
  account?: { provider: string } | null;
  profile?: OAuthProfile | null;
}): boolean {
  if (account?.provider === "google") return profile?.email_verified === true;
  return true;
}

/**
 * Customers sign in with Google only. Google OAuth is registered when both
 * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are present. The demo credentials
 * provider is registered only when ALLOW_DEMO_LOGIN holds the exact string
 * "true".
 *
 * The demo provider authenticates as any supplied email with no secret of
 * any kind — leaving it enabled on a public URL grants anyone the owner
 * address and therefore /admin (see lib/admin.ts requireOwner()). It is
 * deliberately enabled for UAT and disabled at go-live (D-03, D-11). The gate
 * must never be loosened to a truthiness check: an operator typing a value
 * meant to disable it (e.g. the word "false") would otherwise re-enable it,
 * since a non-empty string is truthy.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  // Errors land on /signin too, so AccessDenied (oauthSignInAllowed said no)
  // reaches the same page that explains it (lib/auth-errors.ts), not
  // NextAuth's unstyled default error page.
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    // Email linking lets Google sign in to an account that already exists for
    // the same address (e.g. one created before sign-in was Google only). It
    // is safe only because Google sign-in is refused unless Google reports the
    // email verified (oauthSignInAllowed above). That proof is required, not
    // nice-to-have — /admin is granted by email (lib/admin.ts requireOwner()),
    // so linking an unproven address would hand over the account it lands on.
    ...(hasGoogle
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(allowDemoLogin
      ? [
          CredentialsProvider({
            id: "demo",
            name: "Google (demo)",
            credentials: {
              email: { label: "Email", type: "email" },
              name: { label: "Name", type: "text" },
            },
            async authorize(credentials) {
              const email =
                credentials?.email?.trim() || "friend@nostalgia.test";
              const name = credentials?.name?.trim() || "Nostalgia Friend";
              const user = await prisma.user.upsert({
                where: { email },
                update: { name },
                create: { email, name },
              });
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      return oauthSignInAllowed({ account, profile });
    },
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      // Lets the storefront show the owner a way into /admin without shipping
      // OWNER_EMAIL to the browser. Display only — /admin itself is still
      // guarded by requireOwner() on the server.
      if (session.user) {
        (session.user as { isOwner?: boolean }).isOwner = isOwnerEmail(
          session.user.email,
        );
      }
      return session;
    },
  },
};

export const googleEnabled = hasGoogle;
export const demoLoginEnabled = allowDemoLogin;
