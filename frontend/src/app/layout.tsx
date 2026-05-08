import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './components/theme-provider';
import Providers from './providers';
import { Header } from './components/layout/header';
import { Sidebar } from './components/layout/sidebar';
import { Footer } from './components/layout/footer';
import { Inter, Outfit } from 'next/font/google';
import dynamic from 'next/dynamic';
import { PageTransition } from './components/layout/page-transition';

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


import { GlobalUIComponents } from './components/layout/GlobalUIComponents';
import { cookies } from 'next/headers';
import { menuService } from '@/services/business/user/MenuService';
import { MenuInfo } from '@/types/foundation/menu';
import { getInitialMenus } from '@/lib/api/menu-loader';
import { Suspense } from 'react';


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
      <Suspense>
        <Header menusPromise={menusPromise} />
      </Suspense>
      <div className="flex flex-1">
        <Suspense>
          <Sidebar menusPromise={menusPromise} />
        </Suspense>
        <main className="flex-1 lg:pl-72 pt-1 min-w-0 transition-opacity duration-300 overflow-x-hidden">
          <div className="max-w-7xl mx-auto p-6 md:p-12 lg:p-16 min-h-[calc(100vh-11rem)]">
            <PageTransition>
                <Suspense fallback={<div className="flex h-full w-full items-center justify-center min-h-[500px]">Loading page content...</div>}>
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


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} antialiased font-sans`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <Suspense fallback={null}>
            <Providers>
              <Suspense fallback={null}>
                <GlobalUIComponents />
              </Suspense>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Application...</div>}>
                <AppShell>
                  <Suspense fallback={<div className="flex h-full w-full items-center justify-center min-h-[500px]">Loading page content...</div>}>
                    {children}
                  </Suspense>
                </AppShell>
              </Suspense>
            </Providers>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
