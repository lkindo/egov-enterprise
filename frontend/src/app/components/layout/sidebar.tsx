'use client';

import { useEffect, use } from 'react';
import Link from 'next/link';
import {
  X,
  Database,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { menuService } from '@/services/business/user/MenuService';
import { useLayout } from '@/contexts/LayoutContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MenuInfo } from '@/types/foundation/menu';
import { NavItem } from './NavItem';
import { MobileDomainNode } from './MobileDomainNode';



export function Sidebar({ 
  initialMenus = [],
  menusPromise
}: { 
  initialMenus?: MenuInfo[];
  menusPromise?: Promise<MenuInfo[]>;
}) {
  const resolvedMenus = menusPromise ? use(menusPromise) : initialMenus;
  const { isSidebarOpen, setSidebarOpen, activeMenuNo, setActiveMenuNo } = useLayout();
  const queryClient = useQueryClient();

  // Head Menus (Top Domains) Query
  const { data: topMenus = initialMenus } = useQuery({
    queryKey: ['menus', 'head'],
    queryFn: () => menuService.getHeadMenus(),
    initialData: resolvedMenus,
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
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed left-0 top-0 lg:top-16 z-[100] h-full lg:h-[calc(100vh-4rem)] w-72 border-r bg-card transition-transform duration-500 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full py-8 px-5 overflow-y-auto no-scrollbar">
          {/* Mobile Header in Sidebar */}
          <div className="flex items-center justify-between mb-10 px-2 lg:hidden">
            <Link href="/" aria-label="메인 화면으로 이동" className="flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg" onClick={() => setSidebarOpen(false)}>
              <div className="w-10 h-10 bg-slate-900 rounded-[var(--radius-hub-item)] flex items-center justify-center shadow-lg">
                <span className="text-primary font-bold text-lg">EG</span>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tighter leading-none text-foreground">엔터프라이즈</span>
                <span className="text-xs text-muted-foreground font-semibold tracking-tight">포털 5.0</span>
              </div>
            </Link>
            <Button
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
                <div className="p-8 text-center space-y-3 opacity-20">
                  <Database size={32} className="mx-auto" />
                  <p className="text-sm font-bold tracking-tight">메뉴를 불러올 수 없습니다.</p>
                </div>
              ) : (
                <nav className="space-y-1" aria-label="메인 사이드바">
                  {menus.map((item: any, index: number) => (
                    <NavItem key={item.menuNo || `menu-${index}`} item={item} />
                  ))}
                </nav>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto pt-8 px-2 pb-10">
            <div className="p-5 rounded-[var(--radius-hub-item)] bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <Sparkles size={40} className="text-primary" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-bold text-primary tracking-tight">_ 허브_노드_v5.0</span>
              </div>
              <p className="text-xs font-bold text-muted-foreground leading-relaxed uppercase font-mono">
                고급 기업용 핵심 엔진
                <br />
                빌드 버전: 1.0.2_STABLE
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

