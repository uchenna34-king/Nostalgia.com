import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createProduct = vi.fn();
const updateProduct = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/admin/products/actions", () => ({
  createProduct: (...a: unknown[]) => createProduct(...a),
  updateProduct: (...a: unknown[]) => updateProduct(...a),
  deleteProduct: vi.fn(),
}));

import ProductForm from "@/components/admin/ProductForm";
import ProductTable from "@/components/admin/ProductTable";

const ngn = () => screen.getByLabelText("Price (₦)") as HTMLInputElement;
const usd = () => screen.getByLabelText("Price ($), optional") as HTMLInputElement;
const type = (el: HTMLInputElement, value: string) =>
  fireEvent.change(el, { target: { value } });

beforeEach(() => {
  createProduct.mockReset();
  updateProduct.mockReset();
});

describe("ProductForm prices (D-07)", () => {
  it("labels both price inputs and requires only the naira one", () => {
    render(<ProductForm collections={[]} usdNgnRate={1500} />);
    expect(ngn().id).toBe("pf-price-ngn");
    expect(ngn().required).toBe(true);
    expect(usd().id).toBe("pf-price-usd");
    expect(usd().required).toBe(false);
    expect(screen.getByText("Whole naira, no commas. Example: 45000.")).toBeTruthy();
    expect(screen.queryByText(/Price \(cents\)/)).toBeNull();
  });

  it("previews the auto dollar price at the store rate while $ is blank", () => {
    render(<ProductForm collections={[]} usdNgnRate={1500} />);
    expect(
      screen.getByText(
        "Leave blank to price this automatically from the naira price at the store rate.",
      ),
    ).toBeTruthy();
    type(ngn(), "45000");
    expect(
      screen.getByText("Leave blank to use the store rate: $30 (₦1,500 = $1)."),
    ).toBeTruthy();
    type(ngn(), "45001");
    expect(
      screen.getByText("Leave blank to use the store rate: $31 (₦1,500 = $1)."),
    ).toBeTruthy();
  });

  it("says a typed dollar price is fixed", () => {
    render(<ProductForm collections={[]} usdNgnRate={1500} />);
    type(ngn(), "45000");
    type(usd(), "35");
    expect(
      screen.getByText("Fixed price. It won't change when the store rate changes."),
    ).toBeTruthy();
    expect(usd().getAttribute("aria-invalid")).not.toBe("true");
  });

  it("flags a dollar price that isn't a whole number", () => {
    render(<ProductForm collections={[]} usdNgnRate={1500} />);
    type(usd(), "3.5");
    expect(
      screen.getByText("Enter a whole number of dollars, or leave blank to use the store rate."),
    ).toBeTruthy();
    expect(usd().getAttribute("aria-invalid")).toBe("true");
  });

  it("flags a missing naira price once the owner leaves the field", () => {
    render(<ProductForm collections={[]} usdNgnRate={1500} />);
    fireEvent.blur(ngn());
    expect(
      screen.getByText("Enter the naira price as a whole number, for example 45000."),
    ).toBeTruthy();
    expect(ngn().getAttribute("aria-invalid")).toBe("true");
  });

  it("says so when the store rate isn't set", () => {
    render(<ProductForm collections={[]} usdNgnRate={null} />);
    type(ngn(), "45000");
    expect(
      screen.getByText("The store exchange rate isn't set yet. Open Settings to set it."),
    ).toBeTruthy();
  });

  it("pre-fills an edit in whole units and keeps an auto price blank", () => {
    const { unmount } = render(
      <ProductForm
        collections={[]}
        usdNgnRate={1500}
        initial={{ id: "p1", name: "Coat", priceNgn: 4_500_000, priceUsdOverride: null }}
      />,
    );
    expect(ngn().value).toBe("45000");
    expect(usd().value).toBe("");
    unmount();
    render(
      <ProductForm
        collections={[]}
        usdNgnRate={1500}
        initial={{ id: "p1", name: "Coat", priceNgn: 4_500_000, priceUsdOverride: 3_500 }}
      />,
    );
    expect(usd().value).toBe("35");
  });

  it("posts priceNgn and priceUsd, never a computed price", async () => {
    createProduct.mockResolvedValue({ ok: false, error: "invalid_price_usd" });
    const { container } = render(<ProductForm collections={[]} usdNgnRate={1500} />);
    type(ngn(), "45000");
    type(usd(), "35");
    fireEvent.submit(container.querySelector("form")!);
    await screen.findByText("The dollar price must be a whole number, or left blank.");
    const fd = createProduct.mock.calls[0][0] as FormData;
    expect(fd.get("priceNgn")).toBe("45000");
    expect(fd.get("priceUsd")).toBe("35");
    expect(fd.has("price")).toBe(false);
  });

  it.each([
    ["invalid_price_ngn", "Enter the naira price as a whole number."],
    ["rate_unavailable", "The store exchange rate isn't set. Set it in Settings, then save again."],
  ])("explains the server's %s", async (error, message) => {
    createProduct.mockResolvedValue({ ok: false, error });
    const { container } = render(<ProductForm collections={[]} usdNgnRate={1500} />);
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByText(message)).toBeTruthy();
  });
});

describe("ProductTable prices", () => {
  const row = {
    id: "p1",
    slug: "coat",
    name: "Coat",
    category: "Outerwear",
    featured: false,
    thumbnail: null,
    totalStock: 3,
    priceNgn: 4_500_000,
    priceUsd: 3_000,
  };

  it("shows both prices and marks a rate-following dollar price as auto", () => {
    render(<ProductTable products={[{ ...row, priceUsdOverride: null }]} />);
    expect(screen.getByText("₦45,000")).toBeTruthy();
    expect(screen.getByText(/\$30/)).toBeTruthy();
    const pill = screen.getByText("auto");
    expect(pill.textContent).toBe("auto (follows the store exchange rate)");
    const settings = screen.getByRole("link", { name: "Settings" });
    expect(settings.getAttribute("href")).toBe("/admin/settings");
  });

  it("shows no marker for a hand-set dollar price", () => {
    render(<ProductTable products={[{ ...row, priceUsd: 3_500, priceUsdOverride: 3_500 }]} />);
    expect(screen.getByText(/\$35/)).toBeTruthy();
    expect(screen.queryByText("auto")).toBeNull();
  });
});
