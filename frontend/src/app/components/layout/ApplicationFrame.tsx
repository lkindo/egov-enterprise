'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Public authentication pages do not mount the authenticated navigation. */
export function ApplicationFrame({ children, header, sidebar, footer }: {
  children: ReactNode; header: ReactNode; sidebar: ReactNode; footer: ReactNode;
}) {
  const pathname = usePathname();
  const publicPage = pathname === '/login' || pathname.startsWith('/login/');
  return (
    <div className="relative flex min-h-dvh flex-col bg-background selection:bg-primary/20 selection:text-primary">
      <a href="#main-content" data-sidebar-modal-background="skip-link" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-md focus:bg-card focus:px-5 focus:py-3 focus:text-foreground focus:ring-2 focus:ring-primary">본문 바로가기</a>
      {!publicPage && header}
      <div className="flex flex-1">
        {!publicPage && sidebar}
        <main id="main-content" data-sidebar-modal-background="main" tabIndex={-1}
          className={publicPage ? 'flex min-w-0 flex-1 flex-col outline-none' : 'min-w-0 flex-1 outline-none lg:pl-[var(--app-sidebar-width)] scroll-mt-[var(--app-header-height)]'}>
          <div className={publicPage ? 'flex flex-1 items-center justify-center p-4' : 'mx-auto min-h-[calc(100dvh-var(--app-header-height)-5rem)] max-w-[var(--page-max-w)] p-[var(--page-pad)] md:p-[var(--page-pad-md)] lg:p-[var(--page-pad-lg)]'}>
            <div className="w-full min-w-0">{children}</div>
          </div>
          {footer}
        </main>
      </div>
    </div>
  );
}
