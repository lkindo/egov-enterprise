# ADR-0062 — 모든 생성 애플리케이션 프로젝트에서 오프라인 이관 도구를 제외하고 원본 독립 `migration:export` 로 분리한다

- 상태: Accepted
- 결정일: 2026-11-23
- 승인: 2026-11-23 사용자가 프로젝트 경량화 권고안(A-A-A)의 Phase 4 로 모든 생성 프로젝트에서 오프라인 이관 도구를 제외하고 독립 이관 제품 내보내기(`npm run migration:export`)는 원본 저장소에 유지하도록 승인했다.
- 후속 결정: 「유지」의 `tools/migration-workspace*` 와 결정의 제외 대상 가운데 정적 시안(`tools/migration-workspace-prototype`)은 [DEC-OPS-426](../../archived/operational-decisions-history.md#dec-ops-426)이 원본에서 걷었다. 이 ADR 의 결정은 바뀌지 않으며, 제외 대상의 현재 목록과 수는 [이관 제거 원장](../../../config/governance/migration-removed-assets.json)이 정본이다. 아래 본문은 당시 승인 기록이다.
- 대체: [ADR-0020](ADR-0020-selectable-reusable-backend-layouts.md) 결정 6 의 생성 프로젝트 내 `migration-tool`·`migrationBootJar`·`migrationTest` 보존 부분, [DEC-OPS-263](../../archived/operational-decisions-history.md#dec-ops-263) 의 생성물 루트 `db_columns.json` 재작성 및 스키마 대조 요구.
- 유지:
  - 원본 저장소의 `migration-tool` 모듈, `tools/migration-workspace*`, 루트 `db_columns.json`, `migration-scope`·`migration-tool.yml` CI 검증.
  - 원본 저장소의 `npm run migration:export`(`scripts/generate-migration-product.mjs`) 독립 이관 제품 내보내기 경로 및 [ADR-0008](ADR-0008-multi-source-approved-migration-workflow.md)·[ADR-0029](ADR-0029-legacy-standardization-migration.md)·[ADR-0031](ADR-0031-migration-ledger-confirmation-followup.md)·[ADR-0041](ADR-0041-local-migration-workspace-and-ai.md) 승인·실행 경계.
  - 온라인 애플리케이션의 Flyway 스키마 소유·`schemaValidationTest` Hibernate `ddl-auto: validate` 및 ZDM 린터.
- 관련: [이관 제외 원장](../../../config/governance/migration-removed-assets.json), [제외 규칙 헬퍼](../../../scripts/reusable-product-assets.mjs), [레이아웃 판정](../../../scripts/reusable-layout.mjs), [소스 생성기](../../../scripts/generate-reusable-base-source.mjs), [런타임 어댑터](../../../scripts/reusable-layout-runtime.mjs), [스키마 검증 시험](../../../api-server/src/test/java/nuri/api/schema/SchemaValidationIntegrationTest.java), [재사용 Base 가이드](../../03-guides/reusable-base-guide.md)

## 맥락

Phase 1~3 경량화로 프로젝트 생성기 UI, 생산자 전용 도구, 로컬 요구사항 스튜디오를 생성 애플리케이션 프로젝트에서 제외했다. 그러나 PostgreSQL 대상 생성 애플리케이션 프로젝트에는 여전히 `migration-tool/`, `tools/migration-workspace*`, `db_columns.json`, 이관 계약 시험과 `verify:migration` 이 포함돼 있었다.

실제 도입 구조에서 데이터 이관 도구는 레거시 원천 DB 를 읽어 Flyway 표준 스키마로 일회 적재한 뒤 종료하는 독립 오프라인 도구이며, 이미 원본 저장소에 독립 내보내기 경로(`npm run migration:export`, `scripts/generate-migration-product.mjs`)가 분리돼 있다. 신규 프로젝트의 애플리케이션 코드베이스에 오프라인 ETL 모듈과 작업공간 도구를 복제해 둘 필요가 없고, 비-PostgreSQL 벤더 생성물은 이미 ADR-0047 에서 `migration-tool` 을 제외하고 있었다.

## 결정

1. **모든 생성 애플리케이션 프로젝트에서 오프라인 이관 도구를 제외한다.**
   - 제거 대상 자산·별칭·게이트 원장을 [migration-removed-assets.json](../../../config/governance/migration-removed-assets.json) 에 두고, 규칙 `'offline-migration-tool'` 로 PostgreSQL·벤더 및 `multi-module`·`single-module` 모든 생성 프로젝트에 일괄 적용한다.
   - 제외 대상은 `migration-tool/`, `tools/migration-workspace`, `tools/migration-workspace-prototype`, `db_columns.json`, `config/governance/migration-adoption-review.json`, `config/governance/migration-execution.example.json`, `config/migration-test-duration-profile.json`, `scripts/generate-migration-product.mjs`, `scripts/migration-profile-provenance.mjs`, `scripts/migration-test-shard.mjs`, `scripts/reusable-migration-catalog.mjs` 와 관련 npm 스크립트(`migration:*`, `review:*:migration`, `test:migration-workspace`, `verify:migration`)·시험 15건이다.
   - 기존 `vendor-removed-assets.json` 과 `config/db-vendors.json` 의 중복 이관 도구 항목은 제거하여 5개 제거 원장 간 상호 배타(disjointness)를 유지한다.
   - `settings.gradle` 의 `include 'migration-tool'` 과 `api-server/Dockerfile` 의 `COPY migration-tool/build.gradle` 은 모든 생성 프로젝트에서 제거하고, 단일모듈은 `migration: false` 로 생성한다.
2. **생성 프로젝트의 런타임·거버넌스·스키마·하네스 경계를 정합화한다.**
   - `hasMigrationTool(lock)` 을 [reusable-layout.mjs](../../../scripts/reusable-layout.mjs) 단일 술어로 통일하고, 신규 생성 애플리케이션 프로젝트의 `reusable-base-lock.json` 에 `migrationTool: false` 를 명시하며(`migrationTool`/`offline-migration-tool` 규칙이 모두 없는 Phase 4 이전 PostgreSQL lock 은 하위 호환으로 유지) 이관 승인 원장(`migrationEnvironmentReview`, `migration-adoption-review.json`)과 `verify:migration` 별칭을 두지 않는다.
   - UI 기준선 빌드(`ui-quality-baseline-core.mjs`·`ui-quality-baseline-build.mjs`)에서는 생성 시 `migration-tool/build.gradle` 필수 입력 및 Docker 아카이브 경로만 제거해 생성물 UI 기준선 검증과 `test:e2e:enterprise-task-lab` 이 정상 동작하게 한다.
   - [SchemaValidationIntegrationTest.java](../../../api-server/src/test/java/nuri/api/schema/SchemaValidationIntegrationTest.java) 는 `reusable-base-lock.json` 이 있고 `migration-tool/` 이 없는 생성 프로젝트에서 `db_columns.json` 부재를 확인하고 카탈로그 대조를 생략한다. 원본 저장소에서는 종전대로 `db_columns.json` 과 live `information_schema` 일치를 강제한다(fail-closed).
   - [harness-baseline-manifest.mjs](../../../scripts/harness-baseline-manifest.mjs) 는 `reusable-base-lock.json` 과 제거 원장(`migration-removed-assets.json`)이 함께 있는 생성 프로젝트에서만 `migration-tool/src/test/java` 스캔 루트 부재를 허용하며, 원본 저장소나 원장 누락 상태에서는 실패한다.
   - 야간 검증 계획([reusable-nightly.mjs](../../../scripts/reusable-nightly.mjs))은 생성 프로젝트에서 `migrationTest`·`:migration-tool:test` 를 기대하거나 실행하지 않는다.
3. **원본 저장소의 독립 이관 제품 경로와 대상 카탈로그 전달을 유지한다.**
   - 원본 저장소의 `migration-tool` 빌드·테스트·CI(`migration-tool.yml`, `migration-scope`, `mutationMigrationTool`)는 변경하지 않는다.
   - `npm run migration:export`([generate-migration-product.mjs](../../../scripts/generate-migration-product.mjs))는 기본으로 원본 `db_columns.json` 을 싣고, `--db-bundle <경로>` 전달 시 해당 DB 번들의 `schema-contract.json` 으로 투영한 `db_columns.json` 을 생성한다. 이미 내보낸 독립 이관 제품은 `node scripts/reusable-migration-catalog.mjs --db-bundle <경로> --output <외부경로>` 로 생성 앱 밖에 카탈로그를 만든 뒤 `java -Dmigration.db-columns-path=<외부경로> -jar <JAR> ...` 로 지정한다.

## 검토한 대안과 영향

- **PostgreSQL 생성물에만 `migration-tool` 잔존(종전 상태)**: 비-PostgreSQL 생성물과 이중 분기가 남고, 생성 앱에 ETL·작업공간 자산이 불필요하게 남는다. 채택하지 않았다.
- **`migration-tool` 코드만 빼고 `db_columns.json` 은 유지**: 소비자가 없는 스냅샷 카탈로그가 남아 불필요한 동기화·검증 비용을 유발한다. `db_columns.json` 도 함께 제외하고 원본 저장소에서만 유지·검증한다.

## 검증과 후속 범위

- 원본 운영 계약(`project-composer-vendor.test.mjs` 의 5개 원장 상호 배타 및 PostgreSQL·벤더 양쪽 누출 검사, `reusable-artifact-entrypoints-contract.test.mjs`, `reusable-layout-runtime.test.mjs`, `reusable-governance-projection.test.mjs`, `migration-product-contract.test.mjs`, `shared-memory-contract.test.mjs`) 통과.
- 원본 PostgreSQL 스키마 검증(`SchemaValidationIntegrationTest`)과 실제 격리 Docker 기반 생성물 검증(`verify-reusable-base.mjs` `multi-module`·`single-module` 양쪽)에서 `migration-tool/`·`db_columns.json` 부재 및 `npm run verify` 전체 통과 확인.
