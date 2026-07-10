/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright uses the IPv4 loopback host while local browser testing often
  // uses localhost. Next 16 otherwise blocks its development client resources.
  allowedDevOrigins: ['127.0.0.1'],
  // Keep production builds out of `.next` so `npm run build` cannot clobber
  // assets served by a concurrently running `next dev` process.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
};

module.exports = nextConfig;
