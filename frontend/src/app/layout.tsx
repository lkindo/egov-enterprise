import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from './components/theme-provider';
import Providers from './providers';
import { Header } from './components/layout/header';
import { Sidebar } from './components/layout/sidebar';
import { Footer } from './components/layout/footer';
import { GlobalCommandCenter } from './components/ui/global-command-center';
import { StandardOnboardingTour } from './components/ui/standard-onboarding-tour';

export const metadata: Metadata = {
  title: '전자정부 현대화 프로젝트',
  description: 'KRDS 기반 모던 전사 공통 모듈',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-[100] px-4 py-2 bg-background text-foreground border rounded-md shadow-lg font-medium"
        >
          본문으로 건너뛰기
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <div className="flex flex-1">
                <Sidebar />
                <main id="main-content" className="flex-1 lg:pl-64 pt-4 transition-all duration-300">
                  <div className="container mx-auto p-4 md:p-6 min-h-[calc(100vh-10rem)]">
                    {children}
                  </div>
                  <Footer />
                </main>
              </div>
              <GlobalCommandCenter />
              <StandardOnboardingTour />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
