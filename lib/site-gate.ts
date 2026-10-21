// Where a signed-out visitor meets the "Sign in to Nostalgia" gate
// (components/SiteGate.tsx): on opening any product. Browsing — home, shop,
// collections, wishlist, policies — stays open to everyone; clicking into a
// piece is where the account comes in. Checkout, account and admin are still
// enforced on the server regardless.
const GATED_PREFIX = "/product/";

export function isGatedPath(pathname: string | null | undefined): boolean {
  return !!pathname && pathname.startsWith(GATED_PREFIX) && pathname.length > GATED_PREFIX.length;
}

/**
 * "This browser was signed in last time." The session itself only arrives
 * after a network round trip, so without a hint the gate would pop up late —
 * after the page has already painted. Instead the gate is in the very first
 * HTML, and this hint (checked by SESSION_HINT_SCRIPT before first paint)
 * hides it for returning customers so they never see it flash.
 *
 * It is only a display hint, never trusted: the real session still decides,
 * and the hint is rewritten from it on every visit.
 */
export const SESSION_HINT_KEY = "nostalgia-signed-in";
export const SESSION_HINT_CLASS = "session-hint";

/** Blocking <head> script: marks <html> before paint if the hint is set. */
export const SESSION_HINT_SCRIPT = `(function(){try{if(localStorage.getItem("${SESSION_HINT_KEY}"))document.documentElement.classList.add("${SESSION_HINT_CLASS}")}catch(e){}})()`;

// localStorage throws outright in some privacy modes — treat that as "no hint".
export function readSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSessionHint(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(SESSION_HINT_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    /* private mode: the gate just falls back to waiting for the session */
  }
}
