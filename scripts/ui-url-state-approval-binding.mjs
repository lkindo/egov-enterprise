import { createHash } from 'node:crypto';

/**
 * URL 상태 승인 오버레이(`config/ui-url-state-approval.json`)가 `manifestRef.sha256` 으로 결속하는 census 범위.
 *
 * 승인은 자기가 본 census 에만 유효하다(ui-url-state-census.mjs 의 fail-closed 규칙 3). 그 "본 census" 는 승인 판정이
 * 읽는 내용이다 — record(라우트·쿼리 키·위험 신호·근거)·필수 부정 사례·핵심 흐름·결정 연결·스캔 범위. `summary` 는 결속에서 뺀다:
 * 그 안의 값은 모두 개수다. records·byKind·bySurface 등은 records 에서 다시 계산되고(census 계약이 정확히 대조한다),
 * exactPopulations.filesystemRoutes 는 스캔한 화면 수라 승인 selector 가 읽지 않는다. 그래서 URL 상태가 없는 화면이
 * 생기거나 없어져도 승인 해시를 다시 묶지 않는다. record 가 생기거나 없어지거나 바뀌면 해시가 달라져 승인 계약과
 * 승인 matcher 가 붉다.
 *
 * 생성기(census --write 재결속)·승인 계약·병합 재생성 도구·재사용 투영이 모두 이 함수 하나를 쓴다.
 * node 내장만 쓴다 — 병합 재생성 도구가 충돌 중에도 읽을 수 있어야 한다.
 */
export const APPROVAL_UNBOUND_CENSUS_FIELDS = Object.freeze(['summary']);

export function approvalBoundCensus(census) {
  return Object.fromEntries(Object.entries(census ?? {}).filter(([key]) => !APPROVAL_UNBOUND_CENSUS_FIELDS.includes(key)));
}

export function approvalCensusSha256(census) {
  return createHash('sha256')
    .update(`${JSON.stringify(approvalBoundCensus(census), null, 2)}\n`.replace(/\r\n?/gu, '\n'), 'utf8')
    .digest('hex');
}
