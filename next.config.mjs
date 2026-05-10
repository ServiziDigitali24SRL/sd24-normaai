/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: new URL('.', import.meta.url).pathname,
  },
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: { exclude: ["error"] },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/login", destination: "/", permanent: false },
      { source: "/auth/login", destination: "/", permanent: false },
      { source: "/piani", destination: "/", permanent: false },
      { source: "/formazione", destination: "/", permanent: false },
      // SER-184 — LandingHero CTA usa /voce + /reel (italiano marketing).
      // Redirect a route reali implementate (PR #39 sd24-normaai e
      // canale Instagram pubblico).
      { source: "/voce", destination: "/voice", permanent: false },
      {
        source: "/reel",
        destination: "https://www.instagram.com/normaai_official",
        permanent: false,
        basePath: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions-Policy: enable microphone for own origin so the
          // Vapi voice orb can call getUserMedia. Camera/geolocation stay off.
          // (Empty `()` means "blocked everywhere"; `(self)` means "this origin".)
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is required by Daily.co's call-machine bundle
              // (used internally by the Vapi web SDK) — verified via runtime
              // CSP error: "Failed to load call object bundle ... EvalError: Refused".
              // c.daily.co serves the bundle script.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://plausible.io https://*.daily.co",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.daily.co",
              "font-src 'self' data: https://fonts.gstatic.com",
              "media-src 'self' blob: https://*.daily.co",
              "worker-src 'self' blob:",
              // Vapi web SDK signaling: api.vapi.ai (REST) + Daily.co WSS for
              // WebRTC signaling + LiveKit (some Vapi paths use it).
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.openai.com https://api.stripe.com https://*.sentry.io https://sentry.io https://de.sentry.io https://plausible.io https://openrouter.ai https://api.vapi.ai wss://api.vapi.ai https://*.daily.co wss://*.daily.co https://*.livekit.cloud wss://*.livekit.cloud",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/((?!leads/preview).)*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
