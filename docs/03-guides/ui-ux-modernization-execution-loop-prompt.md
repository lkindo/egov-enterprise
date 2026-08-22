# UI/UX 현대화 완주 루프 프롬프트

이 프롬프트는 [UI/UX 전면 현대화 계획](../02-architecture/ui-ux-modernization-plan.md)을 현재 저장소에서 끝까지 실행하도록 Claude Code, Codex, Gemini 등 코드 에이전트에 전달하는 vendor-neutral 실행 계약이다. 새 세션의 첫 사용자 메시지로 아래 블록 전체를 붙여 넣는다.

전제:

- 안전하고 가역적인 저장소 내부 작업에는 포괄 승인을 부여한다.
- 운영 데이터·DB 스키마·인가 완화·외부 발행·메시지·커밋·푸시·병합 같은 별도 승인 경계는 포괄 승인에 포함되지 않는다.
- 실제 사용자 조사, IA 소유자 승인, 외부 CI와 같이 에이전트가 만들 수 없는 증거는 조작하지 않는다.
- 진행 상태를 저장소의 세션 저널이나 공용 메모리에 쓰지 않고 현재 디스크, Git diff, 테스트 증거와 대화 컨텍스트에서 복원한다.

## 전체 프롬프트

````text
당신은 `D:\project\egov-enterprise` 저장소의 UI/UX 현대화를 끝까지 수행하는 주 실행 오퍼레이터다.

<mission>
`docs/02-architecture/ui-ux-modernization-plan.md`의 모든 작업과 Gate를 현재 디스크의 사실에 맞게 실행하고, 같은 문서 §19의 완료 정의를 실제 증거로 모두 만족시켜라.

목표는 체크리스트를 지우는 것이 아니라 다음 결과를 증명하는 것이다.

1. 실제 사용자와 프레임워크 채택자가 핵심 과업을 더 안전하고 명확하게 완료한다.
2. public portal, authenticated workspace, administration console과 reusable profile의 경계가 정직하다.
3. KRDS profile, WCAG 2.2, 상태·권한·개인정보·반응형·성능 계약이 구현과 검증에서 일치한다.
4. core/collaboration/demo 산출물이 각자의 소유 경계를 지키고 실제로 build·smoke 검증된다.
5. 완료되지 않았거나 외부 증거가 필요한 항목을 완료로 가장하지 않는다.
</mission>

<normative_sources priority="high-to-low">
작업 시작과 재개 시 반드시 현재 디스크에서 아래 원본을 다시 읽어라. 기억이나 과거 보고보다 현재 파일이 우선한다.

1. `AGENTS.md`
2. `docs/03-guides/orchestration-protocol.md`
3. `.agent/memory/project-context.md`
4. `.agent/memory/decisions.md`
5. `.agent/memory/known-gaps.md`
6. `docs/02-architecture/ui-ux-modernization-plan.md`
7. `docs/02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md`
8. `.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md`
9. 관련 백엔드·DB 헌법, accepted ADR, pending decision, 현재 코드·설정·DB 실측

저장소 밖의 과거 Claude 계획은 역사적 입력일 뿐 실행 권위가 아니다. 현대화 계획과 현재 디스크가 우선한다.
</normative_sources>

<standing_authorization>
이 프롬프트는 다음에 대한 포괄 진행 승인이다.

- 읽기 전용 조사, census, 코드·문서·테스트 검토.
- 계획에 명시된 안전하고 가역적인 로컬 파일 생성·수정.
- 관련 unit/integration/build/E2E와 read-only DB 진단 실행.
- 계획 범위의 small-batch refactor, 접근성 수리, 테스트·계약 추가.
- 독립적이고 파일 경계가 분명한 조사·구현의 서브에이전트 위임.

다음 권한은 포함하지 않는다. 필요하면 정확한 대상·영향·복구 방법을 설명하고 명시 승인을 받아라.

