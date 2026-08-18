---
schema_version: 1
memory_kind: project-context
status: active
authority: derived-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-08-18
verified_against: aa744fd48a232d6bda388094cca6dd2487ef8950
canonical_sources:
  - ../../AGENTS.md
  - ../../README.md
  - ../../settings.gradle
  - ../../build.gradle
  - ../../package.json
  - ../../frontend/package.json
  - ../../.github/required-checks.json
refresh_triggers:
  - source-change
  - dependency-or-module-change
  - release-topology-change
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
| CTX-003 | 루트와 프론트는 Node 22 이상·pnpm 9 축이며, 프론트는 Next.js 16.2.12 계열·React 19.2.8 계열이다. | [package.json](../../package.json), [frontend/package.json](../../frontend/package.json), [.nvmrc](../../.nvmrc) | 2026-08-18 |
| CTX-004 | 프론트 계약 생성의 결정적 기본 경로는 `codegen:file` 뒤 `codegen:zod`이며, live `codegen:ts`는 API 서버가 필요하다. | [frontend/package.json](../../frontend/package.json), [API 문서 가이드](../../docs/03-guides/api-documentation-guide.md) | 2026-08-18 |
| CTX-005 | main 병합의 저장소 required check 명세는 backend, frontend, secret-scan, E2E 3 shard, mutation 집계의 7개다. | [.github/required-checks.json](../../.github/required-checks.json) | 2026-08-18 |
| CTX-006 | DB 표준의 규범 SSOT는 DB 헌법이고, 물리 변경 판단은 live metadata/schema 실측을 함께 요구한다. | [DB 헌법](../knowledge/db-standard-constitution/artifacts/constitution.md), [AGENTS Evidence guardrails](../../AGENTS.md#evidence-guardrails) | 2026-08-18 |
| CTX-007 | `migration-tool`은 구현된 선택형 도구지만 production cutover gate로 볼 수 없는 PARTIAL 상태다. | [Atlas migration section](../../frontend/public/governance_harness_atlas.html#content-migration), [legacy migration design](../../docs/02-architecture/legacy-migration-tool-design.md) | 2026-08-18 |

## 개발·검증·배포 흐름

- 로컬 전체 개발 기동은 루트 `npm run dev`; 프론트 단독 명령은 `pnpm -C frontend ...`를 사용한다.
- 변경 범위별 최소 검증은 [AGENTS.md의 Verification by change scope](../../AGENTS.md#verification-by-change-scope)를 따른다. 전체 로컬 검증은 `npm run verify`, 원격 ruleset 실측은 `npm run verify:ops`다.
- 로컬 훅은 빠른 피드백 계층이고 우회 가능하다. 병합 권위는 [.github/required-checks.json](../../.github/required-checks.json)에 결속된 CI다.
- 재사용 base와 release 경계는 [ADR-0001](../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md)이 정본이다.

## 공유 워킹트리와 에이전트 인수인계

- Gemini, Claude Code, Codex를 포함한 모든 에이전트가 같은 디스크와 Git index를 공유할 수 있다. 변경 전 현재 상태를 읽고 자기 경로만 커밋한다.
- Gemini의 글로벌 규칙이나 각 도구의 개인 세션 저장소는 다른 에이전트가 자동 상속하지 못한다. 공통이어야 하는 규칙은 `AGENTS.md`, 지속 가능한 사실만 이 디렉터리에 둔다.
- `.gemini/tasks/`의 과거 작업 저널, Claude/Codex의 원시 세션·내부 DB, 로컬 설정과 scratch는 공용 메모리로 일괄 복사하지 않는다. 현재 코드로 재검증된 항목만 승격한다.
- 이 메모리는 실시간 작업 claim이나 lock이 아니다. 동시에 편집 중인 파일의 소유권은 `git status`, diff, 에이전트 조정 채널로 확인한다.

## 재검증 트리거

모듈 include/의존 방향, 런타임 버전, required checks, release topology, codegen 경로, migration-tool 안전성 또는 에이전트 진입점이 바뀌면 관련 CTX 행과 `verified_at`을 같은 변경에서 갱신한다.

