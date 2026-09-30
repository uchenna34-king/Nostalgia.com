import type { Metadata } from "next";
import RegisterForm from "@/components/RegisterForm";
import { googleEnabled } from "@/lib/auth";
import { safeCallbackUrl } from "@/lib/registration-rules";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false },
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const callbackUrl = safeCallbackUrl(searchParams.callbackUrl);

  return (
    <main className="container-x flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <p className="eyebrow">The House of Nostalgia</p>
      <h1 className="mt-3 font-serif text-5xl font-normal">Create an account</h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        Every order is placed from a verified account.{" "}
        {googleEnabled
          ? "Continue with Google, or sign up with your email and we'll send a link to confirm it."
          : "We'll email you a link to confirm your address."}
      </p>

      <div className="mt-10 flex w-full justify-center">
        <RegisterForm callbackUrl={callbackUrl} googleEnabled={googleEnabled} />
      </div>

    </main>
  );
}
