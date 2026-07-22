import { prisma } from "@/lib/db";
import { parseOrderItems } from "@/lib/orders";
import OrderTable from "@/components/admin/OrderTable";

// Rendering is owner-gated by app/admin/layout.tsx (requireOwner); every mutation
// is separately gated in actions.ts. The owner legitimately sees ALL orders (D-11).
export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((o) => ({
    id: o.id,
    email: o.email,
    itemCount: parseOrderItems(o.items).reduce((sum, i) => sum + i.qty, 0),
    total: o.total,
    status: o.status,
    createdAt: o.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));

  return <OrderTable orders={rows} />;
}
