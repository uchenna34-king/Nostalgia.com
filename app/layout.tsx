import type { Metadata } from "next";
import { fraunces, inter } from "@/lib/fonts";
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
      <body className="grain min-h-screen">{children}</body>
    </html>
  );
}
