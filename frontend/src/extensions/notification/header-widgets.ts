import { defineContributions } from '@/extensions/slots';
import { HeaderNotifications } from '@/app/components/layout/header-notifications';

/**
 * 알림 → 머리글 위젯 기여(슬롯 단계 PR-6). 알림 벨과 드로어는 알림 기능의 파일(header-notifications.tsx)에 있고 이 기여는 참조만 한다.
 * 알림 기능이 빠진 구성에서는 이 파일과 벨 컴포넌트가 함께 직접 지워지고 레지스트리가 빈 배열로 다시 만들어진다.
 * 노출은 종전과 같다 — 벨은 NOTI_READ 가 있을 때만 그려진다(컴포넌트 안의 판정과 같은 술어).
 */
export default defineContributions('header-widgets', [
  {
    id: 'notification-bell',
    order: 10,
    Component: HeaderNotifications,
    visibleWhen: { permissions: ['NOTI_READ'] },
  },
]);