- 운영 또는 core 데이터 DML, DB 스키마/Flyway 변경과 infrastructure 변경.
- proxy allowlist 완화, 인증·인가 의미 변경, 권한 정책 변경.
- 대량 삭제, 광범위 이동, 복구 곤란한 filesystem 작업.
- 비밀·개인정보·사용자 원시 데이터를 외부 서비스나 분석 도구에 전송.
- 외부 메시지·발행·이슈/PR 생성, 패키지/plugin 설치.
- commit, push, merge, force push, release.

위 경계 밖 작업을 우회하거나 작은 작업으로 쪼개 사실상 수행하지 마라.
</standing_authorization>

<non_negotiable_truth_rules>
- 현재 상태를 직접 측정하라. 원안의 숫자나 과거 세션 보고를 사실로 재사용하지 마라.
- `rg` 참조 0만으로 dead code를 판정하지 마라. route entry, static/dynamic import, test-only, 문서/public contract, reusable profile의 transitive reachability를 확인하라.
- 페이지 수, component 수, LOC, axe 실행 수, snapshot 수를 UX·접근성·성능 결과와 등치하지 마라.
- `virtual-scroll-list.tsx`처럼 이미 반례가 확인된 파일을 근거 없이 삭제 후보로 되돌리지 마라.
- 119개 page에 조상 error boundary가 있다는 현재 사실을 무시하고 페이지별 `error.tsx`를 기계적으로 증설하지 마라.
- `StandardDataTable` 위에 pagination·empty·selection 계약을 중복 합성하지 마라. 먼저 현재 계약과 접근성 결함을 characterization test로 고정하라.
- 중앙 거대 query-key registry와 임의의 HydrationBoundary 개수 quota를 만들지 마라. domain-owned hierarchy와 측정 기반 data ownership을 사용하라.
- generator가 proxy allowlist, 실행 가능한 menu SQL, menuSn/parent/order/role을 추론하게 하지 마라.
- demo·partial·unavailable 화면과 출처 없는 수치를 live 기능처럼 꾸미지 마라.
- 자동 axe green만으로 WCAG/KWCAG 준수를 선언하지 마라.
- 실제 참여자·운영 RUM·required CI 결과를 만들거나 추정하지 마라.
- 테스트를 통과시키려고 baseline, threshold, population, assertion, exclusion 또는 waiver를 약화하지 마라.
</non_negotiable_truth_rules>

<boot_sequence>
매 세션 시작 및 컨텍스트 압축 후 재개 시 다음 순서를 수행하라.

1. `git status --short`와 현재 branch/worktree를 확인한다.
2. 위 normative sources와 대상 디렉터리의 추가 `AGENTS.md`를 읽는다.
3. 현재 diff를 파일별로 검사해 기존 사용자/다른 에이전트 WIP와 이 루프의 변경을 구분한다. 모르면 보존한다.
4. 현대화 계획 Task 0.1~6.1과 §19 완료 조건을 현재 증거에 대조한다.
5. 각 항목을 `verified-complete | eligible | blocked-input | blocked-external | superseded-by-evidence`로 메모리 내 상태화한다. 진행률 파일이나 세션 저널을 저장소에 만들지 않는다.
6. 이미 완료됐다고 보고된 항목도 current diff·test·artifact가 없으면 완료로 간주하지 않는다. 반대로 현재 증거로 완료된 작업을 반복하지 않는다.
7. 선행조건이 충족된 `eligible` 작업 중 위험을 가장 먼저 줄이고 다음 작업을 열어 주는 가장 작은 단위를 선택한다.
8. 첫 commentary에 다음 한 줄을 출력하고 곧바로 작업한다.

`[LOOP n][L0|L1|L2] <Task ID/목표> — SCOPE: <파일·도메인> — MODE: Direct|Delegated`
</boot_sequence>

<execution_loop>
안전하게 실행할 작업이 남아 있는 동안 아래 루프를 반복하라. 단지 계획을 다시 설명한 뒤 멈추지 마라.

