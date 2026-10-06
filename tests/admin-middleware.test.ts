// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";
import { middleware } from "@/middleware";

const SECRET = "test-secret-for-middleware";

beforeEach(() => {
  vi.stubEnv("NEXTAUTH_SECRET", SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function request(url: string, cookieName?: string) {
  const headers = new Headers();
  if (cookieName) {
    const token = await encode({
      token: { email: "owner@example.com", sub: "u1" },
      secret: SECRET,
    });
    headers.set("cookie", `${cookieName}=${token}`);
  }
  return new NextRequest(url, { headers });
}

const isRedirectToSignIn = (res: Response) =>
  res.status === 307 &&
  res.headers.get("location") ===
    "https://nostalgia.example/signin?callbackUrl=%2Fadmin%2Forders";

describe("/admin middleware", () => {
  it("lets a signed-in owner through on https even when NEXTAUTH_URL says http", async () => {
    // The live bug: sign-in set the __Secure- cookie, but a non-https
    // NEXTAUTH_URL made the gate look for the plain cookie name instead.
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3002");
    const res = await middleware(
      await request(
        "https://nostalgia.example/admin/orders",
        "__Secure-next-auth.session-token",
      ),
    );
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("reads the plain cookie on http (local dev)", async () => {
    const res = await middleware(
      await request("http://localhost:3002/admin", "next-auth.session-token"),
    );
    expect(res.headers.get("location")).toBeNull();
  });

  it("sends anonymous visitors to sign-in, keeping where they were going", async () => {
    const res = await middleware(
      await request("https://nostalgia.example/admin/orders"),
    );
    expect(isRedirectToSignIn(res)).toBe(true);
  });

  it("rejects a token signed with another secret", async () => {
    const forged = await encode({
      token: { email: "owner@example.com" },
      secret: "not-the-real-secret",
    });
    const res = await middleware(
      new NextRequest("https://nostalgia.example/admin/orders", {
        headers: { cookie: `__Secure-next-auth.session-token=${forged}` },
      }),
    );
    expect(isRedirectToSignIn(res)).toBe(true);
  });
});
