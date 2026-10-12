import { defineContributions } from '@/extensions/slots';
import { ApprovalOpenAction, ApprovalPendingCard } from '@/app/components/dashboard/ApprovalHome';
import { pendingApprovalCountQuery } from '@/queries/approval-home-query';

/**
 * 약식 전자결재 → 업무 홈 기여(Phase 2 9단계). 결재 대기 카드와 결재함 열기 단추다. 결재가 빠진 구성에서는 이 파일이 기능과 함께 직접
 * 지워져 이 조각만 사라진다.
 *
 * 대기 수는 결재 대기 API(/approvals/pending)의 전체 건수이고 노출은 그 권한(APPROVAL_READ)이다(사용자 결정 B5). 종전에는 대시보드
 * 응답의 대기 수라 DASHBOARD_READ 만으로 보였다 — 그 응답은 게시판 타입에 묶여 결재만 고른 구성에서 사라지므로 같은 노출은 둘 수 없다.
 * 기본 그룹은 셋 모두 APPROVAL_READ 를 가져 화면이 같다. 대기 수를 셀 수 없으면 카드만 '조회 실패' 다(section).
 */
export default defineContributions('home-sections', [
  {
    id: 'approval-open',
    placement: 'actions',
    order: 20,
    Component: ApprovalOpenAction,
    visibleWhen: { permissions: ['APPROVAL_READ'] },
  },
  {
    id: 'approval-pending',
    placement: 'cards',
    order: 10,
    Component: ApprovalPendingCard,
    prefetch: [{ query: pendingApprovalCountQuery, failure: 'section' }],
    visibleWhen: { permissions: ['APPROVAL_READ'] },
  },
]);
