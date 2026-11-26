---
schema_version: 1
memory_kind: project-context
status: active
authority: derived-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-11-26
verified_against: b4a98d72d6723bbf66a063c86ebb77d20238f025
canonical_sources:
  - ../../AGENTS.md
  - ../../GEMINI.md
  - ../../CLAUDE.md
  - ../../README.md
  - ../../settings.gradle
  - ../../build.gradle
  - ../../package.json
  - ../../frontend/package.json
  - ../../.github/required-checks.json
  - ../../config/governance/gates.json
  - ../../config/governance/permission-catalog.json
  - ../../docs/03-guides/project-composer-guide.md
  - ../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md
  - ../../docs/02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md
  - ../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md
refresh_triggers:
  - source-change
  - dependency-or-module-change
  - release-topology-change
  - agent-entrypoint-change
---

# 공용 프로젝트 컨텍스트

이 문서는 저장소 구조·스택·핵심 경계를 빠르게 복원하기 위한 **파생 인덱스**다. 규범은 [AGENTS.md](../../AGENTS.md), 아키텍처·제품 결정은 [ADR 목록](../../docs/02-architecture/decisions/README.md), 사실은 현재 코드·설정·DB 실측이 우선한다.

## 제품 목적과 현재 경계

eGov Enterprise는 Java 21·eGovFrame 5 기반 재사용 엔터프라이즈 애플리케이션 뼈대다. 온라인 앱은 멀티모듈 백엔드 + Next.js 프런트엔드이며, `migration-tool`은 레거시 DB→PostgreSQL 오프라인 ETL 전용 독립 `bootJar`다([README.md](../../README.md)).

## 모듈·런타임 지도

| 영역 | 역할 | 의존·실행 형태 | 정본 |
|---|---|---|---|
| `foundation` | 공통 계약·보안·유틸·시간대 | 타 모듈 비의존 라이브러리 | [settings.gradle](../../settings.gradle), [build.gradle](../../build.gradle) |
| `business-core` | 재사용 핵심 도메인 | `foundation` 의존 | [build.gradle](../../build.gradle) |
| `business-app` | 제품 업무 도메인 | `business-core` 의존 | [build.gradle](../../build.gradle) |
| `api-server` | REST/WebSocket `bootJar` | 위 3모듈 조립, KST 고정 | [api-server/build.gradle](../../api-server/build.gradle) |
| `migration-tool` | 오프라인 레거시 ETL `bootJar` | `foundation` 비의존 독립 실행 | [migration-tool/build.gradle](../../migration-tool/build.gradle) |
| `tools/migration-workspace` | 로컬 이관 작업공간 UI(ADR-0041) | `migration-tool` 호출 Node 22 loopback | [안내](../../docs/03-guides/migration-workspace-guide.md) |
| `frontend` | Next.js App Router UI | 별도 pnpm 9 앱 | [frontend/package.json](../../frontend/package.json) |

## 핵심 사실 (요약 인덱스)

