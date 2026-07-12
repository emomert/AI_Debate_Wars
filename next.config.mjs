/**
 * Baseline security response headers, applied to every route. These are cheap,
 * low-risk hardening (clickjacking, MIME-sniffing, referrer leakage, TLS
 * downgrade). A strict Content-Security-Policy is intentionally NOT set here yet
 * — the app relies on Next's inline runtime/styles, so a wrong CSP would break
 * the live UI; the main stored-XSS vector (href schemes) is already blocked at
 * src/lib/utils/url.ts. Adding a tuned CSP is a tracked follow-up.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the Next.js dev indicator ("N" badge) in the bottom-left corner.
  devIndicators: false,
  // Phase 1 is a static UI build. ESLint is not wired up yet, so we don't let
  // the (absent) lint step block `next build`. TypeScript checking stays ON so
  // type errors still fail the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
