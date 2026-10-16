import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    order: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      findMany: (...a: unknown[]) => findMany(...a),
    },
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/app/admin/orders/actions", () => ({ updateOrderFulfillment: vi.fn() }));

import OrderTable from "@/components/admin/OrderTable";
import AdminOrdersPage from "@/app/admin/orders/page";
import AdminOrderDetailPage from "@/app/admin/orders/[id]/page";

const LAGOS = {
  fullName: "Ada Obi",
  phone: "+234 (803) 123-4567",
  line1: "12 Admiralty Way",
  line2: "Flat 3",
  city: "Lekki",
  region: "Lagos",
  postalCode: "106104",
  country: "NG",
};

const nairaOrder = {
  id: "clnaira000000000ab12cd34",
  email: "ada@example.test",
  // ₦45,000 + 2 x ₦25,000 + ₦5,000 shipping
  items: JSON.stringify([
    { slug: "coat", name: "Coat", size: "M", unitPrice: 4_500_000, qty: 1 },
    { slug: "tee", name: "Tee", size: "S", unitPrice: 2_500_000, qty: 2 },
  ]),
  total: 10_000_000,
  currency: "NGN",
  paymentProvider: "paystack",
  shippingAddress: JSON.stringify(LAGOS),
  status: "paid",
  trackingNumber: null,
  notes: null,
  createdAt: new Date("2026-10-13T14:05:00Z"),
  userId: "u1",
};

const legacyOrder = {
  ...nairaOrder,
  id: "cllegacy00000000ef56gh78",
  items: JSON.stringify([{ slug: "coat", name: "Coat", size: "M", unitPrice: 28_500, qty: 1 }]),
  total: 28_500,
  currency: "USD",
  paymentProvider: null,
  shippingAddress: null,
};

beforeEach(() => {
  findUnique.mockReset();
  findMany.mockReset();
});

describe("admin OrderTable (UI-SPEC 7d)", () => {
  const row = {
    id: nairaOrder.id,
    email: nairaOrder.email,
    itemCount: 3,
    status: "paid",
    createdAt: "Oct 13, 2026",
  };

  it("shows each total in its order's currency and who took the payment", () => {
    render(
      <OrderTable
        orders={[
          { ...row, total: 10_000_000, currency: "NGN", paymentProvider: "paystack" },
          { ...row, id: legacyOrder.id, total: 28_500, currency: "USD", paymentProvider: null },
        ]}
      />,
    );
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Order", "Date", "Customer", "Items", "Total", "Paid via", "Status"]);
    const [naira, legacy] = screen.getAllByRole("row").slice(1);
    expect(within(naira).getByText("₦100,000")).toBeTruthy();
    expect(within(naira).getByText("Paystack")).toBeTruthy();
    expect(within(legacy).getByText("$285")).toBeTruthy();
    expect(within(legacy).getByText("—")).toBeTruthy();
  });

  it("maps currency and provider from the order rows", async () => {
    findMany.mockResolvedValue([nairaOrder, legacyOrder]);
    render(await AdminOrdersPage());
    expect(screen.getByText("₦100,000")).toBeTruthy();
    expect(screen.getByText("Paystack")).toBeTruthy();
    expect(screen.getByText("$285")).toBeTruthy();
  });
});

describe("admin order detail (UI-SPEC 7d)", () => {
  async function open(order: typeof nairaOrder | typeof legacyOrder) {
    findUnique.mockResolvedValue(order);
    render(await AdminOrderDetailPage({ params: { id: order.id } }));
  }

  it("shows items, the derived shipping and the total in the order's currency", async () => {
    await open(nairaOrder);
    expect(screen.getByText("₦45,000")).toBeTruthy();
    expect(screen.getByText("Shipping").parentElement!.textContent).toBe("Shipping₦5,000");
    expect(screen.getByText("Total").parentElement!.textContent).toBe("Total₦100,000");
  });

  it("lists the currency and the provider under Payment", async () => {
    await open(nairaOrder);
    const payment = screen.getByRole("heading", { level: 2, name: "Payment" }).nextElementSibling!;
    expect(payment.tagName).toBe("DL");
    expect(payment.textContent).toBe("Currency₦ NGNPaid viaPaystack");
  });

  it("shows the delivery address with a dialable phone link", async () => {
    await open(nairaOrder);
    const heading = screen.getByRole("heading", { level: 2, name: "Delivery address" });
    const block = heading.nextElementSibling as HTMLElement;
    expect(block.textContent).toContain("Ada Obi");
    expect(block.textContent).toContain("Lekki, Lagos 106104");
    expect(block.textContent).toContain("Nigeria");
    const phone = within(block).getByRole("link", { name: "+234 (803) 123-4567" });
    expect(phone.getAttribute("href")).toBe("tel:+2348031234567");
  });

  it("puts the address before Fulfillment", async () => {
    await open(nairaOrder);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s.indexOf("Delivery address")).toBeLessThan(h2s.indexOf("Fulfillment"));
  });

  it("explains a legacy order with no address, paid in dollars via an unknown provider", async () => {
    await open(legacyOrder);
    expect(
      screen.getByText(
        "No delivery address on record. This order was placed before addresses were collected.",
      ),
    ).toBeTruthy();
    const payment = screen.getByRole("heading", { level: 2, name: "Payment" }).nextElementSibling!;
    expect(payment.textContent).toBe("Currency$ USDPaid via—");
    expect(screen.getByText("Shipping").parentElement!.textContent).toBe("ShippingFree");
  });

  it("never turns address text into markup", async () => {
    await open({
      ...nairaOrder,
      shippingAddress: JSON.stringify({ ...LAGOS, line1: "<img src=x onerror=alert(1)>" }),
    });
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(document.querySelector("img[src='x']")).toBeNull();
  });
});
