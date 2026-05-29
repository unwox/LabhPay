/** @type {import('next').NextConfig} */

// Stage 10 — locked-down security headers.
//
// The frontend talks to the backend through a same-origin proxy mounted at
// /api/*. This avoids browser third-party cookie blocking (Chrome / Safari)
// for the auth session cookies set by the FastAPI backend on hf.space.
//
// The proxy target is configured via NEXT_PUBLIC_API_BASE (e.g.
// "https://labhpay-backend.hf.space" in prod, "http://localhost:8000" in dev).

const apiOrigin = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").replace(/\/$/, "");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  // Google Identity Services renders the button inside an iframe hosted at
  // accounts.google.com — we explicitly allow it.
  "frame-ancestors 'none'",
  "frame-src 'self' https://accounts.google.com",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data:",
  // Next.js needs 'unsafe-inline' for hydration styles; everything else is locked down.
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  // Allow Next's runtime + Google's GSI client.
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
  // API traffic goes through /api/* (same-origin), so we only need 'self' + Google.
  "connect-src 'self' https://accounts.google.com",
  "worker-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=(), payment=(), usb=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security",
         value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes was useful in dev but rejects dynamic redirect targets like
  // router.replace(<query-param-string>). Disabled for prod builds.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Same-origin proxy: browser sees /api/* as labhpay.com, so the FastAPI
  // session cookies become first-party and survive third-party-cookie blocks.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
