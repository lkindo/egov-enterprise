/**
 * 운영 결정 색인의 경로 — 정본 한 곳(DEC-OPS-381).
 *
 * 공용 결정 인덱스(.agent/memory/decisions.md)는 에이전트 진입점이 매 세션 읽고, 영역 결정 색인 넷은 대상 경로를 고칠 때만 읽으며,
 * 역사 색인은 지금의 작업을 제약하지 않는 결정을 둔다. 셋은 보관 원문의 DEC 를 정확히 한 번씩 나눠 가진다(Atlas 생성기가 검사).
 * Atlas·공용 메모리 계약·원장 재진술 검출·병합 도구·화면 용어 계약이 이 목록을 읽는다.
 *
 * merge-main-regenerate.mjs 가 병합 중(다른 파일에 충돌 표기가 남아 있을 때) 읽으므로 import 를 두지 않는다.
 */
export const CURRENT_DECISION_INDEX = '.agent/memory/decisions.md';

export const DECISION_AREA_INDEXES = Object.freeze([
  { area: 'ci-governance', label: 'CI·검증·거버넌스', path: 'docs/04-operations/operational-decisions-index-ci-governance.md' },
  { area: 'composer', label: '프로젝트 생성기·재사용 투영', path: 'docs/04-operations/operational-decisions-index-composer.md' },
  { area: 'migration', label: '레거시 이관 도구', path: 'docs/04-operations/operational-decisions-index-migration.md' },
  { area: 'product', label: '제품 동작·화면·도메인', path: 'docs/04-operations/operational-decisions-index-product.md' },
].map(Object.freeze));

export const HISTORICAL_DECISION_INDEX = 'docs/archived/operational-decisions-index-historical.md';
export const DECISION_ARCHIVE = 'docs/archived/operational-decisions-history.md';

/** 지금의 작업을 제약하는 결정 색인(공용·영역). */
export const BINDING_DECISION_INDEXES = Object.freeze([CURRENT_DECISION_INDEX, ...DECISION_AREA_INDEXES.map(({ path }) => path)]);
/** 보관 원문의 DEC 를 나눠 갖는 모든 색인(공용·영역·역사). */
export const ALL_DECISION_INDEXES = Object.freeze([...BINDING_DECISION_INDEXES, HISTORICAL_DECISION_INDEX]);
