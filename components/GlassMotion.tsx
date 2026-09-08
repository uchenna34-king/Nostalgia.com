"use client";

import { useEffect } from "react";

/**
 * Drives the specular highlight on glass surfaces.
 *
 * The CSS owns the *look* of the highlight; this owns only where the light
 * falls. One delegated listener pair on the document rather than handlers on
 * every control — the glass classes are applied in a dozen places and will be
 * applied in more, and a global delegate means none of them have to opt in.
 *
 * Writes two custom properties on the hovered surface:
 *   --glass-x / --glass-y  — the pointer, as a percentage of the element box
 *
 * On touch there is no hover, so `pointerdown` adds `.glass-lit` (which the CSS
 * treats exactly like `:hover`) and it is removed when the finger lifts. That
 * is what makes the highlight follow a thumb across the control on a phone
 * instead of only appearing on a mouse.
 *
 * Positions are written inside rAF: pointermove fires far faster than the
 * compositor paints, and setting a custom property per event would queue style
 * recalcs the frame never uses.
 */
const GLASS_SELECTOR = ".btn-glass, .btn-glass-ink, .glass-panel";

export default function GlassMotion() {
  useEffect(() => {
    // Reduced motion means no tracked highlight at all — CSS already drops the
    // transition, but a light that chases the cursor is motion in itself.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;
    let lit: HTMLElement | null = null;

    const paint = () => {
      frame = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      pending = null;
      el.style.setProperty("--glass-x", `${x}%`);
      el.style.setProperty("--glass-y", `${y}%`);
    };

    const surfaceFrom = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element
        ? (target.closest(GLASS_SELECTOR) as HTMLElement | null)
        : null;

    const onMove = (e: PointerEvent) => {
      const el = surfaceFrom(e.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      pending = {
        el,
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      };
      if (!frame) frame = requestAnimationFrame(paint);
    };

    // Touch/pen: light the surface for the duration of the contact.
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const el = surfaceFrom(e.target);
      if (!el) return;
      lit = el;
      el.classList.add("glass-lit");
      onMove(e);
    };

    const release = () => {
      if (!lit) return;
      lit.classList.remove("glass-lit");
      lit = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointerup", release, { passive: true });
    document.addEventListener("pointercancel", release, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      release();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
    };
  }, []);

  return null;
}
