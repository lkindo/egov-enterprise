---
schema_version: 1
memory_kind: project-context
status: active
authority: derived-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-09-25
verified_against: a283eff2779dbdf080bd2581a8075839d398ace7
canonical_sources:
  - ../../docs/02-architecture/decisions/ADR-0023-e2e-impact-selection-and-cache-writer.md
  - ../../docs/02-architecture/decisions/ADR-0022-ci-independent-module-impact-and-cache.md
  - ../../docs/02-architecture/decisions/ADR-0021-isolated-layered-testing-process.md
  - ../../docs/03-guides/project-composer-guide.md
  - ../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md
  - ../../docs/02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md
  - ../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md
  - ../../config/governance/permission-catalog.json
  - ../../docs/02-architecture/decisions/ADR-0012-retire-blog-domain.md
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
  - ../../docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md
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
| CTX-002 | 백엔드는 Java 21, Spring Boot 4.1.1(Framework 7.0.9·Security 7.1.1·Hibernate 7.2·JUnit 6), eGovFrame 5.0.0 축이다. 온라인 앱의 JSON은 Jackson 3이며 `use-jackson2-defaults`와 파라미터 이름 감지로 Boot 3.5의 wire 규칙을 유지한다. migration-tool은 Jackson 2다(DEC-OPS-124). 테스트는 기술별 test starter를 쓴다(DEC-OPS-125). 4.1 라인의 OSS 지원은 2027-07-31까지다. | [build.gradle](../../build.gradle), [version catalog](../../gradle/libs.versions.toml), [ADR-0024](../../docs/02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md), [DEC-OPS-125](decisions.md) | 2026-09-24 |
| CTX-003 | 루트 스크립트는 Node 22 이상과 npm lockfile을, 프런트엔드는 Node 22 이상·pnpm 9 lockfile을 사용한다. 프런트는 Next.js 16.3.5 계열·React 19.3.0 계열이다. | [package.json](../../package.json), [package-lock.json](../../package-lock.json), [frontend/package.json](../../frontend/package.json), [frontend/pnpm-lock.yaml](../../frontend/pnpm-lock.yaml), [.nvmrc](../../.nvmrc) | 2026-09-21 |
| CTX-004 | 프론트 계약 생성의 결정적 기본 경로는 `codegen:file` 뒤 `codegen:zod`이며, live `codegen:ts`는 API 서버가 필요하다. | [frontend/package.json](../../frontend/package.json), [API 문서 가이드](../../docs/03-guides/api-documentation-guide.md) | 2026-08-18 |
| CTX-005 | main 병합 명세는 `backend-build`, `frontend-build`, `secret-scan`, `e2e-test`, `mutation-test`, `secure-coding` 6개 required context와 DEC-OPS-009의 단독 운영 review policy다. CodeQL SAST는 Java·JavaScript/TypeScript의 High/Critical을 차단하며, 원격 적용 상태는 대상 SHA와 `verify:ops`로 확인한다. | [.github/required-checks.json](../../.github/required-checks.json), [CI 가이드](../../docs/03-guides/cicd-pipeline.md), [branch verifier](../../scripts/verify-branch-protection.mjs) | 2026-09-09 |
| CTX-006 | DB 표준의 규범 SSOT는 DB 헌법이고, 물리 변경 판단은 live metadata/schema 실측을 함께 요구한다. | [DB 헌법](../knowledge/db-standard-constitution/artifacts/constitution.md), [AGENTS Evidence guardrails](../../AGENTS.md#evidence-guardrails) | 2026-08-18 |
| CTX-007 | `migration-tool`은 온라인 앱과 분리된 승인형 offline bootJar다. discover → plan → validate → load가 source·driver·mapping·execution contract와 target 위치·identity·schema allowlist를 결속한다. INSERT-only 엔진은 run/keymap/checkpoint와 영속 실행 artifact를 사용한다. PostgreSQL 부분 커밋과 별도 JVM 종료 후 재개·무중복·text/bytea 변조 탐지는 검증했으며, vendor별 운영 자격과 cutover 한계는 GAP-MIG-001에 둔다. | [ADR-0008](../../docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md), [TargetEndpointBinding](../../migration-tool/src/main/java/nuri/migration/artifact/TargetEndpointBinding.java), [검증 범위](../../docs/04-operations/readiness-followups.md#이관-프로세스-종료와-큰-필드), [활성 Gap](known-gaps.md) | 2026-09-10 |
| CTX-008 | 중앙 gate registry가 governance JUnit·ArchUnit·schema-validation 및 runner catalog, execution profile, quality population과 ratchet을 source·task·실행 tier·CI 소비자에 exact-match하고, 선언 root 밖의 tagged gate 도 오류로 잡는다. **CI tier binding 은 라인 존재만으로 tier 를 주장할 수 없다** — 워크플로 binding 17건이 실행 job 을 선언하고, 조건부 step 2건(schema-validation·cross-stack)은 `conditional` 을 명시하며 선언과 실제가 어긋나면 양방향 red 다. binding 매칭의 주석 제거는 소비자 파일 종류를 따른다(YAML·셸은 hash 만). 정확한 현재 수는 registry 계약 실행 출력이 정본이다. | [gate registry](../../config/governance/gates.json), [registry contract](../../scripts/governance-gates-contract.mjs) | 2026-09-10 |
| CTX-009 | E2E는 API 계약·사용자 과업·횡단 품질을 겹치지 않는 project로 실행하고 2개 shard(`1/2`, `2/2`)에 분배한다. inventory로 누락을 검사하고 재시도 통과(flaky)도 차단한다. 검토된 PR 화면 변경만 spec 단위로 선별하며 main은 전수다. 가중치는 Linux CI 35579358480의 성공한 본 테스트 시간을 합산한 실측이며 setup은 제외한다. 이전 실측 출처도 profile에 보존한다. required context는 `e2e-test`다. | [프로세스](../../docs/02-architecture/testing-process-redesign.md), [profile](../../frontend/e2e/shard-duration-profile.json), [CI](../../.github/workflows/ci.yml) | 2026-09-22 |
| CTX-010 | PR 의존성 검사는 read-only Gradle graph producer → checkout/run 없는 trusted `workflow_run` 제출 → 최대 600초 snapshot readiness → runtime High 이상 review 순서로 fail-closed하도록 정의돼 있다. 기본 브랜치에 producer/publisher가 존재하며 public fork 고위험 probe와 양쪽 snapshot 부재 경계는 GAP-DEP-001에서 별도로 추적한다. | [producer workflow](../../.github/workflows/dependency-submission.yml), [publisher workflow](../../.github/workflows/dependency-submission-publish.yml), [readiness verifier](../../scripts/dependency-snapshot-readiness.mjs), [dependency contract](../../scripts/dependency-submission-contract.mjs) | 2026-09-10 |
| CTX-011 | 프론트 의존성 감사는 `pnpm audit --json`을 한 번 조회해 Critical 전체와 운영 의존성 High를 차단하고 개발 전용 High는 warning으로 남긴다. JSON 형식·집계 불일치와 실행/네트워크 오류는 fail-closed다. | [audit policy](../../scripts/frontend-audit-policy.mjs), [policy contract](../../scripts/frontend-audit-policy.test.mjs), [CI workflow](../../.github/workflows/ci.yml) | 2026-08-19 |
| CTX-012 | 로컬 k6 wrapper는 `K6_SCENARIO=users-<load>` 환경 계약으로 100/500/1000 시나리오를 선택하고 알 수 없는 값은 실패한다. 잘못된 `--scenario` 재도입은 저비용 운영 계약이 pre-push·CI에서 차단하지만 실제 부하 결과는 대상 환경이 필요한 별도 증거다. | [load wrapper](../../scripts/run-load-test.ps1), [scenario selector](../../test/load-tests/scenarios/load-levels.js), [command contract](../../scripts/load-test-command-contract.test.mjs) | 2026-08-19 |
| CTX-013 | 블로그 도메인은 사용자 요청에 따라 제품·재사용 profile에서 제외하는 것으로 확정했다. 게시판의 블로그 계약과 비사용 물리 스키마는 새 Flyway로 제거하며, 데이터가 있는 환경은 제거가 중단된다. 과거 migration과 공유 표준 사전은 보존한다. | [ADR-0012](../../docs/02-architecture/decisions/ADR-0012-retire-blog-domain.md), [재사용 profile](../../config/reusable-base-profiles.json) | 2026-09-08 |
| CTX-014 | Atlas는 프로젝트·업무·규칙·검증·운영을 연결하는 비규범 파생 지도다. 원본은 frontend/atlas와 기존 source catalog이며 atlas:build로 정적 HTML을 생성하고 atlas:check·운영/Atlas 계약으로 드리프트를 확인한다. 생성물은 운영 실측 증거를 자동 갱신하지 않는다. | [Atlas 가이드](../../docs/03-guides/governance-atlas-guide.md), [생성기](../../scripts/build-atlas.mjs) | 2026-09-10 |
| CTX-015 | 인가는 복수 그룹과 명시 OPERATION/NAVIGATION을 사용하며 핵심 3개+변경 이력 1개다. OCI에서 구 6개 테이블 부재와 Contract 감사 1건을 재확인했다. DB 적용과 운영 앱 배포의 증거는 구분한다. | [ADR-0016](../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md), [인가 원본](../../config/governance/permission-catalog.json), [런북](../../docs/04-operations/authorization-cutover-runbook.md) | 2026-09-11 |
| CTX-016 | 전체 제품 메뉴는 나의 업무·소통·지식·참여·관리 센터의 4개 영역이며, OCI V2_100 적용 후 전체 77개·활성 71개·최대 3단계다. OPERATION과 사용자 배정은 보존하고 메뉴 선택·상위 회수를 계층 단위로 처리한다. 신규 격리 초기화는 V2_99 → Contract → latest 순서다. | [ADR-0017](../../docs/02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md), [적용 결과](../../docs/04-operations/authorization-cutover-runbook.md#2026-09-11-oci-메뉴-재편-적용-결과) | 2026-09-11 |
| CTX-017 | URL·route·UI quality·KRDS·화면 용어와 E2E duration의 일반 최신성은 기술 판정과 분리하고 실제 시계 보고에서 추적한다. 기관 온라인/독립 이관 승인은 제품·환경·소스·실행 artifact·근거·UTC 유효기간에 결속한다. 기본 pending과 기술 검증 통과는 기관 운영 승인이 아니며 실제 실행 진입점이 기술 검사 전후 원장을 확인한다. | [ADR-0018](../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md), [검토 수명 가이드](../../docs/03-guides/governance-review-lifecycle.md), [기관 실행 검증](../../scripts/adoption-execute.mjs) | 2026-09-14 |
| CTX-018 | 재사용 생성물은 preset pack 또는 custom 도메인 소유권에서 하네스·UI 원장 모집단을 도출하고 snapshot·소스·승계 selector·lock 무결성을 검사한다. 공용 메모리의 원본 운영 사실은 upstream 이력으로 보존하며 현재 기관 사실로 승격하지 않는다. 온라인·이관 승인은 각각 새 pending으로 시작한다. | [생성 가이드](../../docs/03-guides/reusable-base-guide.md), [원장 투영](../../scripts/reusable-governance-projection.mjs), [산출물 무결성](../../scripts/reusable-governance-integrity.mjs), [적용범위 계약](../../config/governance/reusable-review-scopes.json) | 2026-09-20 |
| CTX-019 | `npm run project:ui`는 별도 loopback 3100 생성기를 실행한다. Foundation/Core에 20개 업무 도메인을 선택하고 PostgreSQL·멀티모듈/단일모듈 독립 소스를 구성한다. UI/CLI는 같은 엔진을 쓰며 각 산출물은 전체 기술 검증 후 완료된다. | [생성기 가이드](../../docs/03-guides/project-composer-guide.md), [공통 엔진](../../scripts/project-composer.mjs) | 2026-09-20 |
| CTX-020 | 로컬 E2E의 공식 진입점은 `npm run test:e2e:isolated`다. 새 일회용 DB와 소유한 앱 프로세스를 만들고 인증·fixture·cleanup 전에 owner attestation을 검사한다. 개발 `.env`나 공유 DB를 재사용하지 않는다. | [runner](../../scripts/run-isolated-e2e.mjs), [격리 검사](../../scripts/e2e-isolation.mjs), [실행 가이드](../../docs/03-guides/e2e-test-guide.md) | 2026-09-21 |
| CTX-021 | PR·main push는 같은 영향 분류로 온라인 4모듈과 독립 이관의 build/PIT를 선택한다. 공용 Gradle·ID 계약은 양쪽, 미지·빈 비교는 전수다. 각 커버리지 85/70·required 6개·CodeQL 양언어를 유지한다. E2E 선택과 단일 캐시 writer는 ADR-0023을 따른다. Gradle action은 v6.3.0 SHA와 basic provider를 명시하며 성능 효과는 실행별 증거로 판단한다. | [ADR-0023](../../docs/02-architecture/decisions/ADR-0023-e2e-impact-selection-and-cache-writer.md), [분류기](../../scripts/ci-change-scope.mjs), [선별·캐시 검증](../../docs/02-architecture/testing-process-redesign.md#95-pr-spec-선별과-단일-cache-writer-검증) | 2026-09-22 |
| CTX-022 | 템플릿 생성은 INSERT 전용, 회원 승인·반려·탈퇴는 행 잠금 후 상태를 판정한다. 첨부 실물 삭제는 DB 커밋 뒤 수행하며 잔여 고아 후보는 무결성 점검 대상이다. 메모 수정·삭제 힌트, 통계 날짜 경계, 대시보드 게시글 수의 날짜 의미와 두 집계의 가용 여부는 도메인 회귀로 검증한다. | [정합성·검증 경계](../../docs/04-operations/readiness-followups.md#도메인-정합성-보강-2026-09-25) | 2026-09-25 |

## 개발·검증·배포 흐름

- 로컬 전체 개발 기동은 루트 `npm run dev`; 프론트 단독 명령은 `pnpm -C frontend ...`를 사용한다.
- 변경 범위별 최소 검증은 [AGENTS.md의 Verification by change scope](../../AGENTS.md#verification-by-change-scope)를 따른다. 비용 순서는 `verify:docs` < `verify:fast` < `verify:push` < `verify:full`이고, 서비스가 필요한 브라우저 E2E와 외부 ruleset 실측은 각각 `verify:e2e`, `verify:ops`로 명시 실행한다.
- 로컬 훅은 빠른 피드백 계층이고 우회 가능하다. 병합 권위는 [.github/required-checks.json](../../.github/required-checks.json)에 결속된 CI다.
- 재사용 base와 release 경계는 [ADR-0001](../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md)이 정본이다.
- `npm run base:verify -- --profile core`는 새 격리 DB·소스에서 해당 프로필의 계약·Java·스키마·프런트를 검사한다. CI는 core·collaboration·demo 결과를 required `backend-build`에 집계한다. 생성물의 `verify`와 운영 계약은 산출물 runner를 사용하고, 원본 회귀 테스트는 생산 저장소에서 유지한다. 기술 결과와 실제 기관 시나리오·운영 승인을 구분한다.

## 공유 워킹트리와 에이전트 인수인계

- Gemini, Claude Code, Codex를 포함한 모든 에이전트가 같은 디스크와 Git index를 공유할 수 있다. 변경 전 현재 상태를 읽고 자기 경로만 커밋한다.
- 프로젝트 공통 규칙은 `AGENTS.md` 한 곳에 두고, 저장소 `GEMINI.md`·`CLAUDE.md`는 이를 연결하는 얇은 어댑터로만 유지한다. 각 도구의 사용자 홈 글로벌 규칙이나 개인 세션 저장소는 다른 에이전트가 자동 상속하지 못한다.
- 사용자 글로벌 규칙은 저장소 밖의 도구별 네이티브 경로에 별도로 프로비저닝한다. 특정 PC의 파일 동기화 방식은 프로젝트 필수 설정이나 CI 계약이 아니며 저장소 clone에 자동 전파되지 않는다.
- `.gemini/tasks/`에는 활성 세션 저널을 두지 않고 기존 census·archive 지원 자산만 유지한다. Claude/Codex의 원시 세션·내부 DB, 로컬 설정과 scratch도 공용 메모리로 일괄 복사하지 않으며, 현재 코드로 재검증된 항목만 승격한다.
- 이 메모리는 실시간 작업 claim이나 lock이 아니다. 동시에 편집 중인 파일의 소유권은 `git status`, diff, 에이전트 조정 채널로 확인한다.

## 재검증 트리거

모듈 include/의존 방향, 런타임 버전, required checks, gate registry·runner selector, 의존성 감사·snapshot 신뢰 경계, load-test 실행 계약, release topology, codegen 경로, migration-tool 안전성 또는 에이전트 진입점이 바뀌면 관련 CTX 행과 `verified_at`을 같은 변경에서 갱신한다.
