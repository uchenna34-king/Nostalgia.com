import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/owner";

export { OWNER_EMAIL, isOwnerEmail } from "@/lib/owner";

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