```text
LOOP:
  A. RECONCILE
     - 현재 디스크, diff, 테스트, 인프라와 계획을 다시 대조한다.
     - prerequisite와 승인 경계를 확인한다.

  B. SELECT
     - 선행조건을 만족한 가장 작은 고가치 작업 하나를 선택한다.
     - 한 번에 하나만 in-progress로 둔다.
     - 독립 조사나 완전히 분리된 파일 집합은 병렬 위임할 수 있다.

  C. SPECIFY
     - 등급 L0/L1/L2, 목표, exact file set, 헌법 조항, 완료 기준, 검증 명령을 고정한다.
     - 포괄 승인 범위면 재승인을 기다리지 않고 진행한다.
     - 별도 승인 경계면 구현하지 말고 승인 요청 후보에 넣은 뒤 다른 eligible 작업을 계속한다.

  D. BASELINE / RED
     - 현재 동작과 모집단을 계측한다.
     - 버그 수정·게이트 신설이면 가장 가까운 failing test 또는 temp fixture red를 먼저 만든다.
     - 실제 제품 데이터를 훼손하는 red 주입은 금지한다.

  E. IMPLEMENT
     - 요청을 충족하는 최소 변경을 한다.
     - 구조 이동, behavior 변경, visual 변경, 삭제는 검토·rollback 가치가 있으면 별도 작은 변경으로 격리한다.
     - 다른 WIP와 무관한 포맷 변경·대량 치환을 하지 않는다.

  F. SELF-AUDIT
     - diff를 직접 읽고 scope creep, 인가 완화, 데이터 노출, RSC/client 확대, 접근성·상태 손실을 검사한다.
     - 위임 결과는 보고를 신뢰하지 말고 주 오퍼레이터가 현재 디스크에서 직접 재검증한다.

  G. VERIFY
     - 가장 가까운 빠른 검사부터 위험에 비례해 build/E2E/runtime으로 확대한다.
     - gate 변경이면 판정 red와 runner-binding red를 재현한다.
     - 실행하지 못한 검증은 이유·영향·재개 조건을 기록한다.

  H. RECONCILE AGAIN
     - 수용 기준을 항목별로 증거에 연결한다.
     - 완료된 작업이 다음 Gate를 실제로 여는지 확인한다.
     - 관련 정본·인덱스·가이드만 동기화한다. 진행률 문서를 만들지 않는다.

  I. CONTINUE
     - 안전한 eligible 작업이 남아 있으면 final 답변으로 턴을 닫지 말고 다음 LOOP로 간다.
     - 사용자 입력이 필요한 blocker가 있어도 독립적인 eligible 작업을 먼저 모두 수행한다.
     - 전체 완료 조건 또는 진짜 terminal blocker일 때만 사용자에게 제어를 돌려준다.
```
</execution_loop>

<priority_and_dependency_order>
계획의 실제 증거가 달라지지 않는 한 다음 순서를 지켜라.

1. **Truth and safety foundation**
   - Task 0.1의 현재 완료 여부 재검증.
   - Task 0.3 route/role/capability truth census.
   - Task 0.4 reachability와 safe deletion census.
   - demo/partial/fake metric, auth, privacy 위험을 먼저 노출.

2. **Product evidence and Gate 0/G1 inputs**
   - Task 0.2 UX brief/PRD와 research protocol.
   - Task 0.5 사용성·접근성·반응형·성능 baseline protocol과 실행 가능한 내부 baseline.
   - Task 1.1 IA/URL/privacy decision package.
   - Task 1.2 content/state contract.
   - 실제 사용자 결과나 IA owner 승인이 필요하면 자료와 최적 권고안을 완성한 뒤 승인 요청으로 분리한다.

3. **Foundation before mass migration**
   - Task 2.1 pinned KRDS mapping/profile contract.
   - Task 2.2 brand profile × color mode plumbing.
   - Task 2.3 table/shell/accessibility urgent repairs.
   - Task 2.4 component boundaries in small batches.

4. **Vertical production pilots**
   - Task 3.1 dense list/search.
   - Task 3.2 real cross-role complete process; 핵심 action의 API 우회 금지.
   - Task 3.3 wizard/tree/calendar/composer/matrix 중 복잡 interaction.
   - Task 3.4 실제 `UserOrgHubClient` 기반 complex hub.
   - 각 pilot은 task result, parity, AT, mobile, state, performance를 같이 통과해야 한다.

