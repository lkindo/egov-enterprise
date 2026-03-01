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
  Briefcase,
  Library,
  UserCheck,
  Cpu,
  BarChart3,
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
import { menuService } from '@/services/user/MenuService';
import { usePathname } from 'next/navigation';

const DOMAIN_ICON_MAP: Record<number, any> = {
  10: LayoutGrid,    // 워크스페이스
  20: Briefcase,     // 운영 지원
  30: Library,       // 지식 자산
  40: UserCheck,     // 계정 및 권한
  50: Cpu,           // 시스템 관리
  60: BarChart3,     // 인사이트
};

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isSidebarOpen, toggleSidebar, activeMenuNo, setActiveMenuNo } = useLayout();
  const { notifications, unreadCount } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [menus, setMenus] = useState<any[]>([]);

  useEffect(() => {
    menuService.getHeadMenus().then(res => setMenus(res || []));
  }, []);

  // Sync activeMenuNo with pathname
  useEffect(() => {
    if (menus.length === 0) return;

    const findActive = async () => {
      for (const m of menus) {
        const children = await menuService.getLeftMenus(m.menuNo);
        const hasMatch = children.some((c: any) => {
          if (c.modernRoute && pathname.startsWith(c.modernRoute)) return true;
          if (c.children?.some((cc: any) => cc.modernRoute && pathname.startsWith(cc.modernRoute))) return true;
          return false;
        });
        if (hasMatch) {
          setActiveMenuNo(m.menuNo);
          break;
        }
      }
    };
    findActive();
  }, [pathname, menus, setActiveMenuNo]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-16 items-center px-4 md:px-6 gap-4">
        {/* Mobile Sidebar Toggle */}
        <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground mr-1" onClick={toggleSidebar}>
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </Button>

        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-black text-lg">eG</span>
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-sm font-black leading-tight">전자정부 5.0</span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-70">Enterprise Portal</span>
          </div>
        </Link>

        <div className="flex-1 flex justify-center">
          <nav className="hidden xl:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
            {menus.map((menu, index) => {
              const Icon = DOMAIN_ICON_MAP[menu.menuNo] || CircleDot;
              const isActive = activeMenuNo === menu.menuNo;

              return (
                <Button
                  key={menu.menuNo || `head-${index}`}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "px-4 h-9 font-bold text-xs transition-all rounded-lg gap-2",
                    isActive
                      ? "bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-800/50"
                  )}
                  onClick={() => setActiveMenuNo(menu.menuNo)}
                >
                  <Icon size={14} className={cn("transition-transform", isActive ? "scale-110" : "opacity-60")} />
                  {menu.menuNm}
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          <Link
            href="/help"
            title="메뉴구성 설명"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden md:flex text-muted-foreground")}
          >
            <Info size={20} />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground"
            title="테마 변경"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNotifOpen(true)}
            className="relative text-muted-foreground"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 hover:bg-red-600 border-2 border-background ring-0">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          {/* User Profile Dropdown */}
          <div className="flex items-center gap-2 pl-2 md:pl-3 border-l ml-1 md:ml-2">
            {user ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-1 h-9 hover:bg-accent rounded-full">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                      <User size={16} />
                    </div>
                    <div className="flex flex-col items-start mr-1 hidden sm:flex">
                      <span className="text-xs font-bold leading-none">{user.name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{user.userSe === 'USR' ? '사용자' : '관리자'}</span>
                    </div>
                    <ChevronDown size={14} className="text-muted-foreground opacity-50 hidden sm:block" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 mt-1" align="end">
                  <div className="px-3 py-2 border-b mb-1">
                    <p className="text-sm font-bold">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.id}</p>
                  </div>
                  <div className="space-y-1">
                    <Link href="/mypage" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-xs h-9 gap-2")}>
                      <User size={14} /> 개인정보수정
                    </Link>
                    <Link href="/admin/system/settings" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-xs h-9 gap-2")}>
                      <Settings size={14} /> 환경설정
                    </Link>
                    <div className="h-px bg-muted my-1" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs h-9 gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => logout()}
                    >
                      <LogOut size={14} /> 로그아웃
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "rounded-xl h-9 px-4 font-bold")}>
                로그인
              </Link>
            )}
          </div>
        </div>
      </div>

      <AppNotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications.map(n => ({
          id: n.ntfcNo,
          title: n.ntfcSj,
          message: n.ntfcCn,
          time: n.createdDate,
          isRead: n.isRead === 'Y'
        }))}
      />
    </header>
  );
}
