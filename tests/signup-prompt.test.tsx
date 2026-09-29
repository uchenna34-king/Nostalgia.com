import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import CheckoutButton from "@/components/CheckoutButton";

const session = vi.hoisted(() => ({ status: "unauthenticated" }));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: session.status }),
}));

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  session.status = "unauthenticated";
});

describe("CheckoutButton", () => {
  it("links signed-in buyers straight to /checkout", () => {
    session.status = "authenticated";
    render(<CheckoutButton>Checkout</CheckoutButton>);
    expect(
      screen.getByRole("link", { name: "Checkout" }).getAttribute("href"),
    ).toBe("/checkout");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks signed-out visitors to sign up before checking out", () => {
    render(<CheckoutButton>Checkout</CheckoutButton>);
    expect(screen.queryByRole("link", { name: "Checkout" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));

    screen.getByRole("dialog", { name: "Create your account" });
    expect(
      screen
        .getByRole("link", { name: "Create an account" })
        .getAttribute("href"),
    ).toBe("/register?callbackUrl=%2Fcheckout");
    expect(
      screen
        .getByRole("link", { name: "I already have an account" })
        .getAttribute("href"),
    ).toBe("/signin?callbackUrl=%2Fcheckout");
  });

  it("closes on Escape and on Keep browsing", () => {
    render(<CheckoutButton>Checkout</CheckoutButton>);
    const trigger = screen.getByRole("button", { name: "Checkout" });

    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Keep browsing" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("runs onNavigate when the visitor heads to sign-in", () => {
    const onNavigate = vi.fn();
    render(<CheckoutButton onNavigate={onNavigate}>Checkout</CheckoutButton>);
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    fireEvent.click(screen.getByRole("link", { name: "Create an account" }));
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has no axe violations when open", async () => {
    const { container } = render(<CheckoutButton>Checkout</CheckoutButton>);
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
