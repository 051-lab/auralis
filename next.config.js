/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production builds out of `.next` so `npm run build` cannot clobber
  // assets served by a concurrently running `next dev` process.
  distDir: process.env.NODE_ENV === 'production' ? '.next-build' : '.next',
};

module.exports = nextConfig;
