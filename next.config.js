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
};

module.exports = nextConfig;
