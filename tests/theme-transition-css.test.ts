// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

// Same harness as tests/site-gate-css.test.ts: compile app/globals.css with
// the project's real PostCSS + Tailwind setup.
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

describe("compiled globals.css — theme switch", () => {
  it("times the cross-fade on the root view transition", async () => {
    const css = (await compiledCss()).replace(/\s+/g, " ");
    expect(css).toMatch(
      /::view-transition-old\(root\), ::view-transition-new\(root\) \{[^}]*animation-duration:/,
    );
  }, 60_000);

  it("has no rule that transitions every element's colours", async () => {
    // `.theme-transition *` made each frame of the fade a whole-page style
    // recompute and repaint — the lag this replaced.
    const css = (await compiledCss()).replace(/\s+/g, " ");
    expect(css).not.toContain(".theme-transition *");
  }, 60_000);
});
