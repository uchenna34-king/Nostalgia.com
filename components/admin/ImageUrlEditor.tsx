"use client";

import { useEffect, useRef, useState } from "react";

export type Img = { url: string; alt: string; blurDataUrl?: string };

// Downscale in the browser before uploading: phone photos are often 5–10 MB,
// over Vercel's 4.5 MB request cap. The server re-encodes to its final size
// anyway, so this only has to get the file small without visible loss.
const UPLOAD_EDGE = 2400;

async function shrinkForUpload(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );
    return blob ?? file;
  } catch {
    // Formats the browser can't decode (e.g. HEIC outside Safari) go up as-is;
    // the server decides whether it can read them.
    return file;
  }
}

const UPLOAD_ERRORS: Record<string, string> = {
  not_an_image: "isn't an image we can read",
  too_large: "is too large — try a smaller photo",
  storage_not_configured: "couldn't be stored — image storage isn't set up yet",
};

async function uploadOne(file: File): Promise<Img> {
  const body = new FormData();
  body.set("file", await shrinkForUpload(file), file.name);
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    blurDataUrl?: string;
    error?: string;
  };
  if (!res.ok || !data.url) {
    throw new Error(UPLOAD_ERRORS[data.error ?? ""] ?? "failed to upload");
  }
  return { url: data.url, alt: "", blurDataUrl: data.blurDataUrl };
}

export default function ImageUrlEditor({
  value,
  onChange,
  onBusyChange,
}: {
  value: Img[];
  onChange: (next: Img[]) => void;
  /** True while uploads are in flight, so the form can hold off saving. */
  onBusyChange?: (busy: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  // Uploads finish out of order and after re-renders; always append to the
  // latest list rather than the one captured when the upload started.
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    onBusyChange?.(pending > 0);
  }, [pending, onBusyChange]);

  function update(i: number, patch: Partial<Img>) {
    onChange(value.map((img, idx) => (idx === i ? { ...img, ...patch } : img)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function add() {
    onChange([...value, { url: "", alt: "" }]);
  }

  async function uploadFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/") || !f.type);
    if (images.length === 0) return;
    setErrors([]);
    setPending((n) => n + images.length);

    await Promise.all(
      images.map(async (file) => {
        try {
          const img = await uploadOne(file);
          const next = [...latest.current, img];
          latest.current = next;
          onChange(next);
        } catch (e) {
          setErrors((prev) => [...prev, `${file.name} ${(e as Error).message}.`]);
        } finally {
          setPending((n) => n - 1);
        }
      }),
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={`mb-4 flex flex-col items-center gap-2 border border-dashed px-4 py-6 text-center text-sm transition-colors ${
          dragging ? "border-ink bg-cream-dark" : "border-ink/25"
        }`}
      >
        <p className="text-ink-soft">Drop product photos here, or</p>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="btn-outline text-xs"
        >
          Upload photos
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Upload product photos"
          onChange={(e) => {
            uploadFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <p aria-live="polite" className="text-xs text-ink-soft">
          {pending > 0
            ? `Uploading ${pending} photo${pending === 1 ? "" : "s"}…`
            : "Resized and optimised automatically."}
        </p>
        {errors.map((err) => (
          <p key={err} role="alert" className="text-xs text-[#9B2C2C]">
            {err}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {value.map((img, i) => (
          <div key={i} className="flex items-start gap-2">
            {img.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.url}
                alt=""
                className="mt-1 h-12 w-12 shrink-0 rounded-sm bg-cream-dark object-cover"
              />
            ) : (
              <div className="mt-1 h-12 w-12 shrink-0 rounded-sm bg-cream-dark" />
            )}
            <div className="flex flex-1 flex-col gap-2">
              <input
                aria-label={`Image URL ${i + 1}`}
                value={img.url}
                // A hand-edited URL no longer matches the stored placeholder.
                onChange={(e) => update(i, { url: e.target.value, blurDataUrl: undefined })}
                placeholder="/products/example-1.svg or https://…"
                className="w-full border border-ink/20 bg-cream-dark px-3 py-2 text-sm"
              />
              <input
                aria-label={`Image alt text ${i + 1}`}
                value={img.alt}
                onChange={(e) => update(i, { alt: e.target.value })}
                placeholder="Alt text (optional)"
                className="w-full border border-ink/20 bg-cream-dark px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                aria-label={`Move image ${i + 1} up`}
                disabled={i === 0}
                className="px-2 text-ink-soft hover:text-ink disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                aria-label={`Move image ${i + 1} down`}
                disabled={i === value.length - 1}
                className="px-2 text-ink-soft hover:text-ink disabled:opacity-30"
              >
                ↓
              </button>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove image ${i + 1}`}
              className="mt-1 text-sm text-[#9B2C2C] hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="btn-outline mt-3 text-xs">
        Add image by URL
      </button>
    </div>
  );
}
