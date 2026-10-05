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
          className={publicPage ? 'flex min-w-0 flex-1 flex-col outline-none' : 'min-w-0 flex-1 outline-none lg:pl-[var(--app-sidebar-inset)] scroll-mt-[var(--app-header-height)]'}>
          {/* [2026-10-05] 왼쪽 여백은 --app-sidebar-inset(기본 = 사이드바 폭, 넓은 화면에서 접으면 0)이고, 최소 높이에서 빼는 푸터 몫은
              --app-footer-reserve(5rem)다. 업무면 fill 셸의 높이(--work-fill-height)가 같은 두 값을 쓴다 — globals.css. */}
          <div className={publicPage ? 'flex flex-1 items-center justify-center p-4' : 'mx-auto min-h-[calc(100dvh-var(--app-header-height)-var(--app-footer-reserve))] max-w-[var(--page-max-w)] p-[var(--page-pad)] md:p-[var(--page-pad-md)] lg:p-[var(--page-pad-lg)]'}>
            <div className="w-full min-w-0">{children}</div>
          </div>
          {/* [2026-10-05] 푸터 자리 표지. fill 셸이 있는 화면은 work-fill 조건에서 이 자리를 숨기고 푸터 몫을 0 으로 돌린다 —
              globals.css 의 CSS(:has)만 하고 여기서는 렌더를 가르지 않는다(ADR-0006). 그 밖의 화면·조건에서는 그대로 보인다. */}
          <div data-app-footer="">{footer}</div>
        </main>
      </div>
    </div>
  );
}
