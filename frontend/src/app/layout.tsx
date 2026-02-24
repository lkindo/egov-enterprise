import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './components/theme-provider';
import Providers from './providers';
import { Header } from './components/layout/header';
import { Sidebar } from './components/layout/sidebar';
import { Footer } from './components/layout/footer';
import { GlobalCommandCenter } from './components/ui/global-command-center';
import { SmartOnboardingHub } from './components/ui/smart-onboarding-hub';

export const metadata: Metadata = {
  title: '전자정부 프레임워크 모더니제이션',
  description: 'KRDS 기반 모던 전사 공통 모듈',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <Providers>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 lg:pl-64 pt-4 transition-all duration-300">
                  <div className="container mx-auto p-4 md:p-6 min-h-[calc(100vh-10rem)]">
                    {children}
                  </div>
                  <Footer />
                </main>
              </div>
              <GlobalCommandCenter />
              <SmartOnboardingHub />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
