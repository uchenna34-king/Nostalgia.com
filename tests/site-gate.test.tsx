import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { renderToString } from "react-dom/server";
import {
  SESSION_HINT_CLASS,
  SESSION_HINT_KEY,
  SESSION_HINT_SCRIPT,
  isOpenPath,
} from "@/lib/site-gate";
import AppFrame from "@/components/AppFrame";
import { GoogleEnabledContext } from "@/context/GoogleEnabledContext";

const signIn = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({
  pathname: "/",
  status: "unauthenticated",
}));

vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: state.status }),
  signIn,
}));
vi.mock("@/components/Nav", () => ({ default: () => <nav>Nav</nav> }));
vi.mock("@/components/CartDrawer", () => ({ default: () => null }));

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  signIn.mockReset();
  localStorage.clear();
  state.pathname = "/";
  state.status = "unauthenticated";
});

function renderFrame(googleEnabled = false) {
  return render(
    <GoogleEnabledContext.Provider value={googleEnabled}>
      <AppFrame footer={<footer>Footer</footer>}>
        <main>
          <a href="/shop">Page content</a>
        </main>
      </AppFrame>
    </GoogleEnabledContext.Provider>,
  );
}

const gate = () =>
  screen.queryByRole("dialog", { name: "Before you continue" });
const frameOf = (container: HTMLElement) =>
  container.querySelector(".grain") as HTMLElement;

describe("isOpenPath", () => {
  it("keeps sign-in, policies and admin open", () => {
    for (const path of [
      "/signin",
      "/returns",
      "/shipping",
      "/admin",
      "/admin/orders",
    ]) {
      expect(isOpenPath(path)).toBe(true);
    }
  });

  it("gates everything else, including look-alike paths", () => {
    for (const path of [
      "/",
      "/shop",
      "/product/x",
      "/cart",
      "/checkout",
      "/register",
      "/signing",
    ]) {
      expect(isOpenPath(path)).toBe(false);
    }
    expect(isOpenPath(null)).toBe(false);
  });
});

describe("SiteGate in AppFrame", () => {
  it("asks a signed-out visitor to sign in with Google first", () => {
    const { container } = renderFrame(true);
    expect(gate()).not.toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
    // Google is the only way in: no registration or password route.
    expect(
      screen.queryByRole("link", { name: /create an account/i }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    // The page behind can't be used.
    expect(frameOf(container).hasAttribute("inert")).toBe(true);
  });

  it("returns the visitor to the page they were trying to see", () => {
    state.pathname = "/product/wool-coat";
    renderFrame(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/product/wool-coat",
    });
  });

  it("falls back to the sign-in page when Google isn't configured", () => {
    state.pathname = "/product/wool-coat";
    renderFrame(false);
    expect(
      screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
    ).toBe("/signin?callbackUrl=%2Fproduct%2Fwool-coat");
  });

  it("can't be dismissed", () => {
    renderFrame();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(gate()).not.toBeNull();
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
  });

  it("stays away from the open pages", () => {
    state.pathname = "/signin";
    const { container } = renderFrame();
    expect(gate()).toBeNull();
    expect(frameOf(container).hasAttribute("inert")).toBe(false);
  });

  it("never shows for signed-in customers", () => {
    state.status = "authenticated";
    const { container } = renderFrame();
    expect(gate()).toBeNull();
    expect(frameOf(container).hasAttribute("inert")).toBe(false);
  });

  it("shows straight away for a new visitor, before the session loads", () => {
    state.status = "loading";
    const { container } = renderFrame();
    expect(gate()).not.toBeNull();
    expect(frameOf(container).hasAttribute("inert")).toBe(true);
  });

  it("stays hidden while loading for a browser that was signed in last time", () => {
    localStorage.setItem(SESSION_HINT_KEY, "1");
    state.status = "loading";
    const { container } = renderFrame();
    expect(gate()).toBeNull();
    expect(frameOf(container).hasAttribute("inert")).toBe(false);
  });

  it("keeps the hint in step with the real session", () => {
    state.status = "authenticated";
    renderFrame();
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBe("1");
    cleanup();

    // A stale hint (session expired) never keeps the gate away once the
    // session answers, and is cleared.
    state.status = "unauthenticated";
    renderFrame();
    expect(gate()).not.toBeNull();
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
  });

  it("is in the server HTML, marked provisional so the hint can hide it", () => {
    state.status = "loading";
    const html = renderToString(
      <GoogleEnabledContext.Provider value={false}>
        <AppFrame footer={null}>
          <main>Page</main>
        </AppFrame>
      </GoogleEnabledContext.Provider>,
    );
    expect(html).toContain("Before you continue");
    expect(html).toContain("data-gate-provisional");
    // Not inert on the server: a returning customer's page must stay usable
    // while CSS hides the provisional gate.
    expect(html).not.toContain("inert");
  });

  it("the head script marks <html> only when the hint is set", () => {
    document.documentElement.classList.remove(SESSION_HINT_CLASS);
    new Function(SESSION_HINT_SCRIPT)();
    expect(
      document.documentElement.classList.contains(SESSION_HINT_CLASS),
    ).toBe(false);

    localStorage.setItem(SESSION_HINT_KEY, "1");
    new Function(SESSION_HINT_SCRIPT)();
    expect(
      document.documentElement.classList.contains(SESSION_HINT_CLASS),
    ).toBe(true);
    document.documentElement.classList.remove(SESSION_HINT_CLASS);
  });

  it("mentions Google only when Google is configured", () => {
    renderFrame(true);
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeDefined();
    cleanup();

    renderFrame(false);
    expect(screen.queryByRole("button", { name: /Google/i })).toBeNull();
    expect(screen.getByRole("dialog").textContent).not.toMatch(/google/i);
  });

  it("has no axe violations", async () => {
    const { container } = renderFrame(true);
    expect(await axe(container)).toHaveNoViolations();
  });
});
