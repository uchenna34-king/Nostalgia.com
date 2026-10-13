// @vitest-environment node
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Inter latin-ext (₦ glyph)", () => {
  it("is a real woff2 file", () => {
    const file = join(root, "app", "fonts", "Inter-latin-ext-normal.woff2");
    expect(readFileSync(file).subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(statSync(file).size).toBeGreaterThan(10_000);
  });

  it("is registered and sits first in the sans stack", () => {
    const fonts = readFileSync(join(root, "lib", "fonts.ts"), "utf8");
    expect(fonts).toContain('variable: "--font-inter-ext"');
    expect(fonts).toContain("U+20A0-20AB");
    const tw = readFileSync(join(root, "tailwind.config.ts"), "utf8");
    expect(tw).toMatch(/"var\(--font-inter-ext\)",\s*"var\(--font-inter\)"/);
    const layout = readFileSync(join(root, "app", "layout.tsx"), "utf8");
    expect(layout).toContain("interExt.variable");
  });
});
