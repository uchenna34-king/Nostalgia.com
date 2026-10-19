import { beforeEach, describe, expect, it, vi } from "vitest";

// The product page is a cached, shared page, so it can no longer know who is
// looking at it. The review form asks this endpoint instead. Eligibility here
// is DISPLAY ONLY — submitReview re-checks session and purchase on every
// submit (T-10-05-01) — but the answer is per-person, so it must never be
// cached anywhere.

const getServerSession = vi.fn();
const hasPurchased = vi.fn();
const findFirst = vi.fn();

vi.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: { review: { findFirst: (...a: unknown[]) => findFirst(...a) } },
}));
vi.mock("@/lib/reviews", () => ({ hasPurchased: (...a: unknown[]) => hasPurchased(...a) }));

import { GET } from "@/app/api/reviews/eligibility/route";

const ask = (query: string) =>
  GET(new Request(`http://localhost/api/reviews/eligibility${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { id: "user-1" } });
  hasPurchased.mockResolvedValue(true);
  findFirst.mockResolvedValue(null);
});

describe("GET /api/reviews/eligibility", () => {
  it("rejects a request without a product slug", async () => {
    const res = await ask("");
    expect(res.status).toBe(400);
    expect(getServerSession).not.toHaveBeenCalled();
  });

  it("answers signed-out without touching the database", async () => {
    getServerSession.mockResolvedValue(null);
    const res = await ask("?slug=jacket-01");
    expect(await res.json()).toEqual({ eligibility: "signed-out" });
    expect(hasPurchased).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("answers no-purchase for a signed-in shopper who has not bought it", async () => {
    hasPurchased.mockResolvedValue(false);
    const res = await ask("?slug=jacket-01");
    expect(await res.json()).toEqual({ eligibility: "no-purchase" });
    expect(hasPurchased).toHaveBeenCalledWith("user-1", "jacket-01");
  });

  it("returns the shopper's own review when they have already written one", async () => {
    const own = { rating: 4, title: "Warm", body: "Fits well." };
    findFirst.mockResolvedValue(own);
    const res = await ask("?slug=jacket-01");
    expect(await res.json()).toEqual({ eligibility: "already-reviewed", existingReview: own });
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", product: { slug: "jacket-01" } },
      select: { rating: true, title: true, body: true },
    });
  });

  it("answers eligible for a buyer with no review yet", async () => {
    const res = await ask("?slug=jacket-01");
    expect(await res.json()).toEqual({ eligibility: "eligible" });
  });

  it("takes the shopper from the session, never from the request", async () => {
    await ask("?slug=jacket-01&userId=someone-else");
    expect(hasPurchased).toHaveBeenCalledWith("user-1", "jacket-01");
  });

  it("is never cached by the browser or a CDN", async () => {
    for (const query of ["", "?slug=jacket-01"]) {
      const res = await ask(query);
      expect(res.headers.get("cache-control")).toBe("private, no-store");
    }
  });
});
