import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig = {
  cacheComponents: true,
  // output: 'standalone', // Standalone mode causes symlink EPERM on Windows without Developer Mode/Admin. Disabling for local build verification.
  experimental: {
    // ppr: 'incremental', // Merged into cacheComponents
    // [bundle-barrel-imports] 배럴 임포트 자동 최적화 - 200-800ms 빌드 속도 향상
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      'framer-motion',
    ],
  },
  turbopack: {
    root: '..',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; img-src 'self' https://grainy-gradients.vercel.app blob: data:; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; connect-src 'self' http://localhost:8080 http://127.0.0.1:8080 ws://localhost:8080 ws://127.0.0.1:8080 wss://localhost:8080 wss://127.0.0.1:8080 https://cdn.jsdelivr.net; object-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${(process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/').replace(/\/$/, '')}/:path*`,
      },
      {
        source: '/actuator/:path*',
        destination: `${(process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/').replace(/api\/v1\/?$/, '')}actuator/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: 'http://127.0.0.1:8080/ws/:path*',
      },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/**',
      },
    ],
  },
};

// Bundle Analyzer 적용 (ANALYZE=true 환경변수 설정 시 활성화)
const bundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

export default bundleAnalyzerConfig;
