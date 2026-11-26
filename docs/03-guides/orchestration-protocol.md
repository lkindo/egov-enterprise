# Strict Orchestration Protocol (SOP)

## 1. 개요 (Overview)

본 프로토콜은 **메인 에이전트(오퍼레이터)와 서브에이전트·워크플로우 간 협업**을 위한 **표준 실행 규약**이다. [AGENTS.md](../../AGENTS.md)가 최상위 프로젝트 공통 계약이며, Antigravity/Gemini·Claude Code·Codex 등 모든 오퍼레이터는 동일 워킹트리 규율과 본 프로토콜을 따른다.

---

## 2. 태스크 등급 분류 (Task Grading)

저장소 파일·Git·원격·운영 상태를 바꾸는 **변경 작업** 착수 시 등급을 판정·명시한다. 답변·설명·읽기 전용 감사·상태 보고는 등급 대상이 아니다.

| 등급 | 정의 | 적용 경로 | 필수 게이트 |
|:---:|:---|:---:|:---|
| **L0** | 단순 오타, 스타일(CSS), 주석 추가 등 저위험 작업 | **Fast-Track** | 약식 Audit, Verification |
| **L1** | 단일 파일 로직 수정, 신규 컴포넌트 작성, 버그 수정 | **Standard** | Dispatch, Audit, Verification |
| **L2** | DB 스키마 변경, 다중 모듈 연동, 보안 핵심 로직, 의미를 바꾸는 변경(물리 스키마·식별자 축 H1·게이트/신호 경계 H2·인증·인가·개인정보 H3) | **Strict-SOP** | 전 단계 + H1·H2·H3 필수 독립 검토(그 외 L2 선택) 및 PR Audit 리포트 |

> 등급은 **모든 변경 작업에서 판정·명시**한다. 현재 사용자 요청이나 포괄 승인(§3 Stage 1)에 권한이 포함되면 등급·SCOPE 1줄로 고지하고 진행한다.

---

## 3. 오케스트레이션 파이프라인 (The Pipeline)

