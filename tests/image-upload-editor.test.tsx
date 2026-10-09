import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import ImageUrlEditor, { type Img } from "@/components/admin/ImageUrlEditor";

const BLUR = "data:image/webp;base64,UklGRg==";

function Harness({ onBusy }: { onBusy: (b: boolean) => void }) {
  const [images, setImages] = useState<Img[]>([{ url: "/products/a.svg", alt: "" }]);
  return (
    <>
      <ImageUrlEditor value={images} onChange={setImages} onBusyChange={onBusy} />
      <output data-testid="state">{JSON.stringify(images)}</output>
    </>
  );
}

const state = () => JSON.parse(screen.getByTestId("state").textContent!) as Img[];
const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ImageUrlEditor uploads", () => {
  it("appends each uploaded photo with its blur placeholder", async () => {
    let n = 0;
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ url: `https://x.public.blob.vercel-storage.com/${++n}.webp`, blurDataUrl: BLUR })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onBusy = vi.fn();
    render(<Harness onBusy={onBusy} />);

    fireEvent.change(screen.getByLabelText("Upload product photos"), {
      target: { files: [photo("front.jpg"), photo("back.jpg")] },
    });

    await waitFor(() => expect(state()).toHaveLength(3));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/upload");
    expect(state()[0].url).toBe("/products/a.svg");
    expect(state().slice(1).every((img) => img.blurDataUrl === BLUR)).toBe(true);
    // Busy while uploading, released once everything has landed.
    expect(onBusy).toHaveBeenCalledWith(true);
    await waitFor(() => expect(onBusy).toHaveBeenLastCalledWith(false));
  });

  it("shows a readable error and keeps the list when an upload fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "storage_not_configured" }), { status: 503 })),
    );
    render(<Harness onBusy={() => {}} />);

    fireEvent.change(screen.getByLabelText("Upload product photos"), {
      target: { files: [photo("front.jpg")] },
    });

    expect((await screen.findByRole("alert")).textContent).toBe(
      "front.jpg couldn't be stored — image storage isn't set up yet.",
    );
    expect(state()).toHaveLength(1);
  });

  it("leads with Add images, which opens the file picker for JPG and SVG", () => {
    render(<Harness onBusy={() => {}} />);
    const input = screen.getByLabelText("Upload product photos") as HTMLInputElement;
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Add images" }));
    expect(click).toHaveBeenCalledOnce();
    expect(input.type).toBe("file");
    expect(input.multiple).toBe(true);
    expect(input.accept).toContain("image/jpeg");
    expect(input.accept).toContain("image/svg+xml");
  });

  it("shows uploaded photos by their role, not their stored address", () => {
    function Uploaded() {
      const [images, setImages] = useState<Img[]>([
        { url: "/uploads/a.webp", alt: "", blurDataUrl: BLUR },
        { url: "/uploads/b.webp", alt: "", blurDataUrl: BLUR },
      ]);
      return <ImageUrlEditor value={images} onChange={setImages} />;
    }
    render(<Uploaded />);
    expect(screen.getByText("Main photo")).toBeDefined();
    expect(screen.getByText("Photo 2")).toBeDefined();
    expect(screen.queryByLabelText(/Image URL/)).toBeNull();
    expect(screen.queryByDisplayValue("/uploads/a.webp")).toBeNull();
  });

  it("keeps pasting a link as a secondary option", () => {
    render(<Harness onBusy={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Or paste an image link" }));
    const link = screen.getByLabelText("Image URL 2");
    fireEvent.change(link, { target: { value: "https://cdn.example.com/coat.jpg" } });
    expect(state()[1]).toEqual({
      url: "https://cdn.example.com/coat.jpg",
      alt: "",
    });
  });
});
