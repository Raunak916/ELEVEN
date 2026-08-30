import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  outputFileTracingIncludes: {
    '/**': ['./data/**/*', './data/players.db'],
    '/api/**/*': ['./data/**/*', './data/players.db'],
    '/api/players/**/*': ['./data/**/*', './data/players.db'],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
