import type { Metadata } from "next";
import { bodoni } from "@/lib/fonts";
import Providers from "@/components/Providers";
import Footer from "@/components/Footer";
import AppFrame from "@/components/AppFrame";
import GlassMotion from "@/components/GlassMotion";
import "./globals.css";

/**
 * Applies the theme before first paint, so a dark-mode visitor never sees a
 * flash of the cream page. Has to be blocking and inline in <head> — a
 * component effect runs after paint, which is exactly the flash. Wrapped in
 * try/catch because localStorage throws outright in some privacy modes.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3002"),
  title: "Nostalgia — Wear the memory, Be the memory",
  description:
    "Nostalgia is a clothing house blending vintage editorial, quiet luxury, and bold streetwear. defined by artisans, fashion experts as the next generation of clothing line.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the script above adds `dark` to this element
    // before React hydrates, so the class list legitimately differs from the
    // server's. Scoped to <html> only — it does not suppress anything deeper.
    <html
      lang="en"
      suppressHydrationWarning
      className={bodoni.variable}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen">
        <GlassMotion />
        <Providers>
          <AppFrame footer={<Footer />}>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
