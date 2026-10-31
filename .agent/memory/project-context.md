---
schema_version: 1
memory_kind: project-context
status: active
authority: derived-index
scope: repository
sensitivity: public-repo-safe
verified_at: 2026-10-27
verified_against: e83d0e69569eebc551403d7113ad64041eb596e0
canonical_sources:
  - ../../docs/02-architecture/decisions/ADR-0032-migration-pit-two-slots.md
  - ../../docs/02-architecture/decisions/ADR-0030-reusable-ci-selection-followup.md
  - ../../docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md
  - ../../docs/02-architecture/decisions/ADR-0026-ci-critical-path-and-reusable-impact.md
  - ../../docs/02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md
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

`verified_at`·`verified_against`는 인덱스 구조·참조를 점검한 날짜와 작업 시작 커밋이다. 2026-10-17 정리는 과거 승인·DB·CI·운영 실측을 재실행한 것이 아니며, 각 행의 시행일·검증일과 증거 경계는 그대로다.

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
| `tools/migration-workspace` | 로컬 이관 작업공간(ADR-0041) | Node 22 loopback 실행기가 `migration-tool` JAR를 자식 프로세스로 호출; 온라인 앱 밖 선택 실행 | [실행 안내](../../docs/03-guides/migration-workspace-guide.md) |
| `frontend` | Next.js App Router UI | 별도 pnpm 애플리케이션 | [frontend/package.json](../../frontend/package.json) |

## 검증된 현재 사실

