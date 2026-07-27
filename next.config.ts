import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },

    ],
    // Next.js 16 requires an explicit qualities allowlist
    qualities: [25, 50, 75, 85, 100],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 24 hours
  },

  // Strip all Moment.js locale data (~238 KB removed from bundle).
  // The app only needs English; locale strings are not used.
  webpack(config, { webpack }) {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );
    return config;
  },

  // Tree-shake large icon libraries so only used icons are bundled.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=()",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin-allow-popups",
      },
      {
        key: "Cross-Origin-Resource-Policy",
        value: "cross-origin",
      },
      // HSTS: only meaningful over HTTPS; set a conservative max-age
      // Do NOT set this in dev (it would lock localhost to HTTPS)
      ...(!isDev
        ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
        : []),
      {
        // Build CSP from the project's known domains.
        // unsafe-inline is required for Tailwind/inline styles; eval is avoided.
        // Third-party: Google OAuth, Google Maps, Google Fonts, Fursa API
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          // Scripts: self + Google OAuth/Maps + unsafe-eval in development for debugger/HMR
          `script-src 'self' 'unsafe-inline' ${
            isDev ? "'unsafe-eval'" : ""
          } https://accounts.google.com https://apis.google.com https://maps.googleapis.com https://www.gstatic.com`,
          // Styles: self + inline (Tailwind, third-party components) + Google Fonts
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // Images: self + data URIs + all https for API images
          "img-src 'self' data: blob: https:",
          // Fonts: self + Google Fonts CDN
          "font-src 'self' https://fonts.gstatic.com",
          // Connections: self + backend API + Google services
          "connect-src 'self' https://portal.fursa.raiyan.cc https://accounts.google.com https://maps.googleapis.com",
          // Frames: Google OAuth popup
          "frame-src https://accounts.google.com",
          // Media
          "media-src 'self' blob:",
          // Object: none
          "object-src 'none'",
          // Base URI: self only
          "base-uri 'self'",
          // Form action: self only
          "form-action 'self'",
          // frame-ancestors replaces X-Frame-Options in modern browsers
          "frame-ancestors 'self'",
        ].join("; "),
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          // Preconnect to the API origin — browser opens TCP before first fetch
          {
            key: "Link",
            value: "<https://portal.fursa.raiyan.cc>; rel=preconnect, <https://portal.fursa.raiyan.cc>; rel=dns-prefetch",
          },
        ],
      },
    ];
  },

  turbopack: {},
};

export default nextConfig;
