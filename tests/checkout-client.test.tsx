import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/context/CartContext";

const replace = vi.fn();
const updatePrices = vi.fn();
const trackEvent = vi.fn();
let sessionStatus: "loading" | "authenticated" | "unauthenticated" = "authenticated";
let currency: "NGN" | "USD" | null = "NGN";
let region: string | null = "NG";

const items: CartItem[] = [
  {
    slug: "tote",
    name: "Nostalgia Tote",
    prices: { NGN: 6_750_000, USD: 4_500 },
    image: "",
    size: "One Size",
    qty: 2,
  },
];

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: sessionStatus,
    data: sessionStatus === "authenticated" ? { user: { email: "ada@example.test" } } : null,
  }),
}));
vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    items,
    subtotals: { NGN: 13_500_000, USD: 9_000 },
    updatePrices,
  }),
}));
vi.mock("@/context/CurrencyContext", () => ({ useCurrency: () => ({ currency, region }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));

import CheckoutClient from "@/components/checkout/CheckoutClient";
import CheckoutPage from "@/app/checkout/page";

const PROVIDERS = { NGN: "paystack", USD: "stripe" } as const;
const fetchMock = vi.fn();

function mount(props: Partial<Parameters<typeof CheckoutClient>[0]> = {}) {
  return render(<CheckoutClient providers={PROVIDERS} payment={null} {...props} />);
}

function fillLagos() {
  const set = (label: RegExp, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  set(/full name/i, "Ada Obi");
  set(/^phone/i, "+234 803 123 4567");
  set(/address line 1/i, "12 Admiralty Way");
  set(/^city/i, "Lekki");
  set(/^state$/i, "Lagos");
}

const submit = () =>
  act(async () => {
    fireEvent.submit(document.getElementById("checkout-form")!);
  });

function reply(status: number, body: unknown) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  sessionStatus = "authenticated";
  currency = "NGN";
  region = "NG";
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  replace.mockReset();
  updatePrices.mockReset();
  trackEvent.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("CheckoutClient", () => {
  it("sends a signed-out visitor to sign in", () => {
    sessionStatus = "unauthenticated";
    mount();
    expect(replace).toHaveBeenCalledWith("/signin?callbackUrl=/checkout");
    expect(screen.getByText("Preparing checkout…")).toBeTruthy();
  });

  it("prices the bag in the shopper's currency, with shipping for Nigeria by default", () => {
    mount();
    // The line (2 x ₦67,500) and the subtotal.
    expect(screen.getAllByText("₦135,000")).toHaveLength(2);
    expect(screen.getByText("Paying in ₦ NGN")).toBeTruthy();
    expect(screen.getByText("Within Nigeria")).toBeTruthy();
    expect(screen.getByText("₦5,000")).toBeTruthy();
    expect(screen.getByText("₦140,000")).toBeTruthy();
  });

  it("re-prices shipping when the country changes", () => {
    mount();
    fireEvent.change(screen.getByLabelText(/^country/i), { target: { value: "GB" } });
    expect(screen.getByText("International · United Kingdom")).toBeTruthy();
    expect(screen.getByText("₦60,000")).toBeTruthy();
  });

  it("starts the destination at the ship-to region, with its shipping (D-33)", () => {
    region = "GH";
    currency = "USD";
    mount();
    expect((screen.getByLabelText(/^country/i) as HTMLSelectElement).value).toBe("GH");
    expect(screen.getByText("International · Ghana")).toBeTruthy();
    expect(screen.getByText("$40")).toBeTruthy();
  });

  it("keeps the destination the form shows when the region changes later", () => {
    region = "GH";
    const { rerender } = mount();
    region = "NG";
    rerender(<CheckoutClient providers={PROVIDERS} payment={null} />);
    expect((screen.getByLabelText(/^country/i) as HTMLSelectElement).value).toBe("GH");
    expect(screen.getByText("International · Ghana")).toBeTruthy();
    expect(screen.getByText("₦60,000")).toBeTruthy();
  });

  it("names the provider the server chose, never guessing from the currency", () => {
    currency = "USD";
    mount({ providers: { NGN: "paystack", USD: "paystack" } });
    expect(screen.getByText("Secure checkout · Paystack")).toBeTruthy();
    expect(screen.queryByText(/test mode/i)).toBeNull();
  });

  it("posts the bag, currency, address and the total it showed", async () => {
    reply(200, { url: "https://checkout.paystack.test/abc" });
    mount();
    fillLagos();
    await submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/checkout");
    expect(JSON.parse(init.body)).toEqual({
      items: [{ slug: "tote", size: "One Size", qty: 2 }],
      currency: "NGN",
      address: {
        fullName: "Ada Obi",
        phone: "+234 803 123 4567",
        line1: "12 Admiralty Way",
        city: "Lekki",
        region: "Lagos",
        country: "NG",
      },
      expectedTotal: 14_000_000,
    });
    expect(screen.getByRole("button", { name: "Redirecting to Paystack…" })).toBeTruthy();
  });

  it("doesn't call the server while the address is incomplete", async () => {
    mount();
    await submit();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes bag prices and explains when the server says prices changed", async () => {
    const prices = [{ slug: "tote", NGN: 7_000_000, USD: 4_700 }];
    reply(409, { error: "price_changed", prices });
    mount();
    fillLagos();
    await submit();
    expect(updatePrices).toHaveBeenCalledWith(prices);
    expect(screen.getByRole("alert").textContent).toBe(
      "Some prices have changed since you added these items. Review your bag and try again.",
    );
    expect(screen.getByRole("button", { name: "Pay now" })).toBeTruthy();
  });

  it("shows the server's field errors inline", async () => {
    reply(400, { error: "invalid_address", fields: { phone: "invalid" } });
    mount();
    fillLagos();
    await submit();
    await waitFor(() =>
      expect(
        screen.getByText("Use digits, spaces, + or dashes, for example +234 803 123 4567."),
      ).toBeTruthy(),
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "We couldn't use that address. Check the highlighted fields and try again.",
    );
  });

  it.each([
    [503, "payments_unavailable", "Payments are temporarily unavailable. You haven't been charged. Please try again shortly."],
    [502, "payment_provider_error", "We couldn't reach the payment provider. You haven't been charged. Please try again."],
    [500, "server_misconfigured", "Something went wrong starting checkout. You haven't been charged. Please try again."],
  ])("explains a %i %s", async (status, error, message) => {
    reply(status, { error });
    mount();
    fillLagos();
    await submit();
    expect(screen.getByRole("alert").textContent).toBe(message);
  });

  it("reports begin_checkout with the currency and no address data", () => {
    mount();
    expect(trackEvent).toHaveBeenCalledWith("begin_checkout", {
      itemCount: 1,
      amount: 13_500_000,
      currency: "NGN",
    });
  });

  it("shows the payment notice it was given", () => {
    mount({ payment: "cancelled" });
    expect(screen.getByText("Payment cancelled")).toBeTruthy();
  });

  it("frees the Pay button when the shopper comes back with Back", async () => {
    reply(200, { url: "https://checkout.paystack.test/abc" });
    mount();
    fillLagos();
    await submit();
    act(() => {
      const e = new Event("pageshow") as PageTransitionEvent;
      Object.defineProperty(e, "persisted", { value: true });
      window.dispatchEvent(e);
    });
    expect(screen.getByRole("button", { name: "Pay now" })).toBeTruthy();
  });
});

describe("/checkout page (server)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("evaluates the providers on the server and passes a known payment notice", () => {
    vi.stubEnv("USD_PAYMENT_PROVIDER", "paystack");
    const el = CheckoutPage({ searchParams: { payment: "failed" } });
    expect(el.props).toEqual({ providers: { NGN: "paystack", USD: "paystack" }, payment: "failed" });
  });

  it.each([["weird"], [["failed", "cancelled"]], [undefined]])(
    "drops an unknown payment value %j",
    (payment) => {
      const el = CheckoutPage({ searchParams: { payment } as { payment?: string } });
      expect(el.props.payment).toBeNull();
      expect(el.props.providers).toEqual({ NGN: "paystack", USD: "stripe" });
    },
  );
});
