// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";
import { SESSION_HINT_CLASS } from "@/lib/site-gate";

// Runs app/globals.css through the project's real PostCSS + Tailwind setup,
// the same as `next build`. The gate-hiding rule once lived in @layer base,
// where Tailwind silently dropped it (its class only appears in lib/), and
// signed-in customers saw the sign-in gate flash on every page load.
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
  const result = await postcss(plugins).process(readFileSync(file, "utf8"), {
    from: file,
  });
  return result.css;
}

describe("compiled globals.css", () => {
  it("keeps the rule that hides the provisional gate for signed-in browsers", async () => {
    const css = (await compiledCss()).replace(/\s+/g, " ");
    expect(css).toContain(
      `.${SESSION_HINT_CLASS} [data-gate-provisional] { display: none; }`,
    );
  }, 60_000);
});
