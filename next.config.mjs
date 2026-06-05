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
};

export default nextConfig;
