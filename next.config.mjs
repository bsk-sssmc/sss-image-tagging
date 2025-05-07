import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable CSS modules
  experimental: {
    appDir: true,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
