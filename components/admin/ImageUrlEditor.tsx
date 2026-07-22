"use client";

export type Img = { url: string; alt: string };

export default function ImageUrlEditor({
  value,
  onChange,
}: {
  value: Img[];
  onChange: (next: Img[]) => void;
}) {
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

  return (
    <div>
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
                onChange={(e) => update(i, { url: e.target.value })}
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
        Add image
      </button>
    </div>
  );
}
