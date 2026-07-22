"use server";

import { requireOwner } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { isValidOrderStatus } from "@/lib/orders";

// Status is freely correctable by the single trusted owner (D-12): the allow-list
// validates the VALUE but does not enforce forward-only transitions, so a
// mis-click (e.g. fulfilled -> paid) can be corrected.
export async function updateOrderFulfillment(
  orderId: string,
  status: string,
  trackingNumber: string,
  notes: string,
): Promise<void> {
  await requireOwner();
  // Reject any value outside ORDER_STATUSES BEFORE the Prisma write — never
  // persist an out-of-set/forged status.
  if (!isValidOrderStatus(status)) {
    throw new Error("invalid_status");
  }
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      trackingNumber: trackingNumber.trim() || null,
      notes: notes.trim() || null,
    },
  });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
