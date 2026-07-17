import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

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
      'recharts',
      'date-fns',
    ],
  },
  turbopack: {
    root: '..',
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    // [csp Phase 1] prod/dev 분리.
    //  - script-src: prod 는 'unsafe-eval' 제거(앱 소스 eval 0건 실측). 'unsafe-inline' 은 Next RSC 부트스트랩
    //    요구로 잔존(제거는 nonce+strict-dynamic=Phase 4, PPR 포기 제품결정에 게이트).
    //  - connect-src: prod 는 'self' 만(동일출처 /api·/ws 프록시 + CSP3 'self' 가 same-origin WS 승격 커버).
    //    bare 'ws: wss:'(모든 호스트 허용=XSS 유출 채널)는 dev HMR 에서만 유지.
    //  - img-src: grainy-gradients(참조 0 실측) 제거.
    //  - 위반 리포팅: /api/security/csp('csp-report' 문자열 회피 — 광고차단기 오차단 방지).
    const cspProd = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https://images.unsplash.com blob: data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-uri /api/security/csp; report-to csp-endpoint;`;
    const cspDev = `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' https://images.unsplash.com blob: data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`;
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // X-XSS-Protection 은 deprecated·XS-Leaks 벡터라 비활성('0'). 방어는 CSP·X-Content-Type-Options 로 대체.
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Reporting-Endpoints', value: 'csp-endpoint="/api/security/csp"' },
          { key: 'Content-Security-Policy', value: isProd ? cspProd : cspDev },
        ],
      },
    ];
  },
  async redirects() {
    // 레거시 camelCase 게시판 라우트 → kebab-case 정규 경로 (기존 북마크/딥링크 보존)
    return [
      {
        source: '/admin/community/boards/selectBoardList',
        destination: '/admin/community/boards/select-board-list',
        permanent: true,
      },
      {
        source: '/admin/community/boards/insertBoardArticle',
        destination: '/admin/community/boards/insert-board-article',
        permanent: true,
      },
      // (nav-07) selectBoardArticle/:id* → select-board-article/:id* redirect 제거:
      // 목적지 라우트(select-board-article/[id])가 死라우트로 삭제됨(레거시 source도 inbound 0건).
      // 통합 허브(탭)로 이관된 기능의 orphan 독립 라우트 → 메뉴가 선언한 정식 목적지로 정합
      // (메뉴 modern_route = /admin/survey/hub?tab=*, /admin/system/monitoring/hub?tab=* 기준)
      { source: '/admin/survey/manage', destination: '/admin/survey/hub?tab=manage', permanent: false },
      { source: '/admin/survey/questions', destination: '/admin/survey/hub?tab=questions', permanent: false },
      { source: '/admin/survey/stats', destination: '/admin/survey/hub?tab=stats', permanent: false },
      { source: '/admin/survey/items', destination: '/admin/survey/hub?tab=items', permanent: false },
      { source: '/admin/survey/respondents', destination: '/admin/survey/hub?tab=respondents', permanent: false },
      { source: '/admin/survey/templates', destination: '/admin/survey/hub?tab=templates', permanent: false },
      { source: '/admin/observability', destination: '/admin/system/monitoring/hub?tab=observability', permanent: false },
      { source: '/admin/security/audit', destination: '/admin/system/monitoring/hub?tab=security', permanent: false },
      { source: '/admin/system/audit', destination: '/admin/system/monitoring/hub?tab=system', permanent: false },
      { source: '/admin/security/login-policy', destination: '/admin/system/monitoring/hub?tab=policy', permanent: false },
      { source: '/admin/user/login-policy', destination: '/admin/system/monitoring/hub?tab=policy', permanent: false },
      // 경로 중복(정식 메뉴 타겟으로 통합)
      { source: '/admin/sanctn/workflow', destination: '/admin/workflow', permanent: false },
      { source: '/cop/sms/selectSmsList', destination: '/admin/uss/ion/sms', permanent: false },
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
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// Bundle Analyzer 적용 (ANALYZE=true 환경변수 설정 시 활성화)
const bundleAnalyzerConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

export default withNextIntl(bundleAnalyzerConfig);
