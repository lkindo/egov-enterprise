# A그룹 결정 검토 — 비정본 tombstone

> **상태: Superseded / 경로 유지** — 활성 제품·운영 결정은 [pending-decisions.md](../04-operations/pending-decisions.md)의 ID 기반 레지스트리로 이관됐다. 이 경로는 적용된 `V2_32` migration의 immutable 주석이 참조하므로 삭제하지 않는다.

## 현재 판단에 사용할 정본

- 미결 제품·운영 선택: [pending-decisions.md](../04-operations/pending-decisions.md)
- 현재 제품 경계: [ADR-0001](decisions/ADR-0001-core-app-product-boundary.md)
- 사용자 참조 키: [user-reference-key-policy.md](user-reference-key-policy.md)
- 활성 구현 위험: [known-gaps.md](../../.agent/memory/known-gaps.md)
- 현재 물리 스키마: Flyway migration과 PostgreSQL schema validation

과거 단계별 추천안, migration 번호 계획, 완료 로그는 현재 작업 지시로 사용하지 않는다. 원문이 필요한 경우 이 파일의 Git history를 조회한다.

## 3-6. 부서직책 FK 위생 근거

`V2_32__add_deptjob_referential_fks.sql`은 당시 부서직책 관계의 orphan·참조 무결성 공백을 해소하기 위해 작성됐고, 헤더가 이 절을 근거로 참조한다. 적용된 versioned migration의 주석과 checksum은 변경하지 않는다.

현재 정합 여부는 이 tombstone의 과거 판정이 아니라 다음으로 확인한다.

1. `V2_32` 이후 전체 Flyway migration을 빈 PostgreSQL에 적용한다.
2. FK·컬럼 타입·JPA 매핑을 `schemaValidationTest`와 관련 하네스로 검증한다.
3. 추가 제품 결정이 필요하면 `pending-decisions.md`에 새 ID로 등록한다.
