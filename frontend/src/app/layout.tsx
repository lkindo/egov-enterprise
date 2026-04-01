import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './components/theme-provider';
import Providers from './providers';
import { Header } from './components/layout/header';
import { Sidebar } from './components/layout/sidebar';
import { Footer } from './components/layout/footer';
import { ScrollToTop } from './components/layout/scroll-to-top';
import { cookies } from 'next/headers';
import { menuService } from '@/services/business/user/MenuService';

export const metadata: Metadata = {
  title: '전자정부 표준프레임워크 - 엔터프라이즈 포털',
  description: 'KRDS 기반 모던 전사 공통 모듈 및 디지털 정부 혁신 플랫폼',
};

interface MenuWithChildren {
  menuNo: number;
  children?: MenuWithChildren[];
  [key: string]: unknown;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // Fetch Sidebar Menus on Server to eliminate waterfall
  let initialMenus: MenuWithChildren[] = [];

  // Only attempt to fetch menus if we have a token (avoid 401 for guests/login page)
  if (accessToken) {
    try {
      const headList = await menuService.getHeadMenus(axiosConfig);
      initialMenus = await Promise.all(
        headList.map(async (menu) => {
          try {
            const leftList = await menuService.getLeftMenus(menu.menuNo, axiosConfig);
            return { ...menu, children: leftList };
          } catch {
            return { ...menu, children: [] };
          }
        })
      );
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; message?: string };
      if (err.response?.status === 401) {
        console.warn('RootLayout: Access token expired or invalid (401)');
      } else {
        console.error('RootLayout: Failed to pre-fetch menus', err);
      }
    }
  }

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <Providers>
            <ScrollToTop />
            <div className="relative flex min-h-screen flex-col bg-background/50 selection:bg-primary/20 selection:text-primary transition-all duration-700">
              <Header initialMenus={initialMenus} />
              <div className="flex flex-1">
                <Sidebar initialMenus={initialMenus} />
                <main className="flex-1 lg:pl-72 pt-1 transition-all duration-500 min-w-0">
                  <div className="max-w-7xl mx-auto p-6 md:p-12 lg:p-16 min-h-[calc(100vh-14rem)] animate-in fade-in duration-1000">
                    {children}
                  </div>
                  <Footer className="border-t border-border/20 py-8 mb-4 px-6 opacity-30 hover:opacity-100 transition-opacity" />
                </main>
              </div>
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
