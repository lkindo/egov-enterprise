import { defineContributions } from '@/extensions/slots';
import { RealTimeHomeSection } from '@/components/features/dashboard/RealTimeHomeSection';

/**
 * 실시간 대시보드 → 업무 홈 기여(Phase 2 9단계). '실시간 상태' 구역이다. 실시간 대시보드가 빠진 구성에서는 이 파일이 기능과 함께 직접
 * 지워져 '최근 활동' 구역이 전체 폭을 쓴다. 노출은 통계 방송 구독(/topic/dashboard/stats)과 같은 권한(DASHBOARD_READ)이다.
 */
export default defineContributions('home-sections', [
  {
    id: 'realtime',
    placement: 'status',
    order: 10,
    Component: RealTimeHomeSection,
    visibleWhen: { permissions: ['DASHBOARD_READ'] },
  },
]);
