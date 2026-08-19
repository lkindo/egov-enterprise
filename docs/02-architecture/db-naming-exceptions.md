# DB 명명 표준 예외 대장

> **규범**: [DB 표준화 헌법](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md) · **기계 집행**: [`SchemaNamingLinterTest`](../../api-server/src/test/java/nuri/api/harness/SchemaNamingLinterTest.java)

이 문서는 현재 허용된 물리 객체 예외만 기록한다. 완료된 리네임·마이그레이션 순서·감사 작업 로그는 Git/Flyway 이력으로 추적하며 이 대장에 누적하지 않는다.

## 현재 예외

### 프레임워크 소유 객체

| 객체 | 종류 | 예외 | 이유 |
|---|---|---|---|
| `ecopseq`, `ids` | 테이블 | `tb_` 접두·표준 감사컬럼 | eGovFrame 레거시 호환 객체. 제거 여부는 별도 스키마 결정이다. |
| `revinfo` | 테이블 | `tb_` 접두·표준 감사컬럼 | Hibernate Envers가 소유하는 리비전 메타 객체다. |
| `revinfo_seq` | 시퀀스 | `sq_` 접두 | Envers 채번 객체다. |
| `flyway_schema_history` | 테이블 | `tb_` 접두·표준 감사컬럼 | Flyway가 소유하는 이력 장부다. |
| `flyway_schema_history_pk` | PK 제약 | `pk_` 접두 | Flyway가 이름을 소유한다. |

`ecopseq`, `ids`, `revinfo`의 레거시 감사자 컬럼 `frst_register_id`와 `last_updusr_id`는 각각 표준 `frst_rgtr_id`, `last_mdfr_id`의 예외다. 비즈니스 테이블로 예외를 확장하지 않는다.

### 메타 표준 객체

DB 표준 사전의 `meta_` 네임스페이스는 헌법이 예약한 원천 계층이다.

| 객체 | 종류 | 예외 |
|---|---|---|
| `meta_standard_words`, `meta_standard_terms`, `meta_standard_domains` | 테이블 | `tb_` 접두·표준 감사컬럼 |
| `meta_standard_domains_pkey`, `meta_standard_terms_pkey` | PK 제약 | `pk_` 접두 |
| `seq_meta_standard_domains`, `seq_meta_standard_terms` | 시퀀스 | `sq_` 접두 |

## 린터와의 동일성 계약

현재 대장은 `SchemaNamingLinterTest`의 다음 집합과 양방향으로 같아야 한다.

| 린터 집합 | 허용 항목 |
|---|---|
| `TABLE_WHITELIST` | `meta_standard_words`, `meta_standard_terms`, `meta_standard_domains`, `ecopseq`, `ids`, `revinfo`, `flyway_schema_history` |
| `SEQUENCE_WHITELIST` | `seq_meta_standard_domains`, `seq_meta_standard_terms`, `revinfo_seq` |
| `CONSTRAINT_WHITELIST` | `meta_standard_domains_pkey`, `meta_standard_terms_pkey`, `flyway_schema_history_pk` |
| `AUDIT_EXEMPT_TABLES` | `TABLE_WHITELIST`와 동일 |

예외를 추가·제거할 때는 다음을 같은 변경 세트로 처리한다.

1. 헌법상 예외 근거와 물리 객체의 현재 소유자를 확인한다.
2. 이 대장과 린터 집합을 함께 수정한다.
3. `:api-server:harnessTest`를 실행하고 의도적 위반이 red가 되는지 확인한다.
4. 예외가 사라지면 대장과 whitelist에서 제거한다. 완료 이력을 취소선 행으로 남기지 않는다.

라인 단위 `-- naming-linter:ignore`는 문법 파서의 제한처럼 해당 구문에만 적용되는 구체적 사유가 있을 때 사용한다. 일반적인 표준화 부채를 예외로 숨기는 수단으로 사용하지 않는다.

## 범위

이 대장과 린터는 Flyway 델타의 명명·고정 문자형·신규 테이블 감사컬럼을 다룬다. 전체 물리 스키마, 컬럼 의미, FK 적합성, 운영 DB 드리프트까지 보증하지 않으므로 해당 판단은 live metadata와 별도 스키마 검증을 사용한다.

---
*Verified against `SchemaNamingLinterTest` whitelist sets: 2026-08-19*
