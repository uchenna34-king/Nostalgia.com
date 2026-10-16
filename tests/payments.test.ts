// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();
const sendOrderConfirmation = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: { order: { updateMany: (...a: unknown[]) => updateMany(...a) } },
}));
vi.mock("@/lib/email", () => ({
  sendOrderConfirmation: (...a: unknown[]) => sendOrderConfirmation(...a),
}));

import { markOrderPaid } from "@/lib/payments";

const PAID = { provider: "paystack", amount: 4_500_000, currency: "NGN" } as const;

beforeEach(() => {
  updateMany.mockReset();
  sendOrderConfirmation.mockReset();
});

describe("markOrderPaid (D-22)", () => {
  it("flips only a pending order whose amount, currency and provider all match", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await markOrderPaid("order_1", PAID);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "order_1",
        status: "pending",
        total: 4_500_000,
        currency: "NGN",
        paymentProvider: "paystack",
      },
      data: { status: "paid" },
    });
  });

  it("sends the confirmation once when it made the transition", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    expect(await markOrderPaid("order_1", PAID)).toEqual({ transitioned: true });
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(sendOrderConfirmation).toHaveBeenCalledWith("order_1");
  });

  it("sends nothing when the order was already paid or didn't match", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    expect(await markOrderPaid("order_1", PAID)).toEqual({ transitioned: false });
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("emails exactly once when the webhook and the callback race", async () => {
    updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await Promise.all([markOrderPaid("order_1", PAID), markOrderPaid("order_1", PAID)]);
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });
});
