'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';
import { canPermission } from '@/lib/auth/permissions';
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
 * 그래서 이 파일 하나로 떼어 두고, 머리글은 알림 기능의 슬롯 기여(`src/extensions/notification/header-widgets.ts`,
 * 슬롯 단계 PR-6)를 레지스트리로 읽는다. 알림이 빠진 구성에서는 기여와 이 파일이 함께 직접 지워지고 레지스트리가 빈 배열로
 * 다시 렌더되므로 **헤더는 살아남고 벨만 사라진다.** 죽은 링크도 남지 않는다(G10).
 *
 * 슬롯 술어(NOTI_READ)가 거짓이면 머리글은 이 컴포넌트를 마운트하지 않는다. 아래의 같은 판정은 이중 방어이고, 이 컴포넌트를
 * 직접 렌더하는 시험(권한 철회)이 본다.
 */
export function HeaderNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  // 알림 센터는 드로어가 불러오지 않은 알림까지 서버 페이지로 보인다. 들어갈 수 있을 때만 길을 보인다(DIP B4 P1·P2).
  const { user } = useAuth();
  const canOpenCenter = canOpenPage(user, '/admin/notifications');
  const {
    notifications,
    unreadCount,
    error: notificationsError,
    isLoading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refresh: refreshNotifications,
  } = useNotifications();

  if (!canPermission(user, 'NOTI_READ')) return null;

  return (
    <>
      <Button
        id="e2e-bell-button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={cn(
          'relative text-muted-foreground transition-all group',
          unreadCount > 0 && 'text-primary bg-primary/5 ring-4 ring-primary/5',
        )}
      >
        {/* 이름은 aria-label 이 아니라 내용에서 나온다. aria-label 로 덮으면 보이는 배지 숫자(3·9+)가 이름의 낱말이 아니라
            보이는 글자가 이름에 없는 단추가 된다(axe 4.14 label-content-name-mismatch, WCAG 2.5.3). 배지는 상태 표시라 이름에서 뺀다. */}
        <span className="sr-only">{unreadCount > 0 ? `알림, 읽지 않음 ${unreadCount}건` : '알림'}</span>
        <Bell size={20} aria-hidden="true" className={cn(unreadCount > 0 && 'animate-bounce-subtle')} />
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
        unreadCount={unreadCount}
        centerHref={canOpenCenter ? '/admin/notifications' : undefined}
        // [2026-08-04] 조회 실패를 드로어까지 전달한다. 이 배선이 없으면 훅이 오류를 알아도
        //   화면은 여전히 '활성화된 알림이 없습니다' 를 렌더한다(상태만 만들고 배선하지 않는 것은
        //   고친 것이 아니다 — 12축 감사 클러스터 D).
        loading={notificationsLoading}
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