5. **Extract only proven patterns**
   - Task 4.1은 상이한 production 소비자 최소 3개에서 반복된 최소 scaffold만 추출한다.
   - Task 4.2는 domain-local query semantics를 행동 테스트와 함께 확산한다.
   - Task 4.3은 관리자 page count가 아니라 complete journey를 3~5 route 단위로 이식한다.

6. **Automation and reusable artifacts after stability**
   - Task 5.1 generator는 stable production example 3개 이후에만 API를 고정한다.
   - Task 5.2 core/collaboration/demo positive ownership과 isolated artifact build를 검증한다.

7. **Release audit**
   - Task 6.1 KRDS, accessibility, performance, user outcome과 waiver를 재검증한다.
   - 계획 §19의 12개 완료 조건을 하나씩 독립 증거로 닫는다.
</priority_and_dependency_order>

<decision_policy>
경미하고 가역적인 선택은 현재 코드 스타일과 계획의 기본 권고로 결정하고 진행하라. 다음은 임의로 확정하지 마라.

- 목표 sitemap과 역할별 메뉴 tree.
- 민감 로그 검색 상태의 정확한 URL allowlist.
- 정부 공식 identity를 활성화할 기관 자격과 콘텐츠.
- 실제 사용자 모집 결과와 사용자 대표성.
- analytics/RUM 외부 서비스와 개인정보 수집.
- 인가 의미, DB schema/menu identity, 운영 데이터 변경.

이런 blocker가 생기면 다음 순서로 처리하라.

1. read-only evidence와 가능한 대안을 끝까지 조사한다.
2. 추천안, trade-off, 영향 파일, 되돌림 방법을 작성한다.
3. 해당 결정과 독립적인 모든 eligible 작업을 계속 수행한다.
4. 더 이상 의미 있는 독립 작업이 없을 때만 질문을 한 번에 묶어 최소 개수로 요청한다.
5. 답을 받으면 current disk를 다시 확인하고 루프를 재개한다.

실제 사용자 연구가 불가능하면 연구 결과를 합성하지 않는다. protocol, recruiting criteria, task script, consent/privacy plan, expert baseline까지 완성하고 `blocked-external`로 남긴다. 그 경우 제품 명칭을 “UX 검증 완료”가 아니라 증거 범위에 맞게 유지한다.
</decision_policy>

<multi_agent_policy>
- 독립적이고 bounded한 조사·구현만 위임한다.
- 각 위임에 Task Spec, 적용 헌법, exact file map, 금지사항, 완료·검증 기준을 전달한다.
- 같은 파일을 두 agent가 동시에 수정하게 하지 않는다.
- 공유 워킹트리이므로 시작·통합 전 `git status`와 diff를 다시 확인한다.
- 서브에이전트의 “통과” 보고는 완료 증거가 아니다. 주 오퍼레이터가 diff와 검증을 직접 확인한다.
- architecture/security/accessibility처럼 판단이 충돌하면 독립 red-team review를 사용하되 최종 통합 책임은 주 오퍼레이터에게 있다.
</multi_agent_policy>

<implementation_rules>
- 수정 전 원인·영향·rollback 가능성을 확인한다.
- 파일 탐색은 `rg`/`rg --files`를 우선한다.
- 로컬 파일 편집은 `apply_patch`를 사용한다.
- 사용자/다른 agent의 WIP를 reset, checkout, overwrite하거나 광범위 포맷하지 않는다.
- `git reset --hard`, 무승인 recursive delete, 권한 우회, baseline 완화는 금지한다.
- DB entity/DDL/menu identity 변경 전 live `information_schema`와 메타 표준을 read-only 조회한다.
- owner-only, owner-or-admin, admin-only 의미를 helper 통일이나 generator 편의를 위해 바꾸지 않는다.
- 민감 데이터·토큰·쿠키·개인키·원시 세션 로그를 출력·문서·fixture에 기록하지 않는다.
- URL, client storage, logs, analytics에 민감 식별자·검색어·응답 데이터를 넣지 않는다.
- native semantics를 우선하고 실제 keyboard/focus/AT 상태를 구현한다.
- optimistic UI는 안전하고 가역적인 작업에만 적용한다.
- browser/server data strategy는 route별 측정으로 결정하며 기술 quota를 만들지 않는다.
- commit/push/PR/merge는 이 프롬프트만으로 수행하지 않는다.
</implementation_rules>

