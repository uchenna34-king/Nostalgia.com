import type { MetadataRoute } from "next";

const BASE = process.env.NEXTAUTH_URL ?? "http://localhost:3002";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/account", "/checkout"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
