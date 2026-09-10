'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { SmartNotificationHub } from '@/app/components/ui/smart-notification-hub';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { NotificationDispatchDialog } from './NotificationDispatchDialog';

/**
 * 알림 센터 — 현재 계정의 알림 API 응답을 보여 주는 화면.
 *
 * [2026-09-06 DEC-OPS-038] 종전의 '발송 미리보기 (데모)' 뷰(`?view=dispatch`)와 260px 장식 아이콘의 히어로 블록을
 * 걷었다(감사 D09-05). 발송 뷰는 "서버에는 어떤 내용도 저장하거나 전송하지 않습니다" 라고 스스로 밝히는 로컬
 * 데모였고, 히어로는 업무 화면 문법 카탈로그 §3 의 금지 목록이다. 뷰 상태가 사라졌으므로 이 화면은 더 이상 URL
 * query 를 읽거나 쓰지 않는다.
 *
 * [2026-09-06 DEC-OPS-042] 관리자 발송을 실제 기능으로 승격했다 — '알림 보내기' 는 라우트 게이트와 같은 역할 집합
 * (NOTI_DISPATCH 기능권한)에만 보이고, 다이얼로그는 열릴 때만 마운트한다(DEC-OPS-037 과 같은 방식).
 * 수신자는 공용 피커로 고르고 서버(`/admin/notifications/dispatch`)가 존재를 확인한 뒤 사람마다 알림을 만든다.
 */
export default function NotificationsClient() {
  const { user } = useAuth();
  const canDispatch = canPermission(user, 'NOTI_DISPATCH');
  const [isDispatchOpen, setDispatchOpen] = useState(false);

  return (
    <div className="space-y-10 pb-20">
      <PageHeader
        title="스마트 알림 및 메시징 허브"
        breadcrumbs={[{ label: '시스템 관리' }, { label: '메시징 센터' }]}
        actions={canDispatch ? (
          <Button size="sm" className="gap-2" onClick={() => setDispatchOpen(true)}>
            <Send size={16} aria-hidden="true" /> 알림 보내기
          </Button>
        ) : undefined}
      />
      <SmartNotificationHub />
      {canDispatch && isDispatchOpen && (
        <NotificationDispatchDialog isOpen onClose={() => setDispatchOpen(false)} />
      )}
    </div>
  );
}
