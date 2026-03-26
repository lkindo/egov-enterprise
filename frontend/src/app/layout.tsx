import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './components/theme-provider';
import Providers from './providers';
import { Header } from './components/layout/header';
import { Sidebar } from './components/layout/sidebar';
import { Footer } from './components/layout/footer';
import { ScrollToTop } from './components/layout/scroll-to-top';

export const metadata: Metadata = {
 title: '전자정부 프레임워크 현대화',
 description: 'KRDS 기반 모던 전사 공통 모듈',
};

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { menuService } from '@/services/business/user/MenuService';

export default async function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 // Fetch Sidebar Menus on Server to eliminate waterfall
 let initialMenus: any[] = [];
 let isUnauthorized = false;

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
 } catch (error: any) {
 if (error.response?.status === 401) {
 console.warn('RootLayout: Authentication token expired or invalid (401)');
 isUnauthorized = true;
 } else {
 console.error('RootLayout: Failed to pre-fetch menus', error);
 }
 }
 }

 // We rely on middleware and client-side interceptors for auth redirection
 // to avoid infinite loops and complexity in the root layout.

 return (
 <html lang="ko" suppressHydrationWarning>
 <body className="antialiased" suppressHydrationWarning>
 <ThemeProvider
 attribute="class"
 defaultTheme="light"
 enableSystem
 disableTransitionOnChange
 enableColorScheme
 >
 <Providers>
 <Suspense fallback={null}>
 <ScrollToTop />
 </Suspense>
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
