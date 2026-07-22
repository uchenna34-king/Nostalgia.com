import type { Metadata } from "next";
import { fraunces, inter } from "@/lib/fonts";
import Providers from "@/components/Providers";
import Footer from "@/components/Footer";
import AppFrame from "@/components/AppFrame";
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
      <body className="min-h-screen">
        <Providers>
          <AppFrame footer={<Footer />}>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
