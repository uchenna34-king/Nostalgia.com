import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { buildProviderFlags } from "@/lib/auth-flags";
import { burnPasswordCheck, verifyPassword } from "@/lib/password";
import { normalizeEmail, PASSWORD_MAX } from "@/lib/registration-rules";

const { hasGoogle, allowDemoLogin } = buildProviderFlags(process.env);

/**
 * Email + password sign-in is always registered. Google OAuth is registered
 * when both GOOGLE_CLIENT_ID and
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
    // Email + password, for accounts created at /register. Always on: the
    // account only exists once its email was verified (lib/registration.ts),
    // so this can't be used to sign in as an address the person doesn't own.
    CredentialsProvider({
      id: "password",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email ?? "");
        const password = credentials?.password ?? "";
        if (!email || !password || password.length > PASSWORD_MAX) return null;

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!user?.passwordHash) {
          await burnPasswordCheck(password);
          return null;
        }
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
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
