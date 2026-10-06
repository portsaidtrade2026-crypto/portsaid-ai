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
    // Product images are same-origin (/static/... via the local file
    // provider, rewritten by toStorefrontMediaUrl) - Next's optimizer needs
    // no remotePattern for those. It needs `sharp` installed to actually
    // run (added to package.json) - without it this would silently fall
    // back to serving originals unoptimized, same as before.
    formats: ["image/webp"],
    remotePatterns: [
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
