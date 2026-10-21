// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ShipZone from "@/components/ShipZone";

// Zone-specific copy (D-33): <ShipZone> renders a span per zone and one
// unlayered rule hides the other zone's, keyed on <html data-zone> set by the
// before-paint REGION_SCRIPT. Same harness and same reason as
// tests/currency-css.test.ts: the selectors only appear in a component and a
// lib/ script, so inside an @layer Tailwind would drop the rule and both
// zones' copy would show.
async function compiledCss(): Promise<string> {
  const root = process.cwd();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(join(root, "postcss.config.js")) as {
    plugins: Record<string, object>;
  };
  const plugins = Object.entries(config.plugins).map(([name, options]) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(name)(options),
  );
  const file = join(root, "app", "globals.css");
  const result = await postcss(plugins).process(readFileSync(file, "utf8"), { from: file });
  return result.css;
}

describe("compiled globals.css", () => {
  it("keeps the rule that hides the other zone's copy", async () => {
    const css = (await compiledCss()).replace(/\s+/g, " ");
    expect(css).toContain(
      ':root:not([data-zone="international"]) [data-ship-zone="international"], :root[data-zone="international"] [data-ship-zone="domestic"] { display: none; }',
    );
  }, 60_000);
});

describe("app/layout.tsx", () => {
  it("runs the region script beside the currency script, still reading no cookies", () => {
    const src = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
    expect(src).toContain("__html: REGION_SCRIPT");
    expect(src.indexOf("__html: REGION_SCRIPT")).toBeGreaterThan(src.indexOf("__html: CURRENCY_SCRIPT"));
    expect(src).not.toMatch(/cookies\(/);
  });
});

describe("<ShipZone>", () => {
  it("wraps its copy in one span tagged with the zone, keeping the call site's class", () => {
    expect(
      renderToStaticMarkup(
        createElement(ShipZone, { zone: "domestic", className: "tabular-nums", children: "₦250,000" }),
      ),
    ).toBe('<span data-ship-zone="domestic" class="tabular-nums">₦250,000</span>');
    expect(renderToStaticMarkup(createElement(ShipZone, { zone: "international", children: "abroad" }))).toBe(
      '<span data-ship-zone="international">abroad</span>',
    );
  });
});
