import { defineContributions } from '@/extensions/slots';
import { ScrapCollaborationTab } from '@/app/admin/collaboration/scraps/ScrapCollaborationTab';

/**
 * 스크랩 → 협업 허브 탭 기여(허브 분해 H1). 스크랩 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 스크랩 탭만 사라진다.
 * 스크랩 화면(/admin/collaboration/scraps)은 같은 허브를 이 탭으로 연다.
 *
 * 노출은 탭이 부르는 내 스크랩 목록 API 와 같은 권한(SCRAP_READ)이다(허브 분해 H5). 종전에는 탭이 보였고 목록이 403 이었다.
 * 기본 그룹은 화면이 같다. 노출일 뿐 인가는 서버가 한다(H3).
 */
export default defineContributions('hub-tabs', [
  {
    id: 'SCRAPS',
    hub: 'collaboration',
    order: 20,
    label: '스크랩',
    view: { Component: ScrapCollaborationTab },
    visibleWhen: { permissions: ['SCRAP_READ'] },
  },
]);
