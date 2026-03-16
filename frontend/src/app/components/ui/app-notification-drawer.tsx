'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {isOpen ? <div className="fixed inset-0 z-[9998] bg-[#020617]/90" onClick={onClose} /> : null}
      <div className={cn(
        "fixed right-0 top-0 z-[9999] h-full w-full max-w-sm border-l bg-white dark:bg-slate-950 shadow-[-20px_0_50px_rgba(0,0,0,0.15)] transition-transform duration-500 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b px-6 bg-white dark:bg-slate-950 sticky top-0 z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bell size={20} className="text-primary animate-bounce-subtle" />
            알림
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all hover:rotate-90">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-4rem)] p-4 space-y-4 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
              <Bell size={48} className="mb-4 opacity-10" />
              <p className="text-sm font-medium">새로운 소식이 아직 없네요.</p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-500">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "group p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
                    notif.isRead
                      ? "bg-muted border-transparent opacity-80"
                      : "bg-card border-primary/20 shadow-sm ring-1 ring-primary/5"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h3 className={cn("text-xs font-bold transition-colors", !notif.isRead && "text-primary")}>
                      {notif.title}
                    </h3>
                    {!notif.isRead ? <span className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" /> : null}
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground mt-1.5 line-clamp-3">
                    {notif.message}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[9px] font-medium text-muted-foreground/40">{notif.time}</span>
                    <button className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      자세히 보기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
