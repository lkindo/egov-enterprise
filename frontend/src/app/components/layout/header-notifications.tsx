'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { AppNotificationDrawer } from '../ui/app-notification-drawer';

/**
 * 전역 헤더의 **알림 벨과 드로어**. `collaboration` pack 소유다.
 *
 * [왜 분리했나] 알림은 `notification` appDomain 소유이고 그 도메인은 collaboration pack 에 속한다.
 * 그런데 이 UI 가 `header.tsx` 안에 인라인으로 박혀 있어, 재사용 base 의 core·collaboration
 * 프로필에서 백엔드만 제거되면 **헤더가 없는 API 를 부르는** 상태가 됐다. 반대로 헤더를
 * 통째로 제거하면 생성기의 전이 cascade 가 `layout.tsx` 까지 끌고 가 앱이 무너진다
 * (실측: `layout.tsx:7 → Header → header.tsx:29 → use-notifications`).
 *
 * 그래서 이 파일 하나로 떼어내고, `header.tsx` 에는 `reusable-base:collaboration` 마커 블록만
 * 남긴다. 생성기가 제외 프로필에서 그 블록을 잘라내므로(stripExcludedFrontendPackBlocks)
 * **헤더는 살아남고 벨만 사라진다.** 죽은 링크도 남지 않는다(G10).
 *
 * 이 메커니즘의 선례는 [UnifiedDashboardClient](../../UnifiedDashboardClient.tsx) 의
 * `reusable-base:demo` 블록이다 — 배너·팝업을 같은 방식으로 떼어 두었다.
 */
export function HeaderNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    error: notificationsError,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refresh: refreshNotifications,
  } = useNotifications();

  return (
    <>
      <Button
        id="e2e-bell-button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label={unreadCount > 0 ? `알림, 읽지 않음 ${unreadCount}건` : '알림'}
        className={cn(
          'relative text-muted-foreground transition-all group',
          unreadCount > 0 && 'text-primary bg-primary/5 ring-4 ring-primary/5',
        )}
      >
        <Bell size={20} className={cn(unreadCount > 0 && 'animate-bounce-subtle')} />
        {unreadCount > 0 && (
          <Badge aria-hidden="true" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 text-white border-2 border-background font-bold text-xs shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <AppNotificationDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
        onDelete={removeNotification}
        // [2026-08-04] 조회 실패를 드로어까지 전달한다. 이 배선이 없으면 훅이 오류를 알아도
        //   화면은 여전히 '활성화된 알림이 없습니다' 를 렌더한다(상태만 만들고 배선하지 않는 것은
        //   고친 것이 아니다 — 12축 감사 클러스터 D).
        error={notificationsError}
        onRetry={refreshNotifications}
        notifications={(notifications || []).filter(Boolean).map((n) => ({
          id: n.notiSn,
          title: n.notiTtlNm,
          message: n.notiCn,
          time: n.notiDt,
          isRead: n.readYn === 'Y',
          type: n.type,
          // [2026-09-02] 서버가 계산해 저장한 목적지를 화면까지 나른다. 훅이 이미 내부 경로로
          //   검증했으므로(normalizeInternalRoute) 신뢰할 수 없는 값은 null 로 온다.
          linkUrl: n.linkUrl ?? null,
        }))}
      />
    </>
  );
}
