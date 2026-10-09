// @vitest-environment node
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BlobNotConfiguredError,
  isValidBlurDataUrl,
  makeBlurDataUrl,
  processProductPhoto,
  storeProductPhoto,
} from "@/lib/product-images";

function photo(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 166, g: 85, b: 47 } },
  })
    .jpeg()
    .toBuffer();
}

describe("processProductPhoto", () => {
  it("caps the long edge at 2000px and re-encodes to WebP", async () => {
    const { webp } = await processProductPhoto(await photo(4000, 3000));
    const meta = await sharp(webp).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(2000);
    expect(meta.height).toBe(1500);
  });

  it("never enlarges a small photo", async () => {
    const { webp } = await processProductPhoto(await photo(800, 1000));
    const meta = await sharp(webp).metadata();
    expect([meta.width, meta.height]).toEqual([800, 1000]);
  });

  it("accepts an SVG and stores it as a plain WebP picture", async () => {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">` +
        `<script>alert(1)</script>` +
        `<rect width="600" height="800" fill="#a6552f"/></svg>`,
    );
    const { webp } = await processProductPhoto(svg);
    const meta = await sharp(webp).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([600, 800]);
    // Rasterised: no markup (and so no script) survives into what's served.
    expect(webp.includes(Buffer.from("<script"))).toBe(false);
  });

  it("returns a small, valid blur placeholder", async () => {
    const { blurDataUrl } = await processProductPhoto(await photo(1200, 1600));
    expect(blurDataUrl.startsWith("data:image/webp;base64,")).toBe(true);
    expect(isValidBlurDataUrl(blurDataUrl)).toBe(true);
    expect(blurDataUrl.length).toBeLessThan(1000);
  });

  it("rejects bytes that are not an image", async () => {
    await expect(processProductPhoto(Buffer.from("not an image"))).rejects.toThrow();
  });
});

describe("isValidBlurDataUrl", () => {
  it("accepts what makeBlurDataUrl produces", async () => {
    expect(isValidBlurDataUrl(await makeBlurDataUrl(await photo(300, 400)))).toBe(true);
  });

  it.each([
    ["non-string", 42],
    ["http URL", "https://example.com/a.webp"],
    ["svg data URL", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="],
    ["injected quote", 'data:image/webp;base64,AAAA");background:url(x'],
    ["oversized", `data:image/webp;base64,${"A".repeat(5000)}`],
  ])("rejects %s", (_label, value) => {
    expect(isValidBlurDataUrl(value)).toBe(false);
  });
});

describe("storeProductPhoto", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses in production when Vercel Blob is not configured", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("NODE_ENV", "production");
    await expect(storeProductPhoto(Buffer.from("x"))).rejects.toBeInstanceOf(
      BlobNotConfiguredError,
    );
  });
});
