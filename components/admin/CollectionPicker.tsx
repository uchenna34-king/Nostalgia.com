"use client";

export type CollectionOption = { id: string; name: string };

export default function CollectionPicker({
  options,
  value,
  onChange,
}: {
  options: CollectionOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No collections yet — create one under Collections to assign products.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={value.includes(c.id)}
            onChange={() => toggle(c.id)}
          />
          {c.name}
        </label>
      ))}
    </div>
  );
}
