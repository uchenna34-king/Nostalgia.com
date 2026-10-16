import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CartProvider, useCart, type CartItem } from "@/context/CartContext";

const STORAGE_KEY = "nostalgia-cart";

const coat: CartItem = {
  slug: "coat",
  name: "Nostalgia Coat",
  prices: { NGN: 39_000_000, USD: 26_000 },
  image: "",
  size: "M",
  qty: 1,
};

let cart: ReturnType<typeof useCart>;
function Probe() {
  cart = useCart();
  return <p data-testid="count">{cart.count}</p>;
}

function mount() {
  return render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
}

afterEach(() => localStorage.clear());

describe("CartProvider (D-13)", () => {
  it("discards bag entries saved before prices had two currencies", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { slug: "old", name: "Old", price: 4_500, image: "", size: "M", qty: 1 },
        coat,
      ]),
    );
    mount();
    expect(cart.items).toEqual([coat]);
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("survives storage that isn't JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    mount();
    expect(cart.items).toEqual([]);
  });

  it("totals the bag in each currency", () => {
    mount();
    act(() => cart.addItem({ ...coat, qty: undefined } as never, 2));
    expect(cart.subtotals).toEqual({ NGN: 78_000_000, USD: 52_000 });
  });

  it("refreshes snapshots with current prices", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([coat]));
    mount();
    act(() => cart.updatePrices([{ slug: "coat", NGN: 40_000_000, USD: 27_000 }]));
    expect(cart.items[0].prices).toEqual({ NGN: 40_000_000, USD: 27_000 });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0].prices).toEqual({
      NGN: 40_000_000,
      USD: 27_000,
    });
  });
});
