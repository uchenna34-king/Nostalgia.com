import { prisma } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/email";
import type { Currency } from "@/lib/currency";
import type { PaymentProvider } from "@/lib/orders";

/**
 * The one place a real payment marks an order paid (D-22), shared by the
 * Stripe webhook and the Paystack webhook + callback.
 *
 * An atomic compare-and-set: the update only matches an order that is still
 * pending AND was created for exactly this amount, currency and provider, so
 * a payment can never pay a different order or a different amount. When a
 * webhook and the callback (or a retried delivery) race, only one update
 * matches, and only that one sends the confirmation email.
 */
export async function markOrderPaid(
  orderId: string,
  paid: { provider: PaymentProvider; amount: number; currency: Currency },
): Promise<{ transitioned: boolean }> {
  const { count } = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: "pending",
      total: paid.amount,
      currency: paid.currency,
      paymentProvider: paid.provider,
    },
    data: { status: "paid" },
  });
  if (count !== 1) return { transitioned: false };
  await sendOrderConfirmation(orderId);
  return { transitioned: true };
}
