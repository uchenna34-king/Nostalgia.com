import { describe, expect, it } from "vitest";

describe("vitest smoke test", () => {
  it("runs and asserts basic arithmetic", () => {
    expect(1 + 1).toBe(2);
  });
});
