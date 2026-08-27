'use client';

import { useEffect, use, useRef, useState } from 'react';
import Link from 'next/link';
import {
  X,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { menuService } from '@/services/business/user/MenuService';
import { useLayout } from '@/contexts/LayoutContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MenuInfo } from '@/types/foundation/menu';
import { NavItem, NavQueryScope } from './NavItem';
import { MobileDomainNode } from './MobileDomainNode';
import { SITE_IDENTITY } from '@/config/site-identity';

const SIDEBAR_FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function isAvailableSidebarFocusTarget(element: HTMLElement, boundary: HTMLElement) {
  if (element.tabIndex < 0) return false;

  let current: HTMLElement | null = element;
  while (current) {
    if (
      current.hidden
      || current.hasAttribute('inert')
      || current.getAttribute('aria-hidden') === 'true'
      || current.hasAttribute('disabled')
      || current.matches(':disabled')
    ) {
      return false;
    }

    const style = window.getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') {
      return false;
    }

    if (current === boundary) return true;
    current = current.parentElement;
  }

  return false;
}



export function Sidebar({ 
  initialMenus = [],
  menusPromise
}: { 
  initialMenus?: MenuInfo[];
  menusPromise?: Promise<MenuInfo[]>;
}) {
  const resolvedMenus = menusPromise ? use(menusPromise) : initialMenus;
  const { isSidebarOpen, setSidebarOpen, activeMenuNo, setActiveMenuNo } = useLayout();
  const [isDesktop, setIsDesktop] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const syncViewport = () => setIsDesktop(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (isDesktop || !isSidebarOpen) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    const backgroundStates = [...document.querySelectorAll<HTMLElement>(
      '[data-sidebar-modal-background]',
    )]
      .filter((element) => !element.contains(sidebarRef.current))
      .map((element) => ({
        element,
        hadInertAttribute: element.hasAttribute('inert'),
        inertAttributeValue: element.getAttribute('inert'),
        ariaHiddenValue: element.getAttribute('aria-hidden'),
      }));

    for (const { element } of backgroundStates) {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSidebarOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const sidebar = sidebarRef.current;
      const focusable = sidebar
        ? [...sidebar.querySelectorAll<HTMLElement>(SIDEBAR_FOCUSABLE_SELECTOR)]
          .filter((element) => isAvailableSidebarFocusTarget(element, sidebar))
        : [];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      for (const {
        element,
        hadInertAttribute,
        inertAttributeValue,
        ariaHiddenValue,
      } of backgroundStates) {
        if (hadInertAttribute) {
          element.setAttribute('inert', inertAttributeValue ?? '');
        } else {
          element.removeAttribute('inert');
        }

        if (ariaHiddenValue === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHiddenValue);
        }
      }
      document.body.style.overflow = previousOverflow;
      const returnTarget = returnFocusRef.current;
      if (returnTarget?.isConnected) returnTarget.focus();
      returnFocusRef.current = null;
    };
  }, [isDesktop, isSidebarOpen, setSidebarOpen]);

  // Head Menus (Top Domains) Query
  // ⚠ initialData 에 빈 배열을 넘기면 React Query 는 "데이터 이미 있음"으로 판정하고 staleTime 동안
  //   queryFn 을 아예 호출하지 않는다. 서버 prefetch(getInitialMenus)가 토큰 부재·백엔드 장애로 [] 를
  //   반환하면 메뉴가 영구히 빈 채로 남는다(실측: 그 상태에서 브라우저의 menus API 호출 0건).
  //   비어 있을 때는 initialData 를 주지 않아 클라이언트가 직접 조회(복구)하도록 한다.
  const { data: topMenus = initialMenus } = useQuery({
    queryKey: ['menus', 'head'],
    queryFn: () => menuService.getHeadMenus(),
    initialData: resolvedMenus.length > 0 ? resolvedMenus : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Default activeMenuNo setting
  useEffect(() => {
    if (!activeMenuNo && topMenus.length > 0) {
      setActiveMenuNo(topMenus[0].menuNo);
    }
  }, [activeMenuNo, topMenus, setActiveMenuNo]);

  // Left Menus (Sub Menus) Query based on activeMenuNo
  const { data: menus = [], isLoading: loading } = useQuery({
    queryKey: ['menus', 'left', activeMenuNo],
    queryFn: async () => {
      if (!activeMenuNo) return [];
      
      // Check if it's already in the topMenus children (SSR pre-fetched data)
      const activeTop = topMenus.find(m => m.menuNo === activeMenuNo);
      if (activeTop?.children && activeTop.children.length > 0) {
        return activeTop.children;
      }
      
      return await menuService.getLeftMenus(activeMenuNo);
    },
    enabled: !!activeMenuNo, 
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000, 
  });

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        id="primary-sidebar"
        ref={sidebarRef}
        role={!isDesktop && isSidebarOpen ? 'dialog' : undefined}
        aria-modal={!isDesktop && isSidebarOpen ? 'true' : undefined}
        aria-label={!isDesktop && isSidebarOpen ? '주 메뉴' : undefined}
        aria-hidden={!isDesktop && !isSidebarOpen ? 'true' : undefined}
        inert={!isDesktop && !isSidebarOpen ? true : undefined}
        className={cn(
        "fixed left-0 top-0 lg:top-16 z-[100] h-full lg:h-[calc(100vh-4rem)] w-72 border-r bg-card transition-transform duration-500 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full py-8 px-5 overflow-y-auto no-scrollbar">
          {/* Mobile Header in Sidebar */}
          <div className="flex items-center justify-between mb-10 px-2 lg:hidden">
            <Link href="/" aria-label="메인 화면으로 이동" className="flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg" onClick={() => setSidebarOpen(false)}>
              <div className="w-10 h-10 bg-surface-inverse rounded-[var(--radius-hub-item)] flex items-center justify-center shadow-lg">
                <span className="text-primary font-bold text-lg">{SITE_IDENTITY.logoMark}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tighter leading-none text-foreground">{SITE_IDENTITY.siteShortName}</span>
                <span className="text-xs text-muted-foreground font-semibold tracking-tight">{SITE_IDENTITY.portalShortName}</span>
              </div>
            </Link>
            <Button
              ref={closeButtonRef}
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              aria-label="사이드바 닫기"
              className="rounded-lg w-10 h-10 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={20} className="text-muted-foreground" />
            </Button>
          </div>

          <div className="flex-1">
            {/* Mobile View */}
            <div className="lg:hidden space-y-2">
              <div className="mb-6 px-2">
                <div className="text-xs font-bold text-muted-foreground tracking-tight">
                  서비스 모듈
                </div>
              </div>
              {topMenus.map((domain, index) => (
                <MobileDomainNode
                  key={domain.menuNo || `domain-${index}`}
                  domain={domain}
                  isActive={activeMenuNo === domain.menuNo}
                  onSelect={() => setActiveMenuNo(domain.menuNo)}
                  menus={menus}
                  loading={loading}
                />
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block space-y-1">
              {/*
                lg(1024)~xl(1279)에서는 상단 GNB가 아직 숨고 모바일 토글도 사라진다.
                이 전환기가 없으면 현재 도메인의 하위 메뉴만 남아 다른 서비스 영역으로
                이동할 수 없다. xl부터는 상단 GNB가 같은 책임을 맡으므로 중복 노출하지 않는다.
              */}
              <nav
                aria-label="서비스 영역 선택"
                className="hidden lg:block xl:hidden mb-6 space-y-1 border-b border-border/60 pb-5"
              >
                <p className="mb-2 px-2 text-xs font-bold text-muted-foreground">서비스 영역</p>
                {topMenus.map((domain, index) => {
                  const isActive = activeMenuNo === domain.menuNo;
                  return (
                    <Button
                      key={domain.menuNo || `desktop-domain-${index}`}
                      type="button"
                      variant="ghost"
                      aria-pressed={isActive}
                      onClick={() => setActiveMenuNo(domain.menuNo)}
                      className={cn(
                        "h-10 w-full justify-start rounded-[var(--radius-hub-item)] px-3 text-xs font-bold",
                        isActive
                          ? "bg-surface-inverse text-surface-inverse-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {domain.menuNm}
                    </Button>
                  );
                })}
              </nav>

              <div className="mb-6 px-2 flex items-center justify-between">
                <div className="text-xs font-bold text-muted-foreground tracking-tight">
                  전체 메뉴
                </div>
                {topMenus.find(m => m.menuNo === activeMenuNo) && (
                  <Badge variant="secondary" className="text-xs px-2 py-0 border-none">
                    {topMenus.find(m => m.menuNo === activeMenuNo)?.menuNm}
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={`loading-${i}`} className="h-10 bg-muted/30 rounded-lg w-full" />
                  ))}
                </div>
              ) : menus.length === 0 ? (
                <div className="p-8 text-center space-y-3 text-muted-foreground">
                  <Database size={32} className="mx-auto" />
                  <p className="text-sm font-bold tracking-tight">메뉴를 불러올 수 없습니다.</p>
                </div>
              ) : (
                <nav className="space-y-1" aria-label="메인 사이드바">
                  <NavQueryScope menus={menus}>
                    {menus.map((item, index: number) => (
                      <NavItem key={item.menuNo || `menu-${index}`} item={item} />
                    ))}
                  </NavQueryScope>
                </nav>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto pt-8 px-2 pb-10">
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

