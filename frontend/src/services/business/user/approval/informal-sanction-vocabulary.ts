import type { components } from '@/types/generated-api';

/**
 * 약식결재(비정형 결재) 도메인 어휘.
 *
 * <p>[2026-09-07] 종전에는 이 어휘가 `IsmAdminService.ts` 안에 살았고 결재 도메인이 그 파일에서
 * 재수출했다. 그 서비스 클래스는 `/admin/system/ism` 화면을 위해 존재했는데, DEC-OPS-040 이
 * 그 화면을 `/approvals` 로 통합하며 `IsmClient` 를 삭제하자 <b>7메서드가 통째로 죽었다</b>
 * (유일한 소비자가 자기 단위 테스트 — operation-consumer-census 축 2 실측).
 * 죽은 클래스를 걷으면서 살아 있는 어휘만 실제 소비자(결재 도메인) 옆으로 옮긴다.
 *
 * <p><b>⚠ 로컬 인터페이스 재선언 금지</b>(FE 헌법). `generated-api.d.ts` 가 API 계약의 SSOT 다.
 * 과거 결재 화면이 로컬 `InfrmlSanctn` 을 따로 선언했다가 서버 DTO 와 교집합이 0이 되어
 * <b>목록 전 행이 빈 값이고 상세 제목에 문자열 `#undefined` 가 렌더</b>됐다. 같은 결함을
 * 관리자 화면(ISM)이 먼저 겪고 고쳤으며, 이 주석이 그 이력을 잇는다.
 */
export type InformalSanctionDto = components['schemas']['InformalSanctionDto'];

/**
 * 결재 상태 코드 — 백엔드 `SanctionStatus` 열거형과 1:1 대응한다.
 * 임의 변환(예: 'C' → 'Y') 금지. 서버가 기대하는 코드를 그대로 전달한다.
 */
export const SANCTION_STATUS = {
  /** 신청(대기) */
  REQUESTED: 'A',
  /** 승인 */
  APPROVED: 'C',
  /** 반려 */
  REJECTED: 'R',
} as const;

export type SanctionStatusCode = (typeof SANCTION_STATUS)[keyof typeof SANCTION_STATUS];

/** 결재 대기(미처리) 여부 — 초기 상태는 'A'(신청)이며, 미설정도 대기로 간주한다. */
export function isSanctionPending(aprvYn?: string): boolean {
  return !aprvYn || aprvYn === SANCTION_STATUS.REQUESTED;
}
