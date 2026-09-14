import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OrderList, { toOrderRows } from "@/components/account/OrderList";
import {
  AccountSignedOut,
  AccountSignOutButton,
} from "@/components/account/AccountAuthActions";

// Renders one customer's private order history — must never be cached or
// statically prerendered, or one customer's list could be served to another
// (T-11-03-04).
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return (
      <main>
        <AccountSignedOut />
      </main>
    );
  }

  const userId = (session.user as { id?: string }).id;

  // Critical guard (D-07, T-11-03-02): Prisma silently drops an `undefined`
  // filter value, so an unguarded order lookup scoped by `{ userId: undefined }`
  // would return EVERY order in the database — handing one customer the
  // entire customer base's order history. Never let the query below run
  // unscoped; treat a missing id the same as signed-out. Do not delete this
  // guard as "redundant" in a future refactor.
  if (!userId) {
    redirect("/signin?callbackUrl=/account");
  }

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const rows = toOrderRows(orders);

  return (
    <main className="container-x py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-2 font-serif text-5xl font-normal tracking-[-0.02em]">
        Hello, {session.user.name?.split(" ")[0] ?? "friend"}
      </h1>
      <p className="mt-3 text-ink-soft">{session.user.email}</p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/shop" className="btn-primary">
          Continue shopping
        </Link>
        <AccountSignOutButton />
      </div>

      <OrderList orders={rows} />
    </main>
  );
}
