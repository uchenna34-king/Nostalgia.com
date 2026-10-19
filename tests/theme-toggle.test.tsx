import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "@/components/ThemeToggle";

// The theme switch is a whole-page cross-fade done by the browser
// (document.startViewTransition): it snapshots the old page, applies the class
// swap in ONE style pass, and fades the two snapshots on the compositor. The
// earlier version put a colour transition on every element instead, which
// made the browser recompute and repaint the whole page on every frame of the
// fade — on a mid-range device that is a freeze followed by a snap.

let reducedMotion = false;
let pendingUpdate: (() => void) | null = null;
const startViewTransition = vi.fn((update: () => void) => {
  pendingUpdate = update;
  return {
    finished: Promise.resolve(),
    ready: Promise.resolve(),
    updateCallbackDone: Promise.resolve(),
    skipTransition: () => {},
  };
});

const root = document.documentElement;
const toggle = () => screen.getByRole("button", { name: /Switch to (dark|light) theme/ });

beforeEach(() => {
  reducedMotion = false;
  pendingUpdate = null;
  startViewTransition.mockClear();
  root.classList.remove("dark", "theme-transition");
  localStorage.clear();
  window.matchMedia = vi.fn((query: string) => ({
    matches: reducedMotion && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    writable: true,
    value: startViewTransition,
  });
});

afterEach(() => {
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  root.classList.remove("dark", "theme-transition");
});

describe("ThemeToggle", () => {
  it("cross-fades through a view transition, swapping the theme inside its update", () => {
    render(<ThemeToggle />);
    expect(toggle().getAttribute("aria-label")).toBe("Switch to dark theme");

    act(() => fireEvent.click(toggle()));

    // The browser snapshots the OLD page first, so nothing may change yet.
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(root.classList.contains("dark")).toBe(false);

    act(() => pendingUpdate!());

    // Theme and icon both land in the NEW snapshot.
    expect(root.classList.contains("dark")).toBe(true);
    expect(toggle().getAttribute("aria-label")).toBe("Switch to light theme");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("never animates every element's colours (the per-frame repaint that lagged)", () => {
    render(<ThemeToggle />);
    act(() => fireEvent.click(toggle()));
    act(() => pendingUpdate!());
    expect(root.classList.contains("theme-transition")).toBe(false);
  });

  it("switches instantly where the browser has no view transitions", () => {
    delete (document as { startViewTransition?: unknown }).startViewTransition;
    render(<ThemeToggle />);
    act(() => fireEvent.click(toggle()));
    expect(root.classList.contains("dark")).toBe(true);
    expect(toggle().getAttribute("aria-label")).toBe("Switch to light theme");
  });

  it("switches instantly, without a fade, under reduced motion", () => {
    reducedMotion = true;
    render(<ThemeToggle />);
    act(() => fireEvent.click(toggle()));
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(root.classList.contains("dark")).toBe(true);
  });

  it("goes back to light from dark", () => {
    root.classList.add("dark");
    render(<ThemeToggle />);
    act(() => fireEvent.click(toggle()));
    act(() => pendingUpdate!());
    expect(root.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
