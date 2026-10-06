// Paths a signed-out visitor can use without the "Before you continue"
// sign-in gate (components/SiteGate.tsx). Everything else asks them to sign in
// first.
//
// - /signin: the gate's own destination — gating it would leave no way
//   through.
// - /returns, /shipping: store policies stay readable before anyone commits
//   to an account.
// - /admin: has its own chrome and its own server-side guard (middleware.ts,
//   requireOwner()).
const OPEN_PATHS = ["/signin", "/returns", "/shipping", "/admin"];

export function isOpenPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return OPEN_PATHS.some(
    (open) => pathname === open || pathname.startsWith(`${open}/`),
  );
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
