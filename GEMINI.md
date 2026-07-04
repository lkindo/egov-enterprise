# GEMINI.md - eGov Enterprise Project Rule Set

## [Inheritance & Overrides]
- **Extends**: `c:\Users\sanle\.gemini\GEMINI.md` (Antigravity Global Rules)
- **Overrides / Merges**:
  - global `§7 Ralph Loop(자가 성찰)` ➔ project `§8` (프로젝트 확장 지침과 병합)
  - global `§3 버그 수정 프로세스` ➔ project `§0.4` (자가 성찰 오류 복구 준수)
- **하네스 자산 소유권**: `.gemini/` = Gemini 런타임 설정·태스크 기록, `.agent/` = 공용 지식(3대 헌법)·스킬·`db-bridge` 자산. 본 하네스의 헌법/스킬 권위는 `.agent/`에 물리적으로 위치하므로, 실행 도구가 해당 경로를 로드하는지 확인한다.

---

본 파일은 **eGov Enterprise** 프로젝트의 전역 개발 규칙을 정의하며, 글로벌 룰셋의 원칙을 이 프로젝트 맥락에 적용한다. 글로벌에 이미 정의된 원칙(Think Before Coding, 증거 기반 실행, 파괴적 작업 사전 승인 등)은 **상속**하며 재서술하지 않는다.

---

## 0. 에이전트 행동 규율 (Agent Behavioral Discipline) - [CRITICAL]

1.  **Task Grading (SSOT 위임)**: 태스크 등급(L0/L1/L2) 정의·Fast-Track 경로·`TASK PROPOSAL` 양식·증거 유형은 **`docs/03-guides/orchestration-protocol.md`(§2 등급, §4 명세, Stage 4 증거)를 유일 SSOT로 따른다.** 인라인 재정의는 drift를 유발하므로 금지한다. **L0는 본 §0 절차를 전면 생략하고 즉시 응답**한다.

2.  **Constitutional Compliance (Guardian Mode)**: 에이전트는 3대 헌법의 수호자이다. 코드 변경을 수반하는 작업 전 `.agent/knowledge/`의 헌법 자산을 조회하여 표준 준수 여부를 검증하고, 헌법 위반·Breaking Change가 예상되면 즉시 중단하고 보고한다.

3.  **Skill Discovery (문맥 기반 자율 차용)**: 의무적 전수 스캔은 금지한다. 아래 트리거가 명백히 감지되면 해당 스킬을 **우선 검토**하여 차용한다(런타임이 스킬 자동 호출을 보장하지 않으므로 '강제'가 아닌 판단 기반 차용이며, 각 스킬의 상세 명세는 `.agent/skills/<name>/SKILL.md`를 on-demand로 참조한다).

    | 트리거 | 스킬 |
    |---|---|
    | BE DTO/Controller 변경 | `api-contract-guardian` |
    | 인증·Spring Security·Next Middleware 변경 | `owasp-security-auditor` |
    | L1+ 설계 검토 | `gstack-review` (1줄 요약) |
    | DB 스키마 변경 | `zero-downtime-migration-planner` |
    | 다중 모듈 구조 변경 (선행 적재) | `deep-context-mapper` |
    | 테스트(Unit/E2E) 작성·수정 | `mutation-testing-auditor` |
    | UI/UX 변경 | `visual-auditor` |
    | 로직·아키텍처 변경 완료 후 | `docs-as-code-sync` |
    | 빌드·DB 장애 진단 | `resilience-debugger` |
    | L0 간결 보고 (`[대상] [상태] [증거]`) | `caveman` |

    > 수치 기준(Mutation Score, 커버리지 등)은 3대 헌법을 SSOT로 하며, 항상 로드되는 본 파일에 중복 명기하지 않는다.

