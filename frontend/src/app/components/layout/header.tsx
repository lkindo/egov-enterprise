'use client';

import React, { useState, useEffect, use } from 'react';
import { useTheme } from 'next-themes';
import {
  Moon,
  Sun,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Info,
  Menu,
  X,
  LayoutGrid,
  Users,
  HeartHandshake,
  ShieldCheck,
  CircleDot
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { AppNotificationDrawer } from '../ui/app-notification-drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { menuService } from '@/services/business/user/MenuService';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MenuInfo } from '@/types/foundation/menu';

const DOMAIN_ICON_MAP: Record<number, React.ComponentType<{ size?: number; className?: string }>> = {
  1000000: LayoutGrid, // 워크스페이스
  2000000: Users, // 커뮤니티
  3000000: HeartHandshake, // 고객지원센터
  9000000: ShieldCheck, // 통합 관리 센터
};

const DOMAIN_ROUTE_MAP: Record<number, string> = {
  1000000: '/admin/work-hub',
  2000000: '/admin/collaboration',
  9000000: '/admin/system/menus',
};

function HeaderSearchParamSync({ menus, activeMenuNo, setActiveMenuNo }: { menus: MenuInfo[], activeMenuNo: number | null, setActiveMenuNo: (no: number) => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchBbsId = searchParams?.get('bbsId');

  useEffect(() => {
    if (menus.length === 0) return;

    const currentPath = pathname;
    
    const matchTopMenu = () => {
      if (searchBbsId) {
        for (const m of menus) {
          const hasBbsMatch = m.children?.some(c => {
            if (String(c.modernRoute || '').includes(`bbsId=${searchBbsId}`)) return true;
            return c.children?.some(cc => String(cc.modernRoute || '').includes(`bbsId=${searchBbsId}`));
          });
          if (hasBbsMatch || String(m.modernRoute || '').includes(`bbsId=${searchBbsId}`)) {
            return m.menuNo;
          }
        }
      }

      let bestMatch = { menuNo: null as number | null, score: 0 };

      const calculateScore = (route?: string) => {
        if (!route) return 0;
        const pureRoute = route.split('?')[0];
        if (currentPath === pureRoute) return 10000;
        if (currentPath.startsWith(pureRoute + '/') || (pureRoute !== '/' && currentPath === pureRoute)) {
          return pureRoute.length;
        }
        return 0;
      };

      for (const m of menus) {
        let menuMaxScore = calculateScore(m.modernRoute);
        m.children?.forEach(c => {
          menuMaxScore = Math.max(menuMaxScore, calculateScore(c.modernRoute));
          c.children?.forEach(cc => {
            menuMaxScore = Math.max(menuMaxScore, calculateScore(cc.modernRoute));
          });
        });

        if (menuMaxScore > bestMatch.score) {
          bestMatch = { menuNo: m.menuNo, score: menuMaxScore };
        }
      }

      return bestMatch.menuNo;
    };

    const matchedNo = matchTopMenu();
    if (matchedNo && matchedNo !== activeMenuNo) {
      setActiveMenuNo(matchedNo);
    }
  }, [pathname, searchBbsId, menus, activeMenuNo, setActiveMenuNo]);

  return null;
}

export function Header({ 
  initialMenus = [],
  menusPromise
}: { 
  initialMenus?: MenuInfo[];
  menusPromise?: Promise<MenuInfo[]>;
}) {
  const resolvedMenus = menusPromise ? use(menusPromise) : initialMenus;
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isSidebarOpen, toggleSidebar, activeMenuNo, setActiveMenuNo } = useLayout();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [menus, setMenus] = useState<MenuInfo[]>(resolvedMenus);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (menus.length === 0) {
      menuService.getHeadMenus()
        .then(res => setMenus(res || []))
        .catch(() => setMenus([]));
    }
  }, [menus.length]);

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-slate-100 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <React.Suspense fallback={null}>
        <HeaderSearchParamSync menus={menus} activeMenuNo={activeMenuNo} setActiveMenuNo={setActiveMenuNo} />
      </React.Suspense>
      <div className="flex h-11 items-center px-4 md:px-6 gap-4">
        {/* Mobile Sidebar Toggle */}
        <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground mr-1" onClick={toggleSidebar} aria-label="사이드바 메뉴 열기/닫기">
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </Button>

        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 shrink-0">
          <div className="w-10 h-10 bg-slate-900 rounded-[var(--radius-hub-item)] flex items-center justify-center shadow-lg">
            <span className="text-primary font-bold text-lg">EG</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-bold leading-tight text-foreground">전자정부 5.0</span>
            <span className="text-xs text-slate-600 font-semibold tracking-tight">전자정부 포털</span>
          </div>
        </Link>

        <div className="flex-1 flex justify-center">
          <nav className="hidden xl:flex items-center gap-1 bg-slate-50/50 p-1.5 rounded-[var(--radius-hub-item)] border border-slate-100" aria-label="주메뉴 네비게이션">
            {menus.map((menu, index) => {
              const Icon = DOMAIN_ICON_MAP[menu.menuNo] || CircleDot;
              const isActive = activeMenuNo === menu.menuNo;
              
              let targetRoute = menu.modernRoute;
              if (!targetRoute || targetRoute === 'dir' || targetRoute === '#') {
                targetRoute = DOMAIN_ROUTE_MAP[menu.menuNo] || '/';
              }

              return (
                <Link
                  key={menu.menuNo || `head-${index}`}
                  href={targetRoute || '#'}
                  onClick={(e) => {
                    setActiveMenuNo(menu.menuNo);
                  }}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap px-6 h-10 font-bold text-xs tracking-widest uppercase font-mono transition-all rounded-[var(--radius-hub-item)] gap-2.5",
                    isActive
                      ? "bg-slate-900 text-white shadow-xl"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white"
                  )}
                >
                  <Icon size={14} className={cn("transition-transform", isActive ? "scale-110" : "opacity-100")} />
                  {menu.menuNm}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Link
            href="/help"
            title="메뉴구성 설명"
            aria-label="메뉴구성 설명"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden md:flex text-muted-foreground")}
          >
            <Info size={20} />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground"
            title="테마 변경"
            aria-label="테마 변경"
          >
            {mounted ? (resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />) : <div className="w-5 h-5" />}
          </Button>

          <Button
            id="e2e-bell-button"
            variant="ghost"
            size="icon"
            onClick={() => setIsNotifOpen(true)}
            aria-label="알림 관리"
            className={cn(
              "relative text-muted-foreground transition-all group",
              unreadCount > 0 && "text-primary bg-primary/5 ring-4 ring-primary/5"
            )}
          >
            <Bell size={20} className={cn(unreadCount > 0 && "animate-bounce-subtle")} />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 text-white border-2 border-background font-bold text-xs shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-2 pl-2 md:pl-3 border-l ml-1 md:ml-2">
            {mounted && (
              user ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2.5 pl-2 pr-1.5 h-11 hover:bg-slate-50 rounded-[var(--radius-hub-item)] border border-transparent hover:border-slate-100 transition-all" aria-label="사용자 계정 메뉴">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                        <User size={16} />
                      </div>
                      <div className="flex flex-col items-start mr-1 hidden sm:flex">
                        <span className="text-sm font-bold leading-none">{user.name}</span>
                        <span className="text-xs text-slate-600 font-semibold mt-0.5">{user.userSe === 'USR' ? '사용자' : '관리자'}</span>
                      </div>
                      <ChevronDown size={14} className="text-slate-600 hidden sm:block" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2 mt-1" align="end">
                    <div className="px-3 py-2 border-b mb-1">
                      <p className="text-sm font-bold">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.id}</p>
                    </div>
                    <div className="space-y-0.5">
                      <Link href="/admin/workspace/my-page" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-sm h-9 gap-2 font-medium")}>
                        <span className="flex items-center gap-2"><User size={14} /> 개인정보수정</span>
                      </Link>
                      <Link href="/admin/system/menus" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-sm h-9 gap-2 font-medium")}>
                        <span className="flex items-center gap-2"><Settings size={14} /> 환경설정</span>
                      </Link>
                      <div className="h-px bg-muted my-1" />
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
                        onClick={() => logout().then(() => router.push('/login'))}
                      >
                        <LogOut size={14} /> 로그아웃
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "rounded-[var(--radius-hub-item)] h-10 px-6 font-bold text-xs tracking-widest uppercase font-mono bg-slate-900 text-white shadow-xl hover:bg-primary transition-all")}>
                  _ INITIALIZE_AUTH
                </Link>
              )
            )}
          </div>
        </div>
      </div>

      <AppNotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
        notifications={(notifications || []).filter(Boolean).map((n, i) => ({
          id: n.ntfcId || `notif-${i}`,
          title: n.ntfcSj,
          message: n.ntfcCn,
          time: n.ntfcPnttm,
          isRead: n.readYn === 'Y',
          type: n.ntfcSj?.includes('보안') ? 'SECURITY' : n.ntfcSj?.includes('시스템') ? 'SYSTEM' : 'ACTIVITY'
        }))}
      />
    </header>
  );
}

