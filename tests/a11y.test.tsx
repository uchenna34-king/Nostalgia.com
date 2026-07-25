import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

describe("ReviewForm a11y", () => {
  // Plan 10-05 owns finalizing the exact props and any session/provider
  // wrapper needed to render this component. The fixed contract pinned here
  // is the zero-violations axe assertion against its default eligible state.
  it("renders its eligible state with zero axe violations", async () => {
    // Variable specifier + @vite-ignore: defers resolution to runtime so a
    // missing component fails ONLY this block (RED), not the whole file at
    // transform time — lets 10-05/10-07/10-09 green their blocks independently.
    const spec = "@/components/ReviewForm";
    const { default: ReviewForm } = await import(/* @vite-ignore */ spec);
    const { container } = render(<ReviewForm productSlug="jacket-01" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
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
