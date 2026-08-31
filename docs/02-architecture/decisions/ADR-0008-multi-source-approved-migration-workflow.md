# ADR-0008 — 다중 소스 DB를 PostgreSQL 표준 스키마로 옮기는 승인형 오프라인 마이그레이션 워크플로

**Status:** Accepted

**Date:** 2026-08-31

**Deciders:** lkindo

**Supersedes:** - (`DEC-OPS-005`의 독립·선택형 offline ETL 경계를 구체화한다)

## Context

기존 `migration-tool`은 `mapping.yml`에 선택한 테이블을 읽고 PostgreSQL 표준 스키마에 적재하는 독립 CLI였다. 다만 DBMS별 객체·권한·스냅샷 의미가 다른데도 검색 결과 0건을 “실제 부재”와 “보지 못함”으로 구분할 구조가 부족했고, 검토한 소스·매핑·타깃과 실제 적재 입력을 하나의 승인 계보로 묶지 못했다.

폭넓은 레거시 DB를 다루려면 소스 제품별 inventory는 필요하지만, 현재 제품의 애플리케이션 스키마는 PostgreSQL·Flyway가 소유한다. 프로시저·패키지·트리거와 같은 실행 의미를 DBMS 사이에서 자동 번역하는 것은 데이터 이관과 다른 현대화 결정이다. 또한 벤더 JDBC 드라이버는 온라인 애플리케이션의 classpath와 신뢰 경계에 들어오지 않아야 한다.

## Decision drivers

- 요청한 DB 객체 종류가 검색 결과에서 조용히 누락되지 않아야 한다.
- 검토자가 본 inventory·mapping·target schema·실행 코드와 load 입력이 다르면 실패해야 한다.
- 타깃 애플리케이션 스키마와 온라인 API의 소유권을 침범하지 않아야 한다.
- 복합·유형·DB 생성 키와 자식 FK, 재실행 상태를 내구적으로 연결해야 한다.
- 검증하지 못한 벤더·드라이버·LOB 행동은 자동화 범위로 가장하지 않아야 한다.

## Considered options

1. **온라인 API에 범용 source→target 자동 변환기를 통합** — 상시 런타임·인가·classpath와 일회성 고위험 이관 책임이 결합되고, DBMS별 의미 차이를 숨기므로 기각했다.
2. **DBMS별 vendor 도구와 일회성 SQL을 개별 운영** — 특정 cutover에는 유용할 수 있지만 분류·승인·키 재작성·재실행 계약을 공통 자산으로 남기지 못하므로 기본 아키텍처로 선택하지 않았다.
3. **다중 source adapter + 단일 PostgreSQL target의 승인형 offline workflow** — 소스 차이를 명시적 증거로 남기고 타깃·온라인 경계를 고정할 수 있어 선택했다.

## Decision

### 1. 실행 토폴로지와 DB 방향

`migration-tool`은 `foundation`·`api-server`에 의존하지 않는 **독립 offline `bootJar`**로 유지한다. 소스 adapter는 PostgreSQL, Oracle, Tibero, MySQL, MariaDB, Microsoft SQL Server를 각각 별도 identity로 식별하고, 지원하지 않는 JDBC 제품은 보수적 generic JDBC baseline으로만 다룬다. **load target은 하나의 PostgreSQL 제품으로 고정**하며 JDBC metadata의 product name이 정확히 PostgreSQL이 아니면 중단한다. 승인 artifact를 우회하는 기존 직접 dry-run·commit 진입은 모두 차단한다.

### 2. 누락을 숨기지 않는 discovery inventory

전체 `ObjectKind` 각각은 `OBJECTS`, `PARTIAL_PROBE`, `NOT_APPLICABLE`, `UNSUPPORTED` 중 하나의 terminal route를 갖는다. 권한 부족, 미지원, 부분 수집, query 실패는 `UNREADABLE`·`UNSUPPORTED`·`PARTIAL`·`QUERY_FAILED`로 inventory에 남겨 “0건”과 구분한다. `NOT_APPLICABLE`을 제외한 visibility finding, 0건 inventory, 미분류·미검토 객체는 plan을 `commitReady=false`로 만든다. adapter ID, JDBC product/version, catalog·schema·object-kind·system-object scope는 artifact와 재실행 시 exact-match한다.

inventory는 **해당 계정과 선택 scope가 증명할 수 있는 범위**를 기록한다. DB 권한 총조사 없이 물리 소스 전체를 보았다는 보증은 아니며, 그 증거가 부족하면 실패 또는 blocking finding으로 남는다.

### 3. `discover → plan → validate → load` 승인 계보

