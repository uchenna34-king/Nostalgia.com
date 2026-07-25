import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
}));

import { track } from "@vercel/analytics";
import { getConsent, hasConsent, setConsent, trackEvent } from "@/lib/analytics";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("consent persistence", () => {
  it("is null before any choice is made", () => {
    expect(getConsent()).toBeNull();
  });

  it("persists 'accepted' and reflects it via hasConsent", () => {
    setConsent("accepted");
    expect(getConsent()).toBe("accepted");
    expect(hasConsent()).toBe(true);
  });

  it("persists 'declined' and hasConsent is false", () => {
    setConsent("declined");
    expect(getConsent()).toBe("declined");
    expect(hasConsent()).toBe(false);
  });
});

describe("trackEvent consent gating", () => {
  it("does not call track when no consent has been stored", () => {
    trackEvent("view_product", { slug: "x" });
    expect(track).not.toHaveBeenCalled();
  });

  it("does not call track when consent was declined", () => {
    setConsent("declined");
    trackEvent("view_product", { slug: "x" });
    expect(track).not.toHaveBeenCalled();
  });

  it("calls track exactly once with the event name and payload when consent was accepted", () => {
    setConsent("accepted");
    trackEvent("add_to_cart", { slug: "x" });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("add_to_cart", { slug: "x" });
  });

  it("never throws even when the underlying track call throws", () => {
    setConsent("accepted");
    (track as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("network down");
    });

    expect(() => trackEvent("add_to_cart", { slug: "x" })).not.toThrow();
  });
});
