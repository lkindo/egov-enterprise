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
import { GlobalUIComponents } from './components/layout/GlobalUIComponents';
import { cookies } from 'next/headers';
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
  description: 'KRDS 기반 모던 전사 공통 모듈 및 디지털 정부 혁신 플랫폼',
};

async function AppShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const menusPromise = getInitialMenus(accessToken);
  
  return (
    <div className="relative flex min-h-screen flex-col bg-background/50 selection:bg-primary/20 selection:text-primary">
      {/* Skip Navigation: 본문 바로가기 링크 추가 (웹 접근성 준수) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-slate-900 focus:text-white focus:px-5 focus:py-3 focus:rounded-[var(--radius-hub-item)] focus:font-bold focus:shadow-2xl focus:border focus:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300"
      >
        본문 바로가기
      </a>
      <Suspense fallback={<div className="h-11 border-b border-slate-100 bg-white/80" />}>
        <Header menusPromise={menusPromise} />
      </Suspense>
      <div className="flex flex-1">
        <Suspense fallback={<aside className="hidden lg:block w-72 border-r bg-card h-full" />}>
          <Sidebar menusPromise={menusPromise} />
        </Suspense>
        {/* id="main-content" 및 tabIndex={-1} 속성을 주입하여 Skip Navigation 타겟 바인딩 (포커스 outline은 기본 제거) */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 lg:pl-72 pt-1 min-w-0 transition-opacity duration-300 overflow-x-hidden outline-none"
        >
          <div className="max-w-7xl mx-auto p-6 md:p-12 lg:p-16 min-h-[calc(100vh-11rem)]">
            <PageTransition>
              <Suspense fallback={<div className="flex h-full w-full items-center justify-center min-h-[500px] text-slate-500 font-medium">페이지 콘텐츠를 불러오는 중...</div>}>
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
    } catch (e) {
      initialUser = null;
    }
  }

  return (
    <Providers initialUser={initialUser}>
      <Suspense fallback={null}>
        <GlobalUIComponents />
      </Suspense>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-lg text-primary">애플리케이션을 준비하는 중...</div>}>
        <AppShell>
          {children}
        </AppShell>
      </Suspense>
    </Providers>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${pretendard.variable} ${inter.variable} ${outfit.variable} antialiased font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-lg text-primary">보안 세션을 확인하는 중...</div>}>
            <ProvidersWithAuth>
              {children}
            </ProvidersWithAuth>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