- `discover`는 versioned canonical inventory에 source endpoint의 credential-redacted identity, 드라이버 bytes 증거, adapter/scope, 객체·visibility를 SHA-256으로 결속한다.
- `plan`은 inventory, mapping, mapping이 사용하는 실제 PostgreSQL target table·column·PK fingerprint, adapter·transformer·core 실행 bytes contract를 결속한다. 사람의 strict review YAML은 이 네 digest와 객체별 disposition에 exact binding되어야 한다.
- `validate`는 versioned plan의 `commitReady` 판정을 다시 강제한다.
- `load`는 source inventory, endpoint/driver/scope, mapping, target fingerprint, 실행 contract을 현재 환경에서 재계산하고 하나라도 다르면 쓰기 전에 중단한다.

artifact에는 JDBC URL, username, password, token·private key를 기록하지 않으며 unknown/duplicate field와 digest 불일치를 허용하지 않는다.

### 4. 타깃 스키마 소유권

현재 애플리케이션 스키마의 DDL·제약·PK 전략은 DB 헌법과 `api-server` Flyway migration이 소유한다. `migration-tool`은 승인된 mapping의 **기존 target table에 data만 load**하고 그 물리 구조를 fingerprint로 고정한다. 소스 view·routine·trigger 등은 `TARGET_OWNED`, `RECREATE_VIA_FLYWAY`, `REIMPLEMENT_IN_APP`, `EXTERNALIZE`, `EXPORT_ONLY`, `APPROVED_IGNORE`, `BLOCKED` 등으로 분류하며 소스 DDL을 애플리케이션 스키마에 자동 재생성하지 않는다.

예외적으로 도구 자신은 target DB의 전용 `migration_control` schema와 keymap·run·checkpoint·자체 Flyway history만 별도 migration location으로 소유한다. 이 control schema를 애플리케이션 업무 스키마의 대체 정본으로 사용하지 않는다.

### 5. 키·FK·재실행 상태

identity는 유형이 부여된 단일/복합 tuple이며 `PRESERVE`, `REMAP`, PostgreSQL `INSERT ... RETURNING`을 쓰는 `TARGET_GENERATED`를 명시한다. 부모 source identity→target identity keymap으로 복합 FK를 재작성한다. `migration_control`의 keymap·checkpoint는 `(run_id, source_namespace, source_table, source key)` 범위에서 유지되며 data insert와 같은 target transaction에 기록된다. 재실행 시 checkpoint checksum·target key·keymap이 없거나 다르면 조용히 덮어쓰지 않고 실패한다.

### 6. 벤더 증거와 외부 JDBC 드라이버

현재 PostgreSQL adapter의 증거 등급은 `EXPERIMENTAL`이고 스냅샷·스트리밍 전략은 `MANUAL_ONLY`다. commit은 adapter ID exact acknowledgement와 source freeze acknowledgement를 요구한다. Oracle·Tibero·MySQL·MariaDB·SQL Server adapter는 현재 `UNVERIFIED`이므로 discovery/plan 구조가 존재해도 **commit은 금지**된다.

외부 드라이버는 승인된 로컬 regular JAR만 검사·임시 복사하고 platform-parent `URLClassLoader`에서 `Driver.connect`를 직접 호출해 기본 classpath·`DriverManager`와 격리한다. JAR bytes·driver class digest를 inventory와 다시 맞추며, 현재 in-process isolated driver는 exact digest acknowledgement가 있는 dry-run만 허용하고 commit은 차단한다. JDBC `readOnly` 신호는 DB 권한 증명이 아니므로 소스 계정의 SELECT-only 권한 census는 운영 증거로 별도 필요하다.

## Consequences

### Positive

- 다양한 source 제품의 차이가 adapter identity·capability·visibility로 드러나고, 알 수 없음이 빈 inventory로 위장되지 않는다.
- 검토 후 source endpoint·driver·mapping·target schema·실행 바이트가 바뀌는 TOCTOU를 load 전에 탐지한다.
- 타깃 DDL 소유권과 온라인 애플리케이션 의존 방향이 유지된다.
- 키 재작성과 checkpoint가 타깃 data transaction과 연결되어 재실행 시 고아 FK와 중복 identity 위험을 줄인다.

### Costs and risks

- 객체 전수 disposition과 digest-bound review를 작성·보관하는 운영 비용이 생긴다. PostgreSQL 외 target은 별도 후속 ADR이 없으면 지원하지 않는다.
- visibility는 소스 계정 권한과 vendor catalog 행동에 의존한다. blocking finding을 해소하려면 독립 권한 검토와 실 DB rehearsal이 필요하다.
- target transaction은 row/chunk 단위이므로 전체 run이 하나의 atomic transaction은 아니다. commit 결과 불확정 reconciliation, 완전 rollback/cutover 자동화, 성능·운영 규모 증거는 아직 없다.
- 실행 마지막의 `MigrationReport`는 PASS 여부를 사용하지만 현재 versioned 결과 artifact로 영속화되지 않는다.
- mapping의 target schema allowlist를 별도로 기계 강제하지 않으므로 Flyway 소유 경계는 mapping/review·DB 권한과 target fingerprint로도 보완해야 한다.
- target은 `endpointId` 라벨과 schema fingerprint를 결속하지만 credential-redacted JDBC 위치나 DB instance identity는 결속하지 않는다. 같은 라벨과 동일 구조를 가진 다른 PostgreSQL로 URL이 바뀌는 경우를 별도 환경 통제로 막아야 한다.

