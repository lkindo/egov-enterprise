'use client';

import React, { useState } from 'react';
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
  X
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

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const { notifications, unreadCount } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

        <div className="flex-1" />

        <div className="flex items-center gap-1.5 md:gap-3">
          {/* Help Link - asChild 대신 클래스 직접 적용 */}
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
