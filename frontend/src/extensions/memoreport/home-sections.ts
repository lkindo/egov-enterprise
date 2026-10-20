import { defineContributions } from '@/extensions/slots';
import { MemoReportReceivedCard } from '@/app/components/dashboard/MemoReportHome';

/**
 * 메모 보고 → 업무 홈 기여(2026-10-20). '읽지 않은 받은 보고' 카드다. 메모 보고가 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져
 * 이 카드만 사라진다. 노출은 카드가 부르는 받은 보고 API(GET /memo-reports/received)의 권한(MEMO_RPT_READ)이다 — 목적지 화면의
 * 진입 권한과 같고, 기본 그룹은 셋 모두 가져 화면이 같다. 노출일 뿐 인가는 서버가 한다(H3).
 */
export default defineContributions('home-sections', [
  {
    id: 'memo-reports-received',
    placement: 'cards',
    order: 22,
    Component: MemoReportReceivedCard,
    visibleWhen: { permissions: ['MEMO_RPT_READ'] },
  },
]);
