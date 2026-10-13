// Intentionally import-free (types only): which provider takes a payment, and
// whether the no-key demo checkout may run, derived as pure values from an
// env-shaped record so both security-relevant decisions are unit-testable.
// Same strict-equality idiom as lib/auth-flags.ts (D-18, D-24).
import type { Currency } from "@/lib/currency";

export type CheckoutProvider = "paystack" | "stripe";

type Env = Record<string, string | undefined>;

/**
 * NGN always goes through Paystack. USD goes through Stripe unless
 * USD_PAYMENT_PROVIDER is exactly "paystack" — the switch for when Stripe
 * can't onboard a Nigerian business (Paystack accepts USD for approved
 * Nigerian merchants). Any other value, including "Paystack" or " paystack",
 * keeps the default: an operator typo never silently reroutes money.
 */
export function resolveProvider(currency: Currency, env: Env): CheckoutProvider {
  if (currency === "NGN") return "paystack";
  return env.USD_PAYMENT_PROVIDER === "paystack" ? "paystack" : "stripe";
}

/**
 * Whether the no-key stub (order created as paid, no money taken) may run.
 * Off on production unless ALLOW_DEMO_CHECKOUT is exactly "true", so a missing
 * key on Vercel returns 503 instead of handing out free "paid" orders. Vercel
 * Preview deployments also run with NODE_ENV=production and need the flag.
 */
export function demoCheckoutAllowed(env: Env): boolean {
  return env.ALLOW_DEMO_CHECKOUT === "true" || env.NODE_ENV !== "production";
}