| ID | 사실 | 정본/근거 | 검증일 |
|---|---|---|---|
| CTX-001 | Gradle 포함 모듈은 `foundation`, `business-core`, `business-app`, `api-server`, `migration-tool` 5개다. | [settings.gradle](../../settings.gradle) | 2026-08-18 |
| CTX-002 | 백엔드는 Java 21, Spring Boot 4.1.2(Framework 7.0.10·Security 7.1.2·Hibernate 7.4·JUnit 6), eGovFrame 5.0.0 축이다. 온라인 앱의 JSON은 Jackson 3이며 `use-jackson2-defaults`와 파라미터 이름 감지로 Boot 3.5의 wire 규칙을 유지한다. migration-tool은 Jackson 2다(DEC-OPS-124). 테스트는 기술별 test starter를 쓴다(DEC-OPS-125). 4.1 라인의 OSS 지원은 2027-07-31까지다. | [build.gradle](../../build.gradle), [version catalog](../../gradle/libs.versions.toml), [ADR-0024](../../docs/02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md), [DEC-OPS-125](../../docs/04-operations/operational-decisions-index-ci-governance.md) | 2026-10-29 |
| CTX-003 | 루트 스크립트는 Node 22 이상과 npm lockfile을, 프런트엔드는 Node 22 이상·pnpm 9 lockfile을 사용한다. 프런트는 Next.js 16.4.3 계열·React 19.3.1 계열이다. | [package.json](../../package.json), [package-lock.json](../../package-lock.json), [frontend/package.json](../../frontend/package.json), [frontend/pnpm-lock.yaml](../../frontend/pnpm-lock.yaml), [.nvmrc](../../.nvmrc) | 2026-10-29 |
| CTX-004 | 프론트 계약 생성의 결정적 기본 경로는 `codegen:file` 뒤 `codegen:zod`이며, live `codegen:ts`는 API 서버가 필요하다. 드리프트 검증(`codegen:verify`·`:zod`)은 index의 스펙으로 임시 디렉터리에서 다시 만들어 index 생성물과 비교하고, 작업 트리가 다르면 작업 트리 쌍도 비교하며 작업 파일·index를 쓰지 않는다(DEC-OPS-335). zod·operations 는 진입 파일 옆 같은 이름 폴더에 API 태그 묶음 모듈로 나뉘며 검증도 묶음 모듈까지 비교한다(2026-10-19, 공용 JS 축소). | [frontend/package.json](../../frontend/package.json), [API 문서 가이드](../../docs/03-guides/api-documentation-guide.md), [검증 스크립트](../../scripts/verify-generated-contracts.mjs) | 2026-10-19 |
| CTX-005 | main 병합 명세는 `backend-build`, `frontend-build`, `secret-scan`, `e2e-test`, `mutation-test`, `secure-coding` 6개 required context와 DEC-OPS-009의 단독 운영 review policy다. CodeQL SAST는 Java·JavaScript/TypeScript의 High/Critical을 차단하며, 원격 적용 상태는 대상 SHA와 `verify:ops`로 확인한다. | [.github/required-checks.json](../../.github/required-checks.json), [CI 가이드](../../docs/03-guides/cicd-pipeline.md), [branch verifier](../../scripts/verify-branch-protection.mjs) | 2026-09-09 |
| CTX-006 | DB 표준의 규범 SSOT는 DB 헌법이고, 물리 변경 판단은 live metadata/schema 실측을 함께 요구한다. | [DB 헌법](../knowledge/db-standard-constitution/artifacts/constitution.md), [AGENTS Evidence guardrails](../../AGENTS.md#evidence-guardrails) | 2026-08-18 |
| CTX-007 | `migration-tool`은 온라인과 분리된 승인형 offline bootJar다. discover→plan→validate→load가 source·driver·mapping·실행 계약·target을 묶는다. mapping은 검토한 원장에서 만들어 live 계약·사전과 대조하고 주민번호는 온라인 암호문으로 쓴다. 행 실패는 chunk를 되돌리고 승인 행만 격리한다. 덤프·격리 키는 `--archive-dir`에 쓴다. load는 집계·제약·공통코드 대사를 지나야 PASS다. PostgreSQL 재개·무중복은 검증했고 vendor 자격·cutover는 GAP-MIG-001이다. | [ADR-0008](../../docs/02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md), [ADR-0031](../../docs/02-architecture/decisions/ADR-0031-migration-ledger-confirmation-followup.md), [설계](../../docs/02-architecture/legacy-migration-tool-design.md), [검증 범위](../../docs/04-operations/readiness-followups.md#이관-프로세스-종료와-큰-필드) | 2026-10-16 |
| CTX-008 | 중앙 gate registry가 governance JUnit·ArchUnit·schema-validation 및 runner catalog, execution profile, quality population과 ratchet을 source·task·실행 tier·CI 소비자에 exact-match하고, 선언 root 밖의 tagged gate 도 오류로 잡는다. **tier binding 은 라인 존재만으로 tier 를 주장할 수 없다** — 워크플로 binding 은 실행 job 을, `scripts/verify.mjs` binding 은 tier 가 뜻하는 범위 분기(local-full=`full`, local-e2e=`e2e`)에서 호출로 닿는 줄을 요구하고, 조건 안이면 `conditional` 을 명시하며 어긋나면 양방향 red 다(DEC-OPS-338). binding 매칭의 주석 제거는 소비자 파일 종류를 따른다(YAML·셸은 hash 만). 현재 수는 registry 계약 실행 출력이 정본이다. | [gate registry](../../config/governance/gates.json), [registry contract](../../scripts/governance-gates-contract.mjs) | 2026-10-17 |
| CTX-009 | E2E는 API 계약·사용자 과업·횡단 품질을 겹치지 않는 project로 실행하고 2개 shard(`1/2`, `2/2`)에 분배한다. inventory로 누락을 검사하고 재시도 통과(flaky)도 차단한다. 검토된 PR 화면 변경만 spec 단위로 선별하며 main은 전수다. 가중치는 profile 에 적힌 Linux CI 실측(성공한 본 테스트 시간 합, setup 제외)이며 이전 실측 출처도 profile 에 있다. required context는 `e2e-test`다. | [프로세스](../../docs/02-architecture/testing-process-redesign.md), [profile](../../frontend/e2e/shard-duration-profile.json), [CI](../../.github/workflows/ci.yml) | 2026-09-22 |
| CTX-010 | PR 의존성 검사는 read-only Gradle graph producer → checkout/run 없는 trusted `workflow_run` 제출 → 최대 600초 snapshot readiness → runtime High 이상 review 순서로 fail-closed하도록 정의돼 있다. 기본 브랜치에 producer/publisher가 존재하며 public fork 고위험 probe와 양쪽 snapshot 부재 경계는 GAP-DEP-001에서 별도로 추적한다. | [producer workflow](../../.github/workflows/dependency-submission.yml), [publisher workflow](../../.github/workflows/dependency-submission-publish.yml), [readiness verifier](../../scripts/dependency-snapshot-readiness.mjs), [dependency contract](../../scripts/dependency-submission-contract.mjs) | 2026-09-10 |
| CTX-011 | 프론트 의존성 감사는 `pnpm audit --json` 전체와 `--prod` 운영 보고서를 조회해 Critical 전체와 운영 의존성 High를 차단하고 개발 전용 High는 warning으로 남긴다. 운영 여부는 `--prod` 보고서로 정한다(pnpm 9 finding 에는 dev 표시가 없다). JSON 형식·집계(취약 버전 단위) 불일치와 실행/네트워크 오류는 fail-closed다. | [audit policy](../../scripts/frontend-audit-policy.mjs), [policy contract](../../scripts/frontend-audit-policy.test.mjs), [CI workflow](../../.github/workflows/ci.yml) | 2026-10-31 |
| CTX-012 | 로컬 k6 wrapper는 `K6_SCENARIO=users-<load>` 환경 계약으로 100/500/1000 시나리오를 선택하고 알 수 없는 값은 실패한다. 잘못된 `--scenario` 재도입은 저비용 운영 계약이 pre-push·CI에서 차단하지만 실제 부하 결과는 대상 환경이 필요한 별도 증거다. | [load wrapper](../../scripts/run-load-test.ps1), [scenario selector](../../test/load-tests/scenarios/load-levels.js), [command contract](../../scripts/load-test-command-contract.test.mjs) | 2026-08-19 |
| CTX-013 | 블로그 도메인은 사용자 요청에 따라 제품·재사용 profile에서 제외하는 것으로 확정했다. 게시판의 블로그 계약과 비사용 물리 스키마는 V2_89(쓰기 차단)·V2_90(제거)으로 걷었고, 블로그 데이터나 참조가 있는 환경에서는 V2_90이 중단된다. 과거 migration과 공유 표준 사전은 보존한다. | [ADR-0012](../../docs/02-architecture/decisions/ADR-0012-retire-blog-domain.md), [V2_90](../../api-server/src/main/resources/db/migration/V2_90__retire_blog_domain.sql), [재사용 profile](../../config/modules/presets.json) | 2026-10-17 |
| CTX-014 | Atlas는 프로젝트·업무·규칙·검증·운영을 연결하는 비규범 파생 지도다. 원본은 frontend/atlas와 기존 source catalog이며 atlas:build로 정적 HTML을 생성한다. 입력과 HTML의 신선도는 생성물 계약이 단독으로 보고, Atlas 계약은 HTML에 실린 catalog로 렌더·상호작용을 대조한다(DEC-OPS-335). catalog는 읽은 원본의 경로만 싣고 파일별 내용 해시는 싣지 않아, catalog 사실을 바꾸지 않는 소스 수정은 재생성을 요구하지 않는다. 생성물은 운영 실측 증거를 자동 갱신하지 않는다. | [Atlas 가이드](../../docs/03-guides/governance-atlas-guide.md), [생성기](../../scripts/build-atlas.mjs), [생성물 계약](../../scripts/atlas-generation.test.mjs) | 2026-10-19 |
| CTX-015 | 인가는 복수 그룹과 명시 OPERATION/NAVIGATION을 사용하며 핵심 3개+변경 이력 1개다. OCI에서 구 6개 테이블 부재와 Contract 감사 1건을 재확인했다. DB 적용과 운영 앱 배포의 증거는 구분한다. | [ADR-0016](../../docs/02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md), [인가 원본](../../config/governance/permission-catalog.json), [런북](../../docs/04-operations/authorization-cutover-runbook.md) | 2026-09-11 |
| CTX-016 | 전체 제품 메뉴는 나의 업무·소통·지식·참여·관리 센터의 4개 영역이며 최대 3단계다. 메뉴 행·그룹별 표시의 수는 [메뉴 스냅숏](../../config/project-composer-menus.json)이, 공유 OCI에 적용한 마이그레이션은 [적용 로그](../../docs/04-operations/shared-oci-migration-apply-log.md)가 정본이다. OPERATION과 사용자 배정은 보존하고 메뉴 선택·상위 회수를 계층 단위로 처리한다. 신규 격리 초기화는 V2_99 → Contract → latest 순서다. | [ADR-0017](../../docs/02-architecture/decisions/ADR-0017-task-oriented-menu-navigation.md), [적용 결과](../../docs/04-operations/authorization-cutover-runbook.md#2026-09-11-oci-메뉴-재편-적용-결과) | 2026-10-19 |
| CTX-017 | URL·route·UI quality·KRDS·화면 용어와 E2E duration의 일반 최신성은 기술 판정과 분리하고 실제 시계 보고에서 추적한다. 기관 온라인/독립 이관 승인은 제품·환경·소스·실행 artifact·근거·UTC 유효기간에 결속한다. 기본 pending과 기술 검증 통과는 기관 운영 승인이 아니며 실제 실행 진입점이 기술 검사 전후 원장을 확인한다. | [ADR-0018](../../docs/02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md), [검토 수명 가이드](../../docs/03-guides/governance-review-lifecycle.md), [기관 실행 검증](../../scripts/adoption-execute.mjs) | 2026-09-14 |
| CTX-018 | 재사용 생성물은 시작 구성과 직접 선택 모두 기능 소유(`config/modules`)와 해석된 구성에서 하네스·UI 원장 모집단을 도출하고(pack 축 없음, DEC-OPS-289~291) snapshot·소스·승계 selector·lock 무결성을 검사한다. 권한 정의·바인딩·묶음·화면 목록과 API 계약 사슬도 구성으로 다시 만든다(DEC-OPS-286·287). 공용 메모리의 원본 운영 사실은 upstream 이력으로 보존하며 현재 기관 사실로 승격하지 않는다. 온라인·이관 승인은 각각 새 pending으로 시작한다. | [생성 가이드](../../docs/03-guides/reusable-base-guide.md), [원장 투영](../../scripts/reusable-governance-projection.mjs), [산출물 무결성](../../scripts/reusable-governance-integrity.mjs), [적용범위 계약](../../config/governance/reusable-review-scopes.json), [기능 선언](../../config/modules/) | 2026-10-13 |
| CTX-019 | `npm run project:ui`는 별도 loopback 3100 생성기를 실행한다. Foundation/Core에 기능 선언(`config/modules`)의 업무 기능을 선택하고 PostgreSQL·멀티모듈/단일모듈 독립 소스를 구성한다. 기능 선언 정본은 `config/modules`이고 시작 구성(`presets.json`)은 이름 붙은 기능 목록이라 같은 목록의 직접 선택과 결과가 같다(ADR-0028). UI/CLI는 같은 엔진을 쓰며, 생성에는 원본 frontend 의존성이 필요하고 각 산출물은 전체 기술 검증 후 완료된다. | [생성기 가이드](../../docs/03-guides/project-composer-guide.md), [공통 엔진](../../scripts/project-composer.mjs), [기능 선언](../../config/modules/) | 2026-10-13 |
| CTX-020 | 로컬 E2E의 공식 진입점은 `npm run test:e2e:isolated`다. 새 일회용 DB와 소유한 앱 프로세스를 만들고 인증·fixture·cleanup 전에 owner attestation을 검사한다. 개발 `.env`나 공유 DB를 재사용하지 않는다. | [runner](../../scripts/run-isolated-e2e.mjs), [격리 검사](../../scripts/e2e-isolation.mjs), [실행 가이드](../../docs/03-guides/e2e-test-guide.md) | 2026-09-21 |
| CTX-021 | PR·main은 같은 분류로 build/PIT·시작 구성을 고르며 공용·미지·빈 비교는 전수다. 시작 구성은 변경 파일의 소유 기능을 담은 것만 고른다(미상은 전수). PR은 `ci.pr` 레이아웃(null이면 제외), main·수동은 두 레이아웃이다(ADR-0027·0030). 생성기·도구는 경로별 축을 따른다. 이관 엔진 3파일은 backend·E2E·이관·이관 PIT도 고른다(DEC-OPS-391). backend/schema·frontend build/coverage·재사용 profile/custom·제품 PIT·이관 PIT(2슬롯, ADR-0032)는 병렬이고 secret-scan·custom은 분류 직후, profile은 frontend 뒤다. 커버리지 하한은 [게이트 원장](../../config/governance/gates.json)이 정본이다. | [ADR-0030](../../docs/02-architecture/decisions/ADR-0030-reusable-ci-selection-followup.md), [ADR-0026](../../docs/02-architecture/decisions/ADR-0026-ci-critical-path-and-reusable-impact.md), [분류기](../../scripts/ci-change-scope.mjs) | 2026-10-30 |
| CTX-022 | 템플릿 생성은 INSERT 전용, 회원 승인·반려·탈퇴는 행 잠금 후 상태를 판정한다. 첨부 실물 삭제는 DB 커밋 뒤 수행하며 잔여 고아 후보는 무결성 점검 대상이다. 메모 수정·삭제 힌트, 통계 날짜 경계, 대시보드 게시글 수의 날짜 의미와 두 집계의 가용 여부는 도메인 회귀로 검증한다. 대시보드 오늘 게시글 수는 같은 한국 날짜에서 기간 COUNT를 30초 재사용하고 V2_105 작성일 인덱스가 받친다(DEC-OPS-131·132). | [정합성·검증 경계](../../docs/04-operations/readiness-followups.md#도메인-정합성-보강-2026-09-25), [V2_105](../../api-server/src/main/resources/db/migration/V2_105__index_board_post_created_date.sql) | 2026-09-25 |
| CTX-023 | ADR-0025로 로컬 TOTP MFA는 선택 등록이고 보호계정 강제(`MFA_REQUIRE_PROTECTED`)는 기본 false다. 키가 없으면 등록할 수 없다. 후속 처리는 `tb_sys_job` 내구 원장(최대 8회, 실패 조회 DWORK_READ, payload가 남은 실패분 재처리 DWORK_RETRY), 민감 조회·다운로드는 응답 전 `tb_sys_adt_log` 기록을 둔다. NOTICE_EDIT·FAQ_EDIT·BOARD_PIN·DWORK_*·MFA_RECOVER·ADT_LOG_READ·CMS_PURGE는 기본 그룹이 없다. 공유 OCI는 ROLE_ADMIN에만 앞의 게시판 세 권한이 있다(DEC-OPS-181·380, 적용 버전은 CTX-016). | [ADR-0025](../../docs/02-architecture/decisions/ADR-0025-enterprise-completeness-and-durable-operations.md), [MFA 운영](../../docs/04-operations/mfa-operations.md), [후속 작업 재처리](../../docs/04-operations/durable-work-recovery.md), [권한 원장](../../config/governance/permission-catalog.json) | 2026-10-26 |
| CTX-024 | 백업·복원은 번들 PostgreSQL과 첨부 볼륨을 앱 중지 창의 한 세트(덤프·첨부 tar·manifest·스키마 버전·행 수·SHA-256)로 받고 복원한다. 주기·보존·RTO/RPO·PITR은 런북의 템플릿 권장 시작값이며 실제 값과 운영 훈련 증거는 기관 `backup-recovery` 통제 몫이다(DEC-OPS-107). 훈련 도구가 백업 세트를 일회용 DB에 복원해 Flyway·행 수·감사 원장 트리거·첨부를 대조하고, 계약이 런북의 확인 항목·질의를 도구와 묶는다. 관리형 DB·PITR 복원 절차는 없다. | [런북](../../docs/04-operations/backup-and-restore-runbook.md), [훈련 도구](../../scripts/restore-drill.mjs), [계약](../../scripts/restore-drill.test.mjs) | 2026-10-19 |

## 개발·검증·배포 흐름

- 로컬 전체 개발 기동은 루트 `npm run dev`; 프론트 단독 명령은 `pnpm -C frontend ...`를 사용한다.
- 변경 범위별 최소 검증은 [AGENTS.md의 Verification by change scope](../../AGENTS.md#verification-by-change-scope)를 따른다. 비용 순서는 `verify:docs` < `verify:fast` < `verify:push` < `verify:full`이고, 서비스가 필요한 브라우저 E2E와 외부 ruleset 실측은 각각 `verify:e2e`, `verify:ops`로 명시 실행한다.
- 로컬 훅은 빠른 피드백 계층이고 우회 가능하다. 병합 권위는 [.github/required-checks.json](../../.github/required-checks.json)에 결속된 CI다.
- 재사용 base와 release 경계는 [ADR-0001](../../docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md)이 정본이고, 시작 구성의 의미(이름 붙은 기능 목록)는 [ADR-0028](../../docs/02-architecture/decisions/ADR-0028-presets-are-named-domain-lists.md)이 대체한 부분을 따른다.
- `npm run base:verify -- --profile core`는 새 격리 DB·소스에서 해당 시작 구성의 계약·Java·스키마·프런트를 검사한다. CI는 [시작 구성](../../config/modules/presets.json)의 `ci` 선언에 따라 고른 시작 구성과 사용자 구성 대표 결과를 required `backend-build`에 집계한다. 생성물의 `verify`와 운영 계약은 산출물 runner를 사용하고, 원본 회귀 테스트는 생산 저장소에서 유지한다. 기술 결과와 실제 기관 시나리오·운영 승인을 구분한다.

## 공유 워킹트리와 에이전트 인수인계

여러 에이전트가 같은 디스크·Git index를 공유할 때의 커밋 범위, 도구별 진입점과 글로벌 규칙의 경계, 원시 세션·세션 저널을 공용 메모리로 옮기지 않는 규칙, 이 메모리가 실시간 claim·lock이 아니라는 경계, 자동 로드하는 공용 메모리와 대상 경로에 따라 읽는 영역 결정 색인의 경계는 [AGENTS.md](../../AGENTS.md#공유-워킹트리와-git)의 「작업 시작 시 필수 읽기」·「공유 워킹트리와 Git」·「Documentation and memory」·「도구별 진입점」이 정본이다. 사용자 글로벌 규칙은 저장소 밖의 도구별 진입점에서 따로 로드되므로 clone이나 다른 PC에 자동 전파되지 않는다.

## 재검증 트리거

모듈 include/의존 방향, 런타임 버전, required checks, gate registry·runner selector, 의존성 감사·snapshot 신뢰 경계, load-test 실행 계약, 백업 세트 형식·복원 절차, release topology, codegen 경로, migration-tool 안전성, 에이전트 진입점 또는 자동 로드 집합(공용 메모리 import·결정 색인 분할)이 바뀌면 관련 CTX 행과 `verified_at`을 같은 변경에서 갱신한다.
