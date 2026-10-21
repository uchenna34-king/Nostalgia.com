import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const replace = vi.fn();
let pathname = "/";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
  usePathname: () => pathname,
}));

import { CurrencyProvider } from "@/context/CurrencyContext";
import RegionPicker from "@/components/RegionPicker";
import { deliveryLine } from "@/components/RegionDialog";

// The region and currency picker (D-33, 12-REGION-SPEC.md), through the real
// CurrencyProvider: what it reads on mount, the dialog's rules, and what Save
// writes.

const root = document.documentElement;

function clearCookies() {
  for (const c of document.cookie.split("; ")) {
    const name = c.split("=")[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`;
  }
}

/** The state the middleware and before-paint scripts leave behind. */
function arrive(region: string | null, currency: "NGN" | "USD" | null) {
  if (region) document.cookie = `nostalgia-region=${region}; Path=/`;
  if (currency) {
    document.cookie = `nostalgia-currency=${currency}; Path=/`;
    root.setAttribute("data-currency", currency);
  }
}

function mount(variant: "bar" | "menu" | "footer" = "footer") {
  return render(
    <CurrencyProvider>
      <RegionPicker variant={variant} />
    </CurrencyProvider>,
  );
}

const trigger = () => screen.getByRole("button", { name: /change region and currency|ship to/i });
const dialog = () => screen.getByRole("dialog", { name: "Region and currency" });
const select = () => within(dialog()).getByLabelText("Ship to") as HTMLSelectElement;
const radio = (name: RegExp) => within(dialog()).getByRole("radio", { name }) as HTMLInputElement;
const save = () => act(() => fireEvent.click(within(dialog()).getByRole("button", { name: "Save" })));
const openDialog = () => act(() => fireEvent.click(trigger()));
const pickCountry = (code: string) => act(() => fireEvent.change(select(), { target: { value: code } }));

beforeEach(() => {
  refresh.mockReset();
  replace.mockReset();
  pathname = "/";
  clearCookies();
  root.removeAttribute("data-currency");
  root.removeAttribute("data-zone");
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  root.removeAttribute("data-currency");
  root.removeAttribute("data-zone");
  document.body.style.overflow = "";
});

describe("triggers", () => {
  it("bar: the code and symbol, with a label that starts with all of its visible text", () => {
    arrive("NG", "NGN");
    mount("bar");
    const b = screen.getByRole("button", { name: /^NG · ₦ NGN, ship to Nigeria, prices in Nigerian naira$/ });
    expect(b.getAttribute("aria-haspopup")).toBe("dialog");
    // "NG · ₦" from lg, "NG · ₦ NGN" from xl: the longer text is a prefix of the label.
    expect(b.textContent).toBe("NG · ₦ NGN");
  });

  it("menu: the full sentence and Change, honouring the sheet's tabIndex", () => {
    arrive("GH", "USD");
    render(
      <CurrencyProvider>
        <RegionPicker variant="menu" tabIndex={-1} />
      </CurrencyProvider>,
    );
    const b = screen.getByRole("button", { name: "Ship to Ghana · $ USD, change region and currency" });
    expect(b.textContent).toBe("Ship to Ghana · $ USDChange");
    expect(b.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByText("Region and currency")).toBeTruthy();
  });

  it("footer: the full sentence", () => {
    arrive("US", "USD");
    mount("footer");
    expect(trigger().textContent).toBe("Ship to United States · $ USD");
  });

  it("with no cookies, shows Nigeria and naira (local dev, cookies blocked)", () => {
    mount("footer");
    expect(trigger().textContent).toBe("Ship to Nigeria · ₦ NGN");
  });

  it("re-applies the zone from the allow-listed region on mount", () => {
    arrive("GH", "USD");
    mount();
    expect(root.getAttribute("data-zone")).toBe("international");

    clearCookies();
    root.setAttribute("data-zone", "international"); // the script saw "ZZ"
    document.cookie = "nostalgia-region=ZZ; Path=/";
    mount();
    expect(root.hasAttribute("data-zone")).toBe(false);
  });
});

describe("the dialog", () => {
  it("opens with the saved choice, focus on the country, and locks scroll", () => {
    arrive("NG", "NGN");
    mount();
    openDialog();
    expect(select().value).toBe("NG");
    expect(radio(/NGN/).checked).toBe(true);
    expect(document.activeElement).toBe(select());
    expect(document.body.style.overflow).toBe("hidden");
    expect(dialog().getAttribute("aria-modal")).toBe("true");
    // Portalled out of the trigger's container, straight onto <body>.
    expect(dialog().closest("body > *")).not.toBe(trigger().closest("body > *"));
    expect(within(dialog()).getByText("Prices, delivery and checkout use this currency.")).toBeTruthy();
  });

  it("lists Nigeria first, then every other shippable country", () => {
    mount();
    openDialog();
    const codes = [...select().options].map((o) => o.value);
    expect(codes[0]).toBe("NG");
    expect(codes).toContain("GH");
    expect(codes).not.toContain("KP");
  });

  it("shows the delivery fee for the chosen country and currency", () => {
    arrive("NG", "NGN");
    mount();
    openDialog();
    const line = within(dialog()).getByText(/^Delivery to/);
    expect(line.textContent).toBe("Delivery to Nigeria: ₦5,000, free on orders over ₦250,000.");
    expect(select().getAttribute("aria-describedby")).toBe(line.id);
    expect(line.getAttribute("aria-live")).toBe("polite");
    pickCountry("GH");
    expect(line.textContent).toBe("Delivery to Ghana: $40, free on orders over $500.");
  });

  it("moves the currency with the country until the shopper picks one", () => {
    arrive("NG", "NGN");
    mount();
    openDialog();
    pickCountry("GH");
    expect(radio(/USD/).checked).toBe(true);
    pickCountry("NG");
    expect(radio(/NGN/).checked).toBe(true);

    act(() => fireEvent.click(radio(/USD/)));
    pickCountry("GH");
    pickCountry("NG");
    expect(radio(/USD/).checked).toBe(true); // picked: left alone
  });

  it("counts choosing the currency that's already on as a pick", () => {
    arrive("NG", "NGN");
    mount();
    openDialog();
    act(() => fireEvent.click(radio(/NGN/)));
    pickCountry("GH");
    expect(radio(/NGN/).checked).toBe(true);
  });

  it("treats a saved currency that isn't its country's usual one as picked", () => {
    arrive("NG", "USD");
    mount();
    openDialog();
    pickCountry("GH");
    pickCountry("NG");
    expect(radio(/USD/).checked).toBe(true);
  });

  it("names each currency chip in full", () => {
    mount();
    openDialog();
    expect(radio(/^₦ NGN\s*Nigerian naira$/)).toBeTruthy();
    expect(radio(/^\$ USD\s*US dollars$/)).toBeTruthy();
  });

  it("Escape, the backdrop and × close without saving, and focus returns to the trigger", () => {
    arrive("NG", "NGN");
    mount();
    const closers = [
      () => fireEvent.keyDown(document, { key: "Escape" }),
      () => fireEvent.click(document.querySelector(".bg-ink\\/40")!),
      () => fireEvent.click(within(dialog()).getByRole("button", { name: "Close region and currency" })),
    ];
    for (const close of closers) {
      act(() => trigger().focus());
      openDialog();
      pickCountry("GH");
      act(close);
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger());
      expect(document.body.style.overflow).toBe("");
    }
    expect(document.cookie).not.toContain("nostalgia-region=GH");
    expect(trigger().textContent).toBe("Ship to Nigeria · ₦ NGN");
  });

  it("traps Tab inside the panel", () => {
    mount();
    openDialog();
    const close = within(dialog()).getByRole("button", { name: "Close region and currency" });
    const saveButton = within(dialog()).getByRole("button", { name: "Save" });
    act(() => saveButton.focus());
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(saveButton);
  });

  it("delivery copy says Free only when a fee is zero", () => {
    expect(deliveryLine("GB", "NGN")).toBe("Delivery to United Kingdom: ₦60,000, free on orders over ₦750,000.");
    expect(deliveryLine("NG", "USD")).toBe("Delivery to Nigeria: $5, free on orders over $200.");
  });
});

describe("Save", () => {
  it("writes both cookies, both attributes and the trigger, then announces", () => {
    arrive("NG", "NGN");
    mount();
    act(() => trigger().focus());
    openDialog();
    pickCountry("GH");
    save();

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.cookie).toContain("nostalgia-region=GH");
    expect(document.cookie).toContain("nostalgia-currency=USD");
    expect(root.getAttribute("data-currency")).toBe("USD");
    expect(root.getAttribute("data-zone")).toBe("international");
    expect(trigger().textContent).toBe("Ship to Ghana · $ USD");
    expect(document.activeElement).toBe(trigger());
    expect(screen.getByRole("status").textContent).toBe(
      "Now shipping to Ghana, with prices in US dollars ($ USD).",
    );

    openDialog();
    pickCountry("NG");
    save();
    expect(root.hasAttribute("data-zone")).toBe(false);
    expect(root.getAttribute("data-currency")).toBe("NGN");
    expect(screen.getByRole("status").textContent).toBe(
      "Now shipping to Nigeria, with prices in Nigerian naira (₦ NGN).",
    );
  });

  it("with nothing changed, just closes", () => {
    arrive("NG", "NGN");
    mount();
    clearCookies();
    openDialog();
    pickCountry("GH");
    pickCountry("NG");
    save();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.cookie).toBe("");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("re-runs a priced listing only when the currency changed, dropping a stale price range", () => {
    pathname = "/shop";
    arrive("NG", "NGN");
    window.history.replaceState(null, "", "/shop?sort=price-asc&price=10-50&page=2");
    mount();

    // Region only, currency kept (picked): no re-run.
    openDialog();
    act(() => fireEvent.click(radio(/NGN/)));
    pickCountry("GH");
    save();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    openDialog();
    act(() => fireEvent.click(radio(/USD/)));
    save();
    expect(replace).toHaveBeenCalledWith("/shop?sort=price-asc", { scroll: false });

    window.history.replaceState(null, "", "/shop?sort=new");
    openDialog();
    act(() => fireEvent.click(radio(/NGN/)));
    save();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("doesn't re-run pages that aren't priced listings", () => {
    pathname = "/product/tote";
    arrive("NG", "NGN");
    mount();
    openDialog();
    pickCountry("US");
    save();
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
