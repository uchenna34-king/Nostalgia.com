"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import SignUpPrompt from "@/components/SignUpPrompt";

/**
 * The single entry point to /checkout. Signed-in buyers go straight through;
 * signed-out visitors get the SignUpPrompt instead of a silent redirect.
 * While the session is still loading it behaves as a plain link — the
 * checkout page's own redirect covers that edge.
 */
export default function CheckoutButton({
  className,
  onNavigate,
  children,
}: {
  className?: string;
  /** Runs when the visitor leaves for /checkout or /signin (e.g. close drawer). */
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const { status } = useSession();
  const [promptOpen, setPromptOpen] = useState(false);
  const closePrompt = useCallback(() => setPromptOpen(false), []);

  if (status === "unauthenticated") {
    return (
      <>
        <button
          type="button"
          onClick={() => setPromptOpen(true)}
          aria-haspopup="dialog"
          className={className}
        >
          {children}
        </button>
        <SignUpPrompt
          open={promptOpen}
          onClose={closePrompt}
          onContinue={onNavigate}
        />
      </>
    );
  }

  return (
    <Link href="/checkout" onClick={onNavigate} className={className}>
      {children}
    </Link>
  );
}
