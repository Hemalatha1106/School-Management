import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Compression and optimization
  compress: true,

  // Bundle analyzer (conditionally enabled)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any) => {
      if (process.env.NODE_ENV === 'production') {
        // Enable bundle analyzer in production when ANALYZE=true
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze/client.html',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),

  // Performance optimizations
  poweredByHeader: false,
  reactStrictMode: true,

  // Output optimization
  output: 'standalone',
};

export default nextConfig;
