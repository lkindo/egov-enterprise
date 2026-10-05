import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './components/theme-provider';
import Providers from './providers';
import { ApplicationFrame } from './components/layout/ApplicationFrame';
import { Header } from './components/layout/header';
import { Sidebar } from './components/layout/sidebar';
import { Footer } from './components/layout/footer';
import { Inter, Outfit } from 'next/font/google';
import localFont from 'next/font/local';
import { PageTransition } from './components/layout/page-transition';
import { resolveBrandTheme } from '@/lib/theme/brand-theme';
import { resolveDensity } from '@/lib/theme/density';
import { GlobalUIComponents } from './components/layout/GlobalUIComponents';
import { cookies, headers } from 'next/headers';
import { getInitialMenus } from '@/lib/api/menu-loader';
import { Suspense } from 'react';
import { authService, UserInfo } from '@/services/foundation/auth/authService';
import { SITE_IDENTITY } from '@/config/site-identity';
import { POPSTATE_GATE_SCRIPT } from '@/lib/navigation/popstate-gate';
import { SIDEBAR_COLLAPSE_SCRIPT } from '@/lib/layout/sidebar-collapse-script';

// [2026-10-01] 한글 전체를 담은 가변 글꼴(약 2MB)이라 미리 불러오지 않는다.
//   인증 업무 실측에서도 2.06MB 전송·13초 다운로드와 뒤늦은 글꼴 전환이 관측됐다.
//   optional은 느린 첫 방문에서 대체 글꼴을 유지해 늦은 전환을 막고, 캐시된 글꼴은 다음 방문에서 사용한다.
//   번들 예산 스크립트가 라우트별 preload 글꼴 바이트를 막는다.
const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  display: 'optional',
  preload: false,
  weight: '45 920',
  variable: '--font-pretendard',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: SITE_IDENTITY.siteName,
  description: SITE_IDENTITY.siteDescription,
};

// [csp Phase 4] nonce CSP 는 모든 문서가 요청 시점에 렌더된다는 전제 위에 서 있다 —
// 정적 프리렌더 HTML 의 inline script 에는 그 요청의 nonce 가 없어 통째로 차단된다.
// 아래 cookies() 사용만으로도 현재는 전 라우트가 동적이지만, 그 사실은 리팩터링 한 번에
// 조용히 사라질 수 있는 부수효과라 명시적 불변식으로 고정한다(csp-policy 계약이 유지를 강제).
export const dynamic = 'force-dynamic';

async function AppShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const menusPromise = getInitialMenus(accessToken);
  
  return (
    <ApplicationFrame
      header={<Suspense fallback={<div className="h-[var(--app-header-height)] border-b border-border bg-card" />}><Header menusPromise={menusPromise} /></Suspense>}
      // [2026-10-05 DEC-OPS-228] 자리표시도 data-app-sidebar 를 단다 — 접힌 채 새로고침하면 globals.css 가 이것도 좁은 띠로 줄여
      //   메뉴가 오기 전후로 본문 여백·경계선이 튀지 않는다. 경계선 단추는 사이드바(Suspense 안)에만 둔다 — 자리표시는 서버가
      //   메뉴를 스트리밍하는 짧은 동안만 보이고 그 동안은 펼쳐도 보일 메뉴가 없다. 자리표시에 단추를 두면 메뉴가 도착해 자리표시가
      //   사이드바로 바뀌는 순간 그 단추가 DOM 에서 사라져, 거기 있던 포커스가 문서 처음으로 떨어진다(2.4.3).
      sidebar={<Suspense fallback={<aside data-app-sidebar="" className="fixed left-0 top-[var(--app-header-height)] hidden h-[calc(100dvh-var(--app-header-height))] w-[var(--app-sidebar-width)] border-r bg-card lg:block" />}><Sidebar menusPromise={menusPromise} /></Suspense>}
      footer={<Footer />}
    >
      <PageTransition>
        <Suspense fallback={<div className="flex min-h-64 items-center justify-center text-muted-foreground"><h1 className="sr-only">페이지 콘텐츠를 불러오는 중</h1><p role="status">페이지 콘텐츠를 불러오는 중...</p></div>}>
          {children}
        </Suspense>
      </PageTransition>
    </ApplicationFrame>
  );
}

