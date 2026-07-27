import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import RatingStars, { starFillPercent } from "@/components/RatingStars";

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe("starFillPercent", () => {
  it("maps ratings to a half-star-rounded fill percentage", () => {
    expect(starFillPercent(4)).toBe(80);
    expect(starFillPercent(4.6)).toBe(90); // rounds to 4.5
    expect(starFillPercent(0)).toBe(0);
    expect(starFillPercent(5)).toBe(100);
  });

  it("clamps out-of-range input into [0,5]", () => {
    expect(starFillPercent(-3)).toBe(0);
    expect(starFillPercent(9)).toBe(100);
  });
});

describe("RatingStars", () => {
  it("exposes a numeric accessible name including the rating and count", () => {
    render(<RatingStars value={4.6} count={12} />);
    const img = screen.getByRole("img");
    const name = img.getAttribute("aria-label") ?? "";
    expect(name).toContain("4.6");
    expect(name).toContain("12");
  });

  it("marks the decorative star SVGs aria-hidden", () => {
    const { container } = render(<RatingStars value={3} count={4} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => expect(svg.getAttribute("aria-hidden")).toBe("true"));
  });

  it("has zero axe violations", async () => {
    const { container } = render(<RatingStars value={4.6} count={12} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
