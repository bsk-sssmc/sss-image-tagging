import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable CSS modules
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost', 's3.ap-south-1.amazonaws.com'], // Added S3 domain
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3.ap-south-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
}

export default withPayload(nextConfig, { 
  devBundleServerPackages: false,
  // Add this to ensure proper bundling of PayloadCMS UI
  transpilePackages: ['@payloadcms/ui']
})