4.  **Self-Reflective Recovery**: 빌드·컴파일·테스트 오류 발생 시 즉시 임의 수정을 금지하고, 글로벌 §7 **자가 성찰 디버그 프로토콜** 및 본 프로젝트 **§8 확장 지침**을 가동하여 근본 원인을 증명한 뒤 수정을 개시한다.

5.  **Verification Gate (컴파일 무결성 보증) - [HARD CONSTRAINT]**: 소스 변경(L1+) 완료를 선언하기 전, 스캐너 결과만으로 속단하지 않고 **변경된 스택**의 컴파일 무결성을 로컬 터미널에서 실증한다.
    - **Backend 변경 시**: `./gradlew compileJava compileTestJava`
    - **Frontend(TS) 변경 시**: `npx tsc --noEmit`

    증거 유형·완료 기준의 상세는 orchestration-protocol Stage 4(**No Proof, No Completion**)를 따른다.

---

## 1. 프로젝트 개요 (Project Overview)

- **이름**: eGov Enterprise (차세대 기업용 표준 프레임워크 기반 서비스)
- **목표**: 전자정부 표준 프레임워크(eGovFrame)를 최신 스택(Java 21, Spring Boot 3.4.1, Next.js 16.2.4)으로 현대화하여 엔터프라이즈 환경에 최적화.
- **아키텍처 흐름**: `User → Next.js Middleware(Auth) → Server Component → ApiService → api-server Controller → business-suite Service → PostgreSQL → DTO Response → Client Component`

## 2. 기술 스택 (Technology Stack)

- **Backend**: Java 21 / Spring Boot 3.4.1 / eGovFrame 5.0.0, Gradle 9.4.1 멀티모듈(`api-server`, `business-suite`, `foundation`)
- **Database**: OCI PostgreSQL 17 (Port 5432)
- **Frontend**: Next.js 16.2.4 (App Router / React 19) / Tailwind CSS 4.0 / Framer Motion / Zod
- **Data Governance (SSOT)**: 모든 DB 객체 명명·데이터 타입은 메타 테이블(`meta_standard_words` 등)을 진실의 원천으로 삼는다.

## 3. 코드 아키텍처 컨벤션 (Code Architecture Conventions)

모든 코딩 컨벤션은 아래 3대 헌법을 최우위 규범으로 따른다. 상세 조항은 각 헌법 원문을 참조한다.

- **Backend**: [API 및 백엔드 아키텍처 헌법](.agent/knowledge/backend-api-constitution/artifacts/constitution.md) (18조)
- **Frontend**: [프론트엔드 디자인 및 UX 헌법](.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) (17조)
- **Database**: [DB 표준화 헌법](.agent/knowledge/db-standard-constitution/artifacts/constitution.md) (10조)

> **⚠ 헌법 불가침 원칙**: 위 3대 헌법(`constitution.md`) 및 본 `GEMINI.md` 자체는 **사용자의 명시적 승인 없이 에이전트가 단독으로 수정할 수 없다.** 운영성 지식(`.gemini/tasks/`, `docs/`)의 생성·갱신은 자율 허용한다.

## 4. 트러블슈팅 매트릭스 (Troubleshooting Gotchas)

- **인증(401)**: `AuthContext`의 `accessToken`과 브라우저 쿠키 값 동기화 여부를 먼저 확인한다.
- **타입 에러**: 백엔드 DTO 변경 후 `pnpm run codegen:ts`를 실행하여 `generated-api.d.ts`를 최신화한다.
- **렌더링**: App Router 기본은 Server Component다. 이벤트 훅 사용 위치에만 `'use client'`를 선언한다.

## 5. 주요 명령어 (Key Commands)

> 프론트엔드는 **pnpm**으로 관리한다(루트 `dev` 스크립트 및 `pnpm-lock.yaml` 기준).

