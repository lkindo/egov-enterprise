# Strict Orchestration Protocol (SOP)

## 1. 개요 (Overview)
본 프로토콜은 **메인 에이전트(오퍼레이터)와 서브에이전트·워크플로우 간 협업**을 위한 **정형화된 공정(Standard Pipeline)**이다. 작업의 복잡도와 위험도에 따라 등급을 분류하고, 등급별로 최적화된 경로를 통해 무결성과 속도를 동시에 확보한다.

> **다중 오퍼레이터 전제**: 본 저장소는 **Antigravity/Gemini, Claude Code, Codex 등**이 동일 워킹트리를 공유한다. 모든 오퍼레이터는 [AGENTS.md](../../AGENTS.md)의 공통 계약과 본 프로토콜을 준수하며, 도구별 파일은 실행 수단만 연결한다.

---

## 2. 태스크 등급 분류 (Task Grading)

에이전트는 저장소 파일·Git·원격·운영 상태를 바꾸는 **변경 작업**을 착수할 때 가장 먼저 아래 기준에 따라 등급을 판정한다. 답변·설명·읽기 전용 감사·상태 보고는 등급·Task Specification 대상이 아니다.

| 등급 | 정의 | 적용 경로 | 필수 게이트 |
|:---:|:---|:---:|:---|
| **L0** | 단순 오타, 스타일(CSS) 수정, 주석 추가 등 저위험 작업 | **Fast-Track** | Audit(약식), Verification |
| **L1** | 단일 파일 로직 수정, 신규 컴포넌트 작성, 버그 수정 | **Standard** | Dispatch, Audit, Verification |
| **L2** | DB 스키마 변경, 다중 모듈 연동, 보안 관련 핵심 로직 | **Strict-SOP** | 전 단계 (Full Pipeline) |

> 등급은 **모든 변경 작업에서 판정·명시**한다. 현재 사용자 요청이나 포괄 승인(§3 Stage 1)이 변경 권한을 이미 포함하더라도 등급과 SCOPE 는 축약된 형태(1줄)로 밝힌다.

---

## 3. 오케스트레이션 파이프라인 (The Pipeline)

