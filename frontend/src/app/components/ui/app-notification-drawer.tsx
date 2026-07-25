'use client';

import React, { useEffect, useState } from 'react';
import { X,  
  Bell,  
  ShieldAlert,  
  Activity,  
  Database,  
  Zap,  
  ArrowRight, 
  Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog as DialogPrimitive } from 'radix-ui';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type?: 'SECURITY' | 'SYSTEM' | 'ACTIVITY' | 'INFO';
}

interface AppNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

type FilterType = 'ALL' | 'SECURITY' | 'SYSTEM' | 'ACTIVITY';

export function AppNotificationDrawer({ isOpen, onClose, notifications, onMarkRead, onMarkAllRead }: AppNotificationDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'ALL') return true;
    return n.type === activeFilter;
  });

  const getIcon = (type?: string) => {
    switch (type) {
      case 'SECURITY': return <ShieldAlert size={18} className="text-rose-500" />;
      case 'SYSTEM': return <Database size={18} className="text-amber-500" />;
      case 'ACTIVITY': return <Activity size={18} className="text-emerald-500" />;
      default: return <Bell size={18} className="text-primary" />;
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        {/* 배경 오버레이 */}
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-[1000] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* 알림 드로어 */}
        <DialogPrimitive.Content
          className="fixed right-0 top-0 bottom-0 z-[1000] h-full w-full max-w-md border-l border-border bg-card text-card-foreground shadow-[-40px_0_80px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
        >
          {/* 접근성 준수를 위한 타이틀/설명 (화면 비표시) */}
          <DialogPrimitive.Title className="sr-only">알림 센터</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">실시간 시스템 무결성 피드 목록입니다.</DialogPrimitive.Description>

          {/* Header Fabric */}
          <div className="flex h-24 items-center justify-between border-b border-border px-8 bg-card sticky top-0 z-20">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-3 tracking-tighter uppercase text-card-foreground">
                <div className="w-10 h-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground flex items-center justify-center shadow-lg">
                   <Bell size={20} className="animate-pulse" />
                </div>
                알림 센터
              </h2>
              <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase">실시간 시스템 무결성 피드</p>
            </div>
            <div className="flex items-center gap-2">
              {notifications.some(n => !n.isRead) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onMarkAllRead}
                  className="text-xs font-bold tracking-widest uppercase hover:text-primary h-8 px-2"
                >
                  모두 읽음
                </Button>
              )}
              <button 
                onClick={onClose} 
                data-testid="e2e-drawer-close"
                aria-label="알림 센터 닫기"
                className="p-3 hover:bg-accent rounded-lg transition-all hover:rotate-90 group"
              >
                <X size={24} className="group-hover:text-primary transition-colors text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Advanced Filter Matrix */}
          <div className="p-6 border-b border-border bg-muted/30 flex gap-2">
             {(['ALL', 'SECURITY', 'SYSTEM', 'ACTIVITY'] as FilterType[]).map((f) => (
                <button
                   key={f}
                   onClick={() => setActiveFilter(f)}
                   className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all cursor-pointer",
                      activeFilter === f 
                         ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                         : "bg-background text-muted-foreground hover:bg-accent border border-border"
                   )}
                >
                   {f === 'ALL' ? '전체' : f === 'SECURITY' ? '보안' : f === 'SYSTEM' ? '시스템' : '활동'}
                </button>
             ))}
             <button aria-label="알림 전체 삭제" className="ml-auto w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer">
                <Trash2 size={16} />
             </button>
          </div>

          {/* Notification Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
             {filteredNotifications.length === 0 ? (
                <div 
                   className="flex flex-col items-center justify-center h-full text-muted-foreground/30"
                >
                  <Zap size={100} className="mb-8 opacity-20" />
                  <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">활성화된 알림이 없습니다</span>
                </div>
             ) : (
                filteredNotifications.map((notif, idx) => (
                  <div
                    key={notif.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`알림: ${notif.title || '알림 항목'}`}
                    className={cn(
                      "group relative p-6 rounded-lg border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm",
                      notif.isRead
                        ? "bg-muted/10 border-border/40 opacity-60"
                        : "bg-card border-border shadow-xl hover:shadow-primary/5 hover:border-primary/20",
                      !notif.isRead && notif.type === 'SECURITY' && "border-rose-100 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10"
                    )}
                    onClick={() => !notif.isRead && onMarkRead(notif.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!notif.isRead) onMarkRead(notif.id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start gap-4 relative z-10">
                      <div className={cn(
                         "w-10 h-10 rounded-lg flex items-center justify-center shadow-md shrink-0",
                         notif.isRead ? "bg-muted text-muted-foreground" : "bg-background border border-border"
                      )}>
                         {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                         <div className="flex items-center justify-between">
                            <h3 className={cn("text-sm font-bold tracking-tight transition-colors truncate pr-4 text-card-foreground", !notif.isRead && "text-foreground")}>
                               {notif.title}
                            </h3>
                            {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] animate-pulse" />}
                         </div>
                         <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 font-medium">
                            {notif.message}
                         </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-6 relative z-10 px-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{notif.time}</span>
                      <button className="flex items-center gap-2 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 tracking-[0.2em] uppercase cursor-pointer">
                        상세 보기 <ArrowRight size={14} />
                      </button>
                    </div>

                    {/* Background Decoration */}
                    {!notif.isRead && notif.type === 'SECURITY' && (
                       <div className="absolute right-0 top-0 p-4 opacity-5">
                          <ShieldAlert size={80} />
                       </div>
                    )}
                  </div>
                ))
             )}
          </div>

          {/* Bottom Sticky Control */}
          <div className="p-8 border-t border-border bg-card">
             <Button
               data-testid="read-all-broadcasts-btn"
               onClick={onMarkAllRead}
               className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold tracking-[0.3em] uppercase text-xs shadow-2xl hover:bg-primary/90 transition-all"
             >
                모든 알림 읽음 처리
             </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

