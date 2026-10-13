import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Money, { CurrencySymbol } from "@/components/Money";

describe("<Money>", () => {
  it("renders both currencies as sibling spans with no wrapper", () => {
    const { container } = render(
      <p>
        <Money amounts={{ NGN: 4_500_000, USD: 3_500 }} className="tabular-nums" />
      </p>,
    );
    const p = container.querySelector("p")!;
    expect(p.children).toHaveLength(2);
    const ngn = p.querySelector('[data-money="NGN"]')!;
    const usd = p.querySelector('[data-money="USD"]')!;
    expect(ngn.textContent).toBe("₦45,000");
    expect(usd.textContent).toBe("$35");
    expect(ngn.className).toBe("tabular-nums");
    expect(usd.className).toBe("tabular-nums");
  });

  it("renders the symbol pair", () => {
    const { container } = render(<CurrencySymbol />);
    expect(container.querySelector('[data-money="NGN"]')!.textContent).toBe("₦");
    expect(container.querySelector('[data-money="USD"]')!.textContent).toBe("$");
  });
});
