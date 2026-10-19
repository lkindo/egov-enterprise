import { approvalQueryOptions } from '@/queries/approval-query-options';

/**
 * 업무 홈의 결재 대기 카드 조회(Phase 2 9단계). 결재 기능 소유다.
 *
 * 결재함의 대기 탭 배지와 같은 키다 — 결재를 처리하면 결재함의 목록 무효화가 이 수도 다시 읽는다. 배지의 `select`(건수가 없으면 0)는
 * 옮겨 오지 않는다: 셀 수 없는 대기 수를 0건이라고 말하지 않는다(DEC-OPS-100). 종전 홈은 대시보드 응답의 결재 대기 수를 읽었는데,
 * 그 응답은 게시판 타입에 묶여 결재만 고른 구성에서 함께 사라진다 — 결재 카드는 결재 API(APPROVAL_READ)로 센다.
 * 'use client' 가 없는 모듈이라 서버 자식도 같은 객체로 미리 채운다.
 */
export const pendingApprovalCountQuery = approvalQueryOptions.list('PENDING', { page: 1, size: 1 });
