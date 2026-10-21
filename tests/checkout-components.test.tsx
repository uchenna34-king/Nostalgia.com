import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddressForm from "@/components/checkout/AddressForm";
import OrderSummary from "@/components/checkout/OrderSummary";
import PaymentNotice from "@/components/checkout/PaymentNotice";
import { checkoutErrorMessage } from "@/components/checkout/messages";

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("AddressForm", () => {
  it("renders the eight fields with their autocomplete tokens", () => {
    render(<AddressForm onValidSubmit={vi.fn()} disabled={false} />);
    const expected: [RegExp, string][] = [
      [/full name/i, "name"],
      [/^phone/i, "tel"],
      [/^country/i, "country"],
      [/address line 1/i, "address-line1"],
      [/address line 2/i, "address-line2"],
      [/^city/i, "address-level2"],
      [/^state/i, "address-level1"],
      [/postal code/i, "postal-code"],
    ];
    for (const [label, token] of expected) {
      expect(screen.getByLabelText(label).getAttribute("autocomplete")).toBe(token);
    }
    expect((screen.getByLabelText(/^country/i) as HTMLSelectElement).value).toBe("NG");
  });

  it("swaps the Nigerian state select for free text and clears it", () => {
    const onCountry = vi.fn();
    render(<AddressForm onValidSubmit={vi.fn()} onCountryChange={onCountry} disabled={false} />);
    expect(screen.getByLabelText(/^state$/i).tagName).toBe("SELECT");
    fireEvent.change(screen.getByLabelText(/^state$/i), { target: { value: "Lagos" } });
    fill(/^country/i, "GB");
    expect(onCountry).toHaveBeenCalledWith("GB");
    const region = screen.getByLabelText(/state \/ region/i) as HTMLInputElement;
    expect(region.tagName).toBe("INPUT");
    expect(region.value).toBe("");
  });

  it("starts at the ship-to region it is given, falling back to Nigeria (D-33)", () => {
    const { unmount } = render(<AddressForm initialCountry="GH" onValidSubmit={vi.fn()} disabled={false} />);
    expect((screen.getByLabelText(/^country/i) as HTMLSelectElement).value).toBe("GH");
    expect(screen.getByLabelText(/state \/ region/i).tagName).toBe("INPUT");
    unmount();

    for (const junk of ["KP", "gh", "ZZ", ""]) {
      const r = render(<AddressForm initialCountry={junk} onValidSubmit={vi.fn()} disabled={false} />);
      expect((screen.getByLabelText(/^country/i) as HTMLSelectElement).value, junk).toBe("NG");
      r.unmount();
    }
  });

  it("an invalid submit shows errors, focuses the first and does not submit", () => {
    const onValid = vi.fn();
    render(<AddressForm onValidSubmit={onValid} disabled={false} />);
    act(() => {
      fireEvent.submit(document.getElementById("checkout-form")!);
    });
    expect(onValid).not.toHaveBeenCalled();
    expect(screen.getByText("Enter your full name.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/full name/i));
    expect(screen.getByLabelText(/full name/i).getAttribute("aria-invalid")).toBe("true");
  });

  it("a valid submit passes the normalised address", () => {
    const onValid = vi.fn();
    render(<AddressForm onValidSubmit={onValid} disabled={false} />);
    fill(/full name/i, " Ada Obi ");
    fill(/^phone/i, "08031234567");
    fill(/address line 1/i, "12 Admiralty Way");
    fill(/^city/i, "Lekki");
    fireEvent.change(screen.getByLabelText(/^state$/i), { target: { value: "Lagos" } });
    act(() => {
      fireEvent.submit(document.getElementById("checkout-form")!);
    });
    expect(onValid).toHaveBeenCalledWith({
      fullName: "Ada Obi",
      phone: "08031234567",
      line1: "12 Admiralty Way",
      city: "Lekki",
      region: "Lagos",
      country: "NG",
    });
  });
});

describe("OrderSummary", () => {
  const base = {
    currency: "NGN" as const,
    subtotal: 4_500_000,
    shipping: 500_000,
    total: 5_000_000,
    country: "NG",
    provider: "paystack" as const,
    loading: false,
    error: null,
  };

  it("shows the currency, zone, amounts and provider", () => {
    render(<OrderSummary {...base} />);
    expect(screen.getByText("Paying in ₦ NGN")).toBeTruthy();
    expect(screen.getByText("Within Nigeria")).toBeTruthy();
    expect(screen.getByText("₦5,000")).toBeTruthy();
    expect(screen.getByText("₦50,000")).toBeTruthy();
    expect(screen.getByText("Secure checkout · Paystack")).toBeTruthy();
    const pay = screen.getByRole("button", { name: "Pay now" });
    expect(pay.getAttribute("form")).toBe("checkout-form");
    expect(pay.getAttribute("type")).toBe("submit");
  });

  it("shows Free, the international zone, the busy label and errors", () => {
    render(
      <OrderSummary {...base} currency="USD" country="GB" shipping={0} provider="stripe" loading error="Oops" />,
    );
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getByText("International · United Kingdom")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Redirecting to Stripe…" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Oops");
  });
});

describe("PaymentNotice", () => {
  it("renders the calm copy for each kind and focuses itself", () => {
    const { rerender } = render(<PaymentNotice kind="cancelled" />);
    expect(screen.getByText("Payment cancelled")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("status"));
    rerender(<PaymentNotice kind="failed" />);
    expect(screen.getByText("Payment didn't go through")).toBeTruthy();
    rerender(<PaymentNotice kind="pending" />);
    expect(screen.getByText("Confirming your payment")).toBeTruthy();
  });

  it("renders nothing for unknown kinds", () => {
    const { container } = render(<PaymentNotice kind="hacked" />);
    expect(container.innerHTML).toBe("");
  });
});

describe("checkoutErrorMessage", () => {
  it("maps known codes and falls back to the generic line", () => {
    expect(checkoutErrorMessage("payments_unavailable")).toContain("temporarily unavailable");
    expect(checkoutErrorMessage("nope")).toBe(
      "Something went wrong starting checkout. You haven't been charged. Please try again.",
    );
    expect(checkoutErrorMessage(null)).toContain("Something went wrong");
  });
});
