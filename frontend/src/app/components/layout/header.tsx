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
  1000000: LayoutGrid, // ?뚰겕?ㅽ럹?댁뒪
  2000000: Users, // 而ㅻ??덊떚
  3000000: HeartHandshake, // 怨좉컼吏?먯꽱??  9000000: ShieldCheck, // ?듯빀 愿由??쇳꽣
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
  const { notifications, unreadCount } = useNotifications();
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
    <header className="sticky top-0 z-[100] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <React.Suspense fallback={null}>
        <HeaderSearchParamSync menus={menus} activeMenuNo={activeMenuNo} setActiveMenuNo={setActiveMenuNo} />
      </React.Suspense>
      <div className="flex h-16 items-center px-4 md:px-6 gap-4">
        {/* Mobile Sidebar Toggle */}
        <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground mr-1" onClick={toggleSidebar} aria-label="?ъ씠?쒕컮 硫붾돱 ?닿린/?リ린">
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </Button>

        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 shrink-0">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-bold text-lg">eG</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-bold leading-tight text-foreground">?꾩옄?뺣? 5.0</span>
            <span className="text-[10px] text-slate-600 font-semibold tracking-tight">?꾩옄?뺣? ?ы꽭</span>
          </div>
        </Link>

        <div className="flex-1 flex justify-center">
          <nav className="hidden xl:flex items-center gap-1 bg-muted/50 p-1 rounded-[0.1rem] border border-border/50" aria-label="?꾨찓???ㅻ퉬寃뚯씠??>
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
                  href={targetRoute}
                  onClick={(e) => {
                    setActiveMenuNo(menu.menuNo);
                    // No need to prevent default or push manually; Link handles instant client-side transition.
                  }}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap px-4 h-9 font-semibold text-sm transition rounded-lg gap-2",
                    isActive
                      ? "bg-background text-primary shadow-sm border border-border/50"
                      : "text-slate-600 hover:text-foreground hover:bg-background/50"
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
            title="硫붾돱援ъ꽦 ?ㅻ챸"
            aria-label="硫붾돱援ъ꽦 ?ㅻ챸"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden md:flex text-muted-foreground")}
          >
            <Info size={20} />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground"
            title="?뚮쭏 蹂寃?
            aria-label="?뚮쭏 蹂寃?
          >
            {mounted ? (resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />) : <div className="w-5 h-5" />}
          </Button>

          <Button
            id="e2e-bell-button"
            variant="ghost"
            size="icon"
            onClick={() => setIsNotifOpen(true)}
            aria-label="?뚮┝ 愿由?
            className={cn(
              "relative text-muted-foreground transition group",
              unreadCount > 0 && "text-primary bg-primary/5 ring-4 ring-primary/5"
            )}
          >
            <Bell size={20} className={cn(unreadCount > 0 && "animate-bounce-subtle")} />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 text-white border-2 border-background font-black text-[9px] shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-2 pl-2 md:pl-3 border-l ml-1 md:ml-2">
            {mounted && (
              user ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-1 h-9 hover:bg-accent rounded-full" aria-label="?ъ슜??怨꾩젙 硫붾돱">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                        <User size={16} />
                      </div>
                      <div className="flex flex-col items-start mr-1 hidden sm:flex">
                        <span className="text-sm font-bold leading-none">{user.name}</span>
                        <span className="text-[10px] text-slate-600 font-semibold mt-0.5">{user.userSe === 'USR' ? '?ъ슜?? : '愿由ъ옄'}</span>
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
                        <span className="flex items-center gap-2"><User size={14} /> 媛쒖씤?뺣낫?섏젙</span>
                      </Link>
                      <Link href="/admin/system/settings" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-sm h-9 gap-2 font-medium")}>
                        <span className="flex items-center gap-2"><Settings size={14} /> ?섍꼍?ㅼ젙</span>
                      </Link>
                      <div className="h-px bg-muted my-1" />
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-sm h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
                        onClick={() => logout()}
                      >
                        <LogOut size={14} /> 濡쒓렇?꾩썐
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "rounded-lg h-9 px-4 font-bold")}>
                  濡쒓렇??                </Link>
              )
            )}
          </div>
        </div>
      </div>

      <AppNotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={(notifications || []).filter(Boolean).map((n, i) => ({
          id: n.ntfcId || `notif-${i}`,
          title: n.ntfcSj,
          message: n.ntfcCn,
          time: n.ntfcPnttm,
          isRead: n.readYn === 'Y',
          type: n.ntfcSj?.includes('蹂댁븞') ? 'SECURITY' : n.ntfcSj?.includes('?쒖뒪??) ? 'SYSTEM' : 'ACTIVITY'
        }))}
      />
    </header>
  );
}
