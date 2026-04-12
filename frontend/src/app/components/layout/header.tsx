'use client';

import React, { useState, useEffect } from 'react';
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

export function Header({ initialMenus = [] }: { initialMenus?: MenuInfo[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isSidebarOpen, toggleSidebar, activeMenuNo, setActiveMenuNo } = useLayout();
  const { notifications, unreadCount } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [menus, setMenus] = useState<MenuInfo[]>(initialMenus);
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

  // Sync activeMenuNo with pathname and query params
  const searchParams = useSearchParams();
  const searchBbsId = searchParams.get('bbsId');

  useEffect(() => {
    if (menus.length === 0) return;

    const currentPath = pathname;
    
    // Find top menu containing the current path with priority
    const matchTopMenu = () => {
      // 1순위: bbsId가 포함된 경우 정밀 매칭
      if (searchBbsId) {
        for (const m of menus) {
          const hasBbsMatch = (m.children || []).some((c: MenuInfo) => {
            if (c.modernRoute?.includes(`bbsId=${searchBbsId}`)) return true;
            return c.children?.some(cc => cc.modernRoute?.includes(`bbsId=${searchBbsId}`));
          });
          if (hasBbsMatch || m.modernRoute?.includes(`bbsId=${searchBbsId}`)) {
            return m.menuNo;
          }
        }
      }

      // 2순위: 가장 긴 경로 일치 (Longest Prefix Match)
      let bestMatch = { menuNo: null as number | null, score: 0 };

      const calculateScore = (route?: string) => {
        if (!route) return 0;
        const pureRoute = route.split('?')[0];
        if (currentPath === pureRoute) return 10000; // 완전 일치 시 최우선
        if (currentPath.startsWith(pureRoute + '/') || (pureRoute !== '/' && currentPath === pureRoute)) {
          return pureRoute.length;
        }
        return 0;
      };

      for (const m of menus) {
        let menuMaxScore = calculateScore(m.modernRoute);
        
        // 하위 메뉴들 확인
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6 gap-4">
        {/* Mobile Sidebar Toggle */}
        <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground mr-1" onClick={toggleSidebar} aria-label="사이드바 열기/닫기">
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </Button>

        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 shrink-0">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg">eG</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-bold leading-tight text-foreground">전자정부 5.0</span>
            <span className="text-[10px] text-slate-600 font-semibold tracking-tight">전자정부 포털</span>
          </div>
        </Link>

        <div className="flex-1 flex justify-center">
          <nav className="hidden xl:flex items-center gap-1 bg-muted/50 p-1 rounded-[0.1rem] border border-border/50" aria-label="도메인 네비게이션">
            {menus.map((menu, index) => {
              const Icon = DOMAIN_ICON_MAP[menu.menuNo] || CircleDot;
              const isActive = activeMenuNo === menu.menuNo;

              return (
                <Button
                  key={menu.menuNo || `head-${index}`}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "px-4 h-9 font-semibold text-sm transition-all rounded-lg gap-2",
                    isActive
                      ? "bg-background text-primary shadow-sm border border-border/50"
                      : "text-slate-600 hover:text-foreground hover:bg-background/50"
                  )}
                  onClick={() => {
                    setActiveMenuNo(menu.menuNo);
                    const targetRoute = menu.modernRoute || DOMAIN_ROUTE_MAP[menu.menuNo];
                    if (targetRoute) {
                      router.push(targetRoute);
                    }
                  }}
                >
                  <Icon size={14} className={cn("transition-transform", isActive ? "scale-110" : "opacity-100")} />
                  {menu.menuNm}
                </Button>
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
            variant="ghost"
            size="icon"
            onClick={() => setIsNotifOpen(true)}
            aria-label="알림 관리"
            className={cn(
              "relative text-muted-foreground transition-all group",
              unreadCount > 0 && "text-primary bg-primary/5 ring-4 ring-primary/5"
            )}
          >
            <Bell size={20} className={cn("transition-transform group-hover:rotate-12", unreadCount > 0 && "animate-bounce-subtle")} />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 text-white border-2 border-background font-black text-[9px] shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-2 pl-2 md:pl-3 border-l ml-1 md:ml-2">
            {user ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-1 h-9 hover:bg-accent rounded-full" aria-label="사용자 계정 메뉴">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                      <User size={16} />
                    </div>
                    <div className="flex flex-col items-start mr-1 hidden sm:flex">
                      <span className="text-sm font-bold leading-none">{user.name}</span>
                      <span className="text-[10px] text-slate-600 font-semibold mt-0.5">{user.userSe === 'USR' ? '사용자' : '관리자'}</span>
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
                    <Link href="/admin/workspace/mypage" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-sm h-9 gap-2 font-medium")}>
                      <span className="flex items-center gap-2"><User size={14} /> 개인정보수정</span>
                    </Link>
                    <Link href="/admin/system/settings" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-sm h-9 gap-2 font-medium")}>
                      <span className="flex items-center gap-2"><Settings size={14} /> 환경설정</span>
                    </Link>
                    <div className="h-px bg-muted my-1" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
                      onClick={() => logout()}
                    >
                      <LogOut size={14} /> 로그아웃
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "rounded-lg h-9 px-4 font-bold")}>
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>

      <AppNotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={(notifications || []).map((n, i) => ({
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
