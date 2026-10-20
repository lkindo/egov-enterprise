import { defineContributions } from '@/extensions/slots';
import { ScheduleTodayCard } from '@/app/components/dashboard/ScheduleHome';

/**
 * 일정 → 업무 홈 기여(2026-10-20). '오늘 일정' 카드다. 일정이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 이 카드만 사라진다.
 * 노출은 카드가 부르는 월별 일정 API(GET /schedules/monthly)의 권한(SCHEDULE_READ)이다 — 기본 그룹은 셋 모두 가져 화면이 같다.
 * 노출일 뿐 인가는 서버가 한다(H3). 수는 브라우저가 센다(서버 미리 채우기 없음).
 */
export default defineContributions('home-sections', [
  {
    id: 'schedule-today',
    placement: 'cards',
    order: 24,
    Component: ScheduleTodayCard,
    visibleWhen: { permissions: ['SCHEDULE_READ'] },
  },
]);
