---
schema_version: 1
memory_kind: project-context
status: active
authority: derived-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-08-19
verified_against: 189c24024980bf795438ed3bc293059dd0331ceb
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
  - ../../.github/workflows/dependency-submission.yml
  - ../../.github/workflows/dependency-submission-publish.yml
  - ../../config/governance/gates.json
refresh_triggers:
  - source-change
  - dependency-or-module-change
  - release-topology-change
  - agent-entrypoint-change
---

# 공용 프로젝트 컨텍스트

## 이 문서의 권위와 읽기 순서

이 문서는 현재 프로젝트를 빠르게 복원하기 위한 **파생 인덱스**다. 규칙은 [AGENTS.md](../../AGENTS.md), 제품·아키텍처 결정은 ADR, 구현 사실은 현재 코드·설정·DB 실측이 우선한다. 충돌을 발견하면 이 문서를 `needs-revalidation`로 취급하고 원본을 먼저 고친 뒤 함께 갱신한다.

## 제품 목적과 현재 경계

eGov Enterprise는 Java 21·eGovFrame 5 기반의 재사용 가능한 엔터프라이즈 애플리케이션 뼈대다. 온라인 애플리케이션은 멀티모듈 백엔드와 Next.js 프론트엔드로 구성되고, `migration-tool`은 레거시 데이터를 옮길 때만 선택 실행하는 독립 CLI다. 상세 제품 소개와 실행법은 [README.md](../../README.md)에 있다.

## 모듈·런타임 지도

| 영역 | 역할 | 의존 방향/실행 형태 | 정본 |
|---|---|---|---|
| `foundation` | 공통 계약·보안·기반 포트 | 다른 프로젝트 모듈에 의존하지 않는 라이브러리 | [settings.gradle](../../settings.gradle), [build.gradle](../../build.gradle) |
| `business-core` | 재사용 핵심 도메인 | `foundation` 방향 | [build.gradle](../../build.gradle) |
| `business-app` | 제품별 업무 도메인 | `business-core` 방향 | [build.gradle](../../build.gradle) |
| `api-server` | REST/API 실행 진입점 | 세 라이브러리 모듈을 조립하는 `bootJar` | [api-server/build.gradle](../../api-server/build.gradle) |
| `migration-tool` | 레거시→표준 스키마 offline ETL | foundation 미의존 독립 `bootJar`; 선택 실행 | [migration-tool/build.gradle](../../migration-tool/build.gradle) |
| `frontend` | Next.js App Router UI | 별도 pnpm 애플리케이션 | [frontend/package.json](../../frontend/package.json) |

## 검증된 현재 사실

