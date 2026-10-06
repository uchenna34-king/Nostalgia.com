// Where to send someone after sign-in. Only same-site paths are kept, so a
// crafted ?callbackUrl= can't bounce a customer to another site.
export function safeCallbackUrl(value: unknown): string {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
    ? value
    : "/";
}
