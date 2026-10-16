import type { NotificationActionContext, NotificationActionOutcome, NotificationActionSettlement } from '@/extensions/slots';
import { approvalUserService, SANCTION_STATUS, type InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import { APPROVAL_UNDO_MS, cancelApprovalCommit, scheduleApprovalCommit } from '@/app/approvals/approval-undo-queue';
import { documentLabel, isAgreementStage, withObjectParticle } from '@/app/approvals/approval-decision';
import { isConflictError } from '@/lib/query/list-query-defaults';
import { approvalKeys, approvalQueryOptions } from './approval-query-options';

/**
 * 알림 카드에서 바로 승인(2026-10-16 결재 동선 개선). 결재 기능 소유이고, 기여(src/extensions/informalsanction/notification-actions.ts)는
 * 이 두 이름만 가리킨다. 잠금·상태 문구·토스트·되돌리기 단추는 호스트(머리글 알림 드로어)가 한다 — 여기서는 판정과 보내기만 한다.
 *
 * <p>결재함의 단건 승인과 같은 의미다(DEC-OPS-218 ②). 확인 대화상자 없이 결재함과 같은 되돌리기 대기열(approval-undo-queue)에 올리고
 * 10초 안에 되돌리지 않으면 서버로 보낸다. 대기열이 같으므로 결재함을 열어 두었으면 그쪽 '처리 예정' 에도 보이고 되돌릴 수 있다.
 *
 * <p>알림은 지난 사실이다 — 누른 순간 문서 상세를 서버에서 다시 읽어 지금 버전과 '지금 내 차례인가'(서버 힌트 canApprove: 진행 중·
 * 지금 단계의 처리 전 결재자·결재 권한)를 확인한다. 아니면 보내지 않고 사유를 돌려준다. 보완 요청에 대한 답을 기다리는 문서는 결재함의
 * 여러 건 승인과 같이 바로 승인하지 않는다(문서를 열어 답을 보고 처리한다). 지금 단계에서 보완 요청에 답이 온 문서도 바로 승인하지
 * 않는다 — 기안자는 답하면서 본문을 고칠 수 있고(버전이 오른다), 그러면 이 단추는 결재자가 아직 읽지 않은 본문을 승인하게 된다.
 *
 * <p>쓰기 권한 census(축 3)는 이 모듈을 중간 모듈로 읽어 approveFromNotification 에 APPROVAL_APPROVE 를 붙이고, 기여 → 레지스트리 →
 * 알림 드로어로 귀속한다. 기여의 노출 술어가 같은 권한이다.
 */

/** 결재 차례 알림의 이동 경로 — 서버 InformalSanctionService.pendingLink 와 같은 꼴이다(`/approvals?tab=PENDING&doc=<번호>`). */
const PENDING_LINK = /^\/approvals\?tab=PENDING&doc=([1-9]\d{0,15})$/;

/**
 * 결재 차례 알림이면 문서 번호를, 아니면 null 을 돌려준다. 결과·참조 알림의 다른 탭 링크에는 단추를 두지 않는다. 보완 답변 알림은
 * 차례 알림과 같은 링크라 단추가 붙지만, 누르면 승인하지 않고 결재함에서 답을 읽으라고 안내한다(아래 answeredInCurrentStage).
 */
export function matchApprovalTurnNotification(linkUrl: string): string | null {
  return PENDING_LINK.exec(linkUrl)?.[1] ?? null;
}

/**
 * 지금 단계에서 보완 요청에 답이 왔는가 — 이 차수의 처리 이력에 지금 단계가 시작된 뒤(currentStageSince)의 보완 답변(ANSWER)이
 * 있으면 참이다. 처리 이력은 이름만 싣고 식별자를 싣지 않아 '내가 한 요청' 을 이름으로 가리지 않는다 — 같은 단계의 다른 결재자가
 * 요청한 답도 본문을 바꿀 수 있으므로 함께 막는다. 앞 단계에서 오간 요청·답은 이 단계의 문서를 올린 뒤의 일이 아니므로 막지 않는다.
 * 시각이나 차수를 읽을 수 없으면 막는다(바로 승인은 편의라 못 보내도 결재함에서 처리할 수 있다).
 */
function answeredInCurrentStage(detail: InformalSanctionDto): boolean {
  const since = detail.currentStageSince ? Date.parse(detail.currentStageSince) : Number.NaN;
  return (detail.processHistory ?? []).some(entry => entry.type === 'ANSWER'
    && (typeof detail.atrzCycl !== 'number' || entry.atrzCycl === detail.atrzCycl)
    && (Number.isNaN(since) || !entry.at || !(Date.parse(entry.at) < since)));
}

/** 보내지 않고 멈춘 사유 — 호스트가 그대로 보인다(서버 오류와 같은 자리). */
function refusal(message: string): Error {
  return Object.assign(new Error(message), { response: { data: { message } } });
}

/**
 * 결재 차례 알림의 [승인]. 상세를 다시 읽어 차례·버전을 확인하고 되돌리기 대기열에 올린다. 결과(settled)는 10초 뒤 실제로 보낸 다음에
 * 끝난다 — 서버가 충돌(다른 결재자의 반려·기안자의 회수 등)이나 권한 거부를 말하면 그 오류로 거절되고, 결재 목록·상세를 다시 읽는다.
 */
export async function approveFromNotification({ target, queryClient }: NotificationActionContext): Promise<NotificationActionOutcome> {
  const ifmlAtrzSn = Number(target);
  if (!Number.isSafeInteger(ifmlAtrzSn) || ifmlAtrzSn <= 0) throw refusal('결재 문서 번호를 확인할 수 없습니다. 결재함에서 열어 주세요.');
  const detail = await queryClient.fetchQuery({ ...approvalQueryOptions.detail(ifmlAtrzSn), staleTime: 0 });
  const title = documentLabel(detail);
  if (detail.aprvYn !== SANCTION_STATUS.REQUESTED || !detail.canApprove) {
    throw refusal(`‘${title}’ 은 이미 처리됐거나 지금 내 차례가 아닙니다. 결재함에서 문서 상태를 확인해 주세요.`);
  }
  if (detail.openSupplement) {
    throw refusal(`‘${title}’ 은 보완 요청에 대한 답을 기다리고 있습니다. 문서를 열어 답을 확인한 뒤 처리해 주세요.`);
  }
  if (answeredInCurrentStage(detail)) {
    throw refusal(`‘${title}’ 에 보완 요청의 답이 왔습니다. 본문이 바뀌었을 수 있으니 결재함에서 답과 본문을 읽은 뒤 처리해 주세요.`);
  }
  const version = detail.version;
  if (typeof version !== 'number') throw refusal(`‘${title}’ 의 버전을 확인할 수 없습니다. 결재함에서 열어 주세요.`);
  const actionNm = isAgreementStage(detail) ? '동의' : '승인';
  let settle: { resolve: (settlement: NotificationActionSettlement) => void; reject: (error: unknown) => void } = {
    resolve: () => undefined, reject: () => undefined };
  const settled = new Promise<NotificationActionSettlement>((resolve, reject) => { settle = { resolve, reject }; });
  const accepted = scheduleApprovalCommit(ifmlAtrzSn, async () => {
    try {
      await approvalUserService.confirm(ifmlAtrzSn, SANCTION_STATUS.APPROVED, undefined, version);
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: approvalKeys.detail(ifmlAtrzSn) });
      settle.resolve({ kind: 'done', message: `‘${title}’ ${actionNm}했습니다.` });
    } catch (error) {
      // 충돌은 먼저 일어난 다른 처리다 — 결재함과 같이 목록·상세를 다시 읽어 사라진 문서를 걷는다.
      if (isConflictError(error)) void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
      settle.reject(error);
    }
  }, {
    // 결재함의 '처리 예정' 에서 되돌려도 이 카드가 되돌림을 안다 — 같은 대기열이다.
    onCancel: () => settle.resolve({ kind: 'undone' }),
    label: { title, actionNm },
  });
  if (!accepted) throw refusal(`‘${title}’ 은 이미 처리 예정입니다. 결재함의 ‘처리 예정’ 에서 되돌리거나 지금 처리할 수 있습니다.`);
  return {
    message: `‘${title}’ ${withObjectParticle(actionNm)} ${APPROVAL_UNDO_MS / 1000}초 뒤 처리합니다. 되돌리려면 되돌리기를 누르세요.`,
    undo: () => cancelApprovalCommit(ifmlAtrzSn),
    undoMs: APPROVAL_UNDO_MS,
    undoneMessage: `‘${title}’ ${actionNm} 처리를 되돌렸습니다. 문서는 그대로 대기 중입니다.`,
    settled,
  };
}