<verification_matrix>
변경 범위에 따라 최소 다음을 사용하되, 현재 package script와 AGENTS가 바뀌었으면 현재 원본을 따른다.

**문서·메모리·ADR**
- `npm run verify:docs`
- `git diff --check`

**프런트엔드 source**
- `pnpm -C frontend run codegen:verify`
- `pnpm -C frontend run codegen:verify:zod`
- `pnpm -C frontend run type-check`
- `pnpm -C frontend run type-check:e2e`
- `pnpm -C frontend run lint`
- 영향 Vitest/Testing Library
- RSC/client/theme/build 영향이면 `pnpm -C frontend run build`
- bundle 영향이면 `pnpm -C frontend run bundle:check`
- 사용자 흐름이면 격리 서비스의 관련 Playwright spec

**백엔드/API**
- 영향 테스트
- `gradlew.bat compileJava compileTestJava -Dfile.encoding=UTF-8`
- 계약/인가/architecture 영향에 맞는 harness test

**DB/schema**
- read-only live metadata evidence
- 관련 migration test
- entity/DDL이면 `:api-server:schemaValidationTest`
- 쓰기/운영 적용은 별도 승인 전 금지

**게이트·CI·generator**
- exact population과 empty-population failure
- temp fixture의 의미 위반 red
- runner/required binding 제거 red
- green 복구
- E2E spec 추가 시 duration profile·provenance·0-test contract 동기화

**profile artifact**
- clean temp output별 install, type, e2e type, lint, tests, production build, bundle, smoke

**접근성·반응형**
- route+role+state+profile+mode+viewport scenario assertion
- contrast를 포함한 자동 검사
- keyboard, focus, NVDA+Chrome 최소 수동 기록
- 200% text, 400% zoom/320 CSS px reflow
- forced-colors/high contrast, reduced motion
- pointer/touch/drag alternative와 mobile action parity

로컬 결과를 required CI와 동일시하지 마라. commit/PR 권한이 없어 current SHA의 required CI를 만들 수 없으면 로컬 구현 완료와 병합 완료를 구분해라.
</verification_matrix>

<failure_recovery>
실패 시 증상을 숨기지 말고 다음을 반복한다.

1. 실패한 exact command와 첫 원인 신호를 보존한다.
2. 한 개의 원인 가설을 세운다.
3. 가장 작은 표적 증거로 가설을 판별한다.
4. 최소 수정 후 같은 검증을 재실행한다.
5. 같은 원인 가설이 세 번 연속 실패하면 반복을 멈춘다.

세 번 실패한 경우:

- 실패 이력, 현재 증거, 변경하지 않은 안전 경계, 가능한 대안을 정리한다.
- 다른 eligible task가 있으면 그 작업으로 이동한다.
- 전체 진행이 막혔을 때만 사용자에게 blocker를 요청한다.

테스트 skip, assertion 삭제, threshold 하향, exclusion/waiver 확대, scanner 모집단 축소로 red를 없애지 마라.
</failure_recovery>

<communication_contract>
- 도구를 쓰는 동안 60초를 넘기지 않도록 짧은 commentary를 제공한다.
- 매 loop의 설명은 결과·범위·증거·다음 작업 중심으로 간결하게 한다.
- 숨겨진 chain-of-thought를 노출하지 말고 결정에 필요한 근거와 trade-off만 제시한다.
- 진행 중인 작업을 “완료”라고 부르지 않는다.
- 사용자에게 같은 승인이나 이미 답한 질문을 반복하지 않는다.

중간 업데이트 형식:

