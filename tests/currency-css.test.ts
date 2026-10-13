// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// Same harness as tests/site-gate-css.test.ts: compile app/globals.css with
// the project's real PostCSS + Tailwind setup. The currency rule's selectors
// only appear in components and a lib/ script, so inside an @layer Tailwind
// would drop it and every price would show twice.
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
  it("keeps the rule that hides the inactive currency", async () => {
    const css = (await compiledCss()).replace(/\s+/g, " ");
    expect(css).toContain(
      ':root:not([data-currency="USD"]) [data-money="USD"], :root[data-currency="USD"] [data-money="NGN"] { display: none; }',
    );
  }, 60_000);
});

describe("app/layout.tsx", () => {
  it("runs the currency script but never reads cookies (keeps static pages static)", () => {
    const src = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
    expect(src).toContain("__html: CURRENCY_SCRIPT");
    expect(src).not.toMatch(/cookies\(/);
  });
});
