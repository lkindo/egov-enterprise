'use client';

import React from 'react';
import { X, Check, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

interface AppNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
}

export function AppNotificationDrawer({ isOpen, onClose, notifications }: AppNotificationDrawerProps) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-[100] bg-black/20" onClick={onClose} />}
      <div className={cn(
        "fixed right-0 top-0 z-[101] h-full w-full max-w-sm border-l bg-background shadow-2xl transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            알림
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-4rem)] p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Bell size={48} className="mb-4 opacity-20" />
              <p>새로운 알림이 없습니다.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={cn(
                  "p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer",
                  notif.isRead ? "bg-muted/30 border-transparent" : "bg-card border-primary/20 ring-1 ring-primary/5"
                )}
              >
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-sm font-bold text-foreground">{notif.title}</h3>
                  {!notif.isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notif.message}</p>
                <span className="text-[10px] text-muted-foreground/60 mt-3 block">{notif.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
