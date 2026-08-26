import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { buildProviderFlags } from "@/lib/auth-flags";

const { hasGoogle, allowDemoLogin } = buildProviderFlags(process.env);

if (!hasGoogle && !allowDemoLogin) {
  console.warn(
    "[auth] No sign-in provider is configured: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are absent and ALLOW_DEMO_LOGIN is not the exact string \"true\". /signin will render with no provider buttons.",
  );
}

/**
 * Google OAuth is registered when both GOOGLE_CLIENT_ID and
 * GOOGLE_CLIENT_SECRET are present. The demo credentials provider is
 * registered only when ALLOW_DEMO_LOGIN holds the exact string "true".
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
  pages: { signIn: "/signin" },
  providers: [
    ...(hasGoogle
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
};

export const googleEnabled = hasGoogle;
export const demoLoginEnabled = allowDemoLogin;
