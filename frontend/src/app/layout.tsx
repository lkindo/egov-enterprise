import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "@/styles/legacy.css";
import Providers from './providers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: "eGovFrame Next.js Portal",
  description: "전자정부프레임워크 경량환경 Next.js 마이그레이션 포털",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased legacy-container">
        <Providers>
          <div className="wrap">
            <Header />
            <main className="container" id="contents">
              <div className="sub_in">
                <div className="layout">
                  <Suspense fallback={<div className="w-[250px] bg-slate-50" />}>
                    <Sidebar />
                  </Suspense>
                  <div className="content_wrap">
                    <Suspense fallback={<div className="p-4">Loading...</div>}>
                      {children}
                    </Suspense>
                  </div>
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
