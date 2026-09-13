import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Defense in depth — the one place that renders less-trusted HTML
          // (MessageBody.tsx's email preview) already has its own sandboxed
          // iframe with an inline CSP; this covers the app shell itself.
          // script-src and style-src both need 'unsafe-inline': Next's App
          // Router streams RSC payloads and hydration data through inline
          // <script> tags it injects itself (verified live — 'self' alone
          // blocks them outright and hydration fails, React error #412), and
          // Tailwind/Next inject inline styles the same way. The realistic
          // threat this CSP still blocks is the one that matters for a
          // single-user localhost app: any *external* script/style/frame/
          // object source. Fonts are self-hosted via next/font, not fetched
          // from fonts.gstatic.com at runtime, so no extra font-src origin
          // is needed either.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