async function ProvidersWithAuth({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 인증 정보를 서버 사이드에서 미리 조회 (성능 최적화 및 플리커 방지)
  let initialUser: UserInfo | null = null;
  if (accessToken) {
    try {
      initialUser = await authService.getCurrentUser();
    } catch {
      initialUser = null;
    }
  }

  return (
    <Providers initialUser={initialUser}>
      <Suspense fallback={null}>
        <GlobalUIComponents />
      </Suspense>
      <Suspense fallback={
        <main className="min-h-screen flex items-center justify-center font-bold text-lg text-primary">
          <div>
            <h1 className="sr-only">{SITE_IDENTITY.siteAccessibleName}</h1>
            <p role="status" aria-live="polite">애플리케이션을 준비하는 중...</p>
          </div>
        </main>
      }>
        <AppShell>
          {children}
        </AppShell>
      </Suspense>
    </Providers>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // [csp Phase 4] next-themes 는 FOUC 방지 inline <script> 를 직접 렌더하는데, Next 의 자동
  // nonce 부착은 Next 가 생성하는 태그에만 미쳐 이 스크립트는 nonce 없이 나간다 — 그러면
  // CSP 가 테마 초기화만 조용히 차단한다(2026-08-20 CI e2e 실측: sha256-J9cZ… 전 페이지 차단,
  // 로컬 프로드 렌더에서 inline 11개 중 유일한 무-nonce 스크립트로 해시까지 일치 확인).
  // proxy.ts(nextWithCsp)가 요청당 x-nonce 를 실어 주고 여기서 prop 으로 넘긴다.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  // 브랜드 프로필은 배포 단위 서버 설정이다 — allowlist 검증을 거쳐 <html> 한 곳에만 배선한다
  // (라우트별 배정은 ADR-0004 금지, 미설정 시 premium). theme-token-contract 가 이 배선을 강제한다.
  const brandTheme = resolveBrandTheme(process.env.BRAND_THEME);
  // 밀도 축은 브랜드와 직교하는 배포 단위 서버 설정이다(D1, DEC-OPS-015) — 같은 규칙으로
  // allowlist 검증 뒤 <html> 한 곳에만 배선한다(미설정 시 comfortable = 렌더링 무변경).
  const density = resolveDensity(process.env.UI_DENSITY);
  // [2026-09-16 GAP-UIF-001] next/font 변수는 <html>(:root)에 둔다. globals.css 의 @theme 는
  // --font-sans 를 :root 에서 계산하는데, 변수를 body 에만 두면 그 시점에 값이 없어 별칭 전체가
  // 무효가 되고 브라우저는 시스템 대체 글꼴로 떨어졌다 — 번들한 Pretendard 가 쓰이지 않았다.
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${inter.variable} ${outfit.variable} scroll-pt-16`}
      data-brand-theme={brandTheme}
      data-density={density}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans">
        {/* [2026-10-03] 뒤로 가기 미저장 확인의 문지기 — 앱 번들(Next 라우터의 popstate 처리기)보다 먼저 등록돼야 한다
            (popstate-gate.ts). 정적 문자열이고 요청 nonce 를 붙인다. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: POPSTATE_GATE_SCRIPT }} />
        {/* [2026-10-05] 넓은 화면 사이드바 접힘을 그리기 전에 되살린다 — 본문보다 먼저 실행돼야 첫 화면이 펼쳤다가 접히지
            않는다(sidebar-collapse-script.ts). 정적 문자열이고 요청 nonce 를 붙인다. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SIDEBAR_COLLAPSE_SCRIPT }} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
          nonce={nonce}
        >
          {/* [a11y] 이 폴백은 최외곽이라 표시되는 동안 헤더/사이드바/main 이 전혀 렌더되지 않는다.
              종전 순수 div 였던 탓에 이 상태에서는 landmark-one-main·region·page-has-heading-one 이
              모두 위반이었다(2026-07-27 axe 감사에서 실제로 이 노드가 지목됨).
              로딩 상태도 랜드마크 안에 있어야 하고, 진행 상황은 스크린리더에 알려야 한다. */}
          <Suspense fallback={
            <main className="min-h-screen flex items-center justify-center font-bold text-lg text-primary">
              <div>
                <h1 className="sr-only">{SITE_IDENTITY.siteAccessibleName}</h1>
                <p role="status" aria-live="polite">보안 세션을 확인하는 중...</p>
              </div>
            </main>
          }>
            <ProvidersWithAuth>
              {children}
            </ProvidersWithAuth>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
