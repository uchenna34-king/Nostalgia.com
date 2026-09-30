"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Nav from "@/components/Nav";
import CartDrawer from "@/components/CartDrawer";
import SiteGate from "@/components/SiteGate";
import { useGoogleEnabled } from "@/context/GoogleEnabledContext";
import {
  isOpenPath,
  readSessionHint,
  writeSessionHint,
} from "@/lib/site-gate";

/**
 * Chrome gate. The storefront gets the full frame (film-grain overlay, Nav,
 * Footer, CartDrawer); the /admin back-office renders bare children — no grain,
 * no storefront chrome — so app/admin/layout.tsx can supply its own dense admin
 * shell (D-14). Footer is a Server Component, so it is passed in as a prop
 * rather than imported into this client component.
 *
 * Also the sign-in gate: a signed-out visitor gets the SiteGate dialog on every
 * page except the open ones (lib/site-gate.ts), and the frame behind it goes
 * `inert` so nothing there can be clicked, tabbed to or read out. The gate is
 * in the first HTML so it's there the moment the site opens, not after the
 * session request returns; the session hint (lib/site-gate.ts) keeps it hidden
 * for browsers that were signed in last time.
 */
export default function AppFrame({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const pathname = usePathname();
  const { status } = useSession();
  const googleEnabled = useGoogleEnabled();
  const frameRef = useRef<HTMLDivElement>(null);
  // null until mounted: the server (and the first client render, which must
  // match it) can't read localStorage.
  const [hint, setHint] = useState<boolean | null>(null);

  useEffect(() => {
    setHint(readSessionHint());
  }, []);

  // Keep the hint in step with the real session once it is known.
  useEffect(() => {
    if (status === "authenticated") writeSessionHint(true);
    if (status === "unauthenticated") writeSessionHint(false);
  }, [status]);

  // "provisional": session still loading and the hint not read yet — i.e. the
  // server HTML. The gate is rendered so a new visitor sees it at first paint;
  // SESSION_HINT_SCRIPT + CSS hide it for returning customers.
  let gate: "open" | "provisional" | "closed" = "closed";
  if (!isOpenPath(pathname)) {
    if (status === "unauthenticated") gate = "open";
    else if (status === "loading") {
      if (hint === null) gate = "provisional";
      else if (!hint) gate = "open";
    }
  }
  const gated = gate === "open";

  // React 18 has no `inert` prop, so set the attribute directly.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (gated) frame.setAttribute("inert", "");
    else frame.removeAttribute("inert");
  }, [gated]);

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }
  return (
    <>
      <div ref={frameRef} className="grain flex min-h-screen flex-col">
        <Nav />
        <div className="flex-1">{children}</div>
        {footer}
        <CartDrawer />
      </div>
      <SiteGate
        open={gate !== "closed"}
        provisional={gate === "provisional"}
        callbackUrl={pathname ?? "/"}
        googleEnabled={googleEnabled}
      />
    </>
  );
}
