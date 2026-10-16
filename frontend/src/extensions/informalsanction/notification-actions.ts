import { defineContributions } from '@/extensions/slots';
import { approveFromNotification, matchApprovalTurnNotification } from '@/queries/approval-notification-action';

/**
 * 약식 전자결재 → 머리글 알림 드로어의 바로 처리 기여(2026-10-16 결재 동선 개선). 결재 차례가 왔다는 알림 카드에 [승인] 을 둔다 —
 * 호스트가 [열기] 와 함께 그린다. 결재 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워지고 레지스트리가 빈 배열로 다시
 * 만들어진다 — 알림 드로어는 결재 코드를 import 하지 않으므로 그대로 남는다.
 *
 * 승인은 결재함의 단건 승인과 같다(확인 없이 10초 되돌리기, DEC-OPS-218 ②). 노출은 누른 뒤 부르는 두 API 의 권한을 모두 가진
 * 사람에게만 한다 — 상세를 다시 읽는 조회(APPROVAL_READ)와 승인(APPROVAL_APPROVE)이다. 하나라도 없으면 누를 때마다 403 이다.
 * 노출일 뿐 인가가 아니다 — 차례·버전·권한은 서버가 다시 판정한다(H3).
 */
export default defineContributions('notification-actions', [
  {
    id: 'approval-approve',
    order: 10,
    label: '승인',
    busyLabel: '확인 중…',
    name: '결재 바로 승인',
    failureMessage: '결재를 승인하지 못했습니다. 결재함에서 문서를 확인해 주세요.',
    match: matchApprovalTurnNotification,
    submit: approveFromNotification,
    visibleWhen: { permissions: ['APPROVAL_READ', 'APPROVAL_APPROVE'] },
  },
]);
