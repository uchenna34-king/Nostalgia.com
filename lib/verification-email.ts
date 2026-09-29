// Sign-up verification email. Kept out of lib/email.ts on purpose: that module
// is the single order-confirmation sender and must not expose a function that
// takes an arbitrary recipient (D-06, T-11-04-01). This one has to — the
// address being verified is the recipient — and is only called from the
// register action with the email that was just validated and parked.
import { Resend } from "resend";

const key = process.env.RESEND_API_KEY;
const resend = key ? new Resend(key) : null;
export const verificationEmailEnabled = Boolean(key);

/**
 * Sends the sign-up verification link. Returns whether Resend accepted it —
 * false when RESEND_API_KEY is unset or the send failed. Never throws.
 */
export async function sendVerificationEmail(
  to: string,
  link: string,
): Promise<boolean> {
  if (!resend) return false;

  const text = [
    "Welcome to Nostalgia.",
    "",
    "Confirm your email address to finish creating your account:",
    link,
    "",
    "The link works once and expires in 24 hours. If you didn't sign up, ignore this email and no account will be created.",
  ].join("\n");

  const safeLink = link.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  // Same type and palette as emails/OrderConfirmation.tsx (system stacks —
  // mail clients can't load the site's web fonts).
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#000000;max-width:480px;margin:0 auto;padding:32px 24px">
<p style="letter-spacing:.2em;text-transform:uppercase;font-size:12px;color:#595959;margin:0 0 16px">The House of Nostalgia</p>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;margin:0 0 16px">Confirm your email</h1>
<p style="font-size:14px;line-height:1.6;margin:0 0 24px">Click below to finish creating your account.</p>
<p style="margin:0 0 24px"><a href="${safeLink}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:12px;letter-spacing:.15em;text-transform:uppercase">Verify email</a></p>
<p style="font-size:12px;line-height:1.6;color:#595959;margin:0">The link works once and expires in 24 hours. If you didn't sign up, ignore this email and no account will be created.</p>
</div>`;

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM as string,
      to,
      subject: "Confirm your email for Nostalgia",
      html,
      text,
    });
    if (result?.error) {
      console.error("sendVerificationEmail: Resend API error", {
        name: result.error.name,
        message: result.error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    const error = err as Error;
    console.error("sendVerificationEmail: send failed", {
      name: error?.name,
      message: error?.message,
    });
    return false;
  }
}
