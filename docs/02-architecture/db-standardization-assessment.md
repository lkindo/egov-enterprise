# DB 표준화 진단 — 비정본 tombstone

> **상태: Superseded / 경로 유지** — 이 경로는 적용된 Flyway migration의 immutable 주석이 참조하므로 삭제하지 않는다. 과거 점수·행 수·완료 로그는 현재 스키마의 증거가 아니며 Git 이력에서만 조회한다.

## 현재 판단에 사용할 정본

- 규범: [DB 표준화 헌법](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)
- 명명 예외: [DB 명명 예외 대장](db-naming-exceptions.md)
- 실무 절차: [DB 표준화 매뉴얼](../03-guides/db-standardization-manual.md)
- 물리 상태: 대상 DB의 `meta_standard_*`, `information_schema`, 현재 Flyway migration
- 회귀 증거: `schemaValidationTest`, schema-validation write-smoke, 관련 DB 하네스

## 3. Immutable migration이 보존하는 진단 근거

다음 versioned migration의 헤더가 이 문서 경로를 참조한다. 적용된 migration은 checksum 때문에 주석만 고쳐 쓰지 않는다.

| Migration | 당시 진단에서 가져간 조치 | 현재 검증 위치 |
|---|---|---|
| `V2_12__cleanup_orphan_refs_add_user_fks.sql` | orphan 정리 후 사용자 참조 FK 보강 | migration SQL, PostgreSQL schema validation |
| `V2_14__add_referential_fks_batch2.sql` | 관계군별 FK 보강 | migration SQL, FK/schema 하네스 |
| `V2_15__normalize_meta_standard_dictionary.sql` | 메타 표준 사전 구조 정규화 | migration SQL, live `meta_standard_*` 조회 |
| `V2_16__drop_orphans_align_cross_types.sql` | orphan 제거와 참조 타입 정렬 | migration SQL, schema validation |

이 표는 migration의 역사적 동기를 보존할 뿐, 현재 DB가 완전히 표준화됐다는 선언이 아니다.

## 4. P1 — 관계군별 FK 보강 근거

`V2_14__add_referential_fks_batch2.sql`이 참조하는 “§4 P1”은 관계군별 orphan·타입 정합을 먼저 확인한 뒤 FK를 추가하는 조치를 뜻한다. 현재 FK 존재와 유효성은 이 과거 판정이 아니라 migration SQL과 PostgreSQL schema validation으로 확인한다.

## 5. 현재 검증 원칙

1. live metadata를 read-only로 조회하고 현재 Flyway 정의와 대조한다.
2. Entity·DTO·OpenAPI/Zod 정합은 각 전용 gate의 실제 범위를 구분한다.
3. 예외는 이름·사유·종료 조건·write-smoke를 구조화해 등록한다.
4. 과거 종합 점수나 수동 census를 현재 상태로 재사용하지 않는다.

원래 진단 전문이 필요한 경우 이 파일의 Git history를 조회한다.
