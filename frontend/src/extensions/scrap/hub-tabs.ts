import { defineContributions } from '@/extensions/slots';
import { ScrapCollaborationTab } from '@/app/admin/collaboration/scraps/ScrapCollaborationTab';

/**
 * 스크랩 → 협업 허브 탭 기여(허브 분해 H1). 스크랩 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 스크랩 탭만 사라진다.
 * 스크랩 화면(/admin/collaboration/scraps)은 같은 허브를 이 탭으로 연다.
 */
export default defineContributions('hub-tabs', [
  {
    id: 'SCRAPS',
    hub: 'collaboration',
    order: 20,
    label: '스크랩',
    view: { Component: ScrapCollaborationTab },
    visibleWhen: { always: '종전 노출 보존 — 허브 진입자에게 늘 보였고, 목록은 서버가 스크랩 조회 권한으로 막는다.' },
  },
]);
