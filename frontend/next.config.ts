import withBundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  cacheComponents: true,
  // [2026-08-08] Next 는 기본으로 `X-Powered-By: Next.js` 를 붙인다.
  //   OWASP ZAP 첫 유효 스캔에서 실제로 지적됐다 — `Server Leaks Information via
  //   "X-Powered-By" HTTP Response Header Field [10037]`.
  //   프레임워크·버전 노출은 공격자가 알려진 취약점을 겨냥할 표면을 좁혀 주므로 끈다.
  //   기능 영향 없음(순수 정보성 헤더).
  poweredByHeader: false,
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
    //  - style-src/font-src: Google Fonts 도메인 2개 제거(2026-07-29).
    //    앱 본체는 layout.tsx 가 next/font/google 을 쓰므로 Next 가 빌드타임에 폰트를 받아
    //    /_next/static 으로 셀프호스팅한다 — 런타임에 fonts.googleapis/gstatic 으로 나가는 요청이 없다.
    //    ⚠ 단, 앱 소스(src/) 밖에 예외가 하나 있었다: public/governance_harness_atlas.html 이
    //    두 도메인을 실제로 참조하고 있었다(게다가 Pretendard 를 받는 cdn.jsdelivr 은 CSP 에 등재된
    //    적이 없어 이미 차단 중이었다 — 그 문서는 CSP 와 어긋난 상태였다). 그 파일의 외부 폰트 의존을
    //    함께 끊어 시스템 폰트로 전환했기에 여기서 두 출처를 지울 수 있다.
    //    → public/ 에 정적 HTML 을 추가할 때 이 CSP 가 그대로 적용된다는 점에 주의할 것.
    //    폰트 세분화(style-src-elem/attr)는 sonner·framer-motion 런타임 <style> 주입 검증이
    //    선행돼야 하므로 Phase 3 잔여로 둔다.
    const cspProd = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://images.unsplash.com blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-uri /api/security/csp; report-to csp-endpoint;`;
    const cspDev = `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https://images.unsplash.com blob: data:; font-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`;
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
          // [2026-08-08] Cross-Origin-Resource-Policy. ZAP 첫 유효 스캔 지적분
          //   `Cross-Origin-Resource-Policy Header Missing or Invalid [90004]`.
          //   이 헤더가 없으면 다른 출처가 우리 응답을 <img>/<script> 등으로 끌어가 담을 수 있고,
          //   그것이 Spectre 계열 사이드채널과 XS-Leaks 의 전제가 된다.
          //   `same-origin` 을 고른 이유: 이 앱은 정적 자산까지 전부 동일 출처에서 제공한다
          //   (CSP 의 `default-src 'self'`·`font-src 'self'` 와 정합. 외부 출처는 img-src 의
          //   images.unsplash.com 하나뿐인데 그건 **우리가 가져오는** 방향이라 CORP 와 무관하다).
          //   ⚠ 만약 이 앱의 자산을 다른 출처에서 임베드해야 할 일이 생기면 `cross-origin` 으로
          //   완화해야 한다 — 그때는 완화 사유를 여기 남길 것.
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // [2026-08-08] COEP / Permissions-Policy. ZAP 2차 유효 스캔 지적분
          //   `Cross-Origin-Embedder-Policy Header Missing [90004]` x6,
          //   `Permissions Policy Header Not Set [10063]` x5.
          //
          //   COEP 값 선택 — `require-corp` 가 아니라 `credentialless` 를 쓴다.
          //   `require-corp` 는 CORP 헤더를 안 주는 **모든** 교차출처 리소스를 차단한다.
          //   이 앱의 교차출처 이미지는 `images.unsplash.com` 하나인데(BoardPreview 의 목 데이터),
          //   그건 `next/image` 를 거쳐 `/_next/image` 로 프록시되므로 브라우저 입장에선
          //   동일 출처다 — 즉 지금은 require-corp 여도 깨지지 않는다.
          //   그럼에도 credentialless 를 고르는 이유: **다음에 누가 <img src="https://...">
          //   를 직접 쓰면 require-corp 는 그 이미지를 조용히 깨뜨린다.** credentialless 는
          //   자격증명 없이 로드해 같은 격리 수준(cross-origin isolation)을 얻으면서 그 함정이 없다.
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          // 쓰지 않는 강력 기능은 기본적으로 끈다. 이 앱은 카메라·마이크·위치·결제를 쓰지 않는다
          //   (전수 grep: getUserMedia·geolocation·PaymentRequest 0건).
          //   `interest-cohort` 는 표준에서 빠졌으므로 넣지 않는다.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
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
        // ⚠ [W1-12] 이 rewrite 는 **애플리케이션 포트**를 가리킨다. 관리 포트(prod 의
        //   management.server.port=9090)로 옮기지 말 것 — 관리 컨텍스트는 별도 웹서버라
        //   메인 컨텍스트의 SecurityFilterChain 이 걸리지 않는다. 그쪽으로 프록시하면
        //   rbac secure-paths 가 /actuator/** 에 요구하던 ROLE_ADMIN 이 사라져,
        //   브라우저 누구나 same-origin 경로로 메트릭(엔드포인트·에러율·JVM 내부)을 읽게 된다.
        //   그것은 '네트워크로 푼다'는 W1-12 의 결정을 정면으로 되돌리는 권한 완화다(§0.7-H3).
        //   결과적으로 운영에서 이 프록시는 404 이며, 그것이 의도된 형상이다 —
        //   관측 화면은 '미가용/UNKNOWN' 으로 정직하게 축퇴한다(observability/page.tsx).
        source: '/actuator/:path*',
        destination: `${(process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/').replace(/api\/v1\/?$/, '')}actuator/:path*`,
      },
      {
        // [2026-07-28 정정] 종전에는 백엔드 주소를 **하드코딩**했다. 바로 위 두 rewrite 는 모두
        //   BACKEND_API_URL / NEXT_PUBLIC_API_URL 을 따르는데 ws 만 예외라, 백엔드를 다른 포트에
        //   띄우면 WebSocket 만 엉뚱한 곳(그 포트를 점유한 무관한 서비스)으로 프록시된다.
        //   실측(2026-07-28): api 를 18080 으로 옮겨 E2E 를 재현하자 /ws/* 가 8080 의 다른 앱으로
        //   흘러 그 앱의 index.html(200)이 돌아왔고, 브라우저가 SockJS 핸드셰이크 실패와
        //   MIME 오류를 연쇄로 뿜어 **콘솔 가드가 131건을 잡고 테스트가 무더기로 red** 가 됐다.
        //   위 actuator rewrite 와 동일한 규칙으로 베이스를 유도한다.
        source: '/ws/:path*',
        destination: `${(process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/').replace(/api\/v1\/?$/, '')}ws/:path*`,
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
