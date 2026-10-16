import type { InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';

/**
 * 결재 처리의 이름 규칙(결재함·알림 카드 공통, 2026-10-16). 결재함(ApprovalHubClient)과 알림 드로어의 바로 승인이 같은 문서를 같은
 * 말로 부르도록 한곳에 둔다.
 */

/** 문서를 부를 이름 — 제목, 없으면 번호. */
export function documentLabel(item: InformalSanctionDto): string {
  return item.docTtl || `#${item.ifmlAtrzSn}`;
}

/** 이 단계가 합의(전원 동의) 단계인가 — 처리 동사를 '승인' 대신 '동의' 로 부른다. */
export function isAgreementStage(item: InformalSanctionDto): boolean {
  return item.stages?.find(stage => stage.status === 'ACTIVE')?.kind === 'AGREEMENT';
}

/** 처리 동사에 목적격 조사를 붙인다 — '승인을', '동의를'. */
export function withObjectParticle(actionNm: string): string {
  return actionNm === '동의' ? '동의를' : `${actionNm}을`;
}
