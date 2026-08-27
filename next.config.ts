import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          // Set here rather than through Traefik's shared secHeaders
          // middleware, whose permissionsPolicy would override the gyroscope
          // grant below and break the tour on phones.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Gyroscope/accelerometer stay available to the 3D tour itself.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), gyroscope=(self), accelerometer=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
