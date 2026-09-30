import SignInForm from "@/components/SignInForm";
import { googleEnabled, demoLoginEnabled } from "@/lib/auth";
import { OWNER_EMAIL } from "@/lib/admin";
import { safeCallbackUrl } from "@/lib/registration-rules";
import { signInErrorMessage } from "@/lib/auth-errors";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string | string[] };
}) {
  // Same-site paths only: the password form navigates to this itself.
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);
  // NextAuth's error code, mapped to fixed copy — the raw value is never shown.
  const errorCode = Array.isArray(searchParams.error)
    ? searchParams.error[0]
    : searchParams.error;
  const errorMessage = signInErrorMessage(errorCode);

  return (
    <main className="container-x flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow">The House of Nostalgia</p>
      <h1 className="mt-3 font-serif text-5xl font-normal">Welcome back</h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        Sign in to keep your bag, track orders, and check out.
      </p>

      {errorMessage && (
        <p role="alert" className="mt-6 max-w-sm text-sm text-sepia">
          {errorMessage}
        </p>
      )}

      <div className="mt-10 flex justify-center">
        <SignInForm
          googleEnabled={googleEnabled}
          demoEnabled={demoLoginEnabled}
          callbackUrl={callbackUrl}
          ownerEmail={demoLoginEnabled ? OWNER_EMAIL : undefined}
        />
      </div>

    </main>
  );
}
