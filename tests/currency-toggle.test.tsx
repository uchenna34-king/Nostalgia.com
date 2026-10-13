import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const replace = vi.fn();
let pathname = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
  usePathname: () => pathname,
}));

import { CurrencyProvider } from "@/context/CurrencyContext";
import CurrencyToggle from "@/components/CurrencyToggle";

function renderToggle(variant: "bar" | "menu" = "menu") {
  return render(
    <CurrencyProvider>
      <CurrencyToggle variant={variant} />
    </CurrencyProvider>,
  );
}

const ngn = () => screen.getByRole("button", { name: /₦ NGN/ });
const usd = () => screen.getByRole("button", { name: /\$ USD/ });

beforeEach(() => {
  refresh.mockReset();
  replace.mockReset();
  pathname = "/";
  document.documentElement.removeAttribute("data-currency");
  document.cookie = "nostalgia-currency=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/";
  window.history.replaceState(null, "", "/");
});

afterEach(() => document.documentElement.removeAttribute("data-currency"));

describe("CurrencyToggle", () => {
  it("reads the active currency from <html> after mount (absent = NGN)", () => {
    renderToggle();
    expect(ngn().getAttribute("aria-pressed")).toBe("true");
    expect(usd().getAttribute("aria-pressed")).toBe("false");
  });

  it("switching writes the cookie, flips the attribute and announces it", () => {
    renderToggle();
    act(() => fireEvent.click(usd()));
    expect(document.cookie).toContain("nostalgia-currency=USD");
    expect(document.documentElement.getAttribute("data-currency")).toBe("USD");
    expect(usd().getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Prices now shown in US dollars ($ USD).");
    expect(refresh).not.toHaveBeenCalled(); // not a priced listing
  });

  it("clicking the active currency does nothing", () => {
    renderToggle();
    act(() => fireEvent.click(ngn()));
    expect(document.cookie).not.toContain("nostalgia-currency=");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("refreshes the shop, and drops a stale price range", () => {
    pathname = "/shop";
    renderToggle("bar");
    act(() => fireEvent.click(usd()));
    expect(refresh).toHaveBeenCalledTimes(1);

    document.documentElement.removeAttribute("data-currency");
    window.history.replaceState(null, "", "/shop?sort=price-asc&price=10-50&page=2");
    renderToggle("bar");
    act(() => fireEvent.click(screen.getAllByRole("button", { name: /\$ USD/ }).at(-1)!));
    expect(replace).toHaveBeenCalledWith("/shop?sort=price-asc", { scroll: false });
  });
});
