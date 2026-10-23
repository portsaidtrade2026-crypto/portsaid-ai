const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // The Replit proxy strips :5000 from x-forwarded-host while the browser
  // includes it in Origin. Permit only this workspace's development origin.
  ...(process.env.REPLIT_DEV_DOMAIN && {
    experimental: {
      serverActions: {
        allowedOrigins: [`${process.env.REPLIT_DEV_DOMAIN}:5000`],
      },
    },
  }),
  typescript: {
    ignoreBuildErrors: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    // Product image URLs are ABSOLUTE in production (e.g.
    // https://portsaid.com.tr/static/<file>, from the local file
    // provider's backend_url - toStorefrontMediaUrl only rewrites the
    // http://localhost variant used in dev, so the deployed site's own
    // domain still needs an explicit remotePattern here or every product
    // image 400s from the optimizer). Derived from NEXT_PUBLIC_BASE_URL so
    // this doesn't have to be hand-edited per environment (Replit dev vs
    // this VPS). Needs `sharp` installed to actually run (added to
    // package.json) - without it this would silently fall back to serving
    // originals unoptimized, same as before.
    formats: ["image/webp"],
    remotePatterns: [
      ...(() => {
        try {
          const u = new URL(process.env.NEXT_PUBLIC_BASE_URL || "")
          return [{ protocol: u.protocol.replace(":", ""), hostname: u.hostname }]
        } catch {
          return []
        }
      })(),
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "github.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
    ],
  },
}

module.exports = nextConfig
