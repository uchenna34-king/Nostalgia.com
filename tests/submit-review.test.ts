import { beforeEach, describe, expect, it, vi } from "vitest";

// The submitReview Server Action is a public HTTP endpoint (T-10-05-01), so its
// rejection branches are the security boundary for the whole reviews feature.
// Everything it touches is mocked so we assert the GATES, not the database.
const getServerSession = vi.fn();
const hasPurchased = vi.fn();
const upsert = vi.fn();
const findUnique = vi.fn();

vi.mock("next-auth", () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: {
    product: { findUnique: (...a: unknown[]) => findUnique(...a) },
    review: { upsert: (...a: unknown[]) => upsert(...a) },
  },
}));
vi.mock("@/lib/reviews", async () => {
  // Keep the REAL isValidRating — the allow-list is part of what we're testing.
  const actual = await vi.importActual<typeof import("@/lib/reviews")>("@/lib/reviews");
  return { isValidRating: actual.isValidRating, hasPurchased: (...a: unknown[]) => hasPurchased(...a) };
});

import { submitReview } from "@/app/product/[slug]/actions";

/** A well-formed submission; individual tests bend one field at a time. */
function form(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("slug", "nostalgia-hoodie");
  fd.set("rating", "5");
  fd.set("title", "Great hoodie");
  fd.set("body", "Warm and well cut.");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue({ id: "prod-1" });
  upsert.mockResolvedValue({});
});

describe("submitReview — authentication gate", () => {
  it("rejects an anonymous caller and writes nothing", async () => {
    getServerSession.mockResolvedValue(null);

    await expect(submitReview(form())).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });
    expect(upsert).not.toHaveBeenCalled();
    // The purchase lookup must not even run without an identity.
    expect(hasPurchased).not.toHaveBeenCalled();
  });

  it("rejects a session carrying no user id", async () => {
    getServerSession.mockResolvedValue({ user: { email: "x@y.test" } });

    const result = await submitReview(form());

    expect(result).toEqual({ ok: false, error: "not_authenticated" });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("submitReview — verified-purchase gate (D-01)", () => {
  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("rejects a signed-in NON-purchaser and writes nothing", async () => {
    hasPurchased.mockResolvedValue(false);

    await expect(submitReview(form())).resolves.toEqual({
      ok: false,
      error: "not_eligible",
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("re-checks eligibility server-side against the session id, not form input", async () => {
    hasPurchased.mockResolvedValue(true);

    await submitReview(form({ slug: "nostalgia-hoodie" }));

    // userId comes from the session; slug from the form — never a client
    // "eligible" flag.
    expect(hasPurchased).toHaveBeenCalledWith("user-1", "nostalgia-hoodie");
  });

  it("accepts a verified purchaser and upserts exactly one review", async () => {
    hasPurchased.mockResolvedValue(true);

    await expect(submitReview(form())).resolves.toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0][0].where).toEqual({
      productId_userId: { productId: "prod-1", userId: "user-1" },
    });
  });
});

describe("submitReview — input validation", () => {
  beforeEach(() => {
    getServerSession.mockResolvedValue({ user: { id: "user-1" } });
    hasPurchased.mockResolvedValue(true);
  });

  it.each(["0", "6", "2.5", "abc", "-1"])(
    "rejects out-of-range rating %s before any write",
    async (rating) => {
      const result = await submitReview(form({ rating }));

      expect(result).toEqual({ ok: false, error: "invalid_rating" });
      expect(upsert).not.toHaveBeenCalled();
    },
  );

  it("rejects a blank title", async () => {
    const result = await submitReview(form({ title: "   " }));

    expect(result).toEqual({ ok: false, error: "missing_title" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("length-caps title and body before persisting (T-10-05-04)", async () => {
    await submitReview(form({ title: "T".repeat(500), body: "B".repeat(5000) }));

    const data = upsert.mock.calls[0][0].create;
    expect(data.title).toHaveLength(120);
    expect(data.body).toHaveLength(2000);
  });

  it("stores an omitted body as null, not an empty string", async () => {
    await submitReview(form({ body: "" }));

    expect(upsert.mock.calls[0][0].create.body).toBeNull();
  });

  it("rejects a submission for a product that does not exist", async () => {
    findUnique.mockResolvedValue(null);

    const result = await submitReview(form());

    expect(result).toEqual({ ok: false, error: "product_not_found" });
    expect(upsert).not.toHaveBeenCalled();
  });
});
