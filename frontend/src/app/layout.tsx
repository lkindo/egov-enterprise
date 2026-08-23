import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './components/theme-provider';
import Providers from './providers';
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

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: '전자정부 표준프레임워크 - 엔터프라이즈 포털',
  description: '전사 업무 포털에서 공통 업무와 협업 기능을 제공합니다.',
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
    <div className="relative flex min-h-screen flex-col bg-background/50 selection:bg-primary/20 selection:text-primary">
      {/* Skip Navigation: 본문 바로가기 링크 추가 (웹 접근성 준수) */}
      <a
        href="#main-content"
        data-sidebar-modal-background="skip-link"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-surface-inverse focus:text-surface-inverse-foreground focus:px-5 focus:py-3 focus:rounded-[var(--radius-hub-item)] focus:font-bold focus:shadow-2xl focus:border focus:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300"
      >
        본문 바로가기
      </a>
      <Suspense fallback={<div className="h-11 border-b border-border bg-white/80" />}>
        <Header menusPromise={menusPromise} />
      </Suspense>
      <div className="flex flex-1">
        <Suspense fallback={<aside className="hidden lg:block w-72 border-r bg-card h-full" />}>
          <Sidebar menusPromise={menusPromise} />
        </Suspense>
        {/* id="main-content" 및 tabIndex={-1} 속성을 주입하여 Skip Navigation 타겟 바인딩 (포커스 outline은 기본 제거) */}
        <main
          id="main-content"
          data-sidebar-modal-background="main"
          tabIndex={-1}
          className="flex-1 lg:pl-72 pt-1 min-w-0 scroll-mt-16 transition-opacity duration-300 overflow-x-hidden outline-none"
        >
          <div className="max-w-[var(--page-max-w)] mx-auto p-[var(--page-pad)] md:p-[var(--page-pad-md)] lg:p-[var(--page-pad-lg)] min-h-[calc(100vh-11rem)]">
            <PageTransition>
              <Suspense fallback={
                <div className="flex h-full w-full flex-col items-center justify-center min-h-[500px] text-muted-foreground font-medium">
                  <h1 className="sr-only">페이지 콘텐츠를 불러오는 중</h1>
                  <p role="status" aria-live="polite">페이지 콘텐츠를 불러오는 중...</p>
                </div>
              }>
                {children}
              </Suspense>
            </PageTransition>
          </div>
          <Footer className="border-t border-border/20 py-8 mb-4 px-6" />
        </main>
      </div>
    </div>
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
            <h1 className="sr-only">전자정부 Enterprise</h1>
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
  return (
    <html lang="ko" className="scroll-pt-16" data-brand-theme={brandTheme} data-density={density} suppressHydrationWarning>
      <body className={`${pretendard.variable} ${inter.variable} ${outfit.variable} antialiased font-sans`}>
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
                <h1 className="sr-only">전자정부 Enterprise</h1>
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
