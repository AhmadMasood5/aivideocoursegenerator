/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ⚠️ Temporary fix for deployment
  },
  typescript: {
    ignoreBuildErrors: false, // Keep type checking
  },
}

module.exports = nextConfig