/** @type {import('next').NextConfig} */
const nextConfig = {
 // output: 'standalone',
  skipTrailingSlashRedirect: true,
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },
  typescript: {
    // Set to true to allow building even with TS errors during initial deployment
    // Change to false once all type issues are resolved
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '89.167.121.126' },
    ],
  },
};

module.exports = nextConfig;
