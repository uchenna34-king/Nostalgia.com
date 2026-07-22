"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES } from "@/lib/orders";
import { updateOrderFulfillment } from "@/app/admin/orders/actions";

export default function FulfillmentForm({
  orderId,
  status: initialStatus,
  trackingNumber: initialTracking,
  notes: initialNotes,
}: {
  orderId: string;
  status: string;
  trackingNumber: string | null;
  notes: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(false);
    try {
      // The server action re-validates status against the ORDER_STATUSES
      // allow-list — this <select> only constrains the UI, it is not the
      // security boundary.
      await updateOrderFulfillment(orderId, status, trackingNumber, notes);
      setSaved(true);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full border border-ink/20 bg-cream-dark px-3 py-2 text-sm";
  const labelClass =
    "block text-xs uppercase tracking-[0.15em] text-ink-soft mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Tracking number</label>
          <input
            className={inputClass}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            className={inputClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Updating…" : "Update order"}
        </button>
        {saved && <span className="text-xs text-sepia">Saved</span>}
        {error && (
          <span className="text-xs text-[#9B2C2C]">
            Couldn&apos;t update — try again.
          </span>
        )}
      </div>
    </form>
  );
}
