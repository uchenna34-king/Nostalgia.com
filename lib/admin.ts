import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";

/**
 * Single-owner identity (D-01). Read from OWNER_EMAIL, falling back to a
 * placeholder for local dev — the real owner Google address is set in .env at
 * Phase 11 go-live. Never hardcode a real email here.
 */
export const OWNER_EMAIL = (
  process.env.OWNER_EMAIL ?? "owner@nostalgia.test"
)
  .trim()
  .toLowerCase();

/** Case- and whitespace-insensitive check that `email` is the store owner. */
export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_EMAIL;
}

/**
 * The authoritative owner gate (D-02).
 *
 * MUST be the first statement in the admin layout AND the first line of every
 * admin Server Action and Route Handler. Next.js Server Actions are
 * independently-callable public HTTP endpoints — the layout render check does
 * NOT protect them, so each one re-invokes this gate.
 *
 * Dev: sign in via the "demo" credentials provider using the OWNER_EMAIL
 * address to test admin access locally.
 *
 * Anonymous  -> redirect to /signin. Authenticated non-owner -> notFound()
 * (a plain 404, so admin existence is never revealed). Owner -> returns session.
 */
export async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/signin?callbackUrl=/admin");
  }
  if (!isOwnerEmail(session.user.email)) {
    notFound();
  }
  return session;
}