### [Stage 1] Dispatch: 등급·승인 경계 판정
- **포괄 승인 vs 개별 명시 승인 경계**:
  - 현재 사용자 요청 또는 유효한 포괄 승인("진행해")에 변경 권한이 이미 포함되면 재승인 없이 등급·SCOPE를 고지하고 진행하며, 포함되지 않은 L1/L2만 추가 승인을 받는다. 분석·진단 요청은 수정 권한으로 간주하지 않는다.
  - 단, [AGENTS.md의 안전 경계](../../AGENTS.md#공통-작업-원칙)(대량 삭제, 운영/코어 데이터 DML, DB 스키마·인프라 변경, 외부 발행·전송, 강제 푸시)에 해당하는 작업은 L0로 분류하거나 Fast-Track·포괄 승인으로 우회할 수 없으며 반드시 **개별 명시 승인**을 받는다. 현재 요청이 정확한 대상과 영향을 이미 명시 승인했다면 중복 질문하지 않고, 범위를 벗어난 새 대상·새 동작에만 추가 승인을 받는다.
  - **작업 브랜치 마무리**: 직접 맡은 작업의 PR·CI·병합·브랜치 삭제는 [AGENTS.md 공유 워킹트리와 Git](../../AGENTS.md#공유-워킹트리와-git)의 상시 승인을 따른다(포괄 승인과 별개). 상시 승인도 그 밖의 안전 경계 작업을 허락하지 않는다.

### [Stage 2] Execution: 직접 구현 vs 위임

#### 2.1 실행 방식 (Direct vs Delegation)
- **Direct(기본)**: 메인 에이전트가 직접 구현한다.
- **위임(Delegation)**: 단일 서브에이전트(깊은 탐색·정밀 작업) 또는 워크플로우(대규모 반복 — 사용자가 직접 요청한 경우에만 사용; "진행해" 같은 포괄 승인은 워크플로 도구의 동의가 아님).

#### 2.2 위임 패킷 (Delegation Packet)
위임 시 반드시 5항목 컨텍스트를 전달한다: ① **Task Spec**(목표·범위), ② **적용 헌법 조항**, ③ **파일 맵**, ④ **제약 조건**(Do-Not-Break·금지 패턴), ⑤ **완료 기준**(H1·H2·H3 변경 시 사용자 원문 요청과 Green/Red AC 1~3줄 포함).

#### 2.3 Audit 귀속 원칙 및 위임 산출물 직접 재검증
- **위임한 구현이라도 감사(Stage 3)와 검증(Stage 4) 책임은 메인 에이전트에 있다.**
- 서브에이전트/CLI/워크플로우가 자체 내부 검증 통과를 보고하더라도 완료 증거로 신뢰하지 않고, **메인 에이전트가 현재 디스크에서 Diff를 직접 검토하고 게이트(§4.1)를 직접 재실행**한다.
- **H1·H2·H3 변경의 필수 독립 검토(그 외 L2 는 위험에 따라 선택 적용)**: H1(물리 스키마·식별자 축)·H2(게이트/신호·동결 기준선·거버넌스 경계)·H3(인증·인가·개인정보)에 해당하는 변경은 병합 전 1회 독립 적대 검토를 둔다(가능하면 메인 에이전트와 다른 회사 모델 사용 — CLI가 아니라 모델 기준, `DEC-OPS-386 ⑥`·`DEC-OPS-436`). 그 외 L2 변경의 타사 독립 검토는 위험에 따라 선택 적용한다. 검토자에게는 Task Spec 재진술보다 먼저 **사용자 원문 요청과 diff**를 주어 반례 1~2개를 먼저 도출하게 한다. 비밀·토큰·개인정보·운영 데이터·`.env`는 전송하지 않는다([AGENTS.md 안전 경계 예외](../../AGENTS.md#공통-작업-원칙)). 설계서 사전 검토(§7)는 구현 diff 검토를 대신하지 않는다.

#### 2.4 실패 복구 프로토콜 (3회 실패 중단 원칙)
- 오류는 `원인 가설 → 표적 증거 → 최소 수정 → 재검증` 순으로 복구한다.
- **같은 원인 가설별로 최초 실패를 포함해 총 3회 실패하면 직접 재시도를 즉시 중단하고 실패 이력·현재 증거·선택지를 사용자에게 보고한다.**
- 헌법 위반이 발견되면 해당 경로를 멈추고 위반 조항과 대안을 제시한다(승인 범위 내 명백한 구현 위반은 바로 수정, 규범·제품 의미 변경은 사용자 결정).

### [Stage 3] Audit: 헌법 합치성 및 L2 리포트

- **사전 실증(Pre-Audit)**: 스키마/물리명 변경 시 추정 금지([H1](../../AGENTS.md#evidence-guardrails)) — `node --env-file=.env .agent/scripts/db-bridge.js`로 live `meta_standard_*`와 `information_schema`를 조회하며, 인프라 가용성도 착수 시 실측한다.
- **L2 `## Audit 리포트(L2)`**: L2 변경의 PR 본문에는 별도 파일이 아닌 고정 절 `## Audit 리포트(L2)`를 두고 4항목을 적는다 — ① H 범주(H1·H2·H3 해당 여부와 판정 근거), ② 대조한 헌법 조항, ③ §2.3 독립 검토 모델(회사·모델명, H1·H2·H3 외 L2 선택 생략 시 사유)과 반영 결과, ④ red 증명 위치(커밋·시험·CI 잡).

### [Stage 4] Verification: 증거 기반 완료

#### 4.1 도메인별 완료 증거
| 작업 도메인 | 필수 증거 (게이트) |
|:---|:---|
| **UI/Frontend** | `pnpm -C frontend run type-check` · `lint` · `test:form-validation` · `pnpm -C frontend build`(RSC/번들) · Playwright E2E(**pre-push에는 E2E가 없으므로 required CI 결과 직접 확인**). |
| **Backend/API** | `./gradlew compileJava compileTestJava` · `./gradlew :api-server:harnessTest` · 관련 JUnit/ArchUnit. |
| **Database** | `db-bridge` 실측 · `./gradlew :api-server:schemaValidationTest`(실 PostgreSQL + Flyway + `ddl-auto:validate`; H2 단위 테스트는 스키마 증거가 아님). |
| **게이트·계약(H5)** | 대상 테스트 그린 + **의도적 위반 주입 시 red 되는 부정 증명**. |

> ⚠ **PR 병합 시 `mergeStateStatus` 확인**: `UNSTABLE`은 체크 실패 상태다. `node scripts/pr-checks-wait.mjs --pr <번호> --sha <HEAD>`로 required 체크 6/6 통과(`RESULT=pass`)와 `CLEAN`을 확인한 뒤 병합한다. 인프라 제약으로 미검증인 항목은 `deferred`와 재개 조건을 정직하게 보고한다.

---

## 4. 표준 위임 명세서 (TASK PROPOSAL)

```text
### [SOP] TASK PROPOSAL (Grade: L0/L1/L2) ###
1. TARGET: {경로}  2. SCOPE: {범위}  3. MODE: [Direct / Subagent / Workflow]
4. CONSTITUTION: [관련 헌법]  5. DESIGN BRIEF: (설계 사전 검토 시만 §7)
```

---

## 5. 운영 원칙

- **무결성 우선** · **유연한 적용**(승인 내 L0/L1/L2 1줄 고지) · **3회 실패 중단 보고**(§2.4) · **공유 워킹트리 규율**([AGENTS.md](../../AGENTS.md#공유-워킹트리와-git)) · **정직한 보고**(추정/미검증 완료 금지).

---

## 6. 연속 배치 작업의 시간 예산 (Batch Time Budget)

반복 비용만 줄이고 권한 범위·H1~H5·훅·required CI 병합 권위·위임 재검증(§2.3)·red 증명은 그대로 유지한다([AGENTS.md](../../AGENTS.md#연속-작업의-시간-예산), `DEC-OPS-177`).

### 6.1 PR 묶기
- 응집된 배치는 PR 하나로 묶는다. 스택 PR은 푸시 전에 끝 PR의 base를 `main`으로 바꾼 뒤(`gh pr edit <N> --base main`) 한 번에 병합한다.

### 6.2 검증은 한 커밋에 한 번
- 작업 중에는 영향 테스트(`node scripts/impact-tests.mjs --diff origin/main`)와 바꾼 계약만 돌리고, `pre-push`가 곧 실행할 묶음 전체를 같은 커밋에서 중복 실행하지 않는다. `verify:docs`는 문서 변경의 넓은 경로이지 작업 중 최소 검사가 아니다.
- 단, 위임 산출물 재검증(§2.3)·게이트 red 증명(H5)·신규/수정 계약 단독 확인과 `pre-push`가 안 보는 검사(컨트롤러 변경 시 `api-docs.json`, DDL 변경 시 `schemaValidationTest`, RSC 변경 시 `pnpm -C frontend build`, 날짜 경계 시 `TZ=UTC`)는 생략하지 않는다.
- `[DEC-OPS-434]` 작업 브랜치(`refs/heads/*`, `main`/`master` 제외) push 시 `pre-push`는 로컬 운영 계약을 생략하고 PR Required CI(`secret-scan` — 일반 PR `:core`, 생성기/`frontend/src`/`business-app/src`/스킬/`docs/README.md`/`atlas-*`/정책/미지/`main` 전체)로 일원화한다(`GAP-WIN-001` Windows 분기 스크립트/훅 변경 시 수동 검증).
- **훅 비우회**: `--no-verify`·`SKIP_HARNESS=1` 등 훅 우회는 사용자가 명시적으로 지시한 경우 외에는 금지한다. CI red 시 실패 잡 로그로 원인을 판정한다(인프라 장애만 재실행, 예약 워크플로 2회 연속 실패 시 `known-gaps.md` 추적).

### 6.3 무거운 검증은 하나씩
- 한 기계에서 전체 Vitest, Gradle 전체 테스트/`harnessTest`/`schemaValidationTest`, `npm run verify`(운영 계약 분할 포함), 재사용 base 생성/검증, 격리 E2E, `pre-push`는 동시에 하나만 실행한다.
- Windows에서는 `scripts/heavy-run-queue.mjs`가 대기열을 직렬화한다(`DEC-OPS-413`: 관측 가능한 남은 실행 대기, 미확인 시 `confirm-idle` 대기, **대기열은 증거를 만들거나 면제하지 않음**, 관측 밖 실행은 `GAP-AGENT-001` 수용 위험, 에이전트 임의 `EGOV_HEAVY_RUN_QUEUE=off` 금지).
- 병렬 에이전트·검토 중에는 메인도 무거운 검증을 돌리지 않으며, **다른 무거운 실행과 겹쳤던 실행은 green이든 red든 증거로 쓰지 않고 단독 재실행한다**.

### 6.4 main 최신화 뒤 생성물 재생성
- `npm run merge:main`(`scripts/merge-main-regenerate.mjs`)으로 `origin/main` 합치기, 공용 메모리 표(`decisions.md` ID순, `known-gaps.md` 기존순+끝 추가 — 같은 ID 충돌 시 수동 조정) 병합, 입력이 바뀐 `GENERATORS` 재생성을 실행한다.
- 생성물(`api-docs.json`, `config/ui-url-state-approval.json` 수동 원장, `operation-consumer-census.json`, `config/project-composer-menus.json`의 `sourceMigrationHash`)은 임의 손병합 없이 정본 입력을 기준으로 다시 만든다(래칫 상승은 H2 판단). 여러 갈래 통합 시 `npm run verify:integrate`를 푸시 전에 실행한다.

### 6.6 작업 트리
작업 트리는 동시 작업 분리 수단이며 배정에 별도 잠금 파일을 두지 않고 무거운 검증만 §6.3 대기열을 쓴다(`DEC-OPS-395`·`413`·`414`).

| 작업 주체 | 고정 작업 트리 |
|---|---|
| Codex | `D:\wt-egov-codex` |
| Claude Code | `D:\wt-egov-claude` |
| Antigravity/Gemini | `D:\wt-egov-gemini` |

- **고정 트리 우선 + 한 세션 전용**: 자기 고정 트리의 `git status`·브랜치·실행 중 프로세스를 확인해 detached HEAD & clean & 미사용일 때만 `git switch --no-track -c <브랜치> origin/main`으로 시작한다(자동 `stash`/강제 `reset`/`clean -fdx` 금지). 사용 중이거나 불명확하면 기존 트리를 보존하고 사용자 승인 후 임시 트리로 분리한다(`scripts/agent-guard.mjs`가 모든 `git worktree add`를 물음).
- **경로·훅·가드·의존성**: `core.hooksPath`는 상대 경로 `.githooks` 유지, 대상 트리에서 `echo AGENT_GUARD_CANARY` 차단 확인, 의존성은 실제 설치 유지(`frontend/node_modules` junction 금지). 경로에 `quality`·`journeys`·`contracts` 끝 이름 사용 금지.
- **완료·정리**: 자기 PR 병합·원격 반영 확인 뒤 내가 연 프로세스만 닫고 `git fetch --no-prune origin` → `git switch --detach origin/main`으로 복귀하며 자기 작업 브랜치만 삭제한다(고정 디렉터리·의존성·캐시 유지). 임시 트리는 사용 잔여가 없을 때 완료 보고에서 삭제 승인을 받고, 삭제 시 `node_modules`·`build/` 내부 junction을 먼저 끊고 드라이브 포함 절대 경로로 지운다.

---

## 7. 설계 검토 예산 (Design Review Budget)

설계서(결정 카드 `D-n`) 사전 검토에 적용하며 H1~H5·red 증명·승인 경계는 그대로다(`DEC-OPS-382`·`385`).

### 7.2 결정 유형별 확정 수단
- **시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다.** 화면 확인(시안·캡처)과 계약/의미 검토(H1·H3·H5·file:line 근거), 정직성 계약 시험을 분리한다.
- **검토 상한**: 화면만 변경(시안+1관점) / 의미 변경 L1(적대 검토 1회·2관점) / 인가·스키마·데이터·게이트 L2(최대 2회 — 2회차는 변경 D-n·계약 diff만). H1·H2·H3·동시성 관점은 채택률로 줄이지 않는다.

### 7.4 측정
- 설계 검토 PR 본문에 라운드·관점·지적·채택·구현 시 뒤집힌 결정 수를 기록한다(공용 메모리 재기재 금지).

---

## 8. 전 생명주기 연결: 정보공학(IE) 뼈대와 애자일 실행 (Lifecycle Integration)

- **사업 앞단(`P0~P3`)과 구현(`P4`, SOP §1~§6)**: 원시 근거·Fit-Gap·백로그·IE 바인딩은 checkout 밖 `--workspace`(`scripts/export-deliverables-workspace.mjs`)에서 관리하고, `P4` 구현 전 L1/L2·의미 변경은 대상 식별자·인가 의미·식별자 축·Green/Red AC를 먼저 확정한다.
- **수직 슬라이스·전환(`P5`)**: `scripts/domain-registration-doctor.mjs` 점검 + `npm run regen` 동기화 후, 실제 운영 적용/이관은 개별 명시 승인 아래 `adoption:check`·`--execute`·`export-deliverables.mjs`(`DEC-OPS-397`) 절차를 따른다.
