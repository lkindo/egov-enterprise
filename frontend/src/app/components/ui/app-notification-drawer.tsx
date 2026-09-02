'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X,
  Bell,  
  ShieldAlert,  
  Activity,  
  Database,  
  Zap,  
  AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog as DialogPrimitive } from 'radix-ui';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type?: 'SECURITY' | 'SYSTEM' | 'ACTIVITY' | 'INFO';
  /**
   * 알림을 눌렀을 때 갈 내부 경로. 목적지가 없으면 {@code null} 이고 이동 어포던스를 그린다.
   *
   * <p>훅({@code useNotifications})이 {@code normalizeInternalRoute} 로 이미 검증한 값이다 —
   * 외부 origin·다른 스킴·자격 포함 URL 은 여기 도달하기 전에 null 이 된다. 이 컴포넌트는
   * 값을 다시 신뢰하지 않고 <b>있으면 링크, 없으면 링크 없음</b>으로만 분기한다.
   */
  linkUrl?: string | null;
}

interface AppNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  /**
   * [2026-08-04] 조회 실패 사유. null 이면 정상.
   * 이 값이 없던 동안 드로어는 실패와 '알림 없음' 을 **같은 화면**으로 렌더했다 —
   * 보안 알림이 오고 있어도 사용자는 조용하다고 믿었다.
   */
  error?: string | null;
  /** 오류 상태에서 사용자가 직접 재시도할 수 있게 한다(알림은 자동 폴링이 60초라 체감이 길다). */
  onRetry?: () => void;
}

type FilterType = 'ALL' | 'SECURITY' | 'SYSTEM' | 'ACTIVITY';

