import { defineContributions } from '@/extensions/slots';

/**
 * 업무 보고 → 나의 업무 탭 줄의 '업무 보고' 탭(업무 허브 분해 W1). 탭은 업무 보고 화면으로 가는 경로 탭이다. 업무 보고 기능이 빠진
 * 구성에서는 이 파일이 기능과 함께 직접 지워져 탭만 사라진다. id 가 탭 DOM id(work-hub-tab-report)를 만든다 — 분해 전과 같다.
 */
export default defineContributions('shell-links', [
  {
    id: 'report',
    placement: 'work-hub',
    order: 20,
    href: '/smart-toolkit/work-report',
    label: '업무 보고',
    visibleWhen: { page: '/smart-toolkit/work-report' },
  },
]);
