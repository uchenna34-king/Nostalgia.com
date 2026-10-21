import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// /order/success is presentational: it reads the order reference, the demo
// flag and the order's currency from the URL the payment route built, empties
// the bag and records one `purchase` (D-09, D-27). The currency is passed
// through parseCurrency, so a hand-edited URL can't put arbitrary text into
// analytics.
let query = "";
const clear = vi.fn();
const trackEvent = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(query),
}));
vi.mock("@/context/CartContext", () => ({
  useCart: () => ({ clear }),
}));
vi.mock("@/lib/analytics", () => ({
  trackEvent: (...a: unknown[]) => trackEvent(...a),
}));

import OrderSuccessPage from "@/app/order/success/page";

const ORDER_ID = "cmorder0000000000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  query = "";
});

describe("/order/success", () => {
  it.each(["NGN", "USD"])("records one purchase in %s", (currency) => {
    query = `order=${ORDER_ID}&currency=${currency}`;
    const { rerender } = render(<OrderSuccessPage />);
    rerender(<OrderSuccessPage />);
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith("purchase", {
      orderId: ORDER_ID,
      demo: false,
      currency,
    });
  });

  it("marks a demo order as one", () => {
    query = `order=${ORDER_ID}&demo=1&currency=NGN`;
    render(<OrderSuccessPage />);
    expect(trackEvent).toHaveBeenCalledWith("purchase", {
      orderId: ORDER_ID,
      demo: true,
      currency: "NGN",
    });
    expect(screen.getByText(/no payment was charged/)).toBeTruthy();
  });

  it.each(["EUR", "ngn", "", "NGN<script>"])(
    "leaves out a currency that isn't one of ours (%j)",
    (currency) => {
      query = `order=${ORDER_ID}&currency=${encodeURIComponent(currency)}`;
      render(<OrderSuccessPage />);
      expect(trackEvent).toHaveBeenCalledWith("purchase", { orderId: ORDER_ID, demo: false });
    },
  );

  it("leaves out the currency when the URL has none", () => {
    query = `order=${ORDER_ID}`;
    render(<OrderSuccessPage />);
    expect(trackEvent).toHaveBeenCalledWith("purchase", { orderId: ORDER_ID, demo: false });
  });

  it("records nothing without an order reference", () => {
    query = "currency=NGN";
    render(<OrderSuccessPage />);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("empties the bag and shows the short reference", () => {
    query = `order=${ORDER_ID}&currency=NGN`;
    render(<OrderSuccessPage />);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(screen.getByText(`Order reference: ${ORDER_ID.slice(-8)}`)).toBeTruthy();
  });
});
