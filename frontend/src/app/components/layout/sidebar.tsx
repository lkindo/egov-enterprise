'use client';

import { use, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Database, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { menuService } from '@/services/business/user/MenuService';
import { useLayout } from '@/contexts/LayoutContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MenuInfo } from '@/types/foundation/menu';
import { NavItem, NavQueryScope } from './NavItem';
import { SITE_IDENTITY } from '@/config/site-identity';

export function Sidebar({
  initialMenus = [],
  menusPromise,
}: {
  initialMenus?: MenuInfo[];
  menusPromise?: Promise<MenuInfo[]>;
}) {
  const resolvedMenus = menusPromise ? use(menusPromise) : initialMenus;
  const { isSidebarOpen, setSidebarOpen, activeMenuNo, setActiveMenuNo } = useLayout();
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // 모바일에서는 비모달 disclosure로 동작한다. viewport를 JS로 추정해 같은 DOM의 role/inert를
  // 바꾸지 않으며, 닫힘/데스크톱 상시 노출은 아래 visibility 반응형 CSS가 결정한다.
  useEffect(() => {
    if (!isSidebarOpen) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setSidebarOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const returnTarget = returnFocusRef.current;
      if (returnTarget?.isConnected) returnTarget.focus();
      returnFocusRef.current = null;
    };
  }, [isSidebarOpen, setSidebarOpen]);

  // initialData가 실제로 있을 때만 주입한다. 빈 배열을 데이터로 확정하면 복구 query가 실행되지 않는다.
  const { data: topMenus = resolvedMenus } = useQuery({
    queryKey: ['menus', 'head'],
    queryFn: () => menuService.getHeadMenus(),
    initialData: resolvedMenus.length > 0 ? resolvedMenus : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveActiveMenuNo = activeMenuNo || topMenus[0]?.menuNo || null;
  const activeTopMenu = topMenus.find((menu) => menu.menuNo === effectiveActiveMenuNo);
  const prefetchedLeftMenus = activeTopMenu?.children ?? [];

  useEffect(() => {
    if (!activeMenuNo && effectiveActiveMenuNo) setActiveMenuNo(effectiveActiveMenuNo);
  }, [activeMenuNo, effectiveActiveMenuNo, setActiveMenuNo]);

  const { data: menus = prefetchedLeftMenus, isLoading: loading } = useQuery({
    queryKey: ['menus', 'left', effectiveActiveMenuNo],
    queryFn: async () => {
      if (!effectiveActiveMenuNo) return [];
      if (prefetchedLeftMenus.length > 0) return prefetchedLeftMenus;
      return menuService.getLeftMenus(effectiveActiveMenuNo);
    },
    enabled: !!effectiveActiveMenuNo,
    initialData: prefetchedLeftMenus.length > 0 ? prefetchedLeftMenus : undefined,
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="주 메뉴 닫기"
            tabIndex={-1}
          />
        )}
      </AnimatePresence>

      <aside
        id="primary-sidebar"
        ref={sidebarRef}
        aria-label="주 메뉴"
        className={cn(
          'fixed left-0 top-0 z-[100] h-full w-72 border-r bg-card transition-[transform,visibility] duration-500 lg:top-16 lg:h-[calc(100vh-4rem)]',
          isSidebarOpen
            ? 'visible translate-x-0 shadow-2xl'
            : 'invisible -translate-x-full lg:visible lg:translate-x-0',
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto px-5 py-8 no-scrollbar">
          <div className="mb-10 flex items-center justify-between px-2 lg:hidden">
            <Link
              href="/"
              aria-label="메인 화면으로 이동"
              className="flex items-center gap-3.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-hub-item)] bg-surface-inverse shadow-lg">
                <span className="text-lg font-bold text-primary">{SITE_IDENTITY.logoMark}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-none tracking-tighter text-foreground">
                  {SITE_IDENTITY.siteShortName}
                </span>
                <span className="text-xs font-semibold tracking-tight text-muted-foreground">
                  {SITE_IDENTITY.portalShortName}
                </span>
              </div>
            </Link>
            <Button
              ref={closeButtonRef}
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              aria-label="사이드바 닫기"
              className="h-10 w-10 rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={20} className="text-muted-foreground" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1" aria-label="주 메뉴 탐색">
            <div
              role="group"
              aria-labelledby="sidebar-domain-heading"
              className="mb-6 space-y-1 border-b border-border/60 pb-5 xl:hidden"
            >
              <p id="sidebar-domain-heading" className="mb-2 px-2 text-xs font-bold text-muted-foreground">
                서비스 영역
              </p>
              {topMenus.map((domain, index) => {
                const isActive = effectiveActiveMenuNo === domain.menuNo;
                return (
                  <Button
                    key={domain.menuNo || `domain-${index}`}
                    type="button"
                    variant="ghost"
                    aria-pressed={isActive}
                    onClick={() => setActiveMenuNo(domain.menuNo)}
                    className={cn(
                      'h-10 w-full justify-start rounded-[var(--radius-hub-item)] px-3 text-xs font-bold',
                      isActive
                        ? 'bg-surface-inverse text-surface-inverse-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    {domain.menuNm}
                  </Button>
                );
              })}
            </div>

            <div className="mb-6 flex items-center justify-between px-2">
              <p className="text-xs font-bold tracking-tight text-muted-foreground">전체 메뉴</p>
              {activeTopMenu && (
                <Badge variant="secondary" className="border-none px-2 py-0 text-xs">
                  {activeTopMenu.menuNm}
                </Badge>
              )}
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse" role="status">
                <span className="sr-only">메뉴를 불러오는 중</span>
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={`loading-${item}`} className="h-10 w-full rounded-lg bg-muted/30" />
                ))}
              </div>
            ) : menus.length === 0 ? (
              <div className="space-y-3 p-8 text-center text-muted-foreground">
                <Database size={32} className="mx-auto" aria-hidden="true" />
                <p className="text-sm font-bold tracking-tight">메뉴를 불러올 수 없습니다.</p>
              </div>
            ) : (
              <NavQueryScope menus={menus}>
                {menus.map((item, index) => (
                  <NavItem key={item.menuNo || `menu-${index}`} item={item} />
                ))}
              </NavQueryScope>
            )}
          </nav>

          <div className="mt-auto px-2 pb-10 pt-8">
            <div className="rounded-[var(--radius-hub-item)] border border-border bg-muted/40 p-4">
              <p className="text-xs font-bold text-foreground">업무 포털</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
                계정 권한에 따라 사용할 수 있는 메뉴가 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
