import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import OrderDetail from "@/components/account/OrderDetail";

expect.extend(toHaveNoViolations);

const baseOrder = {
  id: "clabcdef1234567890",
  status: "paid",
  total: 28500,
  trackingNumber: null as string | null,
  createdAt: new Date("2026-08-01T10:00:00Z"),
  items: JSON.stringify([
    { slug: "sepia-wool-overcoat", name: "Sepia Wool Overcoat", size: "M", unitPrice: 28500, qty: 1, image: "/products/coat.svg" },
  ]),
};

describe("OrderDetail", () => {
  it("shows the #last8 order reference", () => {
    render(<OrderDetail order={baseOrder} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("#34567890");
  });

  it("renders items, size, qty and a no-cents total", () => {
    render(<OrderDetail order={baseOrder} />);
    expect(screen.getByText("Sepia Wool Overcoat", { exact: false })).toBeTruthy();
    // formatPrice is .toFixed(0) — no cents.
    expect(screen.getAllByText("$285").length).toBeGreaterThan(0);
  });

  it("shows the status as a text label, not colour alone", () => {
    render(<OrderDetail order={baseOrder} />);
    expect(screen.getByText("Paid")).toBeTruthy();
  });

  it("hides the tracking block when there is no tracking number", () => {
    render(<OrderDetail order={baseOrder} />);
    expect(screen.queryByText("Tracking number")).toBeNull();
  });

  it("shows the tracking block only when a tracking number is present", () => {
    render(<OrderDetail order={{ ...baseOrder, trackingNumber: "NL123456789" }} />);
    expect(screen.getByText("Tracking number")).toBeTruthy();
    expect(screen.getByText("NL123456789")).toBeTruthy();
  });

  it("has no heading-order skip (h1 then h2)", () => {
    render(<OrderDetail order={baseOrder} />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(0);
  });

  it("has no axe violations", async () => {
    const { container } = render(<OrderDetail order={baseOrder} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

const LAGOS = {
  fullName: "Ada Obi",
  phone: "+234 803 123 4567",
  line1: "12 Admiralty Way",
  line2: "Flat 3",
  city: "Lekki",
  region: "Lagos",
  postalCode: "106104",
  country: "NG",
};

const nairaOrder = {
  ...baseOrder,
  currency: "NGN",
  // ₦45,000 + 2 x ₦25,000 + ₦5,000 shipping
  items: JSON.stringify([
    { slug: "coat", name: "Coat", size: "M", unitPrice: 4_500_000, qty: 1 },
    { slug: "tee", name: "Tee", size: "S", unitPrice: 2_500_000, qty: 2 },
  ]),
  total: 10_000_000,
  shippingAddress: JSON.stringify(LAGOS),
};

describe("OrderDetail in the order's currency (D-26)", () => {
  it("shows items, shipping and the total in naira for a naira order", () => {
    render(<OrderDetail order={nairaOrder} />);
    expect(screen.getByText("₦45,000")).toBeTruthy();
    expect(screen.getByText("₦50,000")).toBeTruthy();
    const shipping = screen.getByText("Shipping").parentElement!;
    expect(shipping.textContent).toBe("Shipping₦5,000");
    const total = screen.getByText("Total").parentElement!;
    expect(total.textContent).toBe("Total₦100,000");
  });

  it("shows free shipping when the lines make up the whole total", () => {
    render(<OrderDetail order={baseOrder} />);
    expect(screen.getByText("Shipping").parentElement!.textContent).toBe("ShippingFree");
  });

  it("shows the delivery address, name first, country by name", () => {
    render(<OrderDetail order={nairaOrder} />);
    const heading = screen.getByRole("heading", { level: 2, name: "Delivery address" });
    const block = heading.parentElement!;
    for (const line of ["Ada Obi", "12 Admiralty Way", "Flat 3", "Lekki, Lagos 106104", "Nigeria", "+234 803 123 4567"]) {
      expect(block.textContent).toContain(line);
    }
    expect(screen.getByText("Ada Obi").className).toContain("text-ink");
    // Plain text for the customer: no tel: link here.
    expect(block.querySelector("a")).toBeNull();
  });

  it("omits the address block entirely for a legacy order", () => {
    render(<OrderDetail order={baseOrder} />);
    expect(screen.queryByText("Delivery address")).toBeNull();
  });

  it("never shows the customer which provider took the payment", () => {
    // A full Prisma row also carries the provider; the page passes it as is.
    const fullRow = { ...nairaOrder, paymentProvider: "paystack" };
    render(<OrderDetail order={fullRow} />);
    expect(screen.queryByText(/paystack/i)).toBeNull();
  });

  it("has no axe violations with an address", async () => {
    const { container } = render(<OrderDetail order={nairaOrder} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
