'use client';

import { PageHeader } from '@/app/components/layout/page-header';
import { SmartNotificationHub } from '@/app/components/ui/smart-notification-hub';

/**
 * 알림 센터 — 현재 계정의 알림 API 응답을 보여 주는 화면.
 *
 * [2026-09-06 DEC-OPS-038] 종전의 '발송 미리보기 (데모)' 뷰(`?view=dispatch`)와 260px 장식 아이콘의 히어로 블록을
 * 걷었다(감사 D09-05). 발송 뷰는 "서버에는 어떤 내용도 저장하거나 전송하지 않습니다" 라고 스스로 밝히는 로컬
 * 데모였고, 히어로는 업무 화면 문법 카탈로그 §3 의 금지 목록이다. 관리자 발송을 실제 기능으로 승격하려면 수신자
 * 해석(피커)·인가 설계가 선행이라, 데모를 남겨 두는 대신 걷는 쪽을 택했다 — 화면이 하지 않는 일을 어포던스로
 * 보이지 않는다(G10). 뷰 상태가 사라졌으므로 이 화면은 더 이상 URL query 를 읽거나 쓰지 않는다.
 */
export default function NotificationsClient() {
  return (
    <div className="space-y-10 pb-20">
      <PageHeader
        title="스마트 알림 및 메시징 허브"
        breadcrumbs={[{ label: '시스템 관리' }, { label: '메시징 센터' }]}
      />
      <SmartNotificationHub />
    </div>
  );
}
