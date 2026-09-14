"use client";

import { useEffect, useRef } from "react";
import type { SizeGuide } from "@/lib/size-guides";

/**
 * Accessible size-guide dialog (UI-SPEC §3, D-06). Renders nothing when closed.
 * Honors the full dialog a11y contract: focus-in on open, focus trap, Escape to
 * close, body scroll lock, and focus restoration to the trigger on any close
 * path. Never navigates away from the PDP.
 */
export default function SizeGuideModal({
  sizeGuide,
  open,
  onClose,
}: {
  sizeGuide: SizeGuide;
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    // Capture the element to restore focus to on close (the "Size guide" trigger).
    restoreRef.current = document.activeElement;

    // Lock body scroll while open; restore the prior value on close.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog.
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Focus trap: cycle Tab / Shift+Tab among focusable elements in the panel.
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      // Restore focus to the previously-focused element (guard if detached).
      const el = restoreRef.current;
      if (el instanceof HTMLElement && document.contains(el)) el.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const headingId = "size-guide-heading";
  const measurementCount = sizeGuide.columns.length - 1;

  return (
    <>
      {/* Backdrop — click closes; sits below CartDrawer's z-[60]/z-[70]? No:
          modal is invoked from the PDP where the cart drawer is closed, so it
          uses the same overlay scale. */}
      <div
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-[60] bg-ink/40 transition-opacity motion-reduce:transition-none"
      />

      {/* Dialog panel: centered on sm+, bottom sheet under 640px. */}
      <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          className="w-full max-w-lg translate-y-0 border border-ink/10 bg-cream shadow-xl transition-transform motion-reduce:transition-none max-h-[85vh] overflow-y-auto rounded-t-xl sm:rounded-xl"
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
            <h2 id={headingId} className="font-serif text-2xl font-normal">
              Size guide — {sizeGuide.category}
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close size guide"
              className="-mr-2 flex h-11 w-11 items-center justify-center text-2xl leading-none text-ink hover:text-sepia"
            >
              ×
            </button>
          </div>

          <div className="overflow-x-auto px-6 py-5">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">{sizeGuide.category} size guide</caption>
              <thead>
                <tr className="border-b border-ink/15">
                  {sizeGuide.columns.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="py-2 pr-4 text-xs uppercase tracking-[0.12em] text-ink-soft"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeGuide.rows.map((row) => {
                  // The size/item label is the row header; the remaining columns
                  // are the trailing measurement cells (robust whether cells
                  // include the leading label or not).
                  const measurements = row.cells.slice(row.cells.length - measurementCount);
                  return (
                    <tr key={row.size} className="border-b border-ink/10 last:border-0">
                      <th scope="row" className="py-2.5 pr-4 font-medium text-ink">
                        {row.size}
                      </th>
                      {measurements.map((cell, i) => (
                        <td key={i} className="py-2.5 pr-4 text-ink-soft">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-ink-soft">
              Measurements are approximate, in inches (cm).
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