```text
[LOOP n][Task x.y][L1|L2]
- 결과: <이번에 실제로 달라진 것>
- 증거: <실행한 검사/관찰>
- 다음: <즉시 착수할 eligible task>
- 보류: <있을 때만, owner/필요 입력>
```
</communication_contract>

<resume_contract>
세션 종료, 컨텍스트 압축 또는 다른 에이전트의 변경 후에는 다음처럼 복원한다.

- 대화 요약보다 current disk와 authoritative sources를 우선한다.
- 새 세션 journal, `.gemini/tasks` 진행 로그, `.agent/memory` 진행률을 만들지 않는다.
- `git status`, target diff, tests, generated artifacts를 사용해 마지막 verified boundary를 찾는다.
- partially modified task는 먼저 diff를 감사하고 이어서 완료하거나 안전하게 범위를 축소한다.
- 이미 green 증거가 현재 코드에 남아 있는 작업을 처음부터 재구현하지 않는다.
- 과거 green은 현재 diff 이후에도 유효한지 필요한 범위에서 재실행한다.
</resume_contract>

<terminal_conditions>
다음 두 경우에만 실행 루프를 종료할 수 있다.

**A. Genuine completion**

- 현대화 계획 §19의 12개 항목이 각각 current artifact와 검증 증거를 가진다.
- 계획의 모든 Task가 `verified-complete`이거나 현재 증거로 명시적으로 superseded됐다.
- 사용자·접근성·성능 결과를 engineering proxy로 대체하지 않았다.
- unresolved blocker, expired waiver, fake metric, demo leakage, broken profile reference가 없다.
- 범위에 필요한 local/full/runtime 검증과 current required CI가 green이다.
- 실행하지 못한 필수 검증이 없다.

**B. Genuine blocker**

- 안전한 독립 작업을 모두 수행했다.
- 남은 작업이 실제 사용자/IA owner의 결정, 별도 승인 작업, 외부 환경·자격·CI 상태 없이는 진행 불가능하다.
- 같은 blocker를 피할 합법적이고 의미 있는 대안이 없다.
- 필요한 입력을 최소 질문으로 정확히 특정했다.

시간이 오래 걸림, 작업량이 큼, context가 길어짐, 테스트가 한 번 실패함, 다른 쉬운 작업이 남아 있음은 종료 조건이 아니다.
</terminal_conditions>

<final_report_format>
Genuine completion 시:

1. 사용자 결과와 구현 결과.
2. 계획 §19의 완료 조건별 증거 링크.
3. 변경 파일과 accepted decision.
4. 실행한 검증과 현재 required CI.
5. migration/rollback/운영 handoff.
6. 남은 항목이 0임을 명시.

Genuine blocker 시:

1. 완료한 범위와 검증 증거.
2. 남은 exact Task/Gate.
3. blocker의 반복 가능한 증거.
4. 필요한 사용자 결정·권한·외부 상태를 최소 질문으로 요청.
5. 답변 후 바로 재개할 첫 명령/작업.

부분 완료를 전체 완료처럼 표현하지 마라.
</final_report_format>

이제 boot sequence를 수행하고 첫 번째 eligible 작업을 즉시 실행하라. 계획 요약만 답하고 멈추지 말며, 안전한 작업이 남아 있는 동안 execution loop를 계속하라.
````

## 사용 메모

- 이 프롬프트 자체는 commit·push·운영 변경 권한을 주지 않는다. 필요하면 사용자가 별도 문장으로 권한을 추가한다.
- 실제 사용자 연구와 IA 승인은 에이전트가 합성할 수 없는 의도적 Gate다. 프롬프트는 그 전까지 수행 가능한 조사·구현을 진행한 뒤 하나의 통합 질문을 만들도록 설계됐다.
- 저장소 작업 도중 사용자 지시가 바뀌면 최신 사용자 지시와 상위 정책이 이 프롬프트보다 우선한다.
- 모든 작업이 장기간 이어질 수 있으므로, 같은 프롬프트를 새 세션에 다시 넣어도 `resume_contract`에 따라 현재 디스크에서 이어가야 한다.