| ID | 사실 | 정본/근거 | 검증일 |
|---|---|---|---|
| CTX-001 | Gradle 포함 모듈은 `foundation`, `business-core`, `business-app`, `api-server`, `migration-tool` 5개다. | [settings.gradle](../../settings.gradle) | 2026-08-18 |
| CTX-002 | 백엔드는 Java 21, Spring Boot 3.5.16, eGovFrame 5.0.0 축이다. | [build.gradle](../../build.gradle), [version catalog](../../gradle/libs.versions.toml) | 2026-08-18 |
| CTX-003 | 루트 스크립트는 Node 22 이상과 npm lockfile을, 프런트엔드는 Node 22 이상·pnpm 9 lockfile을 사용한다. 프런트는 Next.js 16.2.12 계열·React 19.2.8 계열이다. | [package.json](../../package.json), [package-lock.json](../../package-lock.json), [frontend/package.json](../../frontend/package.json), [frontend/pnpm-lock.yaml](../../frontend/pnpm-lock.yaml), [.nvmrc](../../.nvmrc) | 2026-08-19 |
| CTX-004 | 프론트 계약 생성의 결정적 기본 경로는 `codegen:file` 뒤 `codegen:zod`이며, live `codegen:ts`는 API 서버가 필요하다. | [frontend/package.json](../../frontend/package.json), [API 문서 가이드](../../docs/03-guides/api-documentation-guide.md) | 2026-08-18 |
| CTX-005 | main 병합 목표 명세는 `backend-build`, `frontend-build`, `secret-scan`, 안정 이름의 `e2e-test`, `mutation-test` 5개 required context와 approval 1·code-owner·last-push·thread-resolution policy다. 원격 적용 여부는 `verify:ops`로 별도 실측한다. | [.github/required-checks.json](../../.github/required-checks.json), [branch verifier](../../scripts/verify-branch-protection.mjs) | 2026-08-19 |
| CTX-006 | DB 표준의 규범 SSOT는 DB 헌법이고, 물리 변경 판단은 live metadata/schema 실측을 함께 요구한다. | [DB 헌법](../knowledge/db-standard-constitution/artifacts/constitution.md), [AGENTS Evidence guardrails](../../AGENTS.md#evidence-guardrails) | 2026-08-18 |
| CTX-007 | `migration-tool`은 data와 해당 chunk/row keymap을 같은 target transaction에 묶고 batch 실패 시 행 단위로 원자 재시도하며 실패 mapping을 제거한다. commit/rollback 불확정은 fatal이지만, run 전체 원자성·source-system/run namespace·durable checkpoint/upsert·불확정 commit reconciliation·실 DB/cutover 증거가 없어 production 도구 전체는 PARTIAL 상태다. | [EtlExecutor](../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java), [KeyMapRegistry](../../migration-tool/src/main/java/nuri/migration/keymap/KeyMapRegistry.java), [atomic integration test](../../migration-tool/src/test/java/nuri/migration/EtlAtomicKeyMapIntegrationTest.java), [Atlas migration section](../../frontend/public/governance_harness_atlas.html#content-migration) | 2026-08-19 |
| CTX-008 | 중앙 gate registry가 governance JUnit 33개·ArchUnit 10개·schema-validation 37개, runner catalog 5개, execution profile 6개, quality population 3개와 ratchet 15개를 source·task·실행 tier·CI 소비자에 exact-match한다. | [gate registry](../../config/governance/gates.json), [registry contract](../../scripts/governance-gates-contract.mjs) | 2026-08-19 |
| CTX-009 | 내부 E2E 실행은 최근 성공 run의 spec 실행시간 profile로 3개 shard에 명시적 spec 집합을 균형 분배하고, 브랜치 보호에는 shard 수와 무관한 안정 context `e2e-test` 하나만 노출한다. | [duration profile](../../frontend/e2e/shard-duration-profile.json), [shard planner](../../scripts/e2e-shard-plan.mjs), [CI workflow](../../.github/workflows/ci.yml) | 2026-08-19 |
| CTX-010 | PR 의존성 검사는 read-only Gradle graph producer → checkout/run 없는 trusted `workflow_run` 제출 → 최대 600초 snapshot readiness → runtime High 이상 review 순서로 fail-closed하도록 정의돼 있다. 신규 `workflow_run`은 기본 브랜치 선반영이 필요하므로 public fork probe 전에는 live 집행 완료로 간주하지 않는다. | [producer workflow](../../.github/workflows/dependency-submission.yml), [publisher workflow](../../.github/workflows/dependency-submission-publish.yml), [readiness verifier](../../scripts/dependency-snapshot-readiness.mjs), [dependency contract](../../scripts/dependency-submission-contract.mjs) | 2026-08-19 |
| CTX-011 | 프론트 의존성 감사는 `pnpm audit --json`을 한 번 조회해 Critical 전체와 운영 의존성 High를 차단하고 개발 전용 High는 warning으로 남긴다. JSON 형식·집계 불일치와 실행/네트워크 오류는 fail-closed다. | [audit policy](../../scripts/frontend-audit-policy.mjs), [policy contract](../../scripts/frontend-audit-policy.test.mjs), [CI workflow](../../.github/workflows/ci.yml) | 2026-08-19 |
| CTX-012 | 로컬 k6 wrapper는 `K6_SCENARIO=users-<load>` 환경 계약으로 100/500/1000 시나리오를 선택하고 알 수 없는 값은 실패한다. 잘못된 `--scenario` 재도입은 저비용 운영 계약이 pre-push·CI에서 차단하지만 실제 부하 결과는 대상 환경이 필요한 별도 증거다. | [load wrapper](../../scripts/run-load-test.ps1), [scenario selector](../../test/load-tests/scenarios/load-levels.js), [command contract](../../scripts/load-test-command-contract.test.mjs) | 2026-08-19 |

## 개발·검증·배포 흐름

- 로컬 전체 개발 기동은 루트 `npm run dev`; 프론트 단독 명령은 `pnpm -C frontend ...`를 사용한다.
- 변경 범위별 최소 검증은 [AGENTS.md의 Verification by change scope](../../AGENTS.md#verification-by-change-scope)를 따른다. 비용 순서는 `verify:docs` < `verify:fast` < `verify:push` < `verify:full`이고, 서비스가 필요한 브라우저 E2E와 외부 ruleset 실측은 각각 `verify:e2e`, `verify:ops`로 명시 실행한다.
- 로컬 훅은 빠른 피드백 계층이고 우회 가능하다. 병합 권위는 [.github/required-checks.json](../../.github/required-checks.json)에 결속된 CI다.
- 재사용 base와 release 경계는 [ADR-0001](../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md)이 정본이다.

## 공유 워킹트리와 에이전트 인수인계

- Gemini, Claude Code, Codex를 포함한 모든 에이전트가 같은 디스크와 Git index를 공유할 수 있다. 변경 전 현재 상태를 읽고 자기 경로만 커밋한다.
- 프로젝트 공통 규칙은 `AGENTS.md` 한 곳에 두고, 저장소 `GEMINI.md`·`CLAUDE.md`는 이를 연결하는 얇은 어댑터로만 유지한다. 각 도구의 사용자 홈 글로벌 규칙이나 개인 세션 저장소는 다른 에이전트가 자동 상속하지 못한다.
- 사용자 글로벌 규칙은 저장소 밖의 도구별 네이티브 경로에 별도로 프로비저닝한다. 특정 PC의 파일 동기화 방식은 프로젝트 필수 설정이나 CI 계약이 아니며 저장소 clone에 자동 전파되지 않는다.
- `.gemini/tasks/`에는 활성 세션 저널을 두지 않고 기존 census·archive 지원 자산만 유지한다. Claude/Codex의 원시 세션·내부 DB, 로컬 설정과 scratch도 공용 메모리로 일괄 복사하지 않으며, 현재 코드로 재검증된 항목만 승격한다.
- 이 메모리는 실시간 작업 claim이나 lock이 아니다. 동시에 편집 중인 파일의 소유권은 `git status`, diff, 에이전트 조정 채널로 확인한다.

## 재검증 트리거

모듈 include/의존 방향, 런타임 버전, required checks, gate registry·runner selector, 의존성 감사·snapshot 신뢰 경계, load-test 실행 계약, release topology, codegen 경로, migration-tool 안전성 또는 에이전트 진입점이 바뀌면 관련 CTX 행과 `verified_at`을 같은 변경에서 갱신한다.
