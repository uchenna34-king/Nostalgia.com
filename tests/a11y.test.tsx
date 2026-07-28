import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

// ReviewForm (10-05) needs two things jsdom has no real version of: the App
// Router (useRouter throws outside a router context) and the submitReview
// Server Action (a "use server" module that would drag Prisma/next-auth into
// the browser env). Both are stubbed here. Hoisted by vitest, but inert for the
// SizeGuideModal / ConsentBanner blocks, which touch neither.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/app/product/[slug]/actions", () => ({
  submitReview: vi.fn(async () => ({ ok: true })),
}));

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe("ReviewForm a11y", () => {
  // Variable specifier + @vite-ignore: defers resolution to runtime so each
  // block fails independently (the 10-01 scaffold contract, kept intact).
  const spec = "@/components/ReviewForm";

  it("renders its eligible state with zero axe violations", async () => {
    const { default: ReviewForm } = await import(/* @vite-ignore */ spec);
    const { container } = render(
      <ReviewForm slug="jacket-01" eligibility="eligible" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("exposes the star input as a five-option radiogroup with numeric labels", async () => {
    const { default: ReviewForm } = await import(/* @vite-ignore */ spec);
    render(<ReviewForm slug="jacket-01" eligibility="eligible" />);

    const group = screen.getByRole("radiogroup", { name: "Rating" });
    expect(group).toBeDefined();

    const stars = screen.getAllByRole("radio");
    expect(stars).toHaveLength(5);
    // WCAG 1.4.1 — the value is in the accessible name, not just the glyph.
    expect(stars[0].getAttribute("aria-label")).toBe("1 star");
    expect(stars[4].getAttribute("aria-label")).toBe("5 stars");
    // Roving tabindex: exactly one star is in the tab order at a time.
    expect(stars.filter((s) => s.getAttribute("tabindex") === "0")).toHaveLength(1);
  });

  it("renders the non-eligible states without a writable form", async () => {
    const { default: ReviewForm } = await import(/* @vite-ignore */ spec);

    const signedOut = render(
      <ReviewForm slug="jacket-01" eligibility="signed-out" />,
    );
    expect(
      screen.getByText("Sign in with a verified purchase to leave a review."),
    ).toBeDefined();
    expect(signedOut.container.querySelector("form")).toBeNull();
    expect(await axe(signedOut.container)).toHaveNoViolations();
    cleanup();

    const noPurchase = render(
      <ReviewForm slug="jacket-01" eligibility="no-purchase" />,
    );
    expect(
      screen.getByText(
        "Reviews are open to customers who've purchased this item.",
      ),
    ).toBeDefined();
    expect(noPurchase.container.querySelector("form")).toBeNull();
    expect(await axe(noPurchase.container)).toHaveNoViolations();
  });
});

describe("SizeGuideModal a11y", () => {
  // Plan 10-07 owns finalizing the exact props (per UI-SPEC §3 dialog
  // contract). The fixed contract pinned here is the zero-violations axe
  // assertion against the open state.
  it("renders open with zero axe violations", async () => {
    const spec = "@/components/SizeGuideModal";
    const { default: SizeGuideModal } = await import(/* @vite-ignore */ spec);
    const sizeGuide = {
      category: "Outerwear",
      caption: "Outerwear size guide",
      columns: ["Size", "Chest", "Length", "Sleeve"],
      rows: [{ size: "M", cells: ["38 (96.5)", "28 (71)", "25 (63.5)"] }],
    };
    const { container } = render(
      <SizeGuideModal open sizeGuide={sizeGuide} onClose={() => {}} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe("ConsentBanner a11y", () => {
  // Plan 10-09 owns finalizing the exact props. The fixed contract pinned
  // here is the zero-violations axe assertion against the visible state.
  it("renders its visible state with zero axe violations", async () => {
    const spec = "@/components/ConsentBanner";
    const { default: ConsentBanner } = await import(/* @vite-ignore */ spec);
    const { container } = render(<ConsentBanner />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
