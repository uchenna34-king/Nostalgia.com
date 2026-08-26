import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OrderDetail from "@/components/account/OrderDetail";

// Renders one customer's private order — must never be cached or statically
// prerendered, or one customer's order could be served to another
// (T-11-06-05).
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/signin?callbackUrl=/account/orders/${params.id}`);
  }

  const userId = (session.user as { id?: string }).id;

  // Critical guard (T-11-06-02): Prisma silently drops an `undefined` filter
  // value, so an unguarded lookup scoped by `{ id, userId: undefined }`
  // collapses to `{ id }` and would return ANY user's order matching the id
  // — a direct IDOR. Treat a missing id the same as signed-out. Do not
  // delete this guard as "redundant" in a future refactor.
  if (!userId) {
    redirect(`/signin?callbackUrl=/account/orders/${params.id}`);
  }

  // Scoped by BOTH the route id AND the session user id in a single query
  // (T-11-06-01) — a guessed/borrowed id that is not the signed-in user's
  // returns null, indistinguishable from a non-existent id.
  const order = await prisma.order.findFirst({
    where: { id: params.id, userId },
  });

  // Collapse "not yours" and "doesn't exist" into one branded 404 — never a
  // 403, never a distinct message. Mirrors lib/admin.ts requireOwner()'s
  // never-reveal-existence precedent (T-11-06-03, UI-SPEC Contract 4).
  if (!order) {
    notFound();
  }

  return (
    <main className="container-x py-16">
      <OrderDetail order={order} />
    </main>
  );
}
