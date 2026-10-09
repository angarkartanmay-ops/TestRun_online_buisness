import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite loads its WASM + data files from its own package directory at runtime;
  // bundling it breaks those relative reads, so keep it a plain node_modules require.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Local-only fallbacks the server reads from disk: SQL migrations (PGlite boot) and
  // the OG-card fonts. Make sure file tracing ships them with the functions.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*", "./assets/fonts/**/*"],
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
