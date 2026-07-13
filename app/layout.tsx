import type { Metadata } from "next";
import { fraunces, inter } from "@/lib/fonts";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nostalgia — Wear the memory",
  description:
    "Nostalgia is a clothing house blending vintage editorial, quiet luxury, and bold streetwear.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="grain flex min-h-screen flex-col">
        <Providers>
          <Nav />
          <div className="flex-1">{children}</div>
          <Footer />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