| ID | 사실 | 정본/근거 | 검증일 |
|---|---|---|---|
| CTX-001 | Gradle 포함 5모듈(`foundation`, `business-core`, `business-app`, `api-server`, `migration-tool`) + `frontend` 구성이다. | [settings.gradle](../../settings.gradle) | 2026-11-26 |
| CTX-002 | Java 21, Spring Boot 4.1.2(Framework 7/Security 7/Hibernate 7/JUnit 6), eGovFrame 5.0.0; 온라인은 Jackson 3, `migration-tool`은 Jackson 2(`DEC-OPS-124`)다. | [version catalog](../../gradle/libs.versions.toml), [build.gradle](../../build.gradle) | 2026-11-26 |
| CTX-003 | 프런트엔드/스크립트 런타임은 Node 22+, 루트 npm, 프런트 pnpm 9, Next.js 16, React 19다. | [package.json](../../package.json), [frontend/package.json](../../frontend/package.json) | 2026-11-26 |
| CTX-004 | 프런트 API 계약은 `codegen:file` → `codegen:zod`가 정본이며, `npm run regen -- --check`(pre-push 선두)가 `api-docs.json`↔TS/Zod 드리프트를 검사한다. | [frontend/package.json](../../frontend/package.json), [verify-generated-contracts](../../scripts/verify-generated-contracts.mjs) | 2026-10-19 |
| CTX-005 | main 병합 명세는 `backend-build`, `frontend-build`, `secret-scan`, `e2e-test`, `mutation-test`, `secure-coding` 6개 required context와 `DEC-OPS-009` 단독 운영 리뷰 정책이다. CodeQL은 Java/JS High+ 차단, 원격 검증은 `verify:ops`. | [.github/required-checks.json](../../.github/required-checks.json), [branch verifier](../../scripts/verify-branch-protection.mjs) | 2026-11-26 |
| CTX-006 | DB 표준 규범은 [DB 헌법](../knowledge/db-standard-constitution/artifacts/constitution.md), 물리 판단은 `db-bridge` 실시간 메타/스키마 조회 우선(H1)이다. | [DB 헌법](../knowledge/db-standard-constitution/artifacts/constitution.md) | 2026-08-18 |
| CTX-007 | `migration-tool`은 레거시 DB→PostgreSQL 오프라인 `bootJar`(discover→plan→validate→load, chunk 롤백, `GAP-MIG-001`)이며 원천 7종 이관은 `UNVERIFIED·MANUAL_ONLY`다. | [migration-tool/build.gradle](../../migration-tool/build.gradle), [복구 런북](../../docs/04-operations/migration-recovery-runbook.md) | 2026-10-16 |
| CTX-008 | 중앙 [gates.json](../../config/governance/gates.json)이 JUnit·ArchUnit·린터·실행 tier·CI 소비자를 결속한다. | [gates.json](../../config/governance/gates.json) | 2026-11-26 |
| CTX-009 | E2E는 2개 shard(`1/2`, `2/2`)로 실행한다. PR은 검토된 화면 변경만 spec 선별하고 main은 전수다(required context `e2e-test`). | [.github/workflows/ci.yml](../../.github/workflows/ci.yml), [E2E 가이드](../../docs/03-guides/e2e-test-guide.md) | 2026-11-26 |
| CTX-010 | PR 의존성 제출·snapshot readiness(`dependency-submission*.yml`, `GAP-DEP-001`)가 dependency review를 전제한다. | [readiness](../../scripts/dependency-snapshot-readiness.mjs) | 2026-09-24 |
| CTX-015 | 인가는 복수 그룹 + 명시 OPERATION/NAVIGATION 구조(핵심 3표 + 변경이력 1표) 및 ES256 비대칭 JWT·선택적 TOTP MFA(`MFA_REQUIRE_PROTECTED`: 앱 `false`/운영 `true`)를 사용한다. | [ADR-0016](../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md), [ADR-0060](../../docs/02-architecture/decisions/ADR-0060-asymmetric-jwt-signing.md) | 2026-11-26 |
| CTX-016 | 메뉴는 4영역·최대 3단계(`config/project-composer-menus.json`, `ADR-0017`)이며 공유 OCI DB 마이그레이션 적용은 [적용 로그](../../docs/04-operations/shared-oci-migration-apply-log.md)에 기록한다. | [ADR-0017](../../docs/02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md), [메뉴 설정](../../config/project-composer-menus.json) | 2026-11-26 |
| CTX-019 | `npm run project:ui`·`project:create`·`base:verify`는 `config/modules` 기능 소유와 `config/db-vendors.json`의 `certified` 벤더(현재 PostgreSQL 단독 — 5종은 `preview`, `DEC-OPS-422`)로 멀티/단일모듈 독립 소스를 생성한다(오프라인 `migration-tool` 제외, `ADR-0062`). | [project-composer.mjs](../../scripts/project-composer.mjs), [벤더 원장](../../config/db-vendors.json), [생성기 가이드](../../docs/03-guides/project-composer-guide.md) | 2026-11-26 |
| CTX-020 | 로컬 E2E 공식 진입점은 격리 DB/프로세스를 띄우는 `npm run test:e2e:isolated`다. | [E2E 가이드](../../docs/03-guides/e2e-test-guide.md) | 2026-11-26 |
| CTX-021 | PR/main 변경 범위 분류는 `scripts/ci-change-scope.mjs` 단일 소스다. 운영 계약은 일반 PR `:core`, 생성기/`frontend/src`/`business-app/src`/스킬/`docs/README.md`/정책/미지/main은 전체 실행이며, 작업 브랜치 `pre-push`는 로컬 운영 계약을 Required CI(`secret-scan`)로 일원화한다(`DEC-OPS-434`). | [ci-change-scope.mjs](../../scripts/ci-change-scope.mjs), [run-operational-contracts.mjs](../../scripts/run-operational-contracts.mjs) | 2026-11-26 |
| CTX-025 | 모든 날짜·시각은 한국 표준시(`Asia/Seoul`), 엔티티는 한국 벽시계 `LocalDateTime`, 프런트 '오늘'도 KST다(CI 프런트 러너는 UTC, `DEC-OPS-396`). | [ServiceTime](../../foundation/src/main/java/nuri/foundation/core/util/ServiceTime.java), [DEC-OPS-396](../../docs/archived/operational-decisions-history.md#dec-ops-396) | 2026-11-01 |

## 개발·검증·배포 흐름

- 개발 기동은 루트 `npm run dev`(원격 DB Flyway 자동 적용 비활성), 프런트는 `pnpm -C frontend ...`.
- 범위별 검증은 [AGENTS.md Verification by change scope](../../AGENTS.md#verification-by-change-scope)와 [.githooks/README.md](../../.githooks/README.md), 무거운 검증 단일 실행(`heavy-run-queue`)·고정 작업 트리는 [SOP §6.3·§6.6](../../docs/03-guides/orchestration-protocol.md#63-무거운-검증은-하나씩)을 따른다.
- 도구별 진입점(`AGENTS.md`·`GEMINI.md`·`CLAUDE.md`) 및 원시 세션·실시간 claim/lock 금지 경계는 [AGENTS.md](../../AGENTS.md#공유-워킹트리와-git)가 정본이다.
