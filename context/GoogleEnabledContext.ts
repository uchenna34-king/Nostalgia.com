import { createContext, useContext } from "react";

/**
 * Whether "Continue with Google" is configured on the server. Client
 * components can't read GOOGLE_CLIENT_ID, so the root layout passes the flag
 * to <Providers>, which provides it here — the checkout sign-up dialog uses it
 * so its copy never promises Google when Google is off. Defaults to false
 * outside the provider.
 */
export const GoogleEnabledContext = createContext(false);

export function useGoogleEnabled(): boolean {
  return useContext(GoogleEnabledContext);
}