## Non-goals

- 온라인 admin API/GUI에서 직접 실행하는 마이그레이션 서비스
- 지속 동기화, dual-write, change data capture(CDC), zero-downtime cutover 오케스트레이션
- PostgreSQL 외의 임의 target 또는 모든 source→target 조합 지원
- 소스 procedure·function·package·trigger를 PostgreSQL SQL/PL로 자동 번역
- 소스 스키마를 현재 애플리케이션 스키마로 자동 덮어쓰기

## Evidence and current limitations

이 결정은 2026-08-31 `main` HEAD `1c8f7724e`(PR #526 merge)의 소스·테스트와 대조했다.

- 실행 경계: [`MigrationWorkflowRunner`](../../../migration-tool/src/main/java/nuri/migration/MigrationWorkflowRunner.java), [`MigrationRunner`](../../../migration-tool/src/main/java/nuri/migration/MigrationRunner.java), [`migration-tool/build.gradle`](../../../migration-tool/build.gradle)
- adapter·discovery: [`SourceAdapterRegistry`](../../../migration-tool/src/main/java/nuri/migration/adapter/SourceAdapterRegistry.java), [`DiscoveryRouteMatrix`](../../../migration-tool/src/main/java/nuri/migration/adapter/DiscoveryRouteMatrix.java), [`MigrationPlanner`](../../../migration-tool/src/main/java/nuri/migration/plan/MigrationPlanner.java)
- artifact·approval: [`MigrationExecutionContract`](../../../migration-tool/src/main/java/nuri/migration/artifact/MigrationExecutionContract.java), [`WorkflowReview`](../../../migration-tool/src/main/java/nuri/migration/workflow/WorkflowReview.java), [`PostgresTargetSchemaFingerprinter`](../../../migration-tool/src/main/java/nuri/migration/postgres/PostgresTargetSchemaFingerprinter.java)
- identity·state: [`EtlExecutor`](../../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java), [`MigrationSchemaManager`](../../../migration-tool/src/main/java/nuri/migration/schema/MigrationSchemaManager.java), [`V1 control schema`](../../../migration-tool/src/main/resources/db/migration-tool/V1__create_migration_runtime_schema.sql)
- driver 격리: [`SourceJdbcEndpointFactory`](../../../migration-tool/src/main/java/nuri/migration/jdbc/SourceJdbcEndpointFactory.java), [`LocalDriverJarPolicy`](../../../migration-tool/src/main/java/nuri/migration/jdbc/LocalDriverJarPolicy.java)
- PostgreSQL target Testcontainers는 control schema와 generated composite identity/FK·resume를 검증하지만 Docker가 없으면 skip된다: [`MigrationSchemaPostgresIntegrationTest`](../../../migration-tool/src/test/java/nuri/migration/schema/MigrationSchemaPostgresIntegrationTest.java), [`EtlGeneratedIdentityPostgresIntegrationTest`](../../../migration-tool/src/test/java/nuri/migration/EtlGeneratedIdentityPostgresIntegrationTest.java)

현재 Oracle·Tibero·MySQL·MariaDB·SQL Server 어댑터 테스트는 정적 query contract·mock JDBC 중심이며, 실제 벤더 DB/version·권한·문자셋·LOB·드라이버 행동을 검증한 증거가 아니다. 더불어 현 HEAD의 [`MappingLoader.resolveDbConfig`](../../../migration-tool/src/main/java/nuri/migration/model/MappingLoader.java)는 4-argument `DbConfig`를 재생성해 YAML의 `endpointId`를 보존하지 못하는 반면 workflow는 source/target `endpointId`를 필수로 강제한다. 실제 YAML로 승인 workflow를 실행하려면 이 방해 요소를 수정하고 real-loader 회귀 테스트를 추가해야 한다. 따라서 본 ADR의 `Accepted`는 **아키텍처 결정**이지, 현 구현의 production cutover 준비 완료 판정이 아니다.

## Related decisions and standards

- [ADR-0001 — 코어/앱 제품 경계](ADR-0001-core-app-product-boundary.md)
- [`DEC-OPS-005` — 독립·선택형 offline ETL](../../../.agent/memory/decisions.md)
- [DB 표준화 헌법](../../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)
- [레거시 이관 도구 설계](../legacy-migration-tool-design.md)
