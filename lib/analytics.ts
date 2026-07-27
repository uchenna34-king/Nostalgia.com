// Provider-agnostic analytics foundation with a consent gate (ANLY-01,
// D-08/D-10). Prisma-free, browser-only. No event call sites are wired here —
// the five funnel emits are 10-10's scope; this module only defines trackEvent
// and the consent state machine.
import { track } from "@vercel/analytics";

const CONSENT_KEY = "nostalgia-consent";
const CONSENT_CHANGE_EVENT = "nostalgia:consent-change";

export type ConsentValue = "accepted" | "declined";

/** The five funnel events (D-09); 10-10 wires the call sites against this union. */
export type EventName =
  | "view_product"
  | "add_to_cart"
  | "begin_checkout"
  | "purchase"
  | "search";

/**
 * The stored consent choice, or null when no choice has been made yet.
 * SSR-safe: returns null when `window` is undefined rather than throwing.
 * Any unrecognized stored string also reads as null.
 */
export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CONSENT_KEY);
  return raw === "accepted" || raw === "declined" ? raw : null;
}

/**
 * Persist the consent choice, then notify listeners so a live-mounted
 * AnalyticsGate can re-render without a page reload.
 */
export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** True only when the stored choice is "accepted" (gate 1 for trackEvent). */
export function hasConsent(): boolean {
  return getConsent() === "accepted";
}

/**
 * Decoupled consent-change channel (RESEARCH Pattern 5). Registers `listener`
 * for the consent-change event and returns an unsubscribe function.
 */
export function subscribeConsent(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_CHANGE_EVENT, listener);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, listener);
}

/**
 * Emit an analytics event — but ONLY after consent (gate 1, D-10). The Vercel
 * track() call is wrapped in a try/catch with an empty body so analytics can
 * never throw into the app or break the dev-fallback path (gate 2:
 * @vercel/analytics is a documented no-op outside a Vercel deploy).
 */
export function trackEvent(
  name: EventName,
  payload?: Record<string, string | number | boolean>,
): void {
  if (!hasConsent()) return;
  try {
    track(name, payload);
  } catch {
    // Intentionally swallowed — analytics must never break the app.
  }
}
