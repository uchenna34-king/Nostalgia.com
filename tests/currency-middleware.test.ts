// @vitest-environment node
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
    expect(setCookie(await middleware(req("/", { country: "GB", cookie: "nostalgia-currency=NGN" })))).toBe("");
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

describe("middleware matcher", () => {
  const matchers = getMiddlewareMatchers(config.matcher, {}) as {
    regexp: string;
    missing?: unknown[];
  }[];
  const pageMatcher = matchers.find((m) => m.missing)!;
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

  it("only runs while the cookie is missing", () => {
    expect(pageMatcher.missing).toEqual([{ type: "cookie", key: "nostalgia-currency" }]);
  });
});