### [Stage 1] Dispatch: 등급 판정 및 Spec 발행
- **Action**: 에이전트가 등급(L0~L2)을 제안하고 **Task Specification**을 작성한다. 현재 사용자 요청 또는 유효한 포괄 승인에 그 변경 권한이 이미 포함되면 등급·SCOPE 를 고지하고 진행하며, 포함되지 않은 L1/L2만 추가 승인을 받는다. 분석·진단 요청은 수정 권한으로 간주하지 않는다.
- **Fast-Track (L0)**: 승인 절차 없이 즉시 구현 단계로 진입 가능하다. 단, [AGENTS.md의 안전 경계](../../AGENTS.md#공통-작업-원칙)에 해당하는 작업은 L0로 분류하거나 Fast-Track으로 우회할 수 없다.
- **포괄 승인(Standing Approval)**: 사용자가 배치/연속 작업에 대해 포괄적 진행 지시(예: "진행해", "나머지 진행해", ultracode 모드)를 준 경우, 메인 에이전트는 각 항목마다 재승인을 받지 않고 **등급·SCOPE 를 1줄로 밝힌 뒤 진행**할 수 있다. 단, [AGENTS.md의 안전 경계](../../AGENTS.md#공통-작업-원칙)에 해당하는 되돌리기 어렵거나 외부 상태를 바꾸는 작업은 포괄 승인만으로 수행하지 않고 **개별 명시 승인**을 받는다. 현재 요청이 그 동작의 정확한 대상과 영향을 이미 명시 승인했다면 그 승인으로 충분하며, 범위를 벗어난 새 대상·새 동작에만 추가 승인을 받는다.

### [Stage 2] Execution: 자율 구현

#### 2.1 실행 방식: 직접 vs 위임 (Direct vs Delegation)
실행 방식은 **직접 하느냐, 위임하느냐** 두 갈래뿐이다.

- **Direct**: 메인 에이전트가 직접 구현 — 대부분 작업의 기본값.
- **위임(Delegation)**: 작업의 규모·성격에 따라 아래 수단에 위임한다. *수단은 오퍼레이터별 매핑 사항일 뿐, 그 자체가 규범은 아니다.*
  - *단일 서브에이전트* — 깊은 탐색·정밀 디버깅·다중 파일 조사 등 하나의 집중 작업. (Claude Code: Agent 도구 / Antigravity: 네이티브 서브에이전트·스킬)
  - *워크플로우(다중 에이전트 팬아웃)* — 대규모·기계적 반복 작업(일괄 리팩터, 전수 감사·트리아지, 마이그레이션 스윕). parallel/pipeline + verify/repair 내장. (Claude Code: Workflow 도구, 사용자 opt-in[포괄 승인/ultracode] 하에서만)

> **위임의 불변 규칙(실제로 강제되는 것)**: 무엇을 어떤 수단으로 위임하든 — ① 위임 대상에 **컨텍스트 패킷(§2.2)** 을 전달하고, ② **메인 에이전트가 산출물을 직접 재검증(§2.3)** 해야 완료로 인정한다. 위임은 이 두 규칙의 준수로만 의미를 가지며, "어떤 모드인가"라는 라벨링은 요구하지 않는다.

#### 2.2 위임 패킷 (Delegation Packet)
위임 시(단일 서브에이전트 또는 워크플로우 서브에이전트 프롬프트 포함), 메인 에이전트는 반드시 아래 **필수 컨텍스트**를 위임 대상에 전달해야 한다. 컨텍스트 없는 위임은 금지한다.

| # | 필수 항목 | 설명 |
|:---:|:---|:---|
| 1 | **Task Spec** | Stage 1에서 발행한 TASK PROPOSAL 전문 |
| 2 | **관련 헌법 조항** | 해당 작업에 적용되는 헌법 조항의 핵심 내용 (전문 복사 또는 요약) |
| 3 | **파일 맵** | 수정 대상 파일 경로 및 의존 관계 (import/참조) 목록 |
| 4 | **제약 조건** | 금지 패턴(안티패턴 3.6 참조), 네이밍 규칙, 사용해야 할 유틸리티 등 |
| 5 | **완료 기준** | 빌드 성공, 특정 테스트 통과 등 객관적 기준 (Stage 4의 증거 유형 명시) |

```text
# 위임 패킷 템플릿 (Delegation Packet Template)
## TASK: {Stage 1 TASK PROPOSAL 전문}
## CONSTITUTION: {적용 헌법 조항 요약}
## FILE MAP: {수정/참조 파일 경로 목록}
## CONSTRAINTS: {금지 패턴 및 필수 규칙}
## DONE CRITERIA: {빌드/테스트 통과 기준}
```

#### 2.3 Audit 귀속 원칙
- **구현은 위임해도, 감사(Stage 3)와 검증(Stage 4)은 반드시 메인 에이전트가 수행한다.**
- 서브에이전트/CLI/**워크플로우가 자체 검증(내부 verify) 통과를 보고하더라도**, 메인 에이전트는 이를 완료 증거로 신뢰하지 않는다. 반드시 **독립적으로 게이트(§4.1)를 직접 재실행**하고 산출물(Diff)을 직접 검토한 후에만 Stage 3으로 진입·완료를 선언한다. *(워크플로우의 내부 verify 결과 ≠ 완료 증거.)*

#### 2.4 실패 복구 프로토콜 (Failure Recovery)
위임한 작업이 실패하거나 헌법 위반 코드를 생산한 경우:

실패 횟수는 **같은 원인 가설별로 최초 실패를 포함해** 센다. 오류를 원인 가설 → 표적 증거 → 최소 수정 → 재검증 순으로 복구하되, 같은 원인으로 총 3회 실패하면 직접 재시도하지 않고 중단·보고한다.

| 실패 유형 | 대응 | 최대 재시도 |
|:---|:---|:---:|
| **빌드/린트 실패** | 오류 증거와 원인 가설을 붙여 표적 수정 후 재검증한다. 위임 방식은 원인에 맞게 바꿀 수 있다. | 추가 2회(총 3회) |
| **헌법 위반 발견** | 해당 경로를 멈추고 위반 조항과 합치 대안을 명시한다. 승인 범위 안의 구현 위반은 바로 고치고, 규범 예외·제품 의미 변경은 사용자 결정을 받는다. | 같은 원인 총 3회 규칙 적용 |
| **같은 원인 3회 실패** | 직접 재시도하지 않고 원인·시도 이력·증거·선택지를 사용자에게 보고한다. | - |
| **위임 대상 무응답/중단** | 범위 안에서 직접 수행하거나 대체 수단으로 전환한다. 의미 있는 진행이 불가능할 때 근거와 선택지를 보고한다. | - |

> **워크플로우 보강**: 워크플로우는 verify→repair 단계를 스크립트에 내장하여 1차 자가 복구한다. 잔여 실패는 메인 에이전트가 직접 처리할 수 있지만, 같은 원인 3회에 도달하면 추가 시도 없이 사용자에게 에스컬레이션한다.

### [Stage 3] Audit: 기술 헌법 합치성 검사

**메인 에이전트 전속 책임** — 위임 여부와 무관하게 감사는 메인 에이전트만 수행한다. 에이전트는 구현 결과물(Diff)에 대해 **'헌법 수호자'**로서 다음의 감사 절차를 수행한다.

#### 3.1 사전 검증 (Pre-Audit)
모든 개발 및 수정 작업 착수 전:
1. **실증적(Evidence-Based) 표준 조회**: 새로운 테이블/필드를 설계하거나 쿼리를 작성할 때, 에이전트의 지레짐작(Assumption)을 엄격히 금지한다. 반드시 로컬 DB 브리지(`node .agent/scripts/db-bridge.js`)로 표준 메타 테이블(`meta_standard_words`/`meta_standard_terms`/`meta_standard_domains` — DB 헌법 제2조의 유일 SSOT)과 `information_schema`를 실시간 조회하여 **"실제 존재하는"** 물리 스키마와 표준 명칭을 눈으로 확인한 뒤 실행한다.
2. **인프라 상태도 가정 금지**: DB·백엔드 서버·네트워크·포트 등 **인프라의 가용성은 착수·재개 시점에 실측**한다. 과거 세션이나 직전 단계의 상태를 그대로 가정하지 않는다. 예: DB 접속이 필요한 작업은 `db-bridge` 로 실제 응답(예: `SELECT now()`)을 먼저 확인한 뒤 진행하고, "이전에 안 됐으니 지금도 안 될 것"/"이전에 됐으니 지금도 될 것" 같은 추정으로 단정하지 않는다.
3. **헌법 위반 예측**: 요청된 작업이 헌법 조항과 충돌할 가능성이 있는지 분석한다.
4. **대응**: 표준에 없는 용어가 필요하거나 헌법 위반이 예상되면 해당 변경 경로를 멈추고 합치 대안을 먼저 찾는다. 대안이 승인 범위·제품 의미·규범을 바꿀 때만 사용자에게 결정 근거와 선택지를 보고한다.

#### 3.2 구현 중 감시 (On-going Monitoring)
코드를 작성하는 과정에서 실시간으로 감시하는 체크포인트:
- **DB**: 객체별 표준 접두사(`tb_`, `vw_`, `sq_`) 및 컬럼 데이터 타입 표준 준수 여부. [DB 헌법 제1조, 제3조]
- **Backend**: 레이어 간 격리(DTO 사용), 서비스 레이어 권한 재검증, 안전한 트랜잭션 사용 여부. [백엔드 헌법 제3조, 제8조]
- **Frontend**: 서버 컴포넌트 우선 원칙, 디자인 토큰 사용, 반응형 브레이크포인트 준수 여부. [프론트엔드 헌법 제3조, 제5조, 제6조]

#### 3.3 등급별 감사 수준
- **L0/L1**: 주요 체크포인트(3.2) 기반 약식 검사.
- **L2**: 헌법 전문 대조 및 상세 Audit 리포트 발행 필수.

#### 3.4 위반 대응 (Hard-Stop & Report)
1. **작업 중단**: 위반이 명확한 경우 해당 코드 작성을 즉시 멈춘다.
2. **근거 제시**: 위반된 헌법 조항(예: "백엔드 헌법 제3조 위반")을 명시적으로 인용한다.
3. **대안 제안**: 헌법에 부합하는 올바른 구현 방식과 그 이유(트레이드오프)를 설명한다.
4. **사용자 결정**: 요청 자체가 헌법과 충돌하거나 대안이 승인 범위·제품 의미·규범을 바꿀 때 명시적 결정을 받는다. 승인 범위 안의 명백한 구현 위반 수정은 재승인 없이 수행한다.

#### 3.5 레거시 코드 정화 지침
1. **적극적 발견**: 수정 범위가 아니더라도 주변에 헌법 위배 코드가 있다면 사용자에게 보고하고 리팩토링 여부를 묻는다.
2. **단계적 이행**: 대규모 레거시 정화가 필요한 경우, 시스템 안정성을 위해 단계별 리팩토링 계획을 수립하여 제안한다.

#### 3.6 헌법 위반 대표 사례 (안티패턴)

| 안티패턴 | 올바른 방향 | 관련 헌법 |
|---------|-----------|-----------|
| 컨트롤러에서 Entity 반환 | DTO 전문 클래스 생성 및 매핑 | [백엔드 헌법 제3조] |
| 서비스 레이어 권한 체크 생략 | `SecurityUtil`을 통한 이중 검증 | [백엔드 헌법 제8조] |
| 디자인 토큰 대신 하드코딩 사용 | 정의된 CSS 변수 및 토큰 활용 | [프론트엔드 헌법 제6조] |
| `pageIndex` 직접 계산 | `ApiService`의 자동 매핑 로직에 위임 | [프론트엔드 헌법 제4조] |
| DB 메타 테이블 미조회 임의 설계 | `meta_standard_words` 실시간 조회 | [DB 헌법 제2조] |

### [Stage 4] Verification: 증거 기반 최종 승인

**No Proof, No Completion** — 에이전트는 "성공했습니다"라는 선언 이전에 반드시 객관적인 증거를 제시해야 한다.

#### 4.1 필수 증거 (현행 게이트 명시)
| 작업 도메인 | 증거 유형 |
|:---|:---|
| **UI/Frontend** | `pnpm -C frontend exec tsc --noEmit`(정적 타입) — [AGENTS.md의 범위별 검증](../../AGENTS.md#verification-by-change-scope) + 계약 드리프트 게이트 `codegen:verify`/`codegen:verify:zod`(api-docs.json ↔ generated-api.d.ts/generated-zod.ts). RSC 경계는 `pnpm -C frontend build`, 런타임 거동은 관련 Playwright spec으로 검증한다. pre-push는 E2E를 실행하지 않으므로 최종 병합 판단에는 현재 required CI 결과를 직접 확인한다. |
| **Backend/API** | `./gradlew compileJava compileTestJava`(컴파일 무결성) — [AGENTS 범위별 검증](../../AGENTS.md#verification-by-change-scope). 헌법·표준 린터는 `./gradlew :api-server:harnessTest`, 기능은 관련 JUnit/ArchUnit과 API 응답으로 검증한다. |
| **Database** | `db-bridge` 쿼리 실행 결과·행(Row) 수, `flyway_schema_history` 확인, `EXPLAIN ANALYZE` 결과, 스키마 변경 확인 로그. **엔티티·DDL 변경 시 `./gradlew :api-server:schemaValidationTest`**(빈 PostgreSQL 17 + Flyway 전량 적용 + Hibernate `ddl-auto:validate`, Docker 필요). ⚠ 단위 테스트 프로파일은 **H2 + `create`/`create-drop`** 이라 물리 스키마 불일치를 **원리적으로 검출하지 못한다** — 그 그린을 스키마 증거로 제시하지 말 것. |
| **아키텍처/규칙** | 신설·수정한 ArchUnit/린트 게이트가 그린임을 대상 테스트 직접 실행(`--tests`)으로 증명. **게이트를 신설·수정했다면 그린 확인만으로 부족하다 — 의도적으로 위반을 주입해 red 가 되는 것까지 증명한다**(그린만 확인하면 vacuous 통과·UP-TO-DATE 스킵과 구분되지 않는다. [AGENTS.md Evidence guardrails H5](../../AGENTS.md#evidence-guardrails)). |

공통 검증 진입점은 비용과 범위가 `verify:docs` ⊂ `verify:fast` ⊂ `verify:push` ⊂ `verify:full`이 되도록 구성한다.

| 명령 | 용도와 경계 |
|---|---|
| `npm run verify:docs` | 운영 계약과 Atlas 문서 계약. 문서 전용 변경의 최소 fail-closed 경로 |
| `npm run verify:fast` | docs + Java compile + FE/E2E type-check·lint·codegen + 빠른 Vitest |
| `npm run verify:push` | fast + governance harness. 수동 사전 검증용이며 실제 pre-push 훅의 변경분 최적화와 동일하다고 가정하지 않음 |
| `npm run verify` / `verify:full` | backend test·harness·JaCoCo·실 PostgreSQL schema-validation + frontend build·bundle·coverage. 브라우저 E2E와 원격 정책은 포함하지 않음 |
| `npm run verify:e2e` | 운영 계약·E2E type-check 후 격리 runner가 새 일회용 DB·API·FE를 생성해 Playwright 실행. 운영 대상을 향해 실행하지 않음 |
| `npm run verify:ops` | `.github/required-checks.json`과 현재 GitHub ruleset exact-match. 네트워크와 admin read 권한 필요 |

> **게이트 계층**: pre-commit은 빠른 경고, pre-push는 변경 범위별 로컬 차단, `localGate`는 Docker를 포함한 넓은 Gradle 검증, required CI는 병합 권위다. 하네스 목록·실행 소비자는 [governance gates manifest](../../config/governance/gates.json), 훅의 정확한 포함 task와 우회 경계는 [.githooks/README.md](../../.githooks/README.md), required check·review 정책은 [.github/required-checks.json](../../.github/required-checks.json)을 따른다.
>
> ⚠ **pre-push 에는 E2E 가 없다.** 로컬 게이트 전부 그린이어도 E2E 는 검증되지 않은 상태다.
> UI 를 건드리는 변경은 과거 문서나 로컬 결과로 CI 상태를 추정하지 말고, **현재 required CI와 E2E 결과를 직접 확인한 뒤에** 완료로 선언한다.
>
> ⚠ **PR 병합 시 `mergeStateStatus` 를 확인할 것.** `UNSTABLE` 은 "병합은 가능하나 **체크 실패**"
> 를 뜻한다. 자동 병합 도구가 `UNSTABLE` 을 병합 가능으로 취급하면 red CI 가 그대로 들어간다.

- **런타임 검증 불가 시 (정직한 보류)**: 인프라 제약(DB 다운·엔드포인트 인증 게이트·도구 부재 등)으로 런타임 증거를 확보할 수 없는 경우, **정적 증거로 확증 가능한 범위를 명시**하고 나머지는 근거와 함께 `deferred`로 보고한다. 보류 항목에는 재개 조건을 함께 기록한다.

#### 4.2 검증 문서화
- 작업별 분류·검증 근거는 대화, PR 설명, CI/테스트 로그처럼 해당 실행과 함께 추적되는 채널에 남긴다. `.gemini/tasks/`에 새 세션 저널을 만들지 않는다. 지속 가능한 사실·승인 결정·재현 가능한 gap만 정본 링크와 검증일을 갖춰 [.agent/memory](../../.agent/memory/)의 해당 파생 인덱스로 선별 승격한다.
- 모든 빌드나 테스트가 통과된 터미널 출력값이 최소 1회 이상 대화 세션에 노출되어야 한다.

---

## 4. 표준 위임 명세서 (Standard Task Specification)

변경 작업 시작 시 아래 형식으로 현재 상태를 동기화한다. 추가 승인이 필요 없는 L0 및 이미 승인된 L1/L2는 등급·SCOPE 1줄로 축약할 수 있다.

```text
### [SOP] TASK PROPOSAL (Grade: L0/L1/L2) ###
1. TARGET: {기능 경로}
2. SCOPE: {작업 범위 요약}
3. PROPOSED MODE: [Direct / 위임: Subagent / 위임: Workflow]
4. CONSTITUTION: [관련 헌법 명시]
##############################################
-> (L1/L2 중 현재 요청·포괄 승인으로 아직 승인되지 않은 경우) 위 제안대로 진행할까요?
```

---

## 5. 운영 원칙 (Operating Principles)
- **무결성 우선**: 속도보다 중요한 것은 헌법 준수와 작동 증거이다.
- **유연한 적용**: L0 작업과 현재 요청·포괄 승인으로 이미 승인된 L1/L2 작업은 절차를 간소화(등급·SCOPE 1줄 고지)하여 사용자의 흐름을 방해하지 않는다.
- **중단 및 보고**: 예상치 못한 오류는 §2.4와 [AGENTS.md](../../AGENTS.md#공통-작업-원칙)의 원인 가설 → 표적 증거 → 최소 수정 → 재검증 순서로 복구한다. 같은 원인으로 최초 실패 포함 3회 실패하거나 새 권한·사용자 결정이 필요할 때 중단하고 근거와 선택지를 보고한다.
- **공유 워킹트리 규율**: 다중 오퍼레이터 환경에서 커밋은 `git commit --only -- <경로>` 로 **자기 변경분만** 담아 타 오퍼레이터의 WIP 혼입을 차단한다. 파일 변경 전 항상 디스크의 현재 상태를 직접 조회한다.
- **정직한 보고**: 실패·스킵·보류는 있는 그대로 보고한다. 인프라 상태·검증 결과를 추정으로 단정하거나, 미검증을 완료로 선언하지 않는다.

---

## 6. 연속 배치 작업의 시간 예산 (Batch Time Budget)

이 절은 [AGENTS.md의 연속 작업 원칙](../../AGENTS.md#연속-작업의-시간-예산)을 실행하는 절차다. PR마다 반복되는 고정 비용만 줄이며, 커밋·푸시·병합의 권한 범위, H1~H5, 훅, required CI의 병합 권위, 위임 산출물 재검증(§2.3)과 red 증명 요구는 바꾸지 않는다. 결정 기록은 [DEC-OPS-177](../../.agent/memory/decisions.md)이다.

### 6.1 PR 묶기
- 같은 목적의 응집된 배치는 PR 하나로 올린다. 최신 main을 요구하는 브랜치 보호(strict) 때문에 PR마다 main 최신화·재검증·CI가 차례로 반복된다.
- 순서가 있는 여러 변경은 한 브랜치에 커밋으로 쌓는다. 검토 단위로 PR을 나눠야 하면 스택으로 올리되 병합은 끝 PR 하나로 한다.
  1. 끝 브랜치에 `origin/main`을 합치고 §6.4대로 생성물을 다시 만든다.
  2. **push 전에** 끝 PR의 base를 `main`으로 바꾼다(`gh pr edit <N> --base main`). CI는 PR base 기준으로 변경 범위와 E2E 선별을 계산하고 base 변경만으로는 다시 돌지 않으므로, 앞 브랜치를 base로 둔 채 받은 green은 스택 전체의 검증이 아니다.
  3. required CI가 green이면 병합하고, PR 본문에 포함된 PR과 결정 ID를 적는다.
  4. 앞 PR이 자동으로 MERGED가 됐는지 확인한다. 남은 PR은 포함된 병합 커밋을 댓글로 남기고 닫는다. 스택이 남아 있는 동안 base 브랜치를 지우지 않는다(지우면 그 위의 열린 PR이 닫힌다).
- 묶더라도 결정 기록(ADR·DEC)과 red 증명은 변경 단위로 남긴다. 묶는 대상은 병합 비용이지 추적 단위가 아니다. 병합과 PR 닫기는 사용자가 요청한 범위에서만 한다.

### 6.2 검증은 한 커밋에 한 번
- 작업 중에는 영향 테스트만 실행한다.
- 다음 재실행은 중복이 아니다: 위임 산출물에 대한 메인 에이전트의 독립 재검증(§2.3), 게이트·계약의 red 증명(green → 위반 주입 → red → 원복 → green), 이번에 바꾼 계약·게이트의 대상 테스트 실행. "미리 돌리지 않는다"는 pre-push가 곧 돌릴 묶음 전체를 같은 커밋에서 한 번 더 돌리는 경우에만 적용한다.
- 넓은 로컬 검증은 최신 main을 합치고 §6.4대로 다시 만든 뒤, 푸시 직전에 한 번 한다. pre-push가 곧 실행할 묶음(운영 계약, 범위별 compile·tsc·lint·폼 census·codegen 검사, `src/__tests__` Vitest, `harnessTest` — [.githooks/README.md](../../.githooks/README.md))은 같은 커밋에서 미리 돌리지 않는다. 대신 훅이 보지 않는 검사 가운데 변경이 요구하는 것을 고른다: 화면 파일을 지우거나 옮기거나 화면 문자열을 바꾸면 전체 Vitest, `foundation`·`business-*`에 클래스를 더하거나 고치면 그 모듈의 `check`(클래스별 커버리지), 엔티티·DDL을 바꾸면 `schemaValidationTest`, RSC 경계·의존성을 바꾸면 `pnpm -C frontend build`와 `bundle:check`, 컨트롤러·DTO를 바꾸면 `api-docs.json` 추출(§6.4). 해당하는 검사가 하나도 없을 때만 넓은 로컬 검증을 생략한다. required CI가 같은 범위를 돈다는 사실은 생략 사유가 아니다.
- 생략했거나 CI에만 맡긴 검사는 완료 보고에 그 사실과 대신 확인할 CI 잡을 적고, 그 잡이 끝난 뒤에 완료를 선언한다.
- CI가 red이면 실패한 잡의 로그로 원인을 판정하고 그 원인에 맞는 표적 검사만 로컬에서 다시 실행한다. 인프라 일시 장애로 판정한 경우에만 실패한 잡을 재실행한다. 같은 원인의 실패 횟수는 §2.4대로 센다.
- 훅을 우회하지 않는다(`--no-verify`, `SKIP_HARNESS=1` 포함). 같은 검사를 이미 수동으로 돌렸어도 마찬가지다. pre-push에는 E2E가 없으므로 UI 변경의 완료는 required CI 결과로 판단한다(§4.1).

### 6.3 무거운 검증은 하나씩
- 다음은 한 기계에서 동시에 하나만 실행한다: 전체 Vitest, Gradle 전체 테스트·`harnessTest`·`schemaValidationTest`, `npm run verify`, 재사용 base 생성·검증(`npm run base:verify`, `base:generate-db`·`base:generate-source`, 메뉴 snapshot 갱신), 격리 E2E, 그리고 이들을 실행하는 pre-push. 워크트리가 여러 개여도 CPU·메모리·Docker를 함께 쓰므로 마찬가지다.
- 워크플로 팬아웃(§2.1)과 서브에이전트의 verify 단계도 이 규칙을 따른다. 병렬 에이전트에는 영향 테스트와 정적 검사만 맡기고, 무거운 검증은 메인 에이전트가 산출물을 통합한 뒤 한 번 순서대로 실행한다(§2.3).
- 다른 오퍼레이터의 실행은 공용 메모리로 알 수 없다(GAP-AGENT-001). 무거운 검증을 시작하기 전에 같은 기계에서 Gradle·Vitest·Playwright·테스트 컨테이너가 돌고 있는지 프로세스 목록과 `docker ps`로 확인하고, 돌고 있으면 끝난 뒤에 시작한다.
- 다른 무거운 실행과 겹쳤던 실행은 green이든 red든 그 커밋의 증거로 쓰지 않는다. 부하는 거짓 red뿐 아니라 파일 단위 수집 누락으로 거짓 green도 만든다. 같은 명령 전체를 단독으로 다시 실행해 그 결과를 증거로 삼는다. 단독 실행에서도 재현되는 red는 실패로 다룬다. 겹친 실행에서 실패한 테스트 이름은 보고에 남기고, 같은 테스트가 단독 실행이나 CI에서 다시 흔들리면 불안정한 테스트로 보고 고친다.
- 기다리는 동안에는 읽기·편집·다음 배치 준비 같은 가벼운 작업을 한다.

### 6.4 main 최신화 뒤 생성물 재생성
`npm run merge:main`([스크립트](../../scripts/merge-main-regenerate.mjs), DEC-OPS-178)이 아래 표의 기계적인 부분을 한 번에 한다 — `--no-commit` 으로 main 을 합치고, 공용 메모리 표의 충돌을 행 단위로 합치며(같은 ID 를 양쪽이 고쳤거나 같은 새 ID 를 쓰면 멈춘다), 양쪽이 입력을 바꾼 생성 계약·권한 생성물·경계 census·화면 목록·URL census(승인 해시 재결속)·Atlas 를 의존 순서대로 다시 만들고 stage 한다. 손으로 풀 충돌이 남으면 목록을 보이고 멈추며, 풀고 `git add` 한 뒤 `npm run merge:main -- --continue` 로 이어 간다. 커밋은 하지 않으므로 `git diff --cached` 로 아래 확인을 한 뒤 직접 커밋한다. `api-docs.json` 추출, 하네스 manifest 의 같은 키 충돌, 메뉴 snapshot 은 무거운 실행이라 스크립트가 하지 않는다.

양쪽이 입력(소스·원장·카탈로그)을 바꾼 생성물은 텍스트 충돌이 없어도 다시 만든다. 충돌한 생성물은 한쪽을 고르거나 손으로 섞지 않는다. 입력의 충돌을 먼저 풀고 아래 순서로 다시 만든 뒤, 결과 diff가 두 쪽 변경의 합과 같은지 확인한다. 합을 넘는 변화(래칫 수치 상승, 새 예외, 새 분류·승인이 필요한 항목)는 재생성으로 받아들이지 않고 원인을 본다(H2).

| 생성물 | 다시 만드는 방법 |
|---|---|
| 공용 메모리 표(`decisions.md`·`known-gaps.md`) | `decisions.md`는 양쪽 행을 모두 남기고 ID 순서로 합친다. `known-gaps.md` 표는 ID 순서가 아니므로 기존 순서를 유지하고 새 행은 해당 표 끝에 둔다. 같은 ID 행을 양쪽이 고쳤으면 두 변경을 한 행으로 합친다(같은 ID가 두 줄이면 [공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs)이 red다). 두 쪽이 같은 새 ID를 썼으면 나중에 병합하는 쪽이 다음 번호로 바꾸고 참조도 함께 고친다. |
| `api-docs.json` | 합친 소스에서 `OpenApiDocumentationTest` 정적 추출로 다시 만든다([API 문서 가이드](api-documentation-guide.md)). `-Dopenapi.export.path`는 절대 경로로 준다(상대 경로는 모듈 디렉터리 기준이다). pre-push는 이 파일과 백엔드 코드의 정합을 보지 않고 CI의 `api-docs-gate`만 보므로, 양쪽이 컨트롤러·DTO를 바꿨으면 로컬에서 추출한다. |
| 생성 계약(`generated-api.d.ts`·`generated-zod.ts`·`generated-operations.ts`) | `pnpm -C frontend run syncContract`(`codegen:file` → `codegen:zod` → api-docs 정규화) |
| `config/governance/generated-api-boundaries.json` | `node scripts/generated-boundary-census.mjs --write` |
| 화면 목록과 권한 묶음(`frontend/src/types/generated-screen-registry.ts`) | 화면·권한 카탈로그·인가 정책(`config/governance/authorization-policies.json`)·권한 묶음 원장(`config/governance/permission-bundles.json`)·화면 용어 원장(`config/frontend-visible-terms.json`, 묶음 문구 검사)·라우트 원장·메뉴 snapshot을 합치고 경계 census를 다시 만든 뒤 `node scripts/generate-screen-registry.mjs`(검사: `--check`). 묶음이 여는 화면(진입 권한)과 관련 화면(진입 권한이 빈 화면 중 쓰기 귀속이 묶음 권한인 화면)은 원장에 적지 않고 화면 목록으로 계산하므로, 화면·카탈로그만 바뀌어도 묶음 결과가 달라진다. 새 권한을 카탈로그에 더하면 어떤 묶음에 넣거나 원장의 `excluded` 에 사유와 함께 적어야 생성이 통과한다 — 재생성으로 맞추고, 묶음이 여는 화면이 없어지는 등 원장 검증이 실패하면 원장을 고친다. 경계 census의 출력을 읽으므로 그 뒤, 이 파일을 읽는 URL census 앞에 만든다. 라벨을 메뉴 snapshot에서 읽으므로, 아래 `config/project-composer-menus.json` 행으로 snapshot을 다시 만들었으면 그 뒤에 한 번 더 실행한다. |
| operation 수와 GAP-WIRING-001 | `node scripts/operation-consumer-census.mjs --json`의 `operationCount`로 `config/governance/operation-consumer-census.json`의 `expected.operationCount`, `scripts/generated-operations-contract.test.mjs`의 단언, `known-gaps.md` GAP-WIRING-001을 함께 맞춘다. 같은 행의 unwired·화면 고아 수도 합친 결과로 맞추며, 상한을 올려야 하면 사유를 남긴다(H2). |
| 권한 생성물(`PermissionCodes.java`·`generated-permissions.ts`·`operation-bindings.json` 등) | 원장(`config/governance/permission-catalog.json`·`authorization-policies.json`)을 합친 뒤 `node scripts/generate-permissions.mjs` |
| `config/ui-url-state-census.json`과 승인 결속 | `node scripts/ui-url-state-census.mjs --write` 뒤 `config/ui-url-state-approval.json`의 해시만 새 census 파일(LF)의 SHA-256으로 다시 결속한다. 승인 항목은 손대지 않는다. |
| `config/project-composer-menus.json`의 `sourceMigrationHash` | migration·seed·인가 Contract SQL의 해시다. 양쪽이 migration을 더했으면 [프로젝트 생성기 가이드](project-composer-guide.md)의 일회용 PostgreSQL 컨테이너 절차로 `node scripts/generate-reusable-base-db.mjs`를 `--write-menu-snapshot`과 함께 실행한다(§6.3의 무거운 실행). |
| 하네스 `baseline-manifest.properties` | 서로 다른 키가 바뀌었으면 양쪽 줄을 모두 살린다. 같은 키를 양쪽이 바꿨으면 `./gradlew :api-server:harnessTest`를 한 번 실행하고(§6.3) `api-server/build/harness/baseline-manifest.actual.properties`에서 충돌한 키의 값만 옮긴다. 그 키의 입력 변경이 양쪽 모두 정당한지 확인하고(H2) 다른 키까지 통째로 복사하지 않는다. |
| 그 밖의 해시 결속·수치(disposition overlay의 `manifestRef.sha256` ← `config/ui-route-capabilities.json`, 재사용 base `databaseSnapshot` 수 등) | 실패한 계약이 가리키는 생성 명령과 기대값을 따른다. 해시는 입력이 정당하게 바뀐 경우에만 다시 결속하고, 수치는 양쪽 변경을 합산하거나 실측으로 다시 구한다. 래칫을 올려야 하면 재생성이 아니라 H2 판단이다. |
| `frontend/public/governance_harness_atlas.html` | 마지막에 `npm run atlas:build`를 실행한다. 문서·공용 메모리·게이트 원장을 읽으므로 다른 재생성보다 뒤에 한다. |

재생성 결과는 대부분 pre-push의 운영 계약과 codegen 검사가 확인한다. 예외는 위 `api-docs.json` 행이다.

### 6.5 세션 나누기(권장)
- 긴 연속 작업은 배치(PR) 경계에서 새 세션으로 이어 가기를 권한다. 컨텍스트 압축이 반복되면 이미 확인한 사실을 다시 도출하는 비용이 커진다.
- 새 세션은 이전 대화의 요약이 아니라 현재 디스크(`git status`·브랜치·PR 상태), PR 설명, 공용 메모리의 정본 링크에서 상태를 복원한다([AGENTS.md 작업 시작 시 필수 읽기](../../AGENTS.md#작업-시작-시-필수-읽기)).
