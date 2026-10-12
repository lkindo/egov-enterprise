import { defineContributions } from '@/extensions/slots';
import { HARNESS_TAB_VIEW } from '@/app/admin/system/monitoring/components/HarnessAtlasPanels';

/**
 * 시연 → 감시 허브 탭 기여(허브 분해 H3). 하네스 아틀라스는 저장소 스킬 목록을 옮긴 정적 카탈로그와 예시 계측 로그라 운영 기능이
 * 아니다. 시연이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 하네스 탭만 사라진다. 탭 값(id)은 허브의 `?tab=` 값이며 허브
 * 탭 해석(monitoring-tabs.ts 의 contributable)이 이 파일을 지목한다.
 */
export default defineContributions('hub-tabs', [
  {
    id: 'HARNESS',
    hub: 'monitoring',
    order: 10,
    label: '하네스 아틀라스',
    view: HARNESS_TAB_VIEW,
    visibleWhen: { always: '종전 노출 보존 — 감시 허브 진입자에게 늘 보였고, 정적 표본이라 서버 조회가 없다.' },
  },
]);
