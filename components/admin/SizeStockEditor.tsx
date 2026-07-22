"use client";

export type Variant = { size: string; stock: number };

export default function SizeStockEditor({
  value,
  onChange,
}: {
  value: Variant[];
  onChange: (next: Variant[]) => void;
}) {
  const allSoldOut =
    value.length > 0 && value.every((v) => v.stock === 0);

  function update(i: number, patch: Partial<Variant>) {
    onChange(value.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...value, { size: "", stock: 0 }]);
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        {value.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              aria-label={`Size ${i + 1}`}
              value={v.size}
              onChange={(e) => update(i, { size: e.target.value })}
              placeholder="Size (e.g. M)"
              className="w-32 border border-ink/20 bg-cream-dark px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              aria-label={`Stock for size ${v.size || i + 1}`}
              value={v.stock}
              onChange={(e) =>
                update(i, { stock: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-24 border border-ink/20 bg-cream-dark px-3 py-2 text-sm tabular-nums"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove size ${v.size || i + 1}`}
              className="text-sm text-[#9B2C2C] hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {allSoldOut && (
        <p className="mt-2 text-xs text-sepia">
          Hidden from storefront (fully sold out)
        </p>
      )}

      <button
        type="button"
        onClick={add}
        className="btn-outline mt-3 text-xs"
      >
        Add size
      </button>
    </div>
  );
}