| 명령 | 경로 | 설명 |
|------|------|------|
| `npm run dev` | Root | API + WEB 동시 개발 서버 실행 |
| `pnpm run codegen:ts` | `frontend/` | OpenAPI 명세 기반 TS 타입 생성 (**※ API 서버 기동 필요**) |
| `pnpm run analyze` | `frontend/` | Next.js 번들 사이즈 분석 |
| `pnpm run storybook` | `frontend/` | UI 컴포넌트 격리 개발 환경 |
| `pnpm run test:e2e` | `frontend/` | E2E 전체 실행 (상세: `docs/03-guides/e2e-test-guide.md`) |
| `make coverage` | Root | 백엔드 테스트 커버리지 리포트 생성 |

## 6. 확장 가이드 참조 (Extended Guides)

해당 작업 수행 시 반드시 병행 참조한다.

| 가이드 | 경로 | 적용 시점 |
|--------|------|-----------|
| 오케스트레이션 프로토콜 (SSOT) | `docs/03-guides/orchestration-protocol.md` | 등급 판정·위임·검증 파이프라인 |
| 테스트 종합 가이드 | `docs/03-guides/testing-guide.md` | 단위/통합/E2E 전략 및 Tier 구조 |
| E2E 운영 Runbook | `docs/03-guides/e2e-test-guide.md` | E2E 환경 설정·CI 최적화·좀비 프로세스 정리 |
| 도메인 보안·회복탄력성 | `docs/02-architecture/domain-resilience.md` | 고가용성 로직 설계 |
| API 설계·문서화 | `docs/03-guides/api-documentation-guide.md` | 신규 API 생성·연동 |
| DB 표준화 이행 | `.agent/knowledge/db-standard-constitution/artifacts/standard_terms.md` | DB 오브젝트 설계 |

> **문서 관리 규칙**: 새 문서는 `02-architecture/`(설계), `03-guides/`(개발 지침), `04-operations/`(운영), `archived/`(보관)로 분류하고 파일명은 **`kebab-case.md`**를 준수한다. 태스크 진행 기록은 `.gemini/tasks/`에 `YYYYMMDD-task-name.md`(kebab-case) 형식으로 작성한다.

## 7. Database Interaction Rules (via Local Bridge)

- **실행**: `node .agent/scripts/db-bridge.js "QUERY" [--json]` (접속 정보는 `application.yml` 자동 연동, OCI PostgreSQL 17)
- **DML 승인**: 운영/코어 데이터의 DML은 글로벌 §5 파괴적 작업 경계 규정에 따라 **사전 승인 필수**.
- **자율 예외**: `test_` 접두사·`@ActiveProfiles("test")`의 명백한 가비지 데이터 정리(DB 헌법 제8조 2항), 및 메타/물리 스키마 **단순 조회(SELECT)**는 사용자 승인 없이 자율 실행을 허용한다.

## 8. 프로젝트 자가 성찰 디버그 확장 (Self-Reflective Debug Extension)

> 글로벌 §7 자가 성찰 디버그 프로토콜을 상속하며, 아래 **프로젝트 고유 도구 연동만** 추가한다(공통 절차는 재서술하지 않음).

- **DB 상태 진단**: 증거 수집(글로벌 프로토콜 2단계) 시 `resilience-debugger`로 오류 지점의 DB Bridge 연동 상태·물리 스키마를 선제적으로 SELECT 조회하여 데이터 불일치를 조사한다.
- **E2E 교차 검증**: Playwright E2E 실패 시 콘솔 로그만 분석하지 않고, 반드시 브라우저 아티팩트(DOM 상태·스크린샷·WebP 비디오)와 JVM 에러 로그를 상호 교차 검증하여 실패 원인을 증명한다.

---
*Last Updated: 2026-07-04 (하네스 최적화: L0/L1/L2·TASK PROPOSAL을 orchestration-protocol SSOT로 위임, 강제 가동→조건부 스킬 트리거, 컴파일 게이트를 변경 스택으로 스코프, file:/// 링크·헌법 조문 수·npm/pnpm 명령어 정합화, §6.1 마케팅 표 및 중복 규정 제거)*
