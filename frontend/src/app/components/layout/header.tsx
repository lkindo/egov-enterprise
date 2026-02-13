'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Bell, User } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { AppNotificationDrawer } from '../ui/app-notification-drawer';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold">eG</span>
          </div>
          <span className="text-xl font-bold tracking-tight">전사 공통 모듈 현대화</span>
        </div>
        
        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            title="테마 변경"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button 
            onClick={() => setIsNotifOpen(true)}
            className="p-2 rounded-md hover:bg-accent relative transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 pl-2 border-l ml-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User size={18} />
            </div>
            <span className="text-sm font-medium">관리자</span>
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
          time: n.createdDate, // Backend auditing field
          isRead: n.isRead === 'Y'
        }))} 
      />
    </header>
  );
}
