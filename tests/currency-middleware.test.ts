// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn().mockResolvedValue(null) }));

import { config, middleware } from "@/middleware";
// Next's own matcher compiler, so the backslash in the source is tested as
// Next will actually read it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getMiddlewareMatchers } = require("next/dist/build/analysis/get-page-static-info");

function req(path: string, init: { country?: string; cookie?: string; https?: boolean } = {}) {
  const headers = new Headers();
  if (init.country) headers.set("x-vercel-ip-country", init.country);
  if (init.cookie) headers.set("cookie", init.cookie);
  const origin = init.https ? "https://shop.test" : "http://shop.test";
  return new NextRequest(new URL(path, origin), { headers });
}

const setCookie = (res: Response) => res.headers.get("set-cookie") ?? "";

describe("currency cookie on first visit", () => {
  it("defaults from the country header", async () => {
    expect(setCookie(await middleware(req("/", { country: "NG" })))).toContain("nostalgia-currency=NGN");
    expect(setCookie(await middleware(req("/shop", { country: "GB" })))).toContain("nostalgia-currency=USD");
    expect(setCookie(await middleware(req("/shop")))).toContain("nostalgia-currency=NGN");
  });

  it("sets readable, one-year, lax, site-wide attributes (Secure on https)", async () => {
    const c = setCookie(await middleware(req("/", { country: "US", https: true })));
    expect(c).toContain("Path=/");
    expect(c).toContain("Max-Age=31536000");
    expect(c.toLowerCase()).toContain("samesite=lax");
    expect(c).toContain("Secure");
    expect(c).not.toContain("HttpOnly");
    expect(setCookie(await middleware(req("/", { country: "US" })))).not.toContain("Secure");
  });

  it("leaves a valid choice alone and replaces garbage", async () => {
    // The region is missing here, so a region cookie may be set; the currency must not be.
    expect(setCookie(await middleware(req("/", { country: "GB", cookie: "nostalgia-currency=NGN" })))).not.toContain(
      "nostalgia-currency",
    );
    expect(
      setCookie(await middleware(req("/", { country: "GB", cookie: "nostalgia-currency=NGN; nostalgia-region=GB" }))),
    ).toBe("");
    expect(setCookie(await middleware(req("/", { country: "GB", cookie: "nostalgia-currency=EUR" })))).toContain(
      "nostalgia-currency=USD",
    );
  });

  it("never touches the currency on /admin (the auth gate answers instead)", async () => {
    const res = await middleware(req("/admin/products", { country: "GB" }));
    expect(setCookie(res)).not.toContain("nostalgia-currency");
    expect(res.headers.get("location")).toContain("/signin");
  });
});

describe("region cookie on first visit (D-33)", () => {
  it("defaults to the visitor's country when we ship there", async () => {
    expect(setCookie(await middleware(req("/", { country: "NG" })))).toContain("nostalgia-region=NG");
    expect(setCookie(await middleware(req("/shop", { country: "GH" })))).toContain("nostalgia-region=GH");
    expect(setCookie(await middleware(req("/", { country: "US" })))).toContain("nostalgia-region=US");
  });

  it("falls back to Nigeria with no header or a country we can't ship to", async () => {
    expect(setCookie(await middleware(req("/")))).toContain("nostalgia-region=NG");
    expect(setCookie(await middleware(req("/", { country: "KP" })))).toContain("nostalgia-region=NG");
    expect(setCookie(await middleware(req("/", { country: "XX" })))).toContain("nostalgia-region=NG");
  });

  it("uses the same readable, one-year, lax, site-wide attributes as the currency", async () => {
    const res = await middleware(req("/", { country: "GH", https: true }));
    const region = res.cookies.get("nostalgia-region")!;
    expect(region).toMatchObject({ value: "GH", path: "/", maxAge: 31_536_000, sameSite: "lax", secure: true });
    expect(region.httpOnly).toBeFalsy();
  });

  it("gives a returning visitor who already chose a currency a region, keeping the currency", async () => {
    const res = await middleware(req("/", { country: "NG", cookie: "nostalgia-currency=USD" }));
    expect(res.cookies.get("nostalgia-region")?.value).toBe("NG");
    expect(res.cookies.get("nostalgia-currency")).toBeUndefined();
  });

  it("leaves a valid region alone and replaces garbage", async () => {
    const both = "nostalgia-currency=NGN; nostalgia-region=GH";
    expect(setCookie(await middleware(req("/", { country: "US", cookie: both })))).toBe("");
    for (const bad of ["ZZ", "gh", "KP", ""]) {
      const res = await middleware(
        req("/", { country: "US", cookie: `nostalgia-currency=NGN; nostalgia-region=${bad}` }),
      );
      expect(res.cookies.get("nostalgia-region")?.value, bad).toBe("US");
    }
  });

  it("never sets it on /admin", async () => {
    expect(setCookie(await middleware(req("/admin", { country: "GH" })))).not.toContain("nostalgia-region");
  });
});

describe("middleware matcher", () => {
  const matchers = getMiddlewareMatchers(config.matcher, {}) as {
    regexp: string;
    missing?: { type: string; key: string }[];
  }[];
  const pageMatchers = matchers.filter((m) => m.missing);
  const pageMatcher = pageMatchers[0];
  const matchesPage = (p: string) => new RegExp(pageMatcher.regexp).test(p);

  it("runs the currency branch on every page", () => {
    for (const p of [
      "/", "/shop", "/product/x", "/cart", "/checkout", "/account/orders/abc",
      "/order/success", "/signin", "/wishlist", "/shipping", "/returns", "/collections/x",
    ]) {
      expect(matchesPage(p), p).toBe(true);
    }
  });

  it("skips admin, API, Next internals, media and files", () => {
    for (const p of [
      "/admin", "/admin/products", "/api/checkout", "/api/paystack/webhook",
      "/_next/static/x.js", "/media/products/a.webp", "/favicon.ico", "/robots.txt",
      "/sitemap.xml", "/products/x-1.svg",
    ]) {
      expect(matchesPage(p), p).toBe(false);
    }
  });

  it("only runs while either cookie is missing: one page entry per cookie, same pages", () => {
    // missing: [a, b] would need BOTH absent, so a returning visitor with a
    // currency would never get a region. Two entries are an OR.
    expect(pageMatchers.map((m) => m.missing)).toEqual([
      [{ type: "cookie", key: "nostalgia-currency" }],
      [{ type: "cookie", key: "nostalgia-region" }],
    ]);
    expect(pageMatchers[1].regexp).toBe(pageMatchers[0].regexp);
  });

  it("writes the matcher as literals, which is all Next reads at build time", () => {
    const src = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
    expect(src).toContain('missing: [{ type: "cookie", key: "nostalgia-currency" }]');
    expect(src).toContain('missing: [{ type: "cookie", key: "nostalgia-region" }]');
  });
});
