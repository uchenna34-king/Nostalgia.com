// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const blobGet = vi.hoisted(() => vi.fn());
vi.mock("@vercel/blob", () => ({ get: blobGet }));

import { GET } from "@/app/media/products/[file]/route";

const FILE = "3f2a8c4e-1b7d-4e9a-9c3f-5d6e7f8a9b0c.webp";

function serve(file: string) {
  return GET(new Request(`https://shop.test/media/products/${file}`), {
    params: { file },
  });
}

function stored(bytes: string) {
  return {
    statusCode: 200,
    stream: new Blob([bytes]).stream(),
    headers: new Headers(),
    blob: { contentType: "image/webp", size: bytes.length },
  };
}

beforeEach(() => {
  vi.stubEnv("BLOB_STORE_ID", "store_abc123");
});

afterEach(() => {
  vi.unstubAllEnvs();
  blobGet.mockReset();
});

describe("GET /media/products/[file]", () => {
  it("serves a photo from the private store as a long-cached WebP", async () => {
    blobGet.mockResolvedValue(stored("webp-bytes"));

    const res = await serve(FILE);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("webp-bytes");
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toContain("s-maxage=31536000");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(blobGet).toHaveBeenCalledWith(`products/${FILE}`, { access: "private" });
  });

  it.each([
    ["a path traversal", "..%2Fsecret.webp"],
    ["another extension", "3f2a8c4e-1b7d-4e9a-9c3f-5d6e7f8a9b0c.png"],
    ["a name we never generate", "logo.webp"],
  ])("refuses %s without touching the store", async (_label, file) => {
    const res = await serve(file);
    expect(res.status).toBe(404);
    expect(blobGet).not.toHaveBeenCalled();
  });

  it("is a 404 when the photo isn't in the store", async () => {
    blobGet.mockResolvedValue(null);
    expect((await serve(FILE)).status).toBe(404);
  });

  it("is a 404, not a crash, when the store errors", async () => {
    blobGet.mockRejectedValue(new Error("Vercel Blob: store not found"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await serve(FILE)).status).toBe(404);
  });

  it("is a 404 when no store is connected", async () => {
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect((await serve(FILE)).status).toBe(404);
    expect(blobGet).not.toHaveBeenCalled();
  });
});