export function AppNotificationDrawer({ isOpen, onClose, notifications, onMarkRead, onMarkAllRead, error, onRetry }: AppNotificationDrawerProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const hasUnreadNotifications = notifications.some(n => !n.isRead);

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
          <DialogPrimitive.Description className="sr-only">받은 알림 목록입니다.</DialogPrimitive.Description>

          {/* Header Fabric */}
          <div className="flex h-24 items-center justify-between border-b border-border px-8 bg-card sticky top-0 z-20">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-3 tracking-tighter uppercase text-card-foreground">
                <div className="w-10 h-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground flex items-center justify-center shadow-lg">
                   <Bell size={20} className="animate-pulse" />
                </div>
                알림 센터
              </h2>
              <p className="text-xs font-bold text-muted-foreground tracking-tight">받은 알림</p>
            </div>
            <div className="flex items-center gap-2">
              {hasUnreadNotifications && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onMarkAllRead}
                  className="text-xs font-bold tracking-widest uppercase hover:text-primary h-8 px-2"
                >
                  {/*
                    [2026-08-29] '모두 읽음' → '불러온 알림 읽음'.
                    이 동작은 드로어에 불러온 페이지의 미읽음만 처리한다(use-notifications
                    markAllAsRead). 서버 전체를 읽음 처리하는 경로는 아직 없다.
                  */}
                  불러온 알림 읽음
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
             {/*
                [2026-08-29] '알림 전체 삭제' 휴지통 버튼을 걷었다.
                onClick·type·form 이 전혀 없어 눌러도 아무 일이 없었는데, hover 하면 빨갛게
                변하고 cursor-pointer 라 눌리는 것처럼 보였다. 되살리려면 대상 자체가 필요하다 —
                서버에는 단건 DELETE /api/v1/notifications/{notiSn} 만 있고 일괄 삭제 경로가 없다.
                일괄 삭제는 파괴적 작업이라 범위·확인 절차를 정하는 제품 결정이 선행된다.
             */}
          </div>

          {/* Notification Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10">
             {/* [2026-08-04] 조회 실패를 '알림 없음' 으로 렌더하지 않는다.
                 오류 상태를 빈 상태보다 **먼저** 판정한다 — 실패 시 목록이 비어 있는 경우가
                 대부분이라, 순서를 뒤집으면 오류 화면이 영원히 도달하지 못한다. */}
             {error ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                  <AlertTriangle size={64} className="text-destructive-emphasis opacity-80" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">{error}</p>
                    <p className="text-sm text-muted-foreground">
                      표시할 알림이 없는 것이 아니라 <strong>조회에 실패</strong>했습니다.
                      읽지 않은 알림이 있을 수 있습니다.
                    </p>
                  </div>
                  {onRetry ? (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-2 px-5 py-2 rounded-lg border border-border bg-card text-sm font-bold hover:bg-muted transition-colors"
                    >
                      다시 시도
                    </button>
                  ) : null}
                </div>
             ) : filteredNotifications.length === 0 ? (
                <div
                   className="flex flex-col items-center justify-center h-full text-muted-foreground/30"
                >
                  <Zap size={100} className="mb-8 opacity-20" />
                  <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">활성화된 알림이 없습니다</span>
                </div>
             ) : (
                filteredNotifications.map((notif) => {
                  const canMarkRead = !notif.linkUrl && !notif.isRead;
                  /* 목적지 링크가 있으면 카드와 링크를 중첩 인터랙션으로 만들지 않는다.
                     링크가 없는 미읽음 알림만 카드 자체가 "읽음 처리" 버튼 역할을 한다. */
                  const cardClassName = cn(
                    "group relative w-full p-6 rounded-lg border text-left transition-all duration-300 overflow-hidden backdrop-blur-sm",
                    canMarkRead && "cursor-pointer",
                    notif.isRead
                      ? "bg-muted/10 border-border/40 opacity-60"
                      : "bg-card border-border shadow-xl hover:shadow-primary/5 hover:border-primary/20",
                    !notif.isRead && notif.type === 'SECURITY' && "border-rose-100 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10"
                  );
                  const cardContent = (
                    <>
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
                      {/*
                         [2026-08-29] '상세 보기 →' 버튼을 걷었다. onClick·href·router.push 가
                         전혀 없었고, 갈 곳도 없었다.

                         [2026-09-02] 갈 곳이 생겨서 되살린다 — 다만 '상세 보기' 가 아니라
                         **업무로 이동**이다. 서버의 알림 producer 3종이 결재함·쪽지함·게시글로
                         가는 경로를 계산해 저장하고, 훅이 그것을 내부 경로로 검증해 넘긴다.
                         목적지가 없는 알림(관리자 수기 공지 등)에는 아무것도 그리지 않는다 —
                         누를 수 없는 버튼을 두는 것이 종전에 걷어낸 바로 그 문제였다.

                         ⚠ Link 클릭이 바깥 카드의 onClick(읽음 처리)까지 타지 않게 stopPropagation
                         하지 않는다. 오히려 반대로, 이동하면서 읽음 처리도 되는 것이 맞다 —
                         사용자가 알림을 눌러 업무로 갔는데 그 알림이 미읽음으로 남으면 안 된다.
                      */}
                      {notif.linkUrl ? (
                        <Link
                          href={notif.linkUrl}
                          aria-label={`${notif.title || '알림'} 업무로 이동`}
                          onClick={() => {
                            if (!notif.isRead) onMarkRead(notif.id);
                            onClose();
                          }}
                          className="text-xs font-bold text-primary hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 rounded-sm"
                        >
                          바로가기 →
                        </Link>
                      ) : null}
                    </div>

                    {/* Background Decoration */}
                    {!notif.isRead && notif.type === 'SECURITY' && (
                       <div className="absolute right-0 top-0 p-4 opacity-5">
                          <ShieldAlert size={80} />
                       </div>
                    )}
                    </>
                  );

                  if (canMarkRead) {
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        aria-label={`알림: ${notif.title || '알림 항목'}`}
                        className={cardClassName}
                        onClick={() => onMarkRead(notif.id)}
                      >
                        {cardContent}
                      </button>
                    );
                  }

                  return (
                    <div key={notif.id} className={cardClassName}>
                      {cardContent}
                    </div>
                  );
                })
             )}
          </div>

          {/* Bottom Sticky Control */}
          <div className="p-8 border-t border-border bg-card">
             <Button
               data-testid="read-all-broadcasts-btn"
               onClick={onMarkAllRead}
               disabled={!hasUnreadNotifications}
               className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold tracking-[0.3em] uppercase text-xs shadow-2xl hover:bg-primary/90 transition-all"
             >
                불러온 알림 읽음 처리
             </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

