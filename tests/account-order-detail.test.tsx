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
