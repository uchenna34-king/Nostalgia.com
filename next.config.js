/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Required only so the first-party committed /products/*.svg placeholder
    // assets pass through the next/image optimizer instead of 400-ing. Safe
    // here because these SVGs are our own committed placeholders, never user
    // uploads, and the sandbox CSP below neutralizes any embedded script.
    // Becomes a no-op once real raster photography replaces the placeholders.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Sign-in is Google only. Old /register links (and emailed verify links)
  // land on the Google sign-in page, keeping where they were headed.
  async redirects() {
    return [
      { source: "/register", destination: "/signin", permanent: false },
      { source: "/register/:path*", destination: "/signin", permanent: false },
    ];
  },
};

module.exports = nextConfig;
