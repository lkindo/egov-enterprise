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
| **L2** | DB 스키마 변경, 다중 모듈 연동, 보안 관련 핵심 로직, 의미를 바꾸는 변경(물리 스키마 H1·인가·개인정보 H3·식별자 축·게이트 의미 — §2.3) | **Strict-SOP** | 전 단계 (Full Pipeline) |

> 등급은 **모든 변경 작업에서 판정·명시**한다. 현재 사용자 요청이나 포괄 승인(§3 Stage 1)이 변경 권한을 이미 포함하더라도 등급과 SCOPE 는 축약된 형태(1줄)로 밝힌다.

---

## 3. 오케스트레이션 파이프라인 (The Pipeline)

### [Stage 1] Dispatch: 등급 판정 및 Spec 발행
- **Action**: 에이전트가 등급(L0~L2)을 제안하고 **Task Specification**을 작성한다. 현재 사용자 요청 또는 유효한 포괄 승인에 그 변경 권한이 이미 포함되면 등급·SCOPE 를 고지하고 진행하며, 포함되지 않은 L1/L2만 추가 승인을 받는다. 분석·진단 요청은 수정 권한으로 간주하지 않는다.
- **Fast-Track (L0)**: 승인 절차 없이 즉시 구현 단계로 진입 가능하다. 단, [AGENTS.md의 안전 경계](../../AGENTS.md#공통-작업-원칙)에 해당하는 작업은 L0로 분류하거나 Fast-Track으로 우회할 수 없다.
- **포괄 승인(Batch Approval)**: 사용자가 배치/연속 작업에 대해 포괄적 진행 지시(예: "진행해", "나머지 진행해")를 준 경우, 메인 에이전트는 각 항목마다 재승인을 받지 않고 **등급·SCOPE 를 1줄로 밝힌 뒤 진행**할 수 있다. 단, [AGENTS.md의 안전 경계](../../AGENTS.md#공통-작업-원칙)에 해당하는 되돌리기 어렵거나 외부 상태를 바꾸는 작업은 포괄 승인만으로 수행하지 않고 **개별 명시 승인**을 받는다. 현재 요청이 그 동작의 정확한 대상과 영향을 이미 명시 승인했다면 그 승인으로 충분하며, 범위를 벗어난 새 대상·새 동작에만 추가 승인을 받는다.
- **작업 브랜치 마무리**: 직접 맡은 작업의 PR·병합·브랜치 삭제는 [AGENTS.md의 사용자 상시 승인과 다른 작업 보호 경계](../../AGENTS.md#공유-워킹트리와-git)를 따른다. 이 상시 승인은 위 포괄 승인과 별개다 — 포괄 승인이 안전 경계를 넘지 못한다는 규칙은 이 완료 범위를 줄이지 않고, 상시 승인도 그 밖의 안전 경계 작업을 허락하지 않는다. 이미 승인된 완료 절차를 단계마다 다시 묻지 않으며, 스킬의 일반적인 선택지 제시 절차가 그 승인을 취소하지 않는다.

### [Stage 2] Execution: 자율 구현

#### 2.1 실행 방식: 직접 vs 위임 (Direct vs Delegation)
실행 방식은 **직접 하느냐, 위임하느냐** 두 갈래뿐이다.

- **Direct**: 메인 에이전트가 직접 구현 — 대부분 작업의 기본값.
- **위임(Delegation)**: 작업의 규모·성격에 따라 아래 수단에 위임한다. *수단은 오퍼레이터별 매핑 사항일 뿐, 그 자체가 규범은 아니다.*
  - *단일 서브에이전트* — 깊은 탐색·정밀 디버깅·다중 파일 조사 등 하나의 집중 작업. (Claude Code: Agent 도구 / Antigravity: 네이티브 서브에이전트·스킬)
  - *워크플로우(다중 에이전트 팬아웃)* — 대규모·기계적 반복 작업(일괄 리팩터, 전수 감사·트리아지, 마이그레이션 스윕). parallel/pipeline + verify/repair 내장. (Claude Code: Workflow 도구 — 사용자가 `ultracode` 를 쓰거나 워크플로·다중 에이전트 실행을 직접 요청했을 때만. "진행해" 같은 포괄 승인은 이 동의가 아니다 — 도구의 플랫폼 규칙이 이 문서보다 위다)

> **위임의 불변 규칙(실제로 강제되는 것)**: 무엇을 어떤 수단으로 위임하든 — ① 위임 대상에 **컨텍스트 패킷(§2.2)** 을 전달하고, ② **메인 에이전트가 산출물을 직접 재검증(§2.3)** 해야 완료로 인정한다. 위임은 이 두 규칙의 준수로만 의미를 가지며, "어떤 모드인가"라는 라벨링은 요구하지 않는다.

#### 2.2 위임 패킷 (Delegation Packet)
위임 시(단일 서브에이전트 또는 워크플로우 서브에이전트 프롬프트 포함), 메인 에이전트는 반드시 아래 **필수 컨텍스트**를 위임 대상에 전달해야 한다. 컨텍스트 없는 위임은 금지한다.

| # | 필수 항목 | 설명 |
|:---:|:---|:---|
| 1 | **Task Spec** | Stage 1에서 발행한 TASK PROPOSAL 전문 |
| 2 | **관련 헌법 조항** | 해당 작업에 적용되는 헌법 조항의 핵심 내용 (전문 복사 또는 요약) |
| 3 | **파일 맵** | 수정 대상 파일 경로 및 의존 관계 (import/참조) 목록 |
| 4 | **제약 조건** | 금지 패턴(안티패턴 3.6 참조), 네이밍 규칙, 사용해야 할 유틸리티 등 |
| 5 | **완료 기준** | 빌드 성공, 특정 테스트 통과 등 객관적 기준 (Stage 4의 증거 유형 명시). 인가·개인정보(H3)·물리 스키마(H1)·식별자 축·게이트 의미를 바꾸는 작업은 사용자 원문 요청과 그 기준의 수용 결과·금지 결과 1~3줄을 함께 적는다 |

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
- **의미를 바꾸는 변경의 독립 검토**: 인가·개인정보(H3), 물리 스키마(H1), 식별자 축(예: 소유를 `esntlId` 로 판정할지 로그인 ID 로 판정할지, DEC-OPS-358), 게이트 의미(예: `gates.json` 항목이나 census 가 무엇을 단언하는지)를 바꾸는 변경은 병합 전에 독립 적대 검토를 한 번 둔다. 검토자에게는 메인 에이전트의 Task Spec 보다 먼저 **사용자 원문 요청(그대로 인용)과 diff** 를 주고, 검토자는 재진술을 읽기 전에 오해를 드러낼 반례 1~2개를 적는다 — 재진술에 든 오해가 검토자에게 그대로 옮겨 가지 않게 한다. 감사·검증 책임은 그대로 메인 에이전트에 있다. 설계 문서를 두고 검토한 작업도 마찬가지다 — §7 의 설계 검토는 구현 전의 재진술을 보므로 구현 diff 에 대한 이 검토를 대신하지 않는다. 검토자는 가능하면 메인 에이전트와 다른 회사의 모델로 두고 모델을 명시한다(DEC-OPS-386 ⑥) — 회사는 실행 CLI 가 아니라 모델로 가린다. 보내도 되는 것과 안 되는 것은 [AGENTS.md 안전 경계의 예외](../../AGENTS.md#공통-작업-원칙)를 따른다. 템플릿은 [.agent/skills/subagent-driven-development/spec-reviewer-prompt.md](../../.agent/skills/subagent-driven-development/spec-reviewer-prompt.md)·[code-reviewer.md](../../.agent/skills/requesting-code-review/code-reviewer.md)다.

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
1. **실증적(Evidence-Based) 표준 조회**: 새 표·컬럼·물리 이름을 정하거나 메타 표준을 판정할 때, 에이전트의 지레짐작(Assumption)을 엄격히 금지한다([AGENTS.md H1](../../AGENTS.md#evidence-guardrails)). 반드시 DB 브리지(`node --env-file=.env .agent/scripts/db-bridge.js` — `.env` 의 `DB_*` 가 가리키는 DB 를 읽으며, 그 DB 는 로컬이 아니라 공유 DB 일 수 있다)로 표준 메타 테이블(`meta_standard_words`/`meta_standard_terms`/`meta_standard_domains` — DB 헌법 제2조의 유일 SSOT)과 `information_schema`를 실시간 조회하여 **"실제 존재하는"** 물리 스키마와 표준 명칭을 눈으로 확인한 뒤 실행한다.
2. **인프라 상태도 가정 금지**: DB·백엔드 서버·네트워크·포트 등 **인프라의 가용성은 착수·재개 시점에 실측**한다. 과거 세션이나 직전 단계의 상태를 그대로 가정하지 않는다. 예: DB 접속이 필요한 작업은 `db-bridge` 로 실제 응답(예: `SELECT now()`)을 먼저 확인한 뒤 진행하고, "이전에 안 됐으니 지금도 안 될 것"/"이전에 됐으니 지금도 될 것" 같은 추정으로 단정하지 않는다.
3. **헌법 위반 예측**: 요청된 작업이 헌법 조항과 충돌할 가능성이 있는지 분석한다.
4. **대응**: 표준 메타에 필요한 단어·용어가 없으면 임의로 설계하지 않고 사용자에게 상황을 보고해 새 표준 단어·용어의 등록을 요청한다(DB 헌법 제9조). 그 밖의 헌법 위반이 예상되면 해당 변경 경로를 멈추고 합치 대안을 먼저 찾으며, 대안이 승인 범위·제품 의미·규범을 바꿀 때만 사용자에게 결정 근거와 선택지를 보고한다.

#### 3.2 구현 중 감시 (On-going Monitoring)
코드를 작성하는 과정에서 실시간으로 감시하는 체크포인트:
- **DB**: 객체별 표준 접두사(`tb_`, `vw_`, `sq_`) 및 컬럼 데이터 타입 표준 준수 여부. [DB 헌법 제1조, 제3조]
- **Backend**: 레이어 간 격리(DTO 사용), 서비스 레이어 권한 재검증, 안전한 트랜잭션 사용 여부. [백엔드 헌법 제3조, 제8조, 제9조]
- **Frontend**: 서버 컴포넌트 우선 원칙, 디자인 토큰 사용, 지원 폭·확대·reflow에서 정보·기능 보존 여부. [프론트엔드 헌법 제3조, 제5조, 제6조]

#### 3.3 등급별 감사 수준
- **L0/L1**: 주요 체크포인트(3.2) 기반 약식 검사.
- **L2**: 관련 헌법 전문 대조와 Audit 리포트 필수. Audit 리포트는 PR 설명의 고정 절 `## Audit 리포트(L2)` 이며 별도 파일로 발행하지 않는다. 네 항목을 적는다 — ① H 범주(H1·H3·식별자 축·게이트 의미 가운데 해당하는 것과 판정 근거), ② 대조한 헌법 조항(예: 백엔드 헌법 제8조), ③ §2.3 독립 검토의 검토 모델(회사·모델명)과 반영 결과, ④ red 증명이 있는 곳(커밋·시험 이름·CI 잡).

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
| 화면에서 `pageIndex` 직접 계산 | 서비스의 생성 operation 계약과 query 변환 함수에서 입력 별칭을 정규화 | [프론트엔드 아키텍처 §3](../02-architecture/frontend-architecture.md#3-service-layer--data-fetching) |
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
| `npm run verify:docs` | 생성물 신선도(`npm run regen -- --check`)·전체 운영 계약·Atlas 문서 계약. 문서 전용 변경의 **넓은** 경로다 — 작업 중 최소 검사가 아니다. 문서·공용 메모리만 바꾼 작업 중에는 [AGENTS 범위별 검증](../../AGENTS.md#verification-by-change-scope)의 '관련 계약과 링크 검사'로 `npm run regen -- --check`(Atlas 신선도 포함)와 바꾼 파일을 읽는 계약만 돌린다. 예: `node --test scripts/docs-link-integrity.test.mjs`, 공용 메모리·`.agent/skills` 면 `scripts/shared-memory-contract.test.mjs`, 결정·ADR 색인이면 `scripts/atlas-catalog.test.mjs`, AGENTS·SOP 면 `scripts/governance-policy-contract.test.mjs`. 전체 운영 계약은 pre-push 가 같은 커밋에서 돌리므로 푸시 직전에 미리 돌리지 않는다(§6.2) |
| `npm run verify:fast` | docs + Java compile + FE/E2E type-check·lint(계약 codegen 은 생성물 신선도가 본다) + 빠른 Vitest(`src/__tests__`·원문 계약) |
| `npm run verify:push` | fast + governance harness. 수동 사전 검증용이며 실제 pre-push 훅의 변경분 최적화와 동일하다고 가정하지 않음 |
| `npm run verify` / `verify:full` | backend test·harness·JaCoCo·실 PostgreSQL schema-validation + frontend build·bundle·coverage. 브라우저 E2E와 원격 정책은 포함하지 않음 |
| `npm run verify:e2e` | 운영 계약·E2E type-check 후 격리 runner가 새 일회용 DB·API·FE를 생성해 Playwright 실행. 운영 대상을 향해 실행하지 않음 |
| `npm run verify:ops` | `.github/required-checks.json`과 현재 GitHub ruleset exact-match. 네트워크와 admin read 권한 필요 |

> **게이트 계층**: pre-commit은 빠른 경고, pre-push는 변경 범위별 로컬 차단, `npm run verify`(기본 `full`)는 Docker를 포함한 넓은 로컬 검증(`./gradlew localGate` 는 그 Gradle 부분집합이다), required CI는 병합 권위다. 하네스 목록·실행 소비자는 [governance gates manifest](../../config/governance/gates.json), 훅의 정확한 포함 task와 우회 경계는 [.githooks/README.md](../../.githooks/README.md), required check·review 정책은 [.github/required-checks.json](../../.github/required-checks.json)을 따른다.
>
> ⚠ **pre-push 에는 E2E 가 없다.** 로컬 게이트 전부 그린이어도 E2E 는 검증되지 않은 상태다.
> UI 를 건드리는 변경은 과거 문서나 로컬 결과로 CI 상태를 추정하지 말고, **현재 required CI와 E2E 결과를 직접 확인한 뒤에** 완료로 선언한다.
>
> ⚠ **PR 병합 시 `mergeStateStatus` 를 확인할 것.** `UNSTABLE` 은 "병합은 가능하나 **체크 실패**"
> 를 뜻한다. 자동 병합 도구가 `UNSTABLE` 을 병합 가능으로 취급하면 red CI 가 그대로 들어간다.

- **런타임 검증 불가 시 (정직한 보류)**: 인프라 제약(DB 다운·엔드포인트 인증 게이트·도구 부재 등)으로 런타임 증거를 확보할 수 없는 경우, **정적 증거로 확증 가능한 범위를 명시**하고 나머지는 근거와 함께 `deferred`로 보고한다. 보류 항목에는 재개 조건을 함께 기록한다.

#### 4.2 검증 문서화
- 작업별 분류·검증 근거는 대화, PR 설명, CI/테스트 로그처럼 해당 실행과 함께 추적되는 채널에 남긴다. 세션 저널 금지와 공용 메모리 승격 규칙은 [AGENTS.md Documentation and memory](../../AGENTS.md#documentation-and-memory)를 따른다.
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
5. DESIGN BRIEF: (설계 문서를 두고 구현 전에 검토하는 작업만) {목적 / D-n 결정 카드 / 시안 링크(비규범) / 승인 제외 범위} — §7
##############################################
-> (L1/L2 중 현재 요청·포괄 승인으로 아직 승인되지 않은 경우) 위 제안대로 진행할까요?
```

설계 문서를 두고 구현 전에 검토하는 작업은 5번 칸(DESIGN BRIEF)을 채우고 [§7 설계 검토 예산](#7-설계-검토-예산-design-review-budget)을 따른다. 그 밖의 작업은 이 칸을 비운다.

---

## 5. 운영 원칙 (Operating Principles)
- **무결성 우선**: 속도보다 중요한 것은 헌법 준수와 작동 증거이다.
- **유연한 적용**: L0 작업과 현재 요청·포괄 승인으로 이미 승인된 L1/L2 작업은 절차를 간소화(등급·SCOPE 1줄 고지)하여 사용자의 흐름을 방해하지 않는다.
- **중단 및 보고**: 예상치 못한 오류는 §2.4와 [AGENTS.md](../../AGENTS.md#공통-작업-원칙)의 원인 가설 → 표적 증거 → 최소 수정 → 재검증 순서로 복구한다. 같은 원인으로 최초 실패 포함 3회 실패하거나 새 권한·사용자 결정이 필요할 때 중단하고 근거와 선택지를 보고한다.
- **공유 워킹트리 규율**: 커밋 범위와 다른 오퍼레이터의 WIP 보존은 [AGENTS.md 공유 워킹트리와 Git](../../AGENTS.md#공유-워킹트리와-git)을 따른다.
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
- 묶더라도 red 증명은 변경 단위로 남긴다. 결정 기록(ADR·DEC)을 쓸지와 몇 건으로 쓸지는 [AGENTS.md의 기록 기준](../../AGENTS.md#documentation-and-memory)을 따른다. 묶는 대상은 병합 비용이지 추적 단위가 아니다. 병합과 PR 닫기는 사용자가 요청한 범위에서만 하며, 직접 맡은 작업의 완료 범위는 [공유 워킹트리와 Git](../../AGENTS.md#공유-워킹트리와-git)을 따른다.

### 6.2 검증은 한 커밋에 한 번
- 작업 중에는 영향 테스트만 실행한다.
- 다음 재실행은 중복이 아니다: 위임 산출물에 대한 메인 에이전트의 독립 재검증(§2.3), 게이트·계약의 red 증명(green → 위반 주입 → red → 원복 → green), 이번에 바꾼 계약·게이트의 대상 테스트 실행. "미리 돌리지 않는다"는 pre-push가 곧 돌릴 묶음 전체를 같은 커밋에서 한 번 더 돌리는 경우에만 적용한다.
- §6.4의 `verify:integrate`는 폼 census·전체 하네스의 통합 실패를 푸시 전에 드러내기 위해 이 둘을 먼저 실행한다. 이 명시적 중복은 pre-push의 같은 검사나 required CI를 생략할 근거가 아니다.
- 넓은 로컬 검증은 최신 main을 합치고 §6.4대로 다시 만든 뒤, 푸시 직전에 한 번 한다. pre-push가 곧 실행할 묶음(운영 계약, 범위별 compile·tsc·lint·폼 census·codegen 검사, `src/__tests__` Vitest, `harnessTest` — [.githooks/README.md](../../.githooks/README.md))은 같은 커밋에서 미리 돌리지 않는다 — `npm run verify`(기본 `full`)와 `verify:docs`·`fast`·`push`·`be`·`fe`·`e2e` 도 맨 앞에서 생성물 신선도와 운영 계약을(`fast`·`push`·`fe`·`full` 은 정적 검사도) 돌리므로 push 직전에 그대로 돌리면 이 묶음이 같은 커밋에서 다시 돈다. 대신 훅이 보지 않는 검사 가운데 변경이 요구하는 것을 고른다: 화면 파일을 지우거나 옮기거나 화면 문자열을 바꾸면 전체 Vitest, `foundation`·`business-*`에 클래스를 더하거나 고치면 그 모듈의 `check`(클래스별 커버리지), 엔티티·DDL을 바꾸면 `schemaValidationTest`, RSC 경계·의존성을 바꾸면 `pnpm -C frontend build`와 `bundle:check`, 컨트롤러·DTO를 바꾸면 `api-docs.json` 추출(§6.4). 해당하는 검사가 하나도 없을 때만 넓은 로컬 검증을 생략한다. required CI가 같은 범위를 돈다는 사실은 생략 사유가 아니다.
- CI 러너는 UTC, 로컬 `npm run verify`의 기본 시간대는 KST(`Asia/Seoul`)이고 명시한 `TZ`가 이긴다. 날짜 경계에 닿는 변경은 `npx cross-env TZ=UTC npm run verify:<범위>`로 한 번 더 확인한다(bash·PowerShell·cmd에서 같은 형태이고 셸 세션에 `TZ`를 남기지 않는다). pre-push는 시간대를 강제하지 않는다(그 기계의 시간대를 따른다).
- 생략했거나 CI에만 맡긴 검사는 완료 보고에 그 사실과 대신 확인할 CI 잡을 적고, 그 잡이 끝난 뒤에 완료를 선언한다.
- CI가 red이면 실패한 잡의 로그로 원인을 판정하고 그 원인에 맞는 표적 검사만 로컬에서 다시 실행한다. 인프라 일시 장애로 판정한 경우에만 실패한 잡을 재실행한다. 같은 원인의 실패 횟수는 §2.4대로 센다. 예약 워크플로가 두 번 연속 red이면 다시 green이 될 때까지 `known-gaps.md` 행(또는 같은 추적 기록)을 둔다. 연속 실패 수는 주간 거버넌스 검토 요약과 `npm run ci:flaky-report`의 예약 워크플로 표가 보여 준다.
- 훅을 우회하지 않는다(`--no-verify`, `SKIP_HARNESS=1` 포함). 같은 검사를 이미 수동으로 돌렸어도 마찬가지다. 예외는 사용자가 그 우회를 명시적으로 지시한 경우뿐이며, 실행 전 가드가 우회 플래그·환경 변수·`core.hooksPath` 변경을 보고 묻는다. pre-push에는 E2E가 없으므로 UI 변경의 완료는 required CI 결과로 판단한다(§4.1).

### 6.3 무거운 검증은 하나씩
- 다음은 한 기계에서 동시에 하나만 실행한다: 전체 Vitest, Gradle 전체 테스트·`harnessTest`·`schemaValidationTest`, `npm run verify`, 재사용 base 생성·검증(`npm run base:verify`, `base:generate-db`·`base:generate-source`, 메뉴 snapshot 갱신), 격리 E2E, 그리고 이들을 실행하는 pre-push. 워크트리가 여러 개여도 CPU·메모리·Docker를 함께 쓰므로 마찬가지다.
- 워크플로 팬아웃(§2.1)과 서브에이전트의 verify 단계도 이 규칙을 따른다. 병렬 에이전트에는 영향 테스트와 정적 검사만 맡기고, 무거운 검증은 메인 에이전트가 산출물을 통합한 뒤 한 번 순서대로 실행한다(§2.3). 병렬 에이전트·워크플로(읽기 전용 검토 포함)가 도는 동안에는 메인도 무거운 검증을 시작하지 않는다 — 2026-10-26 전체 Vitest 를 검토 에이전트 넷과 함께 돌려 실패 9건 가운데 6건이 부하에 따른 시간 초과(거짓 red)였다.
- 다른 오퍼레이터의 실행은 공용 메모리로 알 수 없다(GAP-AGENT-001). 무거운 검증을 시작하기 전에 같은 기계에서 Gradle·Vitest·Playwright·테스트 컨테이너가 돌고 있는지 프로세스 목록과 `docker ps`로 확인하고, 돌고 있으면 끝난 뒤에 시작한다. `npm run verify`·pre-push 의 [실행 기록](harness-improvement-pilot.md#관측용-실행-기록)은 시작·단계마다·종료 때 같은 기계에서 살아 있던 다른 시험·검증 실행(종류 이름만, 컨테이너는 보지 않는다)과 실행 중 바뀐 작업 트리 입력을 경고로 알리고, `node scripts/verification-record.mjs --root . summary` 는 `run-end` 가 없거나 겹쳤거나 입력이 바뀐 실행을 나열한다. 표본 사이에 시작해 끝난 실행은 보지 못하므로 경고가 없다는 사실은 겹치지 않았다는 증거가 아니다 — 위의 확인은 그대로 한다. 진단일 뿐 검사를 막거나 결과를 바꾸지 않는다.
- 다른 무거운 실행과 겹쳤던 실행은 green이든 red든 그 커밋의 증거로 쓰지 않는다. 부하는 거짓 red뿐 아니라 파일 단위 수집 누락으로 거짓 green도 만든다. 같은 명령 전체를 단독으로 다시 실행해 그 결과를 증거로 삼는다. 단독 실행에서도 재현되는 red는 실패로 다룬다. 겹친 실행에서 실패한 테스트 이름은 보고에 남기고, 같은 테스트가 단독 실행이나 CI에서 다시 흔들리면 불안정한 테스트로 보고 고친다.
- 기다리는 동안에는 읽기·편집·다음 배치 준비 같은 가벼운 작업을 한다.

### 6.4 main 최신화 뒤 생성물 재생성
`npm run merge:main`([스크립트](../../scripts/merge-main-regenerate.mjs), DEC-OPS-178)이 아래 표의 기계적인 부분을 한 번에 한다 — `--no-commit` 으로 main 을 합치고, 공용 메모리 표의 충돌을 행 단위로 합치며(같은 ID 를 양쪽이 고쳤거나 같은 새 ID 를 쓰면 멈춘다), 양쪽이 입력을 바꾼 생성물을 [생성기 목록](../../scripts/merge-main-regenerate.mjs)(`GENERATORS`)의 의존 순서대로 다시 만들고 stage 한다. 손으로 풀 충돌이 남으면 목록을 보이고 멈추며, 풀고 `git add` 한 뒤 `npm run merge:main -- --continue` 로 이어 간다. 커밋은 하지 않으므로 `git diff --cached` 로 아래 확인을 한 뒤 직접 커밋한다. `api-docs.json` 추출과 메뉴 snapshot 은 무거운 실행이라 스크립트가 하지 않는다. 하네스 manifest 의 같은 키 충돌은 양쪽 값이 다른 키를 보이고, 다른 충돌이 모두 풀렸으면 그 키의 계산값을 함께 보인 뒤 멈춘다 — 값은 사람이 옮긴다.

병합이 아니어도 생성물을 같은 생성기 목록의 순서로 한 번에 다시 만들거나(`npm run regen`) 쓰지 않고 낡은 것만 보는 명령(`npm run regen -- --check`, pre-push 맨 앞)은 [CI 가이드의 생성물 재생성](cicd-pipeline.md#생성물-재생성-npm-run-regen)을 따른다.

여러 갈래(브랜치)를 한 브랜치로 합쳤으면 `origin/main` 을 fetch 한 뒤 푸시 전에 `npm run verify:integrate` 를 한 번 돈다([판정](../../scripts/integration-precheck.mjs)) — ① `origin/main` 대비 Flyway 버전 중복·순서 밖 번호·적용된 마이그레이션 수정을 막고 메뉴 스냅숏이 낡았으면 `npm run project:menus:refresh` 를 알린다 ② `npm run regen` ③ 폼 census 검증 ④ 전체 Vitest·`:api-server:test`·전체 `harnessTest` ⑤ 바뀐 마이그레이션·엔티티의 표 이름·버전을 쓰는 schema-validation 시험(고를 수 없으면 전체)·카탈로그가 바뀌었으면 생성기 화면 시험·바뀐 E2E. 모두 순서대로 실행하며 실패하면 다음 단계로 넘어가지 않는다. §6.3 의 무거운 실행이고, 운영 계약·정적 검사는 이어지는 pre-push 가 돈다.

E2E 선별은 기준 ref부터의 커밋 변경과 index·작업 트리·미추적 파일을 함께 본다. `frontend/e2e/contracts`·`journeys`·`quality`의 추가·수정 spec만 있으면 해당 파일을, spec 삭제·이동 또는 공용 fixture·helper·setup·Playwright 설정·격리 runner·의존성 입력 변경이 있으면 기본 두 프로젝트(`api-contract`, `full-suite`) 전체를 공식 [격리 runner](../../scripts/run-isolated-e2e.mjs)로 실행한다. 해당 변경이 없으면 E2E를 실행하지 않는다. 별도 설정의 enterprise task lab이나 기본 프로젝트 밖의 spec 변경은 오류로 알리고 전용 검증을 요구한다. `.env`·junction 등 격리 runner가 거부하는 환경에서는 점검도 실패하며 안전장치를 우회하지 않는다. 이 선별은 바뀐 테스트의 실행을 보장하는 범위이고, 제품 소스 전반의 E2E 영향 분석과 병합 판정은 required CI가 맡는다. `node scripts/integration-precheck.mjs --plan [--base <ref>]`로 실행 없이 선택을 확인할 수 있다.

양쪽이 입력(소스·원장·카탈로그)을 바꾼 생성물은 텍스트 충돌이 없어도 다시 만든다. 충돌한 생성물은 한쪽을 고르거나 손으로 섞지 않는다. 입력의 충돌을 먼저 풀고 생성기로 다시 만든 뒤, 결과 diff가 두 쪽 변경의 합과 같은지 확인한다. 합을 넘는 변화(래칫 수치 상승, 새 예외, 새 분류·승인이 필요한 항목)는 재생성으로 받아들이지 않고 원인을 본다(H2).

| 생성물 | 다시 만드는 방법 |
|---|---|
| 생성기가 다시 만드는 생성물(생성 계약·권한 생성물·슬롯 레지스트리·경계 census·화면 목록과 권한 묶음·URL census 와 승인 해시·스킬 안내 파일·Atlas) | 병합은 `npm run merge:main`, 그 밖에는 `npm run regen` 이 [생성기 목록](../../scripts/merge-main-regenerate.mjs)(`GENERATORS`)의 의존 순서대로 다시 만든다 — 생성기별 명령·입력·검사 모드의 정본은 그 목록이고, 한쪽을 고르거나 손으로 섞지 않는다. URL 승인 파일은 해시만 다시 결속하고 승인 항목은 손대지 않는다. 생성이 원장 판단을 요구하며 실패하면(예: 새 권한을 어느 권한 묶음에도 넣지 않았다) 생성물이 아니라 원장을 고친다. |
| 공용 메모리 표(`decisions.md`·영역 결정 색인·결정 역사 색인·`known-gaps.md`·gap 영역 상세) | `decisions.md`, 그 「영역 결정 색인」 표가 가리키는 영역 색인(`docs/04-operations/operational-decisions-index-*.md`), [결정 역사 색인](../archived/operational-decisions-index-historical.md)은 양쪽 행을 모두 남기고 ID 순서로 합친다. 한 결정은 이 색인들 가운데 한 곳에만 있어야 한다 — 양쪽이 같은 결정을 서로 다른 색인으로 옮겼으면 한 곳으로 정하고, 두 곳에 남으면 Atlas 생성기가 red다. `known-gaps.md` 와 [gap 영역 상세](../04-operations/known-gaps-detail.md) 표는 ID 순서가 아니므로 기존 순서를 유지하고 새 행은 해당 표 끝에 둔다. 상세 행과 레지스트리 줄은 ID·우선순위·상태가 같아야 한다. 같은 ID 행을 양쪽이 고쳤으면 두 변경을 한 행으로 합친다(같은 ID가 두 줄이면 [공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs)이 red다). 두 쪽이 같은 새 ID를 썼으면 나중에 병합하는 쪽이 다음 번호로 바꾸고 참조도 함께 고친다. |
| `api-docs.json` | 합친 소스에서 `OpenApiDocumentationTest` 정적 추출로 다시 만든다([API 문서 가이드](api-documentation-guide.md)). `-Dopenapi.export.path`는 절대 경로로 준다(상대 경로는 모듈 디렉터리 기준이다). pre-push는 이 파일과 백엔드 코드의 정합을 보지 않고 CI의 `api-docs-gate`만 보므로, 양쪽이 컨트롤러·DTO를 바꿨으면 로컬에서 추출한다. |
| operation 수 | `node scripts/operation-consumer-census.mjs --json`의 `operationCount`로 `config/governance/operation-consumer-census.json`의 `expected.operationCount`를 맞춘다 — 그 대조는 배선 census 하나가 소유하고(`regen -- --check`가 먼저 본다) 생성 operation 계약은 집합만 대조한다. 원장의 unwired·화면 고아 상한도 합친 결과로 맞추며, 상한을 올려야 하면 사유를 남긴다(H2). `known-gaps.md` GAP-WIRING-001은 수치를 적지 않고 원장에 링크하므로 고치지 않는다(DEC-OPS-340). |
| `config/project-composer-menus.json`의 `sourceMigrationHash` | 메뉴 inventory(메뉴 행과 그룹별 NAVIGATION 배정)에 닿을 수 있는 SQL 입력의 해시다(형식 v2) — 반복 시드 둘과 인가 Contract는 늘, versioned migration은 [검증기](../../scripts/project-composer-menu-preview.mjs) 머리 주석의 규칙이 고른 것만 넣는다(DEC-OPS-339). 인덱스나 메뉴와 무관한 업무 테이블만 바꾼 migration은 갱신이 필요 없다. 운영 계약의 메뉴 미리보기 시험이 해시가 낡았다고 붉을 때만 `npm run project:menus:refresh`로 다시 만든다. 이 명령이 일회용 PostgreSQL 컨테이너를 만들어 쓰고 지운다([프로젝트 생성기 가이드](project-composer-guide.md)). §6.3의 무거운 실행이다. 화면 목록이 메뉴 라벨을 이 스냅숏에서 읽으므로 다시 만들었으면 `npm run regen` 을 한 번 더 돈다. 스냅숏 내용이 실제 적용 결과와 같은지는 DB 번들 생성의 내용 대조가 본다. |
| 하네스 `baseline-manifest.properties` | 서로 다른 키가 바뀌었으면 양쪽 줄을 모두 살린다. 같은 키를 양쪽이 바꿨으면 다른 충돌을 모두 푼 뒤 `node scripts/harness-baseline-manifest.mjs --keys <충돌한 키…>`로 계산값을 보고(`npm run merge:main`이 그 키와 계산값을 보인다) 그 키의 값만 옮긴다. 그 키의 입력 변경이 양쪽 모두 정당한지 확인하고(H2) 다른 키까지 통째로 다시 쓰지 않는다 — 충돌 표기가 남아 있으면 `--write`는 거부한다. 병합 뒤 `--check`로 계산값과 같은지 본다. 계산은 이 도구 하나이고, CI 에서는 운영 계약(`secret-scan`)과 하네스 메타 게이트(`backend-build`, 같은 도구의 `--check` 실행)가 대조한다. manifest 가 작업 트리에 없거나(양쪽이 다른 이름으로 옮겼거나 손으로 지웠다) 충돌 표기 없이 남으면(한쪽이 지우고 다른 쪽이 고쳤거나 이미 손으로 풀었다) `npm run merge:main` 은 키 없이 그 사정을 안내한다 — 남길지 지울지 정하고, 남기면 `--check` 로 대조한다. |
| 그 밖의 해시 결속·수치(disposition overlay의 `manifestRef.sha256` ← `config/ui-route-capabilities.json`, 재사용 base `databaseSnapshot` 수 등) | 실패한 계약이 가리키는 생성 명령과 기대값을 따른다. 해시는 입력이 정당하게 바뀐 경우에만 다시 결속하고, 수치는 양쪽 변경을 합산하거나 실측으로 다시 구한다. 래칫을 올려야 하면 재생성이 아니라 H2 판단이다. |

재생성 결과는 대부분 pre-push의 운영 계약과 codegen 검사가 확인한다. 예외는 위 `api-docs.json` 행이다.

### 6.5 세션 나누기(권장)
- 긴 연속 작업은 배치(PR) 경계에서 새 세션으로 이어 가기를 권한다. 컨텍스트 압축이 반복되면 이미 확인한 사실을 다시 도출하는 비용이 커진다.
- 새 세션은 이전 대화의 요약이 아니라 현재 디스크(`git status`·브랜치·PR 상태), PR 설명, 공용 메모리의 정본 링크에서 상태를 복원한다([AGENTS.md 작업 시작 시 필수 읽기](../../AGENTS.md#작업-시작-시-필수-읽기)). 영역 결정 색인은 자동으로 다시 읽히지 않으므로, 새 세션이나 컨텍스트 압축 뒤에 변경을 이어 가면 대상 경로가 걸리는 영역 색인을 다시 읽는다.

### 6.6 작업 트리
작업 트리는 같은 워킹트리·index 를 나눠 쓰는 동시 작업을 떼어 놓는 수단이다([AGENTS.md 공유 워킹트리와 Git](../../AGENTS.md#공유-워킹트리와-git), DEC-OPS-385). 실행 잠금은 두지 않는다 — 시작 전 확인(§6.3)이 겹침을 막는 수단이고, 실행 기록은 표본 시점에 보인 겹침만 사후에 알린다.
- **언제**: 다른 오퍼레이터(다른 에이전트 세션·사용자)가 같은 워킹트리에서 동시에 작업하거나 그 WIP 가 고칠 파일에 섞여 있으면 `git fetch origin` 뒤 `git worktree add <경로> -b <브랜치> origin/main` 으로 따로 만든다. 혼자 순서대로 작업하거나, 자기가 띄운 서브에이전트·워크플로가 위임 명세의 FILE MAP(§3 Stage 2)을 겹치지 않게 나눠 일하면 만들지 않는다 — 같은 파일을 고치는 위임은 순서대로 돌린다.
- **경로**: 원본 checkout 밖, 드라이브 루트 가까운 짧은 경로에 `wt-<짧은 이름>` 으로 만든다(예: `D:\wt-board`). 짧게 두는 것은 Windows 경로 길이 때문이다. 경로의 어느 디렉터리 이름도 `quality`·`journeys`·`contracts` 로 끝나지 않게 한다 — E2E 선별이 spec 의 절대 경로를 프로젝트 매처에 대조해 소유가 모호하다고 붉다.
- **훅**: `core.hooksPath` 는 [훅 안내](../../.githooks/README.md)대로 상대 경로 `.githooks` 로 둔다. 절대 경로면 모든 작업 트리의 push 가 그 경로의 훅을 돌아, 브랜치가 고친 훅이 아니라 다른 checkout 의 훅으로 검사한다. 작업 트리를 만들 때 `git config --get core.hooksPath` 로 확인하고, 절대 경로면 모든 작업 트리가 함께 쓰는 설정이므로 바꾸기 전에 보고하고 묻는다.
- **의존성**: `frontend/node_modules` 를 링크(junction)로 빌려 쓰면 Turbopack 이 작업 트리 밖을 가리키는 링크를 풀지 못해 `pnpm -C frontend build` 와 격리 E2E 가 실패한다. 빌드는 원본 checkout 이나 의존성을 실제로 설치한 작업 트리에서, 격리 E2E 는 의존성을 실제로 설치했고 `.env` 가 없는 작업 트리에서 돈다 — runner 가 `.env` 를 거부하므로 옮기거나 이름을 바꾸지 않는다.
- **비밀 검사**: 작업 트리의 `.git` 은 원본을 가리키는 파일이라, 작업 트리 경로만 컨테이너에 마운트한 gitleaks 는 커밋을 읽지 못하고 `no leaks` 를 낸다. 원본 저장소 경로로 검사하거나 `git archive` 로 꺼낸 파일을 검사한다.
- **무거운 검증**: 작업 트리가 여러 개여도 한 기계에서 하나씩 돈다(§6.3).
- **정리**: 병합 뒤 브랜치 삭제와 작업 트리 디렉터리 삭제는 별개다. 디렉터리와 그 안의 미추적 산출물은 직접 만든 것이라도 사용자가 그 삭제를 승인했을 때만 지운다([AGENTS.md 공유 워킹트리와 Git](../../AGENTS.md#공유-워킹트리와-git)). 지울 때는 링크(junction)를 먼저 끊어 링크 너머의 원본을 지우지 않게 한다. 직접 만들지 않은 작업 트리는 다른 도구가 프로세스 목록에 경로를 드러내지 않고 쓰고 있을 수 있으므로, 상태를 조사해 보고하고 지우기 전에 묻는다.

---

## 7. 설계 검토 예산 (Design Review Budget)

설계 문서(설계서·결정 카드)를 두고 구현 전에 검토하는 작업에 적용한다. 모든 오퍼레이터와 워크플로 팬아웃 검토에 같이 적용하고, 워크플로 한 번은 한 라운드로 센다. 이 절은 검토의 반복 비용만 줄인다. 구현 diff 의 감사(Stage 3)·증거(Stage 4), H1~H5, red 증명, 승인 경계는 그대로다. 결정 기록은 [DEC-OPS-382](../../.agent/memory/decisions.md)다.

### 7.1 결정 카드
- 설계서는 첫 쪽에 결론 요약과 결정 카드 표를 둔다. 열은 `D-n | 결정 | 관련 H | 영향 계약 파일(원장·DTO·Flyway·게이트) | 부정 시험`이다.
- 다시 검토할 때는 직전 판본 대비 바뀐 D-n 행과 계약 diff 만 본다.
- 구현 중에 정한 세부와 구현 기록은 설계서에 덧붙이지 않고 PR·커밋 설명에 둔다. 판단을 뒤집은 근거만 해당 D-n 행에 한 줄로 남긴다.

### 7.2 결정 유형별 확정 수단

| 유형 | 예 | 확정 수단 |
|---|---|---|
| 화면 확인 | 탭 분할, 목록 열 구성·순서, 마법사 단계, 확인 대화상자 흐름, 문구·용어, 키보드 흐름 | 시안(패턴 갤러리 또는 저장소 밖 비규범 아티팩트)과 구현 PR 의 화면 캡처 |
| 계약·의미 검토 | 인가 응답 코드와 존재 노출(H3), 집행 경로의 빠짐없음, 스키마·표준 용어(H1), 잠금·버전·원자성, 기존 데이터 진단·보정, 부정 시험(H5), 게이트·원장 변경(H2) | file:line 근거가 있는 검토와 구현 PR 의 게이트 |
| 정직성 계약 | 서버 의미가 걸린 화면 문구(권한 안내, 상태 표시) | 정직성 계약 시험 |
| 혼합 | IA 위치·메뉴 노출 | 시안으로 후보를 정하고 처분 원장 PR 리뷰(ADR-0007)로 확정 |

**시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다.** 그 승인은 [AGENTS.md의 안전 경계](../../AGENTS.md#공통-작업-원칙)를 따르고, 대상과 제외 범위를 적은 별도 승인으로 남긴다.

### 7.3 검토 상한

| 바뀌는 것 | 검토 |
|---|---|
| 화면만 바뀌는 결정 | 시안 확인과 1관점 검토 |
| 의미가 바뀌는 L1 | 적대 검토 1회(2관점). major 지적만 반증 검증한다 |
| 인가·스키마·데이터를 건드리는 L2 | 최대 2회. 2회차는 바뀐 D-n 행과 계약 diff 만 본다 |

- 지적은 file:line 근거가 있어야 받는다. 근거 없는 관점별 지적은 재판정 라운드에 넣지 않는다.
- minor 지적은 고친 뒤 재확인 라운드를 돌리지 않는다.
- DDL 세부(정확한 CHECK 식, 인덱스 여부)는 설계에 의도와 제약만 적는다. 확정은 구현 PR 의 Flyway diff 를 무중단 린터·`schemaValidationTest`·live 메타 조회가 판정한다.
- 상한을 넘겨야 하면 그 이유를 PR 설명에 적는다.

### 7.4 측정
- 설계 검토를 거친 PR 설명에 라운드·관점·지적·채택·구현 단계에서 뒤집힌 결정의 수를 적는다.
- 3~5건이 쌓이면 채택률이 낮은 관점과 라운드부터 줄인다. 값은 공용 메모리에 다시 적지 않는다.
- 인가·개인정보(H3), 물리 스키마(H1), 식별자 축, 동시성·잠금, 게이트 의미를 보는 관점은 채택률로 줄이지 않는다 — 드물지만 큰 결함을 보는 관점은 본래 채택률이 낮다. 줄일지는 채택 수와 함께 major 지적, 구현 단계·병합 뒤에 뒤집힌 결정을 보고 판단한다.
