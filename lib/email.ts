// Order confirmation email sender (LIVE-03, D-05, D-06). This is the SINGLE
// shared entry point required by D-06: called from both the Stripe webhook
// (real payments) and the demo/stub checkout branch, so UAT testers exercise
// the identical send path a paying customer will. Plan 11-05 owns wiring
// both call sites — this file does not call itself anywhere.
import { Resend } from "resend";
import { render } from "react-email";
import { prisma } from "@/lib/db";
import { buildOrderConfirmationContent } from "@/lib/email-content";
import OrderConfirmationEmail from "@/emails/OrderConfirmation";

// Same null-if-no-key idiom as lib/stripe.ts's `stripe`/`stripeEnabled`. An
// unset key is an ordinary, expected, non-crashing state.
const key = process.env.RESEND_API_KEY;
const resend = key ? new Resend(key) : null;
export const emailEnabled = Boolean(key);

/**
 * Sends the branded order confirmation email for `orderId`.
 *
 * - No-ops (resolves, sends nothing) when RESEND_API_KEY is unset.
 * - No-ops when the order id does not resolve to a row.
 * - The recipient is derived SOLELY from the looked-up order's own `email`
 *   column — the signature takes an order id and nothing else, so no caller
 *   can ever steer a receipt toward an address of its choosing
 *   (T-11-04-01).
 * - Never throws: a Resend outage is logged and swallowed so a mail failure
 *   can never propagate into the Stripe webhook and trigger a retry storm
 *   against an order that is already durably marked paid (T-11-04-04).
 */
export async function sendOrderConfirmation(orderId: string): Promise<void> {
  if (!resend) {
    console.warn(
      "sendOrderConfirmation: RESEND_API_KEY not set — skipping send",
      { orderId },
    );
    return;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const content = buildOrderConfirmationContent(
    order,
    process.env.NEXTAUTH_URL ?? null,
  );
  const element = OrderConfirmationEmail({ content });
  const text = await render(element, { plainText: true });

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to: order.email,
      subject: content.subject,
      react: element,
      text,
    });

    if (result?.error) {
      console.error("sendOrderConfirmation: Resend API error", {
        orderId,
        name: result.error.name,
        message: result.error.message,
      });
    }
  } catch (err) {
    const error = err as Error;
    console.error("sendOrderConfirmation: send failed", {
      orderId,
      name: error?.name,
      message: error?.message,
    });
  }
}
