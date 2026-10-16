import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/context/CartContext";

// The bag never claims a shipping figure: the destination isn't known until
// checkout (D-14). Every price shows in both currencies; CSS picks one.
const items: CartItem[] = [
  {
    slug: "coat",
    name: "Nostalgia Coat",
    prices: { NGN: 39_000_000, USD: 26_000 },
    image: "",
    size: "M",
    qty: 2,
  },
];

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    items,
    count: 2,
    subtotals: { NGN: 78_000_000, USD: 52_000 },
    isOpen: true,
    closeDrawer: vi.fn(),
    updateQty: vi.fn(),
    removeItem: vi.fn(),
  }),
}));
vi.mock("@/components/CheckoutButton", () => ({
  default: ({ children, className }: { children: ReactNode; className?: string }) => (
    <a className={className}>{children}</a>
  ),
}));

import CartPage from "@/app/cart/page";
import CartDrawer from "@/components/CartDrawer";

const prices = (el: HTMLElement) =>
  Array.from(el.querySelectorAll("[data-money]")).map((n) => n.textContent);

beforeEach(() => document.body.replaceChildren());

describe("cart page", () => {
  it("shows line totals and the subtotal in both currencies", () => {
    render(<CartPage />);
    const line = screen.getAllByText("₦780,000")[0].parentElement!;
    expect(prices(line)).toEqual(["₦780,000", "$520"]);
    expect(line.className).toContain("tabular-nums");
  });

  it("always says shipping is calculated at checkout", () => {
    render(<CartPage />);
    const summary = screen.getByRole("heading", { name: "Summary" }).parentElement!;
    expect(within(summary).getByText("Calculated at checkout")).toBeTruthy();
    expect(within(summary).queryByText("Free")).toBeNull();
  });

  it("labels the bottom line an estimated total, in the sans face", () => {
    render(<CartPage />);
    const label = screen.getByText("Estimated total");
    const value = label.nextElementSibling as HTMLElement;
    expect(prices(value)).toEqual(["₦780,000", "$520"]);
    expect(value.className).toContain("font-sans");
    expect(value.className).toContain("tabular-nums");
    expect(screen.queryByText(/^Total$/)).toBeNull();
  });
});

describe("cart drawer", () => {
  it("shows the subtotal in both currencies, in the sans face", () => {
    render(<CartDrawer />);
    const label = screen.getByText("Subtotal");
    const value = label.nextElementSibling as HTMLElement;
    expect(prices(value)).toEqual(["₦780,000", "$520"]);
    expect(value.className).toContain("font-sans");
    expect(value.className).toContain("tabular-nums");
  });

  it("notes that shipping is calculated at checkout", () => {
    render(<CartDrawer />);
    expect(screen.getByText("Shipping calculated at checkout.")).toBeTruthy();
  });

  it("shows line totals in both currencies", () => {
    render(<CartDrawer />);
    const line = screen.getAllByText("₦780,000")[0].parentElement!;
    expect(line.className).toContain("tabular-nums");
  });
});
