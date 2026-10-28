# 운영 결정과 종료 Gap 보관 기록

> 상태: accepted 결정의 원문 보관 — 각 행의 상태·supersedes를 따라 현행 여부를 판단한다. 현재 운영 상태는 [프로젝트 컨텍스트](../../.agent/memory/project-context.md)·[현재 Gap 인덱스](../../.agent/memory/known-gaps.md)가 정본이다.

2026-10-17 문서 정리에서 `.agent/memory/decisions.md`의 DEC-OPS-001~334 전문과 종료·이전 Gap 서술을 옮겼다. 원본 기준 커밋은 `55a4539569494036788db468296f7ca1eea38d45`이다. 결정 본문·이유·승인 근거·시행일·대체 범위는 보존했고, 상대 링크만 현재 문서 위치와 함께 이동한 자료에 맞췄다. 당시 수치·실행 결과·계획을 현재 상태로 해석하지 않는다.

활성 진입점은 [결정 인덱스](../../.agent/memory/decisions.md)와 [현재 Gap 인덱스](../../.agent/memory/known-gaps.md)다. 제품·아키텍처 규범의 정본은 [Accepted ADR](../02-architecture/decisions/README.md)이며, 과거 승인 기록은 새 승인이나 기관 적용 증거를 부여하지 않는다. 새 결정의 상세 근거는 해당 ADR·변경 문서에 두고 이 보관 기록을 새 세션 로그로 늘리지 않는다.

## DEC-OPS-001

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-001 | accepted | 프로젝트 공통 규칙은 `AGENTS.md` 한 곳에 두고 저장소 `GEMINI.md`·`CLAUDE.md`는 자동 탐색용 얇은 어댑터로 유지한다. | 도구별 프로젝트 정책 복제와 글로벌 절번호 드리프트를 없애면서 각 런타임의 네이티브 진입점은 보존하기 위해서다. 사용자 홈 글로벌 파일의 동일성은 별도 프로비저닝 문제이며 도구 간 자동 상속으로 간주하지 않는다. | [AGENTS.md](../../AGENTS.md), [GEMINI.md](../../GEMINI.md), [CLAUDE.md](../../CLAUDE.md) | 2026-08-18 | - |

## DEC-OPS-002

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-002 | accepted | 공용 메모리 3종은 규범이 아닌, 근거 링크와 검증일을 가진 파생 인덱스로 운영한다. | Gemini·Claude·Codex 간 지속 지식을 공유하되 두 번째 SSOT와 세션 로그 유출을 만들지 않기 위해서다. | [AGENTS Documentation and memory](../../AGENTS.md#documentation-and-memory) | 2026-08-18 | - |

## DEC-OPS-003

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-003 | accepted | 프론트 도구체인은 Node 22+와 pnpm 9를 단일 축으로 사용하고 계약 생성은 offline-first로 한다. | 환경 스큐와 live API 의존형 codegen의 비결정성을 줄이기 위해서다. | [package.json](../../package.json), [frontend/package.json](../../frontend/package.json) | 2026-08-18 | - |

## DEC-OPS-004

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-004 | accepted | 로컬 훅은 범위별 빠른 피드백, required CI는 병합 권위로 구분한다. | 문서-only 작업의 비용을 낮추면서 우회 가능한 훅을 최종 통제로 오인하지 않기 위해서다. | [AGENTS Verification](../../AGENTS.md#verification-by-change-scope), [.github/required-checks.json](../../.github/required-checks.json) | 2026-08-18 | - |

## DEC-OPS-005

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-005 | accepted | `migration-tool`은 온라인 런타임에 포함하지 않는 독립·선택형 offline ETL이다. | 재사용 런타임 DAG와 일회성 레거시 이관 책임을 분리하기 위해서다. | [README.md](../../README.md), [migration-tool/build.gradle](../../migration-tool/build.gradle) | 2026-08-18 | - |

## DEC-OPS-006

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-006 | accepted | 하네스의 논리 규칙 ID는 유지하되 발견·실행·품질 하한은 중앙 `gates.json`과 소수 runner/task로 통합한다. | 개별 테스트를 거대한 단일 클래스로 합치지 않고도 누락·중복·threshold drift와 실행 경로 이탈을 exact census로 차단하기 위해서다. | [gate registry](../../config/governance/gates.json), [registry contract](../../scripts/governance-gates-contract.mjs) | 2026-08-19 | - |

## DEC-OPS-007

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-007 | superseded | main 목표 review policy는 approval 1, code-owner review, last-push approval, thread resolution을 요구하고 stale review 자동 dismiss는 끈다. | 독립 검토와 최신 push 책임을 보장하면서 매 push마다 모든 과거 승인을 지우는 비용은 피하기 위해서다. 실제 적용은 작성자 외 reviewer와 관리자 권한을 전제로 한다. | [.github/required-checks.json](../../.github/required-checks.json), [branch verifier](../../scripts/verify-branch-protection.mjs) | 2026-08-19 | - |

## DEC-OPS-008

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-008 | accepted | 조건부 heavy job은 내부 `*-scope`로 두고 브랜치 보호에는 항상 완료되는 안정 aggregate context만 노출한다. | docs-only처럼 작업이 명시적으로 제외된 SHA도 릴리스가 요구하는 `completed + success` 증거를 남기고, shard·matrix·scope 구조 변경이 원격 required 이름을 흔들지 않게 하기 위해서다. | [.github/required-checks.json](../../.github/required-checks.json), [CI workflow](../../.github/workflows/ci.yml), [aggregate evaluator](../../scripts/aggregate-required-check.mjs) | 2026-08-19 | - |

## DEC-OPS-009

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-009 | accepted | 단독 운영 기간의 main review policy는 approval 0·code-owner/last-push/thread-resolution 전부 비활성으로 확정하고, 명세·계약을 이 값에 양방향 동결한다. | 작성자 외 reviewer가 없는 상태에서 approval ≥ 1을 원격에 적용하면 자기 PR을 자기가 승인할 수 없어 모든 병합이 막히고, 명세만 강하게 두면 `verify:ops`가 영구 red로 남아 신호 가치가 죽는다. reviewer 확보 시 후속 DEC로 상향한다. | [.github/required-checks.json](../../.github/required-checks.json), [required-checks contract](../../scripts/required-checks-contract.mjs) | 2026-08-20 | DEC-OPS-007 |

## DEC-OPS-010

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-010 | accepted | 설문 열람(목록·상세·문항)과 제출은 인증 사용자(`@Authenticated`)에게 개방하고, 설문·템플릿·문항·항목의 관리 뮤테이션은 `@AdminOrSystem`으로 유지한다. 별칭 경로(`/api/v1/surveys/**`)의 URL 게이트(secure-paths + DB seed)는 V2_84로 제거하고 메서드 인가를 단독 방어선으로 한다. | 종전에는 컨트롤러에 메서드 인가가 없어 URL 게이트 1겹에만 의존했고, 제출 엔드포인트의 `@Authenticated`가 핸들러 도달 전에 403으로 죽어 애노테이션 의미와 실행 의미가 어긋났다(GAP-AUTH-001). 설문은 일반 사용자가 응답하는 제품이므로 열람·제출 개방이 제품 의도다. | [SurveyApiController](../../api-server/src/main/java/nuri/api/controller/foundation/controller/system/service/survey/SurveyApiController.java), [V2_84](../../api-server/src/main/resources/db/migration/V2_84__open_survey_alias_to_authenticated.sql), [authorization policies](../../config/governance/authorization-policies.json) | 2026-08-20 | - |

## DEC-OPS-011

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-011 | accepted | production CSP의 `script-src`에서 `unsafe-inline`을 요청별 nonce로 대체하고, 그 전제로 PPR(cacheComponents)을 포기해 전 페이지를 동적 렌더로 전환한다. `strict-dynamic`은 채택하지 않는다. | nonce는 요청마다 달라야 하므로 정적 프리렌더 HTML과 양립할 수 없고(정적 셸의 inline script가 전면 차단됨 — CI e2e 실측), strict-dynamic은 Next가 스트리밍 중 삽입하는 lazy chunk에 nonce가 없어 앱을 전면 파손시킨다(CI run 32310837353 실측). TTFB 비용은 실측 +2ms 수준으로 비물질적이며, PD-CSP-001 결정을 집행한 것이다. | [proxy.ts](../../frontend/src/proxy.ts), [next.config.ts](../../frontend/next.config.ts), [csp-policy contract](../../frontend/src/__tests__/csp-policy.test.ts), [FE 헌법 제10조](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) | 2026-08-20 | - |

## DEC-OPS-012

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-012 | accepted | UI quality baseline 의 새 authoritative run(r13)과 수동 접근성 48건 수집을 보류하고, r12 를 현재 자동 증거로 유지한 채 UI 개선 작업을 재개한다. r12 를 `measured` 로 승격하지 않는다. | 측정 인프라가 4,000줄을 넘긴 반면 사용자에게 보이는 개선은 소규모에 머물렀고, r4~r12 재실행의 상당수가 runner 자체 결함 수정이었다. r13 이 필요한 유일한 사유는 실행 시점 protocol hash 부재라는 메타데이터 한 축이며, 수동 48건 중 NVDA 8건은 외부 평가자·환경이 없으면 닫히지 않아 완벽 기준이 진척을 무기한 인질로 잡는다. 보류는 증거를 만들지 않으므로 UA-06 이후 게이트는 계속 잠긴 채 두고, r12 의 `unmeasured` 판정도 그대로 유지한다. | [사용자 런북 §8](../04-operations/ui-ux-modernization-user-action-runbook.md), [ADR-0005](../02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md), [durability 계약](../../scripts/ui-quality-evidence-durability-contract.test.mjs) | 2026-08-22 | - |

## DEC-OPS-013

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-013 | accepted | 단독 운영 기간 IA 프로그램의 세 owner 역할(Product·IA·Security/Privacy)을 저장소 소유자 lkindo 로 지명하고 승인 채널을 저장소 PR 리뷰로 기록한다. G1 decision workshop 날짜는 보류한다 — 따라서 T0 는 미성립이고 T0 기준 SLA 도 시작되지 않는다. | owner 미지명 상태로는 IA §13 의 blocked-input 행들이 영구히 열리지 않는데, 단독 운영에서 실존하는 결정권자는 저장소 소유자뿐이다. 반면 G1 날짜는 live DB census(blocked-external)와 연구 참여자 확보가 선행돼야 하므로, 날짜만 잡아 SLA 위반 상태를 만드는 대신 선행조건 해소 시점에 별도 결정으로 잡는다. 이 지명은 역할 기록이지 기관/critical role 입력·로그 URL 분류 승인·G0/G1 통과가 아니다. | [IA §13](../01-product/information-architecture.md#13-open-input와-reviewby) | 2026-08-23 | - |

## DEC-OPS-014

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-014 | accepted | 밀도·구조 토큰 어휘 12종(`--control-h`·`--control-h-sm`·`--cell-px`·`--cell-py`·`--font-size-body`·`--form-gap`·`--page-max-w`·`--page-pad`·`--page-pad-md`·`--page-pad-lg`·`--radius-control`·`--filter-pad`)을 두 브랜드 프로필의 라이트·다크 4개 블록에 신설한다(Phase 1, ERP 전환 마스터플랜 D2 — 마스터플랜 정본 문서는 아직 저장소 미반영이라 링크하지 않는다). | 사용자 위임(2026-08-23)에 따른 D2 집행이다. 값은 전부 현행 등가(h-9·px-6·max-w-7xl 등)로 선언해 시각 무변경이며, 소비자 이행은 후속 PR 범위다. 밀도는 컬러 모드 불변이므로 다크 블록도 같은 값을 재선언해 프로필 키 패리티를 유지한다. | [premium.css](../../frontend/src/styles/themes/premium.css), [krds-aligned.css](../../frontend/src/styles/themes/krds-aligned.css), [theme-token-contract](../../frontend/src/__tests__/theme-token-contract.test.ts) | 2026-08-23 | - |

## DEC-OPS-015

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-015 | accepted | 직교 data-density 축(comfortable·compact)을 신설한다 — 서버 env `UI_DENSITY`를 allowlist 검증해 `<html data-density>` 전역 1곳에 배선하고, ERP 밀도는 globals.css 의 compact 무레이어 오버라이드 블록 한 곳으로 전달한다. 기본 배포(미설정=comfortable)는 렌더링 무변화이며, 라우트별 밀도 배정은 ADR-0004 금지를 그대로 따른다. | 사용자 위임(2026-08-23) D1 집행 — KRDS 대민(넉넉한 타깃)과 ERP 업무(고밀도)를 한 저장소에서 동시 지원하려면 밀도는 브랜드와 직교여야 한다. 프로필별 복제 대신 무레이어 블록 1곳이 두 프로필 × 라이트·다크 전부를 이겨 드리프트가 없다. | [density.ts](../../frontend/src/lib/theme/density.ts), [globals.css](../../frontend/src/app/globals.css), [theme-token-contract](../../frontend/src/__tests__/theme-token-contract.test.ts) | 2026-08-23 | - |

## DEC-OPS-016

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-016 | accepted | 백엔드 헌법 제6조에 binary/stream 예외 3항을 제한적으로 신설한다(①Content-Disposition attachment ②명시적 produces/응답시점 Content-Type ③ResponseContractLinter binary census 등재의 동시 충족, 목록 밖 신설·stale 행 양방향 red). 1호 적용: FileApiController#downloadFile 동결분 정합 + LoginLogApiController#exportLoginLogs 전체 결과 xlsx export 신설. | 사용자 위임(2026-08-23 — "의사결정 필요 시 권고안으로 무조건 진행" 지시)에 따른 D4 집행이다. GAP-API-001 이 기록해 온 예외 부재(정당한 binary 가 조항 없이 동결로만 통과)를 익명 개수 동결 대신 파일명·핸들러 단위 exact census 로 강화하며 닫았고, red 실측을 동반했다. JSON 표현 가능한 응답의 예외 우회는 조문으로 금지된다. | [백엔드 헌법 제6조](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md), [ResponseContractLinterTest](../../api-server/src/test/java/nuri/api/harness/ResponseContractLinterTest.java) | 2026-08-23 | - |

## DEC-OPS-017

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-017 | accepted | 파일럿 시각 회귀 기준선을 대시보드 1장에서 4장으로 확장한다 — 기존 단일 `Visual Regression Baseline` 테스트 내부에 로그인 로그(무매칭 검색 empty-state)·공통코드 허브(Flyway seed 파생)·로그인 화면(비인증 컨텍스트 + 01-core-base 와 동일한 /auth/me 401 ledger) 캡처를 추가하고, 기준선 생성·커밋은 기존 update-visual-baseline 워크플로의 `-g "Visual Regression Baseline"` 경로를 그대로 사용한다(신규 인프라·워크플로 변경·스펙 파일 신설 없음). 결재함(/approvals)은 목록 내용이 샤드 실행 순서에 의존해 비결정적이므로 고정 fixture 설계 전까지 제외한다. | 사용자 위임(2026-08-23)에 따른 D6 집행이다. VRT 는 기준선 생성 시점과 비교 시점의 DB 상태가 다르면 마스크로 못 막는 레이아웃 시프트가 생기므로 결정적 상태만 캡처했고, e2e-harness-hygiene 계약이 e2e 전체에 test.skip 1건만 허용해 테스트 분리 대신 단일 테스트 내부 확장을 택했다. 스냅샷 부재 시 CI 첫 실행은 생성이 아니라 실패다("A snapshot doesn't exist … writing actual" — CI=1 로컬 실측, 과거 run 30279822185 동일) — 리눅스 기준선은 update-visual-baseline workflow_dispatch(commit=true)로 생성·커밋해야 하며 win32 로컬 스냅샷 커밋은 폰트 렌더 차이로 금지다. | [visual-baselines.spec.ts](../../frontend/e2e/quality/visual-baselines.spec.ts), [update-visual-baseline.yml](../../.github/workflows/update-visual-baseline.yml), [e2e-harness-hygiene](../../frontend/src/__tests__/e2e-harness-hygiene.test.ts) | 2026-08-23 | - |

## DEC-OPS-018

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-018 | accepted | survey/poll 도메인을 재사용 pack으로 승격한다(D7 집행) — ① 패키지를 `nuri.business.(domain\|service).system.service.survey`에서 1급 `nuri.business.(domain\|service).survey`로 이동하고 ② reusable-base manifest에 `survey` pack(rank 2, appDomains·전용 테이블 9·frontend removePaths 9)을 신설해 demo pack(rank 3으로 이동)에서 분리하며 demo 프로필 구성에 survey pack을 포함한다. API URL·컨트롤러 FQN·인가 애노테이션·DB 스키마·기존 3개 프로필의 projection 결과는 전부 무변경이고, `ServiceLayerIsolationTest`의 코어 금지 패키지 목록은 새 경로로 갱신했다. 별도 Gradle 모듈 분리와 survey 전용 프로필 신설은 이번 범위가 아니다. | 사용자 위임(2026-08-23)에 따른 ERP 마스터플랜 D7(business-app system 분할 — survey/poll pack 승격) 집행이다. survey는 실측상 자기 도메인·foundation·`SecurityUtil`만 참조하는 자기완결 도메인인데 `system` 우산 아래 3단 중첩 경로에 있어 pack 단위로 제외·채택할 수 없었다. 이동 직후 reusable-base census가 pack 소유자 부재 red를 실측으로 냈고 manifest pack 신설로 green이 됐다. CrossDomainCouplingLinter census는 app→app 5·app→core 8 그대로(survey 기여 0), DomainIsolationTest survey 슬라이스 형제 의존 0으로 결합 상수 변경이 없다. | [survey pack manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [reusable-base census](../../scripts/reusable-base-census.mjs), [survey 도메인](../../business-app/src/main/java/nuri/business/domain/survey), [ServiceLayerIsolationTest](../../business-core/src/test/java/nuri/business/ServiceLayerIsolationTest.java) | 2026-08-24 | - |

## DEC-OPS-019

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-019 | accepted | 파생 제품(adopter)의 기준선 재동결 절차를 운영 문서로 도입한다(마스터플랜 Track B D10). 대상은 현존 게이트 6축 — status/hardcoded color guard 의 `BASELINE` 재측정(하향 전 red 실측 원칙), `config/ui-url-state-census.json` 재생성(`node scripts/ui-url-state-census.mjs --write`, 수기 편집 금지), `config/governance/gates.json` exact census, theme-token-contract 프로필 키 패리티, e2e shard-duration-profile 재생성, required-checks 결속 재확인 — 이며, 재동결 diff 리뷰를 의무화한다. | 사용자 위임(2026-08-23 — "의사결정 필요 시 권고안으로 무조건 진행" 지시)에 따른 D10 집행이다. base 의 양방향 동결 게이트는 adopter 커스터마이징 시 필연적으로 어긋나는데, 절차 없이는 게이트 비활성화·baseline 임의 인상으로 신호를 지우는 경로(H2 위반)가 최단 경로가 된다. 절차는 존재하는 게이트만 파일 경로로 실증하며 새 게이트를 창작하지 않는다. | [adopter-baseline-refreeze.md](../04-operations/adopter-baseline-refreeze.md), [ERP 전환 마스터플랜](erp-transformation-master-plan.html) | 2026-08-24 | - |

## DEC-OPS-020

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-020 | accepted | disposition overlay의 acceptanceEvidence 계약을 reference-default(ADR-0007) 기준으로 개정한다 — 연구·live census 계열 4축(research·liveMenu·authorityAssignment·effectiveMenu)은 ADR-0007 본문 hash에 결속된 deferral 레코드(`deferred-to-institution-adoption`·`acceptedRisk: approved-without-user-research`)로 기관 채택 시점 재검증 의무 이전을 기록하고, `state=proposed`의 menu/generator 무조건 차단은 ADR-0007 §Decision 4 게이트(4축 전부 기록 + 개별 approved record ≥ 1 + entrypoint 등록, 미충족·미등록 소비는 red)로 대체한다. overlay state(proposed)·현행 binding(disabled)·route별 owner PR 리뷰 개별 승인 원칙은 무변경이다. | 사용자 위임(2026-08-23)에 따른 D5 2단계 집행이다. 종전 계약은 참조 구현에 구조적으로 존재할 수 없는 live census·연구 artifact를 null blocked-input으로만 표현해 acceptance가 영구 차단이었고, 소비 차단도 ADR-0007이 연 "개별 승인 record부터 소비 가능"과 어긋났다. deferral은 측정 주장도 면제도 아니며 accepted-risk를 명기 승계하고, null 회귀는 다시 blocker가 된다(red 실측 동반: adrSha256 드리프트·status 위조·무approved 소비·미등록 entrypoint 전부 red). | [disposition contract](../../scripts/ui-navigation-disposition-contract.mjs), [overlay](../../config/ui-navigation-disposition-proposal.json), [schema](../../config/ui-navigation-disposition.schema.json), [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md), [IA §8.4](../01-product/information-architecture.md#84-승인-전에-먼저-만드는-실행-증거) | 2026-08-24 | - |

## DEC-OPS-021

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-021 | accepted | 저장소 첫 v* 릴리스 태그 `v0.1.0`을 main 커밋 fa2a79386 에 부여하고, core·collaboration·demo 3 프로필의 공식 reusable-base 산출물을 그 태그에서 생성한다(생성 로그는 릴리스 자산). 원격 태그 push·GitHub 릴리스 발행은 외부 발행이라 사용자 승인 경계에 남긴다. | 사용자 위임(2026-08-23)에 따른 Track B D9 집행이다. `generate-reusable-base-source.mjs`는 "공식 source artifact는 v* 릴리스 태그에서만 생성한다"로 fail-closed 게이트돼 있어 태그 부재 상태에서는 3 프로필 공식 생성이 원리적으로 불가능했고(종전 산출물은 전부 `--allow-non-release-ref` 로컬 빌드), 태그가 distributionMode `release-tag-generated`의 유일한 배포 참조다. 생성은 dev 서버 드리프트와 격리된 clean worktree(태그 체크아웃)에서 `--allow-*` 플래그 없이 수행했고, 세 산출물의 `reusable-base-lock.json`이 `sourceReleaseTag: v0.1.0`·`localDevelopmentBuild: false`로 공식성을 증명한다. | [소스 생성기](../../scripts/generate-reusable-base-source.mjs), [DB 번들 생성기](../../scripts/generate-reusable-base-db.mjs), [프로필 manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [ERP 전환 마스터플랜](erp-transformation-master-plan.html) | 2026-08-24 | - |

## DEC-OPS-022

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-022 | accepted | 포털형→업무형 UI 전환의 판단 기준을 **업무 화면 문법 카탈로그**(공통 규칙 G1~G15 · archetype 8종 · 밀도 계약)로 명문화하고, A1 조회형 목록을 `WorkListPage` archetype 셸로 1급화한다. 참조 갤러리 `/admin/patterns`를 demo pack 소유로 신설하고(`demo-isolated` 제안, `reviewState=proposed` — 개별 승인은 owner PR 리뷰), 라우트 census 3종(capabilities 119→120 · disposition 119→120 · url-state 재생성)과 shell 집계를 같은 변경에서 갱신했다. 이행(W3)은 wave 1 협업 2화면 + wave 2 로그 4·운영 5화면으로 진행했고, 되돌리기와 신규 직접 소비 유입을 **채택 census 게이트**(셸 경유 12 · 직접 조립 39 exact)로 동결한다. 조회 조건·빈 상태 문구도 공용 조립기(`KeywordFilter`·`emptyResultMessage`)로 단일화했다 — 조회 조건이 표 밖으로 나오면 표가 검색어를 몰라 `결과 없음`과 `데이터 없음`이 합쳐지므로(G15) 화면이 문구를 내려주는 계약이다. h1 소유 계약은 "화면 소스에 `<h1`" 에서 "셸이 단독 소유 + 화면은 위임" 으로 개정했고, e2e page object 3건(포상 placeholder·`ANALYZE`→`조회`·외부인사 placeholder)은 단위 계약(`rewards-e2e-contract`)으로 문구를 고정한 뒤 함께 갱신했다. `/admin/system/logs/login` 은 VRT 기준선(DEC-OPS-017) 소속이라 기준선 재생성과 같은 변경에서 이행하도록 보류했다. W4(랜딩 → 업무 홈)는 순서를 처리 대기 → 내 목록 → 상태·활동 → 홍보로 뒤집어 완료했고, VRT 기준선이 `/` 가 아니라 `/admin` 을 캡처한다는 실측으로 기준선 재생성 없이 진행 가능했다. wave 4까지 셸 경유 21 · 직접 조립 30이며, 이행 과정에서 계측 원천 없는 고정 지표(`일일 상호작용 1.2k+` 등)와 `console.log` 만 하는 검색 컨트롤 같은 위장·죽은 어포던스를 함께 제거했다. W5 A2 1차로 `MasterDetailPage`를 신설하고 `/admin/user/departments`·`/admin/system/menus`를 단일 DOM master-detail, 선택 `aria-current`, 방향키·상세 Tab·선택 기반 저장 계약으로 이행했으며 route→consumer exact census를 별도로 동결했다. A2 2차는 `/admin/collaboration/mail-history`의 6열 직접 표를 제목·상태 중심 compact master와 우측 상세로 이행해 A2 소비자를 3화면, 직접 표 소비를 29화면으로 확정했다. 저장 동작이 없는 메일 이력에는 `Ctrl+S`를 만들지 않고 검색·페이지 변경 시 stale 선택을 해제하며, 메일 본문은 이 화면에 새로 노출하지 않는다. A2 3차는 `/admin/system/common-code` STANDARD만 전체 `MasterDetailPage`로 이행해 소비자를 4화면으로 늘리고, 포털 hero·metrics·진입 motion을 제거해 1280×720에도 실제 업무 영역을 노출했다. DnD handle과 선택을 분리하고 검색 중 이동을 비활성화했으며, 물리 스키마에 정렬 컬럼이 없는 계약에 맞춰 분류 자체와 같은 분류 안의 순서는 변경하지 않고 그룹의 교차 분류 이동만 저장한다. 선택+소속 변경 저장 및 검색 stale 선택 해제를 결속했다. ADMINIST·INSTITUTION의 A1과 `/admin/system/common-code/codes` alias는 보존했으며 `StandardDataTable` 50·직접 조립 29·`WorkListPage` 21·`PagePagination` 4도 불변이다. status color BASELINE은 공통코드 필수·오류·사용 상태 리터럴의 semantic token 이행으로 629→621이 됐다. 선택의 새로고침 복원은 메뉴·부서·메일에서 기존 보류를 유지하며, 공통코드의 기존 `groupId` query consumer 1건도 `deny`·`unverified` legacy로 보존하고 새 producer·local/session storage를 만들지 않는다. URL 이행과 privacy 승인은 별도 과제로 보류한다. W5의 남은 범위는 A4·A5다. | 사용자 위임(2026-08-24 "권고 실행 순서대로 작업 진행")에 따른 W1·W2 및 후속 A2 집행이다. 실측상 정렬·페이지당 건수·일괄 액션은 이미 `StandardDataTable`(headless TanStack)에 있는데 58개 소비 화면 중 채택이 각각 7·6·3건뿐이었다 — 병목은 컴포넌트가 아니라 **화면이 문법을 선언할 방법의 부재**였다. 디자이너 부재 상태에서 취향 판단을 없애기 위해 규칙 근거를 공개 가이드 교차 대조(KRDS 표 원문·MS model-driven 원문·Fiori/KRDS 검색 공개 스니펫)와 저장소 실측으로 제한하고, 본문을 확보하지 못한 출처는 근거에서 배제했다. 카탈로그의 밀도 표는 `globals.css` compact 블록과 양방향 exact 계약으로 결속했고(값 드리프트·토큰 누락 red 실측 완료), archetype 골격 순서도 테스트로 고정했다(G1 위반 red 실측). A2는 shared client import만 세는 false-green을 피하려고 부서 route의 `defaultTab="DEPTS"`와 실제 활성 guard를 결속하고, 메일 route는 importer·선택 시맨틱·`emlDsptchSn` URL/브라우저 저장소 금지를 exact 검사한다. 공통코드는 STANDARD 분기와 두 A1 분기, `groupId` legacy 1건, 신규 producer·저장소 부재를 exact 검사한다. KRDS·KWCAG 준수 주장은 하지 않는다. | [카탈로그](../02-architecture/work-screen-grammar-catalog.md), [WorkListPage](../../frontend/src/app/components/patterns/work-list-page.tsx), [MasterDetailPage](../../frontend/src/app/components/patterns/master-detail-page.tsx), [메일 이력 소비자](../../frontend/src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx), [공통코드 소비자](../../frontend/src/app/admin/system/common-code/CommonCodeClient.tsx), [A2 census](../../frontend/src/__tests__/master-detail-adoption-census.test.ts), [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts), [갤러리](../../frontend/src/app/admin/patterns/PatternGalleryClient.tsx), [ERP 전환 마스터플랜](erp-transformation-master-plan.html) | 2026-08-24 | - |

## DEC-OPS-023

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-023 | accepted | W3(A1 이행 웨이브) 종료와 함께 두 가지 규칙을 확정한다. ① **도달 불가 화면은 archetype 이행 대상이 아니다** — [next.config](../../frontend/next.config.ts) 가 리다이렉트해 클라이언트가 렌더되지 않는 `/admin/security/login-policy`·`/cop/sms/selectSmsList` 는 이행하지 않고, 채택 census 의 "미이행" 잔량으로 남긴다. ② **관리자 표시 판정은 라우트 게이트와 같은 역할 집합을 쓴다** — [lib/auth/administrative-role (당시 소스)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/lib/auth/administrative-role.ts) 을 SSOT 로 두고 `proxy.ts` 의 `/admin` 게이트 집합과 parity 를 계약으로 고정한다. W3 결과는 셸 경유 40 · 직접 조립 4이며 남은 4건은 A5 스펙 계약 1 · 도달 불가 alias 2 · 공유 컴포넌트 1로 전부 대상이 아니다. | ① 도달 불가 화면을 이행하면 사용자에게 보이는 변화가 0인데 채택 수치만 올라 census 가 진척을 과장한다(H2 의 신호 은폐와 같은 방향의 왜곡이다). 실측으로 login-policy 를 이행했다가 되돌린 뒤 이 규칙을 세웠다. ② `/auth/me` 의 `role` 은 사용자 등급이 아니라 authority id 원문(`ROLE_ADMIN`)인데 화면이 `role === 'ADMIN'` 하나만 보면 **권한 있는 관리자에게 기능이 사라진다**. 게시판 마스터의 생성 마법사 진입이 정확히 그렇게 죽어 있었고, 같은 동작을 중복 제공하던 하단 마케팅 배너가 그 결함을 가리다가 배너 제거와 함께 e2e(CI run 32832181327)로 드러났다. 라우트는 열어 주는데 화면만 숨기는 비대칭은 조용히 죽는 결함이라 계약으로 막는다. 표시 판정일 뿐 인가가 아니므로 서버 권한은 넓어지지 않는다(H3). | [카탈로그 §6·§7](../02-architecture/work-screen-grammar-catalog.md), [A1 census](../../frontend/src/__tests__/work-list-adoption-census.test.ts), [관리자 판정 SSOT (당시 소스)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/lib/auth/administrative-role.ts), [parity 계약](../../frontend/src/__tests__/administrative-role-parity.test.ts) | 2026-08-25 | - |

## DEC-OPS-024

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-024 | accepted | `/admin/security/login-policy` 의 config redirect 를 제거해 로그인 정책 화면을 정본 경로로 복원한다. DEC-OPS-023 ① 의 규칙(도달 불가 화면은 archetype 이행 대상이 아니다)은 그대로 유효하되, **이 route 는 더 이상 도달 불가가 아니므로 그 예외에서 빠진다** — A1 이행 대상으로 복귀하며 이번 변경에서 이행하지는 않았다. 같은 변경에서 route capabilities routing(config-redirect→page)·url-state census(configRedirects 15→14)·disposition(consolidate-to-canonical→retain-canonical, manifest sha 갱신)·카탈로그 §6·§7 서술을 정합했다. 같은 파일 140행 `/admin/user/login-policy` 는 손대지 않았다. | 이 리다이렉트는 **동작하는 화면을 통째로 삼키고 있었다**. 메뉴 9020120 의 modern_route 가 이 경로를 정본으로 선언하는데(V2_47), 목적지 허브에 POLICY 탭이 없어 별칭이 LOGIN(로그 목록)으로 떨어뜨렸다 — DB 마이그레이션이 기록한 교정이 프런트 설정에 조용히 무효화된 상태였고, IP 제한·허용 시간대·2단계 인증(OTP)을 설정하는 424줄 화면과 API 5개가 전 경로에서 도달 불가였다. DEC-OPS-023 의 서술(도달 불가 alias 2건)은 이 변경으로 사실이 아니게 되지만 accepted 결정은 소급 편집하지 않으므로(AGENTS.md) 이 후속 결정으로 사실 변화를 기록한다. 140행을 함께 손대면 e2e(06-ops-governance) page object 갱신이 필요해 별건으로 분리했다. | [next.config](../../frontend/next.config.ts), [capabilities census](../../config/ui-route-capabilities.json), [disposition overlay](../../config/ui-navigation-disposition-proposal.json), [카탈로그](../02-architecture/work-screen-grammar-catalog.md) | 2026-08-27 | DEC-OPS-023 ① 의 login-policy 예외만 무효화(규칙 자체는 유지) |

## DEC-OPS-025

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-025 | accepted | ADR-0007의 2026-08-23 G1 워크숍과 참조-기본 IA 승인으로 DEC-OPS-013의 **G1 날짜 보류·T0 미성립·SLA 미개시 부분만** 종료한다. Product·IA·Security/Privacy owner를 lkindo로 둔 지명과 저장소 PR 리뷰 승인 채널은 계속 유효하다. | accepted 결정을 소급 편집하지 않으면서, ADR-0007이 바꾼 일정·게이트 상태와 그대로 유지한 의사결정 권한을 구분하기 위해서다. | [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md), [IA decision log](../01-product/information-architecture.md) | 2026-08-31 | DEC-OPS-013의 G1 날짜·T0 보류 부분만 종료(owner·PR 채널은 유지) |

## DEC-OPS-026

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-026 | accepted | DEC-OPS-022에 포함된 A2 소비자 수·status-color baseline·`W5 진행 중` 같은 **이행 시점 스냅샷을 현재 상태 판단에서 종료**한다. W5는 완료됐고, A4는 실소비자가 없어 공용 셸을 만들지 않으며, A5는 단일 권한 매트릭스를 공용 셸 없이 스펙 계약으로 고정한다. 이후 소비자 수와 baseline 같은 변동 수치는 prose 결정문이 아니라 현재 live census·guard가 정본이다. | accepted 결정의 역사와 원 설계 원칙은 보존하면서, 빠르게 변하는 진행 수치를 장기 결정 인덱스가 다시 낡게 만들지 않기 위해서다. | [업무 화면 문법 카탈로그](../02-architecture/work-screen-grammar-catalog.md), [A1 census](../../frontend/src/__tests__/work-list-adoption-census.test.ts), [A2 census](../../frontend/src/__tests__/master-detail-adoption-census.test.ts), [A5 계약](../../frontend/src/app/admin/security/authority/__tests__/matrix-a5-contract.test.tsx), [status-color guard](../../frontend/src/__tests__/status-color-guard.test.ts) | 2026-08-31 | DEC-OPS-022의 진행 스냅샷만 종료(카탈로그·archetype 결정은 유지) |

## DEC-OPS-027

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-027 | accepted | 하네스 실행 경로 강화 5축을 도입한다. ① 백엔드 소스를 감사하는 크로스 스택 프런트 계약 7종(Atlas 계약 포함)을 `frontend/src/__tests__/cross-stack/` 로 분리하고, required `secret-scan` job 에서 `atlas ∪ backend` 축으로 실행한다(registry 신설 카탈로그 `GATESET-CROSS-STACK-CONTRACTS` + pre-push/verify 결속 + 배치 양방향 가드 — 루트 파일의 백엔드 참조도, cross-stack 무임승차도 red). ② `verify:full` 백엔드 경로에 `:foundation:check` 를 편입해 foundation 커버리지 ratchet 2종의 local-full tier 선언을 실행 실체와 정합했다. ③ census 재검토 기한(reviewBy)을 실시간 시계로 결속한다 — route-capabilities 는 실시간 검증 테스트(만료 red·60일 전 경고), url-state 는 만료 검증 자체를 신설(주입 가능한 시계, 기본 실시간). 만료 red 의 해소는 실제 재검토 또는 사유를 남긴 명시적 기한 연장 커밋이며, 2026-10-31 의 일괄 만료(495건)는 의도된 강제 재검토 지점으로 남긴다. disposition overlay 의 reviewBy 는 결정 결속(DEC-OPS-020)이라 의도적으로 제외했다. ④ 메타게이트 census 를 ArchUnit 계층(`*ArchitectureTest`·`*IsolationTest`·규칙 정의 `*Rules`)과 게이트 태그 술어(`@Tag`/`@ArchTag` — registry census 와 단일화)로 확장하고, 규칙이 상수 밖 메서드 체인에 사는 ArchUnit 계열 15파일은 소스 전체 해시(`__sourceHash`)로 동결했다(census 44→98). registry 계약에는 선언 root 밖 tagged gate 를 오류로 잡는 검사를 신설했다. ⑤ 부수 강화 — `GATESET-FRONTEND-VITEST` forbidSkips(당시 위반 0), e2e shard profile 신선도 상한 120일, 하네스 직접 I/O 금지 확대(`readAllLines`·`readAllBytes`·`list`·`lines`, 현행 7건 사유 동결), `resolveRepoRoot` 7개 사본의 공용 인덱스 위임(무음 폴백 1건 제거), `ResponseContractLinter` 핸들러 census 의 reflection 교차 검증(정규식 손실 = red). 전 축 red 실측 동반, 라우트 수 120 삼중 하드코딩은 파일시스템 파생 단일 원본으로 교체. | 2026-08-31 하네스 전수 진단이 "계약은 라인의 존재만 검사하고 실행 경로는 검사하지 못한다" 패턴의 P1 4건을 실측했다 — 백엔드-only PR 에서 크로스 스택 계약 실행 0(스코프 skip 을 집계가 성공으로 매핑; `ocrnYmd.desc()→asc()` 변경을 그 계약이 못 보는 경로), `verify:full` 의 foundation ratchet 미실행, reviewBy 만료 시계의 영구 정지(CI 는 고정 NOW 픽스처만 실행), ArchUnit allowlist 확장이 어떤 동결에도 안 걸리는 사각. 사용자 지시("순서대로 개선해줘")와 결정 위임(2026-08-23)에 따라 권고안대로 집행했다. | [gate registry](../../config/governance/gates.json), [registry contract](../../scripts/governance-gates-contract.mjs), [배치 가드](../../frontend/src/__tests__/cross-stack-boundary.test.ts), [메타게이트](../../api-server/src/test/java/nuri/api/harness/HarnessBaselineIntegrityTest.java), [CI workflow](../../.github/workflows/ci.yml), [required-checks contract](../../scripts/required-checks-contract.test.mjs) | 2026-09-01 | - |

## DEC-OPS-028

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-028 | accepted | 생성 Zod 계약에서 **응답(response) 방향의 non-required 필드는 `null` 을 허용**한다(`.optional().nullable()`). 요청(request) 방향과 required 필드는 그대로 엄격하게 둔다. 문서에 `nullable: true` 가 명시된 필드는 종전대로 `.nullable()` 이다. | 세 실측이 겹쳐 **정상 응답이 런타임에 throw** 되고 있었다. ① springdoc 은 Java DTO 에서 nullability 를 추론하지 않아 `@Schema(nullable = true)` 를 손으로 달지 않으면 문서에 표시가 남지 않는다 — 즉 문서의 nullable 부재는 "null 이 아니다" 라는 보장이 아니라 "말하지 않았다" 이다. ② 이 저장소에는 전역 Jackson null 생략 설정이 없어(`ApiResponse` 의 특정 필드에만 `@JsonInclude(NON_NULL)`) NULL 허용 컬럼의 값이 응답 JSON 에 `null` 로 그대로 실린다. ③ zod `.optional()` 은 undefined 만 허용하고 null 을 거부한다. 2026-09-01 CI e2e 에서 권한 관리·주소록·알림·부서업무 화면이 SSR 단계에서 동시에 죽었다(3개 샤드 전부 red, 서버 로그 `생성 API 응답이 OpenAPI 계약과 일치하지 않습니다`). 따라서 이 변경은 계약 완화가 아니라 **거짓 red 의 제거**다. 대안으로 검토한 전역 `NON_NULL` 은 응답 형태 자체를 바꿔(`{"a":null}` → `{}`) 기존 소비자와 d018b7bc0 이 추가한 런타임 nullability 계약에 영향이 커 채택하지 않았고, DTO 별 `@Schema(nullable = true)` 전수 표기는 대상이 광범위해 누락이 계속 재발한다. 서버가 실수로 null 을 보내는 진짜 결함은 백엔드 쪽 `OpenApiDocumentationTest` 의 nullability 검증이 담당한다. | [codegen-zod](../../.agent/scripts/codegen-zod.js), [generated-zod](../../frontend/src/types/generated-zod.ts), [OpenApiDocumentationTest](../../api-server/src/test/java/nuri/openapi/OpenApiDocumentationTest.java) | 2026-09-01 | - |

## DEC-OPS-029

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-029 | accepted | PD-UX-002 의 URL-state 판정을 네 축으로 확정한다. **Q1(사용자 직접 결정)** — 현재 URL 에 실리는 사용자 입력 검색어 14건을 전부 유지하고, 로그 화면이 검색어를 주소창에 싣지 않는 현행도 유지한다. 즉 판정 경계는 "검색어인가" 가 아니라 **"주소창에 실리는가"** 이며, 화면별 비대칭이 승인된 상태로 확정된다. **Q2** — 목록 화면의 copy-all 캐리어(`new URLSearchParams(searchParams)`)를 `LIST_PARAM_KEYS` 7키 allowlist 재조립으로 바꾼다. **Q3** — DB 가 소유한 URL 공간(`tb_menu_info.modern_route`)을 **저장 시점에** 형식 제한한다(절대경로 또는 레거시 `.do`, 쿼리 키는 `tab`·`bbsId` 만, 빈 문자열 허용). **Q4** — 죽은 URL 표면 14건 중 9건을 종결하되, 걷어내는 대신 **소비처를 만드는 쪽**을 택한다(`expired`·`auth_error` 는 안내를 신설, `nttId` 는 canonical 정합 + 별칭 수용). Q4 잔여 5건과 Q5(2026-10-31 일괄 만료)는 이 결정에 포함하지 않는다. | Q1 은 사용자 결정(2026-09-04)이고 Q2~Q4 는 결정 위임(2026-08-23)에 따른 집행이다. **Q1**: `/search` 는 "임직원 성명을 찾습니다" 라고 고지하고 백엔드도 "성명 부분일치 조회" 라고 명시한다 — 사람 이름 입력은 오용이 아니라 설계된 용도이고, 그 사실이 알려진 채 승인됐다. URL 에서 빼려면 네이티브 GET 폼을 포기해야 하는데 그러면 JS 로드 전 동작 상실과 함께 `page.tsx` 주석이 기록한 React #418(hydration mismatch) 계열이 다시 열린다. **Q3**: `modern_route` 는 프런트 `normalizeInternalRoute` 를 지나 그대로 URL 이 된다 — 그 함수는 결함이 아니라 문서화된 의도로 쿼리를 보존한다. 방어선이 `@Size(max=500)` 하나뿐이고 DB 에도 CHECK 가 없어, 관리자가 자유 입력칸에 `?q=<사람 이름>` 을 타이핑하면 그것이 사용자 URL 이 됐다. 읽기 쪽에서 자르면 저장값이 조용히 달라져 관리자가 이유를 모르므로 저장에서 거부한다. ⚠ 운영(OCI) 실측이 배포 안전을 증명했다 — 메뉴 84행 중 `modern_route` 70, 쿼리 보유 12, distinct 키는 `tab` 1종이고 **70행 전부 불통과 0** 이다. 다만 메뉴는 런타임 편집 가능하므로 이것은 측정 시점의 사실이며, 제약의 존재 이유는 미래의 자유 입력과 파생 제품(adopter)의 DB 다. **Q4**: 셋 다 코드가 이미 이유를 URL 에 실어 보내는데 화면만 버리고 있었다 — 걷어내면 그 의도까지 지운다. 방향이 기존 사례와 반대다: DEC-OPS-022·GAP-CMTY-001·GAP-CODE-001 은 **화면이 없는 일을 약속한** 것을 정정했고, 여기는 **아는 사실을 말하지 않은** 것을 고쳤다. ⚠ 집행 중 결함 5건이 드러나 함께 닫혔다 — 그중 `nttId` 는 초안이 "위험 0 인 이름 정합" 으로 분류했으나 실제로는 서버(`params.pstSn \|\| params.nttId`)와 클라이언트(`pstSn` 만)의 키 공간 불일치로 **`?nttId=` 진입 시 상호작용 전체가 0번 글로 동작**했다. `groupId` 도 "죽은 표면" 이 아니라 동작하는 딥링크 소비자였다. 이 결정은 census 의 `dataClass`·`approvalStatus` 분류 승인이 **아니다** — 새 레코드도 전 축 `unverified` 로 남는다. | [분류 초안](url-state-classification-draft.md), [Q1 경계 계약](../../scripts/log-search-url-boundary-contract.test.mjs), [MenuDto](../../business-core/src/main/java/nuri/business/service/menu/dto/MenuDto.java), [MenuRouteQueryKeyTest](../../business-core/src/test/java/nuri/business/service/menu/dto/MenuRouteQueryKeyTest.java), [PD-UX-002](../04-operations/pending-decisions.md) | 2026-09-04 | - |

## DEC-OPS-030

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-030 | accepted | 결재 도메인을 완결한다(2026-09-05 도메인별 프로세스·UX 감사의 1순위 조치). ① 결재함 `/approvals` 에 **기안 다이얼로그**를 신설해 `POST /api/v1/approvals`(신청자 = 인증 주체, 본문은 업무구분·결재자·신청일만)로 상신한다. 업무 구분은 공통코드 COM075 의 사용 중 상세코드이며 서버가 등록 코드를 검증하고, 인증 사용자용 `GET /approvals/task-types` 가 선택지를 내려준다(공통코드 API 는 관리자 전용). 그룹이 비어 있으면 화면은 상신을 막고 코드 등록을 안내한다 — 임의 시드는 하지 않는다(PD-DB-003). ② 탭을 실제 질의 축으로 개명한다 — '결재 처리 이력'(실제로는 `/approvals/my` 신청자 기준) → '내가 올린 결재', 신설 `GET /approvals/processed`(결재자 본인의 승인·반려 건) → '내가 처리한 결재'. 비활성 '보관함' 버튼은 걷는다(G10). ③ 결재 결과 알림·문자·메일 본문을 enum 상수명(`APPROVED`)·내부 ID 표기에서 한국어 상태명(`승인`/`반려`)·문서 번호로 바꾸고 사유 절은 반려에만 싣는다. ④ 문자 발신 번호는 `nuri.notification.sender.tel` 프로퍼티로 옮기고 비어 있으면 문자 채널만 건너뛴다(메일 From 은 이미 `nuri.mail.from` 이며 리스너의 `admin@egov.enterprise` 리터럴은 어디에도 쓰이지 않던 값이라 제거). `/approvals/draft` 목업(demo-isolated approved)은 그대로 두되 결재 허브로 안내한다. | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 등록 API 와 프런트 서비스 메서드(`IsmAdminService.createInfrmlSanctn`)는 있었지만 호출부 0건이라 **승인·반려는 되는데 올릴 수 없는** 반쪽 흐름이었고, '결재 처리 이력' 탭은 `findByAplcntId` 를 불러 결재자가 처리한 문서를 볼 곳이 없었으며, `String.format("%s", SanctionStatus)` 가 사용자에게 `APPROVED 되었습니다. 사유: 없음` 을 보냈다. 종전 `POST /informal-sanctions` 는 `aplcntId @NotBlank` 를 검증한 뒤 서버가 덮어써 **클라이언트가 덮어써질 값을 보내야 통과하는** 계약이라 전용 요청 DTO(`ApprovalDraftRequest`)를 두었다. 상신 화면을 `/approvals/draft` 실화면이 아니라 허브의 다이얼로그로 둔 것은 그 라우트가 owner 승인된 demo-isolated 이고 새 URL·query 상태를 만들지 않기 위해서다. 게이트: 읽기 인가 표면 census 176→178(같은 컨트롤러·같은 인가 축 — H3), 쓰기 정책 registry 행 추가 + manifest 해시 갱신, 라우트 capability census(`/approvals` actions +create·refresh, E3), 생성 API 경계 census 재생성(347/347), e2e 11 을 "상신 미지원 정직성" 계약에서 **상신→대기함→승인→처리함 완주**로 전환(테스트가 관리자 API 로 COM075 코드 1건을 보장한 뒤 시작). | [ApprovalApiController](../../api-server/src/main/java/nuri/api/controller/business/approval/ApprovalApiController.java), [ApprovalDraftRequest](../../api-server/src/main/java/nuri/api/controller/business/approval/dto/ApprovalDraftRequest.java), [InformalSanctionService](../../business-app/src/main/java/nuri/business/service/informalsanction/InformalSanctionService.java), [SanctionEventListener](../../business-app/src/main/java/nuri/business/service/informalsanction/event/SanctionEventListener.java), [ApprovalDraftDialog](../../frontend/src/app/approvals/ApprovalDraftDialog.tsx), [ApprovalHubClient](../../frontend/src/app/approvals/ApprovalHubClient.tsx), [결재 여정](../../frontend/e2e/journeys/approvals.spec.ts), [authorization-policies](../../config/governance/authorization-policies.json) | 2026-09-05 | - |

## DEC-OPS-031

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-031 | accepted | 설문 응답 제출에 **기간 가드**를 둔다(감사 2순위). 서버 `SurveyResultService.submitResponse` 는 존재·중복 검사에 더해 오늘(Asia/Seoul, yyyyMMdd)이 `srvyBgngYmd`~`srvyEndYmd` 안일 때만 저장한다 — 비어 있는 경계는 열린 것으로 보고(시작일 없음 = 즉시, 종료일 없음 = 무기한), 값이 있는데 8자리 날짜가 아니면 판정 불가로 **열지 않는다**. 화면은 같은 규칙(`lib/survey-status.ts`)으로 목록에 '진행중/예정/종료/알 수 없음' 상태 열을 두고, 응답 화면은 설문 제목·기간·상태를 보여 주며 기간 밖이면 사유 안내 + 입력 잠금 + 제출 버튼 비노출(통계는 그대로 열람). 목록 행 액션도 종료된 설문은 '결과 보기' 로 말한다. | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 등록·수정은 `validateSurveyDates` 로 기간을 검사하면서 제출은 기간을 보지 않아 **종료된 설문·시작 전 설문에도 응답이 저장**됐고, 화면도 "하나 이상 골랐는가" 만 보고 제출을 열었다. 같은 도메인의 투표(`OnlinePollService.vote`)는 이미 시작 전·종료 후를 막고 있어 도메인 안 비대칭이었다. 판정 규칙을 투표의 `poll-status.ts` 와 같은 8자리 문자열 비교로 두되, 설문은 기간 컬럼이 NULL 허용이라 빈 경계를 개방으로 본다(기간 없는 기존 설문의 응답을 막지 않기 위해서다). 응답 화면이 제목 대신 일련번호만 보여 주던 것도 함께 고쳤다. | [SurveyResultService](../../business-app/src/main/java/nuri/business/service/survey/SurveyResultService.java), [survey-status](../../frontend/src/lib/survey-status.ts), [SurveyDetailClient](../../frontend/src/app/survey/[id]/SurveyDetailClient.tsx), [SurveyClient](../../frontend/src/app/survey/SurveyClient.tsx), [SurveyResultServiceTest](../../business-app/src/test/java/nuri/business/service/survey/SurveyResultServiceTest.java) | 2026-09-05 | - |

## DEC-OPS-032

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-032 | accepted | 사용자 관리 화면(`/admin/user/manage`)의 상세 패널에 **관리자 비밀번호 초기화**를 붙인다(감사 3순위). 관리자가 새 비밀번호(8~20자, 백엔드 `AdminPasswordChangeRequest` 와 같은 한계)와 확인을 입력해 `PATCH /admin/system/users/{userId}/password` 를 부르고, 시스템은 새 비밀번호를 전달하지 않으며 화면이 "사용자에게 직접 안전한 경로로 알려 주세요" 라고 말한다. 로그인 화면에 비밀번호 찾기는 두지 않는다(엔터프라이즈 정책 유지). | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 초기화 API 와 프런트 서비스 메서드(`userAdminService.updatePassword`)는 있었지만 호출부가 0건이었고 로그인 화면에도 찾기 경로가 없어, 비밀번호를 잊은 사용자는 DB 직접 조작 말고는 길이 없었다(P1). 임시 비밀번호를 시스템이 생성·표시·메일 전송하는 대안은 전달 채널(메일 발신 설정 유무)과 노출 위험을 제품이 아직 정하지 않아 택하지 않았다 — 관리자가 정해 직접 전달하는 최소 흐름이 현재 제품 경계 안에서 정직하다. 폼은 프로젝트 표준(`useManualFormValidation` + 생성 zod 확장, 동기 제출 잠금, 서버 필드 오류 매핑·입력 보존)을 따르고 폼 검증 census 에 compliant 로 등록했다. | [AdminPasswordResetForm](../../frontend/src/components/admin/user/AdminPasswordResetForm.tsx), [UserOrgHubClient](../../frontend/src/app/admin/user/UserOrgHubClient.tsx), [UserApiController#updatePasswordByAdmin](../../api-server/src/main/java/nuri/api/controller/UserApiController.java) | 2026-09-05 | - |

## DEC-OPS-033

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-033 | accepted | 쪽지함(`/note`)과 결재함(`/approvals`)에 **서버 페이징**을 붙인다(감사 4순위). 쪽지함은 `StandardDataTable` 의 pagination 계약(기본 20건, 페이지당 건수 변경·탭 전환 시 1페이지 복귀)으로, 결재함은 `PagePagination`(고정 20건, 탭 전환·기안 등록 시 1페이지 복귀)으로 배선하고, 결재함은 페이지가 바뀌면 이전 페이지의 선택·반려 사유·오류를 함께 해제한다. 백엔드 API 는 이미 `Pageable` 계약이라 서버 변경은 없다. | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 쪽지함은 `{ page: 0, size: 100 }`, 결재함은 `{ page: 0, size: 50 }` 을 한 번만 조회하고 페이저가 없어 그 뒤 항목은 어떤 경로로도 도달 불가였다(P1) — 서버는 total 을 내려주는데 화면이 버리고 있었다. 결재함이 표 pagination 이 아니라 `PagePagination` 을 쓰는 이유는 A2 `MasterDetailPage` 의 master 가 표가 아닌 선택 목록이고, 선택이 페이지에 종속돼 stale 선택 해제를 페이지 변경과 같은 핸들러에 결속해야 하기 때문이다(페이지 넘긴 뒤 이전 페이지 문서를 승인·반려하는 오조작 차단). URL 에 page 를 싣지 않는다 — PD-UX-002 의 census 승인 경계 밖에서 새 URL producer 를 만들지 않기 위해서다. | [note/page.tsx](../../frontend/src/app/note/page.tsx), [ApprovalHubClient](../../frontend/src/app/approvals/ApprovalHubClient.tsx), [쪽지 페이징 계약](../../frontend/src/app/note/__tests__/NotePage.validation.test.tsx), [결재함 페이징 계약](../../frontend/src/app/approvals/__tests__/ApprovalHubClient.actions.test.tsx) | 2026-09-05 | - |

## DEC-OPS-034

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-034 | accepted | 게시글 작성 화면 3종을 정본 `/admin/community/boards/insert-board-article`(`BoardRegistClient`) 하나로 **수렴**하고, 첨부 **삭제 경로**를 연다(감사 5순위, D06-01·D06-02). ① 정본을 상위집합으로 만든다 — 새 첨부는 서버 액션 FormData `files` 로 실어 보내고(액션은 이미 그 키를 읽고 있었지만 화면에 파일 입력이 없었다), 수정 모드는 기존 첨부를 나열해 건별 삭제하며, `write` 화면만 갖고 있던 게시 기간·행사 일자 입력을 옮겼다(기간이 집행되지 않는다는 문구와 `BoardPredicate` 부재를 honest-affordance 계약이 함께 고정). ② `/admin/community/boards/write`·`/admin/community/boards/[id]` 는 page-redirect 로 정본에 보내고 클라이언트·테스트를 삭제했다(`/admin/survey` 선례 — 문자열 URL 참조는 정적 분석으로 안 잡혀 라우트 물리 삭제는 하지 않는다). 인바운드 링크 2건은 `?bbsId=` 를 실어 정본으로 직접 간다. `[id]` 의 식별자는 종전 화면이 쓰지 않았으므로 게시판 ID 로 해석하지 않는다(H4). ③ 백엔드 `DELETE /api/v1/files/{atchFileSn}/{fileSn}` 을 신설하고 삭제 인가를 열람 정책과 **별개의 판정** `FileAccessPolicy#assertDeletable` 로 둔다 — 업로더 본인·참조 행 소유자·(개인 귀속이 아닌 첨부의) 관리자만 지우고, **공유 열람 근거는 삭제 근거가 아니다**. ④ overlay 의 두 라우트 disposition 을 `consolidate-to-canonical`(proposed)로 제안한다 — 개별 승인은 owner PR 리뷰(ADR-0007). 게시글 삭제 시 첨부 물리 삭제는 보존 정책 결정 전까지 하지 않는다(GAP-STORAGE-001 (b)와 함께 설계). | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 작성 화면이 셋이고 어디서 들어왔느냐에 따라 첨부·임시저장·편집기가 있거나 없었다(D06-01, P2). 첨부는 서비스 계층 `deleteFile` 만 있고 HTTP 노출도 화면 버튼도 없어 한 번 올리면 지울 수 없었다(D06-02, P2) — 프런트는 2026-08-05 에 405 를 만나던 메서드를 제거하며 "인가와 함께 먼저 설계할 것" 을 남겼고, 이번에 그 순서대로 했다. ⚠ 실측이 감사와 달랐던 점: 정본 화면에는 첨부 UI 가 아예 없었고(감사는 '첨부' 를 갖춘 것으로 기술), `[id]` 화면은 인바운드 0·`id` 미사용이었다. 그래서 '나머지 둘을 리다이렉트' 만으로는 기능이 사라지므로 정본을 먼저 상위집합으로 만들었다. 삭제 판정을 `assertReadable` 재사용이 아닌 별도 표로 둔 이유: 비밀글이 아닌 게시글 첨부는 인증 사용자 누구나 읽지만 그것이 남의 첨부를 지울 권리는 아니다 — 계약 테스트가 '공유 근거만 있는 타인은 읽지만 못 지운다' 를 대조군으로 고정한다(H3). 같은 화면의 native `confirm()`(임시저장 복구)은 useConfirm 이 들어오며 이름이 겹쳐 함께 이행했다 — 감사 9순위 D06-03 의 4곳 중 1곳이 먼저 닫혔다. 하네스 갱신: 인가 정책 census DELETE 4행 + manual guard 1행(registry 해시 재결속), 생성 계약 370→374, boundary census, 폼 검증 census(−2 화면 +1 destructive action), capabilities·overlay(manifest sha)·URL-state census(registry sha) 재생성, reachability/capabilities 계약 alias 17→19·pageRedirects 5→7. | [BoardRegistClient](../../frontend/src/app/admin/community/boards/insert-board-article/BoardRegistClient.tsx), [첨부 계약](../../frontend/src/app/admin/community/boards/insert-board-article/__tests__/BoardRegistClient.attachment.test.tsx), [FileAccessPolicy](../../business-core/src/main/java/nuri/business/service/file/FileAccessPolicy.java), [FileAccessPolicyTest](../../business-core/src/test/java/nuri/business/service/file/FileAccessPolicyTest.java), [FileApiController](../../api-server/src/main/java/nuri/api/controller/business/file/FileApiController.java), [write redirect](../../frontend/src/app/admin/community/boards/write/page.tsx), [overlay](../../config/ui-navigation-disposition-proposal.json) | 2026-09-05 | - |

## DEC-OPS-035

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-035 | accepted | 메일·문자 발송의 **수신자 피커를 공용화**하고 주소록을 그 데이터 소스로 편입한다(감사 6순위, D09-02·D09-03·D09-04). ① 공용 `RecipientPicker`(사용자 검색 탭 · 주소록 탭, 다중 선택, 채널에 맞는 연락처가 있는 명함만 선택 가능)를 메일 작성·문자 작성에 붙인다. 직접 입력(이메일·번호)은 보존한다. ② 서버가 연락처를 해석한다 — 코어 `UserContactService`(esntlId→이메일·휴대전화, 요청 순서 보존·미존재 거부)를 두고, 메일은 `SentMailDto.recipients[{esntlId|emlAddr}]`(수신자마다 발송 이력 1건 — 100자 `recptnPerson` 한계 제거, 종전 필드는 호환 유지), 문자는 `SmsRecptnDto{esntlId|rcptnTelno}` 로 받는다. 등록 연락처가 없는 사용자가 하나라도 있으면 **이름을 밝히고 전체를 거부**한다(부분 발송 금지). ③ 사용자 검색 응답은 종전대로 개인정보를 담지 않으며, 해석된 연락처는 발송에만 쓰고 어떤 응답에도 실리지 않는다(H3). ④ app→core 결합 census 24→26(mail→user·sms→user)을 사유와 함께 갱신한다. | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 쪽지는 사용자 검색 피커로 사람을 고르는데 메일은 "이 화면은 ID로 주소를 찾지 못합니다" 라며 이메일만 받았고, 선택한 수신자를 쉼표로 이어 100자 컬럼에 넣어 3명 이상 동시 발송이 사실상 불가했으며(D09-02), 주소록은 어떤 발송 화면에서도 쓰이지 않는 고립된 CRUD 였고(D09-03), 문자는 서버가 수신자 배열을 받는데 화면이 번호 1건만 받았다(D09-04). ⚠ 화면이 주소를 해석할 수 없는 것은 결함이 아니라 설계다 — `UserSearchDto` 는 개인정보를 의도적으로 뺐다(계정 열거·연락처 노출 방어). 따라서 피커가 사람을 고르는 권한이 연락처를 읽는 권한으로 넓어지지 않도록 해석을 서버에 두고 결과를 응답으로 되돌리지 않았다. 다수 수신은 수신자 테이블 신설 대신 발송 건당 1수신자로 나눴다 — DB 변경 없이 컬럼 폭 제약을 없애고, 수신자별 결과가 이력에 따로 남아 문자의 `수신자 결과` 와 같은 모양이 된다. 시드 사용자에는 연락처가 없으므로 e2e 는 `PUT /users/me` 로 이메일을 먼저 등록한 뒤 이름으로 자신을 골라 완주한다. 피커의 탭은 Radix Tabs 대신 수동 구현이다 — jsdom 에서 role=tab 도 비활성 패널 숨김도 만들지 않아 계약 테스트가 두 패널을 동시에 보게 되기 때문이다. | [RecipientPicker](../../frontend/src/app/components/ui/recipient-picker.tsx), [피커 계약](../../frontend/src/app/components/ui/__tests__/recipient-picker.test.tsx), [UserContactService](../../business-core/src/main/java/nuri/business/service/user/UserContactService.java), [MailService](../../business-app/src/main/java/nuri/business/service/mail/MailService.java), [SmsService](../../business-app/src/main/java/nuri/business/service/sms/SmsService.java), [MailSendHubClient](../../frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx), [SmsAdminClient](../../frontend/src/app/admin/uss/ion/sms/SmsAdminClient.tsx), [결합 census](../../api-server/src/test/java/nuri/api/harness/CrossDomainCouplingLinterTest.java) | 2026-09-05 | - |

## DEC-OPS-036

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-036 | accepted | 운영 도메인 3종(외부인사·포상·템플릿)에 **정정 경로**를 연다(감사 7순위, D11-01·D11-02). 백엔드에 `PUT/DELETE`(외부인사 `/{evntSn}/{otsdHrId}` 복합키, 포상 `/{rwrdSn}`, 템플릿 `/{tmpltId}`)와 서비스 `update/delete`(없는 대상은 `RESOURCE_NOT_FOUND` — 종전 템플릿 `deleteById` 는 없는 ID 도 조용히 성공했다)를 신설하고, 화면 3종에 행 액션(수정 모달 재사용·식별자 잠금, 확인 후 삭제·동기 잠금·`aria-busy`)을 붙인다. 외부인사 DTO 를 물리 컬럼과 정합(`gndrCd` 30→12, `emlAddr` 50→320)하고 `InputContractMirrorLinter` 표적에 편입한다(GAP-CONTRACT-001 확장, 13→14 묶음). 포상 DTO 에 컬럼 폭 `@Size` 8종을 추가한다(레거시 필드명이라 이름 기반 바인딩은 불가). 템플릿 삭제는 참조 차단을 두지 않는다 — `tb_bbs_master.tmplt_id`·`tb_blog_info.tmplt_id` 는 물리 FK 없는 문자열 참조라 DB 도 막지 않으며, 차단하려면 board/blog 도메인 결합이 필요해 이번 범위 밖이다(확인 모달이 그 사실을 고지). | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 행사는 완전한 CRUD 인데 같은 메뉴의 외부인사·포상은 GET·POST 뿐이었고 템플릿은 GET·GET/{id}·POST 뿐이라 이름 오타 하나도 정정할 수 없었다 — 데이터가 쌓일수록 신뢰도가 떨어지는 축이다. ⚠ 표적 편입이 실제 결함을 드러냈다: 외부인사 DTO 는 `gndrCd` 를 30자까지 받아 12자 컬럼에 넣으려 했고, `emlAddr` 은 컬럼(320)보다 좁은 임의 제한(50)이었다. 포상 DTO 는 검증 애노테이션이 0개였다(13자 코드가 12자 컬럼에서 DB 오류로 죽는 경로). 수정자(`lastMdfrId`)는 요청 본문이 아니라 인증 주체에서 온다(게시글·메일과 같은 규칙). 하네스 갱신: 인가 정책 census 6행(RBAC URL 게이트) + registry 해시, `LENGTH_BINDINGS` 동결 69→79 재결속, 생성 계약 374→380 + boundary census, 폼 검증 census(destructive action 3건 compliant), e2e 는 포상 등록→검색→이름 정정→삭제 완주를 추가했다. | [ExternalHrService](../../business-app/src/main/java/nuri/business/service/event/ExternalHrService.java), [RewardManageService](../../business-app/src/main/java/nuri/business/service/reward/RewardManageService.java), [TmplatInfoService](../../business-app/src/main/java/nuri/business/service/template/TmplatInfoService.java), [행 액션 계약](../../frontend/src/app/admin/operation/external-hr/__tests__/ExternalHrClient.row-actions.test.tsx), [포상 행 액션 계약](../../frontend/src/app/admin/operation/rewards/__tests__/RewardManageClient.row-actions.test.tsx), [TemplateAdminClient](../../frontend/src/app/admin/community/templates/TemplateAdminClient.tsx), [InputContractMirrorLinterTest](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java) | 2026-09-05 | - |

## DEC-OPS-037

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-037 | accepted | 업무함·커뮤니티에 **관리 화면**을 잇는다(감사 8순위, D10-01·D07-01). ① 워크허브 업무 탭에 관리자 전용 '업무함 관리' 다이얼로그(목록·등록·수정·삭제, `/dept-jobs/boxes` CRUD 5본 소비)를 붙이고, 만든 함은 업무 등록 폼 선택지(`['dept-job-boxes']`)와 업무 목록(`['work-jobs']`)이 즉시 다시 읽는다. 삭제는 서버가 산하 업무가 남아 있으면 409 로 거부하는 규칙을 화면이 미리 고지하고 실패 메시지를 그대로 드러낸다. ② 지식 허브 커뮤니티 탭에 관리자 전용 '커뮤니티 관리' 다이얼로그(목록·등록·수정·폐쇄, `/admin/content/community` CRUD 소비)를 붙인다. 서버 DELETE 가 `useYn='N'` 논리 삭제이므로 화면 동사는 **'폐쇄'** 이고, 폐쇄된 커뮤니티는 '사용 안 함' 으로 남아 수정에서 다시 열 수 있다. ③ 두 DTO 의 이름에 `@NotBlank` 를 둔다 — 컬럼은 nullable 이라 물리 미러가 아닌 **제품 규칙**이며(`@Size(100)` 만 컬럼 미러), 이름 없는 함·커뮤니티는 선택지·목록에서 빈칸이 된다. ④ 두 버튼의 표시 판정은 라우트 게이트와 같은 역할 집합(DEC-OPS-023 ②)이고 다이얼로그는 열릴 때만 마운트한다. 가입 승인 전이(GAP-CMTY-001)는 이 결정에 포함하지 않는다. | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 업무함 CRUD 5본과 커뮤니티 관리 CRUD 는 서버·프런트 서비스에 다 있었는데 화면 호출부가 0건이라, 시드가 없으면 모든 업무가 '업무함 미지정' 으로 남고 커뮤니티 생성이 시드에 의존했다(A. API 는 있는데 화면이 없다). 허브 화면이 아니라 다이얼로그로 둔 이유는 두 자원이 각 허브의 부속 구조물이고 새 URL·라우트·query 상태를 만들지 않기 위해서다(PD-UX-002 census 경계). 커뮤니티 '삭제' 를 '폐쇄' 로 부른 것은 화면이 없는 일(영구 삭제)을 약속하지 않기 위해서다(C. 화면이 사실과 다른 말을 한다 — 의 예방). ⚠ 폼 검증 census 는 pending 상태 식별자를 어휘(`PENDING_STATE_NAME`)로 거르므로 커뮤니티 폐쇄의 상태 이름을 `pendingCloseSn` 으로 맞췄다 — 어휘 밖 이름(`closingSn`)은 구현이 같아도 red 였다(가설 2개 실험으로 확정). 하네스 갱신: 폼 검증 census +4(native-form 2 compliant · destructive action 2 compliant, 각각 단일 테스트 안에 중복 차단·pending·실패 피드백 증거), OpenAPI 재export(두 이름 필드 required 화) + 계약 동기화 + boundary census, 컨트롤러 400 테스트 2건. e2e 는 추가하지 않았다(다이얼로그 단위 계약 13건 + 허브 진입 계약 7건으로 대체). | [DeptJobBoxManageDialog](../../frontend/src/components/business/deptJob/DeptJobBoxManageDialog.tsx), [CommunityManageDialog](../../frontend/src/components/business/community/CommunityManageDialog.tsx), [WorkHubClient (당시 소스)](https://github.com/lkindo/egov-enterprise/blob/0fab2c7980cab38b3ae99f8b7ea262abf2daf73d/frontend/src/app/admin/work-hub/WorkHubClient.tsx), [KnowledgeHubClient](../../frontend/src/app/admin/help/KnowledgeHubClient.tsx), [업무함 계약](../../frontend/src/components/business/deptJob/__tests__/DeptJobBoxManageDialog.test.tsx), [커뮤니티 계약](../../frontend/src/components/business/community/__tests__/CommunityManageDialog.test.tsx), [DeptJobBoxDto](../../business-core/src/main/java/nuri/business/service/deptjob/dto/DeptJobBoxDto.java), [CommunityDto](../../business-app/src/main/java/nuri/business/service/community/dto/CommunityDto.java) | 2026-09-06 | - |

## DEC-OPS-038

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-038 | accepted | 감사 9순위 **마감** 네 축을 닫는다(D06-03·D09-05·D09-06·D05-01). ① 남은 네이티브 `confirm()` 3곳(댓글 삭제·부서 일정 삭제·설문 응답 삭제)을 `useConfirm` destructive 모달로 옮기고, 재유입을 `native-confirm-guard` 계약(0 고정 — `window.confirm(`·문자열 인자 `confirm(`)으로 막는다. ② 알림 센터의 '발송 미리보기 (데모)' 뷰(`?view=dispatch`)·`NotificationSender`·260px 장식 히어로를 걷는다. 발송을 실제 기능으로 승격하지 않은 이유는 수신자 해석·인가 설계가 선행이기 때문이며, capabilities census 의 `notifications.dispatch-preview` capability 와 URL-state producer 도 함께 제거했다. ③ 읽은 알림 보존·정리 스케줄러(`NotificationRetentionScheduler`)를 로그 파기와 같은 모양으로 두되 **기본 비활성**·`read-months<1` 이면 삭제하지 않는 하한 가드를 둔다. 보존 개월 수치는 PD-NOTE-003 로 인수처 결정에 남긴다. 읽지 않은 알림은 대상이 아니다. ④ `/admin/system/layout`(브라우저 localStorage 전용 개인 설정)은 마이페이지가 없어 옮길 곳이 없으므로 disposition overlay 에 `demo-isolated` 를 **제안**한다(proposed — 개별 승인은 owner PR 리뷰, ADR-0007). | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: 저장소는 확인 대화 45곳을 `useConfirm` 으로 이행해 두고 4곳만 남겨 문구·키보드·보조기술 동작이 갈렸고(1곳은 DEC-OPS-034 에서 먼저 닫혔다), 알림 발송 뷰는 "서버에는 어떤 내용도 저장하거나 전송하지 않습니다" 라고 스스로 밝히는 데모였으며, 알림은 사용자 탈퇴 때만 정리돼 읽은 알림도 영구 누적됐다. ⚠ 확인이 비동기(모달)가 되면서 세 화면의 기존 테스트가 `window.confirm` stub 에 의존하던 것을 모듈 mock 으로 바꿨고, sink 호출 단언은 다음 틱(`waitFor`)으로 옮겼다 — 동기 잠금(ref)이 모달 대기 중에도 재진입을 막는다는 사실은 그대로 계약이다. 하네스 갱신: capabilities 계약 2건 정정(삭제한 데모 파일을 읽던 검사 → '데모가 없어야 한다', false-live 검사 대상을 같은 라우트의 health-metrics 로), overlay manifest sha 재결속, URL-state 재생성(−244줄)·승인 sha 재결속, 접근성 스펙 2건 제거. | [native-confirm-guard](../../frontend/src/__tests__/native-confirm-guard.test.ts), [NotificationsClient](../../frontend/src/app/admin/notifications/NotificationsClient.tsx), [NotificationRetentionScheduler](../../business-app/src/main/java/nuri/business/service/notification/NotificationRetentionScheduler.java), [보존 정책](../04-operations/log-retention-policy.md), [PD-NOTE-003](../04-operations/pending-decisions.md), [overlay](../../config/ui-navigation-disposition-proposal.json) | 2026-09-06 | - |

## DEC-OPS-039

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-039 | accepted | 감사 10순위 — **ISM → 결재함 통합 제안과 어휘 통일**(D08-05·D12-02). ① disposition overlay 에서 `/admin/system/ism` 을 `retain-canonical` → `consolidate-to-canonical` 로 **제안**한다(proposed, 정본은 `/approvals`; 개별 승인은 owner PR 리뷰, ADR-0007). 라우트·메뉴·리다이렉트는 승인 전이라 손대지 않는다. ② 그 전이라도 어휘를 결재함 쪽으로 통일한다 — 약식 결재 화면의 확정 동사 '최종 승인' → '승인', 상태 라벨 '승인됨/결재 대기' → '승인 완료/대기 중'(결재함 `ApprovalStatusBadge` 와 동일), 화면·메타 설명을 실제 조회 조건(결재자 본인 기준 = 결재함과 같은 개인 결재함)대로 고친다. ③ 온라인 투표 관리 화면의 명칭을 '온라인 설문 관리' → '온라인 투표 관리' 로 바꾸고 설명에 문항형 설문조사와의 분리를 명시한다. 백엔드 컨트롤러 중복(`OnlinePollApiController`·`PollApiController` 가 같은 서비스를 감쌈)은 API 제거를 동반하므로 이 결정의 범위 밖이다. | 사용자 지시(2026-09-05 "모두 순서대로 진행")와 결정 위임(2026-08-23)에 따른 집행이다. 감사 실측: `/admin/system/ism` 은 "시스템에서 발생하는 약식 결재 요청" 이라고 설명하지만 조회는 `type=received`(결재자 본인)이고 승인도 본인만 가능해 `/approvals` 와 같은 개인 결재함이었으며, 단일 단계 결재에 '최종' 은 없는 단계를 암시했다. 투표는 항목 하나를 고르는 `vote()` 인데 '설문' 으로 표기돼 문항형 설문조사와 이름이 겹쳤다. 통합 자체(리다이렉트)를 이번에 하지 않은 이유는 overlay 의 consolidate 는 owner 승인 경계이고, 승인 전 이행은 DEC-OPS-023·034 의 선례와 같이 census 의 신호를 앞질러 지우는 방향이기 때문이다. | [overlay](../../config/ui-navigation-disposition-proposal.json), IsmClient(2026-09-06 DEC-OPS-040 으로 `/approvals` 에 통합되며 삭제 — 현재는 [ISM redirect](../../frontend/src/app/admin/system/ism/page.tsx)), [OnlinePollAdminClient](../../frontend/src/app/admin/survey/polls/OnlinePollAdminClient.tsx), [ApprovalHubClient](../../frontend/src/app/approvals/ApprovalHubClient.tsx) | 2026-09-06 | - |

## DEC-OPS-040

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-040 | accepted | 2026-09-05 감사가 남긴 disposition overlay 제안 11건을 owner 승인으로 확정한다(사용자 위임 2026-09-06 — "승인이 필요한 항목은 권고안을 수용"). ① `/admin/system/ism` → `/approvals` page-redirect 이행(IsmClient·테스트 삭제, DEC-OPS-039 제안 확정) ② `/admin/community`·`/admin/community/boards` → `/admin/help?tab=COMMUNITY` page-redirect(둘 다 같은 KnowledgeHubClient COMMUNITY 탭을 다른 주소로 중복 렌더) ③ `/admin/system/monitoring` → `/admin/system/monitoring/hub` page-redirect(같은 MonitoringHubClient 중복, config redirect 목적지가 이미 허브) ④ `/admin/system/layout` demo-isolated — demo pack `removePaths` 편입(localStorage 전용 개인 설정, DEC-OPS-038 ④) ⑤ 이미 config redirect 로 통합돼 있던 `/admin/observability`·`/admin/security/audit`·`/admin/system/audit`·`/admin/user/login-policy` 와 DEC-OPS-034 의 `/admin/community/boards/write`·`[id]` 는 승인 레코드만 남긴다. 승인 4축(domain·productIa·securityPrivacy·accessibility)의 reviewer 는 `lkindo (사용자 위임 2026-09-06 · DEC-OPS-040)` 이며, 메뉴 행과 DB 는 손대지 않는다(별칭이 리다이렉트로 흡수). | ADR-0007 §Decision 4 는 route 별 개별 승인을 owner PR 리뷰로 두는데 단독 운영에서 실존 결정권자는 저장소 소유자뿐이고(DEC-OPS-013), 사용자가 2026-09-06 그 승인을 Claude 권고안 수용으로 위임했다. 리다이렉트 이행은 DEC-OPS-034 선례(page-redirect, 물리 삭제 없음)를 따랐다. 게이트 갱신: capabilities alias 19→23, URL-state pageRedirects 7→11, A1 adopters 40→39, status-color BASELINE 521→512, 폼 검증 census −1(IsmClient), overlay manifest sha 재결속, e2e 18 은 별칭 도달 검증으로 축소(결재 완주는 11 이 담당). | [overlay](../../config/ui-navigation-disposition-proposal.json), [capabilities census](../../config/ui-route-capabilities.json), [ISM redirect](../../frontend/src/app/admin/system/ism/page.tsx), [community redirect](../../frontend/src/app/admin/community/page.tsx), [monitoring redirect](../../frontend/src/app/admin/system/monitoring/page.tsx), [reusable-base manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json) | 2026-09-06 | DEC-OPS-039 의 overlay 제안(proposed)을 승인으로 종료 |

## DEC-OPS-041

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-041 | accepted | 온라인 투표 API 의 중복 컨트롤러를 정리한다(감사 D12-02 후속, 사용자 위임 2026-09-06). `OnlinePollApiController`(`/api/v1/admin/system/polls` — 목록·상세·등록·투표 4본)는 `PollApiController`(`/api/v1/polls` — 같은 `OnlinePollService` 를 감싸는 CRUD·투표·항목 7본)의 부분집합이라 제거하고, 관리 화면(`OnlinePollAdminClient`·`SurveyStatsClient`)과 프런트 `OnlinePollAdminService` 소비를 `PollUserService`(/polls)로 옮긴다. 인가 의미는 변하지 않는다 — `/polls` 의 등록·수정·삭제는 서비스 가드(`OnlinePollService#insertPoll` 등 assertAdmin)가 ADMIN/SYSTEM 을 강제하고 투표는 인증 사용자다(H3). 설문 허브에 '온라인 투표 관리로 이동' 링크를 두어 투표가 문항형 설문조사와 다른 제품임을 안내한다. | 감사 실측: 두 컨트롤러가 같은 서비스를 감싸 API 표면이 둘이었고 프런트 서비스도 둘이었다(D12-02). 하위집합을 지우는 쪽이 소비자 이행 비용이 가장 적고, 관리 화면이 이미 `/polls` 와 같은 DTO 를 쓴다. 게이트: 인가 정책 census −2행(registry 해시), 읽기 인가 표면 178→176(hash 재결속), 생성 계약 380→376 + boundary census, survey pack removePaths −1, GeneratedAdminBoundaryWave4 12/22→10/20. | [PollApiController](../../api-server/src/main/java/nuri/api/controller/business/poll/PollApiController.java), [PollUserService](../../frontend/src/services/business/user/poll/PollUserService.ts), [OnlinePollAdminClient](../../frontend/src/app/admin/survey/polls/OnlinePollAdminClient.tsx), [SurveyHubClient](../../frontend/src/app/admin/survey/hub/SurveyHubClient.tsx) | 2026-09-06 | - |

## DEC-OPS-042

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-042 | accepted | 관리자 알림 발송을 실기능으로 잇는다(감사 D09-05 후속, 사용자 위임 2026-09-06). `POST /api/v1/admin/notifications/dispatch`(`@AdminOrSystem`)가 `NotificationDispatchRequest{recipients[{esntlId}]≤100, 제목 100, 내용 4000, 링크 2000}` 를 받고, `NotificationService.dispatchToUsers` 가 `assertAdmin` 뒤 코어 `UserContactService` 로 수신자 존재를 확인해(하나라도 없으면 404 로 전체 거부 — 부분 발송 금지, 메일·문자와 같은 규칙) 사람마다 `createNotification` 을 지나 WebSocket 개인 큐·커밋 후 발송 규칙을 그대로 쓴다. 화면은 알림 센터의 '알림 보내기'(라우트 게이트와 같은 역할 집합에만 표시, 열릴 때만 마운트) → `NotificationDispatchDialog`(공용 `RecipientPicker` 의 `notification` 채널 — 계정 전달이라 주소록 탭 없음). | 종전 알림 센터의 '발송' 은 서버에 아무것도 보내지 않는 데모였고 DEC-OPS-038 이 "수신자 해석·인가 설계가 선행" 이라며 걷었다. 기존 `POST /api/v1/notifications` 는 로그인한 본인의 알림을 만드는 개인 API 라 관리자가 다른 사용자에게 보낼 경로가 없었다(감사의 '관리자 알림 생성 API' 서술은 이 점에서 부정확했다). 수신자 해석은 DEC-OPS-035 와 같은 esntlId 축·코어 해석·부분 발송 금지를 그대로 쓴다. 게이트: 인가 정책 census +2행(endpoint·serviceGuard)과 registry 해시, app→core 결합 26→27(notification→user), capabilities `notifications.dispatch`(partial + candidateStatus live, E3 — live 는 E4 왕복 산출물 필요), supportedActions +send, 폼 검증 census +1, 생성 계약 +1 + boundary census, URL-state census·overlay sha 재결속. | [NotificationAdminApiController](../../api-server/src/main/java/nuri/api/controller/business/notification/NotificationAdminApiController.java), [NotificationService](../../business-app/src/main/java/nuri/business/service/notification/NotificationService.java), [NotificationDispatchDialog](../../frontend/src/app/admin/notifications/NotificationDispatchDialog.tsx), [RecipientPicker](../../frontend/src/app/components/ui/recipient-picker.tsx) | 2026-09-06 | - |

## DEC-OPS-043

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-043 | accepted | 커뮤니티 **가입 승인·반려 전이**를 잇는다(GAP-CMTY-001, 사용자 위임 2026-09-06). ① 멤버십 상태 어휘를 `CommunityMemberStatus`(REQUESTED=`A`·APPROVED=`P`, 엔티티 `approve()` 가 쓰던 값 그대로)로 명명하고, 관리자 API 3본 — `GET/PATCH/DELETE /api/v1/admin/content/community/{cmntySn}/members[/{userId}[/approve]]`(`@AdminOrSystem` + 서비스 `assertAdmin` 2차 가드) — 과 사용자 API `GET /api/v1/communities/{cmntySn}/membership`(principal 자신의 행만, NONE·REQUESTED·MEMBER·UNKNOWN)을 신설한다. 승인은 신청(`A`) 행만 회원(`P`)으로 옮기고, 반려는 신청 행을 지워 재신청을 허용하며, **회원 행은 반려 대상이 아니다**(탈퇴·강제 탈퇴 절차는 만들지 않는다 — 400 INVALID_STATE). ② 화면 — 지식 허브 '커뮤니티 관리' 다이얼로그 행의 '회원 관리' 가 `CommunityMembersPanel`(기본 필터 '가입 신청', 승인은 확인 없이·반려는 destructive 확인, 잠금 ref + 처리 중 disabled/aria-busy)을 열고, 커뮤니티 상세는 내 멤버십에 따라 신청 버튼을 '가입 승인 대기 중'/'회원' 상태 표시로 바꾸며 문구를 실제 절차로 갱신한다(회원이 되어도 열리는 기능이 없으므로 '이용할 수 있다' 고는 말하지 않는다). ③ 회원 이름 해석을 위해 app→core 결합 `community → user`(`UserRepository#findByEsntlIdIn`) +1(26→27) — 이름만 싣고 연락처는 내보내지 않으며 찾지 못한 사용자는 null 로 둔다. 승인 권한은 시스템 관리자(ADMIN/SYSTEM)뿐이다 — `mngrYn='Y'` 를 부여하는 경로가 없어 커뮤니티 운영자 위임은 범위 밖이다. | 감사 실측: 가입은 `mbrSttsCd='A'` 행을 만들지만 그 값을 읽거나 옮기는 코드가 저장소 전체에 0건이라 dead write 였고(GAP-CMTY-001), 2026-08-28 에 화면이 없는 절차를 약속하던 문구를 걷어낸 상태였다. 선택지는 ⓐ 절차를 만든다 ⓑ 가입 버튼·API 를 걷는다 였는데, 엔티티·DDL(`tb_cmnty_user_map`, `approve()`, `mngrYn`)이 이미 멤버십 모델을 갖추고 있고 `BoardMaster.cmntySn`·`findByCmntySnAndUseYn`(호출자 0) 이 커뮤니티 귀속 콘텐츠의 후속 방향을 가리키므로 ⓐ 를 택했다. 반려를 '삭제' 로 둔 것은 상태 코드를 지어내지 않기 위해서고(어휘 밖 코드는 UNKNOWN 으로 드러낸다), 회원 삭제를 막은 것은 반려 버튼이 조용한 강제 탈퇴가 되지 않게 하기 위해서다(H3). 멤버십이 아직 아무 기능도 열지 않는다는 사실은 그대로이며 gap 의 잔여 범위로 남긴다. 게이트: 인가 정책 registry +2 endpoint·+3 serviceGuard(해시 재결속), 읽기 인가 표면 178→180(사유 주석), APP_TO_CORE 해시, 생성 계약 4종 + boundary census, generated-operations 380→384, 폼 검증 census +2, URL-state census 재생성·승인 sha 재결속. | [CommunityService](../../business-app/src/main/java/nuri/business/service/community/CommunityService.java), [CommunityMemberStatus](../../business-app/src/main/java/nuri/business/domain/community/CommunityMemberStatus.java), [CommunityApiController](../../api-server/src/main/java/nuri/api/controller/business/admin/content/community/CommunityApiController.java), [CommunityMembersPanel](../../frontend/src/components/business/community/CommunityMembersPanel.tsx), [패널 계약](../../frontend/src/components/business/community/__tests__/CommunityMembersPanel.test.tsx), [CommunityDetailHubClient](../../frontend/src/app/cop/cmy/selectCommunityDetail/[id]/CommunityDetailHubClient.tsx) | 2026-09-06 | - |

## DEC-OPS-044

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-044 | accepted | 게시글 쓰기 API 의 두 계열을 `/api/v1/boards` 한 네임스페이스로 정리한다(감사 잔여 항목, 사용자 승인 2026-09-06). ① `BbsApiController`(`/api/v1/bbs`, 태그 `Board Legacy`)의 **목록·상세·삭제 3본을 제거**한다 — 셋 다 `/api/v1/boards` 와 같은 `BoardService` 메서드(`getBoardPosts`·`getPostDetail`·`deletePost`)를 부르는 순수 복제였고(목록은 필터 5개가 빠진 부분집합) 프런트 소비자가 0건이었다. ② 첨부를 붙일 수 있는 유일한 쓰기 경로인 multipart 2본은 같은 네임스페이스로 옮긴다 — `POST /api/v1/boards/{bbsId}/posts/with-files`, `PUT /api/v1/boards/{bbsId}/posts/{pstSn}/with-files`(operationId `createPostWithFiles`·`updatePostWithFiles`). ③ 프로덕션 호출부가 0건이던 `BoardAdminService.createBoardArticle` 과 그 계약 테스트 블록을 제거한다. JSON 쓰기 2본(`POST /boards/posts`·`PUT /boards/{bbsId}/posts/{pstSn}`)과 인가 의미는 무변경이다 — 옮긴 두 본의 정책은 종전과 같은 `AUTHENTICATED`·`OWNER_OR_ADMIN`(`BoardService#findOwnedPost`)이고, 지운 셋 중 읽기 2본은 남는 `/boards` 읽기와 같은 `DEFAULT_AUTHENTICATED|isAuthenticated()` 였으므로 공개 전환이 아니라 표면 축소다(H3). | 감사 실측: `Board Legacy` 라는 이름과 달리 그 컨트롤러는 레거시가 아니라 **첨부를 붙일 수 있는 유일한 등록·수정 경로**였고, DEC-OPS-034 가 정본으로 수렴시킨 작성 화면이 첨부가 있으면 실제로 그것을 부르고 있었다. 이름이 사실과 달랐다. 나머지 3본은 같은 서비스 메서드를 감싼 중복이라 DEC-OPS-041(투표 컨트롤러 통합)과 같은 근거로 지웠다. ⚠ 설계 대안 하나는 **실측으로 폐기**했다 — JSON 수정과 같은 URL 에 `consumes` 만 다른 핸들러를 나란히 두는 안은 springdoc 이 두 핸들러를 하나의 operation 으로 병합해 requestBody 에 미디어 타입 2종을 싣고(실측: `updatePostWithFiles` 가 `multipart/form-data` 와 `application/json` 을 함께 문서화), 생성기 `codegen-zod` 가 "must declare exactly one requestBody content type" 로 fail-closed 한다. 그래서 첨부 동반 쓰기를 경로 끝 `/with-files` 로 등록·수정 대칭으로 갈랐다. JSON 등록만 `bbsId` 를 본문으로 받는 비대칭은 소비자 이행 비용 때문에 남긴다. 게이트: 인가 정책 census 203→202행(+`__registry` 해시), 읽기 인가 표면 178→176(사유 주석·해시 재결속), generated-operations 381→378, 생성 계약 3종 + boundary census, OpenAPI multipart 동결 경로 갱신, `BbsApiControllerTest`→`BoardMultipartWriteApiControllerTest`(제거된 3본의 테스트는 함께 삭제, 첨부 유무 4경우 + 인증 주체 고정), 프런트 multipart 클라이언트 계약과 e2e 03 의 이중 인터셉트 정리. | [BoardApiController](../../api-server/src/main/java/nuri/api/controller/business/board/BoardApiController.java), [multipart 쓰기 계약](../../api-server/src/test/java/nuri/api/controller/business/board/BoardMultipartWriteApiControllerTest.java), [boardActions](../../frontend/src/app/actions/boardActions.ts), [authorization-policies](../../config/governance/authorization-policies.json) | 2026-09-06 | - |

## DEC-OPS-045

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-045 | accepted | 감사 잔여 소규모 정정 2건(사용자 승인 2026-09-06). ① **외부인사 수정 폼이 서버에 없는 필수 규칙을 강제하던 것을 푼다** — 등록·수정이 스키마 하나를 공유해 성명·소속기관·지역번호·국번·종번·이메일·생년월일 7필드가 수정에도 필수였다. 수정 전용 `externalHrEditSchema` 를 두어 필수만 해제하고 **형식은 그대로 본다**(이메일 형식·생년월일 8자리는 값이 있을 때만 검사). 식별자 2필드는 등록·수정 공통으로 유지하며 수정 모드에서는 입력이 잠긴다. 등록 폼 규칙은 무변경이다. ② **읽은 알림 파기 설정을 운영 컨테이너에 전달한다** — `docker-compose.prod.yml` 의 api `environment` 에 `NOTIFICATION_RETENTION_ENABLED`·`NOTIFICATION_RETENTION_READ_MONTHS`(그리고 명시성을 위해 `LOG_RETENTION_ENABLED`)를 추가한다. 기본값은 그대로 꺼짐이고 보존 개월 수치는 PD-NOTE-003 결정으로 남긴다. 파기 술어용 인덱스는 신설하지 않는다. | ① 실측: 요청 DTO `ExternalHrDto` 에 그 7필드의 `@NotBlank` 가 없고, 엔티티에 `nullable = false` 가 없으며, 물리 컬럼도 NULL 을 받는다. 즉 필수는 **화면이 스스로 만든 규칙**이었고, API·이관으로 최소 필드만 들어온 행은 이름 오타 하나를 고치려 해도 나머지 값을 지어내야 저장됐다. 반대 방향(서버를 조여 실제 필수로 만들기)은 기존 NULL 행 정리와 Flyway 스키마 변경을 동반해 승인 경계로 넘어가므로 화면을 사실에 맞추는 쪽을 택했다. 값을 비우는 것은 사용자의 의도로 받아들인다(PUT 은 전체 치환) — 화면이 묻지 않는 성별·구분 코드만 종전대로 기존 값을 되돌려 보내 NULL 덮어쓰기를 막는다(DEC-OPS-036). red 실측: 단일 스키마로 되돌리면 '빈 칸이 많은 행 수정' 계약이 red 다. ② 실측: 스케줄러·JPQL 삭제 술어·하한 가드·단위 테스트는 DEC-OPS-038 로 이미 갖춰져 있는데 compose 가 **나열된 변수만 전달**하므로 호스트 환경에 값을 넣어도 컨테이너에 닿지 않았다. 즉 인수처가 보존 개월을 정해도 이미지를 고치지 않고는 켤 수 없는 상태였다. 게이트: 폼 검증 census 의 `schemaSource` 를 두 스키마로 명시하고 행 액션 계약을 증거에 추가(총계 144 불변), 문서 2건(보존 정책 켜는 방법·PD-NOTE-003 주석). | [ExternalHrClient](../../frontend/src/app/admin/operation/external-hr/ExternalHrClient.tsx), [수정 모드 계약](../../frontend/src/app/admin/operation/external-hr/__tests__/ExternalHrClient.row-actions.test.tsx), [docker-compose.prod.yml](../../docker-compose.prod.yml), [보존 정책](../04-operations/log-retention-policy.md) | 2026-09-06 | - |

## DEC-OPS-046

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-046 | accepted | 도메인 UX 최적화 브랜치(`feat/domain-process-ux-optimization`)를 병합 가능한 상태로 정정한다. ① **온라인 투표 득표수 은닉을 하나의 규칙으로 모으고 은닉을 `null` 로 표현한다** — `OnlinePollService` 에 `hidesVoteCounts(진행 중 && 관리자 아님 && 미참여)` 판정을 두고 목록·상세뿐 아니라 `getPollItemList`(= `GET /api/v1/polls/{pollSn}/items`)에도 적용한다. 종료·폐기·시작 전 투표는 숨기지 않는다. `hasVoted` 는 관리자를 포함한 모든 인증 주체에게 사실대로 채운다. 기간 판정은 `vote()` 를 포함해 Asia/Seoul 로 통일한다. ② **설문 `maxChcCnt` 가 NULL·0·음수면 단일선택으로 강제한다**(화면과 같은 자리). ③ **메일 이력 화면의 본문 뷰어·첨부 목록을 걷고 계약 단언을 원복한다**(DEC-OPS-022 유지). ④ **주소록의 이메일 URL producer(`?recipient=`·`?to=`)를 만들지 않는다** — 메일 퀵액션을 걷고 `tel:` 링크만 남긴다. ⑤ 워크허브 '메모보고 관리' 를 라우트 게이트와 같은 역할 집합에만 노출한다(DEC-OPS-023 ②). ⑥ `parseScrapUrl` 의 레거시 게시판 변환을 내부 경로에만 적용하고, 게시글 스크랩은 성공 후 잠그며 `scrapNm` 을 컬럼 폭으로 자른다. ⑦ 쪽지 작성 모달을 닫을 때 수신자 칩과 `formData.rcverId` 를 함께 비우고, setState 업데이터 안에서 다른 setState 를 부르지 않는다. ⑧ 결재 기안 취소는 `DELETE /api/v1/approvals/{id}` 로 유지하되(같은 서비스 가드를 쓰는 `/informal-sanctions` 와 공존) 생성 계약을 경유(`cancelApprovalOperation`)하고, 확인 문구에 문서 번호를 싣고, 마지막 페이지가 비면 한 페이지 앞으로 물린다. 미사용 `@LoginUser` 파라미터는 제거한다. | 사용자 지시(2026-09-07 "제미나이가 작업한 브랜치를 확인해 개선")에 따른 집행이다. 브랜치는 거버넌스 산출물을 하나도 갱신하지 않아 required 게이트 **8개가 red** 였다(전부 로컬 실행으로 실측). ⚠ 실측이 드러낸 것 중 셋은 기능이 **반대로 동작**했다. 첫째, 득표수 은닉은 목록·상세에만 걸렸는데 사용자가 실제로 투표하는 화면(`OnlinePollParticipateClient`)이 항목을 읽는 유일한 경로는 `/polls/{pollSn}/items` 였다 — 즉 은닉이 걸린 곳에는 소비자가 없고, 소비자가 있는 곳에는 은닉이 없었다. 게다가 은닉을 `0` 으로 표현해 "아무도 고르지 않았다" 는 사실 주장을 만들었다(만족도 평균이 '평가 없음' 을 0.0 으로 뭉개던 GAP-API-001 과 같은 모양). `null` 은 "말하지 않았다" 이며 응답 zod 가 이미 nullable 로 받는다(DEC-OPS-028). 종료 투표까지 숨기면 미참여자가 결과를 영영 못 보므로 기간을 판정에 넣었다. 둘째, `vote()` 는 `LocalDate.now()`(JVM 기본)로 기간을 판정하는데 같은 도메인의 설문은 Asia/Seoul 이고 프런트는 브라우저 로컬(KST)이다. build.gradle 이 CI 패리티로 테스트 JVM 을 UTC 로 고정하므로 **KST 00~09시에만 하루가 어긋난다** — 이 정정 중 실제로 투표 테스트 9건이 붉어져 기전을 증명했다. 셋째, `maxChcCnt` 는 nullable 이라 대부분의 기존 문항이 NULL 인데 서버는 NULL 을 "무제한" 으로 열어 두고 화면은 `?? 1` 로 라디오를 그렸다. ⚠ 메일 본문은 결정 위반이었다 — DEC-OPS-022 가 "메일 본문은 이 화면에 새로 노출하지 않는다" 로 확정했고, 같은 저장소가 발신 메일 첨부를 `AttachmentSource.SENT_MAIL = PERSONAL` 로 분류해 **관리자 열람을 명시적으로 거부**한다(FileAccessPolicy §5). 그런데 `MailService.getSentMailList` 는 관리자에게 전 사용자의 발신 이력을 내려주므로, 본문만 열면 첨부 정책이 지키는 경계를 옆으로 돌아가게 된다. 그 결정을 지키던 유일한 게이트의 단언이 `queryByText(...).toBeNull()` → `getByText(...)` 로 뒤집혀 있었고 픽스처 이름은 '화면에 표시하면 안 되는 메일 본문' 그대로였다(H2). ⚠ 주소록 퀵액션은 임직원 이메일을 주소창과 same-origin Referer 에 실었다 — ADR-0009 는 route·query allowlist 를 전제로 하고 그 등재가 없었으며, PD-UX-002 의 census 승인 경계 밖에서 새 producer 를 만들지 않는다는 것이 DEC-OPS-033·037 이 지켜 온 선이다. 수신자 선택은 메일 작성 화면의 `RecipientPicker` 주소록 탭이 URL 없이 수행한다. ⚠ `DELETE /api/v1/approvals/{id}` 는 중복 표면 축소(DEC-OPS-041·044)와 어긋나 보이나 **제거하지 않았다** — `/approvals` 가 결재 도메인의 정본 네임스페이스이고(DEC-OPS-030·039·040), 인가 의미는 같은 서비스 가드(`assertOwnerByEsntlId` + `"A"` 상태)가 집행한다(H3). 게이트: 인가 정책 census +1행 + 매니페스트 해시 재결속(bc69fe1ab558→67ffec1c8ebb), api-docs 재생성(경로 229→230 · `OnlinePollManageDto.hasVoted`) 후 생성 계약 3종 재생성(operations 378→379), 생성 API 경계 census 99.7%→100%, status color BASELINE 512 유지, 폼 검증 census 144→146(secondary-action 2건 compliant), URL-state census 재생성(377→379 · 승인 sha 재결속), 도달성 census 의 동결 런타임 체인 진입점 갱신(쪽지 → 메모보고 — `UserPicker` 는 소비자가 남아 죽지 않았다), lint 경고 144→141. | [OnlinePollService](../../business-app/src/main/java/nuri/business/service/survey/OnlinePollService.java), [투표 은닉 계약](../../business-app/src/test/java/nuri/business/service/survey/OnlinePollServiceTest.java), [SurveyResultService](../../business-app/src/main/java/nuri/business/service/survey/SurveyResultService.java), [MailHistoryHubClient](../../frontend/src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx), [ApprovalHubClient](../../frontend/src/app/approvals/ApprovalHubClient.tsx), [기안 취소 계약](../../frontend/src/app/approvals/__tests__/ApprovalHubClient.actions.test.tsx), [ScrapListClient](../../frontend/src/app/admin/collaboration/scraps/selectScrapList/ScrapListClient.tsx), [authorization-policies](../../config/governance/authorization-policies.json) | 2026-09-07 | - |

## DEC-OPS-047

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-047 | accepted | **템플릿 삭제 참조 차단**을 DEC-OPS-036 의 "두지 않는다" 에서 "둔다" 로 종료한다. foundation 에 `TemplateReferenceContributor` 포트를 두고 게시판·블로그가 자기 참조 건수를 등록하며, 참조가 있으면 `RESOURCE_IN_USE(409)` 로 참조원·건수를 밝히고 거부한다. 참조 도메인이 base projection 에서 빠지면 contributor 도 사라져 삭제를 막지 않는다. | 이 전환은 2026-09-06 커밋 `c80caeaa9` 가 이미 코드로 집행했으나 **후속 DEC 를 남기지 않아** DEC-OPS-036 의 본문("템플릿 삭제는 참조 차단을 두지 않는다 … board/blog 도메인 결합이 필요해 이번 범위 밖")이 코드와 반대되는 사실을 계속 주장하고 있었다(2026-09-07 고아 도메인 조사에서 실측). AGENTS.md 는 accepted 결정의 소급 편집을 금지하고 변경을 `supersedes` 로 연결하라고 규정하므로, 원문은 그대로 두고 이 행이 그 부분만 종료한다. ⚠ DEC-OPS-036 이 범위 밖으로 본 근거(도메인 결합 증가)는 **포트로 해소됐다** — 템플릿 도메인이 board/blog 를 import 하지 않아 `CrossDomainCouplingLinter` 동결이 그대로다. | [TemplateReferenceContributor](../../foundation/src/main/java/nuri/foundation/core/template/TemplateReferenceContributor.java), [TmplatInfoService](../../business-app/src/main/java/nuri/business/service/template/TmplatInfoService.java), [BlogTemplateReferenceContributor 퇴역 결정](../02-architecture/decisions/ADR-0012-retire-blog-domain.md) | 2026-09-06 | DEC-OPS-036 의 "템플릿 삭제 참조 차단을 두지 않는다" 부분만 종료 |

## DEC-OPS-048

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-048 | accepted | **고아 도메인 ISG(인터넷 서비스 안내)를 배선하고, 같은 사각을 닫는 게이트를 신설한다.** ① 화면 `/admin/system/isg`(A1 `WorkListPage` + 등록·수정 모달 + 행 삭제)와 프런트 서비스를 신설해 백엔드 5본을 소비한다. ② 배선 전에 결함 3건을 닫았다 — 항상 `Collections.emptyList()` 를 반환하던 `getIntnetSvcGuidanceResult()` 스텁과 그 동작을 계약으로 고정하던 테스트 제거, DTO 어휘를 엔티티·물리 컬럼·표준용어에 맞춤(`intnetSvcNm→itntSvcNm`·`intnetSvcDc→itntSvcExpln`·`reflctAt→rfltYn`, `userId→lastMdfrId`·`regDate→mdfcnDt`), 설명 상한 1000→4000(컬럼과 동일). 서버 소유 3필드는 `READ_ONLY` 로 요청에서 차단한다. ③ 그 어휘 정합으로 이름 기반 바인딩이 가능해져 `InputContractMirrorLinter` 표적에 편입했다(길이 113→116 · 필수 37→39 · read-only 28→31). ④ **`operation-consumer-census` 게이트 신설** — 문서화된 379 operation 각각이 `소비(324)` · `springdoc 별칭 기계 파생(30)` · `사유가 붙은 원장(25)` 중 정확히 하나여야 한다. 원장은 닫힌 카테고리 어휘를 쓰고, `bff-route-handler`·`non-browser-consumer` 는 evidence 파일이 실재하며 경로 접미를 참조해야 하고(기계 검증), 진짜 부채 `unwired` 는 단조 감소 래칫(현재 22)에 걸린다. ⑤ ISG 프런트 경로를 demo pack `removePaths` 에 편입했다 — 백엔드가 demo 소유이므로 core/collaboration 프로필에 화면만 남으면 없는 API 를 부른다. | 2026-09-07 고아 도메인 조사 실측: ISG 는 엔티티·리포지토리·서비스·DTO·컨트롤러 5본·테스트 17건이 완비되고 생성 계약(zod/operations)에도 실려 있는데 **프런트 호출부가 저장소 전체에 0** 이었다. 화면이 없으니 등록 경로도 없어 `tb_intrn_svc` 는 시드도 피참조 FK 도 없이 **구조적으로 항상 비어 있었다**. 그런데도 V2_51 이 사용자 승인을 받아 PK 를 BIGINT IDENTITY 로 현대화했고 2026-09-02 까지 유지보수가 이어졌다. ⚠ **어떤 게이트도 이것을 보지 못했다** — `UnreachableServiceLinter` 는 컨트롤러가 서비스를 참조하므로 통과(백엔드 내부만 본다), `generated-api-boundaries` census 는 "호출부가 있는 것 중" 생성 경로 채택률을 재므로 호출부 0 은 분모에서 빠진다(adoption 100% 인데 미소비 60건), 커버리지 래칫은 테스트 17건이 채운다. 그 린터 자신의 주석이 경고한 "유일한 참조가 단위 테스트라 정적 지표로는 구현됨으로 보인다" 가 프런트 축에서 그대로 재현된 것이다. 제거(ⓑ)가 아니라 배선(ⓐ)을 택한 이유: ISG 는 중복 표면이 아니라 고유 기능이라 DEC-OPS-041·044(중복 컨트롤러 축소)의 선례가 아니라 DEC-OPS-030·032·037(있는 API 를 화면에 잇는다)의 선례에 해당하고, 테이블 DROP 은 승인받은 PK 현대화를 되돌리는 파괴적 DB 변경이라 별도 승인 경계다. ⚠ 배선은 "연결" 이 아니라 검증된 적 없는 코드를 처음 실전에 올리는 일이므로 결함 3건을 먼저 닫았다. 게이트 갱신: 라우트 capabilities 120→121(admin-system 70→71), disposition overlay +1행·manifest sha 재결속, URL-state census 재생성·승인 sha 재결속, A1 채택 census 39→40, 폼 검증 census 146→148(native-form 1 + destructive action 1), 생성 경계 census 369→374(adoption 100% 유지), api-docs 재생성 후 생성 계약 3종 재생성(operation 수 379 불변). red 증명: DTO 상한 되돌리기 → 미러 린터 red, 원장 항목 삭제 → census red, 근거 없는 카테고리 위장 → census red. | InternetSvcGuidanceClient(`frontend/src/app/admin/system/isg/InternetSvcGuidanceClient.tsx`, DEC-OPS-372 로 퇴역), 배선 계약(`frontend/src/app/admin/system/isg/__tests__/InternetSvcGuidanceClient.test.tsx`, DEC-OPS-372 로 퇴역), InternetSvcGuidanceAdminService(`frontend/src/services/foundation/system/InternetSvcGuidanceAdminService.ts`, DEC-OPS-372 로 퇴역), InternetSvcGuidanceDto(`business-app/src/main/java/nuri/business/service/isg/dto/InternetSvcGuidanceDto.java`, DEC-OPS-372 로 퇴역), [operation consumer census](../../scripts/operation-consumer-census.mjs), [census 원장](../../config/governance/operation-consumer-census.json), [census 계약](../../scripts/operation-consumer-census.test.mjs) | 2026-09-07 | - |

## DEC-OPS-049

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-049 | accepted | **부재(자리비움) 관리를 배선한다** — DEC-OPS-048 이 신설한 operation-consumer-census 가 드러낸 `unwired` 부채 19건 중 첫 3건(`getAbsences`·`getAbsence`·`updateAbsence`)을 닫는다. `/admin/user/absences`(허브 ABSENCES 탭)가 전체 사용자 목록 위에 **부재 여부 열**과 **행 단위 토글**(부재 처리 ↔ 복귀 처리)을 그리고, `PUT /admin/system/user-absences/{emplyrId}` 로 업서트한다. 조인 축은 **esntlId** 다 — `tb_user_absn.user_id` 는 이름과 달리 로그인 ID 가 아니라 사용자 PK 이고 FK 도 `tb_user_info(esntl_id)` 를 가리킨다(V2_14). '기록 없음' 과 `N` 은 둘 다 정상으로 보고, **조회 실패는 정상이 아니라 '알 수 없음'** 으로 드러내며 그때는 조치 버튼을 내지 않는다. 종전의 "부재 정보는 아직 이 화면에 연동되지 않았습니다" 고지는 걷되 **목록이 부재자 필터가 아니라 전체 사용자라는 사실은 계속 말한다**. 래칫을 22→19 로 내린다. | 사용자 지시(2026-09-07 "다음작업 진행")에 따른 집행이다. census 가 이 3건을 부채로 등재하면서 남긴 사유("화면이 이미 연동되지 않았다고 고지 중")가 그대로 다음 배선 후보를 지목했다 — 게이트가 작업 순서를 만들어 준 첫 사례다. ⚠ 실측이 함정 하나를 확인했다: 이 허브의 `selectedItemId` 는 `userId`(로그인 ID)인데 부재 축은 `esntlId` 라 **두 키가 다르다**. 목록 projection(`UserRepositoryImpl` Projections)이 `esntlId` 를 싣는 것을 먼저 확인한 뒤 배선했고, loginId 축 레코드를 넣으면 아무도 부재로 읽히지 않는다는 대조군 테스트를 계약에 고정했다(커뮤니티 멤버십에서 이미 확인된 조용한 0건 함정). ⚠ 부수로 같은 파일의 **죽은 선택 강조**를 정정했다 — 아바타·이름 두 줄만 `selectedItemId === user.esntlId` 로 비교해 선택 강조가 한 번도 켜지지 않았다. 부재 배선이 같은 파일에 `esntlId` 축을 새로 들여오므로 어느 키가 선택 키인지 모호한 채로 두지 않았다. ⚠ 조치 버튼 문구는 '부재'/'복귀' 가 아니라 **'부재 처리'/'복귀 처리'** 다 — 같은 행에 상태 '부재/정상' 이 함께 있어 동사 없는 라벨은 상태 표시와 구분되지 않는다(계약 테스트가 실제로 두 요소를 혼동해 드러났다). 게이트 갱신: operation-consumer-census 원장 −3행·래칫 22→19, 생성 경계 census 374→377(adoption 100% 유지), 폼 검증 census 148→149(secondary-action mutation 1건 compliant — 중복 차단·pending·실패 피드백 단일 테스트 증거), URL-state census 재생성(파일 수 523→524, 신규 producer 0)·승인 sha 재결속. | [UserAbsenceAdminService](../../frontend/src/services/foundation/system/UserAbsenceAdminService.ts), [UserOrgHubClient](../../frontend/src/app/admin/user/UserOrgHubClient.tsx), [배선 계약](../../frontend/src/app/admin/user/__tests__/UserOrgHubClient.absence.test.tsx), [UserAbsenceServiceImpl](../../business-core/src/main/java/nuri/business/service/system/user/impl/UserAbsenceServiceImpl.java), [census 원장](../../config/governance/operation-consumer-census.json) | 2026-09-07 | - |

## DEC-OPS-050

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-050 | accepted | **`operation-consumer-census` 가 증명하는 범위를 정확히 한정한다.** `consumed` 는 "생산 TypeScript 모듈이 그 operation 을 부른다" 를 뜻하며 "사용자가 도달하는 화면이 쓴다" 를 뜻하지 **않는다**. 스크립트 docblock·원장 `notes`·GAP-WIRING-001 에 이 한계를 명시하고, unwired 수치를 "화면에서 못 쓰는 기능의 총량" 으로 인용하지 않는다(하한이다). 함께 설문 응답자 3건(`createRespondent`·`getRespondent`·`updateRespondent`)의 원장 사유를 "부채" 에서 **의도적 보류**로 정정한다. | DEC-OPS-048 은 이 게이트를 "문서화된 operation 각각이 소비·별칭·원장 중 정확히 하나" 로 서술했는데, 그 서술은 맞지만 **`소비` 의 의미가 독자가 기대하는 것보다 약하다**. 2026-09-07 실측 반례: `deleteRespondent` 는 `SurveyAdminService.deleteRespondent()` 가 생성 실행기를 부르므로 consumed 로 집계되는데, 그 서비스 메서드를 부르는 곳은 **자기 단위 테스트뿐**이다(`app/`·`components/` 호출부 0). 즉 백엔드에서 `UnreachableServiceLinter` 가 닫은 "유일한 참조가 단위 테스트라 정적 지표로는 구현됨으로 보인다" 패턴이 프런트 **서비스 계층 한 겹 아래**로 내려가 있었다 — 같은 사각을 닫겠다고 만든 게이트가 그 사각의 변형을 통과시킨 것이다. 게이트를 지금 강화하지 않는 이유는 거친 1차 측정에서 후보 73건이 나왔는데 클래스 프로퍼티 화살표 함수를 잘못 귀속시키는 오탐이 섞여 **수치를 신뢰할 수 없기 때문**이다 — 부정확한 census 로 예외 목록부터 만들면 그 목록이 곧 서랍이 된다(H2). 정확한 계측과 게이트 설계는 GAP-WIRING-001 의 후속 행동으로 남긴다. ⚠ 응답자 3건 재분류의 근거: `tb_srvy_rspdnt` 는 성명·성별·생년월일·전화번호를 담는 개인정보인데 `tb_srvy_rslt` 와 **ID 로 연결돼 있지 않고**(결과 테이블은 `rspns_nm` 문자열만 — V2_0 실측) 응답자 행을 만드는 코드 경로가 저장소 전체에 없어 register 가 구조적으로 비어 있다. 여기에 등록 폼을 붙이는 것은 배선이 아니라 **소비처 없는 개인정보 입력 표면 신설**이며, ADR-0011(익명 만족도·비밀번호 소유 증명 폐지)·DEC-OPS-035(연락처 해석을 서버에 두고 응답에 싣지 않음)가 지켜 온 방향과 반대다. 종전 원장 사유("화면이 목록·삭제만 한다")도 사실이 아니었다 — 삭제도 화면 소비자가 없다. | [census 스크립트](../../scripts/operation-consumer-census.mjs), [원장](../../config/governance/operation-consumer-census.json), [GAP-WIRING-001](../../.agent/memory/known-gaps.md), [SurveyResultDto](../../business-app/src/main/java/nuri/business/service/survey/dto/SurveyResultDto.java) | 2026-09-07 | DEC-OPS-048 의 census 보증 범위 서술만 한정(게이트 자체는 유지) |

## DEC-OPS-051

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-051 | accepted | **`operation-consumer-census` 에 축 2(서비스 메서드 → 화면 도달성)를 신설한다.** DEC-OPS-050 이 기록한 한계를 닫는다. TypeScript AST 로 각 생성 호출부의 **소유 함수**를 귀속하고(메서드·함수 선언·클래스 프로퍼티 초기화·변수 초기화 4형태 인식, 귀속 실패는 통과가 아니라 red), 서비스 밖 생산 코드에 `.<메서드명>(` 이 없으면 고아로 센다. 실측 **서비스 메서드 341개 중 고아 77개**를 `expected.screenOrphanMax` 래칫으로 동결한다. **예외 목록은 두지 않는다** — 77건을 원장에 적으면 그 목록이 곧 서랍이 되므로(H2) 래칫 하나로 신규 유입만 막고 실패 시 전체 목록을 출력해 불투명해지지 않게 한다(status-color-guard 와 같은 설계). 판정은 백엔드 `UnreachableServiceLinter` 를 따라 **의도적으로 관대**하다 — 흔한 이름은 동명 메서드와 겹쳐 통과할 수 있으나 그것은 놓치는 방향이라 거짓 red 를 만들지 않는다. | DEC-OPS-050 이 남긴 후속 행동이다. 축 1 만으로는 `deleteRespondent` 처럼 **서비스 메서드의 유일한 소비자가 자기 단위 테스트인 경우**를 통과시킨다 — 백엔드에서 `UnreachableServiceLinter` 가 닫은 패턴이 프런트 서비스 계층 한 겹 아래로 내려가 있었다. ⚠ **1차 시도의 수치(73건)는 우연한 근사치였다** — 정규식으로 `  name(` 만 찾아 클래스 프로퍼티 화살표 함수를 놓치고 호출부를 생성자의 `super(...)` 에 귀속시켰다. AST 귀속으로 바꾸자 귀속 실패 0 · 고아 77개로 확정됐고, 그 오탐 원인을 계약 테스트로 고정했다. DEC-OPS-050 이 "부정확한 census 로 예외 목록부터 만들면 서랍이 된다" 며 강화를 미룬 판단이 옳았음이 여기서 확인된다 — 73건으로 원장을 만들었다면 오탐이 예외로 굳었다. ⚠ 고아 77건의 대표 유형은 **server action 중복**이다: 배너는 화면이 `promotionActions.ts` 에서 생성 실행기를 직접 불러 `BannerAdminService` 의 4메서드가 통째로 죽어 있다. 즉 이 축의 부채는 "기능이 없다" 보다 "같은 일을 하는 경로가 둘인데 하나가 죽었다" 가 많으며, 해소는 배선이 아니라 **중복 경로 정리**가 된다. red 증명: 래칫 77→76 주입 시 red / ISG 삭제의 화면 호출부만 끊으면 78/77 로 red 이며 범인 메서드·operation·파일을 지목 / 귀속 실패·접두 충돌·테스트 전용 소비자 픽스처 전부 red. | [census 스크립트](../../scripts/operation-consumer-census.mjs), [계약](../../scripts/operation-consumer-census.test.mjs), [원장](../../config/governance/operation-consumer-census.json), [GAP-WIRING-001](../../.agent/memory/known-gaps.md) | 2026-09-07 | DEC-OPS-050 의 "축 2 는 별도 게이트가 필요하다" 를 종료 |

## DEC-OPS-052

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-052 | accepted | **server action 의 생성 실행기 직접 호출을 서비스 위임으로 통일한다**(DEC-OPS-051 축 2 가 드러낸 부채의 첫 배치). `promotionActions.ts` 의 배너·팝업 등록·수정·삭제 6건이 `executeGeneratedOperation(insertBannerOperation, ...)` 처럼 디스크립터를 직접 불러, 같은 일을 하는 `BannerAdminService`·`PopupAdminService` 의 6메서드가 **살아 있으면서 아무도 부르지 않는 두 번째 경로**로 남아 있었다. action 은 서버 관심사(쿠키·`revalidatePath`·오류 정형화)만 갖고 operation 결속은 서비스 한 곳이 소유한다. 화면 도달성 래칫 77→71. | 저장소의 action 8개 중 **6개(code·comment·dept·menu·network·user)는 이미 서비스에 위임**하고 `promotionActions`·`boardActions` 만 직접 호출한다 — 즉 관례가 이미 있었고 이 파일이 이탈이었다. 서비스 메서드가 모두 `config?: AxiosRequestConfig` 를 받으므로 서버 컨텍스트의 쿠키 주입이 그대로 통과해 위임에 기술적 장애가 없었다. ⚠ 축 2 의 부채는 "기능이 없다" 가 아니라 **"같은 일을 하는 경로가 둘인데 하나가 죽었다"** 가 많다는 것이 이 배치로 확인된다 — 해소가 배선이 아니라 중복 정리다(DEC-OPS-041·044 의 프런트 판본). `boardActions` 는 이번 범위 밖이다 — 5건 중 2건이 `executeGeneratedMultipartOperation` 이라 서비스 기반 클래스의 multipart 지원 여부 판정이 선행이다. `getBanner`·`getPopup`(단건 조회)은 위임 후에도 고아로 남는다 — 화면이 목록 projection 만 쓰고 단건을 부르지 않기 때문이며, 이는 중복이 아니라 별개 축이다. 동작 불변 증거: 기존 `promotionActions.test.ts` 14건이 수정 없이 통과한다. | [promotionActions](../../frontend/src/app/actions/promotionActions.ts), [BannerAdminService](../../frontend/src/services/foundation/system/BannerAdminService.ts), [PopupAdminService](../../frontend/src/services/foundation/system/PopupAdminService.ts), [census 원장](../../config/governance/operation-consumer-census.json) | 2026-09-07 | - |

## DEC-OPS-053

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-053 | accepted | **죽은 `IsmAdminService` 를 걷고, 그로 인해 드러난 표면을 `superseded-surface` 카테고리로 기록한다**(축 2 부채 2차 배치). ① `IsmAdminService`(7메서드·155줄)와 전용 계약 테스트(384줄)를 삭제한다 — DEC-OPS-040 이 `/admin/system/ism` 을 `/approvals` 로 통합하며 `IsmClient` 를 지운 뒤 유일한 소비자가 자기 테스트뿐이었다. 살아 있던 공유 어휘(`InformalSanctionDto`·`SANCTION_STATUS`·`SanctionStatusCode`·`isSanctionPending`)만 실제 소비자 옆(`services/business/user/approval/informal-sanction-vocabulary.ts`)으로 옮긴다. ② census 에 닫힌 카테고리 `superseded-surface` 를 신설한다 — "다른 네임스페이스가 같은 일을 하고 화면은 그쪽을 쓴다" 는 "아무도 안 만든 기능"(`unwired`)과 다르다. **기록만으로 통과시키지 않는다**: `supersededBy` 에 적은 operation 이 실재하고 실제로 소비 중이어야 하며, 없거나 그 자신도 죽어 있으면 red 다(기계 검증). ③ 별칭 파생 규칙을 확장한다 — 기본 operation 이 **소비 중이거나 원장에 등재**돼 있으면 별칭은 파생이다. 별칭은 같은 핸들러의 다른 경로일 뿐 새 표면이 아니므로 같은 사유를 두 벌로 적지 않는다. 래칫: unwired 19→18, 화면 고아 71→64. | 사용자 지시(2026-09-07 "계속진행")에 따른 집행이다. ⚠ **삭제가 사실을 드러냈다** — `IsmAdminService` 가 사라지자 `InformalSanctionApiController` 의 12 operation(정본 6 + 별칭 6)이 소비 0 이 됐다. 죽은 서비스가 그 사실을 가리고 있었던 것이다. `/approvals` 화면은 `ApprovalApiController`(`/api/v1/approvals/**`)를 쓰며 ISM operation 과 겹치는 호출이 하나도 없다. ⚠ 그럼에도 **백엔드 컨트롤러를 이번에 걷지 않는다** — 두 컨트롤러는 같은 `InformalSanctionService` 를 감싸지만 **어느 쪽도 상대의 부분집합이 아니다**(Approval 에 `processed`·`task-types`, ISM 에 상세·수정). 따라서 DEC-OPS-041·044 같은 기계적 중복 축소가 아니라 "상세·수정이 제품에 필요한가" 라는 설계 결정이 선행이며, 그 판단 근거를 GAP-WIRING-001 에 남긴다. ⚠ `superseded-surface` 를 신설한 이유: 12건을 `unwired` 로 밀면 "아무도 안 만든 기능" 과 "다른 경로가 이미 한다" 가 한 숫자에 섞여 래칫의 의미가 흐려진다. 분리하니 부채가 **늘지 않고 오히려 줄었다**(unwired 19→18 — `getTemplate_1` 이 새 별칭 규칙으로 파생되며 이중 계상이 해소). red 증명: `supersededBy` 미기재 / 없는 operation 지목 / 죽은 operation 지목(live 원장에 `signup` 주입) / 별칭 중복 기재 전부 red. | [informal-sanction-vocabulary](../../frontend/src/services/business/user/approval/informal-sanction-vocabulary.ts), [ApprovalUserService](../../frontend/src/services/business/user/approval/ApprovalUserService.ts), [census 스크립트](../../scripts/operation-consumer-census.mjs), [계약](../../scripts/operation-consumer-census.test.mjs), [원장](../../config/governance/operation-consumer-census.json) | 2026-09-07 | - |

## DEC-OPS-054

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-054 | accepted | **축 2 의 화면 소비 판정에 직접 호출 형태를 편입한다.** 종전에는 멤버 호출(`.<메서드명>(`)만 봤고, 서비스가 클래스 메서드를 `.bind()` 로 모듈 레벨 named export 에 다시 내보내고 화면이 점 없이 부르는 형태를 놓쳤다. 래칫 64→59(거짓 양성 5건 제거). | ⚠ **제가 만든 게이트가 잘못된 사실을 주장하고 있었다.** `deptScheduleService` 의 `getDeptScheduleList`·`getDeptScheduleMonthList`·`createDeptSchedule`·`updateDeptSchedule`·`deleteDeptSchedule` 5건은 `WorkHubClient`·`ScheduleDeptClient` 가 **실제로 부르는데** 고아로 집계됐다 — 그 서비스는 `export const getDeptScheduleMonthList = deptScheduleService.getDeptScheduleMonthList.bind(deptScheduleService)` 로 재수출하고 화면은 `getDeptScheduleMonthList({ yearMonth })` 처럼 점 없이 부른다. DEC-OPS-051·053 이 보고한 77·64 라는 수치에 이 5건이 섞여 있었으므로 그 수치는 과대였다. ⚠ 이 발견의 경위 자체가 게이트의 값이다 — 다음 배치(`deptScheduleService` 7건 정리)를 조사하다 "화면이 부르는데 왜 고아지" 를 확인하면서 드러났다. 수치를 사실로 믿고 바로 삭제했다면 **살아 있는 코드를 지웠을 것**이다. 판정은 여전히 관대하다(놓치는 방향) — 흔한 이름은 다른 모듈 동명 심볼과 겹쳐 통과할 수 있으나 거짓 red 를 만들지 않는다. red 증명: 직접 호출 인정을 되돌리면 신설 계약이 red 다. 접두만 겹치는 이름(`loadMonthlyTotals`)과 접미가 겹치는 속성 접근(`x.somethingLoadMonthly`)을 소비로 오인하지 않는 것도 함께 고정했다. | [census 스크립트](../../scripts/operation-consumer-census.mjs), [계약](../../scripts/operation-consumer-census.test.mjs), [deptScheduleService](../../frontend/src/services/business/schedule/deptScheduleService.ts) | 2026-09-07 | DEC-OPS-051·053 이 보고한 화면 고아 수치를 정정(게이트 설계는 유지) |

## DEC-OPS-055

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-055 | accepted | **`BoardUserService` 의 대체된 4메서드(`getPost`·`createPost`·`updatePost`·`deletePost`)를 걷는다**(축 2 부채 3차 배치). 정본 경로는 이미 셋이다 — 상세는 `BoardDetailServer` 가 `knowledgeService`·`boardAdminService` 로, 등록·수정은 `boardActions.saveBoardArticle`(첨부 multipart 포함, DEC-OPS-044), 삭제는 `boardActions.deleteBoardArticle` 이다. 남긴 셋(`searchPosts`·`getPosts`·`likePost`)은 화면이 실제로 부른다. 계약 테스트도 남은 셋으로 좁히고, 걷은 계약의 소유자가 `boardActions` 테스트로 옮겨 갔음을 주석으로 남겼다. 화면 고아 래칫 59→55. | ⚠ **같은 배치에서 `CodeAdminService` 8건은 걷지 않았다** — 성격이 다르기 때문이다. 그 8건(`getClCode`·`getCmmnCode`·`getDetailCode`·`getAdministCodeDetail` 단건 조회 4 + `deleteClCode`·`deleteCmmnCode`·`deleteAdministCode` 삭제 3 + `updateAdministCode` 1)은 "다른 경로가 이미 한다" 가 아니라 **"공통코드 분류·그룹·행정코드를 지우거나 고치는 기능이 화면에 없다"** 는 뜻이다. 지우면 나중에 그 기능을 만들 때 다시 써야 하고, 지금 지우면 부재 사실만 사라진다. 즉 축 2 의 고아는 최소 두 부류이며(**대체된 표면** vs **기능 부재**) 해소 방법이 반대다 — 전자는 삭제, 후자는 배선이다. ⚠ 축 1 은 불변이다(consumed 321) — 걷은 4메서드가 부르던 operation 중 `createPost`·`updatePost`·`deletePost` 는 `boardActions` 가 계속 부르고 `getPost` 도 다른 소비자가 있었다. 즉 이 삭제는 표면을 줄인 게 아니라 **같은 표면을 부르는 죽은 두 번째 경로**를 없앤 것이다. | [BoardUserService](../../frontend/src/services/business/user/board/BoardUserService.ts), [계약 테스트](../../frontend/src/services/business/user/board/BoardUserService.generated-contract.test.ts), [boardActions](../../frontend/src/app/actions/boardActions.ts) | 2026-09-07 | - |

## DEC-OPS-056

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-056 | accepted | **중복 구현 파일 `services/foundation/security/SecurityAdminService.ts` 를 통째로 걷는다**(축 2 부채 4차 배치). 그 파일은 `AuthorityAdminService`·`RoleAdminService`·`GroupAdminService` 세 클래스를 담고 있었는데, 같은 이름의 정본이 `services/foundation/system/` 에 있고 **보안 화면 전부가 정본 쪽을 쓴다**. 전용 계약 테스트(319줄)도 함께 삭제하고, 참조하던 테스트 3곳을 정본으로 옮기거나 정리했다. 화면 고아 래칫 55→51. | ⚠ **저장소가 이미 이 중복을 알고 있었다** — `GroupAdminService.test.ts` 와 `RoleAdminService.test.ts` 의 주석이 "`security/SecurityAdminService.ts` 에 **같은 이름의** 형제 구현이 있다", "형제 구현의 본문 기반 치환이 이식되면 이 단언이 깨진다" 로 경고하고 있었다. 즉 **두 구현의 동작이 다를 수 있다는 것까지 알면서 둘 다 두고 있었다.** 축 2 가 그 중 하나가 죽었음을 수치로 드러냈다. ⚠ 삭제 안전 근거: 걷은 파일이 부르는 operation 16개가 **정본 3개 서비스에 모두 포함**되고(정본이 오히려 `deleteAuthors`·`getAuthorRoles`·`saveAuthorRoles`·`deleteRoles`·`deleteGroups` 를 더 갖는다), 유일한 named export `getAuthorList` 도 소비처가 0 이었다(화면은 정본의 동명 메서드를 쓴다). 실제로 축 1 은 불변이다(consumed 321). | [AuthorAdminService](../../frontend/src/services/foundation/system/AuthorAdminService.ts), [RoleAdminService](https://github.com/lkindo/egov-enterprise/blob/23bdc811459dce5c3b3f8d77592b8450a7eafa38/frontend/src/services/foundation/system/RoleAdminService.ts), [GroupAdminService](../../frontend/src/services/foundation/system/GroupAdminService.ts), [census 원장](../../config/governance/operation-consumer-census.json) | 2026-09-07 | - |

## DEC-OPS-057

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-057 | accepted | **`UserAuthorityAdminService.saveUserAuthority`(단수) 편의 래퍼를 걷는다**(축 2 부채 5차 배치). 복수 메서드 `saveUserAuthorities` 를 `[data]` 로 감싸기만 했고 호출부가 0 이었다 — 화면은 처음부터 복수를 부른다. 단수로 검증하던 계약 2건(void 응답 오인 차단·transport 오류 전파)은 살아 있는 복수 메서드로 옮겨 커버리지를 보존했다. 화면 고아 래칫 51→50. | 축 2 부채 전수 분류(51건) 중 유일하게 남은 ①형(대체된 표면)이었다. 한 건만 저장할 때도 배열로 보내면 되므로 래퍼가 없어도 표현력이 줄지 않는다. ⚠ 같은 분류에서 확인한 사실 — **잔여 50건은 사실상 전부 ②형(기능 부재)이다.** 대표 3축: ① **설문 수정 3건**(`updateSurvey`·`updateQuestion`·`updateItem`) — 등록·삭제는 배선돼 있는데 수정만 없다. `SurveyQuestionsPanel` 의 2026-08-28 주석이 "createSurvey/updateSurvey/deleteSurvey 는 소비자가 0건" 이라 적고 등록만 배선한 잔여이며, DEC-OPS-036(외부인사·포상·템플릿 정정 경로)과 같은 유형이다. ② **마이페이지 콘텐츠 추가·삭제 2건**(`createContent`·`deleteContent`) — 화면은 `updateContent` 만 부른다. ③ **내 정보 수정·비밀번호 변경 2건**(`updateMe`·`changePassword`) — 마이페이지가 `userService` 를 아예 쓰지 않는다. DEC-OPS-032 가 관리자 초기화만 열었으므로 **본인이 비밀번호를 바꾸는 경로는 여전히 없다**. 나머지는 단건 조회 미사용(화면이 목록 projection 만 씀)과 삭제 기능 부재다. **이 축의 다음 작업은 삭제가 아니라 배선 우선순위 판정이다.** | [UserAuthorityAdminService](https://github.com/lkindo/egov-enterprise/blob/23bdc811459dce5c3b3f8d77592b8450a7eafa38/frontend/src/services/foundation/system/UserAuthorityAdminService.ts), [SurveyQuestionsPanel](../../frontend/src/app/admin/survey/components/SurveyQuestionsPanel.tsx), [census 원장](../../config/governance/operation-consumer-census.json) | 2026-09-07 | - |

## DEC-OPS-058

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-058 | accepted | **설문 수정 3본(`updateSurvey`·`updateQuestion`·`updateItem`)을 배선한다** — 축 2 부채를 **삭제가 아니라 기능으로 줄인 첫 배치**다(래칫 50→47). `SurveyQuestionsPanel` 에 인라인 편집을 붙인다: 설문지 제목(선택기 옆), 문항 내용, 선택 항목 내용. ⚠ **서버의 update 3본은 전부 전체 치환(PUT)이다** — `updateSurvey` 는 7필드, `updateQuestion` 은 4필드, `updateItem` 은 3필드를 통째로 덮어쓴다. 따라서 화면은 바꾸지 않는 필드를 **목록 행의 기존 값 그대로 함께 실어 보낸다**(round-trip). 목록 projection 이 `SurveyInfoDto`·`SurveyQuestionDto`·`SurveyArticleDto` 전체를 주므로 별도 상세 조회 없이 가능하다. 검증은 등록과 같은 규격(`useManualFormValidation` + zod 수정 전용 스키마 3종)을 쓴다. | 2026-08-28 에 이 화면이 등록·삭제만 배선하고 update 를 남겨 뒀고, 그 주석이 "createSurvey/updateSurvey/deleteSurvey 는 서버·프런트 서비스에 모두 있는데 소비자가 0건" 이라 기록했다 — 축 2 가 그 잔여를 수치로 지목했다. 그동안 **설문 제목 오타 하나를 고치려면 설문을 지우고 다시 만들어야 했고**, 그러면 문항·항목·응답이 함께 사라졌다. ⚠ 전체 치환은 DEC-OPS-045(외부인사 수정 시 성별·구분 코드 round-trip)와 같은 함정이다 — 제목만 보내면 기간·목적·작성안내·대상이 null 로 지워진다. 계약 테스트가 **바꾸지 않는 필드가 기존 값 그대로 실려 가는지**를 단언해 그 안전 조건을 고정한다. ⚠ 임시 trim 검사로 시작했다가 폼 검증 census 가 거부해 표준 훅으로 바꿨다 — 그 census 는 오류 요약·첫 오류 포커스·서버 필드 오류 매핑·동기 잠금을 native-form 계약으로 요구하며, 편집 폼도 예외가 아니다. 부수: 편집 입력의 aria-label 을 "설문지 제목 수정" 으로 둔다 — 같은 화면의 등록 폼에도 "설문지 제목" 입력이 있어 라벨이 겹치면 보조기술이 둘을 구분하지 못한다(계약 테스트가 실제로 충돌해 드러났다). | [SurveyQuestionsPanel](../../frontend/src/app/admin/survey/components/SurveyQuestionsPanel.tsx), [수정 스키마](../../frontend/src/app/admin/survey/components/survey-panel-form-validation.ts), [배선 계약](../../frontend/src/app/admin/survey/components/__tests__/SurveyQuestionsPanel.test.tsx), [SurveyService](../../business-app/src/main/java/nuri/business/service/survey/SurveyService.java) | 2026-09-07 | - |

## DEC-OPS-059

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-059 | accepted | **본인 비밀번호 변경을 배선한다** — 헤더 계정 메뉴에 `ChangePasswordForm` 다이얼로그를 두고 `PUT /api/v1/users/me/password` 를 부른다(화면 고아 래칫 47→46). 현재 비밀번호를 함께 요구하는 것은 서버 계약이며(`PasswordChangeRequest.oldPassword` 필수) 세션만 탈취한 공격자가 비밀번호를 바꿔 계정을 잠그는 경로를 막는다. 화면은 확인 불일치·현재와 동일·8~20자 위반을 transport 전에 막고, 실패해도 세 칸의 입력을 보존한다. 새 라우트·URL 상태를 만들지 않는다(DEC-OPS-037 의 다이얼로그 선례). | ⚠ **DEC-OPS-032 가 남긴 빈 자리였다.** 그 결정은 관리자 초기화만 열면서 "로그인 화면에 비밀번호 찾기는 두지 않는다(엔터프라이즈 정책)" 를 명시했는데, 축 2 조사에서 **본인이 자기 비밀번호를 바꾸는 경로도 없다**는 것이 드러났다 — 정책 선택이 아니라 누락이었고, 사용자는 관리자에게 초기화를 부탁하는 길밖에 없었다. 서버 3본(`getMe`·`updateMe`·`changePassword`)과 `userService` 메서드는 완비돼 있었고 마이페이지가 그 서비스를 아예 import 하지 않았다. ⚠ 붙일 자리를 헤더 계정 메뉴로 정한 이유: `/admin/workspace/my-page` 는 이름과 달리 **개인 프로필이 아니라 콘텐츠 관리 목록**이고(`getContents`·`updateContent` 만 소비), 관리자에게만 노출된다. 비밀번호 변경은 모든 인증 사용자의 기능이므로 관리자 조건 밖에 둔다. 부수: `userService` 주석의 인코딩 손상(`님정보 조회`·`비밀번호 蹂寃`)을 함께 고쳤다. | [ChangePasswordForm](../../frontend/src/components/account/ChangePasswordForm.tsx), [폼 계약](../../frontend/src/components/account/__tests__/ChangePasswordForm.test.tsx), [header](../../frontend/src/app/components/layout/header.tsx), [userService](../../frontend/src/services/business/user/userService.ts) | 2026-09-08 | DEC-OPS-032 가 열지 않은 본인 변경 경로를 보완(관리자 초기화 결정은 유지) |

## DEC-OPS-060

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-060 | accepted | **내 프로필 수정을 배선한다** — 헤더 계정 메뉴에 `ProfileEditForm` 다이얼로그를 두고 `GET /api/v1/users/me` 로 현재 값을 읽어 채운 뒤 `PUT /api/v1/users/me` 로 저장한다(화면 고아 래칫 46→45). ⚠ **바꾼 필드만 보낸다** — `UserService.updateUser` 는 `null = 보내지 않음`으로 보아 기존 값을 유지하고 `""` 는 지움으로 반영하는 **부분 수정** 계약이다. 소속 그룹·부서·기관은 이 경계가 역직렬화하지 않으므로(`UserSelfProfileUpdateRequest` 의 `@JsonIgnoreProperties`) 폼에 두지 않고 화면이 그 사실을 말한다. 같은 변경에서 프런트 `userService.updateMe` 의 요청 타입을 관리자용 `UserProfileUpdateRequest`(17필드)에서 실제 계약인 `UserSelfProfileUpdateRequest`(13필드)로 정정한다. | 사용자 지시(2026-09-08 "남은작업 모두 완료할때까지 계속 작업진행")에 따른 집행이다. 서버 2본과 `userService` 메서드는 갖춰져 있는데 **호출부가 0** 이었다(축 2 실측) — 사용자는 전화번호 한 칸을 고치려 해도 관리자에게 부탁해야 했다. ⚠ **전 필드를 늘 실어 보내면 데이터가 지워진다.** 응답은 `@JsonInclude(NON_NULL)` 이라 값이 없는 필드가 아예 오지 않으므로, 폼이 그것을 ""로 초기화해 통째로 보내면 서버에서 null 이던 필드가 전부 지움으로 바뀐다. 그래서 초기값과 달라진 필드만 싣는다 — 설문 수정(DEC-OPS-058)이 **전체 치환**이라 왕복이 필요했던 것과 정확히 반대다. 같은 저장소 안에서도 계약이 다르며, 계약을 확인하지 않고 한쪽 관례를 옮기면 데이터가 사라진다. ⚠ 종전 프런트 타입은 관리자 DTO 라 소속 3필드를 포함했다 — 상위집합이라 tsc 는 통과했고 서버도 `@JsonIgnoreProperties` 로 무시했지만, 화면이 "보내면 반영된다" 고 오해할 수 있는 표기였다. ⚠ 헤더는 폼 검증 census 의 **composed 경계**로 등록했다(`composed-child-form-validation`) — 검증·오류·입력 보존은 자식 폼이 소유하고 헤더는 값을 읽어 넘기고 저장을 부른다. 그 등록이 헤더 자신의 재진입 잠금(ref)을 요구해 함께 넣었다. 종전 비밀번호 변경(DEC-OPS-059)이 같은 구조인데도 census 에 안 잡힌 것은 `changePassword` 가 write 이름 규칙(`^(?:create|update|delete|…)`)에 걸리지 않아서다 — 게이트가 못 본 것이지 없던 것이 아니다. | [ProfileEditForm](../../frontend/src/components/account/ProfileEditForm.tsx), [폼 계약](../../frontend/src/components/account/__tests__/ProfileEditForm.test.tsx), [헤더 경계 계약](../../frontend/src/app/components/layout/__tests__/header-profile-edit.test.tsx), [UserSelfProfileUpdateRequest](../../api-server/src/main/java/nuri/api/controller/UserSelfProfileUpdateRequest.java), [UserService#updateUser](../../business-core/src/main/java/nuri/business/service/user/UserService.java) | 2026-09-08 | - |

## DEC-OPS-061

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-061 | accepted | **행정 구역 코드에 정정 경로를 연다**(화면 고아 래칫 45→43). ① 화면에 행 액션 수정·삭제를 붙인다 — 수정은 등록 모달을 재사용하되 식별 코드(PK)를 잠그고, 삭제는 대상 코드·명칭과 하위 코드 제약을 밝힌 확인 뒤 수행한다. ② 서버 삭제를 안전하게 만든다 — 종전 `deleteById` 는 없는 코드도 조용히 성공했고 하위 코드를 남겼다. 존재하지 않으면 `CODE_NOT_FOUND`, 이 코드를 상위로 두는 하위 코드가 있으면 `RESOURCE_IN_USE(409)` 로 건수를 밝히고 거부한다. ③ 쓰기 3본에 `@AdminOrSystem` 과 서비스 가드 `SecurityUtil.assertAdmin()` 을 둔다 — 종전에는 URL 게이트 한 겹뿐이었다(같은 도메인의 공통코드는 메서드 인가·서비스 가드까지 갖췄다). ④ 폼의 `upAdmdstCd` 필수 제약을 푼다. | 사용자 지시(2026-09-08 "남은작업 모두 완료할때까지 계속 작업진행")에 따른 집행이다. 축 2 가 `updateAdministCode`·`deleteAdministCode`·`getAdministCodeDetail` 을 화면 호출부 0 으로 지목했고, 실측 결과 이 화면은 **등록만 있어 코드나 명칭을 잘못 넣으면 되돌릴 방법이 없었다**(DEC-OPS-036 외부인사·포상·템플릿과 같은 유형). ⚠ **계약 테스트가 별개의 결함을 드러냈다** — 폼이 상위 코드를 필수로 요구해 **상위가 없는 최상위 행정구역(시·도)을 등록할 수 없었다.** 서버 DTO 에 `@NotBlank` 가 없고 물리 컬럼도 NULL 을 받으므로(V2_0 `up_admdst_cd character varying(12)`) 그 필수는 **화면이 스스로 만든 규칙**이었다 — DEC-OPS-045(외부인사 수정 폼)와 같은 형태다. 서울특별시를 넣으려면 존재하지 않는 상위 코드를 지어내야 했고, 정정 경로를 열자 같은 이유로 기존 최상위 행의 수정도 막혔다(그 실패가 이 결함을 드러냈다). 나머지 셋(식별 코드·명칭·구분)의 화면 필수는 유지한다 — PK 이고, 이름이 없으면 목록이 빈칸이며, 구분은 select 라 언제나 값이 있다. ⚠ 삭제 가드를 둔 이유: `tb_admdst_cd` 에는 자기참조 FK 가 없어(V2_0 은 PK 만) DB 가 막지 않는다. 지우면 하위가 존재하지 않는 상위를 가리킨 채 남는다 — **권한 삭제가 사용자 할당을 남기던 GAP-AUTH-002 와 같은 모양**이며, 그 선례를 따라 회수가 아니라 차단을 택했다. ⚠ 인가 이중화는 권한을 넓히지 않는다(H3) — URL 게이트가 이미 `RBAC_ADMIN_OR_SYSTEM` 이고 같은 의미를 메서드·서비스 계층에 한 겹씩 더한 것이다. 삭제를 화면에 여는 변경이라 방어선을 URL 하나에 의존시키지 않았다. ⚠ 삭제 API 의 `@Operation(description)` 에 409 조건을 적고 `api-docs.json` 과 생성 계약을 재생성했다. 중간에 추출이 실패한 것으로 보고 서술을 되돌릴 뻔했는데, 실제로는 **동작했고 출력이 `-Dopenapi.export.path` 의 상대 경로 해석 때문에 `api-server/` 아래로 떨어져 있었다**(루트 절대 경로를 주면 정상). 게이트가 아니라 내 관찰이 틀렸던 경우다. | [AdministCodeService](../../business-core/src/main/java/nuri/business/service/code/AdministCodeService.java), [서비스 계약](../../business-core/src/test/java/nuri/business/service/code/AdministCodeServiceTest.java), [AdministCodeClient](../../frontend/src/app/admin/system/codes/administ/AdministCodeClient.tsx), [행 액션 계약](../../frontend/src/app/admin/system/codes/administ/__tests__/AdministCodeClient.rowActions.test.tsx), [authorization-policies](../../config/governance/authorization-policies.json) | 2026-09-08 | - |

## DEC-OPS-062

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-062 | accepted | **축 2(화면 도달성) 래칫의 운영 방침을 확정한다 — 0 을 목표로 하지 않는다.** 잔여 43건을 전수 분류한 결과 **A. 단건·부가 조회 미사용 31건**(화면이 목록 projection 으로 충족 — 결함이 아니다), **B. 대체된 표면 3건**(`deleteClCode`·`deleteCmmnCode`·`deleteLoginPolicy` — 사용여부 토글·정책 비우기가 같은 결과를 낸다), **C. 일괄 삭제 UI 부재 3건**(`deleteAuthors`·`deleteGroups`·`deleteRoles` — 단수 삭제는 화면에 있다), **D. 설계·결정 선행 3건**(메모보고 수정·삭제 2 — 인가 축 불일치, 주소록 사용자 검색 1 — 개인정보 결정), **E. 의도적 보류·소비처 없음 3건**(설문 응답자 삭제, 마이페이지 콘텐츠 추가·삭제)이다. 래칫은 **신규 유입 차단**이 목적이며(DEC-OPS-051), 남은 43건을 0 으로 만드는 것은 목표가 아니다. **전수 분류 결과 43건 중 자율 배선 대상은 0건이다** — A 는 결함이 아니고, B·C 는 삭제해도 사용자 가치가 0 이며 계약 손실이 있고, D·E 는 설계·제품·개인정보 결정이 선행이다. | 사용자 지시(2026-09-08 "남은작업 모두 완료할때까지 계속")에 따라 잔여를 소진하려 했으나, 전수 분류가 **소진 자체가 잘못된 목표임**을 드러냈다. ⚠ 최대 부류인 A 31건은 결함이 아니다 — 목록 API 가 이미 필요한 필드를 다 주는데 화면이 단건 조회를 한 번 더 하는 것이 오히려 낭비다. 이것을 "배선" 하면 왕복만 늘고 래칫 숫자만 좋아진다(H2 가 금지하는 신호 왜곡과 같은 방향). ⚠ B·C 를 삭제로 해소하려다 멈췄다 — C(일괄 삭제)는 단수 반복과 **부분 실패 의미가 다르다**(서버가 한 트랜잭션으로 처리하는 것을 N회 호출로 바꾸면 중간 실패 시 상태가 갈린다). 지우면 그 경로 계약(`deleteRoles` 가 컬렉션 DELETE 에 본문을 싣는가 등 실제 결함을 막아 온 검사)도 함께 사라지고, 일괄 UI 를 만들 때 다시 써야 한다. ⚠ `AddressbookUserService.searchUsers` 판정을 **두 번 정정했다**. 처음에는 "대체된 표면" 으로 봤다가 응답 형태가 다름을 확인해(명함 vs 사용자) 기능 부재로 옮겼고, 다시 서버를 보니 `@PrivacyAccess("주소록 사용자 검색(성명·이메일·전화번호)")` 로 **개인정보를 응답에 싣는** 검색이었다. 주소록 등록 화면은 현재 수기 입력이므로 이것을 배선하는 것은 편의 기능 추가가 아니라 **개인정보 노출 표면을 새로 여는 일**이다 — DEC-OPS-035 가 "사용자 검색 응답은 개인정보를 담지 않는다" 로 지킨 경계와 방향이 반대다. 따라서 배선이 아니라 개인정보·제품 결정이 선행이다(설문 응답자 등록을 보류한 DEC-OPS-050 과 같은 유형). ⚠ 메모보고 수정·삭제(D)는 **단순 배선이 불가능하다** — 서버 인가는 `assertOwnerOrAdmin(frstRgtrId)`(loginId 축)인데 응답 DTO 에 그 필드가 없고, 같은 도메인의 열람 인가는 `userId`·`rptrId`(esntlId 축)를 쓴다. 화면이 "내가 고칠 수 있는가" 를 정확히 판정할 정보를 받지 못하므로, 응답 계약 확장(식별자 노출 없이 `editable` 을 내려줄지 등)이 선행 결정이다. | [census 스크립트](../../scripts/operation-consumer-census.mjs), [원장](../../config/governance/operation-consumer-census.json), [GAP-WIRING-001](../../.agent/memory/known-gaps.md) | 2026-09-08 | DEC-OPS-051 의 래칫 목적을 재확인하고 잔여 소진 목표를 명시적으로 배제 |

## DEC-OPS-063

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-063 | accepted | **만족도 수정을 배선한다**(축 1 unwired 래칫 18→17). 게시글 만족도 목록의 각 항목에 수정 액션을 두고 `SatisfactionEditForm`(신설)이 점수·의견을 편집해 `PUT /api/v1/boards/{bbsId}/posts/{pstSn}/satisfactions/{dgstfnSn}` 를 부른다. 권한은 **화면이 추측하지 않는다** — 버튼을 항상 노출하고 서버 판정(`assertCanModify` = owner-or-admin)을 그대로 보여준다(같은 화면의 삭제가 이미 채택한 방침). 편집 중에는 그 행의 삭제를 잠근다. 부수로 별점 표시(`Stars`)를 공용 파일로 추출했다. | 사용자 지시(2026-09-08 "남은작업 모두 완료할때까지 계속")에 따른 집행이다. **ADR-0011 이 만족도 수정을 인증된 owner-or-admin 으로 열어 뒀는데 화면에는 등록·삭제만 있었다** — 별을 잘못 누르면 지우고 다시 매기는 수밖에 없었고, 그러면 작성일도 바뀐다. 축 1 census 가 `update` 를 소비 0 으로 지목하며 남긴 사유("no screen offers editing an existing rating yet")가 그대로 이 작업을 가리켰다 — 게이트가 작업 순서를 만들어 준 두 번째 사례다(첫 사례는 부재 관리, DEC-OPS-049). ⚠ 서버가 갱신하는 것은 **점수와 내용 둘뿐**이다(`entity.update(dgstfnScr, dgstfnCn)`) — 나머지 필드는 본문에 실려도 반영되지 않으므로 편집도 그 둘만 다루고, 계약 주석이 그 사실을 명시한다. ⚠ 편집 폼을 **별도 컴포넌트로 추출한 것은 폼 검증 census 때문이 아니라 그것이 드러낸 실제 문제 때문이다** — 처음에는 목록 `map` 안에 인라인 폼을 뒀는데 census 가 owner 를 `<anonymous>` 로, validation 을 `manual-or-native`·`unverified` 로 잡았다. 소유자가 없는 폼은 계약을 걸 수도, 나중에 누가 고칠 때 찾을 수도 없다. 추출하니 owner·schema·오류 경로가 전부 정확히 인식됐다. | [SatisfactionEditForm](../../frontend/src/components/features/satisfaction/SatisfactionEditForm.tsx), [폼 계약](../../frontend/src/components/features/satisfaction/__tests__/SatisfactionEditForm.test.tsx), [통합 계약](../../frontend/src/components/features/satisfaction/__tests__/SatisfactionSection.test.tsx), [SatisfactionService](../../frontend/src/services/business/board/SatisfactionService.ts), [ADR-0011](../02-architecture/decisions/ADR-0011-retire-anonymous-satisfaction-password-proof.md) | 2026-09-08 | - |

## DEC-OPS-064

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-064 | accepted | **만족도 관리자 대리 삭제를 배선한다**(축 1 unwired 래칫 17→16). 관리자(라우트 게이트와 같은 역할 집합)의 삭제는 `DELETE .../{dgstfnSn}/moderate` 로, 일반 사용자는 종전 `DELETE .../{dgstfnSn}` 로 나간다. 관리자 삭제만 대상 이름을 밝힌 확인을 거친다 — 남의 평가를 지우는 경우이기 때문이다. 버튼은 하나로 유지한다. | 사용자 지시(2026-09-08 "남은작업 모두 완료할때까지 계속")에 따른 집행이다. ⚠ **두 API 는 결과가 같지만 판정이 다르다** — 처음에는 ADR-0011 이 비밀번호 소유 증명을 폐지했으니 `moderate` 가 대체된 표면일 것으로 봤는데, 실측하니 일반 삭제의 `assertCanModify` 는 `if (!StringUtils.hasText(entity.getFrstRgtrId())) throw ACCESS_DENIED` 로 **작성자 정보가 없으면 관리자도 거부**하고 `deleteByModerator` 는 `assertAdmin` 만 본다. 즉 ADR-0011 이전의 익명 평가처럼 작성자가 비어 있는 행은 **대리 삭제로만 지울 수 있는데 그 화면이 없었다** — 욕설·스팸이 남아 있어도 지울 경로가 없는 상태였다. ⚠ 역할로 경로를 가르는 것이 이 화면의 "권한을 추측하지 않는다" 방침과 충돌하지 않는 이유: 버튼을 숨기지 않고 **어느 경로로 부를지**만 정하며, 실패 모드가 안전하다 — 관리자를 일반 사용자로 잘못 보면 자기 평가는 그대로 지워지고 레거시 행만 못 지운다(반대 방향은 서버 `@AdminOnly` 가 막는다). 판정 집합은 라우트 게이트와 같다(DEC-OPS-023 ②). ⚠ 확인 대화를 관리자에게만 둔 이유: 일반 사용자는 자기 평가만 지우므로 종전 동작을 보존하고, 관리자는 남의 것을 지우므로 대상을 밝힌다. 계약이 두 방향을 모두 고정한다. | [SatisfactionSection](../../frontend/src/components/features/satisfaction/SatisfactionSection.tsx), [대리 삭제 계약](../../frontend/src/components/features/satisfaction/__tests__/SatisfactionSection.test.tsx), [SatisfactionService](../../frontend/src/services/business/board/SatisfactionService.ts), [SatisfactionApiController](../../api-server/src/main/java/nuri/api/controller/business/board/SatisfactionApiController.java) | 2026-09-08 | - |

## DEC-OPS-065

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-065 | accepted | **알림 단건 삭제를 배선한다**(축 1 unwired 래칫 16→15). 알림 드로어의 각 항목에 삭제를 두고 `DELETE /api/v1/notifications/{notiSn}` 를 부른다 — 서버는 `findOwnedNotification` 으로 **본인 알림만** 지운다. 미읽음 알림을 지우면 배지도 함께 줄인다. **일괄 삭제는 만들지 않는다** — 서버에 경로가 없고 파괴적이라 범위·확인 절차가 제품 결정이다(2026-08-29 에 죽은 전체 삭제 버튼을 걷으며 남긴 판단을 그대로 따른다). | 사용자 지시(2026-09-08 "남은작업 모두 완료할때까지 계속")에 따른 집행이다. 읽은 알림이 계속 쌓여도 **사용자가 정리할 방법이 없었다** — 보존 스케줄러(DEC-OPS-038)는 기본 비활성이고 보존 개월도 아직 결정 전이다(PD-NOTE-003). ⚠ **삭제 버튼을 카드 바깥에 뒀다.** 미읽음 카드는 카드 전체가 `button`(클릭 = 읽음 처리)이라 그 안에 버튼을 넣으면 **중첩 button** 이 되고 보조기술이 두 동작을 구분하지 못한다. 계약이 중첩 부재와 "삭제를 눌렀을 때 읽음 처리가 함께 나가지 않는다" 를 함께 고정한다. ⚠ 배지 동기화가 이 배선의 실질이다 — 지운 알림이 배지에 남으면 사용자가 열어도 찾을 수 없다. 반대로 이미 읽은 알림을 지울 때는 배지를 건드리지 않는다(둘 다 계약). | [use-notifications](../../frontend/src/lib/hooks/use-notifications.ts), [삭제 계약](../../frontend/src/lib/hooks/__tests__/use-notifications.test.tsx), [드로어](../../frontend/src/app/components/ui/app-notification-drawer.tsx), [접근성 계약](../../frontend/src/app/components/ui/__tests__/notification-controls-accessibility.test.tsx) | 2026-09-08 | - |

## DEC-OPS-066

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-066 | accepted | **로그인 정책 신규 등록 경로를 연다**(축 1 unwired 래칫 15→14). 정책이 없는 사용자(`regYn !== 'Y'`)를 저장하면 `POST /admin/system/login-policies/{userId}` 로, 있으면 종전대로 `PUT` 으로 나간다. 모달 제목과 안내가 그 사실을 **저장 전에** 말한다("아직 로그인 정책이 없습니다. 저장하면 새로 등록됩니다"). | 사용자 지시(2026-09-08 "남은작업 모두 완료할때까지 계속")에 따른 집행이다. ⚠ **보안 기능이 절반만 동작하고 있었다.** 목록 쿼리(`searchLoginPolicies`)는 `tb_user_info` 를 기준으로 `tb_login_policy` 를 **좌측 조인**해 **전체 사용자**를 돌려주고 `CASE WHEN loginPolicy.userId IS NULL THEN 'N' ELSE 'Y' END` 로 `regYn` 을 계산한다. 즉 목록에는 정책이 없는 사용자도 나온다. 그런데 화면의 저장 경로는 `updateLoginPolicy` 하나뿐이고 서버는 `findById(...).orElseThrow(RESOURCE_NOT_FOUND)` 다 — **정책이 없는 사용자를 골라 IP 제한·허용 시간대·2단계 인증을 걸려고 하면 404 였다.** 화면은 저장을 시도하기 전까지 그 사실을 말하지 않았다. ⚠ 프런트 메서드 이름 `saveLoginPolicy` 가 upsert 를 암시했지만 실제로는 수정 전용이었다 — 주석으로 그 사실을 명시하고 신규는 `createLoginPolicy` 로 분리했다. 이름이 계약과 어긋나면 다음 사람이 같은 함정에 빠진다. | [LoginPolicyAdminService](../../frontend/src/services/foundation/system/LoginPolicyAdminService.ts), [LoginPolicyAdminClient](../../frontend/src/app/admin/security/login-policy/LoginPolicyAdminClient.tsx), [등록 경로 계약](../../frontend/src/app/admin/security/login-policy/__tests__/LoginPolicyAdminClient.behavior.test.tsx), [목록 쿼리](../../business-core/src/main/java/nuri/business/domain/login/LoginPolicyRepositoryImpl.java) | 2026-09-08 | - |

## DEC-OPS-067

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-067 | accepted | **보안 3화면(권한·롤·그룹)에 일괄 삭제 UI 를 신설한다**(화면 도달성 래칫 43→40). `StandardDataTable` 의 기존 `enableSelection`·`bulkActions` 계약을 소비해 다중 선택 후 복수 API (`deleteAuthors`·`deleteRoles`·`deleteGroups`)로 **한 번에** 보낸다. 확인 문구는 각 서버의 실제 의미를 말한다 — 권한은 "하나라도 배정돼 있으면 아무것도 삭제되지 않습니다", 그룹은 "배정된 사용자의 그룹 지정이 해제됩니다". | 사용자 지시(2026-09-08 "잔여항목 마저작업해줘" · "판단을 맡길테니 권장안으로 모두 처리")에 따른 집행이다. 축 2 census 가 이 3건을 "일괄 삭제 UI 부재" 로 분류하고 **삭제하지 말라고 판단해 둔 항목**이다(DEC-OPS-062 C형) — 이번에 반대 방향(UI 신설)으로 해소했다. ⚠ **단수 반복으로 대체할 수 없는 이유가 서버 코드에 있다.** `deleteAuthors` 는 선택 전 건에 대해 `assertNoAssignedUsers`·`assertNoHierarchyReferences` 를 먼저 돌리고 하나라도 걸리면 아무것도 지우지 않는 **all-or-nothing** 이며, 그 근거를 서비스 주석이 남겼다("일부만 지우면 어느 것이 남았는지 화면이 말할 수 없다"). `deleteGroups` 는 사용자 그룹 지정 해제(`clearGroupIdByGroupIdIn`)와 삭제를 한 트랜잭션에 묶는다 — 단수 N회면 일부 사용자만 그룹이 풀린 채 남을 수 있다. 화면 문구와 계약이 그 보장을 그대로 옮긴다. ⚠ **폼 검증 census 가 실제 결함을 하나 잡았다** — 권한 화면은 composed 경계라 자식 폼(`AuthorForm`) 제출과 부모 write action 이 **서로** 잠가야 하는데, 신설한 일괄 삭제가 한 방향만 보고 있었다(액션은 폼 저장을 봤지만 폼은 일괄 삭제를 보지 않았다). 그대로 뒀다면 권한을 저장하는 도중 일괄 삭제가 나가 **방금 만든 권한이 지워질** 수 있었다. 상호 잠금은 ref 끼리 매칭돼야 인정되므로 액션의 조건도 state(`authorSavePending`)에서 ref(`authorSaveRequestRef`)로 바꿨다. | [SecurityHubClient](../../frontend/src/app/admin/security/authority/SecurityHubClient.tsx), [SecurityRoleClient](https://github.com/lkindo/egov-enterprise/blob/23bdc811459dce5c3b3f8d77592b8450a7eafa38/frontend/src/app/admin/security/role/SecurityRoleClient.tsx), [SecurityGroupClient](../../frontend/src/app/admin/security/group/SecurityGroupClient.tsx), [AuthorManageService](../../business-core/src/main/java/nuri/business/service/auth/AuthorManageService.java), [폼 검증 census](../../config/governance/frontend-form-validation-census.json) | 2026-09-08 | DEC-OPS-062 의 C형(일괄 삭제 UI 부재) 3건을 해소 |

## DEC-OPS-068

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-068 | accepted | **로그인 정책 해제(삭제)를 배선하고, DEC-OPS-062 가 `deleteLoginPolicy` 를 "대체된 표면" 으로 본 판정을 정정한다**(화면 도달성 래칫 40→39). 정책이 있는 사용자(`regYn === 'Y'`) 행에만 해제 액션을 노출하고, 확인 본문이 사라지는 것(IP 제한·허용 시간대·2단계 인증)을 밝힌다. | 사용자 지시(2026-09-08 "판단을 맡길테니 권장안으로 모두 처리")에 따른 집행이다. ⚠ **정책을 비우는 것과 지우는 것은 다르다.** DEC-OPS-062 는 `lmtYn='N'`·`ipAddr=''` 로 저장하면 `deleteLoginPolicy` 와 같은 결과라고 봤는데, 비우면 **행이 남아 목록에 `regYn='Y'`(정책 보유)로 계속 표시**되고 지워야 `regYn='N'` 이 된다. 목록 쿼리가 좌측 조인으로 그 값을 계산하므로 화면에 그대로 드러난다. 즉 정책을 완전히 해제할 방법이 없었다 — DEC-OPS-066 이 연 등록 경로와 짝이 되는 기능 부재였다. ⚠ 정책이 없는 사용자에게는 이 액션을 노출하지 않는다 — 서버가 404 를 낼 뿐이고 사용자에게는 "지울 것이 없는데 삭제 버튼이 있는" 거짓 어포던스가 된다. 계약이 두 방향을 모두 고정한다. ⚠ 부수로 census 어휘 함정을 다시 만났다 — pending 식별자를 `releasingUserId` 로 두자 폼 검증 census 가 `disabled`·`aria-busy` 연결을 인식하지 못했다. `PENDING_STATE_NAME` 어휘에 "releasing" 이 없기 때문이며(DEC-OPS-037 의 `closingSn` 과 같은 형태), `releasePendingUserId` 로 바꿔 해소했다. | [LoginPolicyAdminClient](../../frontend/src/app/admin/security/login-policy/LoginPolicyAdminClient.tsx), [해제 계약](../../frontend/src/app/admin/security/login-policy/__tests__/LoginPolicyAdminClient.behavior.test.tsx), [목록 쿼리](../../business-core/src/main/java/nuri/business/domain/login/LoginPolicyRepositoryImpl.java) | 2026-09-08 | DEC-OPS-062 의 B형 판정 중 `deleteLoginPolicy` 1건만 정정(나머지 2건은 유지) |

## DEC-OPS-069

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-069 | accepted | **사용자 결정 4건을 "현 상태 유지" 로 확정한다**(2026-09-08 사용자 응답 — PD-AUTH-003·PD-ADBK-001·PD-CODE-001·PD-OPS-003). ① **공개 회원가입을 넣지 않는다** — 관리자 프로비저닝만 유지한다. ② **주소록 사용자 검색을 화면에 노출하지 않는다.** ③ **기관코드 수신 이력을 조회 전용으로 유지한다** — 원장 반영 경로를 만들지 않는다. ④ **health probe 는 `/actuator/health` 를 유지한다.** 네 결정 모두 코드 변경이 없고, `operation-consumer-census` 원장의 해당 사유를 "미검토 부채" 에서 **결정 기록**으로 바꿔 다음 사람이 다시 판단하지 않게 한다. | 사용자 결정(2026-09-08)이다. 각 항목의 경계는 코드 실측으로 확인했다 — 회원가입은 서비스가 `Role.USER` 로 고정하고 `SignupContractLinter` 가 동결하므로 특권 상승 위험은 없으나 공개 가입을 열면 캡차·이메일 인증·승인 대기가 함께 필요해 배선이 아니라 신규 기능이다. 주소록 검색은 `@PrivacyAccess` 로 성명·이메일·전화번호를 응답에 실으며, 배선은 편의 추가가 아니라 개인정보 노출 표면 신설이라 DEC-OPS-035 가 세운 경계와 반대다. 기관코드는 `chg_se_cd` 값 도메인이 없어(화면 1/2/3, 테스트 "I", seed·enum 부재) 해석하면 코어 데이터를 잘못 덮어쓴다. health 는 compose 가 이미 actuator 를 가리키고 그쪽이 DB·디스크 indicator 까지 본다. ⚠ 집행 중 **주소록의 죽은 프런트 메서드를 걷으려다 되돌렸다** — 결정은 "화면에 노출하지 않는다" 이고 서비스 메서드 제거는 그 범위 밖인데, 지우면 축 1 `unwired` 래칫이 14→15 로 올라간다. 부채가 는 것이 아니라 죽은 소비가 사라져 실상이 드러나는 것이지만(DEC-OPS-053 과 같은 형태), 결정 이행에 필요하지 않은 변경으로 래칫을 올리는 것은 신호를 흐린다. 현 상태가 정확한 표현이다. | [pending-decisions](../04-operations/pending-decisions.md), [census 원장](../../config/governance/operation-consumer-census.json), [UserApiController](../../api-server/src/main/java/nuri/api/controller/UserApiController.java), [AddressBookApiController](../../api-server/src/main/java/nuri/api/controller/business/addressbook/AddressBookApiController.java) | 2026-09-08 | PD-AUTH-003·PD-ADBK-001·PD-CODE-001·PD-OPS-003 종료 |

## DEC-OPS-070

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-070 | accepted | **설문 응답자·마이페이지 콘텐츠 두 표면을 걷는다**(2026-09-08 사용자 결정 PD-SRVY-001·PD-MYPG-001). 각각 API·화면·서비스·DTO 를 제거하고 **물리 테이블은 남긴다**(파괴적 DB 변경은 별도 승인 경계). 엔티티 처분은 갈렸다 — 설문 응답자는 **엔티티·리포지토리를 남기고**(설문 템플릿 변경 가드가 `existsBySrvySn` 을 쓴다), 마이페이지는 **함께 걷었다**(쓰는 코드가 남지 않아 `UnreachableServiceLinter` 가 도달 불가로 잡았다). | 사용자 결정(2026-09-08)이다. 두 도메인 모두 **행을 만드는 코드 경로가 저장소에 없어 구조적으로 비어 있었다.** ⚠ **결정 자료보다 상황이 나빴다 — 둘 다 화면이 이미 있었다.** 응답자는 조회·삭제 화면(`/admin/survey/respondents` + 허브 탭)이, 마이페이지는 목록·토글 화면이 있었고 둘 다 **항상 빈 목록**이었다. 응답자 쪽은 게다가 `next.config.ts` 리다이렉트가 그 라우트를 허브 탭으로 삼키고 있어 **원래 도달 불가**였다 — 탭을 걷으면 존재하지 않는 탭으로 보내므로 리다이렉트도 함께 제거했다. ⚠ 마이페이지는 더 근본적이었다 — 등록·삭제가 없을 뿐 아니라 **그 값을 읽는 화면이 없다**(대시보드 위젯 SPI 구현 2개가 이 값을 쓰지 않는다). 켜고 꺼도 어디에도 나타나지 않으므로 소비처를 먼저 정하는 것이 결정 내용이다. ⚠ **e2e 테스트 하나가 위장이었다** — `toggleContentStatus` 가 `if (count > 0) {…클릭…} else { console.log(...) }` 로 두 갈래가 모두 통과 경로였고 시드가 없어 항상 else 였다. 남는 검증은 "페이지가 열린다" 뿐이다. 같은 파일의 검색 테스트가 2026-08-10 에 정확히 그 이유로 제거됐는데("동전던지기 단언을 커버리지로 세지 않는다") 이건 남아 있었다. 화면과 함께 걷었다. | [pending-decisions](../04-operations/pending-decisions.md), [SurveyResultDto](../../business-app/src/main/java/nuri/business/service/survey/dto/SurveyResultDto.java), [EntityTableOwnershipLinterTest](../../api-server/src/test/java/nuri/api/harness/EntityTableOwnershipLinterTest.java), [전역 검색 여정](../../frontend/e2e/journeys/global-search.spec.ts) | 2026-09-08 | PD-SRVY-001·PD-MYPG-001 종료 |

## DEC-OPS-071

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-071 | accepted | **메모보고 수정·삭제를 화면에 열고, 응답에 서버 판정 `editable` 을 싣는다**(2026-09-08 사용자 결정 PD-RPT-001 = ⓐ). ① `MemoReportDto.editable`(read-only) 를 신설하고 `MemoReportService` 가 `assertOwnerOrAdmin` 과 **같은 규칙**으로 판정해 목록 3본(전체·내가 쓴·내가 받은)과 상세에 싣는다 — 관리자면 true, 작성자 loginId 가 일치하면 true, 작성자 정보가 없으면 false(판정 불가는 열지 않는다). ② 상세 모달 footer 에 `editable` 일 때만 수정·삭제를 노출한다. 수정 폼은 제목·내용만 묻되 **서버 update 가 전체 치환**이므로 `memoRptYmd`·`atchFileSn` 을 상세에서 읽어 함께 되돌려 보낸다. 삭제는 `useConfirm` destructive 확인 + 동기 잠금 + `aria-busy` 다. ③ **식별자는 싣지 않는다** — `frstRgtrId`(loginId)를 응답에 추가하는 대안(ⓑ)은 목록 응답마다 로그인 ID 가 실려 계정 열거 표면이 넓어진다. 화면은 판정 결과만 쓰고 실제 차단은 여전히 서버가 집행한다(이중 검증). | 사용자 결정(2026-09-08 "8:a")에 따른 집행이다. 감사 실측: 서버는 `updateMemoReport`·`deleteMemoReport` 와 `assertOwnerOrAdmin(frstRgtrId)` 가 완비돼 있는데 **화면이 "내가 고칠 수 있는가" 를 판정할 정보를 받지 못했다** — 그 인가는 loginId 축인데 응답 DTO 에 그 필드가 없고, 같은 도메인의 열람 인가는 esntlId 축(`userId`·`rptrId`)이라 두 축이 다르다. 그래서 화면이 흉내낼 수 없었고 두 operation 이 축 2 고아로 남아 있었다. ⚠ 전체 치환은 DEC-OPS-045(외부인사)·DEC-OPS-058(설문 수정)과 같은 함정이다 — 제목만 보내면 보고일자·첨부가 null 로 지워진다. 계약 테스트가 **바꾸지 않는 필드가 기존 값 그대로 실려 가는지**를 단언해 그 안전 조건을 고정한다. api-docs 재추출은 필드 추가일 뿐 표면 변화가 없어 operation 수 370 불변이다. 게이트: 폼 검증 census +2(native-form 1 + destructive secondary-action 1 — 중복 차단·pending·실패 피드백 단일 테스트 증거), 화면 고아 래칫 34→32, URL-state census 재생성·승인 sha 재결속, 생성 계약 3종 재생성. | [MemoReportService](../../business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java), [MemoReportDto](../../business-app/src/main/java/nuri/business/service/memoreport/dto/MemoReportDto.java), [MemoReportManagementClient](../../frontend/src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx), [배선 계약](../../frontend/src/app/admin/operation/memo-reports/__tests__/MemoReportDetail.test.tsx) | 2026-09-08 | - |

## DEC-OPS-072

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-072 | accepted | **커뮤니티 회원 자격이 회원 전용 게시판을 연다**(2026-09-08 사용자 결정 PD-CMTY-001 = ⓐ). ① foundation `CommunityBoardAccessPort`(승인 회원 판정 + 커뮤니티 존재 확인)를 두고 커뮤니티가 구현한다 — 게시판이 커뮤니티를 직접 import 하지 않으므로 서비스 계층 교차 결합(GAP-ARCH-001)은 불변이다(DEC-OPS-047 템플릿 참조 포트와 같은 방식). ② `tb_bbs_master.cmnty_sn` 이 있는 게시판은 **회원 전용**이다 — 목록·상세·댓글·등록·답글·수정·삭제 전 경로에서 관리자이거나 승인된 회원(`mbr_stts_cd='P'`)만 통과한다. 가입 신청 상태는 회원이 아니다. **포트가 없으면 거부한다**(fail-closed). ③ 통합 검색은 커뮤니티 귀속 게시판을 **통째로 제외한다** — 관리자도 제외한다. ④ `GET /api/v1/communities/{cmntySn}/boards` 신설 — `findByCmntySnAndUseYn` 의 첫 소비자이며, 커뮤니티 상세 화면이 회원에게 게시판 목록을, 비회원에게 사유를 보여 준다. ⑤ 게시판 생성 마법사에 **커뮤니티 귀속(선택)** 을 둔다. 서버는 없는 커뮤니티 귀속을 404 로 거부한다(`cmnty_sn` 에 물리 FK 가 없다). 귀속은 **생성 시점에만** 정한다 — 나중에 바꾸면 이미 쌓인 글의 열람 범위가 통째로 달라진다(H3). ⑥ 블로그 도메인은 현 상태 유지다(GAP-BLOG-001). | 사용자 결정(2026-09-08 "1:a")에 따른 집행이다. 실측: 가입·승인·반려 전이는 DEC-OPS-043 으로 완비됐는데 **회원이 되어도 열리는 기능이 하나도 없었다** — 화면이 그 사실을 고지하고 있었고('회원 전용 기능은 아직 제공되지 않습니다'), 귀속 컬럼 `cmnty_sn` 과 `findByCmntySnAndUseYn` 은 있었지만 **읽는 코드가 저장소 전체에 0** 이었다(GAP-CMTY-001). ⚠ 배선에서 가장 중요한 판단은 **마법사에 귀속 선택을 함께 넣은 것**이다 — 귀속을 설정할 경로가 없으면 서버 게이트도 커뮤니티 상세의 목록도 **구조적으로 항상 비어 있는** 기능이 된다(ISG·설문 응답자가 정확히 그랬다 — DEC-OPS-048·050). ⚠ 통합 검색에서 관리자까지 제외한 이유: 회원 집합을 검색 술어로 나르려면 매 검색마다 가입 커뮤니티를 조회해야 하고, 관리자만 열어 두면 **같은 검색어가 사람마다 다른 결과를 내는데 화면이 그 사실을 말하지 않는다**. 회원은 커뮤니티 상세의 게시판 목록으로 들어간다. ⚠ 포트 부재를 거부로 다루는 이유: 커뮤니티 도메인이 빠진 파생 제품에서 "판정할 수 없으니 통과" 로 두면 회원 전용 게시판이 **전원 공개로 뒤집힌다**. 게이트: 읽기 인가 표면 173→174(GET 1행, URL 축은 종전과 같은 DEFAULT_AUTHENTICATED 이고 회원 판정은 서비스 가드가 소유 — 매니페스트 sha 재결속), 인가 정책 manualGuardPolicies +2(registry 해시 재결속), api-docs 재추출 후 생성 계약 3종 재생성(operation 370→371), 생성 경계 census 재생성, operation-consumer-census(소비 317→318, 화면 고아 34 불변), URL-state census 재생성·승인 sha 재결속. | [CommunityBoardAccessPort](../../foundation/src/main/java/nuri/foundation/core/community/CommunityBoardAccessPort.java), [CommunityBoardAccessAdapter](../../business-app/src/main/java/nuri/business/service/community/CommunityBoardAccessAdapter.java), [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [접근 경계 계약](../../business-app/src/test/java/nuri/business/service/board/BoardCommunityAccessTest.java), [CommunityDetailHubClient](../../frontend/src/app/cop/cmy/selectCommunityDetail/[id]/CommunityDetailHubClient.tsx), [BoardMakerWizard](../../frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx) | 2026-09-08 | - |

## DEC-OPS-073

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-073 | accepted | 블로그 도메인의 전체 제거를 ADR-0012로 확정한다. GAP-BLOG-001을 활성 gap에서 종료하고, 블로그 유지 결정을 후속 결정으로 대체한다. | 사용자 명시 요청(2026-09-08 “블로그 도메인을 모두 제거해줘”)에 따른 제품 범위 축소다. 커뮤니티와 게시판의 기존 인가·템플릿 참조 차단은 유지한다. | [ADR-0012](../02-architecture/decisions/ADR-0012-retire-blog-domain.md) | 2026-09-08 | DEC-OPS-072의 ⑥ 및 DEC-OPS-047의 블로그 기여자 부분만 종료 |

## DEC-OPS-074

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-074 | accepted | 사용자 요청에 따라 CI/CD에 CodeQL SAST를 추가하고 `secure-coding`을 여섯 번째 required context로 정의한다. High/Critical 차단·언어별 실제 red 증명·소스 제거 SARIF 보관을 연결한다. | 시크릿·의존성 검사로 소스 시큐어코딩 검증을 대신하지 않기 위해서다. 원격 집행은 대상 SHA의 CI와 `verify:ops` 실측으로 별도 확인한다. | [ADR-0015](../02-architecture/decisions/ADR-0015-secure-coding-ci.md), [CI 가이드](../03-guides/cicd-pipeline.md) | 2026-09-09 | — |

## DEC-OPS-075

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-075 | accepted | CodeQL 오탐 7건을 소스·방어 해시, 정확한 탐지 위치, 만료일에 묶어 한정 예외로 등록한다. | 사용자가 확실한 오탐에 한해 등록하도록 명시 승인했으며 신규·변형 탐지는 계속 차단한다. | [ADR-0015](../02-architecture/decisions/ADR-0015-secure-coding-ci.md), [검토 근거](../04-operations/sast-findings-review.md) | 2026-09-09 | — |

## DEC-OPS-076

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-076 | accepted | **재사용 base 투영에서 거버넌스 게이트가 조용히 사라지는 경로를 닫는다** — 세 축이다. ① **투영 의존은 코드에서만 판정한다** — `referencedRemovedJavaType` 이 주석·문자열 리터럴을 제거한 뒤 매칭한다. ② **판정 유틸을 메타 게이트에서 중립 인덱스로 옮긴다** — `stripCommentsPreservingStrings`·`skipLiteral` 을 `HarnessBaselineIntegrityTest` 에서 `HarnessSourceIndex` 로 이관하고 소비 린터 6개(12 호출부)를 재배선한다. ③ **제거된 게이트를 명시하고 명시적 승인과 exact 대조한다** — 생성기가 제거 목록·사유를 콘솔·`REUSABLE_BASE.md`·lock 의 `removedGates` 에 기록하고, `profiles.<name>.acknowledgedRemovedGates` 의 `{file, reason}` 과 양방향 대조한다(승인 없는 제거·낡은 승인·사유 없는 승인 전부 FAIL). 승인 목록 자체의 건전성(형식·중복·대상 실재)은 `reusable-base-census` 와 그 계약(CI `test:operational-contracts`)이 지킨다. frontend 제거는 선언·연쇄를 나눠 세고 `frontend/src/__tests__/` 아래 계약 제거는 같은 승인 축에 둔다. | 실측: core 프로필 투영에서 하네스 39개 중 **11개가 사라졌고**, 그중 **7개의 방아쇠가 오탐 하나**였다 — `HarnessBaselineIntegrityTest` 가 javadoc 1곳과 `Pattern.compile` 문자열 1곳에서 `InputContractMirrorLinterTest` 를 **언급**했다는 이유로 제거되고, 그 클래스의 헬퍼를 부르던 린터 6개가 컴파일 의존으로 따라 나갔다. ⚠ 그런데 **손실 자체가 조용했다** — `writeHarnessBaseline` 이 생존 게이트만으로 baseline 을 다시 쓰므로, 파생 제품의 메타 게이트는 사라진 게이트를 처음부터 없었던 것으로 본다. "게이트 삭제 차단" 게이트가 자기 삭제를 기록하지 못한 채 재동결되는 구조이며 H2 가 금지하는 신호 은폐와 같은 방향이다. ②를 함께 한 이유: ①만으로 오탐은 사라지지만 6개가 메타 게이트에 묶인 **구조**는 남아, 나중에 메타 게이트가 정당하게 빠지면 또 6개가 따라간다. ③을 exact 승인으로 둔 이유: 임계치는 교체(swap)로 우회되고 단순 로그는 읽히지 않는다 — 게이트가 빠지는 변경에서 매니페스트와 커밋이 함께 움직여야 diff 에 의도가 남는다(메타 게이트 자신의 설계 원칙과 같다). ⚠ ③ 이 즉시 **새 사실 3건을 드러냈다** — 종전 진단이 `nuri/api/harness/` 만 보고 있어서 `RbacAuthorizationMatrixTest`(RBAC 매트릭스)·`QueryCountGuardrailIntegrationTest`(N+1 가드)·`SurveySubmissionConcurrencyIntegrationTest` 의 소멸을 아무도 세지 않았다. ⚠ ②의 부작용으로 `HarnessSourceIndex` 가 허브가 되면서 **그 파일 주석에 게이트 클래스명을 적으면 안 된다** — ①을 되돌린 red 증명에서 하네스가 39/39 전멸했고(주석에 클래스명이 있을 때), 이름을 뺀 뒤에는 10건이었다. 그 이유를 파일 주석에 남겼다. red 증명: ① 되돌리기 → 게이트 10건 제거·FAIL, ③ 승인 누락·낡은 승인·사유 공백 3종 전부 FAIL, census 계약의 개명·사유 부재·중복 3종 red. | [소스 생성기](../../scripts/generate-reusable-base-source.mjs), [pack manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [census 검증](../../scripts/reusable-base-census.mjs), [census 계약](../../scripts/reusable-base-census.test.mjs), [HarnessSourceIndex](../../api-server/src/test/java/nuri/api/harness/HarnessSourceIndex.java), [생성 가이드 §3.6](../03-guides/reusable-base-guide.md) | 2026-09-12 | - |

## DEC-OPS-077

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-077 | accepted | **재사용 base 산출물의 하네스 검증을 실측 기준으로 세운다.** ① 생성기 `writeHarnessBaseline` 을 메타 게이트 `HarnessBaselineIntegrityTest` 의 `actual` 맵과 **충실한 거울**로 만들고(6개 스캔 루트·게이트 태그 술어·숫자 상수·`__sourceHash`·`__registry.*`, 블록 주석을 공백으로 치환), 그 동등성을 `harness-baseline-mirror-contract`(CI `test:operational-contracts`)가 **저장소 자신에 대해** 강제한다. ② 인가 역사 계보 검사는 투영본에서 base 부트스트랩 시드의 동등 anchor 를 검사하며, 판별은 "V1 baseline 이 있고 V2 가 하나도 없을 때" 로 한정한다. ③ migration 검증 census 42→0 을 `adaptGeneratedHarness` 로 적응한다. ④ ZDM waiver registry 를 번들에 실재하는 migration 으로 가지치고 legacy debt census 를 함께 적응하며, Contract 규칙 검증은 저장소 파일 이름 의존을 버리고 **격리 sandbox 픽스처**로 증명한다. ⑤ 통과 기대치를 프로필별로 명시한다 — `demo`(제거 0)는 **green 이어야 하고**, 축소 프로필의 잔여 red 는 DEC-OPS-019 의 adopter 기준선 재동결 영역으로 둔다. | ⚠ **실측이 먼저였다.** 2026-09-12 에 처음으로 투영본에서 `:api-server:harnessTest` 를 실제로 돌려 보니 **아무것도 제거하지 않는 demo 프로필조차 게이트 5건이 red** 였다 — 즉 가이드 §4 의 산출물 검증은 통과할 수 없는 상태였고, v0.1.0(2026-08-24) 이후 산출물을 재생성한 적이 없어 아무도 몰랐다. 원인은 전부 생성기가 게이트의 진화를 따라가지 못한 것이었다: DEC-OPS-027(2026-09-01)이 census 를 넓혔는데 생성기의 상수 정규식에는 숫자·boolean 이 없었고(anti-vacuity 플로어가 전부 숫자다) `__sourceHash`·`__registry.*`·testFixtures·migration-tool 이 통째로 빠져 모집단이 **45 대 114** 였다. 보안 게이트는 V2 체인이 V1 번들로 교체된 사실을 몰라 `NoSuchFileException` 으로 죽었고, ZDM 은 사라진 migration 을 지목하는 waiver 40건·legacy debt 43건을 fail-closed 로 거부했다. ①에 **미러 계약**을 붙인 이유가 여기 있다 — 같은 드리프트가 다시 나면 산출물 생성 시점이 아니라 main 에서 즉시 red 다. ⚠ ②에서 "파일이 없으면 통과" 를 택하지 않은 것이 핵심이다 — `R__zz_seed_base_admin.sql` 은 **본체에도 존재**하므로 단순 폴백이면 본체에서 V2_11 을 지우는 은폐가 열린다(실측 확인). 두 조건(V1 존재 ∧ V2 부재)을 함께 요구해야 본체의 V2 101개가 그 분기를 막는다. ⚠ ④에서 Contract 규칙 검증을 sandbox 로 옮긴 것은 회피가 아니라 **강화**다 — 종전에는 저장소의 실제 V2 파일 이름에 묶여 있어 투영본에서 네 판정이 모두 vacuous 했는데, 이제 본체와 투영본에서 똑같이 네 판정이 실제로 실행된다. ⚠ ⑤를 결정으로 둔 이유: 축소 프로필의 red 19건(core)·13건(collaboration)은 동결 census ↔ 축소 제품의 구조적 불일치이고, 그 해소는 DEC-OPS-019 가 이미 정한 adopter 재동결 절차다. 일부는 게이트를 실행해야 나오는 내용 해시라 생성기의 정적 치환으로는 만들 수 없다. 부수로 첨부 assignment census 가 `BoardService` 소스를 필수로 읽는 사실이 드러났다 — 종전에는 그 게이트가 cascade 로 조용히 사라졌고 이제 red 로 말한다(GAP-BASE-001 (C)). ⚠ 같은 조사에서 **DEC-OPS-076 이 만든 승인 census 자신의 구멍**이 드러나 함께 닫았다 — `pruneHistoricalMigrationTests` 가 지우는 42개가 전부 게이트인데(태그 실측 42/42) 그 제거가 승인 검사 **뒤에** 일어나 census 가 '0건' 이라고 말하고 있었다. 규칙 단위 승인 축(`profiles.<name>.acknowledgedGateRemovalRules`)을 신설해 편입했다 — 파일 단위로 두면 migration 검증이 하나 늘 때마다 세 프로필 매니페스트가 흔들려 소음만 남는다. 집계는 demo 0→42, core·collaboration 6→48 로 사실과 일치하게 됐다. 함께 게이트 클래스명 충돌(`module/단순명` 키가 겹쳐 한쪽 동결이 조용히 사라지는 경로)을 fail-closed 로 막았다. red 증명: 미러 계약의 키 추가·삭제 합성 2종이 red; 규칙 승인 없이 생성하면 FAIL(실측); 상수 3개 추가 시 메타 게이트가 정확히 그 3건만 '신설 감지' 로 잡아 매니페스트 재생성을 요구했다(352→355). | [소스 생성기](../../scripts/generate-reusable-base-source.mjs), [미러 계약](../../scripts/harness-baseline-mirror-contract.test.mjs), [SecurityAuthAnnotationLinterTest](../../api-server/src/test/java/nuri/api/harness/SecurityAuthAnnotationLinterTest.java), [ZeroDowntimeMigrationLinterTest](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [생성 가이드 §4.1](../03-guides/reusable-base-guide.md), [GAP-BASE-001](../../.agent/memory/known-gaps.md) | 2026-09-12 | - |

## DEC-OPS-078

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-078 | accepted | **업무 화면 문법 §A3-1(폼 그릇 규칙)에 집행 게이트를 신설한다.** `frontend/src/app` 아래에서 **모달도 목록도 없이 폼만 렌더하는 라우트** = 전용 입력 페이지 후보를 전수 탐지하고, 각각 닫힌 어휘의 판정(`violation`·`partial-violation`·`justified`·`excluded-menu-leaf`·`excluded-not-resource-input`·`pending-pack-ownership`)과 함께 `config/governance/a3-1-form-container-census.json` 에 등재하도록 요구한다. 부채는 **단조 감소 래칫**(`expected.debtMax`)에 걸고, 줄었는데 래칫을 안 내려도 red 다. 정당화는 산문이 아니라 **기계로 대조**한다 — 조건 1a 는 편집기 컴포넌트가, 1b 는 **기존 첨부 관리**(`getFileList`·`deleteFile`·다건 업로드)가 라우트 소스에 실재해야 하고, 메뉴 리프 제외는 주석을 제거한 Flyway 시드에서 경로가 **따옴표 정확 일치**해야 하며 그 `menuSn` 이 이후 DELETE·`use_yn='N'` 에 걸리지 않아야 한다. 제외 판정도 파일·라인 evidence 를 요구한다. 실행은 `npm run a31:census` 이고 CI 는 `test:operational-contracts`(required `secret-scan`)로 돈다. | ⚠ **규칙은 있는데 게이트가 없었다.** 2026-09-12 실측에서 저장소 전체의 `A3-1` 문자열은 문서 밖에 주석 한 곳뿐이었다 — 즉 위반이 들어와도 아무 신호가 나지 않았고, 실제로 전수 탐지 결과 부채가 **5건**이었다(직전 감사가 보고한 3건보다 많다. 그 감사는 지목된 목록만 봤고 전수 스캔을 하지 않았다). 이 세션 내내 확인한 것과 같은 구조다 — 규칙에 게이트가 없으면 무너지는 것이 보이지 않는다. ⚠ **정당화를 기계로 대조하게 만든 것이 이 게이트의 실질이다.** 적대적 검증이 초안의 정당화 3종이 너무 넓다고 반증했다: ① 조건 1a 증거에 `dangerouslySetInnerHTML` 이 있어 **본문을 보여주기만 하는** 모든 상세 화면이 정당화될 수 있었고(실측: `/admin/community/boards/detail` 이 실제로 통과), ② 조건 1b 가 단순 파일 입력을 세어 §A3-1 이 **모달 허용 예시로 든** `/admin/system/banner`(`maxFiles={1}`)와 구분되지 않았으며, ③ 메뉴 리프 면제가 `migrations.includes(route)` 부분문자열이라 **주석 한 줄·접두 일치·이미 삭제된 메뉴**까지 면제를 발급했다. 셋 다 좁혔다. ⚠ 탐지기 자신에게서 같은 계열 결함 2건이 나와 함께 고쳤다 — (가) 주석 속 `<form` 이 열람 상세를 입력 페이지로 둔갑시켰고(`/admin/community/boards/detail` 의 2026-07-27 결함 설명 주석), (나) SQL 주석 제거를 정규식으로 했더니 `'/api/v1/admin/**'` 같은 **URL 패턴 속 슬래시+별표**를 블록 주석 시작으로 오인해(여는 토큰 47 대 닫는 토큰 1) 활성 메뉴 행이 통째로 사라져 거짓 red 가 났다. 둘 다 문자열·주석을 코드로 오인하는 같은 함정이며 상태 기계로 닫았다. ⚠ **알려진 한계를 숨기지 않는다** — 탐지는 라우트 디렉터리만 읽고 import 를 따라가지 않아 자식 컴포넌트의 인라인 폼은 세지 않으며(§A3-1 이 인라인을 최우선 그릇으로 두므로 놓치는 방향이다), 라우트에 확인 Dialog 가 하나라도 있으면 후보에서 빠진다(현재 그런 라우트 2건은 실측상 폼이 모달 안이라 무해). 둘 다 스크립트 docblock 에 적었다. red 증명 10종: 신규 후보 미등재 / 낡은 등재 / 조건 1a·1b 근거 부재 / 메뉴 시드 부재 / 삭제·비활성 메뉴 / 주석·접두 일치 / 제외 근거 부재 / 래칫 상향·하향 — 전부 red 실측. | [census](../../config/governance/a3-1-form-container-census.json), [탐지·검증 스크립트](../../scripts/a3-1-form-container-census.mjs), [계약](../../scripts/a3-1-form-container-census.test.mjs), [카탈로그 §A3-1](../02-architecture/work-screen-grammar-catalog.md) | 2026-09-12 | - |

## DEC-OPS-079

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-079 | accepted | **§A3-1 부채 이행 웨이브 — 전용 입력 페이지를 목록 위 모달로 옮긴다.** 1차 대상은 `/admin/collaboration/address-book/insert-address-book` 이다. 등록 폼을 목록의 `AddressBookCreateDialog` 모달로 옮기고, 그 라우트는 정본 목록으로 page-redirect 한다(라우트를 물리 삭제하지 않는 것은 DEC-OPS-034 선례 — 문자열 URL 참조는 정적 분석으로 잡히지 않는다). disposition 은 `consolidate-to-canonical`(approved, 사용자 위임 2026-08-23)이며 disposition 계약에 **웨이브 3** 를 신설해 승인 주체·일자를 결속한다. | ⚠ 이행의 실질은 화면 형태가 아니라 **맥락 보존**이다 — 목록의 `pageNo`·`searchWrd`·`pageUnit` 이 전부 `useState` 이고 URL 에 실리지 않으므로(목록 page.tsx 가 producer 0건을 근거로 query 읽기를 의도적으로 걷어냈다) 등록하러 떠났다 돌아오면 **1페이지·빈 검색어로 리셋**됐다. 모달은 저장 후 현재 페이지·검색어 그대로 목록만 다시 읽는다. ⚠ 부수로 보호가 **늘었다** — 종전 전용 페이지에는 미저장 가드가 아예 없었는데, 모달은 닫기 경로 전부(Esc·배경·X·취소)에 `useDirtyCloseGuard` 를 걸고 저장 중 닫기는 `closeDisabled` 로 막는다. ⚠ 제출 버튼을 모달 footer 슬롯이 아니라 **form 안**에 둔 이유: 폼 계약이 `submit.closest('form')` 으로 form 을 찾아 동기 잠금을 검증한다. footer 로 빼면 그 계약이 조용히 무력해진다. ⚠ 이 한 화면의 이행이 건드린 census 체인은 7곳이다 — URL-state census 재생성·승인 sha 재결속, route capabilities routing(page→page-redirect)·별칭 수 23→24, disposition overlay·manifest sha·계약 웨이브, URL-state pageRedirects 12→13, 폼 검증 census 소유자 이동, e2e page object(링크 클릭·URL 단언 → 버튼 클릭·모달 단언), Atlas. 나머지 부채 이행도 같은 체인을 탄다. | [모달](../../frontend/src/app/admin/collaboration/address-book/AddressBookCreateDialog.tsx), [A3-1 census](../../config/governance/a3-1-form-container-census.json), [disposition 계약](../../scripts/ui-navigation-disposition-contract.test.mjs) ⚠ **2차 배치(2026-09-12 같은 날): 스크랩 등록·수정과 설문 등록 3건을 같은 방식으로 이행했다** — `insertScrap`·`selectScrapDetail/[id]` 는 목록의 `ScrapFormDialog`(등록·수정 겸용)로, `survey/manage/create` 는 목록의 `SurveyFormDialog` 로 옮기고 세 라우트를 각 정본 목록으로 page-redirect 했다. 스크랩 상세는 판정이 partial 이 아니라 **violation** 이었다 — 이름과 달리 읽기 전용 표면이 0 이라 라우트 보존 의무가 없었다. ⚠ 이 배치에서 **계약이 실제 회귀를 두 번 잡았다**: (가) `frontend-visible-terms` 가 설문 등록의 '응답 선택지가 매우 만족·만족·보통·불만족으로 고정된 설문을 등록합니다' 고지가 모달로 옮기며 빠진 것을 red 로 알렸다(복원했다 — 등록 후에는 선택지를 바꿀 수 없으므로 사전 고지가 필수다). (나) 폼 검증 census 가 스크랩 삭제 계약의 소유자 이동을 요구했다(모달에는 삭제가 없고 목록이 갖는다). 부채 래칫 5 → 1. 남은 1건은 `/admin/survey/manage/[id]`(partial-violation)이며, 그 라우트는 항목별 득표라는 열람 표면이 있어 §A3-1 상 **라우트를 남기고 입력 컨트롤만** 모달로 올려야 한다. ⚠ **이행이 만든 회귀 4건을 같은 PR 에서 닫았다** — 전부 "퇴역한 라우트를 아직 가리키는 화면" 이라는 한 가지 형태다. (가) 설문 허브의 '만족도 조사 등록' 버튼이 `/admin/survey/manage/create` 로 push 했는데, 그 라우트는 목록으로 보내고 목록(`/admin/survey/manage`)은 next.config 가 다시 허브로 되돌린다 — 즉 **누르면 제자리로 돌아올 뿐 등록 폼이 열리지 않는 죽은 버튼**이 됐다(G10). 버튼을 걷고 등록은 manage 탭이 embed 하는 목록 모달이 단독 소유하게 했다. (나) 협업 허브의 '스크랩 등록' 링크가 `insertScrap` 으로 보내 **등록이라 적힌 버튼이 목록으로 떨어졌다**. (다) 같은 허브의 스크랩 **행 클릭**이 `selectScrapDetail/{scrapSn}` 으로 보내 **어느 스크랩을 눌렀는지 식별자가 통째로 버려졌다** — 가장 조용한 형태다. (나)(다) 는 공용 `ScrapFormDialog` 를 허브에도 마운트해 등록·수정을 제자리에서 연다(재조회는 `scrapMutationOptions` 의 `scrapKeys.lists()` 무효화가 처리한다). (라) e2e `ProductivitySuitePage` 가 주소록 등록을 아직 `link` role 로 단언해 CI e2e 가 red 였다 — `button` 으로 고치고 **모달이 실제로 열리는 것까지** 단언한다. ⚠ 넷 다 타입 검사·린트·기존 계약 어디에도 걸리지 않았다(목적지가 문자열이고 리다이렉트는 200 을 돌려준다). 그래서 **역참조 0건을 고정하는 가드**를 신설했다 — 이행 4라우트를 가리키는 생산 코드가 생기면 파일·라우트를 지목하며 red 다(주입 red 실측 완료). "page-redirect 인 모든 라우트" 로의 일반화는 Next 라우트 해석(정적 세그먼트가 동적을 이긴다)이 선행이라 별건이다 — 실측에서 `/admin/community/boards/[id]` 때문에 형제 정적 라우트까지 잡히는 오탐이 21건 나왔다. 교훈은 하나다 — **컨트롤의 존재만 보는 단언은 "눌러도 아무 일이 없는" 회귀를 못 잡는다.** | 2026-09-12 | - |

## DEC-OPS-080

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-080 | accepted | **§A3-1 마지막 부채를 이행하고 래칫을 0 으로 내린다.** `/admin/survey/manage/[id]` 는 **라우트를 남기고**(항목별 득표라는 진짜 열람 표면이 있다) 입력 컨트롤만 `SurveyFormDialog` 수정 모드로 올린다. 모달은 **열릴 때만 마운트**한다. 같은 변경에서 셋을 함께 고친다 — ① 2026-09-12 1차 모달 이행에서 **빠졌던 `설문 유형` 컨트롤을 복원**한다(그동안 새 설문의 유형이 전부 `001` 로 굳었다). ⚠ 다만 **현재 이 값에 분기하는 코드는 없다** — 백엔드는 길이 검증만, 프런트는 라벨만 쓴다. 즉 손실은 런타임 동작이 아니라 **기록**이며, 온라인 투표 관리 화면이 같은 컬럼에 `POLL01` 을 쓰는 어휘 불일치도 그대로 남는다(별건). 모달은 목록에 없는 레거시 코드가 실려 와도 formData 로 보존해 저장 시 유실시키지 않는다 — 종전 상세 라우트와 같은 성질이다, ② 숨겨진 득표를 `0표` 로 적던 것을 **`집계 비공개`** 로 바꾼다, ③ 저장 뒤 목록과 상세를 **둘 다** 무효화한다(전역 staleTime 60초). `pollAtmcDsuseYn` 의 NULL 소실은 **이 변경에서 고치지 않는다** — GAP-POLL-001 로 분리한다. | ⚠ **이행의 실질은 "무엇을 잃지 않는가" 였다.** 상세 라우트에는 모달에 없는 컨트롤이 둘 있었고(`pollKndCd`·`pollDsuseYn`), 그대로 옮겼다면 `updatePoll` 이 **전체 치환**이라 **폐기해 둔 설문이 제목 오타 하나 고치는 김에 조용히 다시 열렸다**(서버 `vote` 가 실제로 집행하는 값이다). 같은 함정을 저장소는 이미 네 번 만났다(DEC-OPS-045·058·060·071). 그래서 가드를 **존재 단언이 아니라 payload 왕복**으로 세웠다 — 왕복을 끊으면 `expected 'N' to be 'Y'` 로 red 다(실측). ⚠ **탐지기 실측이 지름길을 닫았다** — a3-1 census 의 `MODAL` 정규식은 `StandardModal|<Dialog|DialogContent` 라 `<SurveyFormDialog` 를 모른다. 즉 "라우트에 모달만 달기" 로는 후보에서 빠지지 않고, 라우트가 `useManualFormValidation` 을 **실제로 놓아야** 한다(후보 5→4 로 실측 확인). ⚠ **목록이 아니라 상세가 모달을 소유하는 이유**: `StandardDataTable` 은 행 액션을 하나만 렌더하고 이미 '상세 열기'가 쓴다 — 목록에 '수정'을 더할 자리가 없다. 카탈로그 remedy 와도 같다. 삭제는 라우트가 계속 소유한다(확인 대화만 있는 액션은 §A3-1 판정 대상이 아니다). | [SurveyFormDialog](../../frontend/src/app/admin/survey/manage/SurveyFormDialog.tsx), [상세 라우트](../../frontend/src/app/admin/survey/manage/[id]/SurveyManageDetailClient.tsx), [왕복 계약](../../frontend/src/app/admin/survey/manage/__tests__/SurveyFormDialog.edit.test.tsx), [A3-1 census](../../config/governance/a3-1-form-container-census.json) | 2026-09-12 | - |

## DEC-OPS-081

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-081 | accepted | **"생산 코드는 page-redirect 라우트를 가리키지 않는다" 를 route census 파생 일반 게이트로 승격한다.** DEC-OPS-079 가 §A3-1 4라우트를 문자열로 하드코딩해 두었던 가드를 대체하며, `config/ui-route-capabilities.json` 의 `routing.kind === "page-redirect"` 전체(현재 16개)를 덮는다. 판정은 **Next 라우트 해석**을 구현한다 — 세그먼트 수가 같은 후보 중 리터럴 일치가 가장 많은 것이 이기고(정적 > 동적), 소스의 `${...}` 계산 세그먼트는 동적 자리만 채운다. 같은 변경에서 그 게이트가 즉시 찾아낸 **업무 홈(`/`)의 '새 게시글 작성' 버튼**을 정본 작성 화면으로 돌린다. | ⚠ **게이트를 만들자마자 live 결함이 나왔다** — 업무 홈 헤더의 '새 게시글 작성' 이 `/admin/community/boards` 를 가리키는데 그 라우트는 DEC-OPS-040 이후 지식 허브 커뮤니티 탭으로 보내는 page-redirect 다. **글쓰기 버튼이 탭 화면에 떨어지고 있었다.** 2026-09-12 하루에 같은 형태를 다섯 번 봤다(§A3-1 이행 4건 + 이 건) — 리다이렉트가 200 을 돌려주므로 타입 검사·린트·기존 계약 어디에도 걸리지 않는다. ⚠ **일반화의 전제가 라우트 해석이었다** — 접두 매칭으로는 `/admin/community/boards/[id]` 가 page-redirect 라는 이유로 형제 **정적** 라우트(`detail`·`master`·`select-board-list`)까지 위반으로 잡힌다(실측 오탐 21건). 해석을 구현하자 진짜 위반 1건이 됐다. 오탐이 많은 게이트는 결국 예외 목록으로 무력화되므로(H2) 정확도가 곧 수명이다. ⚠ 대체가 **약화가 아님을 명시적으로 증명**한다 — 구 가드가 지키던 4라우트를 계약 안에 그대로 단언으로 남겼고, 형제 정적 라우트 비-오탐도 함께 고정했다. 버튼 목적지에 `bbsId` 를 싣는 이유는 정본 작성 화면이 `bbsId` 부재 시 **공지사항**을 기본값으로 잡기 때문이다 — 업무 홈에서 누른 글쓰기가 공지 방송이 되면 안 된다. | [가드](../../frontend/src/__tests__/page-redirect-reference-guard.test.ts), [route census](../../config/ui-route-capabilities.json), [업무 홈](../../frontend/src/app/UnifiedDashboardClient.tsx) | 2026-09-12 | DEC-OPS-079 의 4라우트 전용 가드를 대체 |

## DEC-OPS-082

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-082 | accepted | **온라인 투표 수정에서 자동폐기 여부(`pollAtmcDsuseYn`)는 요청에 없으면 기존 값을 유지한다.** `OnlinePollService#updatePoll` 이 그 값을 해석해 엔티티에 넘긴다 — 엔티티 `update` 는 전체 치환 그대로 두고 정책은 서비스가 소유한다(같은 메서드가 이미 길이 절단·날짜 정규화를 한다). 나머지 다섯 필드는 화면이 전부 실어 보내므로 전체 치환을 유지한다. 이미 NULL 인 기존 행의 백필은 **포함하지 않는다** — GAP-POLL-001 에 남긴다. | insert 만 null→"N" 을 보정하고 update 에는 그 보정이 없는데, 이 필드를 묻는 화면이 하나도 없어 요청에는 언제나 빠져 있었다. 그래서 **저장할 때마다 NULL** 이 됐고, 컬럼이 NULL 을 받고(V2_0 `character varying(1)`) `CHECK (… IN ('Y','N'))`(V2_24)도 PostgreSQL 규칙상 NULL 을 통과시켜 아무것도 실패하지 않았다 — 조용한 소실이다. ⚠ **insert 와 같은 보정을 복제하지 않은 것이 이 결정의 핵심이다** — 화면이 값을 안 보내므로 null→"N" 은 저장마다 `Y`(자동폐기 설정됨)를 `N` 으로 뒤집어 NULL 소실을 더 나쁜 결함으로 바꾼다(GAP-POLL-001 이 원래 적었던 선택지가 그것이었고 이 결정이 정정한다). PATCH 형 병합(여섯 필드 전부 null=유지)은 같은 도메인의 다른 PUT(DEC-OPS-058·071)과 의미가 갈리는 별도 계약 결정이라 채택하지 않았다. ⚠ 비대칭은 의도다 — 다섯 필드는 컨트롤이 있고 이 하나는 없다. 컨트롤이 생기면 유지 분기를 걷는다. red 증명: 유지 분기를 되돌리면 "요청에 없으면 기존 값을 유지한다" 테스트만 실패하고(54개 중 1개) "명시하면 바뀐다" 는 양쪽에서 통과한다 — 후자가 과잉 교정("항상 기존 값을 쓴다")을 막는 대조군이다. 기계 census 는 하나도 움직이지 않는다(api-docs·codegen·인가 정책·폼 검증 전부 불변). | [OnlinePollService#updatePoll](../../business-app/src/main/java/nuri/business/service/survey/OnlinePollService.java), [서비스 계약](../../business-app/src/test/java/nuri/business/service/survey/OnlinePollServiceTest.java), [V2_24 CHECK](../../api-server/src/main/resources/db/migration/V2_24__add_yn_check_and_meta_fk_index.sql), [GAP-POLL-001](../../.agent/memory/known-gaps.md) | 2026-09-12 | GAP-POLL-001 이 적었던 선택지 ⓐ 서술을 정정 |

## DEC-OPS-083

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-083 | accepted | **축소 프로필(core·collaboration)에서 404 가 되는 링크 4축을 닫는다** (GAP-PACK-001 ③). ① 로그인 기본 착지 `DEFAULT_POST_LOGIN_PATH` 를 `/admin/work-hub` → **`/`**. ② 관리자 오류 화면의 '메인으로' 3곳을 같은 값으로. ③ 헤더·푸터·전역 오류의 `/help` 링크 3곳을 **demo 마커 블록**으로 감싼다(core 에 대응 화면이 없어 목적지를 바꿀 수 없다 — 링크가 demo 와 함께 빠져야 한다). ④ `admin/community/boards/page.tsx` 를 demo `removePaths` 에 편입한다 — 그 파일은 `/admin/help?tab=COMMUNITY` 로 보내는 redirect 인데 목적지가 demo 소유라 **축소 프로필에서 리다이렉트가 404 로 보냈다**(형제 `admin/community/page.tsx` 는 이미 같은 이유로 편입돼 있었다). | ⚠ **가장 심각한 것은 ①이었다** — 워크허브는 demo pack 소유라 제거되는데 `generated-permissions` 에는 항목이 남아 프록시가 통과시키고 Next 가 404 를 낸다. 즉 **파생 제품은 첫 로그인부터 깨져 있었고** 아무것도 실패하지 않아 조용했다. `/` 를 고른 근거는 셋이다 — 모든 프로필에 남고, **프록시가 이미 권한 부족 시 보내는 곳이며**(proxy.ts `/admin` 게이트가 `/?auth_error=unauthorized` 로 보낸다), `/admin` 게이트 밖이라 403 복구 목적지로도 더 안전하다. 종전 값이 통했던 이유는 워크허브의 페이지 권한이 `[]`(인증된 누구나)여서인데, 그것은 전체 제품에서만 참이다. ⚠ **④ 는 조사 중 새로 드러났다** — PR #628 의 page-redirect 역참조 가드는 "목적지가 redirect 인가" 를 보지 "목적지가 이 프로필에서 살아남는가" 를 보지 않는다. 축이 다르며 후자는 프로필 인지 도달성 게이트(GAP-PACK-001 ③(i))의 영역이다. ⚠ 값을 고정하던 계약 2개는 **성질이 드러나도록** 고쳤다 — 로그인 open-redirect 표는 안전 착지를 상수로 빼고 "정상 내부 경로는 그대로 통과" 대조군을 유지했으며(보안 성질 무변경), 403 복구 계약은 값과 함께 **`/admin` 밖인지**도 단언한다. ⚠ 오탐 주의로 기록한다 — `ManualAdminService.ts` 의 `super('/help')` 는 API base path 이지 프런트 라우트가 아니다. 도달성 게이트를 만들 때 반드시 걸러야 한다. | [LoginClient](../../frontend/src/app/login/LoginClient.tsx), [admin/error](../../frontend/src/app/admin/error.tsx), [pack manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [GAP-PACK-001](../../.agent/memory/known-gaps.md) | 2026-09-12 | - |

## DEC-OPS-084

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-084 | accepted | **쿼리 수 계측 가드레일을 core 도메인 표적으로 돌려 축소 프로필에 살린다**(GAP-PACK-001 ④ 의 첫 배치). `QueryCountGuardrailIntegrationTest` 의 표적을 `AddressBookService`(demo 소유)에서 `DeptManageService`(business-core)로 바꾼다. 주소록 고유의 쿼리 상한은 버리지 않고 `AddressBookQueryCountIntegrationTest` 로 분리해 **주소록과 함께 빠지게** 둔다. core·collaboration 의 `acknowledgedRemovedGates` 에서 해당 항목을 **삭제**한다. | ⚠ **게이트의 목적과 표적이 어긋나 있었다** — 파일의 javadoc·DisplayName 이 말하듯 이 테스트가 보는 것은 특정 도메인의 N+1 상한이 아니라 **계측 인프라가 동작하는가**다(카운터가 실제 쿼리를 세는가, 비동기 스레드 풀의 쿼리까지 따라가는가). 도메인은 그것을 굴리는 수단일 뿐인데 그 수단이 demo 소유라, **타입 참조 한 줄 때문에 축소 프로필에는 계측 가드레일이 아예 없었다.** ⚠ **실제 생성기 실행이 내 가정 하나를 반증했다** — 처음에는 승인 항목을 새 주소록 파일로 *교체*했는데, 생성기가 "더 이상 제거되지 않는 항목" 으로 FAIL 했다. 생성기의 제거 게이트 집계는 **cascade 제거**(제거된 타입을 참조해 따라 빠지는 파일)만 세고, 주소록 테스트 디렉터리처럼 pack 이 **직접** 지우는 파일은 승인 대상이 아니다. 그래서 교체가 아니라 삭제가 맞다. `reusable-base-census` 는 승인 목록의 형식만 보므로 이 오류를 잡지 못했다 — 저장소 메모리가 "시뮬레이터 말고 생성기를 돌려라" 로 기록해 둔 교훈이 그대로 재현됐다. ⚠ 실측 증거: core·collaboration 두 프로필 생성 **PASS**, cascade 제거 게이트 6건 → **5건**, 투영본에 `QueryCountGuardrailIntegrationTest.java` 실재 확인. | [계측 가드레일](../../business-app/src/test/java/nuri/business/harness/QueryCountGuardrailIntegrationTest.java), [주소록 상한](../../business-app/src/test/java/nuri/business/service/addressbook/AddressBookQueryCountIntegrationTest.java), [pack manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [GAP-PACK-001](../../.agent/memory/known-gaps.md) | 2026-09-13 | - |

## DEC-OPS-085

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-085 | accepted | **RBAC 매트릭스를 pack 경계로 두 클래스로 가른다**(GAP-PACK-001 ④ 둘째 배치). `RbacAuthorizationMatrixTest` 는 모든 프로필에 남는 표면만 본다 — 사용자 관리·로그인 정책, 익명 접근, 미등록 라우트, 그룹 이름과 실제 권한의 분리. demo 소유 표면(통계·배너/팝업·약식결재·**설문·투표**)은 신설 `RbacDemoSurfaceAuthorizationMatrixTest` 가 가져가며 `ReportStatsService` `@MockitoBean` 을 함께 들고 간다. 두 클래스는 **서로 다른 H2 DB 이름**을 쓴다(`rbac_core_testdb` / `rbac_demo_testdb`). | ⚠ **매트릭스 전체를 지우던 것은 `@MockitoBean` 한 줄이었다** — 투영은 타입 참조로 연쇄 제거를 판정하므로 `nuri.business.service.stats.ReportStatsService` 선언 하나 때문에 core·collaboration 에 **RBAC 게이트가 하나도 남지 않았다**. ⚠ **설문·투표 단언을 demo 클래스에 함께 둔 것이 설계의 핵심이다** — 그 단언들은 URL 문자열만 쓰므로 자체로는 어떤 타입도 참조하지 않는다. 따로 "survey 클래스" 로 빼면 엔드포인트가 없는 프로필에 **살아남아 404 로 죽는다**(cascade 는 문자열을 보지 않는다). 프로필 구성상 survey pack 은 demo 프로필에만 들어가므로(core=[core] · collaboration=[core,collaboration] · demo=[core,collaboration,survey,demo]) stats 참조에 묶어 함께 제거되는 것이 정확하다. ⚠ **H2 DB 이름 분리는 선택이 아니다** — 같은 이름에 `create-drop` + `@DirtiesContext` 면 컨텍스트 축출 순서에 따라 앞 클래스가 스키마를 지운 뒤 다른 클래스가 그 DB 를 만나 42S02 로 죽는다(저장소 실측 이력). ⚠ 실측 증거: 격리 postgres + **실제 생성기**로 core·collaboration 두 프로필 **PASS**, 제거 목록에 `RbacDemoSurfaceAuthorizationMatrixTest`(stats 참조)만 오르고 투영본에 `RbacAuthorizationMatrixTest.java` **실재 확인**. | [core 매트릭스](../../api-server/src/test/java/nuri/security/RbacAuthorizationMatrixTest.java), [demo 표면 매트릭스](../../api-server/src/test/java/nuri/security/RbacDemoSurfaceAuthorizationMatrixTest.java), [pack manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [GAP-PACK-001](../../.agent/memory/known-gaps.md) | 2026-09-13 | - |

## DEC-OPS-086

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-086 | accepted | **런타임 의존성 두 축의 동작을 계약으로 고정하고, 그 계약으로 dependabot major 2건을 판정한다.** ① `html-sanitization-contract` 신설 — `DOMPurify.sanitize` 가 `dangerouslySetInnerHTML` 두 곳(게시글 본문·정책 문서)의 **유일한 방어선**인데 그 동작을 고정하는 테스트가 저장소 전체에 0건이었다. 에디터가 실제로 만드는 태그(`strong`·`em`·`code`·목록·`a[href]`)의 무손실 통과와 스크립트 실행 경로(`<script>`·인라인 핸들러·`javascript:`) 차단을 실측 기준선으로 고정한다. 인라인 `style` 통과 여부는 `standard-editor` 주석이 "확인 전" 으로 남긴 항목이라 실측값(통과)을 함께 기록했다. ② `calendar-classnames-contract` 신설 — "키가 선언돼 있다" 가 아니라 **"그 클래스가 DOM 에 실제로 붙는다"** 를 단언한다(e2e 가 의존하는 `.e2e-day-button` 포함). ③ 그 계약으로 dependabot 7건(#618~#624)을 **한 배치**로 승급했다 — isomorphic-dompurify 3.20→4.2, react-day-picker 9.13→10.0 포함. 직렬 병합은 strict up-to-date 때문에 CI 7회이므로 묶는다. | ⚠ **두 라이브러리 모두 조용히 깨지는 축이다.** DOMPurify 는 기본 정책이 엄격해지면 사용자가 저장한 본문이 화면에서 깎이고 느슨해지면 방어선이 내려가는데 **어느 쪽도 오류를 내지 않는다**. 게다가 `standard-editor` 가 자기 허용 범위를 "DOMPurify 기본 정책이 통과시키는 것" 으로 정의해(주석) 라이브러리 기본값에 암묵적으로 묶여 있었다. react-day-picker 는 **모르는 classNames 키를 조용히 무시**하므로, 메이저가 어휘를 바꾸면 우리 클래스가 어디에도 붙지 않은 채 달력이 무스타일로 렌더되는데 **타입 검사도 빌드도 통과한다**(`classNames` 가 느슨한 레코드). 그 라이브러리는 이미 v8→v9 에서 어휘를 전면 개명한 이력이 있다. ⚠ **계약이 곧바로 값을 냈다** — 두 major 가 계약을 모두 통과해 "타입이 통과하니 괜찮아 보인다" 가 아니라 실행으로 판정할 수 있었다. ⚠ 승급 과정에서 **게이트 2개가 의도대로 red 를 냈다**: (가) react-day-picker v10 이 `initialFocus` 를 제거해 호출부 3곳이 tsc red — v9 가 이미 `@deprecated ... Use autoFocus instead` 로 표시했고 v10 의 `autoFocus` 가 같은 의미라 이행했다(승급과 무관하게 정당한 수정). (나) required-check manifest 의 CodeQL action SHA **exact 고정**(ADR-0015)이 #619 의 SHA 승급을 막아 계약 3건이 red — action 이 조용히 바뀌어 SAST 게이트 의미가 달라지는 것을 막는 설계대로다. manifest 를 같은 커밋에서 갱신해 diff 에 의도를 남겼고, `CODEQL_ACTION_DIFF_INFORMED_QUERIES: 'false'` 고정과 그 red 증명은 무변경이라 ADR 본문은 소급 편집하지 않았다. ⚠ 부수 실측: sonner 2.0.8 도 패키지 전체에 `nonce` **0건**이라 GAP-FE-001 의 재개 조건은 그대로다. 검증: tsc clean · lint 136/0(상한 138) · vitest 2802/2802 · operational-contracts 625/625 · next build 성공 · Atlas 2회 재생성(`package.json`·`required-checks.json` 연쇄). red 증명: 래퍼의 `day_button` 키를 `dayButton` 으로 개명하면 달력 계약이 red. ⚠ **PR CI 가 로컬 검증의 빈칸 둘을 드러냈다.** (가) 배치 직후 undici 권고 5건이 게시돼 shadcn 4.21.0 이 들여온 `undici@7.28.0` 이 audit·dependency review 를 막았고, 기존 7.x override 를 7.29.0 으로 재상향했다(권고가 움직여 override 가 낡는 사례). (나) 위 검증은 `next build` 까지만 돌리고 **`bundle:check` 를 돌리지 않았다** — audit 이 먼저 실패해 CI 도 build 단계를 건너뛰었으므로 두 겹으로 가려졌다. zod 4.6.2 가 core 에 JIT 컴파일러(`compile.js`) 등을 더해 단일 청크를 152,335B 로 키웠고(예산 150,000B), zod 만 4.4.3 으로 되돌린 동일 빌드가 132,691B 로 원인을 격리했다. 예산을 올리지 않고 **zod 를 `~4.4.3` 으로 고정해 배치에서 제외**했다(4.5+ 기능 소비 없음, 경위는 예산 스크립트 주석). | [살균 계약](../../frontend/src/__tests__/html-sanitization-contract.test.ts), [달력 계약](../../frontend/src/components/ui/__tests__/calendar-classnames-contract.test.tsx), [Calendar 래퍼](../../frontend/src/components/ui/calendar.tsx), [required-check manifest](../../.github/required-checks.json), [ADR-0015](../02-architecture/decisions/ADR-0015-secure-coding-ci.md) | 2026-09-13 | - |

## DEC-OPS-087

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-087 | accepted | **조용히 실패하던 세 경로를 계약으로 닫는다**(2026-09-13 잔여 작업 조사 권장 순서 2단계). ① **운영 compose 환경변수 전달의 양방향 정합** — `deploy-env-forwarding-contract` 를 신설한다. 앱이 읽는 변수(`application.yml`·`application-prod.yml`·`globals.properties` 의 `${UPPER}`(중첩 포함), 백엔드 `@Value`, placeholder 없이 완화 바인딩으로만 소비하는 선언 목록)와 프런트 서버 런타임 `process.env.X`(빌드 인라인 `NEXT_PUBLIC_*` 제외)는 compose 로 전달되거나 사유와 함께 비전달로 선언돼야 하고, 반대로 앱이 읽지 않는 전달도 red 다. 전달 형태는 **값 없는 `VAR:`** 로 두며, 미설정 시 빈 문자열이 되는 형태(`${VAR}`·`$VAR`·`${VAR:-}`·`${VAR-}`·`${VAR:=}`·`""`·`- VAR=`)는 앱 기본값이 전부 빈 값이 아닌 한 red, 오버레이의 null 재선언(`VAR:`·`~`·`null`)으로 base 값을 지우는 것도 red 다. `ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE` 는 운영 오버레이에 나타나면 red 다(ADR-0010). 누락 20건(api 17·프런트 3)과 완화 바인딩 인증 릴레이 자격 2건을 전달하고, `BACKEND_ACTUATOR_URL` 은 현재 호출 경로에서 읽히지 않고 운영 actuator 404 가 W1-12 의 의도라 비전달로 선언한다. 새로 흐르는 `SPRING_MAIL_PASSWORD` 를 `SecretLiteralLinterTest` 보호 이름에 추가한다(13→14, 포함 목록 확장). ② **KRDS 매핑·화면 용어 계약의 review 기한을 실시간 시계에 결속**한다(DEC-OPS-027 ③ 과 같은 방식, 60일 전 경고). ③ **로그인 정책 시간창 판정의 시계를 주입 가능하게** 하고(기본 Asia/Seoul), 시계에 의존하던 시간창 테스트 11건(`assumeTrue` 8·상대 창 3)을 고정 시계로 바꾼다. 경계 포함·자정 넘김 바깥 판정 2건을 보강하고, 'HHmm' 차단 테스트는 형식 오류와 구분되도록 메시지까지 단언한다. | ① compose 는 나열된 변수만 전달하는데, DEC-OPS-045 가 보존 변수 3개(알림 2·로그 1)를 전달한 뒤에도 규칙이 없어 같은 누락이 쌓였다. 문서는 `ATTACHMENT_INTEGRITY_ENABLED` 로 첨부 점검을 끄라고 안내했지만 끌 수 없었고, `NOTIFICATION_SENDER_TEL`·`MAIL_FROM`·`CORS_ORIGIN_*`·로그인 잠금 값도 운영자가 바꿀 방법이 없었다. ⚠ 전달 형태는 docker compose v2.40 실행으로 판정했다 — `VAR: ${VAR}` 는 미설정 시 컨테이너에 `""` 로 **설정**되고, 값 없는 `VAR:` 는 변수 자체가 **없으며**, 오버레이의 값 없는 키는 base 값을 `null` 로 지운다. 단 호스트/.env 에 빈 값(`VAR=`)으로 설정하면 값 없는 형태도 `""` 를 전달하므로, 기본값을 쓰려면 줄 자체를 두지 않는다(compose 주석·getting-started 에 명시). Java 하네스가 아니라 node 계약에 둔 이유는 `secret-scan` 이 변경 범위와 무관하게 운영 계약을 항상 돌리기 때문이다 — 백엔드 하네스는 프런트만 바뀐 PR 에서 건너뛰어 새 `process.env` 를 놓친다. ⚠ 커밋 전 적대적 리뷰(리뷰어 4·검증자 4)가 초안의 사각 5건을 실측으로 드러내 이 형태가 됐다 — 원천이 두 yml 뿐이라 `OLD_ALGORITHM_KEY`·`ADMIN_INITIAL_PASSWORD`·완화 바인딩 자격 전달을 지워도 green 이었고, `${VAR}` 외의 빈 문자열 형태와 `~`/`null` 재선언을 놓쳤으며, 역방향이 없어 'exact' 가 사실이 아니었고, `BACKEND_ACTUATOR_URL` 주석은 W1-12 가 금지한 9090 연결을 권하고 있었다. 수정 후 다섯 경로 모두 실제 저장소에서 red 로 재현했다. ② 두 계약이 고정 NOW(2026-08-21)로만 검증해, config 가 선언한 "기한이 지나면 실패" 규칙이 영원히 발화하지 않았다. 결속 즉시 2026-10-31 만료 34건(KRDS 12·용어 22)이 경고로 드러났고 11/01 부터 red 가 되며, 해소는 실제 재검토 또는 사유 있는 기한 재설정이다. ③ 판정이 `LocalTime.now(Asia/Seoul)` 를 직접 불러, 필수 mutation 게이트(business-core-auth)가 실행하는 테스트 집합이 CI 실행 시각에 따라 달라졌다. 실측: 수정 전 코드를 KST 19:04 에 돌리자 'HHmm' 차단 테스트 1건이 **skip** 됐다(36건 중 1건). 수정 후 38건·skip 0, PIT(LoginPolicyManageService) 46개 중 44개 사멸(잔존 2건은 IP 정규화). red 증명: compose 의 `MAIL_FROM:` 삭제 → 계약 red / config 기한 하나를 2026-09-01 로 → 고정 시계 테스트는 통과·실시간 테스트만 red(두 계약 각각) / `${SPRING_MAIL_PASSWORD:-리터럴}` → SecretLiteralLinterTest red / 변환 조건 반전 → 'HHmm' 차단 테스트 포함 11건 red. | [전달 계약](../../scripts/deploy-env-forwarding-contract.mjs), [계약 테스트](../../scripts/deploy-env-forwarding-contract.test.mjs), [docker-compose.prod.yml](../../docker-compose.prod.yml), [KRDS 계약](../../scripts/krds-profile-mapping-contract.test.mjs), [용어 계약](../../scripts/frontend-visible-terms-contract.test.mjs), [SecretLiteralLinterTest](../../api-server/src/test/java/nuri/api/harness/SecretLiteralLinterTest.java), [LoginPolicyManageService](../../business-core/src/main/java/nuri/business/service/login/LoginPolicyManageService.java) | 2026-09-13 | - |

## DEC-OPS-088

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-088 | accepted | **모든 프로필에 남는 화면이 빠진 pack 을 부르거나 가리키지 않게 한다**(GAP-PACK-001 ②·③). ① **공용 수신자 피커는 주소록 구현을 import 하지 않고 주입받는다** — pack 중립 계약 `src/types/recipient-address-book.ts` 를 두고, demo 소유 어댑터가 `AddressbookUserService` 를 감싸며, 조합 지점(메일·문자)만 `reusable-base:demo` 블록 안에서 넘긴다. 주소록 탭은 주입되고 채널이 알림이 아닐 때만 보인다. 메일 입력 안내의 출처 문구도 같은 마커로 조립한다. ② **마커는 링크만이 아니라 그 구역의 import·지역 선언·데이터 조회까지 같은 pack 블록(여러 개 가능)에 둔다** — 업무 홈의 대시보드 조회·게시판·실시간 구역과 "오늘 처리할 업무" 부제는 collaboration, 결재 버튼·대기 건수는 demo 블록이며, 두 그리드는 항목 수로 열을 정해 블록이 빠진 프로필에 빈 열을 남기지 않는다. 업무 홈 `page.tsx` 는 props 객체로 조립해 속성 목록 안에 마커를 두지 않았다(메일·문자 화면은 속성 위치 마커를 쓴다). 데이터 로더 `dashboard-data.ts` 와 `RealTimeDashboard.tsx` 를 collaboration `removePaths` 에 선언한다(라우트가 아닌 모듈, header-notifications 선례). ③ 협업 허브 주소록 버튼(demo)과 명령 센터 협업 바로가기(collaboration)를 감싸고, 기존 마커가 남긴 import 3건(footer `Link`·header `Info`·error `MessageSquare`)을 같은 블록으로 옮긴다. ④ 가이드 §3.7 에 마커 작성 규칙을 둔다 — 구역 전체 감싸기, 줄 단위·중첩 금지, 설명 주석에 마커 토큰 금지, **주석에 제거 모듈 import 인용 금지**(생성기는 원문에 import 정규식을 적용한다), rank 하향 의존만 허용, 공용 컴포넌트는 주입, cascade 로 잘못 사라진 대상의 링크는 가리지 말고 원인 수리, 판정은 투영 tsc. ⑤ main CI 방어선: 도달성 census 테스트가 피커·주입 계약과 소비 화면 파일 8개(총 10개)의 collaboration 생존을 고정하고, **생성기가 export 한 마커 투영·import 판정 함수 자체**로 그 파일들의 원문(주석 포함, `@/`·상대 경로)에 collaboration 제외 pack 참조가 0 인지 본다. | **실제 생성기로 기준과 변경을 짝지어 실측했다**(격리 postgres 17 컨테이너, 포트 비공개, main `2b4fae3f5` ↔ 변경 `70869c533`, 리뷰 반영 후 `9e9c4e11a` 재생성). 기준: collaboration 에서 피커와 쪽지·메일 발송·문자·알림 센터 라우트가 **모두 없었고**, core·collaboration 투영 `tsc --noEmit` 이 **TS6133 3건으로 red** 였으며, core 의 로그인 착지 `/` 는 게시판 DTO 와 함께 투영에서 제거되는 `/api/v1/dashboard` 호출 코드를 들고 있었다(런타임 실행은 하지 않았다). 변경 후: 세 프로필 모두 PASS·제거 게이트 불변(core·collaboration 47·demo 42), collaboration 에서 피커 1개와 라우트 4개 생존(프런트 제거 262→250), core 350→354(대시보드 모듈 2와 그 테스트 2, demo 어댑터 2 추가 제거 − 피커·피커 테스트 2 생존), 투영 tsc core·collaboration·demo **모두 0건**. ⚠ 출처 정정: "현재 알려진 링크는 닫혔다" 는 DEC-OPS-083 이 아니라 **GAP-PACK-001 행이 2026-09-12 에 쓴 서술**이며 사실이 아니었다 — DEC-OPS-083 ③ 은 링크만 감싸 import 를 남겼고, 투영 tsc 는 CI 에 없어 그 red 가 조용했다. ⚠ 계획 단계 비평이 세 결함을 사전에 막았고(명령 센터 `Zap` 중복 선언, 주석 속 import 인용이 census 는 통과·생성기만 cascade, collaboration 에서 없는 주소록을 약속하는 안내), **구현 후 적대적 리뷰(리뷰어 3·검증자 3)** 가 네 가지를 더 드러내 같은 PR 에서 고쳤다 — 원문 가드가 `@/` 만 봐 상대 경로 인용과 다른 생존 파일을 놓침(→ 생성기 함수 export 재사용), 안내 문구 테스트가 축소 프로필에서 정확한 값을 단언하지 않음, core 홈이 목록 없이 "오늘 처리할 업무" 를 말함, 가이드가 코드 관찰을 런타임 실측으로 적음. 투영본 vitest 는 중첩 node_modules 의 vitest 시작 오류(`#module-evaluator` 해석 실패)로 실행하지 못했다 — 판정은 투영 tsc 와 파일 수준 확인이다. red 증명: 피커 탭 조건 제거·조합 지점 주입 줄 제거·피커에 demo import 재주입(실제·주석만)·중립 타입 모듈 주석에 상대 경로 인용 각각 해당 테스트 red. 남은 ③(B)(C)(D)·게이트 부재·④ 는 GAP-PACK-001. | [RecipientPicker](../../frontend/src/app/components/ui/recipient-picker.tsx), [주입 계약](../../frontend/src/types/recipient-address-book.ts), [업무 홈](../../frontend/src/app/UnifiedDashboardClient.tsx), [pack manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [생성기 투영 함수](../../scripts/generate-reusable-base-source.mjs), [도달성 census 테스트](../../scripts/frontend-reachability-census.test.mjs), [마커 작성 규칙](../03-guides/reusable-base-guide.md#37-프런트-pack-마커-작성-규칙), [GAP-PACK-001](../../.agent/memory/known-gaps.md) | 2026-09-13 | - |

## DEC-OPS-089

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-089 | accepted | **개인정보 접근 census 의 판정 원장을 소스 밖으로 옮기고 항목마다 소유 pack 을 적는다**(GAP-PACK-001 ④ 셋째 배치). ① 선언 핸들러·민감 GET 예외·알려진 민감 응답 타입을 `config/governance/privacy-access-census.json` 으로 옮기고, 핸들러는 **`FQN#method`** 로 식별한다. 게이트 소스는 도메인 타입을 하나도 참조하지 않는다. ② 게이트는 현재 트리 pack manifest 에 남은 pack 의 항목만 기대한다. 빠진 pack 항목은 **`ClassNotFoundException` 일 때만** 부재로 인정하고, 클래스가 남아 있으면 "pack 태그가 틀렸다", 링크 오류면 "판정할 수 없다" 로 red 다. 남은 pack 의 원장 컨트롤러는 모두 요청 매핑 컴포넌트로 스캔돼야 하고, 컴포넌트 로드 실패도 경고 후 건너뛰지 않고 red 다. manifest 에 원장 어휘 밖 pack 이 생겨도 red 다. ③ 태그 정확성은 node 계약이 **생성기 `planJavaRemoval` 을 rank 누적 프로필마다 불러** 대조한다 — 항목 소스는 태그 pack 이 빠진 프로필에서만 사라져야 하고, 게이트 파일은 어떤 프로필에서도 사라지면 안 되며, 프로필마다 남는 컨트롤러가 `CONTROLLER_FLOOR` 이상이어야 하고, 실제 프로필의 Java `acknowledgedRemovedGates` 는 계획과 exact 일치해야 한다. 투영본에서는 계획 대신 "남은 pack 소스는 있고 빠진 pack 소스는 없다" 를 본다. ④ 원장은 메타 게이트 `GATE_REGISTRIES` 로, 판정 본문은 `ARCH_RULE_FILE` 의 `__sourceHash` 로 동결하고 생성기 미러를 같은 변경에서 맞췄다. gates.json harness 입력에도 등록했다. ⑤ core·collaboration 의 승인 목록에서 이 게이트를 삭제했다. | ⚠ **게이트가 지키던 것은 제외 도메인만이 아니었다.** 코어의 사용자 조회 2건과 본인 조회 예외도 이 census 가 동결하는데, 주소록 DTO 타입 참조 한 줄 때문에 core·collaboration 에서 게이트가 통째로 사라졌다. 즉 축소 프로필에서는 `ROLE_USER` 가 부르는 개인정보 표면에 감시자가 없었다. ⚠ **소유 판정을 Java 에서 다시 계산하지 않은 것이 설계의 핵심이다.** GAP 행은 "같은 패키지 중간 클래스 경유 참조까지 따라가는 고정점 계산" 을 선행 조건으로 적었는데, 그것을 게이트 안에 다시 구현하면 생성기와 어긋날 수 있는 두 번째 판정기가 생긴다. 판정은 생성기가 이미 하고 있으므로 원장은 태그만 들고, 태그가 맞는지는 생성기 함수를 그대로 부르는 계약이 CI 에서 확인한다(대시보드 컨트롤러를 core 로 적는 합성 태그가 red 인 것이 그 간접 참조 추적의 증거다). ⚠ **"없으면 건너뛴다" 로 두지 않았다.** 빠진 pack 항목을 로드 실패 전반으로 넘기면 링크 오류로 죽는 컨트롤러와 태그 오류가 조용히 통과한다. 그래서 부재의 증거를 `ClassNotFoundException` 하나로 좁혔고, 종전 스캔이 `LinkageError` 를 경고로 삼키던 경로도 함께 닫았다. ⚠ 식별자를 단순명에서 FQN 으로 바꾼 이유: 원장이 소스를 떠나면 import 가 동명 컨트롤러를 구분해 주지 않는다. ⚠ core 는 남는 요청 매핑 컨트롤러가 **정확히 30 = 하한** 이다(계약 실측). 하한을 낮추지 않았다 — 코어 컨트롤러가 하나 줄면 main CI 에서 하한 판단을 강제하는 것이 의도다. 실측 증거: 격리 postgres 와 **실제 생성기**로 core·collaboration·demo 생성 **PASS**(java 제거 434·237·0, 파일 게이트 제거 4·4·0 + migration 규칙 42), core·collaboration 투영본에서 `PrivacyAccessCensusLinterTest` 3건과 메타 게이트 green, core 전체 harnessTest 76건 중 red 19건으로 수 불변(늘어난 3건은 통과), demo 86건 green, node 계약은 저장소와 두 투영본에서 8/8. red 증명: 원장에서 SMS 수신자 조회 항목 삭제 → 게이트가 신규 부착으로 red, core 투영본에서 사용자 조회를 demo 로 적기 → "pack 태그가 틀렸습니다" red, 계약의 합성 오태그 4종과 없는 타입·주석 속 제외 도메인 import 인용(대조군 포함) 전부 red, 가짜 resolver 5경우(red 3·대조군 2)와 원장 형식 오류 7종 red. | [원장](../../config/governance/privacy-access-census.json), [게이트](../../api-server/src/test/java/nuri/api/harness/PrivacyAccessCensusLinterTest.java), [태그 계약](../../scripts/privacy-access-census-contract.test.mjs), [메타 게이트](../../api-server/src/test/java/nuri/api/harness/HarnessBaselineIntegrityTest.java), [생성기](../../scripts/generate-reusable-base-source.mjs), [pack manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [가이드 §3.6](../03-guides/reusable-base-guide.md#36-제거되는-거버넌스-게이트와-승인), [GAP-PACK-001](../../.agent/memory/known-gaps.md) | 2026-09-13 | - |

## DEC-OPS-090

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-090 | accepted | **남은 횡단 게이트 둘을 원장 방식으로 되살리고, 생성기의 Java 의존 판정을 코드 기준으로 고친다**(GAP-PACK-001 ④ 마지막 배치). ① 생성기 `importedJavaTypes` 가 주석·문자열·텍스트 블록을 지운 코드에서 import 를 읽는다. 텍스트 블록(`"""`)은 리터럴 제거 경로에서만 따로 인식한다 — 공용 `skipJavaLiteral` 은 메타 게이트 해시용 주석 제거와 같아야 해서 건드리지 않았다. 와일드카드 import(`import a.b.*;`)의 단순명도 같은 패키지처럼 본다. ② `CrossDomainCouplingLinterTest` 의 app→app·app→core **개수 동결**을 `config/governance/cross-domain-coupling-census.json` 의 **edge 정확 집합**(소유 파일·소유 도메인·대상 도메인·대상 모듈·참조 타입 FQN, 38건)으로 바꾼다. 스캔 red-proof 는 저장소 파일 대신 임시 픽스처를 쓴다. ③ `InputContractMirrorLinterTest` 의 길이·enum·중첩·필수·응답 전용 필수·읽기 전용·달력 날짜 표적을 `config/governance/input-contract-mirror-census.json` 으로 옮긴다. 타입은 이진 이름(`$`)이고 필수 제약은 닫힌 어휘(NotBlank·NotNull·NotEmpty)와 정렬된 그룹 이름이다. `MIN_*` 하한은 원장 **전체**에 적용한다. business-core 권한·사용자 DTO 를 직접 쓰는 검증기 테스트 둘은 유지한다. ④ 두 게이트 모두 남은 pack 항목만 기대하고, 빠진 pack 항목은 **실제로 없을 때만** 뺀다(타입 표적은 참조 타입 중 하나의 `ClassNotFoundException`, edge 는 소스 파일 중 하나의 부재). 전부 남아 있으면 태그 오류, 링크 오류는 판정 불가라 red 다. 판정은 각 게이트 파일 안에 두어 `__sourceHash` 가 덮는다. ⑤ node 계약을 공용 판정 `scripts/pack-tagged-registry.mjs` 로 묶는다 — 개인정보·결합·입력 계약 원장 계약 셋과 공용 계약 `pack-tagged-registry.test.mjs`(게이트 파일 생존·Java 승인 exact·생성기 인용 무시의 양방향 증명·투영 모드 위장 차단). 태그는 **항목이 참조하는 소스가 모두** 살아남는 가장 작은 rank 누적 프로필이다. ⑥ 두 원장을 `GATE_REGISTRIES`·gates.json harness 입력에, 결합 게이트를 `ARCH_RULE_FILE` 에 넣고 생성기 미러를 맞췄다. 공용 메모리 계약은 결합 수를 원장에서 센다. core·collaboration 승인 목록에서 두 게이트를 뺐다. | ⚠ **결합 게이트는 도메인 참조 때문이 아니라 생성기의 원문 import 판정 때문에 지워지고 있었다** — red-proof 텍스트 블록 속 `import …;` 한 줄이었다. 판정을 코드 기준으로 바꾸기 전에 수정 전후의 제거 계획을 rank 누적 프로필마다 비교했고, 차이는 그 게이트 하나였다(그 뒤 red-proof 도 가상 타입 픽스처로 다시 써서 최종 트리에서는 종전 생성기로도 게이트가 남는다 — 생성기 수정은 재발 방지이고 양방향 픽스처 계약이 지킨다). 1,335개 Java 파일에서 원문과 코드 기준 import 판정을 대조해 실제 import 손실이 0 인 것도 적대적 검증이 확인했다. ⚠ **되살리기만 하면 축소 프로필에서 거짓 red 가 된다** — 전체 제품 기준 개수(4·34)는 core 에서 0, collaboration 에서 app→app 1·app→core 12 가 된다. 그래서 개수를 pack 태그가 붙은 edge 목록으로 바꿨고, 결과는 개수보다 **엄격하다**(edge 하나가 사라지고 다른 edge 가 생기는 교체도 red). ⚠ 설계는 구현 전에 비평 4관점과 지적별 반증 검증을 거쳤고, 확인된 지적을 모두 반영했다. (가) 생성기 수정이 기존 red-proof("주석 속 import 인용이 게이트를 지운다")를 뒤집어 CI 를 깨므로, 삭제하지 않고 **인용은 무해·실제 import·코드 FQN·와일드카드·텍스트 블록 뒤 코드는 제거**의 양방향 증명으로 바꿨다. (나) 새 판정 분기는 전체 저장소(모든 pack 존재)에서 실행되지 않으므로 Java 부정 테스트를 가짜 resolver·파일 존재 술어로 넣었다. survey 와 demo 태그는 실제 프로필로 구분되지 않아 합성 프로필 red-proof 를 필수로 넣었다. (다) 투영 모드를 manifest 필드 하나로 켜 계획 대조를 끄는 경로를 **생성기 투영 구조 검사**로 막았다. (라) 스캐너는 문자열 속 FQN 도 edge 로 세지만 생성기는 의존으로 보지 않으므로 edge 태그에 참조 타입 소스까지 넣었다. 진행 중 제 픽스처 오류도 하나 드러났다 — `\""""` 는 Java 에서 텍스트 블록을 **닫으므로** 뒤 줄이 실제 코드가 되고, 생성기가 게이트를 지운 것이 옳았다. 증거: 격리 postgres 와 **실제 생성기**로 core·collaboration·demo 생성 PASS(java 제거 432·235·0, 파일 게이트 제거 2·2·0 + migration 규칙 42). core·collaboration 투영본에서 입력 계약 10·결합 4·개인정보 3·메타 게이트·파일 접근 계약 전부 green. core 전체 harnessTest 90건 중 red 19건으로 수 불변, demo 90건 green. 저장소 harnessTest 90/90, 운영 계약 672건(Atlas 재생성 전 Atlas 1건만 red). 태그 계약은 저장소와 두 투영본에서 22/22. red 증명: 저장소에서 입력 계약 원장 필드 하나 삭제 → 하한 red, 결합 원장 edge 하나 삭제 → 원장에 없는 edge red. core 투영본에서 demo 배너 표적을 core 로 → "남은 pack 표적인데 클래스가 없다" red, collaboration SMS edge 를 core 로 → 사라진 edge red. 계약의 합성 오태그(survey→demo 포함)·문자열 전용 edge·없는 소유 파일 red. Java 부정 테스트 결합 2·입력 계약 2(가짜 resolver 5경우·형식 오류). 커밋 전 적대적 diff 검토(3관점·지적별 반증)가 결함 셋을 더 잡아 고쳤다 — 결합 edge 의 소스 경로를 두 모듈 모두로 잡아 "태그 오류" 판정이 한 번도 발화할 수 없던 것(부정 테스트가 합성 술어로 가렸다 — 실제 파일 집합 술어로 바꾸고 옛 방식 되돌림 red 확인), 필수 binding 없는 응답 전용 필드를 받아 두고 검사하지 않던 파싱 구멍, 게이트 파일이 개명돼 모집단에 없어도 생존 검사가 통과하던 것. | [결합 원장](../../config/governance/cross-domain-coupling-census.json), [입력 계약 원장](../../config/governance/input-contract-mirror-census.json), [결합 게이트](../../api-server/src/test/java/nuri/api/harness/CrossDomainCouplingLinterTest.java), [입력 계약 게이트](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java), [공용 판정](../../scripts/pack-tagged-registry.mjs), [공용 계약](../../scripts/pack-tagged-registry.test.mjs), [생성기](../../scripts/generate-reusable-base-source.mjs), [가이드 §3.6](../03-guides/reusable-base-guide.md#36-제거되는-거버넌스-게이트와-승인), [GAP-PACK-001](../../.agent/memory/known-gaps.md) | 2026-09-14 | - |

## DEC-OPS-091

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-091 | accepted | **인증 세션 경계 3건을 닫는다.** ① 본인 비밀번호 변경과 관리자 초기화가 refresh token을 폐기하고, 화면은 본인 변경 성공 시 재로그인을 안내한 뒤 로그아웃한다. ② 새 로그인 ID가 기존 사용자의 esntlId와 같으면 일반 중복과 같은 오류로 거부한다(관리자 등록·가입 공통). ③ 인증 실패 응답 메시지를 사유와 무관하게 하나로 두고 사유는 서버 로그에만 남긴다. 이미 발급된 access token은 서명 기반이라 자기 만료(기본 1시간)까지 유효한 잔여 위험으로 남긴다. | 2026-09-14 프로젝트 평가 뒤 보완 계획 1단계(사용자 지시 "보완계획 순서대로 진행"). 실측: 비밀번호를 바꿔도 refresh token이 최대 7일 재발급을 허용했다. 관리자 등록 ID 규칙(영문·숫자·밑줄 4~20자)이 초기 관리자 식별자 `USRCNFRM_00000000001`을 통과시키고, 인증 어댑터가 token subject(esntlId)를 로그인 ID로 먼저 찾아 다른 계정으로 해석될 수 있었다. 인증 제공자가 비밀번호 확인 전에 계정 상태를 검사하고 예외 메시지가 응답에 실려 API 직접 호출로 잠김·비활성을 구분할 수 있었다. 검사 순서는 바꾸지 않았다 — 비밀번호가 맞을 때만 잠김을 알리면 잠긴 동안 비밀번호 정답 여부를 알려 주는 판정기가 된다. 브라우저 BFF는 이미 4xx를 같은 문구로 바꾸고 있었다. red 증명: 세 수정을 되돌리면 새·보강 테스트 5건만 실패한다. 같은 계획의 요청 제한 설정화는 [GAP-SEC-004](../../.agent/memory/known-gaps.md)가 선행이라 착수하지 않았다. | [UserService](../../business-core/src/main/java/nuri/business/service/user/UserService.java), [GlobalExceptionHandler](../../foundation/src/main/java/nuri/foundation/core/exception/GlobalExceptionHandler.java), [헤더 계약](../../frontend/src/app/components/layout/__tests__/header-profile-edit.test.tsx) | 2026-09-14 | - |

## DEC-OPS-092

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-092 | accepted | **데이터 무결성 경계 3건을 닫는다.** ① 시스템 감사 로그 대표 12행을 운영 마이그레이션 경로의 `R__seed_demo.sql`에서 개발·E2E 전용 `db/seed-dev`로 옮긴다. 앱이 하드코딩한 게시판 마스터는 운영에도 필요해 남긴다. `SeedLocationLinterTest`가 운영 경로 `.sql`의 로그 테이블(`tb_*_log`) INSERT를 예외 없이 0건으로 막고, seed-dev 양성 대조군으로 정규식의 생존을 확인한다. 이미 운영 DB에 들어간 행의 삭제는 코어 데이터 변경이라 포함하지 않는다. ② 게시글 수정·첨부 포함 수정·삭제가 URL의 게시판과 글의 실제 게시판을 대조해 다르면 없는 글로 처리하고, 첨부 포함 수정에 빠져 있던 커뮤니티 회원 가드를 둔다. 가드는 글 조회보다 먼저 둔다. ③ 수신자 필드가 없는 쪽지를 저장 전에 입력 오류로 거부한다. | 보완 계획 2단계(사용자 지시 "보완계획 순서대로 진행"). 실측: 데모 시드가 존재하지 않는 요청을 운영 감사 로그에 기록하고 있었고, 파일 주석은 이를 "별건"으로만 남겼다. 게시글 수정·삭제는 커뮤니티 가드를 URL의 게시판 ID로 판정하면서 글은 번호로만 읽어, 커뮤니티 글을 일반 게시판 ID로 요청하면 가드를 건너뛸 수 있었다. 상세 조회는 이미 (게시판, 글번호) 쌍으로 읽어 불일치를 404로 처리하므로 같은 의미로 맞췄다. 가드를 조회 뒤로 옮기지 않은 이유는 비회원이 404/403 차이로 글의 존재를 알 수 있기 때문이다. 쪽지는 공백 수신자만 거부하고 필드 부재는 파싱을 건너뛰어 200으로 저장했다(기존 테스트 이름은 NULL 거부를 표방했다). 첨부 소유권 순서 린터의 대조 토큰을 새 호출 형태 `findOwnedPost(bbsId, pstSn)`로 맞추고 매니페스트 2줄(해당 소스 해시·새 상수)을 등재했다. red 증명: 세 수정을 되돌리고 운영 시드에 로그 INSERT를 주입하면 새 테스트 4건이 실패하고, seed-dev 시드를 치우면 양성 대조군이 실패한다. | [R__seed_dev_audit_logs](../../api-server/src/main/resources/db/seed-dev/R__seed_dev_audit_logs.sql), [SeedLocationLinterTest](../../api-server/src/test/java/nuri/api/harness/SeedLocationLinterTest.java), [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [커뮤니티 접근 계약](../../business-app/src/test/java/nuri/business/service/board/BoardCommunityAccessTest.java), [NoteService](../../business-app/src/main/java/nuri/business/service/note/NoteService.java) | 2026-09-14 | - |

## DEC-OPS-093

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-093 | accepted | **부하 테스트는 정확성과 지연을 따로 판정한다.** 모든 체크 통과(`checks: ['rate==1']`)를 요구하는 시나리오의 `check()`는 상태·응답 계약만 보고, 지연은 요청에 `endpoint` 태그를 달아 `http_req_duration{endpoint:…}`의 p95 임계로 판정한다. 주간 워크플로의 `load-levels.js`는 login 500·dashboard 800·users-list 600·create-post 1000ms를 태그 임계로 옮겼다. 계약이 rate==1 시나리오의 요청별 지연 체크 재유입과 태그 임계 누락을 막는다. | 보완 계획 3단계. 2026-09-13 주간 부하 테스트가 오류율 0%·p95 236ms였는데도 느린 요청 17건(체크 29,821건 중)이 체크 통과율을 99.94%로 떨어뜨려 실패했다. 신호가 성능 회귀가 아니라 공유 러너의 꼬리 지연에 반응했다. 지연 기대치는 같은 값으로 유지해 기준을 완화하지 않았다. k6 v1.7.1로 태그 임계가 판정 항목으로 해석되는 것을 실행해 확인했다. red 증명: 지연 체크 재유입·태그 임계 삭제가 각각 계약을 실패시킨다. 실행되지 않는 `login-test.js`는 범위에서 뺐다. | [load-levels](../../test/load-tests/scenarios/load-levels.js), [부하 응답 계약](../../scripts/load-test-response-contract.test.mjs) | 2026-09-14 | - |

## DEC-OPS-094

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-094 | accepted | **비밀번호가 바뀌기 전에 발급된 access token을 거부한다.** 인증 어댑터가 `chgPswdLastDt`를 인증 주체의 `credentialsChangedAt`으로 싣고, `JwtTokenProvider.getAuthentication`은 토큰 발급 시각이 그 시각(초 단위 내림)보다 이르면 401로 거부한다. 같은 초에 발급된 토큰은 통과시키고, 변경 시각이 있는데 발급 시각이 없는 토큰은 거부한다. 로그인 중 해시 업그레이드는 `User.rehashPassword`로 분리해 변경 시각을 바꾸지 않는다. | 개선 계획 단계 2. DEC-OPS-091은 refresh token만 폐기해 탈취된 access token이 비밀번호 변경 뒤에도 만료(기본 1시간)까지 쓰였다. 사용자 정보는 요청마다 저장소에서 다시 읽으므로 추가 조회가 없다. 해시 업그레이드가 `updatePassword`를 불러 변경 시각을 갱신하던 것을 그대로 두면, 비밀번호를 바꾸지 않은 사용자의 다른 기기 세션이 끊긴다. SAST-FP-001·002·008의 보완 소스(`JwtTokenProvider`·`JpaUserAuthAdapter`)를 재검토해 거부 조건이 늘었을 뿐 근거가 완화되지 않았음을 기록하고 해시를 재결속했다. red 증명: 비교·매핑·재해시 분리를 각각 되돌리면 테스트 4건이 실패한다. foundation-jwt 뮤테이션 94%. | [JwtTokenProvider](../../foundation/src/main/java/nuri/foundation/security/jwt/JwtTokenProvider.java), [JpaUserAuthAdapter](../../business-core/src/main/java/nuri/business/security/iam/JpaUserAuthAdapter.java), [User](../../business-core/src/main/java/nuri/business/domain/user/entity/User.java) | 2026-09-14 | DEC-OPS-091의 "access token은 만료까지 유효" 잔여 위험 서술만 종료 |

## DEC-OPS-095

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-095 | accepted | **결재자 지정과 응답이 있는 설문·투표 항목 삭제에 도메인 규칙을 둔다.** ① 결재 상신·수정은 결재자가 신청자 본인이면 거부하고, 존재하지 않거나 비활성(`userSttsCd≠P`)이면 같은 문구로 거부한다. ② 응답이 있는 설문 문항·선택 항목과 투표가 있는 투표 항목은 409(`RESOURCE_IN_USE`)로 삭제를 막고 건수를 밝힌다. 응답이 없으면 종전 선정리 경로를 그대로 쓰며, 설문·투표 전체 삭제는 명시적 행위라 바꾸지 않는다. | 2026-09-14 재평가의 우선순위 1(사용자 지시 "우선순위대로 계속진행"). 실측: 결재 서비스가 결재자 식별자를 검증 없이 저장해 신청자가 스스로 승인할 수 있었고, 없거나 비활성인 사용자에게 올린 결재는 처리할 사람이 없어 대기로 남았다. 설문 문항·항목과 투표 항목 삭제는 V2_13이 FK 오류를 피하려 넣은 선정리 때문에 모은 응답·투표를 경고 없이 지웠다 — 템플릿 변경이 문항·응답자가 있으면 막히는 기존 기준과 어긋났다. 결재 서비스의 사용자 저장소 참조(app→core)를 결합 원장에 등재하고 GAP-ARCH-001 수를 34→35로 갱신했다. 화면은 두 거부 모두 서버 문구를 그대로 보여 준다. red 증명: 네 규칙을 되돌리면 새 테스트 7건만 실패한다. | [InformalSanctionService](../../business-app/src/main/java/nuri/business/service/informalsanction/InformalSanctionService.java), [SurveyService](../../business-app/src/main/java/nuri/business/service/survey/SurveyService.java), [OnlinePollService](../../business-app/src/main/java/nuri/business/service/survey/OnlinePollService.java), [결합 원장](../../config/governance/cross-domain-coupling-census.json) | 2026-09-14 | - |

## DEC-OPS-096

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-096 | accepted | **관측성 기본값을 템플릿에 둔다.** 수집·보존 스택(PD-OPS-001)은 여전히 인수처 결정으로 남긴다. ① 요청 제한 필터가 429 거절을 `security.ratelimit.rejected{bucket=login\|all}` 카운터로 올린다. 레지스트리는 `ObjectProvider` 로 선택 주입한다. ② 운영 콘솔 로그는 텍스트를 기본으로 두고, `json-logs` 프로파일을 prod 와 함께 켜면 ECS JSON 으로 바뀐다. ③ `config/observability/prometheus-alert-rules.yml` 에 429 지속·로그인 401 급증 경보 예시를 둔다. 경보가 참조하는 메트릭·라벨·라벨 값은 `observability-alert-rules` 계약이 원천 코드와 테스트에 대조한다. | 2026-09-14 재평가의 우선순위 2(사용자 지시 "우선순위대로 계속진행"). 실측: 필터가 `HIGHEST_PRECEDENCE` 라 429 는 `http.server.requests` 에 잡히지 않아 로그 말고는 추세를 볼 신호가 없었다. 종전 주석이 메트릭을 미룬 이유는 필수 주입이 필터 생성을 깨는 위험이었고, 선택 주입이 그 위험 없이 해결한다. ⚠ JSON 로그는 환경변수 값이 아니라 프로파일로 켠다. janino 없는 logback 은 값으로 appender 를 고를 수 없어, 오타가 나면 root 가 appender 를 잃고 로그가 조용히 사라진다. 프로파일 오타는 텍스트로 남을 뿐이다. ⚠ 검증 중 실제 기동 실패를 하나 잡았다 — 형식 기본값을 `${CONSOLE_LOG_STRUCTURED_FORMAT:-ecs}` 로 두면 Boot 가 빈 문자열을 채워 기본값이 적용되지 않고 `Unknown format ''` 으로 기동이 실패했다. 앞서 통과한 1차 실행은 다른 테스트가 남긴 시스템 프로퍼티 때문에 이 결함이 가려져 있었다. 기본값은 `springProperty` 로 Spring 환경에서 읽는다. 로그인 실패 경보는 새 카운터 없이 표준 요청 메트릭에 결속한다. 태그 값(`uri`·`status`)은 통합 테스트가 실제 요청으로 고정하고, Prometheus 이름은 실제 scrape 출력으로 고정한다. `promtool check rules` 실측 SUCCESS(2 rules). red 증명: 카운터 증가 제거는 단위 테스트 2건 red, `json-logs` 프로파일명 변경은 로그 형식 테스트 2건 red, 계약은 메트릭·태그 개명·라벨 값 오타·정규식 매처 등 12종과 주석 속 증거 2종이 red. | [RateLimitFilter](../../business-core/src/main/java/nuri/business/security/filter/RateLimitFilter.java), [logback-spring.xml](../../api-server/src/main/resources/logback-spring.xml), [경보 규칙](../../config/observability/prometheus-alert-rules.yml), [경보 계약](../../scripts/observability-alert-rules-contract.test.mjs), [관측성 기본값](../04-operations/observability-baseline.md) | 2026-09-14 | - |

## DEC-OPS-097

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-097 | accepted | **거버넌스 총량 관리 규칙을 AGENTS.md 에 둔다.** 새 게이트 전에 기존 게이트 확장을 먼저 검토하고, 같은 불변식을 보는 게이트는 합친다. 공용 메모리 행은 결론·링크·다음 행동만 적는다. 행 길이 상한(결정 1,200·gap 1,600·context 700자)은 기존 공용 메모리 계약이 검사한다. 결정 상한은 이 행부터 적용하고 이전 행은 소급 편집하지 않는다. | 2026-09-14 재평가 우선순위 3(사용자 지시 "우선순위대로 계속진행"). 거버넌스 스크립트가 44,051→47,611줄로 늘었고 결정 행 최대 4,027자였다. 규칙 자체를 따라 새 게이트 없이 기존 계약을 확장했다. GAP-CMTY-001(2,020자)은 의미를 유지하며 978자로 줄였다. red 증명: 상한 초과 행과 AGENTS 집행 링크 제거가 각각 red. | [AGENTS.md](../../AGENTS.md#거버넌스-총량-관리), [공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs) | 2026-09-14 | - |

## DEC-OPS-098

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-098 | accepted | **운영 신뢰 프록시를 Next 고정 주소 하나로 좁힌다.** frontend는 egov-net에서 고정 주소 172.28.0.10을 받고, 동적 할당은 `ip_range` 172.28.0.128/25로 분리하며, 게이트웨이를 명시한다. 운영 `TRUSTED_PROXIES` 기본값은 `172.28.0.10/32`다. `ConfigSafetyLinterTest`는 서브넷 포함 대신 이 정합을 검사한다. api 8080 공개는 유지한다. | 2026-09-14 격리 운영 오버레이 리허설(우선순위 5, GAP-SEC-004)에서 서브넷 신뢰가 도커 게이트웨이까지 신뢰해, api 공개 포트 직접 요청의 위조 XFF가 로그인 기록에 남고 로그인 IP 제한이 우회됐다. 같은 시험에서 수정 후 둘 다 막혔다. ADR-0019의 "직접 온 요청은 신뢰 대역 밖" 전제는 게이트웨이 경유 환경에서 성립하지 않았다. red 증명: 현 설정 red, 합성 위반 12종 red. | [리허설](../04-operations/readiness-followups.md#클라이언트-ip-신뢰-경계-리허설), [compose](../../docker-compose.yml), [ConfigSafetyLinterTest](../../api-server/src/test/java/nuri/api/harness/ConfigSafetyLinterTest.java) | 2026-09-14 | ADR-0019의 운영 신뢰 대역(172.28.0.0/24)과 직접 요청 전제 부분 |

## DEC-OPS-099

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-099 | accepted | 화면 용어 파일럿 재검토의 결정과 수리를 확정한다. ① 로그인 카드의 미검증 포지셔닝 설명 줄을 걷고 짧은 제품명은 도입 설정으로 유지한다. ② 사용자 로그의 메소드명·요청자 열과 전체 결과 엑셀 다운로드 노출을 유지하고, 엑셀의 미측정 출력 열은 0 대신 빈 칸으로 쓴다. ③ 만족도 설문의 4지선다 고정은 등록 전 고지와 함께 유지한다. ④ 일정 경로 탭 목록 이름의 허브 은유를 걷는다. 문구를 고치지 않는 결정은 새 finding 상태 `accepted-by-owner`(결정 참조·결정일·결정 대상 문자열 실재)로 종결한다. 콘텐츠 승인이 아니며 재사용 생성 제품에서는 입력 대기로 되돌린다. | 사용자 지시(2026-09-15 "결정한건도 니가 추천하는대로 알아서 진행해줘, 개인정보 결정도 그냥 노출되게 해줘")에 따른 결정이다. 종전 스키마에는 결정 종결 상태가 없어 결정한 finding도 활성으로 남았다. 재검토 비평이 일정 무결함 판정의 반례와, 원본 결정이 파생 제품으로 승계되는 경로(ADR-0018)를 찾아 함께 닫았다. | [용어 계약](../../scripts/frontend-visible-terms-contract.mjs), [용어 원장](../../config/frontend-visible-terms.json), [생성물 투영](../../scripts/reusable-review-scopes.mjs) | 2026-09-15 | - |

## DEC-OPS-100

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-100 | accepted | 화면 용어 원장의 계약 수준 규범(상태 12·action 4·형식·용어·규범 원천·승인 경계)을 작성 기준과 필수 정보 규범으로 정한다. `canonicalLabel`은 새 문구의 기본 문구이고 `requiredInformation`·`mustNotImply`는 규범이며 전체 문구 이관은 없다. 기본 문구는 공용 코드가 합의한 문구에 맞추고 `first-use-empty`·`filtered-zero`는 카탈로그 G15와 하나의 규범으로 묶는다. 계약은 규범 하한·형식 금지 값·승인 경계와 규범 검토일 기준 120일 상한을 검사한다. `mustNotImply` 위반·미측정의 0 표시·기능을 과장하거나 대상을 잘못 부르는 용어만 결함으로 고치고 나머지 편차는 기록한다. `확인`·`초기화` 금지와 `Node` 결정은 가이드의 조건부 규칙에 맞춰 좁혔다. | 사용자가 2026-09-15에 이 정책을 승인했다. 기본 문구 12개 중 10개는 코드에 0건이었고 여럿은 자기 필수 정보를 빠뜨렸다. 검증기는 필드 존재만 봐서 필수 정보 삭제와 형식 금지 해제가 통과했다. | [용어 원장](../../config/frontend-visible-terms.json), [콘텐츠 가이드](../03-guides/frontend-content-style.md), [계약](../../scripts/frontend-visible-terms-contract.mjs) | 2026-09-15 | - |

## DEC-OPS-101

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-101 | accepted | **Contract 마이그레이션은 선행 Expand의 배포·관측 기록을 요구한다.** 새 Contract waiver는 `expandRelease{tag,deployedAt,environment,evidence}`를 남기고, ZDM 린터가 태그 형식·미래 날짜·7일 관측 기간과 [릴리스 기록](../04-operations/migration-release-log.md)의 해당 태그 행(선행 Expand 포함·Contract 미포함)을 대조한다. 2026-09-16 이전 승인분 13건은 `id·path·expandMigration` 조합으로 동결하며 소급 승인이 아니다. | 종전에는 버전 선후만 봤다. Expand와 Contract를 같은 릴리스에 함께 실어도 통과했고, 무중단 가이드 §3이 그 한계를 스스로 적어 두었다(GAP-ZDM-001). 새 게이트를 만들지 않고 기존 ZDM 린터를 확장했다. 기록 대조일 뿐이므로 실제 배포·관측 증거는 운영 몫으로 남기고 그 경계를 gap에 적었다. | [ZDM 린터](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [waiver 원장](../../config/governance/zdm-waivers.json), [릴리스 기록](../04-operations/migration-release-log.md) | 2026-09-16 | - |

## DEC-OPS-102

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-102 | accepted | **리프레시 토큰 회전을 원자적으로 한다.** 제시된 토큰이 아직 저장값일 때만 1행을 갱신하고 0행이면 거부한다. 같은 초의 회전은 `iat` 가 초 단위라 글자까지 같은 토큰을 만들므로, 그 값이 이미 저장돼 있으면 성공으로 본다 — 거부하면 잘못 없는 두 번째 탭이 즉시 로그인 화면으로 튕긴다. 만료 행 정리는 `REQUIRES_NEW` 로 분리한다. | 종전에는 조회한 엔티티를 덮어써, 같은 토큰으로 **동시에** 재발급하면 둘 다 성공하고 마지막 저장만 남았다 — 진 쪽은 서버가 이미 무효화한 토큰을 받아 최대 1시간 뒤 이유 없이 로그아웃됐다. 프런트 단일 실행 계약은 "두 번째는 401" 을 백엔드 계약으로 적어 두었으나 그것은 순차 호출에서만 참이었다. 만료 정리는 뒤따르는 `BusinessException` 롤백이 삭제까지 되돌려 한 번도 커밋되지 않았다. red 증명: 두 수정을 각각 되돌리면 해당 통합 테스트만 red 다. | [AuthServiceImpl](../../business-core/src/main/java/nuri/business/service/auth/impl/AuthServiceImpl.java), [회전 질의](../../business-core/src/main/java/nuri/business/domain/auth/RefreshTokenRepository.java), [동시성 계약](../../api-server/src/test/java/nuri/api/schema/RefreshTokenRotationConcurrencyIntegrationTest.java) | 2026-09-16 | - |

## DEC-OPS-103

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-103 | accepted | **릴리스 이미지를 GHCR 로 발행한다.** `permissions: packages: write` 와 `GITHUB_TOKEN` 으로 push 하고 소유자 이름을 소문자로 정규화한다. 워크플로 린터의 Docker Hub 자격 fail-fast 단언은 **권한 선언·`ghcr.io` 로그인 대상·push 대상** 3축 정적 검사로 바꾼다. 무조건 push 와 "두 이미지 push 뒤에만 릴리스" 순서는 그대로다. | Docker Hub 자격이 저장소에 없어 `build-and-push` 가 항상 실패했고, 릴리스 생성 단계가 **같은 잡 뒤쪽**에 있어 GitHub 릴리스도 한 번도 발행되지 않았다(v0.1.0 은 워크플로 밖에서 만들었다). 시크릿 추가는 회전·폐기 부담을 새로 만드는데(GAP-SEC-001 미해결) GHCR 은 새 시크릿이 0 이다. 자격 부재라는 실패 모드가 사라지므로 같은 불변식을 더 이른 정적 시점에서 본다 — 완화가 아니다. red 증명: 권한 제거·로그인 대상 변경·push 대상 불일치·조건부 push 4종 전부 red. ⚠ 운영 Compose 는 이미지를 pull 하지 않고 로컬 빌드하므로 발행물의 소비자는 아직 없다. | [릴리스 워크플로](../../.github/workflows/release.yml), [워크플로 린터](../../api-server/src/test/java/nuri/api/harness/WorkflowManifestLinterTest.java), [CI 가이드](../03-guides/cicd-pipeline.md) | 2026-09-16 | W0-11 의 `packages:write` 제거 |

## DEC-OPS-104

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-104 | accepted | **이관 도구 뮤테이션을 전용 잡으로 분리한다.** `mutation-scope`(제품 8 스코프)와 `mutation-scope-migration`(이관 2)으로 가르고, 후자는 `change-scope` 의 새 좁힘 출력 `mutation-migration-tool` 이 true 일 때만 돈다 — 그 출력은 `mutation` 의 **부분집합**이다. required check 하나가 소스 잡을 여럿 갖도록 매니페스트·검증기·게이트 레지스트리를 일반화하고, 집계는 소스마다 같은 판정기를 한 번씩 돌린다(판정기 자체는 불변). | 실측: 73.4분 CI 에서 임계 경로가 backend-scope 25.2분 → migration-validate-verify 48.0분이었고 나머지 잡은 전부 36.4분에 끝났다. #678·#680 은 `migration-tool` 을 건드리지 않았는데 그 비용을 냈다. ⚠ 스텝 단위 조건은 쓸 수 없다 — 집계 소스 스텝의 step-level if 는 검증기가 이미 금지한다("잡은 초록인데 작업은 건너뜀"). 그래서 조건은 잡 단위이고, 새 잡도 집계 소스로 등록해 `STRICT_MUTATION`·needs·checkout·조건까지 같은 엄격도로 검사받는다. 일반화에서는 빈 소스 배열·결과 스텝 이름 중복·소스 잡 중복을 명시적으로 거부하고, 레지스트리는 스코프 10개를 한 곳에 유지한 채 항목마다 소유 잡을 태그해 두 잡을 union 으로 대조한다. red 증명 9종(권한·조건·STRICT_MUTATION·잡 부재·빈 배열·중복·소유 잡 위조·타임아웃 양방향·fail-fast). | [CI 워크플로](../../.github/workflows/ci.yml), [required-check 매니페스트](../../.github/required-checks.json), [매니페스트 검증기](../../scripts/required-checks-contract.mjs), [게이트 레지스트리](../../config/governance/gates.json) | 2026-09-16 | - |

## DEC-OPS-105

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-105 | accepted | **부모 존재를 검증하지 않던 참조 두 축에 가드를 둔다.** ① 상위 행정구역 — 존재·자기참조·순환(조상 사슬 + 방문 집합 + 깊이 50)을 검사하고, 등록은 `existsById` 로 신규 전용임을 못박는다(`save()` 가 merge 라 기존 행이 조용히 덮였다). ② 사용자 소속 부서 — 등록·일괄 이동은 존재를 검사하고, 수정은 **요청이 보낸 값이면서 기존과 다를 때만** 검사한다. 빈 값은 양쪽 모두 해제·최상위로 통과시킨다. ③ 템플릿 참조(`tb_bbs_master.tmplt_id`)는 **손대지 않는다**. | 다섯 축 중 둘만 열려 있었다 — 부서 계층과 커뮤니티 귀속은 이미 검증·차단이 완비돼 있었고(중복 구현하지 않았다), 이 둘만 쓰기 방향이 통째로 열려 있었다. ⚠ 수정 경로에서 **해석된 결과값**을 검사하면 이미 고아 소속을 가진 사용자가 이름·연락처조차 못 고친다 — `/users/me` 경계는 소속을 역직렬화하지 않아 본인에게는 빠져나올 수단이 없다. 그래서 요청값·변경분으로 좁혔고 대조군 테스트가 그 경계를 고정한다. ③ 은 값 도메인 결정이 선행이다 — 마법사는 7개 하드코딩 상수를 레이아웃 분기 키로 쓰는데 커뮤니티 화면은 같은 컬럼을 실제 템플릿 원장에서 고르고, `tb_tmplt_info` 에 행을 넣는 생산 코드가 0 건이라 검증을 넣으면 게시판 생성이 전면 중단된다. red 증명 6종(존재·자기참조·순환·중복·부서 존재·변경분 한정). | [AdministCodeService](../../business-core/src/main/java/nuri/business/service/code/AdministCodeService.java), [UserService](../../business-core/src/main/java/nuri/business/service/user/UserService.java), [행정구역 계약](../../business-core/src/test/java/nuri/business/service/code/AdministCodeServiceTest.java), [사용자 계약](../../business-core/src/test/java/nuri/business/service/user/UserServiceTest.java) | 2026-09-17 | - |

## DEC-OPS-106

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-106 | accepted | **참조 4축에 물리 FK를 두고 "부모 없음" 의 저장 표현을 NULL 하나로 모은다.** ① V2_102 가 사용자 소속·부서 계층·행정구역 계층·게시판 커뮤니티 귀속에 `NOT VALID` FK 를 추가하고 고아가 없는 환경에서만 `VALIDATE` 한다(V2_85 패턴·`NO ACTION`). ② 전제로 세 서비스가 빈 문자열 부모를 NULL 로 정규화하고 마이그레이션이 기존 행을 백필한다. 행정코드 응답만 종전 wire 계약대로 빈 문자열을 유지한다. ③ `tb_bbs_master.tmplt_id` 는 제외한다. | 앱 가드(DEC-OPS-105)를 우회하는 직접 DML·이관 경로가 열려 있었다. ⚠ 정규화가 전제다 — 화면은 "소속 없음"·"최상위" 를 빈 문자열로 보내는데(E2E 캡처 본문 `"ognzId":""`) 빈 문자열은 NULL 이 아니라 FK 가 거부한다. 정규화 없이 FK 만 걸면 소속 없는 사용자와 최상위 행정구역 등록이 그 순간부터 실패한다. V2_26 이 "NULL 이면 최상위" 를 컬럼 주석에 이미 못박아, 새 계약이 아니라 쓰기 경로를 그 문서에 맞춘 것이다. tmplt_id 는 원장에 행을 넣는 생산 코드가 0건이라 FK 를 걸면 게시판 생성이 중단된다. red 증명 6종(서비스 정규화 4·FK 제거·백필 제거). | [V2_102](../../api-server/src/main/resources/db/migration/V2_102__add_reference_integrity_fks.sql), [현재 스키마 계약](../../api-server/src/test/java/nuri/api/schema/ReferenceIntegrityFkIntegrationTest.java), [백필 계약](../../api-server/src/test/java/nuri/api/schema/ReferenceIntegrityFkMigrationIntegrationTest.java) | 2026-09-17 | V2_26 의 "up_ognz_id 에 FK 를 걸지 않는다" 방침 |

## DEC-OPS-107

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-107 | accepted | **원본에서 만들 수 없는 증거 의무를 기관 채택 수명으로 이전한다.** 온라인 승인 통제에 `backup-recovery`(백업 세트·RTO/RPO·운영 규모 restore drill)와 `crypto-lifecycle`(자격 회전·폐기, 레거시 hash·이전 키 암호문 census 와 호환 adapter 처분)을 신설한다. 인가 배포 검증은 새 통제를 만들지 않고 기존 `authorization` 통제에 편입한다(앱 버전·구 writer 종료·로그인·권한 회수·메뉴). gap 인덱스에서 네 행을 걷고 이전 기록을 남긴다. 이전 대상이 아닌 GAP-DEP-001·GAP-MIG-001·GAP-SEC-004 는 "재검증 대기" 절의 별도 표로 분리한다. 자격·키의 값은 근거 파일에 적지 않는다. | 원본 저장소에는 운영 환경이 없어 그 증거를 만들 대상 자체가 없다 — 의무의 수신자가 원본이 아니라 채택 기관이다. 활성 gap 으로 두면 영원히 닫히지 않아 신호가 죽고, 지우면 파생 제품 채택자가 확인된 축으로 오인한다(H2 와 같은 방향). DEC-OPS-020 이 연구·live census 4축에 쓴 패턴과 같다. 이전은 집행되지 않으면 삭제와 같으므로 계약이 두 통제의 근거 부재를 거부하고 **이전 전 5통제 집합이 더 이상 승인되지 않는 것**을 대조군으로 고정한다. 부수로 공용 메모리 ID 수집기가 표 머리글을 ID 로 세던 것을 행 검사와 같은 의도로 맞췄다(합성 중복 probe 동반). | [승인 통제](../../scripts/adoption-review.mjs), [검토 수명 가이드](../03-guides/governance-review-lifecycle.md), [이전 집행 계약](../../scripts/governance-review.test.mjs), [활성 Gap 인덱스](../../.agent/memory/known-gaps.md) | 2026-09-21 | GAP-OPS-002·GAP-SEC-001·GAP-DATA-001·GAP-AUTH-003 의 활성 gap 지위 |

## DEC-OPS-108

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-108 | accepted | **브랜치 보호 명세에 `requireExtraApprovalForUnattributedChanges` 를 넣고, 명세가 모르는 pull request 파라미터를 red 로 잡는다.** 값은 원격 실측치(`true`)로 동결해 양방향 드리프트를 보이게 한다. `required_reviewers`·`allowed_merge_methods` 는 보호 축이 아니라 의도적 비교 제외로 사유와 함께 코드에 남긴다. | GitHub 가 DEC-OPS-009 이후 추가한 승인 축인데 `PULL_REQUEST_POLICY_FIELDS` 에 없어 검증기가 비교조차 하지 않았다 — 원격이 `true` 로 켜져 있어도 `verify:ops` 는 green 이었다. 단독 운영에서 승인 요구는 병합을 막을 수 있는 축이라 사각이 크다. ⚠ 현재 값을 명세에 적는 것은 그 값을 옳다고 판정하는 것이 아니라 드리프트를 보이게 하는 것이다 — 이 설정을 끌지는 별도 제품 결정이며 원격 변경은 승인 경계다. 필드 하나만 더하면 같은 구멍이 다음 필드에서 재발하므로, 투영이 모르는 파라미터 자체를 보고하게 했다. | [명세](../../.github/required-checks.json), [필드 목록·비교](../../scripts/required-checks-contract.mjs), [실측 검증기](../../scripts/verify-branch-protection.mjs) | 2026-09-21 | - |

## DEC-OPS-109

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-109 | accepted | **PD-RBAC-001(DB 인가 전환의 사후 shadow 증명 여부)을 전제 소멸로 종료한다.** 행이 인용한 `rbac.db-auth.enabled`·`rbac.shadow.enabled`는 ADR-0016 이행(`f4eda1407`)에서 제거돼 설정에 0건이고, `ApiSecurityConfig`는 `OperationAuthorizationManager` 단일 배선이며, 설계 문서는 구·신 평가기를 동시에 돌리는 온라인 shadow 모드를 제공하지 않는다고 못박았다. 위험 수용 결정이 아니라 선택지 자체가 사라진 기록이다. | 결정 대기 레지스트리는 현재 구현에 실제 영향을 주는 선택지만 둔다(문서 규칙). 존재하지 않는 설정을 근거로 남은 행은 다음 사람을 낡은 전환 계획으로 보낸다. | [ADR-0016](../02-architecture/decisions/ADR-0016-explicit-permissions-and-multiple-groups.md), [ApiSecurityConfig](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java), [설계 문서 롤백 절](../02-architecture/authorization-simplification-design.md) | 2026-09-22 | PD-RBAC-001 종료 |

## DEC-OPS-110

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-110 | accepted | **ADR-0008의 소스 adapter 열거(6종)를 CUBRID를 포함한 7종으로 보완한다.** `1bb6cf249`가 `CubridSourceAdapter`를 추가하고 2026-09-16 CUBRID 11.4(엔진 11.4.6.1963·JDBC 11.3.1.0050) 실측 — preflight·owner 한정 discovery·DRY_RUN·PostgreSQL 내부 COMMIT rehearsal — 을 남겼으나 ADR·gap·컨텍스트에 반영되지 않았다. 증거 등급 UNVERIFIED·MANUAL_ONLY, 외부 driver digest 결속과 공개 COMMIT 차단은 다른 vendor와 같다. ADR 본문은 소급 편집하지 않는다. | 결정 인덱스와 코드가 지원 범위를 달리 말하면 도입처가 범위를 잘못 읽는다. | [ADR-0008](../02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md), [SourceAdapterRegistry](../../migration-tool/src/main/java/nuri/migration/adapter/SourceAdapterRegistry.java), [CUBRID 실측](../04-operations/readiness-followups.md#이관-cubrid-실행-환경과-검증-경계) | 2026-09-22 | ADR-0008 §1·§6의 6종 열거 부분 |

## DEC-OPS-111

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-111 | accepted | **운영 환경 없이 만들 수 없는 증거 3건을 기관 채택 수명으로 이전한다.** 온라인 승인 통제에 `attachment-operations`(GAP-SEC-003 의 첨부 provenance census + GAP-STORAGE-001 의 정기 점검 운영 실행·영속 볼륨·경보·파기 결속)와 `operational-assurance`(GAP-OPS-001 의 운영 규모 부하·NVD 전량 triage·SLA·인증 ZAP)를 신설하고 세 gap 행을 걷는다. 원본에 남는 설계 결정(직접 DB/import 경로의 provenance 강제, 인증 ZAP context 결속)은 이전 문단에 적는다. | 원본 저장소에는 운영 환경이 없어 증거의 대상 자체가 없다 — DEC-OPS-107 과 같은 이유이며, 계약이 근거 없는 승인과 이전 전 7통제 집합의 승인을 거부한다. | [승인 통제](../../scripts/adoption-review.mjs), [검토 수명 가이드](../03-guides/governance-review-lifecycle.md), [이전 집행 계약](../../scripts/governance-review.test.mjs) | 2026-09-23 | GAP-SEC-003·GAP-STORAGE-001·GAP-OPS-001 의 활성 gap 지위 |

## DEC-OPS-112

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-112 | accepted | **게시판 통계 응답에서 `intelligenceScore` 를 걷는다.** 측정값이 아니라 `min(100, 글수×2+70)` 이고 소비처가 0이다. 새 게이트를 만들지 않고 기존 정직성 계약을 넓혀 화면 소스뿐 아니라 `BoardService` 소스도 보게 해 서버 쪽 재유입을 막는다. | 2026-08-29 에 유일한 소비처(지식 허브의 「지식 지수 NN/100」 칸)를 걷으면서 서버 필드는 "응답 계약 변경은 별건" 으로 유보했고, 그 뒤 아무도 읽지 않는 채 계약에 남아 있었다. 남겨 두면 다음 소비자가 100 점 만점 지표를 측정값으로 읽는다 — 글이 없는 게시판이 70 이고 15건이면 100 에 붙어 더 이상 움직이지 않는다. 서비스 주석이 스스로 "Logic derived from frontend" 라고 적어 화면이 지어낸 식임을 기록하고 있었다. operation 수는 불변이다(필드 제거이지 표면 제거가 아니다). red 증명: 계산·빌더 호출을 되돌리면 새 단언이 죽는다. | [BoardStatsResponse](../../business-app/src/main/java/nuri/business/service/board/dto/BoardStatsResponse.java), [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [정직성 계약](../../frontend/src/__tests__/cross-stack/honest-affordance-contract.test.ts) | 2026-09-23 | - |

## DEC-OPS-113

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-113 | accepted | **ZAP 주간 스캔 경고 11건을 전수 분류하고 수리 3건을 적용한다.** ① 로그인 폼에 `method="post"` ② 문서 응답에 COOP `same-origin` ③ API 에 CORP `same-origin`. 함께 `report-to` 그룹을 정의하는 `Reporting-Endpoints` 헤더를 신설한다. 나머지 8건은 근거와 함께 WARN 으로 유지하고, 스캐너 자신의 요청을 보는 `90005` 만 `IGNORE` 로 등재한다. | 워크플로는 2026-08-02 이후 매주 성공했지만 WARN 은 빌드를 막지 않아 경고를 사람이 읽은 기록이 없었다. ⚠ `method` 부재는 HTML 기본값이 GET 이라 하이드레이션 전 제출이 자격증명을 URL 에 실었다 — 스캐너가 실제로 그 URL 을 만들어 냈고, ADR-0009·ADR-0011 이 지켜 온 경계와 같은 축이다. ⚠ 분류가 ZAP 이 지목하지 않은 결함을 드러냈다 — 두 CSP 가 `report-to csp-endpoint` 를 선언하는데 그룹을 정의하는 헤더가 없어 최신 리포팅 경로가 선언만 있고 동작하지 않았다(수집기는 이미 그 형식을 파싱한다). 새 게이트를 만들지 않고 `csp-policy` 계약을 넓혀 선언·그룹·수집기 세 자리의 일치를 검사한다. WARN 0 은 목표가 아니다. red 증명 4종. | [분류 기록](../04-operations/readiness-followups.md#zap-주간-스캔-경고-분류), [proxy.ts](../../frontend/src/proxy.ts), [ApiSecurityConfig](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java), [csp-policy 계약](../../frontend/src/__tests__/csp-policy.test.ts), [규칙 원장](../../.zap/rules.tsv) | 2026-09-23 | - |

## DEC-OPS-114

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-114 | accepted | **URL 쿼리 copy-all 캐리어 15곳을 라우트 소유 allowlist 재조립으로 바꾸고, census 탐지기가 그 형태를 이름으로 읽게 한다.** 공용 `pickAllowedParams` 는 빈 파라미터에서 시작하므로 미지·반복·인코딩 이름이 함께 끊긴다. 탐지기는 allowlist 상수를 해석해 `allowlist-rebuild` record 를 키 이름과 함께 남기며, 해석 실패는 통과가 아니라 ambiguous 다. | 종전 `new URLSearchParams(searchParams.toString())` 는 들어온 쿼리를 이름을 묻지 않고 전부 복사한 뒤 자기 키만 덮어썼다 — 모르는 이름이 URL 에 한 번 들어오면 이동마다 재발행하는 캐리어이며, DEC-OPS-029 Q2 는 목록 화면 한 곳에만 적용했다. ⚠ 헬퍼만 넣었을 때 record 가 389→348 로 줄었는데 그중 26건은 탐지기가 이름 있는 producer 를 못 보게 된 손실이었다 — 부채가 준 것이 아니라 시야가 준 것이라 탐지기를 함께 고쳤다(최종 390, opaque 부류 57→43). ⚠ 공통코드의 진입 딥링크 키를 allowlist 에 넣었다가 되돌렸다 — 그 값은 STANDARD 탭에서만 의미가 있고 기존 census 가 그 화면의 해당 리터럴을 금지한다(DEC-OPS-022). 계약이 그 오판을 잡았다. red 증명 4종. | [공용 헬퍼](../../frontend/src/lib/navigation/allowlist-params.ts), [헬퍼 계약](../../frontend/src/lib/navigation/__tests__/allowlist-params.test.ts), [탐지기](../../scripts/ui-url-state-census.mjs), [URL-state census](../../config/ui-url-state-census.json) | 2026-09-23 | - |

## DEC-OPS-115

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-115 | accepted | **route capability 동결과 커밋된 원장을 양방향으로 대조하고, 그 대조가 드러낸 낡은 판정 2건을 고친다.** ① 부재 관리는 `unavailable`·출처 `none`·액션 0·라벨 `부재 정보 미연동` 에서 `partial`(후보 `live`)·`admin-user-absences-api`·`mark-absent`/`mark-returned`·라벨 `부재 상태 관리` 로 옮긴다. ② 동결 목록에만 남아 있던 알림 발송 미리보기 항목을 걷는다. 날짜는 대조하지 않는다 — 행별 재확인일이 census `asOf` 보다 뒤인 것은 드리프트가 아니라 더 정확한 사실이다. | `KNOWN_ROUTE_CAPABILITIES` 는 baseline 을 **생성**하기만 했고 커밋본과 비교되지 않았다. 그래서 배선하며 원장만 고치면 동결이 낡은 값을 들고 있었고, 동결만 고쳐도 아무 신호가 없었다 — 다음 재생성이 고친 행을 되돌리는 경로다. 실제로 부재 관리는 DEC-OPS-049(2026-09-07) 배선 뒤에도 **존재하지 않는 라벨을 근거로 없는 기능을 주장**했고, 알림 미리보기는 DEC-OPS-038(2026-09-06)이 걷은 뒤에도 동결에만 남아 있었다. `live` 로 올리지 않은 이유는 E4(UI→서버 왕복 산출물)가 없어서이며 알림 발송(DEC-OPS-042)과 같은 형태다. GAP-COPY-001 의 나머지 문구 편차는 원장 reviewBy 의 규범 검토로 남긴다. red 증명 2종 — 원장만 고치거나 동결만 고치면 각각 red 다. | [capability 원장](../../config/ui-route-capabilities.json), [동결·대조](../../scripts/ui-route-capabilities-contract.mjs), [배선 계약](../../frontend/src/app/admin/user/__tests__/UserOrgHubClient.absence.test.tsx), [편차 목록](../04-operations/readiness-followups.md#화면-문구-규범-편차) | 2026-09-23 | - |

## DEC-OPS-116

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-116 | accepted | **CI 실패 annotation 의 JUnit 메시지 추출을 ci.yml 셸에서 테스트 가능한 모듈로 옮긴다.** `scripts/ci-annotate-test-failures.mjs` 가 닫는 따옴표를 창 안에서 요구하지 않고 읽은 뒤 자르며, 메시지가 없으면 예외 타입으로, 그것도 없으면 명시적 표지로 물러나 **본문이 빈 annotation 을 만들지 않는다.** | 종전 셸 패턴은 `message="[^"]{0,300}"` 였다 — 닫는 따옴표가 300자 안에 있어야 매칭된다. 메시지가 길면 추출이 빈 문자열이 되고 본문 없는 annotation 은 GitHub 가 버린다. 결과가 정확히 거꾸로였다: **짧은 단언 실패는 보이고, Flyway·SQL 예외처럼 길어서 정말 진단이 필요한 실패는 보이지 않았다.** 2026-09-23 schemaValidationTest 간헐 실패에서 실패 클래스 annotation 이 하나도 뜨지 않은 원인이며 로컬에서 재현했다(400자 메시지 → 추출 0자, 짧은 메시지 → 정상). 그 잡은 리포트 아티팩트도 올리지 않아 CI 만으로는 원인을 알 수 없었다. red 증명 3종 — 유계 패턴 복귀·폴백 제거·ci.yml 미호출이 각각 red 다. | [모듈](../../scripts/ci-annotate-test-failures.mjs), [계약](../../scripts/ci-annotate-test-failures.test.mjs), [CI 워크플로](../../.github/workflows/ci.yml) | 2026-09-23 | - |

## DEC-OPS-117

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-117 | accepted | **밀도 대상 컨트롤의 고정 높이 덮어쓰기를 걷고 파일별로 동결한다.** 폼·다이얼로그의 입력·버튼 `h-11` 123건을 `--control-h`로 되돌리고(comfortable 44→36px), 적용되지 않던 선택 컨트롤의 `h-11` 11건을 걷고, `SelectTrigger` 기본 높이를 토큰에 결속한다. 기존 밀도 계약이 기본 컴포넌트의 토큰 선언과 덮어쓰기의 파일별 수를 exact 로 본다. | tailwind-merge 가 기본 토큰을 지우고 `h-11`만 남겨 `compact` 밀도(DEC-OPS-015)가 이 컨트롤에 닿지 않았다. 선택 컨트롤은 반대로 `[data-size]` 규칙(특이도 0,2,0)이 `h-11`을 이겨 한 폼 안에서 입력칸 44px·선택칸 36px로 어긋나 있었다. 36px는 WCAG 2.2 AA 목표(2.5.8, 24px)를 충족한다. 2026-09-20 폼 입력칸 이행과 같은 방향이며 조회조건 바는 전용 토큰을 유지한다. VRT 화면·큰 글꼴·정사각·`size` 변형 36건은 화면별로 남긴다. 사용자 위임(2026-08-23). red 증명 5종. | [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts), [SelectTrigger](../../frontend/src/components/ui/select.tsx), [카탈로그 §4](../02-architecture/work-screen-grammar-catalog.md#4-밀도-계약) | 2026-09-23 | - |

## DEC-OPS-118

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-118 | accepted | **컨트롤 높이 2차 — 화면별 판단이 필요하던 17곳을 뜻에 맞게 옮긴다.** 아이콘 전용 버튼 4곳은 고정 폭·높이를 걷고 `size="icon"`으로, 큰 글꼴 입력칸 8곳은 `h-11`과 `text-lg`~`text-3xl`을, 텍스트 버튼 2곳은 `h-11`을 걷는다. 오류 화면의 버튼 쌍은 `lg` 크기를 따르고, 조회조건 바의 초기화·조회는 같은 바의 `--filter-control-h`를 쓴다. 도달할 수 없는 화면 3곳(DEC-OPS-023 ①)과 색상 선택기는 대상이 아니다. | 1차 뒤 36px가 된 입력칸·버튼과 남은 44px 요소가 한 줄·한 쌍 안에서 어긋났다(커뮤니티 검색 줄, 프로그램 저장·삭제, 설문 수정·삭제, 레이아웃 복원·저장). 글꼴을 두면 36px 칸에서 글자가 잘린다. 메일 제목 칸은 테두리와 포커스 링을 함께 지워 키보드 포커스가 보이지 않았고(WCAG 2.4.7) 자리표시자 불투명도가 10%라 그 덮어쓰기도 걷었다. 남은 `h-11` 19건은 VRT 화면·공통 레이아웃 16과 도달 불가 3이다. 사용자 지시("계속")와 위임(2026-08-23). | [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts), [조회조건 바 (당시 소스)](https://github.com/lkindo/egov-enterprise/blob/e0066946cb55c2135d9df3a66baa739f6ba8211b/frontend/src/app/components/ui/standard-search-filter.tsx), [메일 작성](../../frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx) | 2026-09-23 | - |

## DEC-OPS-119

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-119 | accepted | **컨트롤 높이 3차 — VRT 기준선 화면과 공통 레이아웃의 `h-11` 16곳을 걷고 기준선을 다시 만든다.** 로그인 입력칸·버튼, 공통코드 폼·대화상자 버튼, 헤더 계정 버튼, 온보딩 버튼이 대상이며 모두 예외 없이 `h-11`만 걷는다. 기준선은 Linux 워크플로(`update-visual-baseline`)로만 다시 만든다(DEC-OPS-017). | 모든 관리 화면에 보이는 변화라 마지막 차수로 미뤘다. 헤더 계정 버튼은 아바타 28px와 두 줄 이름이 36px 안에 들어가고 compact 32px에서도 넘치지 않는다. 이로써 `h-11` 이행이 끝났고 남은 3건은 도달 불가 화면이다. 다른 고정 높이(`h-10`·`h-8` 등)는 같은 동결 아래 GAP-UIDENSITY-001 로 남긴다. 사용자 지시("계속")와 위임(2026-08-23). | [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts), [VRT 스펙](../../frontend/e2e/quality/visual-baselines.spec.ts), [기준선 워크플로](../../.github/workflows/update-visual-baseline.yml) | 2026-09-23 | - |

## DEC-OPS-120

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-120 | accepted | **기본 밀도에서 값이 같은 고정 높이 35곳을 토큰으로 옮긴다.** `h-8`(2rem)은 `--control-h-sm`, `h-9`(2.25rem)은 `--control-h`, 표 검색칸의 `h-12`(3rem)는 `--filter-control-h` 와 값이 같다. `size="sm"` 에 겹친 `h-8` 과 기본 크기에 붙은 `h-9` 는 지우고, `size="icon"`+`h-8 w-8` 은 `size="icon-sm"` 으로, 나머지는 토큰 클래스로 바꾼다. | 기본 밀도의 모양이 그대로라 VRT 기준선은 바뀌지 않고, compact 밀도가 `h-9` 컨트롤(36→32px)과 표 검색칸(48→32px)에 닿는다. `h-8` 은 compact 에서도 값이 같아 모양은 그대로이며 앞으로의 토큰 변경만 따라간다. 수신자 피커 탭은 클래스가 템플릿 문자열 앞머리에 있어 스크립트가 건너뛰었고 따로 옮겼다. 남은 67건(`h-10`·`h-12` 등)은 같은 값의 토큰이 없어 화면이 바뀌므로 별도 차수로 둔다. 사용자 지시("계속")와 위임(2026-08-23). | [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts), [버튼 크기](../../frontend/src/components/ui/button.tsx) | 2026-09-23 | - |

## DEC-OPS-121

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-121 | accepted | **컨트롤 높이 5차 — 같은 값의 토큰이 없는 `h-10`·`h-12` 56곳을 36px 로 옮기고 남은 11건을 비대상으로 확정한다.** 정사각 아이콘 버튼 31곳은 `size="icon"`(네이티브는 `size-[var(--control-h)]`), 텍스트 컨트롤 25곳은 기본 크기면 지우고 네이티브·`sm` 은 `--control-h` 로 바꾼다. 로그인 비밀번호 표시 버튼은 입력칸 안에 들어가도록 `icon-sm` 이다. 남은 11건은 도달 불가 화면 4, 테마 CSS 없이 뜨는 전역 오류 화면 1, 의도적 소형 6이다. | 40·48px 는 같은 값의 토큰이 없어 화면이 바뀌며 기준은 1~3차와 같다(WCAG 2.2 AA 24px). 로그인 표시 버튼은 3차 뒤 36px 입력칸에서 위아래 2px 씩 삐져나와 있었다. 전역 오류 화면은 루트 레이아웃을 대체해 `--control-h` 가 정의되지 않으므로 고정 높이가 맞다. VRT 기준선은 Linux 워크플로로 다시 만든다. 이로써 GAP-UIDENSITY-001 을 닫는다. 사용자 지시("계속")와 위임(2026-08-23). | [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts), [로그인](../../frontend/src/app/login/LoginClient.tsx), [전역 오류](../../frontend/src/app/global-error.tsx) | 2026-09-23 | GAP-UIDENSITY-001 의 활성 gap 지위 |

## DEC-OPS-122

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-122 | accepted | **컨트롤러 요청 DTO 13개를 입력 계약 원장에 편입하고, 편입이 드러낸 결함 5건을 닫는다.** 가입 힌트·정답 `@Size(300)`, 메일 본문 `@Size(4000)`, 메일 수신자·설문 답변 목록의 type-use `@NotNull`, 일괄 상태 코드 `^(?:P\|A\|D)$`. 편입은 DTO 마다 저장 경로를 읽어 요청 값이 그대로 저장되는 필드만 묶는다 — 서버가 덮어쓰거나 정규화·해시하는 필드와 조회 키로만 쓰는 DTO 는 뺐다. 메모 지시 DTO 는 api-server 에서 business-app memoreport 로 옮겼다. | 공개 가입 API 가 301자 힌트를 DB 오류(500)로 끝냈고, null 항목은 서비스 NPE(500)였으며, 일괄 상태는 어휘 밖 코드를 저장해 계정을 막으면서 화면에는 '-' 로 남겼다. 메모 지시 DTO 는 demo 타입을 참조하지 않아 축소 프로필에 참조처 없이 남았고, pack 태그 계약이 그것을 잡았다 — 두 binding 의 태그가 갈리면 core 투영에서 필수·길이 DTO 집합이 어긋난다. 사용자 위임(2026-08-23). red 증명: 수정을 되돌리면 새 컨트롤러 테스트 4건만, 원장 게이트는 제거한 3건을 정확히 지목한다. | [원장](../../config/governance/input-contract-mirror-census.json), [게이트](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java), [BulkStatusRequest](../../business-core/src/main/java/nuri/business/service/user/dto/BulkStatusRequest.java), [MemoInstructionRequest](../../business-app/src/main/java/nuri/business/service/memoreport/dto/MemoInstructionRequest.java) | 2026-09-24 | - |

## DEC-OPS-123

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-123 | accepted | **Spring Boot 4.1 1단계를 적용한다(ADR-0024).** Boot 4.1.1·Framework 7·Security 7·JUnit 6으로 올리고 HTTP 변환기는 Jackson 2 호환 모듈에 둔다. 테스트가 통과한 채 바뀌는 동작 — Jackson 설정 키, 추적·Flyway starter, WebSocket 브로커 풀로 옮겨 가던 `@Scheduled`, 컨테이너 `@Valid`(HV000271) — 를 코드와 계약으로 고정하고 BOM과 같아진 버전 고정을 걷는다. | 사용자 결정(2026-09-24 "권장안으로 진행")이다. ⚠ JSpecify 이행이 두 도구의 판정을 조용히 바꿨다 — springdoc이 TYPE_USE `@NonNull`을 읽지 못해 required 하나가 빠졌고(명시로 보존), `pkg.@NonNull Type` 형태가 결합 스캐너의 edge를 가렸다(import로 복원). api-docs 대조와 결합 원장이 잡았다. api-server 테스트 `application.yml`이 main을 가려 테스트만 Jackson 3 변환기를 쓰던 불일치도 드러나 동등성 테스트로 고정했다. | [ADR-0024](../02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md), [AsyncConfig](../../foundation/src/main/java/nuri/foundation/core/config/AsyncConfig.java), [입력 계약 게이트](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java) | 2026-09-24 | - |

## DEC-OPS-124

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-124 | accepted | **ADR-0024 2단계를 적용하고 범위를 온라인 앱으로 한정한다.** HTTP·WebSocket 변환기와 Boot 매퍼를 Jackson 3로 옮기고 호환 모듈을 걷는다. wire 규칙은 `spring.jackson.use-jackson2-defaults`와 `mapper.detect-parameter-names`로 Boot 3.5와 같게 두고 동등성 테스트가 매퍼 기능값 8개를 고정한다. migration-tool은 Jackson 2에 둔다. | 사용자 결정(2026-09-24 "권장안으로 진행")의 2단계다. migration-tool은 Boot 변환기를 쓰지 않는 독립 CLI이고 승인 산출물이 정규화 JSON digest에 결속돼 있어, 옮기면 얻는 것 없이 기존 승인을 깰 위험만 생긴다. deprecated인 것은 Boot 호환 모듈이지 Jackson 2가 아니다. ⚠ 예외 처리기가 알 수 없는 필드를 Jackson 2 타입으로 판별해 조용히 빗나갈 뻔했다(실제 변환기 테스트로 고정). | [ADR-0024](../02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md), [동등성 테스트](../../api-server/src/test/java/nuri/api/config/JsonConverterParityIntegrationTest.java), [2단계 결과](../04-operations/readiness-followups.md#2단계-적용-결과-2026-09-24) | 2026-09-24 | ADR-0024 결정 3의 "본체·테스트의 Jackson 2 사용을 걷는다" 범위(migration-tool 제외) |

## DEC-OPS-125

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-125 | accepted | **Boot 4 전환 후속을 정리한다.** ① 이행용 `spring-boot-starter-test-classic`을 기술별 test starter로 좁힌다 — 공통은 starter-test, business-core 테스트 픽스처는 webmvc·data-jpa·security·opentelemetry test starter, api-server는 직접 쓰는 셋이다. import 없이 동작해 빠뜨려도 컴파일이 통과하는 관측성 차단은 테스트로 고정한다. ② spring-retry는 유지한다. 재검토 조건은 Framework 7 minor에서 호환이 깨지거나 Spring Batch 의존을 걷을 때다. | Spring 7 core retry로 옮기면 `@Recover`가 없어 SMS 루프의 Error 처리·인터럽트·지연값 해석 실패의 의미가 바뀐다. Batch 경유로 bootJar에 남아 공급망 이득도 없고, 헌법 제10조 1항 문구 변경은 사용자의 명시적 요청이 필요하다. 두 판단은 조사 2건과 반박 검증 6건을 거쳤다. main 수동 NVD 실행에서 억제되지 않은 CVSS≥7이 198건에서 0건이 되어 GAP-DEP-002를 종료했다. | [후속 정리](../04-operations/readiness-followups.md#후속-정리-2026-09-24), [관측성 차단 테스트](../../api-server/src/test/java/nuri/api/config/TestObservabilityIsolationIntegrationTest.java) | 2026-09-24 | GAP-DEP-002 종료 |

## DEC-OPS-126

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-126 | accepted | **주간 ZAP 이 OpenAPI 로 API 전체를 로그인한 상태로 스캔한다.** full-scan 을 `zaproxy/action-api-scan` 으로 바꾸고, 스캔 앞에서 개발 시드 관리자로 로그인해 토큰을 확인하며, 능동 스캔을 액세스 토큰 유효시간 안(40분)에서 끊고, 스캔 뒤 세션이 끊겼으면 실패시킨다. 스캔 잡에서만 요청 제한 한도를 올리고, OpenAPI 서버 URL 에서 `/api/v1` 을 뺀다. | 종전 스캔은 문서 URL 을 크롤링해 경고 URL 이 5개뿐이었고 API 연산은 한 번도 스캔되지 않았다. 서버 URL 이 기본 경로를 다시 붙여 Swagger UI·스캐너가 `/api/v1/api/v1` 을 불렀다. 첫 인증 스캔은 URL 341개를 가져와 1,956개를 스캔했고 응답 535건이 429 였다. 워크플로 린터가 형태를 고정하고 변형 8종이 red 다. DEC-OPS-111 이 남긴 인증 ZAP 결속을 닫으며, 기관 환경의 인증 스캔 증거는 계속 `operational-assurance` 통제다. | [ZAP 워크플로](../../.github/workflows/zap-scan.yml), [워크플로 린터](../../api-server/src/test/java/nuri/api/harness/WorkflowManifestLinterTest.java), [실측](../04-operations/readiness-followups.md#api-스캔이-api-를-스캔하지-않고-있었다-2026-09-24) | 2026-09-24 | - |

## DEC-OPS-127

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-127 | accepted | **ZAP API 스캔이 드러낸 입력 오류 500 을 400·413 으로 고친다.** 필수 값 누락·모르는 정렬 필드·정렬 검사 거부·이름 없는 쿼리 파라미터는 400, 잘못된 multipart 본문은 가장 안쪽 원인이 형식 거부일 때만 400, 서블릿 업로드 한도 초과는 413 이다. `sort` 값 형식은 저장소 전에 인터셉터가 본다. 제약 있는 요청 DTO 를 `@Valid` 없이 받는 컨트롤러는 입력 계약 게이트가 막는다. SQL 인젝션·경로 조작·JSON XSS 약점 경고는 재현 근거와 함께 WARN 으로 둔다. | 같은 예외 타입이 코드 결함·서버 IO 실패에서도 나오므로 요청 값이 원인일 때만 좁혀 서버 결함을 400 으로 숨기지 않는다. 첨부 포함 게시글 경로는 `@Valid` 가 없어 제목·본문 검사를 건너뛰고 있었고, 한도를 넘는 업로드는 "서버 내부 오류" 를 보였다. 경고 0 은 목표가 아니다. red 증명: 수리마다 되돌리면 해당 테스트만 실패한다. | [분류 기록](../04-operations/readiness-followups.md#api-스캔-경고-분류와-수리-2026-09-24), [예외 처리기](../../foundation/src/main/java/nuri/foundation/core/exception/GlobalExceptionHandler.java), [정렬 경계](../../api-server/src/main/java/nuri/api/interceptor/SortParameterGuard.java), [입력 계약 게이트](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java) | 2026-09-25 | - |

## DEC-OPS-128

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-128 | accepted | **결정 대기 3건을 닫는다.** ① PD-AUTH-001: 로그인 API 응답 본문의 `accessToken` 을 유지한다. ② PD-NOTE-003: 읽은 알림 보존은 6개월로 정하고 `read-months` 기본값을 6 으로 둔다. 자동 파기 스위치는 기본 꺼짐이다. ③ PD-STORAGE-001: 원본은 삭제된 게시글과 첨부를 파기하지 않으며, 보존·파기 정책은 기관 채택 통제 `attachment-operations` 에서 정한다. | 사용자 위임(2026-09-24 "가장 효율적인 상황으로")이다. ① 화면 중계(BFF)가 이미 토큰을 걸러 HttpOnly 쿠키로만 심으므로 브라우저 스크립트에 닿지 않는다. 본문 토큰은 중계 서버와 E2E·부하·ZAP 같은 비브라우저 소비자가 쓰며, 없애면 이들을 모두 바꿔야 하는데 보안 이득이 거의 없다. ② 문서가 권고해 온 값이다. 켜면 배포 환경의 데이터를 지우므로 운영자가 스위치 하나로 켠다. ③ 복구 창·감사 의무·용량은 기관마다 다르고, DEC-OPS-111 이 첨부 운영 증거를 같은 통제로 옮겼다. | [BFF 응답 계약](../../frontend/src/lib/auth/auth-bff-contract.ts), [알림 보존](../04-operations/log-retention-policy.md), [기관 채택 통제](../03-guides/governance-review-lifecycle.md) | 2026-09-24 | PD-AUTH-001·PD-NOTE-003·PD-STORAGE-001 종료 |

## DEC-OPS-129

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-129 | accepted | **네트워크 모니터링을 퇴역한다.** 전용 화면 `/admin/system/network`, 네트워크 모니터링 API 4개(조회 1·501 쓰기 3), 모니터링 허브의 인프라 구성도 탭을 걷고 권한 코드 NETWORK_READ·CREATE·UPDATE·DELETE 와 그 페이지 권한을 원장에서 뺀다. 기존 DB 의 배정 행은 V2_104 가 지우고 지운 행마다 변경 이력을 남긴다. | 사용자 결정(2026-09-25, DB 배정 정리와 탭 삭제까지 선택)이다. 저장 테이블·계측 소스가 없어 조회는 늘 빈 목록, 쓰기는 501 이었고, 전용 화면은 메뉴 시드·OCI 메뉴·화면 링크 어디에도 없었다. 권한 코드만 빼면 DB 에 남은 배정 때문에 관리자 그룹 권한 저장이 '알 수 없는 기능 권한' 으로 막히므로 배정 삭제를 같은 변경에 둔다. V2_99 스냅샷은 고치지 않는다. | [V2_104](../../api-server/src/main/resources/db/migration/V2_104__retire_network_monitoring_grants.sql), [마이그레이션 계약](../../api-server/src/test/java/nuri/api/schema/NetworkGrantRetirementMigrationIntegrationTest.java), [권한 원장](../../config/governance/permission-catalog.json), [모니터링 허브](../../frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx) | 2026-09-25 | PD-OPS-002 |

## DEC-OPS-130

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-130 | accepted | **라우트 기능 원장 검토가 드러낸 결함 4건을 고친다.** ① 지식 허브가 탭 이름을 Q&A 분류 필터로 보내지 않는다. ② 업무 홈 실시간 패널이 헤더 알림함의 정규화로 서버 알림 DTO 를 해석한다. ③ 통계 사용자 축을 미수집 목록에서 빼고 요약 카드 이름을 세는 값(`사용자 등록 요청 수`)에 맞춘다. ④ `/admin/community/[id]` 를 id 를 보존해 정본 커뮤니티 상세로 보내는 page-redirect 로 통합하고 disposition 웨이브 5 로 승인한다. | 네 탭의 주 목록이 늘 비었고(OCI 해당 분류 0행), 실시간 패널은 모든 알림을 버렸으며, 적재되는 활동을 "수집되지 않는다" 고 말했고, 커뮤니티 상세가 id 를 무시했다. 기존 테스트는 결함 쪽을 단언하거나 올바른 입력을 보내지 않았다. 사용자 위임(2026-08-23). red 증명: 수정을 되돌리면 각 새 테스트가 실패한다. | [검토 기록](../04-operations/readiness-followups.md#라우트-기능-원장-정기-검토-2026-09-25) | 2026-09-25 | - |

## DEC-OPS-131

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-131 | accepted | **에이전트 브랜치 통합 검토가 드러낸 결함을 근본에서 고친다.** ① 메모보고 응답은 수정 힌트 `editable` 과 삭제 힌트 `deletable` 을 따로 싣는다. ② 커뮤니티 회원은 본인 탈퇴와 관리자 강제 탈퇴로 탈퇴 상태가 되고, 탈퇴한 사용자는 새 신청으로 다시 가입한다. 인가 판정에 쓰이지 않는 운영자 위임은 걷는다. ③ 통계 기간의 형식 오류·역순은 400 이고 호출처 없는 조회 7개를 걷는다. ④ 대시보드 오늘 게시글 수는 기간 COUNT 를 30초 재사용하고, 알림 카드는 전체 미읽음 합계임을 이름에 싣는다. ⑤ HPCM 단건 조회 배선은 되돌린다. | 삭제는 수정과 다른 권한으로 판정된다. 탈퇴 전이는 서비스에만 있어 도달할 수 없었고 탈퇴 후 재가입은 409 였으며, 운영자 위임은 켜도 권한이 생기지 않았다. 형식이 틀린 날짜는 500 이었다. HPCM 배선은 목록과 같은 값을 주는 조회를 래칫을 내리려고 연결한 것이다(DEC-OPS-062). 사용자 요청(2026-09-25). red 증명: 수정마다 되돌리면 새 테스트만 실패한다. | [검토 기록](../04-operations/readiness-followups.md#통합-검토-후속-2026-09-25) | 2026-09-25 | DEC-OPS-071 의 단일 `editable` 힌트 부분, DEC-OPS-043 ①의 탈퇴·강제 탈퇴 부재 부분 |

## DEC-OPS-132

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-132 | accepted | **게시글 작성일에 인덱스를 둔다(V2_105).** `ix_tb_bbs_item_crt_dt` 를 V2_97 과 같이 잠금 5초·실행 60초 제한 안에서 원자적으로 만든다. 마이그레이션 검증이 잠금 경합 롤백·행 보존과, 대시보드 오늘 건수·게시물 통계 날짜별 집계 조건의 실행 계획이 인덱스를 쓰는 것을 확인한다. | 사용자가 판단을 맡기고 필요하면 진행하라고 했다(2026-09-25). OCI 는 378행이라 지금은 순차 스캔이 싸지만, 대시보드가 인스턴스마다 30초에 한 번 모든 게시판의 오늘 건수를 세어 사용자 활동과 무관한 전체 스캔이 게시글 수에 비례해 커진다. 채택 기관의 규모가 판단 기준이다. red 증명: 인덱스를 다른 컬럼에 만들면 계획 단언이 실패한다. | [V2_105](../../api-server/src/main/resources/db/migration/V2_105__index_board_post_created_date.sql), [마이그레이션 검증](../../api-server/src/test/java/nuri/api/schema/BoardPostDateIndexMigrationIntegrationTest.java), [검토 기록](../04-operations/readiness-followups.md#게시글-작성일-인덱스-2026-09-25) | 2026-09-25 | - |

## DEC-OPS-133

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-133 | accepted | **헌법 3종·공용 메모리·문서를 현재 코드와 결정에 맞춘다.** 백엔드 헌법은 app→app 0건과 포트 목록, FQN 인가 키, 메일·문자 재시도, Hibernate 7의 `@SQLRestriction`·`@Filter`, `@Valid` 게이트, 두 뮤테이션 잡을 현행으로 적는다. 프런트 헌법은 밀도 축과 페이지 권한 게이트를 적고 보안 헤더 기준선에 CORP·COEP·Permissions-Policy·Reporting-Endpoints·COOP 를 더한다. DB 헌법은 자기참조 FK 이름, 선행 Expand 배포·관측 기록, 인덱스 `ix_` 검사 범위를 적는다. 평가에서 확인한 결함은 GAP-SEC-005·GAP-DOMAIN-001 로 올린다. | 사용자 요청(2026-09-25 "헌법 등 상세 분석해서 현행화")이다. 보안 헤더 기준선 추가와 자기참조 FK 규칙은 이미 구현된 것을 조문에 올리지만, 약화를 헌법 위반으로 만드는 정책 성격이 있어 따로 적는다. DEC-OPS-128 ②가 DEC-OPS-038 의 보존 개월 인수처 이관 부분을 이미 대체했음을 여기서 연결한다. | [백엔드 헌법](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md), [프런트 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md), [DB 헌법](../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md), [활성 Gap](../../.agent/memory/known-gaps.md) | 2026-09-25 | DEC-OPS-038 의 보존 개월 인수처 이관 부분(DEC-OPS-128 ②) |

## DEC-OPS-134

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-134 | accepted | **메일·반출·첨부·댓글의 노출 경계를 좁힌다(DIP B1a).** ① 메일 이력의 사용자 수신자는 이름으로 남기고 해석된 주소는 저장·응답하지 않는다. 결재 알림 메일 이벤트도 이름을 싣는다. ② 본문은 발신자 본인 응답에만 싣고 `MAIL_READ_ALL` 관리자에게도 싣지 않는다. ③ 메일은 평문으로 보내고 첨부 지정은 400 이다. ④ CSV 반출은 수식 시작 글자(`= + - @` 탭·CR)로 시작하는 문자열 셀 앞에 `'` 를 붙이고 파일명 날짜를 한국 날짜로 쓴다. ⑤ 논리 삭제된 게시글·게시판의 첨부는 공유 근거가 되지 않는다(작성자 소유 근거는 유지). ⑥ 댓글 수정·삭제도 등록과 같은 게시글 접근 가드를 지난다. | 사용자 위임(2026-09-25)이다. 관리자가 API 로 타인 메일 본문과 수신 주소를 읽을 수 있었고, 첨부는 이력에만 남아 성공처럼 보이는 실패였으며, 회원 전용 게시판에서 탈퇴한 사람이 읽지 못하는 글의 댓글을 고칠 수 있었다. 기존 이력의 주소는 소급해 바꾸지 않는다. 첨부 발송 구현과 문자 이력의 번호 저장은 범위 밖이다. | [MailService](../../business-app/src/main/java/nuri/business/service/mail/MailService.java), [CSV 반출](../../frontend/src/app/components/ui/data-export-excel.tsx), [첨부 판정](../../business-core/src/main/java/nuri/business/service/file/JdbcAttachmentReferenceResolver.java), [댓글 API](../../api-server/src/main/java/nuri/api/controller/business/comment/CommentApiController.java) | 2026-09-25 | GAP-DOMAIN-001 ①② |

## DEC-OPS-135

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-135 | accepted | **로그인·세션 경계를 좁힌다(DIP B1a).** ① 가입(`POST /users/signup`)과 ID 중복 확인은 공개하지 않고 `USER_CREATE` 권한에 결속한다(DEC-OPS-069 집행, 역할 고정 계약은 유지). ② 로그인 정책 거부(A006~A008)와 OTP 오류는 비밀번호 불일치와 같은 401·같은 문구로 응답하고 사유는 감사 기록에만 남긴다. 화면은 요청 제한·서비스 장애만 따로 말한다. ③ 재발급도 로그인 정책을 다시 보고, 거부되면 저장된 토큰을 지운다. ④ OTP 켜기는 서버가 400 으로 거부하고 화면 스위치를 걷는다(기존에 켜진 계정은 저장하면서 끈다). ⑤ 로그인 실패도 사유 코드와 함께 기록하고, 로그인 로그 화면 문구를 "성공·실패 이력" 으로 정정한다. | 사용자 위임(2026-09-25)이다. 미인증 요청이 즉시 활성 계정을 만들었고, 정책 거부 응답이 비밀번호 없이 계정 존재와 걸린 정책을 알려 줬으며, 새로 건 정책은 리프레시 토큰 수명 동안 무시됐다. OTP 는 비밀키 발급·입력 경로가 없어 켜면 로그인할 수 없었다. 가입 엔드포인트 제거는 가입 계약 게이트까지 걷어야 해 택하지 않았다. | [AuthServiceImpl](../../business-core/src/main/java/nuri/business/service/auth/impl/AuthServiceImpl.java), [실패 사유](../../business-core/src/main/java/nuri/business/service/auth/LoginFailureReason.java), [인가 원장](../../config/governance/authorization-policies.json), [로그인 문구](../../frontend/src/lib/auth/login-error.ts) | 2026-09-25 | GAP-SEC-005 ①②③⑤ |

## DEC-OPS-136

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-136 | accepted | **리프레시 토큰을 해시로 저장하고 비밀번호 규칙을 하나로 맞춘다(DIP B1a).** ① 리프레시 토큰은 SHA-256 해시로 저장·조회·회전하고, V2_106 이 원문 행을 모두 지운다(전원 재로그인). ② 로그아웃은 공개 경로로 두고, 액세스 토큰이 만료됐어도 쿠키로 제시된 리프레시 토큰의 행을 지운다. ③ 등록·가입·본인 변경·관리자 초기화가 공용 규칙(8~64자, 영문·숫자·특수문자 각 1자 이상, 공백 없는 ASCII)을 쓰고 화면도 같은 규칙으로 막는다. | 사용자 위임(2026-09-25, D7)이다. DB 를 읽은 사람이 저장된 원문으로 7일간 재발급할 수 있었고, 만료 뒤 누른 로그아웃은 서버 세션을 남겼다. 비밀번호는 경로마다 길이·특수문자 집합이 달라 한 경로에서 막힌 값이 다른 경로로 들어갔다. 로그아웃 공개는 제시된 토큰의 폐기만 허용하므로 권한을 넓히지 않는다. 상한을 20 이 아니라 64 로 둔 것은 긴 암호문구를 허용하기 위해서다(bcrypt 72바이트 안). | [RefreshTokenDigest](../../business-core/src/main/java/nuri/business/domain/auth/RefreshTokenDigest.java), [V2_106](../../api-server/src/main/resources/db/migration/V2_106__revoke_plaintext_refresh_tokens.sql), [PasswordPolicy](../../business-core/src/main/java/nuri/business/service/user/PasswordPolicy.java), [화면 규칙](../../frontend/src/lib/validations/password-policy.ts) | 2026-09-25 | GAP-SEC-005 ④ |

## DEC-OPS-137

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-137 | accepted | **게시판 쓰기의 데이터 보존 경로를 고친다(DIP B1b).** ① 게시글 수정은 폼의 기존 첨부 번호를 싣고, 서버도 요청에 없으면 글의 기존 첨부 묶음에 더한다. ② 첨부 포함 등록은 게시판·커뮤니티 검증을 업로드보다 먼저 하고, 업로드 뒤 트랜잭션이 롤백되면 이번에 저장한 파일을 지운다(`TransactionUtils.runAfterRollback`). ③ Q&A 상태·분류 기본값은 등록할 때만 채우고, 작성자·전체 수정 권한자가 질문을 해결됨으로 표시하는 API(`PATCH …/solved`)와 버튼을 둔다(Q&A 템플릿 게시판만). ④ 수정 화면 진입은 조회수를 올리지 않는다(`countView=false`). | 사용자 위임(2026-09-25)이다. 수정 중 파일을 더하면 기존 첨부가 글에서 떨어져 나갔고, 거부된 등록이 디스크에 파일을 남겼으며, 해결된 질문이 제목 수정 한 번에 접수로 되돌아갔고 해결 표시 경로는 없었다. 관리자가 남의 글에 파일을 더할 때는 기존 첨부 묶음에 더할 권한이 없어 거부된다(종전의 조용한 분리보다 명시적 거부). 사용자별 조회수 중복 제거는 범위 밖이다. | [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [TransactionUtils](../../foundation/src/main/java/nuri/foundation/core/util/TransactionUtils.java), [게시글 액션](../../frontend/src/app/actions/boardActions.ts) | 2026-09-25 | - |

## DEC-OPS-138

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-138 | accepted | **등록·열람·지시의 서버 소유 경계를 바로잡는다(DIP B1b).** ① 분류 그룹·프로그램 등록은 신규 전용이며 같은 식별자가 있으면 409 다. ② 부서 업무의 '부서 전체' 는 소속 부서 업무함의 업무와 내 업무로 좁히고, 상세는 담당자·같은 부서·전체 수정 권한자만 연다(D3). ③ 포상의 승인·감사 필드는 응답 전용이고 새 포상은 대기로 시작한다. ④ 관리자 댓글 목록은 게시판·글 조건이 없으면 전체를 최신순으로 준다. ⑤ 메모보고 지시는 수신자·전체 수정 권한자만 쓰고, 열람일시는 수신자의 첫 열람만 남긴다(D9). | 사용자 위임(2026-09-25). `save()` 가 merge 라 등록이 기존 행을 조용히 덮었고, '부서 전체' 는 조직 전체였으며 번호만 바꾸면 다른 부서 업무가 열렸다. 등록 권한만 있으면 승인 완료 포상을 만들 수 있었고, 관리자 댓글 탭은 `bbs_id = NULL` 조건으로 늘 비었으며, 작성자가 수신자의 지시를 덮고 자기 열람으로 '열람됨' 을 만들었다. 관리자 판정은 새 권한을 만들지 않고 각 도메인의 전체 수정 권한을 쓴다. red 증명: 수정마다 되돌리면 새 테스트만 실패한다. | [DeptJobService](../../business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java), [MemoReportService](../../business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java), [RewardManageService](../../business-app/src/main/java/nuri/business/service/reward/RewardManageService.java) | 2026-09-26 | - |

## DEC-OPS-139

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-139 | accepted | **게시글 추천과 만족도를 한 사람당 한 번으로 묶는다(DIP B1b).** ① 추천 이력 `tb_bbs_rcmdtn_hstry`(게시글·사용자 esntlId 복합 PK)를 두고, 추천은 댓글과 같은 열람 가드(게시판 일치·커뮤니티 회원·비밀글)를 지난 뒤 한 번만 센다. 두 번째는 409 다. ② 만족도는 `uk_tb_dgstfn_info_pst_rgtr`(게시판·글·작성자)로 1인 1건이며, 스스로 지운 평가는 같은 행을 되살린다. 점수는 필수 1~5(DTO·DB CHECK)다. ③ V2_107 은 기존 중복·범위 밖 점수가 있으면 멈추고 행을 지우거나 고치지 않는다. | 사용자 위임(2026-09-25). 추천은 카운터만 올려 읽을 수 없는 글도 번호로 추천할 수 있었고 같은 사람이 반복할 수 있었다. 만족도는 한 사람이 평가를 여러 개 남겨 평균을 움직일 수 있었고 점수가 없으면 500 이었다. 2026-09-26 OCI 읽기 실측: 만족도 0행·중복 0. 이 변경 전 like_cnt 는 이력이 없어 그대로 둔다. red 증명: 수정마다 되돌리면 새 테스트만 실패한다. | [V2_107](../../api-server/src/main/resources/db/migration/V2_107__add_recommendation_history_and_rating_unique.sql), [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [SatisfactionService](../../business-app/src/main/java/nuri/business/service/board/SatisfactionService.java) | 2026-09-26 | - |

## DEC-OPS-140

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-140 | accepted | **화면은 서버가 싣는 값만 읽는다(DIP B2).** ① 업무 홈 카드는 게시판 전체 글 수를 싣고(`taskListTotal`·`notiListTotal`, 조회 실패는 null), 목록 날짜는 `crtDt` 다. 실패는 '0건'·'글 없음' 이 아니라 '조회 실패'·'불러오지 못함' 이다. ② '최근 활동' 은 카드 위 토큰으로 바꿔 보이게 한다. ③ 실시간 카드는 '실시간 연결 세션(이 서버)'·'누적 연결(이 서버, 재기동 이후)' 로 부른다. ④ 지식 허브·게시글 상세의 작성자·날짜는 `userNm`·`crtDt` 이고, 늘 null 이던 `BoardDto`·`CommunityDto` 의 `frstRegisterNm` 과 서버가 보내지 않는 레거시 폴백을 걷는다. ⑤ 정직성 계약이 생산 소스 전체에서 생성 API 타입에 없는 레거시 응답 필드 이름을 막는다. ③의 누적 전제는 [후속 정정](../04-operations/readiness-followups.md#실시간-연결-표시-정정-2026-09-27)을 따른다. | 사용자 위임(2026-09-25). 목록 날짜·작성자가 늘 '-' 였고 카드 수치는 늘 5 이하였으며 조회 실패가 '0건' 으로 보였다. 테스트 표본이 서버가 보내지 않는 필드를 넣어 단위 테스트는 모두 초록이었다. `분당 방문` 은 1분마다 초기화되지 않는 누적 수였다. red 증명: 수정마다 되돌리면 새 테스트만 실패한다. | [BoardDashboardProvider](../../business-app/src/main/java/nuri/business/service/board/BoardDashboardProvider.java), [업무 홈](../../frontend/src/app/UnifiedDashboardClient.tsx), [정직성 계약](../../frontend/src/__tests__/cross-stack/honest-affordance-contract.test.ts) | 2026-09-26 | - |

## DEC-OPS-141

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-141 | accepted | **쪽지와 메일 이력이 사람을 이름으로 보인다(DIP B2).** ① 받은 쪽지 목록·상세는 발신자 이름을, 보낸 쪽지 목록·상세는 수신자 이름과 수신자별 읽음을 싣는다. 이름은 페이지 단위로 한 번에 조회하고 연락처는 싣지 않는다. 찾지 못한 사용자는 식별자 대신 "알 수 없는 사용자"로 말한다. ② 받은 쪽지 미읽음 수 API(`GET /notes/received/unread-count`, NOTE_READ)를 두고 받은 쪽지함이 그 수를 알린다. ③ 답장은 원 발신자를 수신자 칩으로 넣는다. ④ 메일 이력의 발신자 칸에 발신자 이름을 저장하고, 이력 화면이 발신자를 보이며 발신자로도 검색한다. 이미 쌓인 이력은 바꾸지 않는다. | 사용자 위임(2026-09-25)이다. DTO 가 이름 필드를 선언만 하고 채우지 않아 화면이 내부 식별자(esntlId)를 이름 자리에 보였고, 답장은 제출 값에만 수신자를 넣어 칩이 비어 보였다. 메일 발신자 칸에도 식별자가 저장돼 이력의 발신자 검색이 이름으로 한 건도 찾지 못했다. 쪽지→사용자 이름 해석으로 app→core edge 가 하나 늘었다. | [NoteService](../../business-app/src/main/java/nuri/business/service/note/NoteService.java), [쪽지 화면](../../frontend/src/app/note/page.tsx), [MailService](../../business-app/src/main/java/nuri/business/service/mail/MailService.java), [메일 이력](../../frontend/src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx) | 2026-09-26 | - |

## DEC-OPS-142

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-142 | accepted | **게시판 화면이 일반 사용자에게 제목·템플릿·본문·행사 일정을 보인다(DIP B2).** ① 인증 사용자용 게시판 메타 API(`GET /boards/{bbsId}/meta`, BOARD_READ)를 두고 게시글 목록·상세가 관리자 API 대신 이를 쓴다. 운영 필드는 싣지 않고, 커뮤니티 귀속 게시판은 목록·상세와 같은 회원 가드를 지난다. ② FAQ 답은 펼칠 때 상세 API 로 받아 게시글 상세와 같은 살균기로 그리고, 늘 빈 줄이던 위키 미리보기는 걷는다. ③ 목록 조회에 기간 기준(`dateBasis`, 비우면 작성일·`EVENT` 면 행사일이고 행사일이 없으면 작성일)을 두고, 캘린더는 보이는 달의 첫날~마지막 날을 행사일 기준으로 최대 100건 받으며 넘으면 일부만 표시한다고 알린다. | 사용자 위임(2026-09-25)이다. 일반 사용자는 관리자 메타 API 에 403 이라 제목 대신 '게시판', 템플릿 대신 기본 목록형이 보였다. 목록 응답에는 본문이 없어 FAQ 답이 모두 빈 칸이었다. 캘린더는 달 이동이 시작일만 실어 작성일이 그 뒤인 글을 10건씩 받아, 지난달에 등록한 이달 행사가 사라지고 11번째 일정부터 보이지 않았다. 어휘 밖의 기간 기준은 400 이다. | [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [BoardPredicate](../../business-app/src/main/java/nuri/business/domain/board/BoardPredicate.java), [게시판 템플릿](../../frontend/src/app/admin/community/boards/select-board-list/components/BoardTemplates.tsx), [목록 화면](../../frontend/src/app/admin/community/boards/select-board-list/BoardListClient.tsx) | 2026-09-26 | - |

## DEC-OPS-143

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-143 | accepted | **투표·설문 화면이 참여 여부와 실제 응답을 보인다(DIP B2).** ① 투표 참여 화면은 서버가 싣는 `hasVoted` 로 이미 참여한 투표를 결과로 열고 참여 완료를 표시한다. 참여 경로의 오류 문구는 '설문' 대신 '투표' 로 말하고, 만족도 조사 관리와 공유하는 날짜 검증 문구는 중립으로 둔다. ② 설문 상세는 응답 전용 `responded`(로그인 ID 축, 판정 불가는 null)로 이미 응답했음을 열 때 알리고 입력을 잠그며, 제출하면 통계 캐시를 무효화한다. ③ 응답자 이름은 인증 주체에서 채우고 요청 본문의 이름은 쓰지 않는다. ④ 항목 비율의 분모는 문항 응답자 수이고 화면이 그 기준을 밝힌다. ⑤ '기타' 답은 응답 관리 목록·상세에 보인다(전체 공개 통계에는 싣지 않는다). | 사용자 위임(2026-09-25)이다. 참여 화면이 hasVoted 를 읽지 않아 참여한 투표를 다시 열면 제출해야 거부됐고, 설문도 다 고른 뒤에야 중복 응답이 거부됐다. 화면이 이름을 보내지 않아 응답 관리의 이름 열·검색이 늘 비었고, 복수선택 문항은 선택 합계로 나눠 모두가 고른 항목도 50% 로 보였다. 기존 응답의 빈 이름은 소급해 채우지 않는다. | [OnlinePollService](../../business-app/src/main/java/nuri/business/service/survey/OnlinePollService.java), [SurveyResultService](../../business-app/src/main/java/nuri/business/service/survey/SurveyResultService.java), [SurveyService](../../business-app/src/main/java/nuri/business/service/survey/SurveyService.java), [설문 상세](../../frontend/src/app/survey/[id]/SurveyDetailClient.tsx) | 2026-09-26 | - |

## DEC-OPS-144

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-144 | accepted | **화면 문구·상태를 서버 판정과 같게 말한다(DIP B2, 화면 10건).** ① 하위 메뉴가 있는 메뉴는 삭제를 묻지 않고 거부 이유를 알린다. ② 팝업 '게시 중' 은 게시 기간까지 보고, '오늘 하루' 숨김은 자정까지이며 저장소 예외가 팝업을 막지 않는다. ③ 커뮤니티 상세에서 개설자 로그인 ID 를 걷는다. ④ 지식 허브 검색 안내는 제목, 템플릿 분류는 모르는 코드를 원문으로 말한다. ⑤ 통계 새로고침 표시는 실제 재조회에 묶는다. ⑥ 게시글 저장 실패는 403·413·415·400 필드·기타 4xx 사유를, 상세 403 은 재시도 대신 권한 안내를 보인다. ⑦ 명령 센터는 통합 검색 제안을 늘 두고 combobox 로 선택을 알리며, 통합 검색은 1글자면 2자 이상이 필요하다고 안내한다. | 사용자 위임(2026-09-25)이다. 화면이 서버가 거부할 삭제를 약속했고, 끝난 팝업을 게시 중이라 했으며, 모든 회원에게 개설자 계정 ID 를 보였다. 저장 실패 사유와 403 이 한 문장으로 뭉개져 사용자가 다음 행동을 고를 수 없었다. 서버가 1글자에 빈 목록을 줘 '결과 없음' 으로 보였다. transport 원문은 계속 숨긴다. | [MenuAdminClient](../../frontend/src/app/admin/system/menus/MenuAdminClient.tsx), [popup-status](../../frontend/src/lib/popup-status.ts), [boardActions](../../frontend/src/app/actions/boardActions.ts), [명령 센터](../../frontend/src/app/components/ui/global-command-center.tsx), [통합 검색](../../frontend/src/app/search/SearchClient.tsx) | 2026-09-26 | - |

## DEC-OPS-145

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-145 | accepted | **서버가 판정하거나 기록한 값을 화면이 그대로 말한다(DIP V9 서버 항목).** ① 행사 삭제는 외부인사가 남아 있으면 409 로 건수를 밝혀 거부하고 화면이 그 사유를 보인다. ② 권한 변경 이력의 처리자 검색은 로그인 ID 와 사용자 식별자를 함께 보고, 응답에 대상·처리자 이름을 싣는다. ③ SMS 발송 상태가 배포에 등록된 발신 번호를 알리고, 작성 화면은 그 번호를 보이는 칸에 기본값으로 둔다. 메시지 바이트 수도 보인다. ④ 업무보고 번호는 전체 건수에서 거꾸로 세고 보고 일자는 날짜 형식으로 보인다. | 사용자 위임(2026-09-25)이다. 행사 삭제는 외래 키 오류로 끝났고, '변경자 로그인 ID' 칸은 식별자만 비교해 늘 0건이었다. SMS 작성 화면에는 발신 번호 칸이 없어 예시 번호가 몰래 실려 갔다. 발신 번호가 설정되지 않은 배포는 값을 지어내지 않고 입력을 요구한다. 도달할 수 없는 옛 문자 화면은 DEC-OPS-023 ①에 따라 고치지 않았다. red 증명: 수정마다 되돌리면 새 테스트만 실패한다. | [EventInfoService](../../business-app/src/main/java/nuri/business/service/event/EventInfoService.java), [권한 이력](../../business-core/src/main/java/nuri/business/service/auth/AuthorizationAdministrationService.java), [SMS 작성](../../frontend/src/app/admin/uss/ion/sms/SmsAdminClient.tsx) | 2026-09-26 | - |

## DEC-OPS-146

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-146 | accepted | **생성 응답을 손으로 쓴 타입으로 다룰 때 서버가 보내지 않는 필드를 선언하지 못하게 한다(DIP V10).** 생성 경계 census 의 `--check` 와 운영 계약에 타입 검사기 기반 응답 모양 검사를 더한다. 생성 실행기 호출마다 결과를 다루는 타입(캐스트·선언된 반환 타입·타입 주석 변수·함수 인자, 타입 주석 없는 변수의 그런 쓰임)과, 받은 응답을 다시 캐스팅하는 곳의 필드가 생성 응답 타입에 있어야 한다(배열·페이지·중첩 포함). 예외 목록은 없고 결과가 any/unknown 인 호출도 red 다. 같은 변경에서 위반 14곳(지식 게시글·주소록·메뉴·사용자·도움말·프로그램 타입의 서버에 없는 필드와 화면의 폴백 읽기)을 걷었다. | 사용자 위임(2026-09-25). 선택 필드는 대입 호환이라 tsc 가 막지 않아, 서버가 보내지 않는 필드를 화면이 읽어도 초록이었다(DEC-OPS-140). 새 게이트 대신 요청 경계만 보던 census 를 넓혔다. 이름 목록으로 막는 정직성 계약(DEC-OPS-140 ⑤)은 타입이 없는 경로의 읽기를 잡으므로 남긴다. DOM·요청 본문 캐스트는 응답 경로가 아니라 보지 않는다. red 증명: 지식 게시글 타입에 필드 하나를 되돌리면 두 호출이 red, 픽스처 4종 red·대조군 green. | [census](../../scripts/generated-boundary-census.mjs), [계약](../../scripts/generated-boundary-census.test.mjs) | 2026-09-26 | - |

## DEC-OPS-147

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-147 | accepted | **목록 화면의 공통 상태를 서버 응답과 맞춘다(DIP B3 C1~C4).** ① 앱 QueryClient 는 페이지 모양 응답(`{list,total}`)에 한해 새 페이지를 불러오는 동안 이전 페이지를 유지한다. 배열·단건은 다른 항목의 것처럼 보일 수 있어 제외한다. ② 5xx 는 최초 로드일 때만 오류 경계로 올리고, 같은 목록 계열의 다른 페이지가 이미 그려졌으면 표의 error/onRetry 로 처리한다. ③ 표의 선택은 현재 행과의 교집합으로 읽고 사라진 키는 저장된 선택에서도 지운다. 헤더 체크박스는 전체·일부(aria-checked=mixed)·없음으로 보인다. ④ 현재 페이지가 마지막 페이지를 넘으면 조회가 끝난 뒤 한 번 되돌린다(표·결재함). | 사용자 위임(2026-09-25). 조회 중 '총 0건' 과 페이저 깜빡임, 다음 페이지 5xx 의 화면 전체 교체, 일괄 삭제 뒤 '선택 항목 N개' 잔존, 마지막 페이지 처리 뒤 빈 대기함 갇힘을 고친다. 조회 중·오류일 때는 총 페이지가 초기값이라 되돌리지 않는다(딥링크 보존). red 증명: 수정마다 되돌리면 새 테스트 7건만 실패한다. | [목록 기본값](../../frontend/src/lib/query/list-query-defaults.ts), [페이지 되돌림](../../frontend/src/lib/hooks/use-page-clamp.ts), [표](../../frontend/src/app/components/ui/standard-data-table.tsx) | 2026-09-26 | - |

## DEC-OPS-148

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-148 | accepted | **조회 조건과 목록 순서를 서버가 확정한다(DIP B3 C6·C7).** ① 로그 조회 5종은 역순 기간을 0건이 아니라 400 으로 거부한다(`LogSearchPeriod.requireOrdered`). 기간 컨트롤은 누른 프리셋을 눌린 상태로 보이고, 한쪽 날짜만 넣었거나 역순이면 안내한다. 초기화는 검색어와 기간을 함께 비운다(로그 6화면). 로그 통합 조회에도 기간과 전체 결과 반출을 둔다. ② 메모보고·부서 업무 목록은 정렬이 없으면 최신순, 월간·기간 일정은 시작일·등록 순, 글의 댓글은 등록순으로 읽는다. 상세는 첫 100개 댓글만 받으므로 전체 수로 말하고 나머지가 있음을 알린다. | 사용자 위임(2026-09-25). 역순 기간은 오류 없이 0건이 되어 입력 실수를 사실로 읽게 했고, 정렬 없는 페이지 조회는 페이지 사이에 항목이 겹치거나 빠질 수 있었다. 서비스는 요청이 정렬을 주면 그것을 따른다. red 증명: 수정마다 되돌리면 새 테스트만 실패한다(백엔드 5, 프런트 11). | [기간 판정](../../business-core/src/main/java/nuri/business/domain/log/LogSearchPeriod.java), [기간 컨트롤](../../frontend/src/app/components/patterns/period-filter.tsx), [기간 계약](../../frontend/src/__tests__/cross-stack/log-period-filter-contract.test.ts) | 2026-09-26 | - |

## DEC-OPS-149

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-149 | accepted | **저장하지 않은 계층 변경을 지키고, 순서는 형제 안에서 매긴다(DIP B3 C5).** ① 부서·메뉴 트리는 저장하지 않은 드래그가 있는 동안 다시 읽힌 목록으로 덮지 않고, 목록이 바뀌었다고 알리며 '변경 취소'를 둔다. 변경이 있으면 화면 이탈 전에 확인한다. ② 부서 계층 저장은 서버에서 읽은 기준선과 달라진 부서만, 형제 안 상대 순서로 보낸다. ③ 순서를 정하지 않은 새 부서는 같은 상위 아래 형제의 맨 뒤에 두고, 등록 폼에서 상위 부서를 고른다. | 사용자 위임(2026-09-25). 종전에는 등록·삭제 뒤 새로고침이 드래그를 조용히 지웠는데 '변경됨' 은 남아 저장이 아무것도 바꾸지 않았다. 검색으로 좁힌 화면에서 저장하면 전체 순번(1..n)이 여러 형제 집합의 순서를 함께 망가뜨렸고, 새 부서는 0 으로 저장돼 형제의 맨 앞에 끼어들었다. red 증명: 수정마다 되돌리면 새 테스트만 실패한다(백엔드 1, 프런트 10). | [부서 트리](../../frontend/src/app/admin/user/useDeptTree.ts), [계층 비교](../../frontend/src/app/admin/user/departments/treeUtils.ts), [부서 등록](../../business-core/src/main/java/nuri/business/service/department/DeptManageService.java) | 2026-09-26 | - |

## DEC-OPS-150

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-150 | accepted | **업무 흐름이 사용자가 있던 자리를 지킨다(DIP B3 C8).** ① 결재를 처리하면 처리한 문서의 바로 다음 문서로 넘어가고, 마지막이었으면 바로 앞 문서로 간다. ② 게시글 저장 뒤 이동은 작성 화면을 방문 기록에서 바꿔 끼워, 뒤로 가기가 URL 에 실린 목록 맥락으로 돌아간다. ③ 여러 날에 걸친 일정은 달력의 모든 날짜에 표시한다(한 일정당 최대 366일). ④ 목록과 상세가 쌓이는 좁은 화면에서 항목을 누르면 상세로 스크롤하고 포커스를 옮긴다. 쌓였는지는 너비 질의가 아니라 실제 배치로 판정한다(ADR-0006). ⑤ 확인 대화상자가 열린 채 다른 확인을 부르면 앞의 확인은 취소로 끝난다. | 사용자 위임(2026-09-25). 종전에는 처리 뒤 늘 맨 위 문서로 갔고, 저장 뒤 뒤로 가기가 끝난 폼으로 돌아갔으며, 둘째 날부터 일정이 달력에서 비어 보였고, 좁은 화면에서 선택만 바뀌었고, 앞의 확인 Promise 가 영원히 끝나지 않아 잠금이 풀리지 않았다. red 증명: 수정마다 되돌리면 새 테스트 8건만 실패한다. | [확인 대화상자](../../frontend/src/app/components/ui/confirm-modal.tsx), [마스터·상세](../../frontend/src/app/components/patterns/master-detail-page.tsx), [일정 기간](../../frontend/src/lib/date/schedule-span.ts) | 2026-09-26 | - |

## DEC-OPS-151

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-151 | accepted | **목록 조회 조건은 `조회`/Enter 로 적용한다(DIP B3 C9, 카탈로그 G2).** 셸(WorkListPage) 경유 12화면(행사·지식 허브·메모보고·권한 사용자 배정·사용자 분류 그룹·로그인 정책·설문 관리·온라인 투표·기관 코드·사용자/조직 허브·문자·온라인 매뉴얼)이 입력 디바운스로 목록을 조회하던 것을 KeywordFilter 로 옮긴다. A1 채택 census 가 셸 화면의 입력 디바운스 조회를 예외 없이 막는다. 입력 뒤 결과를 기다리던 e2e 3곳은 Enter 를 누른다. 옮긴 4화면의 빈 상태 문구는 공용 `emptyResultMessage` 로 맞춘다(G15) — 권한 사용자 배정은 검색어가 없어도 '검색 결과가 없습니다' 라 말했다. | 사용자 위임(2026-09-25). W3 는 조회 시점을 통일했다고 기록했지만 게이트가 없어 12화면이 남았다. 사용자/조직 허브는 디바운스 때문에 조회 버튼을 두지 않았는데(G10), 이제 조회 버튼이 조건을 적용하는 유일한 경로라 G10 과 충돌하지 않는다. 카탈로그를 되돌릴 근거는 나오지 않았다. red 증명: 셸 화면에 디바운스를 되살리면 census 가, 검색 적용을 끊으면 행동 테스트가 red. | [A1 census](../../frontend/src/__tests__/work-list-adoption-census.test.ts), [KeywordFilter](../../frontend/src/app/components/patterns/keyword-filter.tsx), [카탈로그 §6](../02-architecture/work-screen-grammar-catalog.md) | 2026-09-26 | - |

## DEC-OPS-152

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-152 | accepted | **관리 화면으로 가는 링크·버튼은 라우트 게이트와 같은 판정으로 보인다(DIP B4 P1).** 화면용 `canOpenPage(주체, 목적지)`(`page-access.ts`)가 proxy 와 같은 `canEnterRegisteredPage` 를 부른다. 대시보드·분석 배너·워크허브·게시판 마법사·게시판 관리·게시판 목록·지식 허브·설문 허브·여론조사 목록·레이아웃·사용자 허브·정책 패널·헤더의 관리 링크 23곳을 이 판정으로 옮기고, 새 census 가 `/admin` 목적지(href·link·push·replace)를 전수로 센다 — 목적지가 열려 있거나 출발 화면 권한이 목적지를 함축하지 않으면 같은 목적지로 `canOpenPage` 를 불러야 한다. | 사용자 위임(2026-09-25). 워크허브 '메모보고 관리' 는 업무함 권한으로 보였고 목적지는 메모보고 전체 조회 권한을 요구해 누르면 홈으로 튕겼다(DEC-OPS-023 ②). 대시보드 권한만 가진 사람에게도 사용자·권한·감사 화면 링크가 보였다. 노출일 뿐 인가가 아니며 서버 권한은 그대로다(H3). 변수로 조립한 목적지는 세지 않는다. red 증명: 판정을 다른 목적지로 바꾸면 census 와 행동 테스트가, 쿼리를 떼지 않으면 단위 테스트가 red. | [page-access](../../frontend/src/lib/auth/page-access.ts), [진입 판정](../../frontend/src/lib/auth/page-authorization.ts), [링크 census](../../frontend/src/__tests__/admin-link-visibility-census.test.ts), [proxy](../../frontend/src/proxy.ts) | 2026-09-26 | - |

## DEC-OPS-153

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-153 | accepted | **알림 센터를 서버 페이지로 보이고, 실시간 구독은 헤더 한 곳만 둔다(DIP B4 P2).** ① `/admin/notifications` 의 라우트 권한을 NOTI_READ 로 바꾸고 발송 버튼만 NOTI_DISPATCH 로 둔다. ② 목록은 서버 페이지·검색어(조회/Enter)·읽음 조건(`readYn`, Y·N 밖은 400)으로 조회하고, 행에서 열기·읽음·삭제를 한다. 제목 추론 분류로 거르던 '보안 알림' 탭은 걷는다. ③ `POST /notifications/read-all`(STRICT_SELF, NOTI_ACK)이 받은 미읽음 전부를 한 번의 UPDATE 로 옮기고 건수를 돌려주며, 드로어의 '모두 읽음' 도 이것을 쓴다. ④ 센터는 헤더 훅을 다시 띄우지 않고, 양쪽 변경은 창 이벤트로 서로 다시 읽는다. 헤더의 60초 되맞춤은 탭이 숨으면 멈추고 다시 보이면 곧바로 한 번 돈다. 드로어에 센터로 가는 길을 둔다. | 사용자 위임(2026-09-25). 센터는 드로어가 불러온 첫 10건만 보였고 검색·탭도 그 안에서만 걸렀으며, 발송 권한이 없으면 들어올 수 없었다. 같은 개인 큐를 두 번 구독해 새 알림 토스트가 두 번 떴다. red 증명: 수신자 조건·읽음 조건·값 검사를 되돌리면 백엔드 3건이, 숨은 탭 건너뛰기·서버 조건·동기 잠금을 되돌리면 프런트 테스트가 red. | [NotificationService](../../business-app/src/main/java/nuri/business/service/notification/NotificationService.java), [알림 센터](../../frontend/src/app/components/ui/smart-notification-hub.tsx), [변경 신호](../../frontend/src/lib/notifications/notification-sync.ts) | 2026-09-26 | - |

## DEC-OPS-154

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-154 | accepted | **메모보고를 일반 사용자에게 열고, 받은 보고와 지시를 알리며, 지시가 달린 본문은 고치지 않는다(DIP B4 P3·P9, D9).** ① `/admin/operation/memo-reports` 라우트 권한을 MEMO_RPT_READ 로 낮춘다. 전체 보고 탭은 종전대로 MEMO_RPT_READ_ALL 에만 보인다. ② 보고를 올리면 받은 사람에게, 지시가 달리면 보고한 사람에게 커밋 뒤 알린다. 자기에게 보낸 보고·자기 지시·지운 지시는 알리지 않고, 목적지는 쿼리 없는 경로다. ③ 지시가 달린 보고는 관리자도 본문을 고칠 수 없다(409). 수정 힌트 `editable` 도 닫고 화면이 사유를 말한다. ④ 업무 보고는 받는 사람이 없는 개인 업무 기록이라고 설명을 정정한다. 탭 이름은 메뉴 어휘(V2_27)를 따라 두고 수신자 기능은 만들지 않는다. | 사용자 위임(2026-09-25). 메모보고는 조회 대행 권한이 있어야 들어갈 수 있어 일반 사용자가 받은 보고를 볼 화면이 없었고, 보고·지시가 와도 알림이 없었다. 지시 뒤 본문을 바꾸면 지시가 가리키던 내용이 사라진다. 메뉴 배정은 바꾸지 않는다 — 진입은 워크허브 링크(DEC-OPS-152)다. red 증명: 409·두 알림을 되돌리면 새 테스트 3건만 red. | [MemoReportService](../../business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java), [메모보고 화면](../../frontend/src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx), [권한 원장](../../config/governance/permission-catalog.json) | 2026-09-26 | - |

## DEC-OPS-155

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-155 | accepted | **사용자 피커는 사용 중인 계정만 보이고 부재를 표시하며, 결재자 거부 사유에 이름을 싣는다(DIP B4 P4).** ① 담당자·결재자·수신자 검색은 `userSttsCd='P'` 계정만 돌려준다. 승인 대기(A)·사용 중지(D) 계정은 빠진다. ② 검색 결과에 부재 여부(`absent`)를 싣고 사용자 선택기·수신자 피커·부서 업무 담당자·통합 검색이 '부재 중' 을 보인다. 사유·기간은 싣지 않고 고르는 것은 막지 않는다(대결·위임 없음, D10). ③ 사용 중이 아닌 계정을 결재자로 지정하면 대상자 이름을 밝혀 거부한다. 없는 식별자는 종전 문구로 거부하고 식별자를 되돌려 주지 않는다. | 사용자 위임(2026-09-25). 피커가 비활성 계정을 보여 고른 뒤에야 결재 상신이 거부됐고, 여러 결재자 중 누가 문제인지 말하지 않았으며, 부재자에게 업무를 맡겨도 알 길이 없었다. DEC-OPS-095 의 '없거나 비활성이면 같은 문구' 중 비활성 부분만 이름을 밝히도록 바꾼다. red 증명: 상태 조건·부재 판정·이름 거부를 되돌리면 백엔드 4건, 부재 표시를 걷으면 프런트 1건이 red. | [사용자 검색](../../business-core/src/main/java/nuri/business/domain/user/repository/UserRepositoryImpl.java), [UserSearchDto](../../business-core/src/main/java/nuri/business/service/user/dto/UserSearchDto.java), [부재 표시](../../frontend/src/app/components/ui/absence-badge.tsx) | 2026-09-26 | DEC-OPS-095 ①의 비활성 결재자 동일 문구 부분 |

## DEC-OPS-156

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-156 | accepted | **부서 업무·공유 일정은 서버 힌트로 수정·삭제 버튼을 가리고, 전체 열람 권한자는 커뮤니티 게시판 목록을 본다(DIP B4 P5).** ① 부서 업무 응답에 `editable`·`deletable` 을 싣는다 — 쓰기 가드와 같은 규칙(담당자, 공석이면 등록자, 또는 전체 권한)이다. 일정도 같은 이름으로 등록자·전체 권한 판정을 싣는다. ② 부서 업무 상세, 워크허브 일정 탭, 부서 일정 화면은 힌트가 참일 때만 버튼을 그린다. ③ 커뮤니티 게시판 목록은 게시판 진입 게이트가 통과시키는 BOARD_READ_ALL 도 연다. 화면도 같은 판정으로 비회원 관리자에게 목록을 보인다. | 사용자 위임(2026-09-25). 같은 부서 사람에게 보이는 업무·일정에 수정·삭제 버튼이 늘 떠 누를 때마다 403 이 났다. 커뮤니티 목록은 BBS_MST_READ_ALL 만 보고 화면은 회원만 봐서, 게시판에 들어갈 수 있는 관리자가 목록을 보지 못했다. 힌트는 표시일 뿐 인가는 쓰기 경로가 그대로 집행한다(H3). red 증명: 힌트 계산을 되돌리면 새 테스트가 red. | [DeptJobService](../../business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java), [ScheduleService](../../business-app/src/main/java/nuri/business/service/schedule/ScheduleService.java), [BoardMasterService](../../business-app/src/main/java/nuri/business/service/board/BoardMasterService.java) | 2026-09-26 | - |

## DEC-OPS-157

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-157 | accepted | **설문은 모든 문항에 답해야 제출되고, 응답이 모인 문항의 뜻은 바꾸지 않으며, 문항 순번은 서버가 매긴다(DIP B4 P6, D4).** ① 선택지가 있는 문항에 하나라도 답하지 않으면 서버가 400 으로 답하지 않은 문항을 밝히고, 화면은 남은 문항 수를 말하며 제출을 잠근다. ② 응답이 있는 문항의 문구·유형·선택 수와 그 선택지 문구를 바꾸면 409 다. 순번만 바꾸는 것은 허용하고, NULL 과 1 은 같은 '하나만 고르기' 로 본다. ③ 문항 등록 폼이 선택 방식(하나만·여러 개)과 최대 선택 수(2~20)를 묻는다. ④ 순번은 서버가 이 설문의 가장 큰 순번 다음으로 매긴다. 화면도 같은 규칙을 쓴다. | 사용자 위임(2026-09-25). 한 문항만 골라도 제출돼 통계의 문항별 응답 수가 어긋났고, 응답 뒤 문구를 바꾸면 받은 답이 다른 질문의 답이 됐다. 등록 폼은 선택 수를 묻지 않아 모든 문항이 하나만 고르기였고, '문항 수 + 1' 순번은 중간 문항을 지운 뒤 추가하면 겹쳤다. DEC-OPS-095 의 삭제 차단 원칙을 수정으로 넓힌다. red 증명: 필수·409·순번을 되돌리면 새 테스트가 red. | [SurveyService](../../business-app/src/main/java/nuri/business/service/survey/SurveyService.java), [SurveyResultService](../../business-app/src/main/java/nuri/business/service/survey/SurveyResultService.java), [문항 패널](../../frontend/src/app/admin/survey/components/SurveyQuestionsPanel.tsx) | 2026-09-26 | - |

## DEC-OPS-158

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-158 | accepted | **계정 잠금을 관리자가 보고 풀 수 있게 하고, 재발급 실패를 사실대로 말한다(DIP B4 P7, D5).** ① 사용자 상세에 '로그인 잠김' 을 보이고 `PATCH /admin/system/users/{userId}/unlock`(USER_STATUS)으로 푼다. 비밀번호와 세션은 바꾸지 않는다. ② 관리자 비밀번호 초기화는 잠금도 푼다. ③ 재발급 실패·만료 안내는 '다른 곳에서 로그인했거나 세션이 만료되었습니다' 다(단일 세션 유지). ④ 판정: 연속 실패 잠금은 이미 로그인한 세션에도 적용되는 현행을 유지한다. 잠금은 잠금 시간이 지나면 스스로 풀리고 관리자가 즉시 풀 수 있다. 요청마다 잠금을 보는 곳이 인증 보완 소스라 새 로그인 전용으로 바꾸려면 SAST 오탐 결속부터 다시 해야 한다. `dpcnPrmYn` 은 쓰는 곳이 없어 gap 에 적는다. | 사용자 위임(2026-09-25). 잠긴 계정을 관리자가 풀 경로가 없었고, 초기화한 비밀번호도 잠금 시간 동안 쓸 수 없었으며, 다른 곳 로그인으로 끊긴 세션을 '만료' 로만 말했다. red 증명: 초기화의 잠금 해제와 해제 API 를 되돌리면 새 테스트가 red. | [UserService](../../business-core/src/main/java/nuri/business/service/user/UserService.java), [사용자 허브](../../frontend/src/app/admin/user/UserOrgHubClient.tsx), [재발급 BFF](../../frontend/src/app/api/auth/reissue/route.ts) | 2026-09-26 | - |

## DEC-OPS-159

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-159 | accepted | **로그인 정책의 접속 허용 시간을 짝으로만 받고, 소비처 없는 값과 분류 그룹의 성격을 화면이 사실대로 말한다(DIP B4 P8, D10).** ① 접속 허용 시간은 시작·종료를 함께 넣거나 둘 다 비운다. 한쪽만 있으면 서버가 400 으로, 화면이 비어 있는 쪽 칸으로 거부한다. ② 인터넷 서비스 안내의 '반영 여부' 는 저장만 되고 읽는 화면이 없다고 목록 설명과 폼에 적는다. 기능은 만들지 않는다. ③ 사용자 분류 그룹 폼의 '도메인 그룹 식별자·보안 레이어·그룹 정책 명세' 같은 권한처럼 읽히는 문구를 '분류 그룹 ID·이름·분류 기준 설명' 으로 고친다. 그룹은 유지한다. | 사용자 위임(2026-09-25). 시작 시간만 넣으면 시간창 판정이 무엇도 뜻하지 않았고, 소비처 없는 스위치가 효과가 있는 것처럼 보였으며, 권한을 주지 않는 분류 그룹을 보안 설정처럼 불렀다. red 증명: 짝 검사를 되돌리면 백엔드·프런트 새 테스트가 red. | [LoginPolicyManageService](../../business-core/src/main/java/nuri/business/service/login/LoginPolicyManageService.java), [로그인 정책 화면](../../frontend/src/app/admin/security/login-policy/LoginPolicyAdminClient.tsx), 인터넷 서비스 안내(`frontend/src/app/admin/system/isg/InternetSvcGuidanceClient.tsx`, DEC-OPS-372 로 퇴역) | 2026-09-26 | - |

## DEC-OPS-160

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-160 | accepted | **업무 사건을 당사자에게 알린다(DIP B5 F1).** ① 부서 업무 담당자로 지정되면(등록·담당자 변경) 새 담당자에게 알린다. 스스로 맡은 업무는 알리지 않는다. ② 커뮤니티 가입 신청은 `COMMUNITY_APPROVE` 를 그룹으로 가진 사용 중 사용자(최대 20명, 신청자 제외)에게, 승인·반려 결과는 신청자에게 알린다. ③ 결재를 회수하면 차례가 와 있던 결재자에게 알린다. 모든 알림은 커밋 뒤에 나가고, 링크는 원장에 이미 있는 경로(`/smart-toolkit/dept-job/{번호}`·`/admin/help?tab=COMMUNITY`·`/cop/cmy/selectCommunityDetail/{번호}`·`/approvals`)만 쓴다. | 사용자 위임(2026-09-25). 업무를 맡기거나 가입을 신청해도 상대는 화면을 열어 보기 전까지 몰랐고, 회수된 결재는 대기함에서 이유 없이 사라졌다. 권한 보유자 조회는 알림 수신자를 고르는 용도이며 인가 판정이 아니다. red 증명: 네 수정을 되돌리면 새 테스트 4건만 실패한다. | [DeptJobService](../../business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java), [CommunityService](../../business-app/src/main/java/nuri/business/service/community/CommunityService.java), [InformalSanctionService](../../business-app/src/main/java/nuri/business/service/informalsanction/InformalSanctionService.java) | 2026-09-26 | - |

## DEC-OPS-161

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-161 | accepted | **반복 조회를 줄인다(DIP B5 F10).** ① 일별 로그인 통계는 `CRT_DT` 범위로 걸러 V2_97 작성일 인덱스를 쓴다. ② 부서 업무 목록은 업무함·부서·담당자 이름을 페이지 단위로 한 번씩 읽는다. ③ 사이드바 메뉴 트리는 프록시를 거쳐 메뉴 쓰기 때 비우는 `allMenus` 캐시를 읽고, 권한 필터는 매번 새로 본다. ④ 통합 검색·명령 센터는 상위 메뉴 응답의 `children` 을 쓰고 상위 메뉴마다 다시 요청하지 않는다. ⑤ 지식 허브 최근 활동은 기본 목록과 같은 조회를 공유한다. ⑥ 통계 허브는 자료 이용 통계를 그 탭에서만 부른다. 권한 버전 계산은 `tb_authrt_user_map` 기본 키가 대상 컬럼으로 시작해 새 인덱스를 두지 않는다. | 사용자 위임(2026-09-25). 로그인 통계는 컬럼을 문자열로 바꿔 인덱스를 못 썼고, 목록 한 쪽이 최대 60번 더 조회했으며, 메뉴 캐시는 선언만 있고 호출처가 없었다. 호출처 없는 개인별 로그인 통계 3개는 OCI 에 없는 컬럼(LOGIN_ID)을 가리키지만 범위 밖이라 두었다. 캐시는 인스턴스별(10분)이다. red 증명: 여섯 수정을 되돌리면 새 테스트만 실패한다. | [로그인 통계](../../business-core/src/main/java/nuri/business/domain/log/LoginLogRepository.java), [DeptJobService](../../business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java), [MenuService](../../business-core/src/main/java/nuri/business/service/menu/MenuService.java) | 2026-09-26 | - |

## DEC-OPS-162

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-162 | accepted | **로그아웃한 뒤 다음 로그인까지는 인증 경로 밖의 API 요청을 보내지 않는다(DIP B4 회귀 수정).** 로그아웃은 표시 캐시를 비우기 전에 차단 상태로 들어가고, API 클라이언트는 그 상태에서 인증 경로(`auth/`)와 health 밖의 요청을 네트워크 전에 CanceledError 로 취소한다. 다음 로그인이 사용자를 확정하면 차단을 푼다. | B4a(DEC-OPS-152)가 대시보드에 `useAuth()` 를 더한 뒤 main 전수 E2E 의 로그아웃 여정이 두 번 연속 붉었다(1회 실패·1회 재시도 통과). 로그아웃이 캐시를 비우면 사용자 상태를 구독하는 화면이 다시 렌더되며 비워진 조회를 새로 시작했고, 그 요청은 쿠키가 지워진 뒤 도착해 401 → 재발급 401 → `/login?expired=true` 로 번져 정상 로그아웃을 '세션 만료' 처럼 보였다. 서버의 익명 허용 API 는 인증 경로와 health 뿐이라 막아도 잃는 요청이 없다. 사용자 위임(2026-09-25). red 증명: 클라이언트 차단·로그아웃 표시·로그인 해제를 각각 되돌리면 새 테스트만 실패한다. | [차단 상태](../../frontend/src/lib/auth/authorization-state.ts), [API 클라이언트](../../frontend/src/lib/api/client.ts), [AuthContext](../../frontend/src/contexts/AuthContext.tsx) | 2026-09-26 | - |

## DEC-OPS-163

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-163 | accepted | **메뉴 즐겨찾기와 최근 방문을 둔다(DIP B5 F2).** ① `GET/PUT/DELETE /api/v1/menus/bookmarks[/{menuNo}]` 가 인증 주체(esntlId) 본인의 즐겨찾기만 다룬다(STRICT_SELF). 즐겨찾기할 수 있는 메뉴는 지금 메뉴 배정이 있고 사용 중인 메뉴뿐이고, 목록도 같은 판정으로 걸러 배정이 회수된 메뉴는 보이지 않는다. 한 사람 30개까지이며 넘으면 409 다. ② 사이드바 말단 메뉴에 즐겨찾기 토글을 두고, 명령 센터는 검색어가 비면 즐겨찾기와 최근 방문을 먼저 보인다. ③ 최근 방문은 이 브라우저에 사용자별로 메뉴 번호만 남기고, 보일 때 지금 볼 수 있는 메뉴와 맞춰 본다. | 사용자 위임(2026-09-25). 기존 `tb_bkmk_menu_mng_rslt`(OCI 0행)를 쓰므로 마이그레이션이 없다. 메뉴 배정 판정은 사이드바와 같은 `MenuService` 판정을 쓴다 — 새 판정기를 두면 둘이 어긋난다. red 증명: 배정 필터·상한·최근 방문 중복 제거·말단 한정·연타 잠금을 각각 되돌리면 새 테스트만 실패한다. | [MenuBookmarkService](../../business-core/src/main/java/nuri/business/service/menu/MenuBookmarkService.java), [즐겨찾기 훅](../../frontend/src/hooks/api/use-menu-bookmarks.ts), [최근 방문](../../frontend/src/lib/navigation/recent-menus.ts), [명령 센터](../../frontend/src/app/components/ui/global-command-center.tsx) | 2026-09-26 | - |

## DEC-OPS-164

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-164 | accepted | **로그 화면이 마지막으로 고른 기간 프리셋과 페이지당 건수를 기억한다(DIP B5 F3).** 통합 로그와 로그 5종 화면이 `useRememberedListConditions(화면 키)` 로 이 브라우저에 화면별로 남긴다. 기간은 날짜가 아니라 프리셋 이름(최근 1일·1주·1개월)만 남겨 다음 날에는 그날 기준으로 다시 계산하고, 직접 입력한 기간·'전체'·기본 건수는 남기지 않는다. 서버 렌더와 하이드레이션은 기본값이고, 저장소를 쓸 수 없거나 값이 어휘 밖이면 기본값으로 둔다. URL 에는 싣지 않는다(로그 화면의 기간 URL 비노출 계약 유지). | 사용자 위임(2026-09-25). 로그를 볼 때마다 기간과 건수를 다시 골라야 했다. 저장값 읽기는 `useSyncExternalStore` 로 해 effect 안 setState(cascading render)를 두지 않는다(use-today-ymd 선례). red 증명: 저장값 적용·프리셋 기억·화면 연결을 각각 되돌리면 새 테스트만 실패한다. | [기억 훅](../../frontend/src/lib/hooks/use-remembered-list-conditions.ts), [로그 화면 계약](../../frontend/src/app/admin/system/logs/__tests__/log-clients.contract.test.tsx) | 2026-09-26 | - |

## DEC-OPS-165

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-165 | accepted | **결재함 세 목록을 제목·요청일 기간·문서 상태로 좁히고 대기 건수를 탭에 보인다(DIP B5 F4).** ① `/approvals/pending·my·processed` 가 선택 조건 `keyword`(제목 부분일치, 100자)·`fromYmd`·`toYmd`(요청일 포함 범위, yyyyMMdd 또는 yyyy-MM-dd)를, 내가 올린·처리한 목록은 `status`(A·C·R·W)를 받는다. 역순·형식 오류·어휘 밖 값은 400 이고, 제목의 `%`·`_` 는 글자로 찾는다(LIKE `escape '!'`). 대기함은 상태 조건을 받지 않는다. ② 화면은 제목(조회/Enter)·요청일 기간·상태 조건을 두고, 대기 탭에 조건과 무관한 전체 대기 건수를 배지와 `aria-describedby` 로 보인다. 조건 결과가 없으면 '조건에 맞는 결재가 없습니다' 다(G15). | 사용자 위임(2026-09-25). 결재함은 페이지만 넘길 수 있어 오래된 문서를 찾으려면 끝까지 넘겨야 했고, 대기 탭을 열기 전에는 처리할 건이 있는지 알 수 없었다. ⚠ 첫 구현의 `escape '\'` 는 Java 문자열에서 작은따옴표 이스케이프와 겹쳐 JPQL 이 빈 이스케이프 문자로 읽었다 — 목으로 막은 단위 테스트는 통과했고 실 Postgres 통합 테스트의 앱 시작 검증이 잡았다. red 증명: 이스케이프·역순 기간·컨트롤러 연결·저장소 날짜 조건과 화면의 조건 전달·빈 결과 문구·배지 설명을 각각 되돌리면 새 테스트만 실패한다. | [ApprovalListFilter](../../business-app/src/main/java/nuri/business/service/informalsanction/ApprovalListFilter.java), [저장소](../../business-app/src/main/java/nuri/business/domain/informalsanction/InformalSanctionRepository.java), [결재함](../../frontend/src/app/approvals/ApprovalHubClient.tsx) | 2026-09-26 | - |

## DEC-OPS-166

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-166 | accepted | **사용자 목록을 계정 상태·소속 부서·로그인 잠금으로 좁히고, 부서 상세가 소속 인원을 보인다(DIP B5 F4).** ① `GET /admin/system/users` 가 `userSttsCd`(P·A·D)·`ognzId`(직속)·`lckYn`(Y·N, N 은 값 없는 행 포함)을 받고 어휘 밖 값은 400 이다. 검증은 domain 의 `UserListFilter` 가 한다. ② 목록 응답에 상태·부서·잠금을 싣고 사용자 탭에 열과 조건을 둔다. 부재 탭은 조건을 두지 않는다. 조건 결과가 없으면 '조건에 맞는 사용자가 없습니다' 다(G15). ③ 부서 상세는 직속 소속 인원 수와 앞 20명의 이름을 보인다. ④ 관리자 사용자 서비스가 버리던 `lckYn` 을 보존한다. | 사용자 위임(2026-09-25). 목록이 상태·부서를 싣지 않아 승인 대기·잠긴 계정을 한 명씩 열어 찾아야 했다. 응답 매핑 whitelist 에 `lckYn` 이 없어 잠금 해제 버튼(B4g)이 잠긴 계정에서도 보이지 않았다 — 화면 테스트는 서비스를 목으로 막아 이 손실을 보지 못했다. 필터 레코드를 처음 service 패키지에 두자 ArchitectureTest 가 domain→service 의존으로 잡았다. red 증명: 백엔드 3건, 프런트 6건. | [UserRepositoryImpl](../../business-core/src/main/java/nuri/business/domain/user/repository/UserRepositoryImpl.java), [UserListFilter](../../business-core/src/main/java/nuri/business/domain/user/repository/UserListFilter.java), [사용자 허브](../../frontend/src/app/admin/user/UserOrgHubClient.tsx), [UserAdminService](../../frontend/src/services/foundation/system/UserAdminService.ts) | 2026-09-26 | - |

## DEC-OPS-167

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-167 | accepted | **쪽지를 전달할 수 있고, 수신자 피커의 주소록 탭이 모든 주소록을 보인다(DIP B5 F4).** ① 받은·보낸 쪽지 상세에 '전달'을 둔다. 받는 사람은 비우고 제목에 `Fwd:` 를 한 번만 붙이며, 본문 아래에 보낸 사람(보낸 쪽지는 받은 사람)·날짜·제목·원문을 인용한다. 이름을 모르면 식별자 대신 '알 수 없는 사용자' 다. 인용으로 4000자를 넘으면 잘라 내지 않고 발송 검증이 알린다. ② 주소록 어댑터가 서버 총 건수까지 100건씩 페이지를 넘겨 읽는다. 총 건수가 없으면 덜 찬 페이지에서, 언제나 빈 페이지에서 멈추고 폭주 방지 상한(100쪽)을 둔다. | 사용자 위임(2026-09-25). 쪽지는 답장만 있어 받은 내용을 다른 사람에게 넘기려면 본문을 손으로 옮겨야 했다. 주소록 어댑터는 첫 페이지 50건만 읽어 51번째 주소록부터 피커에 나타나지 않았고 화면은 그 사실을 말하지 않았다. 부서 단위 수신자 선택(F5)은 관리자 사용자 목록의 부서 조건(DEC-OPS-166)에 기대므로 다음 변경으로 나눈다. red 증명: 주소록 3건, 전달 2건. | [쪽지 화면](../../frontend/src/app/note/page.tsx), [주소록 어댑터](../../frontend/src/services/business/user/addressbook/recipient-address-book-source.ts) | 2026-09-26 | - |

## DEC-OPS-168

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-168 | accepted | **메일을 다시 보낼 수 있고, 보내기 전에 SMTP 미설정을 알린다(DIP B5 F7).** ① `POST /mails/{sn}/resend`(MAIL_SEND·발신자 본인만)는 실패했거나 대기에 10분 넘게 멈춘 메일을 같은 이력으로 다시 보낸다. 상태 확인과 대기 전환은 UPDATE 한 번이다. ② V2_108 이 `tb_email_dsptch_manage.rcvr_id` 를 더하고 사용자 수신자의 esntlId 를 남긴다. 재발송은 그때 등록된 주소로 보내며, 주소는 여전히 저장하지 않는다(DEC-OPS-134). 이름만 남은 옛 행은 400 이다. ③ 응답의 `resendable` 이 버튼을 가른다. ④ `GET /mails/delivery-status` 로 작성 화면이 SMTP 미설정을 미리 알린다. ⑤ 이력 줄에 받는 사람을 보이고 1초 시계를 걷는다. | 사용자 위임(2026-09-25). 실패하거나 멈춘 메일을 다시 보낼 길이 없었다(OCI 대기 311건). 이력이 수신자를 이름으로만 남겨 재발송할 주소를 찾을 수 없었고, 여럿에게 보낸 메일의 이력 줄은 서로 구분되지 않았다. 핸들러 이름이 문자 쪽과 같아 기존 연산 ID 가 `_1` 로 바뀐 것을 api-docs 대조로 잡아 `getMailDeliveryStatus` 로 고쳤다. 폼 census 가 `resend` 를 쓰기로 보지 못해 동사를 더했다. red 증명: 백엔드 5건, 프런트 4건. | [MailService](../../business-app/src/main/java/nuri/business/service/mail/MailService.java), [V2_108](../../api-server/src/main/resources/db/migration/V2_108__add_mail_recipient_id.sql), [이력 화면](../../frontend/src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx) | 2026-09-27 | - |

## DEC-OPS-169

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-169 | accepted | **주소록 구성원은 번호로 가리고, 상세 화면에서 추가·수정·삭제한다(DIP B5 F8).** ① 구성원 `userId` 는 서버 소유 읽기 전용이다. 요청에서 받지 않고 새 구성원은 비워 둔다(연결할 사용자 검색은 두지 않는다 — PD-ADBK-001). ② 수정은 구성원을 `adbkMbrSn` 으로 가린다. 번호가 있으면 고치고 없으면 추가하며 목록에 없는 구성원은 지운다. 이 주소록의 구성원이 아니거나 두 번 나온 번호는 400 이다. ③ 이메일 상한은 컬럼과 같은 320자다. ④ 상세 화면에서 구성원을 추가·수정·삭제하면 바로 저장한다. 화면이 묻지 않는 집 전화·팩스도 기존 값을 되돌려 보낸다. | 사용자 위임(2026-09-25). 등록 화면이 작성자 자신의 ID 를 모든 구성원에 넣었고, 수정은 그 값으로 구성원을 대조해 구성원이 둘 이상이면 서로를 덮었다(OCI 67행 중 값이 있는 1행이 작성자 ID). 필수 규칙이 틀린 값을 강제한 것이라 입력 계약 원장의 필수·길이 항목을 걷고 읽기 전용으로 옮겼다(길이 하한 242→241, 보호 범위는 불변). 구성원 편집 화면은 없다고만 말하고 있었다. red 증명: 백엔드 3건, 프런트 5건. | [AddressBookService](../../business-app/src/main/java/nuri/business/service/addressbook/AddressBookService.java), [구성원 대화상자](../../frontend/src/app/admin/collaboration/address-book/AddressBookMemberDialog.tsx), [입력 계약 원장](../../config/governance/input-contract-mirror-census.json) | 2026-09-27 | - |

## DEC-OPS-170

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-170 | accepted | **설문을 복제하고 결과 통계를 xlsx 로 내려받는다(DIP B5 F6).** ① `POST /surveys/{srvySn}/copy`(SURVEY_CREATE_ALL)는 문항·선택 항목까지 복제하고 응답은 복제하지 않는다. 제목·기간은 요청으로 받는다 — 원본 기간을 복사하면 같은 설문이 둘 열리고, 비우면 빈 경계가 열림이라 사본이 무기한 열린다(DEC-OPS-031). ② `GET /surveys/{srvySn}/stats/export.xlsx`(SURVEY_READ)는 화면 통계와 같은 행·분모를 내보내고 응답자 이름·기타 답은 싣지 않는다. binary 허용 census 에 등재한다. ③ 로그 전용 `LogExcelExport` 를 `nuri.api.support.XlsxExport` 로 옮겨 로그 5종과 함께 쓴다. ④ 설문 관리 화면에 복제 대화상자, 결과 패널에 내려받기를 둔다. | 사용자 위임(2026-09-25). 새 차수 설문은 문항을 처음부터 다시 입력해야 했고, 결과는 화면으로만 볼 수 있었다. 반출 응답을 `string/binary` 로 문서화하지 않자 codegen 이 미디어 타입을 거부했다(출력을 감춘 채 돌리면 보이지 않는 실패). 경로 변수가 있는 binary 연산이라 주소 이동 다운로드 대신 인증 axios 로 받는다. red 증명: 백엔드 변형 3개·프런트 변형 4개. | [SurveyService](../../business-app/src/main/java/nuri/business/service/survey/SurveyService.java), [SurveyCopyRequest](../../business-app/src/main/java/nuri/business/service/survey/dto/SurveyCopyRequest.java), [XlsxExport](../../api-server/src/main/java/nuri/api/support/XlsxExport.java), [복제 대화상자](../../frontend/src/app/admin/survey/components/SurveyCopyDialog.tsx) | 2026-09-27 | - |

## DEC-OPS-171

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-171 | accepted | **통계 화면에서 집계 기간을 고른다(DIP B5 F6).** ① 통계 허브의 '집계 구간: 최근 1개월(백엔드 기본값)' 배지를 기간 선택(최근 1일·1주·1개월, 직접 입력)으로 바꾸고, 사용자·게시판·접속·자료 이용·보고 통계에 `fromDate`·`toDate` 를 보낸다. 요약 카드도 같은 기간이다. ② 양쪽을 다 고른 올바른 기간만 보내고, 한쪽만 고르거나 역순이면 서버 기본값을 집계하며 그 이유를 보인다. ③ 적용 중인 구간을 문장으로 말한다. ④ 기간 필터에 `presets` 를 두어 '전체' 를 뺀다 — 통계 API 는 기간이 없으면 전체가 아니라 최근 1개월을 집계하므로 그 이름이 거짓이 된다. | 사용자 위임(2026-09-25). 서버(ReportStatsService)는 이미 기간을 받고 형식·역순을 400 으로 검증하는데 화면이 보내지 않아 늘 최근 1개월만 볼 수 있었다. red 증명: 변형 3개(조회 기간 전달·프리셋 제한·한쪽 기간 차단)가 새 테스트 4건을 붉혔다. | [통계 허브](../../frontend/src/app/admin/stats/IntelligenceHubClient.tsx), [기간 필터](../../frontend/src/app/components/patterns/period-filter.tsx), [ReportStatsService](../../business-core/src/main/java/nuri/business/service/stats/ReportStatsService.java) | 2026-09-27 | - |

## DEC-OPS-172

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-172 | accepted | **수신자 피커에서 부서 단위로 한꺼번에 고른다(DIP B5 F5).** ① `GET /admin/system/users/by-department/{ognzId}`(USER_READ)가 한 부서의 사용 중(P) 직속 인원을 성명 순으로 최대 200명 주고, 넘으면 `truncated` 로 알린다. 없는 부서는 404 다. 항목은 담당자 검색과 같은 최소 필드(식별자·성명·부서명·부재)이며 연락처는 싣지 않는다. ② 메일·문자·알림 발송의 피커에 '부서' 탭을 두고 '부서 전체 선택' 한 번으로 담는다. 담긴 사람은 사용자 검색과 같이 식별자만 보내 서버가 연락처를 해석한다. ③ 탭은 DEPT_READ·USER_READ 를 모두 가진 사람에게만 보인다. | 사용자 위임(2026-09-25). 관리자 사용자 목록은 연락처·주소까지 실어 개인정보 접근으로 기록되므로 쓰지 않았고, 일반 사용자에게 열린 `/users/search` 는 검색어·건수로 인명부 수집을 막으므로 부서 조회를 붙이지 않았다. 같은 사람을 이미 연락처까지 보는 USER_READ 로 열어 권한을 넓히지 않는다(H3). red 증명: 변형 6개(전체 선택·늦은 응답 무시·권한 판정·사용 중 필터·절단 판정·부서 존재 확인)가 각각 새 테스트만 붉혔다. | [UserService](../../business-core/src/main/java/nuri/business/service/user/UserService.java), [수신자 피커](../../frontend/src/app/components/ui/recipient-picker.tsx), [부서 출처](../../frontend/src/app/components/ui/recipient-department-source.ts) | 2026-09-27 | - |

## DEC-OPS-173

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-173 | accepted | **게시판 설정(댓글·만족도·첨부)을 서버와 화면이 집행한다(DIP B5 F9).** ① 새 댓글은 `ansYn`, 새 만족도 평가는 `stsfdgYn` 이 Y 일 때만 받고(아니면 400), 이미 남은 댓글·평가는 그대로 보이고 고칠 수 있다. ② 첨부는 `fileAtchPsbltyYn`·파일 수(기존 첨부 포함)·파일당 크기를 저장 전에 본다. 0·빈 값은 게시판 상한 없음이다. ③ V2_109 가 기존 게시판의 두 값을 지금까지의 실제 동작(받음)인 Y 로 맞추고, 엔티티·시드 기본값도 Y 다. ④ 마법사와 게시판 설정에 토글을 되살리고 설정에서 파일 수·크기를 바꾼다. 업로더는 게시판 설정과 서버 확장자·크기를 보인다. | 사용자 위임(2026-09-25). 설정은 저장될 뿐 읽는 코드가 없어 끈 게시판도 댓글을 받았고, 2026-08-29 토글을 걷었다. 첨부 3개·5MB 인 게시판에 20개·10MB 가 붙었고 업로더는 모든 형식을 받았다. OCI 6개 게시판이 모두 N 이고 그중 하나에 댓글 45건이 있어 값을 맞추지 않으면 집행 순간 댓글이 막힌다. red 증명: 변형 11개(서버 5·화면 6)가 각각 새 테스트만 붉혔다. | [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [V2_109](../../api-server/src/main/resources/db/migration/V2_109__enable_existing_board_comment_and_rating.sql), [첨부 제한](../../frontend/src/lib/attachments/server-upload-limits.ts) | 2026-09-27 | - |

## DEC-OPS-174

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-174 | accepted | **게시판·로그 화면의 남은 편의·정직성 문제를 닫는다(DIP B5 F9 2차).** ① 기간만 고른 0건은 '데이터 없음' 이 아니라 '선택한 기간에 해당하는 결과가 없습니다' 다(G15). 공용 `emptyResultMessage` 가 기간 적용 여부를 받고, 로그 6화면·모니터링 허브·게시판 목록이 쓴다. 기존 G15 census 가 기간 필터 화면의 누락을 막는다. ② 게시글 수정 화면도 현재 탭의 초안이 저장된 글과 다르면 복구를 묻는다(같으면 묻지 않는다). ③ 폐기된 게시글 비밀번호는 저장하지 않는다 — 화면·서버 액션이 채우던 '1' 을 걷고, 서버는 요청 값을 무시하며 수정은 기존 값을 바꾸지 않는다. 기존 행은 지우지 않는다. | 사용자 위임(2026-09-25). 기간을 좁혀 0건이 되면 기록이 아예 없는 것처럼 읽혔고, 수정 중 다른 화면에 다녀오면 고친 내용을 되살릴 길이 없었으며, 확인 경로가 없는 비밀번호에 '1' 이 평문으로 쌓였다. red 증명: 변형 7개(화면 5·서버 2)가 각각 새 테스트만 붉혔다. | [G15 문구](../../frontend/src/app/components/patterns/empty-result-message.ts), [작성 화면](../../frontend/src/app/admin/community/boards/insert-board-article/BoardRegistClient.tsx), [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java) | 2026-09-27 | - |

## DEC-OPS-175

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-175 | accepted | **오류 화면에 참조 번호를 보이고, 하네스 아틀라스 샘플 탭을 demo pack 으로 옮긴다(DIP B5 F11).** ① 앱·관리자·전역 오류 화면이 Next 가 서버 오류에 붙인 digest 를 '오류 참조 번호' 로 보인다. 숫자 해시 형식일 때만 보인다 — 클라이언트가 던진 오류 객체의 digest 는 누구나 채울 수 있어 토큰이 실릴 수 있다. ② 모니터링 허브의 '하네스 아틀라스'(정적 스킬 카탈로그·예시 계측 로그)를 `HarnessAtlasPanels.tsx` 로 분리해 demo pack `removePaths` 에 둔다. 허브는 부가 탭 레지스트리(`EXTRA_TAB_VIEWS`)에 한 줄로 등록하고 그 줄·탭 버튼·아이콘 import 를 demo 마커로 감싼다. 실제 생성기로 core·collaboration·demo 를 투영해 파일 생존과 투영본 tsc 를 확인했다. | 사용자 위임(2026-09-25). 오류 문의를 받아도 어느 서버 오류인지 짚을 수 없었고, 운영 모니터링이 아닌 샘플 탭이 모든 파생 제품의 모니터링 허브에 남았다. red 증명: digest 형식 검사를 풀면 오류 화면 테스트 5건, 허브의 import 를 마커 밖에 두거나 removePaths 에서 빼면 도달성 census 가 실패한다. | [오류 참조 번호](../../frontend/src/app/components/ui/error-reference.tsx), [하네스 탭](../../frontend/src/app/admin/system/monitoring/components/HarnessAtlasPanels.tsx), [pack manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json) | 2026-09-27 | - |

## DEC-OPS-176

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-176 | accepted | **공통코드 변경을 이력으로 남기고 화면에서 보인다(DIP B5 F11).** ① V2_110 이 `tb_com_cd_chg_hstry` 를 두고, 분류·그룹·상세 코드의 등록·수정·삭제(사용 안 함)와 그룹의 소속 분류 이동을 변경과 같은 트랜잭션에서 한 건씩 남긴다(바뀐 항목·전후 값·변경자). 값이 바뀌지 않은 저장과 이미 쓰지 않는 코드의 삭제는 남기지 않는다. 권한 변경 이력(V2_98)과 같은 용어·형태이며 이력은 추가만 한다. ② `GET /admin/system/codes/change-history`(CODE_READ)가 그룹(그 그룹과 상세 코드) 또는 분류 자신의 이력을 최신순으로 주고, 둘을 함께 주면 400 이다. 변경자는 이름으로 싣고 찾지 못하면 비운다. ③ 공통코드 화면의 그룹·분류 상세에 '변경 이력' 대화상자를 두며, 열 때만 조회한다. | 사용자 위임(2026-09-25). 코드 행에는 최종 수정자·일시만 덮어써져, 누가 언제 코드 명칭을 바꾸거나 쓰지 않게 했는지 남는 곳이 없었다. 기존 변경은 소급해 만들지 않는다. red 증명: 기록 호출·무변경 가드·함께 준 조건 거부를 되돌리면 서비스 테스트가, 분류 이력을 그룹 ID 로 물으면 대화상자·화면 테스트가 실패한다. | [CommonCodeService](../../business-core/src/main/java/nuri/business/service/code/CommonCodeService.java), [V2_110](../../api-server/src/main/resources/db/migration/V2_110__add_common_code_change_history.sql), [변경 이력 대화상자](../../frontend/src/app/admin/system/common-code/CommonCodeChangeHistoryDialog.tsx) | 2026-09-27 | - |

## DEC-OPS-177

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-177 | accepted | **연속 배치 작업의 반복 비용을 규칙으로 줄인다.** ① 응집된 배치는 PR 하나로 올리거나 한 브랜치에 쌓아 required CI 한 번으로 병합한다. 스택은 끝 PR 의 base 를 push 전에 main 으로 바꾼다. ② 같은 커밋에 같은 검증 묶음을 되풀이하지 않는다. 넓은 로컬 검증은 푸시 직전 한 번이고 훅이 보지 않는 검사만 고르며, 위임 산출물 재검증과 red 증명은 중복이 아니다. ③ 무거운 검증은 한 기계에서 하나씩 실행하고, 겹쳐 실행한 결과는 green 이든 red 든 단독 재실행으로 다시 얻는다. ④ main 최신화 뒤 생성물은 생성기로 다시 만든다. ⑤ 긴 작업은 배치 경계에서 새 세션으로 잇기를 권한다. AGENTS.md 에는 원칙만, 절차와 재생성 목록은 프로토콜 §6 에 두고 핵심 안전 문장은 정책 계약이 고정한다. | 사용자 요청(2026-09-27)이다. 39시간 연속 배치(PR 36건)의 대부분이 검증 실행(약 18시간)과 대기(약 11시간)였고, PR마다 main 최신화·생성물 충돌·재검증·CI 가 반복됐다. pre-push 의 커밋 단위 검증 캐시·병합 재생성 스크립트·merge queue 는 구현과 별도 승인이 필요해 후속으로 둔다. | [AGENTS.md](../../AGENTS.md#연속-작업의-시간-예산), [프로토콜 §6](../03-guides/orchestration-protocol.md#6-연속-배치-작업의-시간-예산-batch-time-budget), [정책 계약](../../scripts/governance-policy-contract.test.mjs) | 2026-09-27 | - |

## DEC-OPS-178

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-178 | accepted | **승인된 후속 3건을 적용한다(2026-09-27 사용자 승인).** ① V2_111 이 폐기된 게시글 비밀번호(`tb_bbs_item.pswd`)의 값만 NULL 로 비운다. 행과 다른 컬럼은 그대로이고 컬럼은 남긴다. ② main CI 는 커밋마다 자기 동시성 그룹(`ci-main-<sha>`)에서 취소 없이 끝까지 돈다. main 밖의 ref 는 종전대로 앞 실행을 취소한다. ③ `npm run merge:main` 이 main 을 `--no-commit` 으로 합치고, 공용 메모리 표의 충돌을 행 단위로 합치며, 양쪽이 입력을 바꾼 생성물을 다시 만들어 stage 한다. 같은 ID 충돌과 그 밖의 충돌은 멈추고 사람에게 넘긴다. | ① 2026-09-27 OCI 읽기: 378건 중 199건, 값은 모두 '1' 이다. 확인 경로 없는 평문이 남아 있었다(GAP-BOARD-001). ② 취소만 끄면 같은 그룹의 대기 실행이 다음 실행으로 교체되어 그 커밋의 코드가 어떤 main 실행에서도 검사되지 않는다(GAP-CI-001). ③ 연속 작업의 시간 분석에서 main 최신화 뒤 손으로 한 재생성이 반복 비용이었다(DEC-OPS-177). red 증명: 마이그레이션 검증, 동시성 변형 5종, 스크립트 변형 9종. | [V2_111](../../api-server/src/main/resources/db/migration/V2_111__clear_retired_post_password.sql), [CI 워크플로](../../.github/workflows/ci.yml), [스크립트](../../scripts/merge-main-regenerate.mjs) | 2026-09-27 | GAP-BOARD-001·GAP-CI-001 종료 |

## DEC-OPS-179

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-179 | accepted | **로그인 입력은 로그인 ID 로만 해석한다.** 인증 제공자가 입력값을 로그인 ID 로 찾지 못하면 PK·esntlId 로 다시 찾던 폴백 두 줄을 걷는다. 로그인 정책(IP·허용 시간대·접속 제한)과 OTP 조회, 로그인 기록은 이미 입력값을 로그인 ID 로 쓰므로 인증과 정책이 같은 키를 본다. 토큰 subject(esntlId)의 해석은 JpaUserAuthAdapter 가 따로 맡아 바뀌지 않는다. | 2026-09-27 재채점의 검증 단계가 찾았고 코드로 확인했다. 비밀번호를 아는 사용자가 esntlId 를 넣으면 인증은 통과하고 정책 조회는 빈 결과라, 관리자가 건 IP·시간대·접속 제한과 OTP 를 피해 갔다. 2026-09-02 에도 같은 코드였다(새로 발견, 퇴행 아님). 입력을 정규화해 정책을 조회하는 대안은 해석 사슬을 두 곳에 두어 다시 어긋날 수 있어 택하지 않았다. esntlId 로그인에 기대는 호출·e2e 는 없다. red 증명: 폴백을 되살리면 esntlId 입력 거부 테스트만 실패한다. | [EgovAuthenticationProvider](../../business-core/src/main/java/nuri/business/security/iam/EgovAuthenticationProvider.java), [인증 테스트](../../business-core/src/test/java/nuri/business/security/iam/EgovAuthenticationProviderTest.java) | 2026-09-27 | - |

## DEC-OPS-180

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-180 | accepted | **CI 검증 강도를 유지하며 임계 경로를 병렬화한다.** backend/schema, frontend build/coverage, 재사용 profile/custom을 병렬 source로 둔다. pack 소유 profile만 선택해 독립 집계한다. PIT는 history 없이 제품 10·이관 4개 scope와 각 75%를 유지하고, 제품은 4-slot 실측 LPT 순서, 이관 targetTests는 실제 killing test를 쓴다. 20개 runner에서 SAST·이관 PIT는 각 한 슬롯, secret-scan은 분류 직후, profile 6개는 frontend 뒤, custom 2개는 backend 뒤 실행한다. 이관 테스트 123개는 3개 leaf로 분배하고 aggregate가 XML·manifest·세 JaCoCo 데이터를 검증·병합해 85/70을 적용한다. | 사용자 요청(2026-09-29). 1·2차는 21분 4초·17분 21초였다. 3·4차에서 이관 분할·재사용·frontend·PIT·E2E 병목을 교정했고 5·6차에서 runner 대기를 확인했다. 7차 profile 제한은 14분 42초, 8차는 12분 16초였다. 9차 green 두 표본은 12분 21초·13분 30초였고 custom 입장이 최대 1분 54초 늦었다. 제품 PIT를 4-slot LPT로 바꾸고 긴 custom layout을 먼저 선언했다. 최종 판정은 같은 SHA의 연속 green CI 중앙값이다. | [ADR-0026](../02-architecture/decisions/ADR-0026-ci-critical-path-and-reusable-impact.md), [CI](../../.github/workflows/ci.yml), [profile](../../config/migration-test-duration-profile.json) | 2026-09-29 | - |

## DEC-OPS-181

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-181 | accepted | **ADR-0025가 승인 밖으로 둔 운영 적용 중 둘을 공유 OCI DB에 집행한다(2026-09-29 사용자 승인).** ① V2_112·114·115를 적용한다 — pg_dump 백업 뒤 앱과 같은 Flyway 12.4.0으로 2.111→2.115, 다음 날 flyway validate가 성공했다(133개 migration 검증, 이력 131행). ② ROLE_ADMIN 그룹에 NOTICE_EDIT·FAQ_EDIT를 배정하고 같은 트랜잭션에 GROUP_GRANT/ADD 이력 2건(`ops:2026-09-29:notice-faq-edit`)을 남긴다. MFA 강제·키 주입, DWORK_*·MFA_RECOVER 배정, 자격 회전, 릴리스 발행, 운영 배포는 여전히 별도 승인이다. | 기본 프로필 dev 스택이 `.env`의 OCI를 보므로 띄우기만 해도 세 마이그레이션이 승인 없이 적용되는 경계였다. 새 앱에서는 두 권한 없이 관리자도 공지·FAQ를 쓸 수 없다. 도입 기관 DB에는 자동 배정하지 않는다(ADR-0025 D06) — 배정 순서와 이력 요구는 기관 채택 authorization 통제에 적었다. | [ADR-0025](../02-architecture/decisions/ADR-0025-enterprise-completeness-and-durable-operations.md), [기관 채택 통제](../03-guides/governance-review-lifecycle.md#3-온라인-제품의-기관-도입) | 2026-09-29 | - |

## DEC-OPS-182

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-182 | accepted | **재배포가 제한된 Anthropic 스킬 4개(`docx`·`pdf`·`pptx`·`xlsx`, 186파일)를 원본 저장소에서 걷는다(2026-09-30 사용자 승인).** Git 추적과 로컬 사본을 함께 지우고 `.gitignore`로 막는다. 다시 추적되면 `project-composer-source` 계약이 red다. 재사용 생성기의 제외(R0)는 로컬 사본의 유입을 막는 이중 방어로 유지한다. Apache-2.0인 `skill-creator`·`frontend-design`과 나머지 스킬은 그대로다. | 네 스킬의 LICENSE는 "© Anthropic, All rights reserved"이고 공개 저장소의 추적은 그 자체가 배포다. R0는 산출물만 막았다. Claude Code는 같은 기능을 기본 스킬로 가지므로 기능 손실은 다른 도구의 새 clone에 한정된다. Git 이력 재작성(강제 푸시)과 저장소 라이선스 선택은 이 결정에 포함하지 않는다. | [생성 가이드](../03-guides/reusable-base-guide.md), [재평가 §A](adversarial-reassessment-2026-09-27.md#a-공개-배포자격라이선스), [재유입 계약](../../scripts/project-composer-source.test.mjs) | 2026-09-30 | - |

## DEC-OPS-183

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-183 | accepted | **main push 의 변경 범위는 직전 main SHA 가 자기 main CI 실행을 가졌을 때만 diff 로 좁힌다.** `change-scope` 는 push 일 때 Actions API(`actions: read`, job 토큰)로 `event.before` 에 취소되지 않은 main `ci.yml` push 실행이 있는지 확인하고, 없거나 조회에 실패하면 전수 검증을 고른다. 진행 중이거나 실패한 실행은 그 커밋을 스스로 검증하므로 있음으로 본다. PR 경로는 바뀌지 않는다. | #795 병합 `ac2508c96` 은 GitHub 가 push 이벤트를 누락해 main 실행이 없었고, 다음 main 실행이 그 SHA 기준 diff 로 frontend-scope 를 건너뛰었다. DEC-OPS-178 은 취소·교체만 막았다. 실측: `ac2508c96` 은 미검증·전수, 정상 main SHA 는 검증·diff 다. red 증명: 플래그 제거·`actions: none`·토큰 비움이 각각 계약 red 다. | [분류기](../../scripts/ci-change-scope.mjs), [CI 가이드](../03-guides/cicd-pipeline.md), [required-check 계약](../../scripts/required-checks-contract.test.mjs) | 2026-09-30 | - |

## DEC-OPS-184

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-184 | accepted | **실패 한 번에 알림은 하나다.** ① 전역 실패 토스트는 매크로태스크 하나만큼 대기하고, 화면이 같은 실패를 토스트로 알리면 뜨지 않는다. 전역 문구(서버 사유·연결 안내)는 화면 토스트의 설명 줄에 싣는다. 화면이 늦게 알리면 이미 뜬 전역 토스트를 같은 id 로 교체하고, 전역 토스트의 id 는 문구라 재시도가 쌓이지 않는다. ② 토스트는 `useToast` 로만 띄운다 — `sonner` 직접 import 7곳을 옮기고 lint 가 막는다. 과업별 기본 문구는 `failureMessage` 로 만든다(삼항식 21곳). ③ 4xx 조회는 재시도하지 않는다. 헤더 알림 되맞춤과 관리자 대시보드 조회는 화면이 실패를 알리므로 `suppressErrorToast` 를 선언한다. ④ 서버 기본 문구 C003·C005·C007·C008·C011·C012·C013·U005 를 사용자 말로 바꾸고, 파일 업로드 거부는 한도(20개·10MB·50MB)를 말한다. | 사용자 요청(2026-09-30 UI/UX·프로세스 분석 1번). 실패 한 번에 토스트가 2~3개 떴고, 백엔드가 끊기면 60초마다 같은 토스트가 모든 화면에 다시 떴다. `error instanceof Error ? error.message : 기본 문구` 는 axios 오류가 늘 Error 라 기본 문구가 쓰이지 않았다. 사유 없이 던진 오류 약 180곳이 '엔티티·상태 전이' 같은 내부 용어를 보였다. red 증명: 전역 알림 취소를 되돌리면 토스트 계약 2건이, sonner 직접 import 는 lint 가 실패한다. | [toast](../../frontend/src/app/components/ui/toast.tsx), [계약](../../frontend/src/app/components/ui/__tests__/toast.user-facing-message.test.tsx), [failureMessage](../../frontend/src/lib/safe-error-log.ts), [서버 문구](../../foundation/src/main/resources/egovframework/message/messages_ko.properties) | 2026-10-01 | - |

## DEC-OPS-185

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-185 | accepted | **쓰기 버튼은 그 동작의 기능 권한으로 보인다.** ① 관리 화면 26곳(사용자·부서·부재, 공통·행정·기관 코드, 메뉴, 프로그램, 로그인 정책, 분류 그룹, 템플릿, 배너·팝업, 게시판 마법사, 댓글 관리, 행사·외부인사·포상, 도움말·매뉴얼·서비스 안내, 설문·여론조사, 문자·메일)의 등록·수정·삭제·일괄·발송 버튼을 `canPermission` 으로 가린다. 권한 없는 일괄 작업은 싣지 않고, 하나도 없으면 선택 체크박스와 끌기 핸들도 두지 않는다. ② 수정 창으로만 볼 수 있던 행사·포상 상세는 수정 권한이 없으면 같은 창을 조회 전용으로 연다. ③ operation 소비 census 에 축 3 을 더한다 — 쓰기 operation 을 부르는 화면이 그 권한을 표시 판정에 쓰지 않으면 센다(수신자 일치·주석 제외·여는 화면 전이·라우트 보장). 본인용 기능 48건은 `expected.ungatedWriteMax` 로 양방향 동결한다. | 사용자 요청(UI/UX·프로세스 분석 2번). 조회 권한만으로 들어온 사람에게 모든 쓰기 버튼이 보였고, 폼을 다 채운 뒤에야 403 을 만났다. 표시 판정일 뿐 서버 인가는 그대로다(H3). 새 게이트 대신 기존 census 를 넓혔다. red 증명: 판정을 항상 참으로 바꾸면 화면별 새 테스트가, 픽스처의 미판정 쓰기는 census 계약이 실패한다. | [census](../../scripts/operation-consumer-census.mjs), [계약](../../scripts/operation-consumer-census.test.mjs), [원장](../../config/governance/operation-consumer-census.json), [사용자 허브](../../frontend/src/app/admin/user/UserOrgHubClient.tsx) | 2026-10-01 | - |

## DEC-OPS-186

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-186 | accepted | **메뉴는 라우트 게이트와 같은 판정으로 보인다.** ① `openableMenus` 가 메뉴 트리에서 기능 권한이 없어 들어갈 수 없는 메뉴를 걷는다. 사이드바·헤더 영역·명령 센터(즐겨찾기·최근 방문 포함)·통합 검색의 메뉴 바로가기가 이것을 쓴다. 하위가 하나도 남지 않은 분류는 함께 빼고, 권한 상태를 아직 모르면 거르지 않는다. ② 권한 카탈로그의 메뉴 항목에 `route` 를 싣고, 그룹 편집기가 "배정한 메뉴 가운데 이 그룹의 기능권한으로 들어갈 수 없는 화면" 을 저장 전에 알린다(저장은 막지 않는다 — 다른 그룹이 줄 수 있다). | 사용자 요청(UI/UX·프로세스 분석 3번). 서버의 메뉴 트리는 메뉴 배정(NAVIGATION)만 보고 `/admin` 진입은 기능 권한(OPERATION)으로 막아, 둘이 어긋나면 메뉴를 누를 때마다 사유 없이 홈으로 되돌려졌다. DEC-OPS-152 는 화면 안 링크만 맞췄다. 노출 판정일 뿐 인가가 아니다(H3). red 증명: 걸러내기를 되돌리면 단위 테스트 5건이 실패한다. | [openableMenus](../../frontend/src/lib/navigation/openable-menus.ts), [테스트](../../frontend/src/lib/navigation/__tests__/openable-menus.test.ts), [그룹 편집기](../../frontend/src/app/admin/security/authority/components/AuthorizationGroupEditor.tsx), [카탈로그](../../business-core/src/main/java/nuri/business/service/auth/AuthorizationAdministrationService.java) | 2026-10-01 | DEC-OPS-152 의 메뉴 제외 범위 |

## DEC-OPS-187

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-187 | accepted | **결재가 충돌과 권한을 말한다.** ① 이미 처리·회수된 문서를 처리하면 409 `CONCURRENT_MODIFICATION` 으로 현재 상태를 밝히고, 화면은 그 사유를 보인 뒤 결재함을 다시 읽는다. 차례가 아닌 결재자는 사유와 함께 거부한다. ② 병렬 결재에서 한 사람이 반려하면 나머지 결재자에게도 알린다. 알림은 「제목」 결재(번호 N)로 부른다. ③ 결재자 지정은 `APPROVAL_APPROVE` 를 가진 사용 중 계정만 받는다. ④ 기안·처리·회수 버튼과 응답 힌트는 각 기능 권한으로 보이고, 결재함 검색은 번호로도 찾는다. | 사용자 요청(UI/UX·프로세스 분석 4번). 동시 처리의 패자는 원인 없는 실패 토스트만 봤고, 병렬 반려 뒤 다른 결재자는 사라진 문서를 찾았으며, 결재 권한 없는 사람에게 올린 결재는 처리할 수 없는 대기로 남았다. 표시 판정일 뿐 서버 인가는 그대로다(H3). red 증명: 수정마다 되돌리면 새 테스트만 실패한다. | [InformalSanctionService](../../business-app/src/main/java/nuri/business/service/informalsanction/InformalSanctionService.java), [결재함](../../frontend/src/app/approvals/ApprovalHubClient.tsx) | 2026-10-01 | DEC-OPS-155 ③의 결재자 판정(권한 요건 추가) |

## DEC-OPS-188

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-188 | accepted | **폼 모달은 저장하지 않은 입력을 사고로 버리지 않는다.** ① `StandardModal` 이 연 뒤 폼 입력이 있었는지를 직접 보고, Esc·배경·X·취소로 닫을 때 확인한다. 조회 조건(`role="search"`)은 세지 않고, 화면이 이미 `useDirtyCloseGuard` 를 걸었으면 한 번만 묻는다. 원시 Dialog 폼 5곳도 같은 훅을 쓴다. ② 설문 템플릿 삭제는 쓰는 설문이 있으면 건수를 밝혀 409 로 거부하고, 화면은 삭제 전에 확인한다. ③ 사용자 삭제 확인은 결과(로그인 불가·이력 보존)를 말하고, 시스템 관리자 삭제 거부는 다음 행동을 알린다. | 사용자 요청(UI/UX·프로세스 분석 5번). 가드는 9곳만 써서 나머지 약 20개 폼 모달은 Esc 한 번에 입력이 사라졌다. 도달 불가 화면의 모달은 대상이 아니다(DEC-OPS-023 ①). red 증명: 가드를 떼면 모달 계약 테스트가, 409 를 되돌리면 서비스 테스트가 실패한다. | [미저장 가드](../../frontend/src/hooks/useDirtyCloseGuard.ts), [모달](../../frontend/src/app/components/ui/standard-modal.tsx), [SurveyService](../../business-app/src/main/java/nuri/business/service/survey/SurveyService.java) | 2026-10-01 | - |

## DEC-OPS-189

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-189 | accepted | **발송 결과를 보낸 사람이 알고 찾는다.** ① 메일·문자가 실패로 확정되면 발신자에게 알림 한 건을 남긴다(제목·받는 사람 이름·건수만, 본문·주소·번호 제외). ② 연락처가 없는 수신자는 한 번에 모두 밝혀 거부한다(부분 발송 금지 유지). 쪽지는 사용 중이 아닌 수신자의 이름을 밝히고 화면이 서버 사유를 보인다. ③ 메일 이력은 `resultCode`(P·S·F, 밖은 400)로 좁히고 대기가 보이면 2분 안에서 다시 읽으며, 발송 뒤 캐시를 비운다. ④ 문자 목록은 발송 건마다 수신자·완료·실패·대기 수를 한 번의 집계로 싣는다(늘 0 이던 `recptnCnt` 정정). | 사용자 요청(UI/UX·프로세스 분석 6번). 실패는 이력의 F 에만 남아 발신자가 찾아가기 전까지 몰랐고, 부서 단위 발송은 연락처 누락자를 한 명씩 빼며 다시 보내야 했다. 수신자 식별자 저장·문자 재발송은 스키마 변경이라 이 결정에 넣지 않았다. red 증명: 알림·집계·이름 거부·결과 조건·재조회 기한을 되돌리면 새 테스트만 실패한다. | [MailAsyncProcessor](../../business-app/src/main/java/nuri/business/service/mail/MailAsyncProcessor.java), [SmsService](../../business-app/src/main/java/nuri/business/service/sms/SmsService.java), [메일 이력](../../frontend/src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx) | 2026-10-01 | DEC-OPS-035 의 첫 누락자 단독 거부 |

## DEC-OPS-190

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-190 | accepted | **상세 화면의 '목록으로' 는 목록에서 왔으면 뒤로 가고, 아니면 목록 경로로 간다.** ① 앱 안 직전 경로를 모듈 메모리에 기록하고(`RouteHistoryRecorder`), `useReturnToList({ fallback, origins })` 가 직전 경로가 목록 패턴(정확 일치, `/*` 는 하위 포함)이면 `router.back()` 으로 목록의 페이지·검색 조건·스크롤을 되살리고, 딥링크·새 탭·다른 화면이면 목록 경로로 간다. ② 게시글·부서 업무·주소록·커뮤니티·설문 응답·설문 관리 상세에 공용 `BackToListButton` 을 쓰고 문구를 '목록으로' 로 통일한다. 보이는 '목록으로' 에 '뒤로 가기' 이름을 붙이던 곳과 링크 안 버튼을 걷는다. ③ 부서 업무 목록은 검색어·페이지·조회 범위를 이 탭의 sessionStorage 에 화면 키로 둔다 — 뒤로 가도 목록은 새로 마운트되기 때문이다. | 사용자 요청(UI/UX·프로세스 분석 7번). `router.back()` 은 딥링크로 연 상세에서 앱 밖으로 나갔고, 고정 링크는 목록에서 왔을 때 조건을 잃었다. URL 에 새 값을 싣지 않는다(PD-UX-002). red 증명: 판정을 늘 뒤로 가기로 바꾸면 딥링크·타 화면·버튼 테스트 3건이 실패한다. | [use-return-to-list](../../frontend/src/lib/navigation/use-return-to-list.ts), [BackToListButton](../../frontend/src/app/components/navigation/BackToListButton.tsx), [계약](../../frontend/src/lib/navigation/__tests__/use-return-to-list.test.tsx) | 2026-10-01 | - |

## DEC-OPS-191

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-191 | accepted | **2MB 한글 글꼴을 미리 불러오지 않고, 라우트별 preload 글꼴 바이트를 예산으로 막는다.** ① Pretendard 가변 글꼴(2,057,688B)은 `preload: false` 로 두고 `display: swap` 을 유지한다. ② 번들 예산 스크립트가 next/font 매니페스트에서 라우트마다 preload 되는 글꼴 합계를 재고 200,000B 를 넘으면 실패한다. 매니페스트가 없으면 측정 불가로 실패한다. | 사용자 요청(UI/UX·프로세스 분석 8번). 모든 라우트가 첫 방문마다 JS 합계 예산보다 큰 글꼴을 `rel=preload` 로 받아 첫 화면이 늦었다. swap 이라 본문은 대체 글꼴로 먼저 보인다. red 증명: 변경 전 빌드에서 2,057,688B 로 실패, 변경 후 0B. 계산된 글꼴 e2e(GAP-UIF-001)는 그대로 Pretendard 를 확인한다. | [예산 스크립트](../../frontend/scripts/check-bundle-budget.mjs), [layout](../../frontend/src/app/layout.tsx) | 2026-10-01 | - |

## DEC-OPS-192

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-192 | accepted | **메뉴·부서 트리에 끌지 않고 옮기는 키보드 대안과 한국어 드래그 안내를 둔다.** ① 부서 상세에 '부서 자리 바꾸기'(상위 부서 선택·한 칸 위/아래, 하위 포함)를 두고 결과는 드래그와 같은 조직 계층 저장을 탄다. 자기·하위는 상위 후보에서 빼고, 상위를 모르는 부서는 형제 이동을 막는다. ② 메뉴 수정 창의 읽기 전용 '상위 메뉴 ID' 를 상위 메뉴 선택으로 바꾼다 — 자기·하위와 3단계를 넘는 자리는 빼고, 서버가 순환을 거부한다. ③ 두 트리의 드래그 안내를 dnd-kit 기본 영어에서 한국어로 바꾸고 상위를 바꾸는 다른 길을 알린다. | 사용자 요청(UI/UX·프로세스 분석 9번). 키보드 센서는 순서만 옮기고 깊이를 바꾸지 못해 키보드 사용자는 항목을 다른 항목 아래로 옮길 수 없었다(WCAG 2.1.1). red 증명: 메뉴 3단계 제한을 되돌리면 후보 테스트가 실패한다. | [부서 자리 바꾸기](../../frontend/src/app/admin/user/DeptPlacementControls.tsx), [treeUtils](../../frontend/src/app/admin/user/departments/treeUtils.ts), [드래그 안내](../../frontend/src/lib/dnd/tree-dnd-accessibility.ts) | 2026-10-01 | - |

## DEC-OPS-193

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-193 | accepted | **쪽지 작성 창과 알림 드로어가 사실과 평이한 말을 쓴다.** ① 쪽지 받는 사람은 이름 칩으로만 보이고 내부 사용자 식별자를 늘어놓던 입력을 걷는다. '타겟 검색'·'대상자 식별'·'시스템 제목'·'데이터 바디'·'새 쪽지 기안' 을 '받는 사람 고르기'·'제목'·'내용'·'쪽지 쓰기' 로 바꾼다. ② 쪽지 피커에 메일·문자와 같은 부서 탭을 준다(DEC-OPS-172 권한 판정). ③ 헤더 알림 드로어는 제목 글자로 추측한 '보안·시스템·활동' 필터를 걷고 '전체·읽지 않음' 으로 거르며 범위가 최근 알림임을 밝힌다. | 사용자 요청(UI/UX·프로세스 분석 10번). 추측 분류는 불러온 최근 알림 안에서만 적용돼 빈 탭이 전체에 대한 말처럼 읽혔다 — 알림 센터는 DEC-OPS-153 에서 같은 탭을 걷었다. red 증명: 필터 테스트가 추측 탭 부재·읽음 필터·범위 문구를 고정한다. | [쪽지 화면](../../frontend/src/app/note/page.tsx), [알림 드로어](../../frontend/src/app/components/ui/app-notification-drawer.tsx) | 2026-10-01 | DEC-OPS-153 ②의 '보안 알림' 탭 제거 범위(드로어로 확장) |

## DEC-OPS-194

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-194 | accepted | **공용 표와 보조 글자의 접근성 결함을 고친다.** ① 좁은 화면(md 미만)에서 숨긴 머리글 행을 `visibility: hidden` 으로 탭 순서에서 빼고, 표 위에 보이는 '전체 선택'·'정렬 기준' 을 둔다(컨트롤이라 단일 DOM 원칙과 부딪히지 않는다). ② 행 체크박스 이름은 `selectionLabel` 또는 첫 열 값·행 순번으로 행마다 다르게 짓고, 본문 행·셀에 role 을 명시한다. ③ 이전·다음 버튼은 `aria-disabled` 로 두어 끝 페이지에서 포커스를 잃지 않는다. ④ 데이터 글자 19곳의 `text-muted-foreground/10~60` 을 걷고(대비 1.67~2.49:1), 남은 장식 16곳은 aria-hidden 과 함께 색상 가드가 파일별로 동결한다. | 사용자 요청(UI/UX·프로세스 분석 11번). 토큰 대비 계약은 불투명도 수식어를 보지 않았다. 새 게이트 대신 같은 불변식을 보는 색상 가드를 넓혔다. red 증명: 데이터 글자에 불투명도를 되살리면 가드가 파일을 지목하고, 표 계약 5건이 이름·역할·포커스를 고정한다. | [공용 표](../../frontend/src/app/components/ui/standard-data-table.tsx), [표 계약](../../frontend/src/app/components/ui/__tests__/standard-data-table-a11y.test.tsx), [색상 가드](../../frontend/src/__tests__/hardcoded-color-guard.test.ts) | 2026-10-01 | - |

## DEC-OPS-195

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-195 | accepted | **목록의 조회 시점·갱신 중 표시·조회 조건 밀도를 카탈로그 규칙에 맞춘다.** ① 커뮤니티 목록은 글자마다 조회하던 입력을 `KeywordFilter`(조회·Enter)로 바꾸고 조회 시 1페이지로 돌린다(G2). ② 주소록은 조회에 쓴 검색어를 입력칸 값과 나눠 입력만 한 검색어가 페이지 이동·재조회에 쓰이지 않게 한다. ③ 공용 표는 보일 행이 있으면 다시 불러오는 동안 스켈레톤으로 바꾸지 않고 `aria-busy` 와 상태 문장만 건다(G15 직전 결과 유지). ④ 게시판 목록 조회 조건의 `!h-12` 를 조회조건 토큰으로 옮기고, 밀도 계약이 중요 표시(`!h-*`·`h-*!`)도 고정 높이로 센다. | 사용자 요청(UI/UX·프로세스 분석 12번). 3페이지에서 검색하면 빈 화면이 나올 수 있었고, 페이지를 넘길 때마다 표가 깜빡였으며, `!h-12` 는 compact 밀도에서도 48px 로 남았다. 부서 일정 라우트의 워크허브 통합은 결정 선행이라 두었다. red 증명: 넓힌 밀도 계약이 수정 전 게시판 조회 조건 7곳을 잡았고, 주소록·표 계약이 조건·행 유지를 고정한다. | [공용 표](../../frontend/src/app/components/ui/standard-data-table.tsx), [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts), [커뮤니티 목록](../../frontend/src/app/cop/cmy/selectCommunityList/CommunityHubClient.tsx) | 2026-10-01 | - |

## DEC-OPS-196

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-196 | accepted | **지시가 달린 메모 보고를 지키고 화면이 서버 판정을 쓴다.** ① 목록에 '지시 있음' 열을 둔다. ② 지시가 달린 보고는 작성자가 지우지 못한다(409). 전체 삭제 권한자가 지우면 작성자·수신자에게 알린다. ③ 다른 내용의 지시로 바꾸면 화면이 먼저 확인하고 알림은 '지시가 변경되었습니다' 로 구분하며, 작성자 알림은 발신함(tab=MY)으로 연다. ④ 응답에 `instructable`(지시 기능 권한 + 수신자·전체 수정 권한)을 싣고 화면의 추측 판정을 대체한다. | 사용자 요청(UI/UX·프로세스 분석 13번). DEC-OPS-154 가 지시 뒤 수정을 막았지만 삭제로 우회하면 지시와 함께 수신함에서도 알림 없이 사라졌고, 지시는 확인 없이 덮였으며, 지시 권한을 회수해도 지시 칸이 남아 저장 때 403 을 만났다. red 증명: 확인·서버 힌트·409·변경 알림을 되돌리면 새 테스트만 실패한다. | [MemoReportService](../../business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java), [메모보고 화면](../../frontend/src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx) | 2026-10-01 | - |

## DEC-OPS-197

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-197 | accepted | **이미 한 참여를 목록과 버튼에 보인다.** ① 게시글 목록·상세 응답에 `recommended`(현재 사용자의 추천 여부, 모르면 null)를 싣고, 목록은 한 페이지를 한 번의 조회로 채운다. 추천 버튼은 '추천함'(aria-pressed)으로 잠긴다. ② 목록 템플릿의 추천은 상세와 같은 클라이언트 경로로 보내고, 소비자가 사라진 서버 액션 `likeBoardArticle` 을 걷는다. ③ 설문 목록도 `responded` 를 한 번의 조회로 싣고 '응답 완료' 를 보이며, 화면 매핑이 이 값을 버리던 것을 고친다. | 사용자 요청(분석 14번). 이미 추천한 글도 추천 버튼이 그대로라 누르면 409 로 알았고, 서버 액션은 실패를 `{ success: false }` 로 삼켜 숫자가 조용히 되돌아가고 사유가 보이지 않았다. 설문 응답 여부는 상세에서만 채워졌다. red 증명: 표시·매핑·오류 사유를 되돌리면 새 테스트 4건이 실패한다. | [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [목록 추천](../../frontend/src/app/admin/community/boards/select-board-list/BoardListClient.tsx), [SurveyService](../../business-app/src/main/java/nuri/business/service/survey/SurveyService.java) | 2026-10-01 | - |

## DEC-OPS-198

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-198 | accepted | **권한 그룹 구성원을 그룹 쪽에서 보이고, 사용자 한 명을 다루는 화면끼리 대상을 넘긴다.** ① `GET /admin/authorization/groups/{code}/members`(AUTHRT_READ)가 배정된 사용자를 이름 순 서버 페이지로 주고, 그룹 상세의 '배정된 사용자(N명)' 행에서 배정 편집으로 간다. 구성원이 있는 그룹 삭제 거부(409)는 인원을 밝힌다. ② 이력의 대상 조건이 로그인 ID 도 받고, 코드·시각은 한국어 라벨·날짜 형식으로 보인다. ③ 사용자 상세가 권한 배정·권한 변경 이력·로그인 이력을 그 사람을 대상으로 연다. 대상은 URL 이 아니라 탭 세션 인계(1분 유효, 직접 조작 시 소거)로 넘긴다. | 사용자 요청(분석 15번). 그룹을 가진 사람을 보려면 사람이나 부서를 하나씩 열어야 했고, '권한 설정 열기' 는 대상 없이 그룹 탭을 열었다. URL 은 로그인 ID 를 주소창·방문 기록에 남기고 새 생산자를 만든다(PD-UX-002). red 증명: 인계·라벨·로그인 ID 조건을 되돌리면 새 테스트가 실패한다. | [AuthorizationAdministrationService](../../business-core/src/main/java/nuri/business/service/auth/AuthorizationAdministrationService.java), [대상 인계](../../frontend/src/lib/navigation/target-handoff.ts) | 2026-10-01 | - |

## DEC-OPS-199

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-199 | accepted | **길 찾기 보조 장치를 실제 구조와 맞춘다.** ① 현재 위치 경로는 메뉴 트리가 원천이다. 화면 고정 경로는 메뉴에 없는 화면의 대체값과 하위 화면의 마지막 한 단계로만 쓴다. ② 헤더에 '빠른 이동 (Ctrl+K)' 버튼, 사이드바에 즐겨찾기 묶음을 두고, 별은 마우스 없는 기기에서 늘 보이며 게시판 검색칸의 '⌘K' 배지를 걷는다. ③ 사이드바는 조회 실패(다시 시도)와 배정 없음을 구분하고, 불러왔는데 비고 주소도 없는 분류를 그리지 않는다. 404 의 '이전으로' 는 기록이 있을 때만 둔다. ④ 업무 홈에 '안 읽은 쪽지' 를 더하고 문구를 실제 내용에 맞춘다. ⑤ 온보딩은 저절로 모달로 열지 않고 배너와 계정 메뉴의 '사용 안내' 로 연다. | 사용자 요청(분석 16번). 56개 화면이 옛 이름 경로를 보였고, 즐겨찾기는 단축키로만 열렸으며, 온보딩이 포커스를 가져가고 축소 프로필에 없는 '고객지원' 을 안내했다. 화면 고정 경로 56곳은 대체값으로 남겼다. red 증명: 수정마다 새 테스트가 실패한다. | [DynamicBreadcrumb](../../frontend/src/app/components/layout/DynamicBreadcrumb.tsx), [사이드바](../../frontend/src/app/components/layout/sidebar.tsx), [온보딩](../../frontend/src/app/components/ui/smart-onboarding-hub.tsx) | 2026-10-01 | - |

## DEC-OPS-200

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-200 | accepted | **다시 로그인하면 보던 자리로 돌아가고, 탭이 같은 세션을 따른다(결정 17).** ① 로그인 `redirect` 는 경로와 구조 키(`bbsId`·`pstSn`·`tab`·`page`)만 형식을 맞춰 싣고 자유 입력·fragment 는 버린다. 프록시·API 401·만료·관리자 오류 화면이 같은 도우미(`loginReturnPath`)를 쓴다. ② 한 탭에서 로그아웃하면 다른 탭은 '만료' 안내 없이 로그인 화면으로, 다시 로그인하면 현재 사용자를 다시 묻는다(BroadcastChannel, 사용자 정보는 싣지 않는다). ③ 만료 경고의 '로그아웃' 은 만료 안내 없이 나간다. | 사용자 결정(2026-10-01 "전부 추천안")이다. 게시글을 읽다 끊기면 게시판 첫 화면으로 돌아왔고, 직접 로그아웃해도 '세션이 만료되었습니다' 를 봤다. 검색어(사람 이름)가 `/login` URL 에 실리지 않게 한 2026-08 결정은 유지한다 — 구조 키만 값 형식까지 맞을 때 넘긴다. red 증명: 구조 키 필터를 풀면 도우미·로그인 표 테스트가 실패한다. | [복원 도우미](../../frontend/src/lib/auth/login-return-path.ts), [탭 알림](../../frontend/src/lib/auth/session-broadcast.ts), [AuthContext](../../frontend/src/contexts/AuthContext.tsx) | 2026-10-01 | - |

## DEC-OPS-201

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-201 | accepted | **관리자가 초기화한 비밀번호는 본인이 바꾸기 전까지 다른 기능을 막는다(결정 18).** ① V2_118 이 `tb_user_info.tmpr_pswd_yn`(표준 용어 임시비밀번호여부, 여부C1, 기존 행 N)을 둔다. 관리자 초기화는 Y, 본인 변경은 N 으로 둔다. ② 인증 주체가 표시를 싣고 `PasswordChangeRequiredGuard` 가 인증 경로·본인 조회·본인 비밀번호 변경 밖의 API 를 A009(403)로 거부한다. 화면은 앱 대신 변경 화면만 보인다. ③ 사용자 상세에 '비밀번호 변경 필요'·추가 인증 상태를 싣고, MFA_RECOVER 보유자는 대상을 인계해 계정 메뉴의 복구 승인을 연다. | 사용자 결정(2026-10-01 "전부 추천안", 스키마 변경 승인)이다. 관리자가 정해 알려 준 비밀번호를 계속 쓸 수 있어 관리자도 아는 비밀번호가 남았고, 분실 계정 복구는 대상 esntlId 를 손으로 쳐야 했다. 화면만 막으면 API 직접 호출이 남으므로 서버가 거부한다. SAST-FP-008 보완 소스 해시를 재검토 후 재결속했다. red 증명: 인터셉터 판정을 뒤집으면 테스트 2건이 실패한다. | [V2_118](../../api-server/src/main/resources/db/migration/V2_118__add_temporary_password_flag.sql), [인터셉터](../../api-server/src/main/java/nuri/api/interceptor/PasswordChangeRequiredGuard.java), [변경 관문](../../frontend/src/components/account/PasswordChangeGate.tsx) | 2026-10-01 | - |

## DEC-OPS-202

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-202 | accepted | **민감 작업 감사 원장과 후속 작업을 화면에서 본다(결정 19).** ① 열람 권한 `ADT_LOG_READ` 를 신설하고 기본 그룹에 넣지 않는다. `GET /admin/system/logs/audit` 가 원장을 최신순으로, 행위자 로그인 ID·기간(시작·종료를 함께)으로 거르며 조회도 민감 작업으로 원장에 남는다. ② `/admin/system/logs/audit`(민감 작업 감사 원장)와 `/admin/system/durable-jobs`(후속 작업 상태) 화면을 둔다. 실패한 작업만 DWORK_RETRY 보유자가 확인 뒤 다시 처리한다. ③ 로그 통합 조회가 권한이 있을 때만 두 화면으로 가는 링크를 보인다. 메뉴는 바꾸지 않는다. | 사용자 결정(2026-10-01 "전부 추천안")이다. 원장과 작업은 쌓이는데 읽을 화면이 없어 비밀번호 초기화 이력이나 실패한 알림 전달을 보려면 DB 를 직접 열어야 했다. 원장을 보는 사람이 원장에 남는 작업을 하는 사람과 같으면 감사가 약해지므로 자동 배정하지 않는다. red 증명: 권한 검사를 빼면 서비스 테스트가, 재처리 잠금을 빼면 화면 테스트가 실패한다. | [SensitiveAuditQueryService](../../business-core/src/main/java/nuri/business/service/log/SensitiveAuditQueryService.java), [감사 원장 화면](../../frontend/src/app/admin/system/logs/audit/AuditJournalClient.tsx), [후속 작업 화면](../../frontend/src/app/admin/system/durable-jobs/DurableJobsClient.tsx) | 2026-10-01 | - |

## DEC-OPS-203

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-203 | accepted | **지식 허브가 커뮤니티 가입으로 이어지고 Q&A 상태 어휘를 하나로 쓴다(결정 20).** ① 커뮤니티 탭에 '커뮤니티 목록·가입' 링크를 둔다(메뉴는 바꾸지 않는다). ② V2_116 이 Q&A 상태 `QA01` 을 `OPEN` 으로 바꾸고, 새 질문도 `OPEN` 으로 시작한다. ③ Q&A 탭에 '미해결만' 조건(`qnaStatus=OPEN`)을 둔다. ④ 관리자 커뮤니티 목록이 승인을 기다리는 가입 신청 수를 싣고 행과 회원 관리 버튼 이름에 보인다. | 사용자 결정(2026-10-01 "전부 추천안", 데이터 정규화 승인)이다. 지식 허브의 커뮤니티 탭에서 가입할 길이 없었고, 화면은 QA01·서버 해결 표시는 SOLVED·OPEN 을 써 미해결 질문을 고를 수 없었으며, 가입 신청은 회원 관리를 하나씩 열어야 보였다. red 증명: 신청 수 집계와 미해결 조건을 각각 되돌리면 새 테스트가 실패한다. | [V2_116](../../api-server/src/main/resources/db/migration/V2_116__normalize_qna_open_status.sql), [CommunityService](../../business-app/src/main/java/nuri/business/service/community/CommunityService.java), [지식 허브](../../frontend/src/app/admin/help/KnowledgeHubClient.tsx) | 2026-10-01 | - |

## DEC-OPS-204

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-204 | accepted | **설문은 작성 중으로 시작하고, 여론조사와 투표 목록을 나누며, 응답이 모이면 문항을 더하지 않는다(결정 21).** ① V2_117 이 `tb_srvy_info.rls_yn`(공개여부)을 두고 기존 설문은 Y, 새 설문은 N 이다. 작성 중 설문은 편집 권한자에게만 보이고 응답은 404 다. 설문 패널이 확인 뒤 공개·공개 중단을 바꾼다. ② 투표 목록 조회에 `kind`(SATISFACTION=유형 001·002, POLL)를 두고 여론조사 관리·통계와 온라인 투표 관리가 각자 종류만 본다. 참여 화면은 둘 다 본다. ③ 응답이 있는 설문에 문항·선택 항목을 더하면 409 로 복제를 안내한다. | 사용자 결정(2026-10-01 "전부 추천안", 스키마 변경 승인)이다. 등록하는 순간 응답자에게 보여 문항을 다 넣기 전에 응답이 쌓였고, 두 관리 화면이 서로의 항목을 보였으며, 응답 뒤 문항을 더하면 앞선 응답자는 답하지 않은 문항이 생겼다. red 증명: 공개 판정·종류 조건·추가 차단을 각각 되돌리면 새 테스트가 실패한다. | [V2_117](../../api-server/src/main/resources/db/migration/V2_117__add_survey_release_flag.sql), [SurveyService](../../business-app/src/main/java/nuri/business/service/survey/SurveyService.java), [OnlinePollService](../../business-app/src/main/java/nuri/business/service/survey/OnlinePollService.java) | 2026-10-01 | - |

## DEC-OPS-205

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-205 | accepted | **부서 업무 등록자는 맡긴 업무를 보고 담당자만 바꾼다(결정 22).** ① 상세 열람에 등록자를 더한다. ② `PATCH /dept-jobs/{deptTaskSn}/assignee`(DEPT_JOB_UPDATE, 담당자·등록자·전체 수정 권한자)가 사용 중 계정으로만 담당자를 바꾸고 새 담당자에게 알린다. 내용·첨부는 건드리지 않는다(`DeptJob.reassign`). ③ 응답 힌트 `reassignable` 이 참이고 수정 권한이 없을 때만 상세에 '담당자 바꾸기' 를 보인다. 수정·삭제는 종전대로 담당자·관리자 몫이다. | 사용자 결정(2026-10-01 "전부 추천안")이다. 업무를 맡긴 사람이 그 업무를 다시 열 수 없었고, 담당자가 부재하거나 바뀌어도 관리자에게 부탁해야 했다. 수정 권한까지 주면 담당자의 작업 내용을 바꿀 수 있어 재지정만 연다. 첨부 writer 게이트가 처음 구현(전체 갱신 호출)을 잡아 담당자 전용 메서드로 바꿨다. red 증명: 등록자 판정을 빼면 서비스 테스트 2건이 실패한다. | [DeptJobService](../../business-core/src/main/java/nuri/business/service/deptjob/DeptJobService.java), [상세 화면](../../frontend/src/app/smart-toolkit/dept-job/[id]/DeptJobDetailClient.tsx) | 2026-10-01 | DEC-OPS-138 ②의 상세 열람 범위(등록자 추가) |

## DEC-OPS-206

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-206 | accepted | **게시 종료일을 집행한다(결정 23).** ① 종료일이 지난 글은 일반 사용자의 목록·상세·댓글·통합 검색에서 빠지고 상세는 404 다. 작성자와 BOARD_READ_ALL 보유자에게는 남고 화면이 '게시 종료' 로 표시한다. 종료일 당일까지는 게시 중이다. ② 시작일은 기록만 하며 노출을 늦추지 않는다. 작성 화면의 '게시 기간(기록용)' 안내를 이 사실로 바꾸고, 정직성 계약이 문구와 술어(`pstEndYmd` 있음·`pstBgngYmd` 없음)를 함께 고정한다. | 사용자 결정(2026-10-01 "전부 추천안")이다. 종전에는 두 날짜가 기록만 됐고 화면이 그 사실을 고지했다(2026-08-29). 그 계약이 "집행이 생기면 문구와 계약을 함께 바꿔라" 를 적어 두어 같은 변경에서 갱신했다. 이미 종료일이 지난 기존 글은 일반 사용자에게서 사라진다 — 결정의 의도다. red 증명: 술어 조건이나 상세 가드를 되돌리면 새 테스트가 실패한다. | [BoardPredicate](../../business-app/src/main/java/nuri/business/domain/board/BoardPredicate.java), [BoardService](../../business-app/src/main/java/nuri/business/service/board/BoardService.java), [정직성 계약](../../frontend/src/__tests__/cross-stack/honest-affordance-contract.test.ts) | 2026-10-01 | DEC-OPS-034 ①의 게시 기간 비집행 서술 |

## DEC-OPS-207

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-207 | accepted | **결정 17~23의 마이그레이션 V2_116~118 을 공유 OCI DB 에 적용한다(2026-10-01 사용자 승인).** pg_dump 백업 뒤 앱과 같은 Flyway 12.4.0 으로 2.115→2.118 을 적용했고 validate 가 136개 마이그레이션에서 성공했다. 읽기 확인: Q&A 상태 QA01 잔여 0(OPEN 378), 기존 설문 1건 공개(rls_yn Y)·새 설문 기본 N, 사용자 2명 tmpr_pswd_yn N·기본 N·NOT NULL. 권한 배정(ADT_LOG_READ 등)은 하지 않았다. | 결정 17~23 을 승인하며 스키마·데이터 변경 적용도 함께 승인받았다. dev 스택이 OCI 를 보므로 적용하지 않으면 다음 기동이 승인 경계 밖에서 마이그레이션을 실행한다. 기존 설문을 공개로 둔 것은 이미 응답자에게 보이던 설문이 사라지지 않게 하기 위해서다(V2_117). | [V2_116](../../api-server/src/main/resources/db/migration/V2_116__normalize_qna_open_status.sql), [V2_117](../../api-server/src/main/resources/db/migration/V2_117__add_survey_release_flag.sql), [V2_118](../../api-server/src/main/resources/db/migration/V2_118__add_temporary_password_flag.sql) | 2026-10-01 | - |

## DEC-OPS-208

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-208 | accepted | **권한 그룹 버전에서 구성원 변경을 빼고, 메뉴 구조와 그 메뉴의 그룹 표시를 한 초안으로 저장한다(D1·D2·D6).** ① 그룹 버전은 GROUP·GROUP_GRANT 이력만, 구성원 버전은 그 사용자 이력만 본다. ② 그룹 생성·수정·권한 저장은 저장 뒤 스냅샷을 돌려준다. ③ 그룹 쪽 구성원 일괄 추가·회수는 '추가는 비구성원, 회수는 구성원' 전제로 동시성을 보고 어긋난 사람을 이름으로 밝혀 409로 거부한다. 이름을 밝히므로 AUTHRT_ASSIGN과 AUTHRT_READ를 함께 요구한다. ④ 그룹 복제는 AUTHRT_CREATE·AUTHRT_GRANT를 요구하고 구성원과 카탈로그 밖 기능권한은 옮기지 않으며 이력 사유에 원본을 남긴다. ⑤ 메뉴 구조 버전은 메뉴 전체 행의 요약값이다. 저장은 메뉴 → ADMIN 순서로 잠근 뒤 새 문장으로 다시 읽어 판정하고, 3단계 제한은 옮긴 메뉴와 하위에만 둔다. 옮긴 메뉴가 어떤 그룹에서 숨겨지면 그룹을 밝혀 거부하되 새 메뉴의 호환 관리자 배정은 반영한다. 상위 메뉴 표시는 묵시로 주지 않는다. | 사용자 승인(D1~D6 권장안). 구성원 이력이 그룹 버전에 섞여 권한 탭 저장이 409가 됐고, 메뉴를 옮기면 새 상위 표시가 없는 그룹에서 메뉴가 조용히 사라졌다. 적대적 검토가 잠금 스냅샷 때문에 대기 중 커밋된 하위가 상위와 함께 지워지는 경로를 찾았고 실측으로 확인했다. | [MenuService](../../business-core/src/main/java/nuri/business/service/menu/MenuService.java), [MenuStructurePlan](../../business-core/src/main/java/nuri/business/service/menu/MenuStructurePlan.java), [AuthorizationAdministrationService](../../business-core/src/main/java/nuri/business/service/auth/AuthorizationAdministrationService.java) | 2026-10-02 | - |

## DEC-OPS-209

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-209 | accepted | **메뉴·화면·권한 관리 화면을 과업 단위로 다시 짠다(D1·D3·D4·D6).** ① 메뉴 관리는 영역 탭 아래 섹션·화면 보드와 인스펙터다. 끌기·이동 대화상자·잘라내기/붙여넣기·Alt+방향키로 옮기고 이름·연결 화면·설명·보이는 그룹을 한 초안에서 고쳐 '변경 저장' 한 번으로 저장한다(카탈로그 §A2 의 페이지 범위 저장 — 변경이 있을 때만 활성, 저장 전 변경 목록). 이전 프로그램 연결은 읽기 전용으로 둔다. 저장 전 요약이 서버와 같은 규칙으로 숨겨지는 그룹을 밝혀 막는다. ② '프로그램 관리'를 '화면 관리'로 바꿔 생성 화면 목록을 기본 탭으로, 이전 프로그램 원장을 둘째 탭으로 둔다. 메뉴→화면 판정은 화면 관리·권한 작업대가 같은 함수를 쓴다(정확한 정적 별칭만 한 번 따라가고 사용 중 메뉴만 센다). ③ 권한 작업대는 화면별 권한(기본)·기능별 권한·구성원·기본 정보·변경 이력 탭이다. 화면별 표는 메뉴 표시·화면 진입·등록·수정·삭제를 따로 두고, 묶음 칸 일괄 선택은 보호 권한·`*_ALL`·다른 화면의 진입 권한을 뺀다. 구성원 일괄 추가·회수, 그룹 복제, 메뉴 미리보기를 둔다. | 사용자 승인(D1~D6 권장안). 메뉴 표시와 진입 권한이 다른 탭에 있어 메뉴가 왜 안 보이는지 알 수 없었고, 메뉴 순서·속성·그룹 표시가 따로 저장돼 중간 상태가 남았다. 묶음 칸이 남의 자료 권한까지 켜는 경로를 적대적 검토가 찾았다. | [메뉴 관리](../../frontend/src/app/admin/system/menus/MenuAdminClient.tsx), [화면 관리](../../frontend/src/app/admin/system/programs/ProgramAdminClient.tsx), [권한 작업대](../../frontend/src/app/admin/security/authority/SecurityHubClient.tsx), [메뉴→화면 판정](../../frontend/src/lib/navigation/menu-screen-resolution.ts) | 2026-10-02 | - |

## DEC-OPS-210

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-210 | accepted | **권한 묶음 11개를 원장에 두고 권한 작업대에서 그룹 초안에 더하며, 두 그룹을 읽기 전용으로 비교한다(D5).** ① 원장 `permission-bundles.json` 을 화면 목록 생성기가 검증·투영한다(권한 코드 실재, 보호 여부 일치, 여는 화면 1개 이상, 같은 권한 집합 거부). 묶음이 여는 화면은 진입 권한을 충족하는 화면으로 계산한다. ② 적용은 기능권한과 그 화면 메뉴·상위 메뉴 표시를 초안에 명시적으로 더할 뿐이고 저장은 기존 경로(버전 확인·보호 권한 GRANT+ASSIGN·마지막 관리자 보호·감사)를 탄다. 빼기는 두지 않는다. 진입 권한이 없는 화면의 메뉴는 더하지 않고 안내한다. 보호 권한 경고는 저장본과 비교한다. ③ 로그인 정책 쓰기 권한은 어떤 묶음에도 넣지 않는다(GAP-SEC-006). ④ 그룹 비교는 화면별·기능별로 한쪽에만 있는 권한 이름을 글자로 보이고 편집으로 이어 준다. | 사용자 승인(D5 권장안: 인가 의미는 그대로). 새 그룹을 만들 때 수십 칸을 손으로 고르다 진입 권한을 빠뜨려 메뉴가 보이지 않았다. 묶음을 그룹으로 만들지 않은 것은 배정·회수 의미가 바뀌기 때문이다. | [묶음 원장](../../config/governance/permission-bundles.json), [생성기](../../scripts/generate-screen-registry.mjs), [묶음 적용](../../frontend/src/app/admin/security/authority/components/PermissionBundleDialog.tsx), [그룹 비교](../../frontend/src/app/admin/security/authority/components/GroupComparison.tsx) | 2026-10-02 | - |

## DEC-OPS-211

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-211 | accepted | **V2_119 가 메뉴 이름 '프로그램 관리'를 '화면 관리'로 바꾸고 메뉴가 참조하지 않는 레거시 프로그램 행을 지운다(사용자 사전 승인 2026-10-02).** ① 이름은 경로가 `/admin/system/programs` 이고 이름이 '프로그램 관리'인 행만 바꾼다(다른 이름으로 고친 환경은 두지 않는다). ② 삭제는 시드가 넣은 레거시 프로그램 17건과 표지 두 개(저장 경로·자동생성 이름)가 모두 맞는 자동생성 게시판 프로그램 1건 중 어떤 메뉴도 참조하지 않는 행만이다. 도입 기관이 등록한 프로그램은 건드리지 않는다. 지운 행을 남기는 감사 테이블이 없어 복원 원본은 적용 직전 백업이다. | 메뉴가 화면 경로로 연결되며 프로그램 원장이 화면 목록과 이름이 겹쳤고, URL 인가 시절의 서술자 행이 소비처 없이 남아 화면 관리의 이전 프로그램 탭을 채우고 있었다. | [V2_119](../../api-server/src/main/resources/db/migration/V2_119__rename_screen_menu_and_retire_legacy_programs.sql), [마이그레이션 검증](../../api-server/src/test/java/nuri/api/schema/ScreenMenuRenameProgramRetirementMigrationIntegrationTest.java) | 2026-10-02 | - |

## DEC-OPS-212

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-212 | accepted | **V2_119 를 공유 OCI DB 에 적용한다(2026-10-02 사용자 사전 승인, PR #824 병합 뒤).** pg_dump 백업(목차 확인) 뒤 Flyway 12.4.0 으로 2.118→2.119 를 적용했고 validate 가 138개 마이그레이션에서 성공했다. 함께 돈 반복 시드 `R__zz_seed_base_admin` 은 구 매핑 표가 없고 메뉴·배정이 이미 있어 아무것도 바꾸지 않는다(적용 전 읽기 확인). 읽기 확인: 메뉴 9010230 '화면 관리'(수정자 SYSTEM), `tb_prgrm_lst` 18→0행(적용 전 18행 모두 메뉴 참조 0 — 시드 17건과 표지가 맞는 EgovBBSMaster 1건), 메뉴 77·권한 배정 662행 불변. | DEC-OPS-211 의 데이터 변경을 사용자가 미리 승인했다. dev 스택이 OCI 를 보므로 적용하지 않으면 다음 기동이 승인 경계 밖에서 마이그레이션을 실행한다. 지운 행의 원본은 적용 직전 백업이다. | [V2_119](../../api-server/src/main/resources/db/migration/V2_119__rename_screen_menu_and_retire_legacy_programs.sql), [DEC-OPS-211](../../.agent/memory/decisions.md) | 2026-10-03 | - |

## DEC-OPS-213

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-213 | accepted | **로그인 정책 쓰기에 보호 계정 가드와 마지막 관리자 보호를 둔다(GAP-SEC-006 종료).** ① 등록·수정·삭제는 대상 로그인 ID 를 사용자 식별자로 풀어 계정 상태 변경과 같은 보호 계정 가드를 부른다 — 보호 계정이면 권한 설정·배정이 함께 필요하다. ② 접속 제한(`lmt_yn='Y'`)은 로그인을 막으므로 마지막 활성 권한관리자 수에서 뺀다. 등록·수정이 마지막 관리자의 접속을 막으면 거부한다. IP·시간대 제한은 그 조건에서 로그인할 수 있어 수를 줄이지 않는다. ③ login → auth 직접 참조의 패키지 순환은 포트 `ProtectedAccountChangeGuard` 로 끊는다. ④ 인가 정책 원장이 세 경로의 가드 호출과 관리자 수 조건을 필수 토큰으로 고정한다. 일반 계정 대상에서 호출자 권한을 DB 로 다시 확인하는 일은 하지 않는다 — 다른 관리 쓰기와 같은 수준이다. | 로그인 정책 권한만으로 최고 관리자의 로그인을 막을 수 있었다. 마지막 관리자 보호를 옆으로 돌아가는 경로라 가드만으로는 닫히지 않았다. 사용자 지시(2026-10-03 "따로 판단이 필요한 부분도 해결"). | [LoginPolicyManageService](../../business-core/src/main/java/nuri/business/service/login/LoginPolicyManageService.java), [포트](../../business-core/src/main/java/nuri/business/service/login/ProtectedAccountChangeGuard.java), [통합 검증](../../api-server/src/test/java/nuri/api/schema/ProtectedAccountAdministrationIntegrationTest.java) | 2026-10-03 | DEC-OPS-210 ③(로그인 정책 쓰기 묶음 제외) |

## DEC-OPS-214

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-214 | accepted | **권한 묶음은 카탈로그 전부를 분류하고, 누구나 들어가는 관련 화면의 메뉴도 더한다(DEC-OPS-210 보완).** ① 원장의 `excluded`(사유 필수)와 묶음이 카탈로그 권한 250개를 남김없이 나눈다(묶음 239·제외 11) — 생성기가 빠짐·중복·없는 코드를 거부한다. 로그인 정책 4개는 '사용자·조직 관리'로 돌아간다(DEC-OPS-213). ② 새 묶음 '다른 사람 업무 자료 대행'은 주소록·일정·스크랩·부서 업무·업무 보고와 메모 보고 조회·삭제의 대행 권한이다. ③ 제외: 첨부 관리자 권한 3개(공개 범위를 보지 않고 비밀·회원 전용·삭제된 글의 첨부까지 연다), 메모 보고 전체 수정(지시 권한까지 통과시킨다 — GAP-MEMO-001), 화면 없는 약식 결재 관리 경로 5개, 워크플로우 데모, 후속 작업 재처리(감사 원장 열람과 분리). ④ 진입 권한이 빈 화면 중 쓰기 귀속에 묶음 권한이 있는 화면을 관련 화면으로 계산해 그 메뉴와 상위 메뉴를 함께 더한다. 표시 리터럴은 쓰지 않는다. 사실 검사가 제외 사유의 서버 근거를 고정한다. | 묶음 밖 권한 35개가 판단 없이 남아 있었고, '기본 업무' 묶음은 쪽지함·일정 같은 화면의 메뉴를 더하지 못했다. 사용자 지시(2026-10-03). | [묶음 원장](../../config/governance/permission-bundles.json), [생성기](../../scripts/generate-screen-registry.mjs), [묶음 모델](../../frontend/src/app/admin/security/authority/components/permission-bundle-model.ts) | 2026-10-03 | - |

## DEC-OPS-215

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-215 | accepted | **V2_120 이 ROLE_USER 의 들어갈 수 없는 설문 관리 메뉴 표시를 회수한다.** ROLE_USER 가 설문 관리 화면 진입 권한(SURVEY_READ_ALL·SURVEY_RSP_READ, ANY)이 없을 때만, 경로가 그대로인 '설문·투표 관리' 묶음 메뉴 5개를 회수한다. 그 뒤 '관리 센터' 아래에 남는 표시가 없으면 그것도 회수하고 배정마다 GROUP_GRANT REMOVE 이력을 남긴다. 다른 그룹으로 진입 권한을 받았거나 그 메뉴를 ROLE_USER 에서만 받는 구성원이 있으면 지우지 않는다(사용자의 모든 그룹 합집합으로 메뉴를 보이므로). 참여 메뉴(설문·투표 참여)와 다른 그룹 배정은 그대로다. | 옛 역할-메뉴 매핑을 옮긴 V2_98~100 이 남긴 배정이다. 메뉴가 배정됐지만 진입 권한이 없어 들어갈 수 없었다(DEC-OPS-186 이 화면에서는 숨겼다). 2026-10-03 OCI 읽기 dry-run: 6행 회수, 영향 구성원 0명. 사용자 지시(2026-10-03). | [V2_120](../../api-server/src/main/resources/db/migration/V2_120__revoke_unenterable_survey_admin_menus_from_user.sql), [마이그레이션 검증](../../api-server/src/test/java/nuri/api/schema/UserSurveyAdminNavigationRetirementMigrationIntegrationTest.java) | 2026-10-03 | - |

## DEC-OPS-216

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-216 | accepted | **프런트 의존성 감사는 운영 여부를 `pnpm audit --prod` 보고서로 판정한다.** 정책 스크립트가 전체 보고서와 운영 보고서를 함께 조회하고, 운영 보고서에 있는 High 만 차단한다. 운영 보고서가 형식에 맞지 않거나 전체 보고서에 없는 권고를 담으면 실패한다. 함께, 어디서도 가져오지 않던 운영 의존성 `fast-glob` 을 걷는다. | 2026-10-03 braces 권고(GHSA-vfj7-8cjw-p6xm, 패치 버전 없음)가 모든 PR 을 막았다. pnpm 9 의 audit JSON 은 finding 에 `dev` 를 싣지 않아, 종전 판정은 모든 High 를 운영으로 봤다. 그래서 CTX-011 의 "개발 전용 High 는 경고" 정책이 한 번도 그대로 동작하지 않았다. 남은 braces 경로는 eslint-config-next·shadcn 개발 도구뿐이고, `--prod` 감사는 0건이다. 차단 조건과 fail-closed 문구는 그대로다. red 증명: 판정을 되돌리면 새 계약 2건이 실패한다. | [정책 스크립트](../../scripts/frontend-audit-policy.mjs), [계약](../../scripts/frontend-audit-policy.test.mjs), [CI 가이드](../03-guides/cicd-pipeline.md) | 2026-10-03 | - |

## DEC-OPS-217

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-217 | accepted | **V2_120 을 공유 OCI DB 에 적용한다(2026-10-03, PR #830 병합 뒤).** 읽기 dry-run(회수 6행·영향 구성원 0명) → pg_dump 백업(목차 확인) → Flyway 12.4.0 으로 2.119→2.120 적용 → validate(마이그레이션 139개) 순서로 했다. 반복 시드는 체크섬이 그대로라 다시 돌지 않았다. 읽기 확인: ROLE_USER 의 설문 관리 메뉴 표시 5개와 관리 센터 1개가 0건, 변경 이력 `migration:2.120` 6행, 전체 배정 662→656행, 메뉴 77개 그대로, 참여 메뉴(설문 참여·투표 참여·참여) 배정 유지. | 사용자 지시(2026-10-03 "따로 판단이 필요한 부분도 해결")에 따른 DEC-OPS-215 의 집행이다. dev 스택이 OCI 를 보므로, 적용하지 않으면 다음 기동이 승인 경계 밖에서 마이그레이션을 실행한다. 지운 배정의 원본은 적용 직전 백업과 변경 이력에 있다. | [V2_120](../../api-server/src/main/resources/db/migration/V2_120__revoke_unenterable_survey_admin_menus_from_user.sql), [DEC-OPS-215](../../.agent/memory/decisions.md) | 2026-10-03 | - |

## DEC-OPS-218

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-218 | accepted | **결재 동선을 A·B안 혼합으로 고친다(2026-10-03 사용자 선택).** ① 기안: 내가 올린 결재에서 업무 구분별로 쓴 결재선·최근 결재자를 제안하고, 업무 구분 설명을 본문 양식으로 넣으며, 마지막 업무 구분을 기억하고, 복제해서 새로 기안한다. 결재자는 단계 안에 펼친 피커에서 여러 명을 고르고 자격 없는 사람은 사유와 함께 막는다. 최종 확인 단계에서 결재자 자격을 상신 검사와 같은 규칙으로 미리 본다. ② 처리: 의견 칸 옆에 승인·반려·보완 요청을 둔다. 단건 승인은 확인 대신 10초 되돌리기이고 반려만 확인한다. 고른 여러 건·업무 구분별 묶음은 한 번 확인하고, 집중 모드는 키보드(J·K·A·R·Q·Esc)로 처리한다. ③ 추적: 목록이 지금 차례·대기 일수·부재·보완 요청을 보이고, 기안자는 하루 한 번 재알림·처리 전 결재자 바꾸기·보완 답변(본문 수정 시 앞선 승인 유지)·회수 후 바로 고치기를 한다. ④ 알림은 탭과 문서 번호(`?tab=…&doc=N`)로 그 문서를 연다. V2_121 이 처리 이력을 추가만 하는 표로 남긴다. | 연구 결과 기안자는 결재선을 매번 다시 고르고, 반려가 보완 요청을 겸해 문서가 처음부터 다시 돌았으며, 부재한 결재자에 막힌 문서를 기안자가 풀 길이 없었다. 저장 결재선·서버 임시저장·참조자·알림 카드 안 승인은 뒤로 미룬다. | [InformalSanctionService](../../business-app/src/main/java/nuri/business/service/informalsanction/InformalSanctionService.java), [ApprovalLineAssistService](../../business-app/src/main/java/nuri/business/service/informalsanction/ApprovalLineAssistService.java), [V2_121](../../api-server/src/main/resources/db/migration/V2_121__add_approval_process_history.sql), [결재 허브](../../frontend/src/app/approvals/ApprovalHubClient.tsx) | 2026-10-03 | - |

## DEC-OPS-219

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-219 | accepted | **결재 기안을 서버에 임시저장한다(D3, 2026-10-03 사용자 "권장대로 진행").** ① V2_122 가 본문·결재선 두 표를 결재 표와 따로 둔다 — 대기함·알림·통계·결재선 제안에 섞이지 않는다. 용어 IFML_ATRZ_TMPR_STRG_SN 을 등록하고, 잠금 열은 결재 표 선례대로 `version integer` 다. 이 열과 V2_0 결재 표에서 이름을 그대로 가져온 `aplcnt_id`·`task_se_cd` 는 등록 용어가 아니다(헌법 제9조 보고). ② 본인 것만 다루고(남의 것은 404) 1인 20건(C014), 수정은 버전 필수(C013), 사용자 삭제 시 CASCADE, 만료·관리자 열람은 없다. ③ 저장은 형식만 보고, 다시 열 때 지금 자격으로 판정하며 비활성 계정 이름은 싣지 않는다. ④ 상신은 `temporaryDraftSn`·`temporaryDraftVersion` 쿼리로 같은 트랜잭션에서 임시저장을 먼저 지운다(어긋나면 409, 상신이 실패하면 남는다). 이 파라미터에 제약 어노테이션을 달지 않는다 — Spring 7 메서드 검증이 본문 필드 오류를 지운다. ⑤ 쓰기 권한 census 가 import 경로 안의 `confirm` 을 승인으로 세던 오탐을 걷었다. | 쓰다 만 기안이 창을 닫으면 사라졌다. 비활성(D) 사용자의 임시저장은 남는다(관리자 경로 없음). | [V2_122](../../api-server/src/main/resources/db/migration/V2_122__add_approval_temporary_drafts.sql), [ApprovalTemporaryDraftService](../../business-app/src/main/java/nuri/business/service/informalsanction/ApprovalTemporaryDraftService.java), [기안 대화상자](../../frontend/src/app/approvals/ApprovalDraftDialog.tsx), [census](../../scripts/operation-consumer-census.mjs) | 2026-10-04 | DEC-OPS-218 의 서버 임시저장 보류 부분 |

## DEC-OPS-220

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-220 | accepted | **V2_121 을 공유 OCI DB 에 적용한다(2026-10-03 사용자 사전 승인 — 이 결재 작업의 V2_121·V2_122 에 한정).** 병합된 main(f63b93e2a)에서 꺼낸 마이그레이션 폴더로 info(대기 2.121 하나, 반복 시드 변화 없음) → pg_dump 백업(목차 확인) → Flyway 12.4.0 migrate → validate(140개) 순서로 했다. 읽기 확인: `tb_ifml_atrz_prcs_hstry` 열 10개·제약 4개·주석(표준 단어 '비공식결재')·0행. V2_122 는 DEC-OPS-219 병합 직후 같은 절차로 적용한다. | 작업 트리에는 아직 병합되지 않은 마이그레이션이 있을 수 있어, 병합본에서 꺼낸 폴더로만 돌렸다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. | [V2_121](../../api-server/src/main/resources/db/migration/V2_121__add_approval_process_history.sql), [DEC-OPS-218](../../.agent/memory/decisions.md) | 2026-10-03 | - |

## DEC-OPS-221

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-221 | accepted | **V2_122 를 공유 OCI DB 에 적용한다(2026-10-03 사용자 사전 승인 — 이 결재 작업의 V2_121·V2_122 에 한정, PR #833 병합 뒤).** 병합본(d325646cd)에서 꺼낸 마이그레이션 폴더로 info(대기 2.122 하나) → 사전 확인(두 표·용어 없음) → pg_dump 백업(목차 확인) → Flyway 12.4.0 migrate → validate(141개) 순서로 했다. 읽기 확인: `tb_ifml_atrz_tmpr_strg`(열 10)·`_dtl`(열 8)과 주석, FK 두 개 모두 CASCADE, CHECK 3개, 용어 `IFML_ATRZ_TMPR_STRG_SN`(일련번호N19) 등록(13230→13231), 0행. | DEC-OPS-219 의 서버 임시저장 표다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 사전 승인은 이 두 마이그레이션으로 끝난다. | [V2_122](../../api-server/src/main/resources/db/migration/V2_122__add_approval_temporary_drafts.sql), [DEC-OPS-219](../../.agent/memory/decisions.md) | 2026-10-04 | - |

## DEC-OPS-222

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-222 | accepted | **결재 참조자를 둔다(D4, 2026-10-04 사용자 결정).** ① 참조자는 참조된 문서를 모든 상태·모든 차수에서 항상 읽는다. 참조는 차수마다 기록하고 지우지 않는다(V2_123, 결재 표와 별도라 대기 건수·차례·결재선 제안에 섞이지 않는다). 결재 조회 권한이 있어야 지정되며, 레거시 `/informal-sanctions/{id}`(INFORMAL_READ) 경로로는 그 권한을 회수해도 읽는다. ② 기안자가 상신·재상신 때 지정한다(본인·그 차수 결재선 제외, 사용 중 계정, 문서 누적 20명). 그 차수에 기안자가 한 명도 지정하지 않았으면 지금 차례인 결재자가 더한다(차례 아님 403, 이미 처리·진행 중 아님·기안자 지정 차수 409). 결재자가 더한 참조자는 그 결재자보다 넓게(모든 차수) 읽는다. ③ 알림은 처음 지정될 때와, 최종 결과 때 현재 차수 참조자 중 실제로 있는 사용자에게만 보낸다(지워진 계정이면 알림 FK 위반으로 승인 전체가 롤백된다). ④ 참조자는 읽기 전용이고 목록은 숨은 참조가 아니다. 재상신은 이전 참조자를 미리 채우지 않는다(채우면 그 차수의 결재자 추가가 막힌다). 지정 거부(400) 문구에 비활성 계정 이름이 실리는 것은 결재자 검사 선례와 같다. | 사용자가 참조자는 항상 읽고, 기안자가 넣지 않았으면 결재자가 더한다고 정했다. 나머지는 결정 위임에 따른 권고다. | [V2_123](../../api-server/src/main/resources/db/migration/V2_123__add_approval_references.sql), [InformalSanctionService](../../business-app/src/main/java/nuri/business/service/informalsanction/InformalSanctionService.java), [참조자 패널](../../frontend/src/app/approvals/ApprovalReferencePanel.tsx) | 2026-10-04 | DEC-OPS-218 의 참조자 보류 부분 |

## DEC-OPS-223

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-223 | accepted | **V2_123 을 공유 OCI DB 에 적용한다(2026-10-04 사용자 사전 승인 — V2_123 에 한정, PR #835 병합 뒤).** 병합본(1be293475)에서 꺼낸 마이그레이션 폴더로 info(대기 2.123 하나) → 사전 확인(두 표 없음·용어 13231) → pg_dump 백업(목차 확인) → Flyway 12.4.0 migrate → validate(142개) 순서로 했다. 읽기 확인: `tb_ifml_atrz_rfpr`·`tb_ifml_atrz_tmpr_strg_rfpr`(각 열 6)와 주석, PK `(ifml_atrz_sn, atrz_cycl, user_id)`·`(ifml_atrz_tmpr_strg_sn, user_id)`, 결재 이력 FK 와 임시저장 FK(CASCADE), 0행, 새 용어 없음(13231 유지). | DEC-OPS-222 의 참조자 표다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 사전 승인은 이 마이그레이션으로 끝난다. | [V2_123](../../api-server/src/main/resources/db/migration/V2_123__add_approval_references.sql), [DEC-OPS-222](../../.agent/memory/decisions.md) | 2026-10-04 | - |

## DEC-OPS-224

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-224 | accepted | **프로그램 목록을 퇴역한다(2026-10-04 사용자 승인).** ① 화면 관리의 '이전 프로그램' 탭·폼·`?page=` 동기화, 프로그램 API 5개·서비스·엔티티, 프로그램 URL로 메뉴를 찾던 도달 불가 레거시 JSP 문맥을 걷고 화면 관리 진입 권한을 MENU_READ로 옮긴다. ② 앱은 프로그램 원장을 읽지 않는다. 단건 메뉴 쓰기는 비어 있지 않은 연결 프로그램을 400으로 거부하고, 수정에 성공하면 남은 레거시 연결을 걷는다. ③ PROGRAM_CREATE·READ·UPDATE·DELETE를 권한 원장과 '메뉴·코드 설정' 묶음에서 빼고, V2_124가 기존 배정을 지우며 행마다 REMOVE 이력을 남긴다. 기동 때 원장 URL로만 경로를 얻던 사용 중 말단 메뉴가 있으면 적용 전에 멈춘다. ④ tb_prgrm_lst·prgrm_file_nm·외래 키는 다음 릴리스의 별도 승인까지 남긴다(GAP-PROGRAM-001). | 원장은 OCI 0행이고 메뉴를 프로그램에 잇는 화면이 없어 무엇을 써도 반영되지 않았다. 코드만 빼고 배정을 남기면 권한 스냅샷이 fail-closed로 그 그룹의 인증을 막는다. 걷은 MenuIntegrationService를 인용하는 disposition 승인 근거 2건과 전환 전 스냅샷 authorization-source-inventory.json은 기록으로 둔다. | [V2_124](../../api-server/src/main/resources/db/migration/V2_124__retire_program_permission_grants.sql), [런북](../04-operations/authorization-cutover-runbook.md#프로그램-목록-퇴역v2_124), [MenuService](../../business-core/src/main/java/nuri/business/service/menu/MenuService.java) | 2026-10-04 | DEC-OPS-209 ②의 이전 프로그램 둘째 탭과 ①의 읽기 전용 연결, DEC-OPS-210·214 묶음의 PROGRAM_* 포함 부분, ADR-0014 결정 2·3의 프로그램 연결·연결 프로그램 삭제 409 |

## DEC-OPS-225

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-225 | accepted | **메뉴·화면·권한 관리를 한 화면 업무면으로 압축하고 시안 기능을 되살린다(사용자 승인).** ① 위치 지정 없는 스크롤 상자 안의 sr-only 요소가 만들던 빈 스크롤(1,000~2,800px)을 고치고 계약으로 막는다. ② A1·A2 셸의 `fill`(lg 이상·높이 600px 이상, CSS만)이 남은 높이를 채워 주 스크롤 영역 하나를 두고, 낮은 창에서는 페이지 스크롤로 물러난다(권한 허브는 그룹·변경 이력 탭). 그 조건의 fill 화면은 푸터를 숨겨 푸터 몫(5rem)만큼 작업 영역을 늘린다. ③ 업무 표 행 토큰 `--work-cell-px/py`를 두되 밀도는 전역 한 곳이 정하고, 토큰을 읽는 그리드와 `rowDensity="work"` 화면을 사유와 함께 exact 등재한다. ④ 메뉴(되돌리기 `Ctrl+Z`·변경 목록 여닫기·탭 수·그룹별 결과 칩), 화면 관리(건수 붙은 보기 단추·넘어가는 경로 표·한 줄 행), 권한(첫 그룹 자동 선택·저장 막대의 권한 변경 되돌리기·문제/바뀐 줄 거르기·영역·섹션 줄 메뉴 표시의 하위 일괄)을 되살린다. 일괄 진입 권한 추가와 영역·섹션 줄 '화면 진입' 칸은 보호·`*_ALL` 권한이 필요한 화면을 더하지도 끄지도 않고 '직접 고르기'로 센다(H3). ⑤ 넓은 화면에서 사이드바를 접고 상태는 이 브라우저에만 둔다. | 시안과 달리 업무면이 화면 두세 개 길이로 스크롤했고, 영역 줄 '화면 진입' 칸 한 번이 POLL_READ_ALL 을 더했다. 밀도를 화면별로 고르면 헌법 제2조 2항과 충돌해 토큰을 그리드 종류에 묶었다. 앱 실화면 높이·e2e·VRT 기준선은 격리 실행으로 확인한다. | [카탈로그 §4](../02-architecture/work-screen-grammar-catalog.md#4-밀도-계약), [fill 셸](../../frontend/src/app/components/patterns/work-fill.ts), [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts) | 2026-10-04 | DEC-OPS-209 ③의 묶음 칸 동작 중 영역·섹션 줄 메뉴 표시(아래 메뉴 전체 일괄로), 권한 설계 §4.5 부모 선택 규칙의 그 칸 |

## DEC-OPS-226

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-226 | accepted | **V2_124 를 공유 OCI DB 에 적용한다(2026-10-04 사용자 승인 — 프로그램 목록 퇴역의 배정 정리, PR #837 병합 뒤).** 병합본(3faade995)에서 꺼낸 마이그레이션 폴더로 info(대기 2.124 와 체크섬이 바뀐 반복 시드) → 사전 읽기(PROGRAM_* 배정 8행, 가드 대상 0) → pg_dump 백업(목차 확인) → Flyway 12.4.0 migrate → validate(144개) 순서로 했다. 읽기 확인: PROGRAM_* 배정 0(전체 656→648), 변경 이력 `migration:2.124` REMOVE 8행(ROLE_ADMIN·ROLE_SYSTEM 각 4, 원장 버전 2b7eac07…), 메뉴 77·그룹 4 불변. 반복 시드는 메뉴가 있어 배정 블록을 건너뛰었다. | DEC-OPS-224 의 배정 정리다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용하고, 남은 배정은 권한 스냅샷을 원장에 없는 코드로 막는다. 지운 행의 원본은 적용 직전 백업과 변경 이력에 있다. | [V2_124](../../api-server/src/main/resources/db/migration/V2_124__retire_program_permission_grants.sql), [DEC-OPS-224](../../.agent/memory/decisions.md) | 2026-10-05 | - |

## DEC-OPS-227

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-227 | accepted | **넓은 화면의 사이드바 접기를 찾기 쉽게 한다.** ① 사이드바 맨 위(메뉴 탐색·즐겨찾기 앞)에 글자가 보이는 '사이드바 접기' 단추(lg 이상)를 둔다 — 즐겨찾기가 많아도 밀리지 않는다. ② 접으면 사이드바 자리에 폭 3rem 막대가 남아 '사이드바 펼치기' 단추(아이콘 아래 글자 '펼치기')를 보이고, 본문 왼쪽 여백은 0 이 아니라 막대 폭이다. 막대는 `<html data-sidebar-collapsed>` 를 보는 CSS 로만 보이며(단일 DOM, ADR-0006) 펼친 상태·lg 미만에서는 표시하지 않고, 인쇄에서는 막대도 여백도 남기지 않는다. ③ 두 단추는 누르면 자신이 사라지므로 포커스를 서로에게 넘긴다. 머리글 단추와 '메뉴 보기'의 펼치기는 그대로다. | 사용자가 "접었다 펴는 기능이 적용 안 된 것 같다"고 보고했다 — 머리글 맨 왼쪽의 작은 아이콘 하나뿐이었고, 접으면 사이드바가 통째로 사라져 되돌리는 길도 그 아이콘뿐이었다. 대시보드·로그인 로그 시각 회귀 기준선은 Linux 워크플로로 다시 만든다. | [카탈로그 §4](../02-architecture/work-screen-grammar-catalog.md#4-밀도-계약), [접힘 막대](https://github.com/lkindo/egov-enterprise/blob/119b12a08d3968ccb75e6781fd1611c657df0c70/frontend/src/app/components/layout/sidebar-rail.tsx), [셸 계약](../../frontend/src/app/components/layout/__tests__/shell-accessibility-contract.test.ts) | 2026-10-05 | DEC-OPS-225 ⑤가 시행한 접힘 표현 중 사이드바 전체 숨김·본문 여백 0(카탈로그 §4 종전 서술) |

## DEC-OPS-228

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-228 | accepted | **넓은 화면의 사이드바 접기 단추를 경계선의 원형 아이콘 하나로 줄인다.** ① 사이드바 오른쪽 경계선에 반쯤 걸친 32px 원형 단추를 늘 보이게 두고, 아이콘만 그리며 이름은 '사이드바 접기·펼치기'·상태는 `aria-expanded` 다. ② 접으면 사이드바 상자는 1.25rem 띠로 줄고 안쪽 내용만 숨는다. 단추는 상자 안에 남아 같은 높이에서 좌우로만 움직이고 포커스를 잃지 않는다. ③ 머리글 아이콘·사이드바 맨 위 글자 단추·접힘 막대를 걷는다. '메뉴 보기'의 펼치기와 그리기 전 복원은 그대로다. | 사용자 결정(2026-10-05): 로고 옆 아이콘은 보지 못했고, 경계선에 아이콘으로 두는 편이 직관적이며 하나만 남긴다. 호버로만 나타나는 방식은 터치에서 보이지 않아 쓰지 않는다. 상자를 없애지 않고 줄이므로 단추가 랜드마크 안에 있고 상대 단추로 포커스를 넘길 필요가 없다. 대시보드·로그인 로그 시각 회귀 기준선은 Linux 워크플로로 다시 만든다. | [카탈로그 §4](../02-architecture/work-screen-grammar-catalog.md#4-밀도-계약), [경계선 단추](../../frontend/src/app/components/layout/sidebar-edge-toggle.tsx), [셸 계약](../../frontend/src/app/components/layout/__tests__/shell-accessibility-contract.test.ts) | 2026-10-05 | DEC-OPS-227 ①의 글자 단추, ②의 3rem 접힘 막대(펼치기 단추·막대 폭 여백), ③의 포커스 넘기기와 머리글 단추 유지, DEC-OPS-225 ⑤가 둔 머리글 접기 아이콘 |

## DEC-OPS-229

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-229 | accepted | **꺼진 '마이페이지관리' 메뉴 행과 남은 메뉴 배정을 정리한다(2026-10-05 사용자 결정).** V2_125 가 메뉴 2030100(경로 `/admin/workspace/my-page`)이 사용 안 함이고 하위가 없을 때만 그 행과 모든 그룹의 메뉴 배정·즐겨찾기를 지운다. 지운 배정마다 REMOVE 이력(`migration:2.125`)을 남긴다. 다시 켰거나 다른 화면으로 바꾼 행은 건너뛰고, 이미 없으면 아무것도 하지 않는다. 빈 테이블 `tb_indv_pg_conts` 는 남긴다(스키마 변경은 별도 승인). 프로젝트 생성기 메뉴 snapshot 에서도 그 행이 빠진다. 새 '내 계정' 화면은 이 결정의 범위가 아니다 — 지금 개인 설정은 계정 메뉴(내 정보·비밀번호·추가 인증)가 맡고, 필요하면 별도 결정으로 정한다. | 화면은 DEC-OPS-070 으로 걷혀 404 인데 메뉴 관리와 그룹 배정에 존재하지 않는 화면을 가리키는 행이 남았다. 2026-10-05 OCI 읽기: 그 행 1개(use_yn N·하위 없음)와 ROLE_ADMIN 배정 1건. 메뉴 행에는 감사 표가 없어 복원 원본은 적용 직전 백업이다. | [V2_125](../../api-server/src/main/resources/db/migration/V2_125__retire_my_page_menu.sql), [마이그레이션 검증](../../api-server/src/test/java/nuri/api/schema/MyPageMenuRetirementMigrationIntegrationTest.java), [런북](../04-operations/authorization-cutover-runbook.md#마이페이지-관리-메뉴-퇴역v2_125) | 2026-10-05 | - |

## DEC-OPS-230

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-230 | accepted | **V2_125 를 공유 OCI DB 에 적용한다(2026-10-05 사용자 승인 — 꺼진 마이페이지관리 메뉴 행 정리, PR #841 병합 뒤).** 병합본(b8c793bde)에서 꺼낸 마이그레이션 폴더로 사전 읽기(2030100 1행: 사용 안 함·하위 0, ROLE_ADMIN 메뉴 배정 1건, 즐겨찾기 0, 행·배정 to_jsonb 출력 보존) → info(대기 2.125 하나) → pg_dump 백업(목차 확인) → Flyway 12.4.0 migrate → validate(147개) 순서로 했다. 읽기 확인: 2030100 행·배정·즐겨찾기 0, 전체 메뉴 77→76(활성 71 불변), 배정 648→647, 변경 이력 `migration:2.125` REMOVE 1행(ROLE_ADMIN·NAVIGATION, 원장 버전 2b7eac07…), 즐겨찾기 3 불변. | DEC-OPS-229 의 집행이다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 지운 행의 원본은 적용 직전 백업·to_jsonb 출력과 변경 이력에 있다. | [V2_125](../../api-server/src/main/resources/db/migration/V2_125__retire_my_page_menu.sql), [DEC-OPS-229](../../.agent/memory/decisions.md) | 2026-10-05 | - |

## DEC-OPS-231

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-231 | accepted | **레거시 연결 프로그램과 빈 마이페이지 콘텐츠 테이블을 앱과 DB 에서 걷는다(GAP-PROGRAM-001 종료, 2026-10-05 사용자 승인).** ① 메뉴 엔티티·요청·응답·구조 행에서 `prgrm_file_nm` 을 걷고 구조 버전 표지를 v2 로 올린다. 경로가 없는 메뉴의 chkURL 은 `#` 다. ② 기동 때 레거시 파일명으로 경로를 채우던 일을 V2_126 이 같은 규칙으로 한 번 한다(NULL 만 — 빈 문자열은 관리자가 비운 경로). ③ 화면 해석기의 목적지는 `modernRoute` 뿐이다. ④ 생성기 메뉴 snapshot 을 형식 2(프로그램 원장·파일명 제외)로 바꾼다. ⑤ V2_127 이 그 컬럼·외래 키와 `tb_prgrm_lst`, 빈 `tb_indv_pg_conts`(행이 있으면 멈춘다)를 지운다. 시드의 구 모델 분기는 표가 있을 때만 돈다. | 앱은 DEC-OPS-224 이후 원장을 읽지 않았다. 매핑을 남긴 채 지우면 메뉴 조회가 깨지므로 매핑 해제를 같은 변경에 둔다. 관측 기간 없이 같은 릴리스에 싣는 예외는 DEC-OPS-233 이다. 이관 카탈로그 `db_columns.json` 은 코드젠 스냅샷이라 두었다. | [V2_126](../../api-server/src/main/resources/db/migration/V2_126__backfill_menu_routes_from_legacy_program_names.sql), [V2_127](../../api-server/src/main/resources/db/migration/V2_127__drop_retired_program_ledger_and_personal_page_contents.sql), [MenuService](../../business-core/src/main/java/nuri/business/service/menu/MenuService.java), [해석기](../../frontend/src/lib/navigation/internal-route.ts), [런북](../04-operations/authorization-cutover-runbook.md#프로그램-원장과-빈-마이페이지-콘텐츠-테이블-폐기v2_126-v2_127) | 2026-10-05 | DEC-OPS-224 ②의 연결 프로그램 400 거부·수정 시 레거시 연결 해제 |

## DEC-OPS-232

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-232 | accepted | **화면 기능 동결 목록을 원장 쪽으로도 대조하고, 걷은 마이페이지 화면의 낡은 항목을 지운다.** 동결 목록의 화면이 원장에 없으면 red 다. 예외는 화면 파일이 없고 어떤 프로필의 투영이 pack 제거 경로로 그 화면을 걷는 경우(축소 프로필의 demo 화면)다. 투영본은 빠진 pack 의 경로를 모르므로 생성기 구조까지 맞는 투영본이면 파일 부재로 판정한다. | DEC-OPS-115 는 '양방향' 대조라 했지만 원장의 화면마다 동결을 찾기만 해서, 2026-09-08 걷은 `/admin/workspace/my-page` 의 동결 항목이 아무것도 지키지 않은 채 한 달 가까이 남았다. 새 게이트 없이 같은 계약을 넓혔다. red 증명: 낡은 항목을 되살리면 실제 원장 검증이 그 화면을 지목하고, 모든 프로필이 남기는 화면을 걷은 합성 저장소도 red 다. | [동결·대조](../../scripts/ui-route-capabilities-contract.mjs), [계약](../../scripts/ui-route-capabilities-contract.test.mjs) | 2026-10-05 | DEC-OPS-115 의 대조 범위 서술 |

## DEC-OPS-233

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-233 | accepted | **V2_127 한 건만 무중단 관측 기간 없이 선행 Expand 와 같은 릴리스에 싣는다(2026-10-05 사용자 승인 — "이번만 내 승인하에 규칙을 무시하고 내가 명령한 작업을 진행해").** ZDM 린터의 `USER_APPROVED_SAME_RELEASE_CONTRACTS` 가 waiver ZDM-2026-0041~0043 의 `id·대상·expandMigration` 조합만 릴리스 기록·7일 관측 검사에서 뺀다. 선행 Expand 의 실재·버전 선후와 waiver 의 형식·증거·만료 검사는 그대로다. 운영 중인 도입 기관은 이 예외를 승계하지 않는다 — 앱을 먼저 배포하고 구버전 인스턴스가 사라진 뒤 적용한다. | 템플릿 프로젝트라 결과를 빨리 보려는 사용자 결정이다. 게이트를 끄거나 릴리스 날짜를 지어내지 않고(H2) 이름 붙은 한 건으로 고정해, 조합이 하나라도 다르면 종전대로 red 다. | [ZDM 린터](../../api-server/src/test/java/nuri/api/harness/ZeroDowntimeMigrationLinterTest.java), [waiver 원장](../../config/governance/zdm-waivers.json), [V2_127](../../api-server/src/main/resources/db/migration/V2_127__drop_retired_program_ledger_and_personal_page_contents.sql), [런북](../04-operations/authorization-cutover-runbook.md#프로그램-원장과-빈-마이페이지-콘텐츠-테이블-폐기v2_126-v2_127) | 2026-10-05 | DEC-OPS-101 의 관측 기간 요구 중 이 한 건 |

## DEC-OPS-234

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-234 | accepted | **V2_126·V2_127 을 공유 OCI DB 에 적용한다(2026-10-05 사용자 승인 — 프로그램 원장과 빈 마이페이지 콘텐츠 테이블 폐기, PR #843 병합 뒤).** 병합본(16eccf0ea)에서 꺼낸 마이그레이션 폴더로 사전 읽기(V2_126 이 채울 메뉴 0행, `tb_prgrm_lst`·`tb_indv_pg_conts` 0행, 구 매핑 표 없음, 연결 프로그램을 가진 메뉴 0개) → info(대기 2.126·2.127, 반복 시드 체크섬 변경) → pg_dump 백업(목차에 세 테이블 구조·데이터와 지울 외래 키 확인) → Flyway 12.4.0 migrate → validate(150개) 순서로 했다. 읽기 확인: 두 테이블·`sq_conts_sn`·`tb_menu_info.prgrm_file_nm`·`fk_tb_menu_info_tb_prgrm_lst` 없음, 메뉴 76(활성 71)·배정 647·즐겨찾기 3 불변. 반복 시드는 메뉴가 있어 배정 블록을 건너뛰었다. | DEC-OPS-231·233 의 집행이다. 적용 전 OCI 를 보는 앱이 떠 있지 않음을 확인했다 — 지운 컬럼을 매핑하는 구버전 앱이 있으면 메뉴 조회가 깨진다. 지운 구조와 행의 원본은 적용 직전 백업이다. | [V2_126](../../api-server/src/main/resources/db/migration/V2_126__backfill_menu_routes_from_legacy_program_names.sql), [V2_127](../../api-server/src/main/resources/db/migration/V2_127__drop_retired_program_ledger_and_personal_page_contents.sql), [DEC-OPS-231](../../.agent/memory/decisions.md) | 2026-10-05 | - |

## DEC-OPS-235

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-235 | accepted | **소스 간결화 재점검(PR #846 뒤)이 걷은 표면과 바뀐 동작을 기록한다.** ① 라우트가 없던 투표 항목 CRUD 서비스를 걷는다 — DEC-OPS-095 ②의 투표 항목 삭제 409 는 이 죽은 경로에만 있어 함께 사라진다(설문 문항·항목의 409 는 그대로). ② 적용처 0개인 인가 애노테이션 6종과 HTTP 로 노출된 적 없는 기관코드 원장 쓰기 4개를 걷는다. INST_CODE_CREATE·UPDATE·DELETE 권한 퇴역은 배정 정리 마이그레이션이 필요한 별도 결정이다. ③ 평문 덤프를 만드는 db-dump.js 를 퇴역하고 보안 게이트의 필수 DB 도구를 db-bridge.js 하나로 둔다. ④ 배너의 게시 예정 건수는 게시 상태 열과 같은 판정을 쓴다(숫자가 줄 수 있다). ⑤ 이관 카탈로그 db_columns.json 은 Flyway 적용 스키마에서 만들고 스키마 검증이 대조한다. | 사용자 요청(2026-10-07 "권장 진행 순서대로 진행")이다. 걷은 항목은 저장소 전체 참조 0건과 반증 검증을 거쳤고, 인가 의미는 바뀌지 않았다(H3). PR #846 이 부서 트리에서 빠뜨린 DEC-OPS-147 C1·C2 도 되돌렸다. | [재점검 결과](source-simplification-recheck-2026-10-07.md) | 2026-10-07 | DEC-OPS-095 ②의 투표 항목 삭제 409(죽은 경로) |

## DEC-OPS-236

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-236 | accepted | **소스 간결화 재점검(PR #848) 병합 뒤 점검이 찾은 결함을 고치고 기록을 바로잡는다.** ① DEC-OPS-235 ④ 가 바뀐 대상을 잘못 적었다 — 바뀐 것은 배너가 아니라 팝업 탭의 '현재 페이지 게시 예정' 건수이며 팝업 '게시 여부' 열과 같은 판정·로컬 오늘을 쓴다(브라우저 시간대에 따라 줄거나 늘 수 있다). ② 부서 트리가 이전 검색어의 결과를 보이는 동안에는 새 검색어에 대해 '없습니다'·건수를 말하지 않고 조회 중임을 알린다. ③ 메뉴 관리 E2E 는 대화상자의 포커스 복귀를 확인한 뒤 진행한다. ④ rename-project.ps1 이 다단계 구명칭의 지표 이름을 바꾸고 붙은 구명칭을 경고로 보고하며, 소스 여덟 곳과 이관 카탈로그 재생성 스위치(`dbColumns.write`)를 이름 바꾸기에 안전하게 고친다. | 병합 뒤 조사·반증 각 5개 점검이 실행 중인 시스템을 깨는 회귀는 찾지 못했고, 이 PR 이 만든 작은 결함과 기록 오기를 찾았다. main CI e2e 실패(run 37530322956)는 이 PR 과 무관한 테스트 경합이며 격리 E2E 에서 결정적으로 재현해 정정을 확인했다. | [후속 정정](source-simplification-recheck-2026-10-07.md#병합-뒤-점검과-후속-정정) | 2026-10-07 | DEC-OPS-235 ④의 대상 서술 |

## DEC-OPS-237

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-237 | accepted | **2026-10-07 Dependabot 배치를 한 PR 로 적용한다.** ① #850(프런트 15건, next 16.3.8)·#826(temurin 21 alpine 3.24)·#761(io.freefair.lombok 9.8.0, lombok 1.18.48)과 #849 의 라이브러리 3건을 가져온다. #849 의 Gradle wrapper 9.8.0 은 PIT 플러그인 1.19.0 의 `Configuration.setVisible` 이 `--warning-mode fail` 을 막아 빼고, #849 는 닫는다. 사용자 요청으로 dependabot.yml 이 PIT 수정판 배포 전까지 wrapper 9.8.0 이상을 제안하지 않는다. ② #828 로 gradle/actions 핀을 v6.4.0 commit `3f5f9ada…`(서명 태그 확인)로 올리고 재사용 제품 CI 템플릿도 같은 SHA 로 옮긴다. `cache-provider: basic`·캐시 단일 writer 는 유지하고, v6.4.0 의 새 값 `external` 도 계약이 거부한다. ③ SAST-FP-007 보완 소스 두 개를 재검토 후 재결속한다. | PR 마다 평가와 반박 검증을 거쳤고, CI 실패는 Atlas·액션 핀·SAST 해시 갱신뿐이었다. commons-lang3 3.21.0 은 foundation 경로에만 적용되고 api-server 실행 jar 는 Boot BOM 관리값 3.20.0 이다(dependencyInsight 실측). | [CI 가이드](../03-guides/cicd-pipeline.md), [SAST 검토](../04-operations/sast-findings-review.md), [required 계약](../../scripts/required-checks-contract.mjs) | 2026-10-07 | ADR-0022 결정 7의 v6.3.0 commit 지정 부분, dependabot.yml 의 붉은 wrapper PR 유지 방침 |

## DEC-OPS-238

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-238 | accepted | **프로젝트 생성기의 모듈 선택 결함을 닫는다(Phase 0).** ① 필수 외래 키의 부모 기능이 빠진 선택은 계획이 사유를 보이고 생성을 거부한다(자동 포함 없음). DB 생성기가 적용 스키마의 기능 간 외래 키를 선언과 양방향 대조한다. ② 메뉴는 목적지 경로를 소유한 기능에 속하고, 다른 기능이 기여한 탭 메뉴(`menuTabs`)는 그 기능이 빠지면 숨긴다. ③ 메뉴 스냅숏(형식 3)에 그룹별 NAVIGATION을 담아 생성기 시드가 투영하고, 그룹마다 표시 ⊆ 진입 가능을 단언한다. ④ 생성물에서 원본 Atlas·생성기·계약 3건을 규칙 승인 `upstream-atlas`로 걷는다. ⑤ 단계별 자식 출력을 가려 로그로 남기고 `full.json`에 단계별 명령·종료 코드·시간을 기록한다. ⑥ RBAC 매트릭스 2건을 harnessTest로 옮긴다. ⑦ 기관 실행 진입점이 custom 생성물을 받는다. | 2026-10-07 실측에서 설문 단독 선택이 Docker 단계에서야 실패했고, 탭 메뉴 9개와 일반 사용자 메뉴가 모든 생성물에서 빠졌으며, 실패 원인이 남지 않았다. 새 규칙의 메뉴 수는 core 29(23)·collaboration 40(31)·demo 71(60)이다. 사용자 지시(2026-10-07 "0부터 진행"). | [생성기 가이드](../03-guides/project-composer-guide.md), [재사용 가이드 §3.6](../03-guides/reusable-base-guide.md#36-제거되는-거버넌스-게이트와-승인), [메뉴·배정 투영](../../scripts/project-composer-db.mjs) | 2026-10-07 | - |

## DEC-OPS-239

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-239 | accepted | **재사용 base 생성의 진입 경로를 하나로 합친다(Phase 0b).** `base:generate-db --profile`·`base:generate-source --profile`도 프리셋 레시피를 만들어 화면 생성기와 같은 해석기(`resolveGeneratorComposition`)를 탄다. 그래서 프리셋 산출물도 선택 메뉴·그룹별 NAVIGATION·선택 권한 시드, 물리 스키마 보존, 기능 간 외래 키 대조를 받고, DB lock 은 재적용 검증 뒤에만 `validated` 로 기록된다. 구성 식별자에 출력 레이아웃이 들어가므로 DB 번들도 레이아웃마다 만든다(내용은 같다). 소스 생성기와 거버넌스 무결성 검사는 검증된 같은 구성의 번들·스냅숏만 받는다. 메뉴 스냅숏 갱신은 번들 없이 단독 모드로 실행한다. 원본 `R__zz_seed_base_admin.sql`은 그대로다. | 같은 프리셋이 진입 경로에 따라 관리자 메뉴 10행·권한 원장 전체(공식 경로)와 투영 메뉴·선택 권한(생성기)으로 갈렸고, 공식 경로가 가장 약한 검증을 받았다(B3·C6). 사용자 지시(2026-10-07 "2번으로 넘어가"). | [재사용 가이드 §3](../03-guides/reusable-base-guide.md#3-공식-생성), [판정기](../../scripts/project-composer-recipe.mjs) | 2026-10-08 | ADR-0020 결정 5의 "레이아웃만 다르면 같은 DB 번들 재사용" 절차 부분 |

## DEC-OPS-240

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-240 | accepted | **통계를 Core로 옮기고 프로젝트 생성기의 선택 기능에서 뺀다(Phase 0c).** ① `ReportStatsService`·보고서 통계·DTO를 같은 패키지 이름으로 business-core에 옮겨 URL·권한 코드·api-docs는 그대로다. 선택 기능은 20개에서 19개다. ② 자료 이용 기록(`tb_dta_use_stats`)은 게시판이 소유하고 foundation 포트로 통계에 넘긴다. 게시판이 없으면 게시물·자료 이용 통계는 빈 목록이다. ③ 통계 화면은 게시판 탭을 collaboration 마커로, 설문 탭을 설문이 넘기는 패널로 받는다. '누적 게시물' 칸은 게시판이 없으면 숨긴다. ④ 통계 인가 단언은 core 매트릭스로 옮기고 데모 매트릭스의 경계는 설문 표지가 잇는다. ⑤ 의도한 생성물 표면 증가: core 프리셋 메뉴 29→33·권한 83→85, collaboration 메뉴 40→46. 전체 제품은 같다. 보고서 통계는 Core에서 늘 미수집이다. | 설문만 고르면 통계가, 통계가 자료 이용 기록의 게시글 외래 키를 끌어와 생성이 막혔다. 통계는 여러 업무의 숫자를 모으는 소비자라 숫자를 세는 규칙은 소유 업무에 둔다. 설문 허브 요약이 `STATS_ADMIN_READ`를 요구하는 기존 불일치는 바꾸지 않았다. 사용자 지시(2026-10-08 "시작"). | [카탈로그](../../scripts/project-composer-catalog.mjs), [통계 서비스](../../business-core/src/main/java/nuri/business/service/stats/ReportStatsService.java), [자료 이용 포트](../../foundation/src/main/java/nuri/foundation/core/stats/DataUsageStatisticsContributor.java), [종료 조건 테스트](../../scripts/project-composer-recipe.test.mjs) | 2026-10-08 | DEC-OPS-085 의 통계 표면 demo 귀속과 `ReportStatsService` 대역 경계 부분(pack 분리 원칙은 유지) |

## DEC-OPS-241

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-241 | accepted | **생성기를 단계 모듈로 나누고, 골든 비교가 드러낸 기존 결함 넷을 고친다(Phase 1-1).** ① 소스 생성기(1,489줄)와 DB 생성기(686줄)를 본체와 단계 모듈 7개로 나눈다. 함수 본문은 줄 단위로 옮기고 최대 파일은 398줄이다. ② 결재 흐름 검증의 게이트 소유에 알림을 더해 결재·운영 단독 선택이 생성된다. 단독 선택 19개마다 지워지는 Java 게이트와 승인 목록이 정확히 같은지 계약이 본다. ③ 소유 pack 이 구성에 없는 공유 테이블은 선택된 소비자의 pack 으로 넘기고, 커뮤니티만 쓰는 템플릿 활성 검증 포트·구현을 커뮤니티 소유 지원 파일로 선언해 템플릿 단독 선택이 생성·검증된다. ④ 생성물 Git 경계와 원본 덮어쓰기 가드는 경로를 실제 표기로 비교한다(Windows 소문자 드라이브). | 설계서 16.5 의 "기능을 더하기 전에 큰 파일부터 나눈다"이다. 같은 HEAD 에서 26개 구성을 분할 전후로 실제 생성해 설명되지 않는 차이 0건을 확인했다. 그 과정에서 main 의 단독 선택 3개가 DB 단계 뒤에야 실패하고 소문자 드라이브에서 생성 마지막 단계가 실패하는 것이 드러났다. 테스트의 게이트 목록이 생성기 표를 손으로 옮긴 사본이라 결함을 놓쳤다. 메타 시드 행 순서는 GAP-REPRO-001 로 남긴다. 사용자 지시(2026-10-08 "다음 phase로 넘어가자"). | [생성기](../../scripts/generate-reusable-base-source.mjs), [게이트 소유](../../scripts/project-composer-source.mjs), [Git 경계](../../scripts/reusable-source-tree.mjs) | 2026-10-08 | - |

## DEC-OPS-242

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-242 | accepted | **선택 연동 선언과 기능 저하·미배정 권한 안내를 계획에 싣는다(Phase 1-2, B4·B8).** ① 연동 13건(이벤트 10·포트 2·선택 외래 키 1)을 선언하고, 해석기가 출발 기능이 있고 상대가 빠진 구성마다 `degraded` 를 계산한다. 자동 포함·생성 차단은 하지 않는다. ② 이벤트 연동은 카탈로그가 리스너 타입·생성 위치·소유 기능을 실제 소스에서 계산해, 선언 또는 '잃는 것 없음' 분류(사용자 삭제 정리 5건)와 정확히 대조한다. 늘 함께 포함되는 쌍은 같은 판정으로 선언을 거부한다. ③ 포트·외래 키 근거는 주석을 뺀 생산 소스에서 한 번만 나오는 문자열이다. ④ 기본 그룹 없는 권한 6개를 '생성 뒤 직접 배정할 권한'으로 싣는다. 안내 표는 권한 원장·묶음과 정확히 대응하고 카탈로그 해시 밖에 둔다. ⑤ 구성 해시에 저하 목록이 들어가 로컬 DB 번들은 다시 만들어야 한다. | 설계서 16장 Phase 1 의 둘째 단계다. 알림·메일·문자를 고르지 않은 생성물에서 담당자 지정·결재 알림이 사라지는데 계획은 고정 문구만 보였다. 조사 5갈래와 반박 검토 2갈래가 판정 술어 불일치(선언할 수 없는 쌍), 첫 등장 줄 근거, 해시에 섞이는 안내 문구, api-server 소유 오판을 찾아 반영했다. 구현 뒤 반박 검토(3관점)가 확인한 결함 — 소유 판정과 생성기 연쇄 제거의 어긋남, 클래스를 적은 리스너, 안내 문구의 사실 — 도 고치고, 소유 판정을 단독 선택 19개의 생성기 제거 계획과 대조하는 계약을 더했다. red 증명 20종. 사용자 지시(2026-10-08 "병합후 다음 진행"). | [연동 선언](../../scripts/project-composer-integrations.mjs), [미배정 권한 안내](../../scripts/project-composer-unassigned.mjs), [생성기 가이드](../03-guides/project-composer-guide.md) | 2026-10-08 | - |

## DEC-OPS-243

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-243 | accepted | **자동 포함 사유를 사용자 말과 경로로 보인다(Phase 1-3, E2).** ① 카탈로그의 요구 간선마다 기능 쌍에 한 문장인 사용자 사유를 싣는다. 정본은 사유 표이며 실제 간선과 양방향으로 대조한다. 새 간선에 문장이 없거나, 간선 없는 문장이 남거나, 문장에 영문·괄호가 있으면 카탈로그가 로드되지 않는다. 화면 이름은 사용자가 보는 메뉴·화면 제목을 쓴다. ② 자동 포함 항목에 선택에서 가장 짧은 경로(단계별 종류·근거 파일·문장)와 해제 대상(그 기능에 닿는 선택 전부)을 더한다. 종전 `reason` 원문은 호환으로 남긴다. 문장이 카탈로그 해시에 들어가 프리셋을 포함한 모든 구성 해시가 바뀌므로 로컬 DB 번들은 다시 만든다. ③ 계획의 `inclusionNotes` 가 경로, 단계 문장, '이 기능을 빼려면 …을 해제하세요'를 만든다. 화면은 이를 '왜 포함됐나'에 펼치고, 근거 종류·파일은 '개발자 근거'로 한 번 더 접는다. 해제 버튼은 해제 대상을 한 번에 뺀다. | 대시보드 하나만 골라도 사유가 1,645자였다. 클래스명과 경위 괄호가 그대로 나왔고, 같은 원인이 코드 참조와 묶음 선언으로 두 번 나왔으며, 무엇을 빼야 빠지는지 알 수 없었다. 해제 대상은 단독·두 기능 선택 전부에서 '모두 빼면 빠지고 하나라도 남기면 남는다'를 속성 검사로 고정했다. 변형 13개가 모두 red. | [사유 표](../../scripts/project-composer-reasons.mjs), [해석기](../../scripts/project-composer-recipe.mjs), [생성기 가이드](../03-guides/project-composer-guide.md) | 2026-10-08 | - |

## DEC-OPS-244

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-244 | accepted | **생성기 기능 카드를 업무 영역으로 묶어 찾게 하고, 화면 문구를 카탈로그 해시 밖으로 옮긴다(Phase 1-4, E3·E9).** ① 표시 문구 모듈이 업무 영역 4개, 기능 요약, 시작 구성의 한국어 이름을 정하고 실제 카탈로그와 양방향으로 대조한다. 영역의 누락·중복·빈 영역, 요약·이름의 누락·잔존, 영문, 길이 초과는 실패다. 요약은 기능이 실제로 주는 화면만 말한다. ② 엔진은 카탈로그를 내보낼 때 이것을 해시 밖의 `presentation` 으로 덧붙인다. 카탈로그 본문의 고정 설명과 프리셋 `label`·`description` 은 걷고, 카드 이름 '일정·일지'는 '일정'으로 고친다(일지 화면이 없다). 이 변경으로 구성 해시가 한 번 바뀐다. ③ 화면은 영역마다 묶음과 기능 수를 보인다. 기능 찾기는 이름·요약·영역으로 거르고 결과 수를 알리며, 숨긴 기능의 선택은 그대로 둔다. 카드 배지는 테이블·권한 수, 그리고 라우트 원장 기준 실제 페이지 수(리다이렉트 제외)와 외부 설정이다. 시작 구성은 '협업 기본 · 업무 기능 8개'처럼 고른다. | 카드 19개의 설명이 모두 '○○의 백엔드·화면·DB를 함께 포함합니다'였다. 테이블이 0개인 대시보드도 'DB'라고 말했다. 카드는 영문 id 순의 평면 목록이라 찾을 수 없었고, 시작 구성 이름은 영문 id였다. 화면 문구가 해시에 있으면 문구만 고쳐도 로컬 DB 번들을 다시 만들어야 한다(DEC-OPS-242 ④와 같은 원칙). 적대적 검토가 찾은 사실과 다른 요약 5건, 리다이렉트까지 센 화면 수, 숨긴 카드로 가는 포커스, 한글 조합 중 거르기를 같은 변경에서 고쳤다. red 증명 23종. | [표시 문구](../../scripts/project-composer-presentation.mjs), [생성기 화면](../../tools/project-composer/public/app.js), [생성기 가이드](../03-guides/project-composer-guide.md) | 2026-10-09 | - |

## DEC-OPS-245

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-245 | accepted | **구성 차이를 계획 단계에서 미리 보인다(Phase 1-5a, 설계서 10장·E3).** ① 계획 차이 모듈이 지금 구성과, 기능 하나를 더하거나 뺀 직접 선택을 해석기로 비교한다. 결과는 늘고 주는 기능·테이블·메뉴·권한, 새로 생기거나 해소되는 기능 저하, 생성을 막는 외래 키, 빼도 남는 기능을 붙잡는 선택이다. 해소는 상대 기능이 들어와 풀린 저하만 센다. ② 문장은 다른 기능이 함께 움직이면 들어오고 빠지는 기능을 이름으로 밝히고, 빼도 남을 때도 직접 선택으로 바뀌며 생기는 변화를 감추지 않는다. ③ `POST /api/plan/diff` 는 계획과 같은 출처·CSRF 경계를 지나고 기능 id 형식을 검사하며 엔진 오류 원문은 숨긴다. 엔진은 계획·카탈로그 조회가 마지막으로 적재한 카탈로그와 메뉴 스냅숏을 다시 쓰고, 계획과 생성은 늘 새로 적재한다. ④ 화면은 계획을 확인한 뒤 직접 바꿀 수 있는 카드에만 묻고, 요청은 예약한 때의 구성으로 판정한다. 포커스와 마우스는 따로 기다린다. 구성이 바뀌면 그려진 문장과 알림을 바로 지우고, 포커스된 카드에 뒤늦게 도착한 문장만 화면 낭독기에 한 번 알린다. | 카드를 눌러 보기 전에는 무엇이 함께 들어오는지 알 수 없었다. 쪽지 하나가 기능 7개를 끌어오고, 협업 기본에서 게시판을 빼면 붙잡혀 남으면서 기능 3개가 더 들어온다. 카탈로그 적재가 수 초라 미리보기마다 할 수 없다. 적대적 검토 두 차례가 자동 포함 카드의 미리보기, 남은 옛 문장, 감춰진 변화, 클릭 직전 포커스가 예약한 요청을 찾아 고쳤다. red 증명 28종. | [계획 차이](../../scripts/project-composer-diff.mjs), [생성기 서버](../../scripts/project-composer-server.mjs), [생성기 화면](../../tools/project-composer/public/app.js) | 2026-10-09 | - |

## DEC-OPS-246

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-246 | accepted | **생성하기 전에 이 컴퓨터의 생성 환경을 점검하고 최종 확인을 거친다(Phase 1-5b, 설계서 14·19장, E5).** ① 점검 모듈이 Docker(Linux 컨테이너)·Java·Node.js 22·pnpm 9 이상·PostgreSQL 이미지·커밋되지 않은 변경·화면을 연 뒤 원본 커밋 변경·출력 위치의 남은 공간을 본다. 도구가 없거나 원본이 바뀌었거나 알 수 없거나 공간이 2GB 미만이면 차단, 이미지 부재·변경 있음·JDK 21 이 아닌 Java·5GB 미만은 경고다. 2GB 는 검증까지 마친 생성물 하나의 실측 880MB 의 약 두 배다. ② 명령마다 10초 제한을 두고 넘기면 프로세스 트리를 끝내며, 판정에 쓴 버전·개수만 넘긴다. `POST /api/preflight` 는 계획과 같은 CSRF 경계를 지나 화면의 커밋을 받고, 같은 커밋의 겹친 요청을 한 번의 점검으로 묶으며, 모양이 어긋난 항목이 섞이면 결과 전체를 실패로 돌리고 차단 여부를 다시 센다. ③ 생성 버튼은 최종 확인 창을 연다. 점검 결과와 구성 요약을 보이고 차단·실패 동안 '생성 시작'을 잠근 채 이유를 단다. ④ 계획은 이 컴퓨터의 상태를 짐작한 고정 경고 두 줄을 더 내지 않는다. | 도구가 없거나 Docker 가 꺼져 있으면 몇 분 뒤에야 실패를 알았고, '커밋되지 않은 변경이 있으면…' 경고는 실제 상태와 무관하게 늘 나왔다. 예상 소요 시간은 근거가 될 실행 기록이 없어 숫자로 말하지 않는다(E6 작업 이력에서 다룬다). 적대적 검토가 서버 전역 커밋 비교(탭 간 거짓 통과), Windows pnpm.cmd 에서 듣지 않던 시간 제한, 새 폴더 개수, 포커스 소실, 영문 연결 오류, 따옴표 JAVA_HOME, Windows 컨테이너 모드를 찾아 고쳤다. red 증명 42종(시간 제한 3종은 Linux 컨테이너에서도). | [생성 전 점검](../../scripts/project-composer-preflight.mjs), [생성기 서버](../../scripts/project-composer-server.mjs), [생성기 화면](../../tools/project-composer/public/app.js) | 2026-10-09 | - |

## DEC-OPS-247

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-247 | accepted | **생성 전에 소스 투영을 정밀 점검한다(Phase 1-5c, 설계서 10장 plan/deep, C3).** ① 정밀 점검이 생성기의 투영(Java·프런트 연쇄 제거, 선택 기능 생존)과 규칙 제거·게이트 승인 대조를 디스크를 바꾸지 않고 같은 함수로 한다. 파일 집합은 생성기의 복사 판정으로, 대소문자 구분은 생성물을 만들 폴더에서 정한다. ② 생성기의 투영 단계·승인 대조·규칙 선택을 출력 없는 함수로 꺼냈고 Java 연쇄 판정을 증분 방식으로 바꿨다. 프런트 연쇄는 지우기 전에 계산해 제외 경로 안의 자산(.css 등)을 가져오는 파일도 걷는다(종전엔 깨진 import 로 남았다). frontend 밖이나 대소문자만 다른 제외 경로는 실패한다. ③ `POST /api/plan/deep` 는 개수·게이트·차단 사유만 넘기고, 저장소 기준이 아닌 경로와 사유 없는 빈 투영을 거부하며 절대 경로를 가린다. 입력 오류는 400, 엔진 오류는 500 이다. ④ 최종 확인은 환경 점검 다음에 하고, 환경이 막거나 창을 닫으면 하지 않는다. | 투영 오류는 Docker·DB 단계 뒤에야 드러났다. 시험은 복사한 트리에 생성기 단계를 실제로 돌려 파일·개수·게이트·규칙 파일을 대조한다. 증분 판정은 26개 구성에서 종전과 같고 계획 시간은 144초→78초다. 적대적 검토 두 차례가 찾은 결함을 고쳤다: 닫힌 창의 점검, 무시된 지원 파일, 대소문자만 다른 이름, 끝에 구분자가 붙은 제외 경로, 규칙 판정 예외의 거짓 차단. red 증명 71종. | [정밀 점검](../../scripts/project-composer-deep.mjs), [승인 대조](../../scripts/reusable-source-gates.mjs), [최종 확인](../../tools/project-composer/public/confirm.js) | 2026-10-09 | - |

## DEC-OPS-248

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-248 | accepted | **계획·점검 요청의 실패를 코드로 나눠 다음 행동을 보인다(Phase 1 E4a, 설계서 14.2).** ① 엔진은 원본 커밋 → 메뉴 스냅숏 → 기능 선언 → 해석기 순서로 보고 처음 생긴 자리에서 `INVALID_NAME`·`INVALID_RECIPE`·`SOURCE_CHANGED`·`MENU_SNAPSHOT_STALE`·`CATALOG_DRIFT`·`TOOL_UNAVAILABLE` 를 단다. 선언 실패는 일부러 던진 오류와 사라진 파일만 `CATALOG_DRIFT` 이고 런타임 결함은 일반 실패다. ② 서버는 허용 목록 코드가 붙은 오류 객체만 그 코드·문장·행동으로 답하고 세부 정보를 다시 거른다. ③ 화면은 문장을 상태 줄에, 행동(다시 불러오기·명령 복사·개발자 정보·이름 칸)을 그 밖에 둔다. 다시 불러오기는 이름·선택·구조를 두고 빠진 기능을 알린다. 생성 요청이 이 코드로 거부되거나 다시 불러오기가 실패하면 계획을 지운다. ④ 이름 규칙(Windows 예약 이름 포함)은 해석기·서버·화면이 같다. ⑤ `npm run project:menus:refresh` 가 생성과 같은 소유 컨테이너에서 스냅숏을 다시 쓴다. 정리는 익명 볼륨과 시작하지 못한 컨테이너까지 지우고, 정리 실패가 원래 실패를 가리지 않는다. | 모든 실패가 INVALID_RECIPE 하나로 뭉쳐 코드 결함도 '구성이 잘못됐다' 로 보였고, 기능 목록 조회 실패는 '서버 실행 확인' 으로 보였다. 원본이 바뀌거나 메뉴 자료가 낡아도 할 일을 알 수 없었다. 생성 작업 중 실패의 코드는 E4b 다. 적대적 검토 세 차례의 확인 지적을 모두 고쳤다. red 증명 92종. | [오류 분류](../../scripts/project-composer-errors.mjs), [생성기 서버](../../scripts/project-composer-server.mjs), [메뉴 갱신](../../scripts/project-composer-menus-refresh.mjs) | 2026-10-09 | - |

## DEC-OPS-249

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-249 | accepted | **생성 작업 실패를 생긴 지점에서 코드로 나눠 다음 행동을 보인다(Phase 1 E4b, 설계서 14.2).** ① 엔진은 원본 변경 → 자식 생성기 보고 → Docker 탐침(엔진 응답·컨테이너 실행 여부) 순서로 `SOURCE_CHANGED`·`TOOL_UNAVAILABLE`·`DB_NOT_READY`·`OUTPUT_CONFLICT`·`SOURCE_SURVIVAL`·`VERIFY_FAILED`·`MENU_SNAPSHOT_STALE`·`CATALOG_DRIFT` 를 단다. 자식은 단계별 허용 코드만 build 아래 한 번 쓰는 보고 파일로 알리고, 검증 실패는 같은 작업의 `full.json` 신원과 단계 표가 맞을 때만이다. ② 서버는 작업 코드가 붙은 오류 객체이고 그 코드가 나올 수 있는 단계일 때만 그 코드·문장·행동으로 말한다. ③ 화면은 문장을 경보 하나에, 단계·명령·저장소 기준 로그 위치·행동(다시 생성·다시 점검·진단 정보 복사)·접힌 로그 끝부분을 그 밖에 둔다. ④ 검증 실패의 로그 끝부분 40줄만 다시 가려 보이고 작업 보고서에는 저장하지 않는다. | 생성 중 실패는 모두 'Docker 와 개발 도구를 확인하라' 는 한 문장이었고 로그 위치가 이 컴퓨터의 절대 경로로 화면에 나왔다. 검증 뒤 정리 실패·의존성 설치 실패·errno 는 사용자나 Docker 를 탓하지 않게 코드를 달지 않는다. 적대적 검토 확인 지적 11건을 반영했다. red 증명 99종. | [작업 실패 분류](../../scripts/project-composer-job-failure.mjs), [자식 보고](../../scripts/project-composer-child-failure.mjs), [생성기 서버](../../scripts/project-composer-server.mjs) | 2026-10-09 | 생성기 가이드의 '화면에 자식 출력 원문을 보내지 않는다'(DEC-OPS-238 ⑤와 함께 정함) 가운데 검증 단계 로그 끝부분 |

## DEC-OPS-250

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-250 | accepted | **생성 작업의 진행을 단계 타임라인으로 보이고, 남은 시간은 실제 작업 이력으로만 말한다(Phase 1 E6a, 설계서 14.3·20장).** ① 엔진이 다섯 단계와 검증 일곱 단계의 상태·걸린 시간을 알린다. 검증 단계는 검증기가 단계마다 찍는 머리줄을 출력 관찰로 잡고, 통과하면 검증 보고서가 잰 시간을 쓴다. 검증기는 바꾸지 않는다. ② 진행률은 단계가 끝날 때만 실측 가중치(구성 1·DB 5·소스 6·설치 5·검증 83)만큼 오른다. ③ 끝난 작업마다 걸린 시간을 `build/project-composer/history.json` 에 남긴다(최근 50건, 색인에서 빠져도 작업 폴더는 지우지 않는다). 남은 시간은 같은 배치로 끝까지 마친 최근 기록 3건 이상의 단계별 중앙값으로만 말한다. ④ 서버는 타임라인·추정의 모양이 맞을 때만 받고 경과는 서버 시계로 세며 엔진 시각은 보내지 않는다. 응답 모양 검사와 작업 상태를 모듈로 나눴다. | 검증이 시간의 83% 인데 진행률이 60%에 머물고 경과·남은 시간이 없어 멈춘 것처럼 보였다. 가중치는 이 컴퓨터에서 마친 생성 7회와 검증 보고서 10건의 중앙값이다. 취소·종료 정리는 E6b 다. red 증명 68종. 적대적 검토 확인 지적 4건을 반영했다. | [타임라인](../../scripts/project-composer-timeline.mjs), [작업 보기](../../scripts/project-composer-server-job.mjs), [생성기 화면](../../tools/project-composer/public/job.js) | 2026-10-09 | - |

## DEC-OPS-251

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-251 | accepted | **진행 중인 생성을 취소하고, 남은 임시 자원은 다음 기동에 정리한다(Phase 1 E6b, 설계서 14.3).** ① 화면의 '생성 취소'와 `POST /api/jobs/<id>/cancel`(빈 본문, CSRF 경계)이 엔진의 취소 신호를 끊는다. 작업은 정리를 마칠 때까지 진행 중이고 새 작업을 받지 않는다. 검증을 마친 뒤 닿은 취소는 결과를 바꾸지 않는다. ② 명령은 시간 제한과 같은 방법으로 프로세스 트리째 끝낸다. 임시 DB 는 신호 없이 60초 제한 안에서 지우고, 옮기기 전이면 만들던 소스·DB 스키마 폴더를 지우며, 옮긴 프로젝트와 그 스키마 폴더는 남겨 위치를 알린다. ③ 서버·명령줄 생성은 SIGINT·SIGTERM·SIGHUP 에 취소·정리 후 끝난다. ④ 보고서에 소유 프로세스·컴퓨터·플랫폼·PID 네임스페이스를 남기고, 기동 때 같은 공간의 끝난 작업만 다시 정리한다. lease·자동 정리·삭제 API 는 두지 않는다. | 검증이 10분 가까이 도는데 잘못 고른 구성을 멈출 길이 없었고, 서버를 끄면 임시 DB 컨테이너와 만들던 폴더가 남았다. 적대적 검토 3관점의 확인 지적 12건을 반영했다(멈춘 Docker 의 정리, 터미널 닫힘, WSL 의 같은 컴퓨터 이름, 검증 뒤 늦은 취소, 남은 스키마 폴더 등). red 증명 78종. | [생성 작업](../../scripts/project-composer-generate.mjs), [기동 시 정리](../../scripts/project-composer-recovery.mjs), [생성기 서버](../../scripts/project-composer-server.mjs) | 2026-10-10 | - |

## DEC-OPS-252

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-252 | accepted | **자동 포함 카드를 키보드로 닿게 하고 바뀐 자동 포함을 한 번 알린다(Phase 1 E7, 설계서 14.1).** ① 자동 포함 카드는 점선으로 나누고 체크박스를 native disabled 대신 `aria-disabled` 로 두어 Tab 순서에 남긴다. 누르면 체크를 바꾸지 않고 요약의 '왜 포함됐나'를 펼쳐 포커스를 옮긴다. 이유가 아직 없으면 확인 중인지 확인이 멈췄는지 나눠 말한다. ② 상태 줄은 다음 계획이 오면 마지막으로 알린 계획과 비교한 순변화를 한 번 말한다. 늘거나 빠진 자동 포함, 해제했지만 남은 기능, 시작 구성에서 직접 선택으로 바뀌며 들어온 기능을 나눠 말하고, 고른 것과 뺀 것이 섞이면 '바꾼 구성으로' 라고만 한다. 계획을 거두면 기준을 비운다. ③ 결과 문장은 포커스를 돌려놓은 뒤 쓰고, 돌려놓은 포커스의 미리보기는 알리지 않는다. | 자동 포함 카드는 disabled 라 키보드로 닿지 않았고, 구성을 바꿔도 무엇이 함께 들어오고 빠졌는지 화면 낭독기에 알리지 않았다. 적대적 검토 두 갈래가 행동 하나를 주어로 삼던 첫 설계의 거짓 귀속(시작 구성 전환·여러 번 바꾸기·다시 불러오기)과 포커스 복원이 문장을 끊는 문제를 찾아 고쳤다. NVDA·VoiceOver 가 aria-disabled 체크박스에 기본 동작을 보내는지는 확인하지 못했다. red 증명 24종. | [생성기 화면](../../tools/project-composer/public/app.js), [생성기 가이드](../03-guides/project-composer-guide.md), [설계서](../02-architecture/project-composer-design.md) | 2026-10-10 | - |

## DEC-OPS-253

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-253 | accepted | **계획의 메뉴를 원본 계층의 트리로 보이고 공통 기반 대비 추가를 표시한다(Phase 1 E8, 설계서 시안 S2).** ① 메뉴 투영이 메뉴마다 순서와 종류(화면·분류·목적지 없음)를 싣는다. 목적지 없음은 원본에는 화면이 있지만 이 구성에서 그 화면이 빠져 하위 메뉴만 묶는 메뉴다. ② 엔진은 공통 기반 시작 구성을 같은 해석기로 풀어, 그 구성에 없거나 화면이 없던 메뉴가 이 구성에서 화면이 되면 '추가됨'을 단다. 공통 기반을 풀지 못하면 표시만 빼고 계획은 낸다. ③ 화면은 상위·순서로 중첩 목록(role=list)을 그리고 종류·추가됨을 글자로 표시하며, 요약 줄이 수를 말한다. 다시 확인하거나 계획을 거두면 트리와 요약을 지운다. ④ app.js 가 592줄로 커져 자동 포함 설명·변화 문장·메뉴 트리를 모듈 셋으로 나눴다(470줄). | 메뉴 미리보기가 상위를 무시한 평면 목록이라 하위 메뉴가 다른 분류 아래처럼 보였고 분류와 화면이 같은 모양이었다. 적대적 검토가 낭독용 쉼표의 빈 스크롤 730px, 화면이 새로 생긴 '나의 업무'의 표시 누락, 동작처럼 읽히는 '추가'를 찾아 고쳤다. red 증명 25종. | [메뉴 투영](../../scripts/project-composer-menu-preview.mjs), [메뉴 트리](../../tools/project-composer/public/menu-tree.js), [설계서](../02-architecture/project-composer-design.md) | 2026-10-10 | - |

## DEC-OPS-254

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-254 | accepted | **저장한 구성을 불러오고, 넓은 화면에서 요약과 버튼을 고정한다(Phase 1 E9, 설계서 시안 S1·21장).** ① '구성 불러오기'가 '선택 정보 저장'으로 받은 파일(64KB 이하)을 브라우저에서 읽어 엔진과 같은 모양을 검사한다. 모양이 아니면 거부하고 구성을 바꾸지 않는다. ② 지금 원본에 없는 시작 구성·기능·데이터베이스와 63자를 넘는 이름은 빼고, 기록된 커밋이 다르면 재현 방법(체크아웃 뒤 다시 시작)을 함께 알린다. 이전 계획을 거두고 지금 원본으로 다시 결속하며, 생성·다시 불러오기 중에는 잠근다. ③ 넓은 화면에서 요약과 작업 패널은 화면 높이에 맞춘 한 스크롤 영역에, 버튼은 그 아래 따로 둔 카드에 두어 겹치지 않는다. 페이지 맨 위에서는 위쪽 위치만큼 높이를 줄인다. ④ 저장·불러오기를 모듈 하나로 모아 app.js 를 500줄 아래로 둔다. 업그레이드 키트는 Phase 3 범위다. | 저장은 되지만 다시 열 길이 없었고, 자동 포함이 많으면 요약이 2,000px 넘게 길어져 생성 버튼이 화면 밖으로 밀렸다. 적대적 검토가 첫 구조에서 작업 패널이 버튼을 가리고 요약 내용이 0px 로 줄던 회귀, 불러온 뒤 옛 계획 표시, 엔진보다 약한 모양 검사를 찾아 고쳤다. red 증명 36종. | [recipe 파일](../../tools/project-composer/public/recipe-file.js), [고정 요약](../../tools/project-composer/public/sticky-summary.js), [설계서](../02-architecture/project-composer-design.md) | 2026-10-10 | - |

## DEC-OPS-255

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-255 | accepted | **Phase 1 종료 조건을 대조하고 시안과 어긋난 표시 둘을 맞춘다(설계서 16장 Phase 1 종료).** ① Foundation + Core 상자가 공통 기반의 테이블·권한·메뉴 경로 수를 보인다(카탈로그가 알려 주지 않으면 비운다). ② 최종 확인 창은 테이블·권한 수와 메뉴 목적지 수를 공통 기반과 나란히 보인다. ③ 종료 조건: 시안 18~20장의 동작을 갖췄고, 의도적 차이는 셋이다 — 예상 시간은 CI 범위 대신 이 컴퓨터에서 마친 기록으로만 말한다(DEC-OPS-250), 생성물 정리 버튼은 두지 않는다(삭제 API 없음, DEC-OPS-251), SMTP 같은 외부 설정은 생성물에 없으므로 사전 점검하지 않고 최종 확인에 요구 사항으로 보인다. UI 시험은 주요 흐름을 실제 카탈로그로 돌린다. 생성기 스크립트 최대 423줄, 화면 app.js 487줄이다. | Phase 2 는 사용자 결정(설계서 16.1 #3·#5·#6·#10·#12, preset=recipe ADR)이 선행이라 여기서 멈춘다. red 증명 7종. | [최종 확인](../../tools/project-composer/public/confirm.js), [생성기 화면](../../tools/project-composer/public/app.js), [생성기 가이드](../03-guides/project-composer-guide.md) | 2026-10-10 | - |

## DEC-OPS-256

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-256 | accepted | **모듈 선택 고도화 Phase 2 의 결정 여섯 가지를 권고안대로 정한다(설계서 16.1).** ① system·operation 을 나눈다 — system 은 커뮤니티 / 홍보(배너·팝업) / 시연, operation 은 행사 / 포상. 권한 의미는 바꾸지 않고 H3 판정을 먼저 하며, 메뉴 데이터의 공유 DB 적용은 따로 승인받는다. ② 지식 허브 셸은 게시판이 소유하고 도움말·커뮤니티는 탭으로 기여한다. ③ 'core + 설문'·'core + 결재' 시작 구성을 두고 CI 에서 전체 검증한다. ④ 시작 구성을 이름 붙은 기능 목록으로 바꾸고 pack 순위를 걷는다(ADR 로 확정). ⑤ 개인정보처리방침 공개 화면을 core 로 옮긴다(법 해석은 별도 검토). ⑥ 빈 통계 테이블 둘(자료 이용·보고서 통계)은 그대로 둔다. | 2026-10-10 사용자 결정이다. ⑥ 은 같은 날 OCI 읽기에서 두 테이블 모두 0행이고 행을 쓰는 생산 코드가 없었다. Phase 2 와 무관하고 걷어내면 스키마 변경 승인이 필요해, 실제 요구가 생길 때 다시 판단한다. 각 결정의 구현은 해당 단계의 PR 과 DEC 가 기록한다. | [설계 문서](../02-architecture/project-composer-design.md), [생성기 가이드](../03-guides/project-composer-guide.md) | 2026-10-10 | - |

## DEC-OPS-257

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-257 | accepted | **생성물에서 처음부터 붉은 백엔드 검사를 기능 소유로 나누고, 모집단 하한은 core 에서도 성립하는 값으로 둔다(Phase 2 D6 1차).** ① 주소록·만족도 OpenAPI 단언과 설문 별칭 인가 단언을 각 기능 타입(`AddressBookDto`·`SatisfactionDto`·`SurveyApiController`)을 참조하는 클래스로 옮겨, 기능이 빠진 생성물에서 연쇄로 함께 빠지게 한다(DEC-OPS-085 방식). ② 생성기가 지운 ErrorCode 가 소유한 메시지 키와 그 머리 주석을 ko·en 번들에서 걷고, 메시지 번들 계약의 하한을 지운 코드·참조 수만큼 내린다(core 39→33·10→5). 원본 하한은 그대로이고 여유 폭은 원본과 같으며 lock `java` 에 남는다. ③ 자격증명 request-target 검사의 path parameter 하한은 100→80(원본 268·core 95)이다. 런타임 모집단이라 지운 몫을 셀 수 없다. | 2026-10-10 main(9b402a822) 생성물에서 일반 테스트·vitest 를 처음 돌리니 처음부터 붉은 검사가 있었다: core 는 백엔드 7건·프런트 47개 파일, collaboration 은 2건·40개 파일이다. 산출물 검증은 일반 테스트를 돌리지 않아 보이지 않았다. 이 행은 백엔드 9건을 닫는다. 반박 검토가 원본 하한을 낮추는 첫 안이 원본 신호를 약하게 함을 찾아 ②로 바꿨다. 다시 만든 두 생성물에서 해당 테스트가 통과한다. 프런트는 GAP-BASE-002 가 추적한다. red 증명 16종. | [메시지 키 정리](../../scripts/reusable-source-messages.mjs), [메시지 번들 계약](../../foundation/src/test/java/nuri/foundation/core/config/MessageBundleContractTest.java), [설문 별칭 인가](../../api-server/src/test/java/nuri/security/SurveyAliasAccessControlTest.java) | 2026-10-10 | - |

## DEC-OPS-258

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-258 | accepted | **생성기가 투영으로 지운 파일을 원장에 남기고, 프런트 계약은 그 원장으로 기능 파일을 거른다(Phase 2 D6 2차).** ① 생성기가 파일을 지우는 마지막 단계 뒤에 복사한 원본 파일 가운데 없는 파일을 `reusable-projection-ledger.json` 에 적고 lock `projectionLedger` 가 결속한다. 무결성 검사가 형식·해시와 부재를, `base:verify` 가 생성 직후 원본과 대조해 누락을 본다. 원본에는 원장이 없다. ② 시험 도우미 `@/test-utils/projection` 은 원장에 있고 실제로 없는 파일만 뺀다. ③ 경로로 기능 파일을 읽던 프런트 계약 16개를 옮겼다. 여러 기능의 파일을 읽는 시험은 파일마다 단언을 거른다. ④ skip 금지 게이트가 원장 판정이 아닌 조건부 등록(`if (…) it(…)`)도 막는다. | 생성물 안의 시험은 어떤 파일이 투영으로 빠졌는지 알 근거가 없어 처음부터 ENOENT 로 붉었다. 시험에서 판정을 다시 계산하면 생성기와 어긋날 수 있는 두 번째 판정기가 생긴다. 검토에서 원장을 쓴 뒤 지운 리다이렉트 페이지·워크플로 15개가 원장에 빠진 것이 드러나 순서와 대조를 함께 고쳤다. 대시보드 위젯 하한은 원본에서 0 초과에서 2 이상이 됐다. red 증명 23종. | [원장](../../scripts/reusable-projection-ledger.mjs), [시험 도우미](../../frontend/src/test-utils/projection.ts), [가이드 §4.2](../03-guides/reusable-base-guide.md#42-생성물의-일반-테스트) | 2026-10-10 | - |

## DEC-OPS-259

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-259 | accepted | **생성물의 프런트 총계·허용 목록·예시를 투영 원장으로 거른다(Phase 2 D6 3·4차).** ① 상태·하드코딩 색상 총계는 파일별 표로, A1 채택 수는 화면 목록으로도 동결하고 합(길이)이 총계와 같아야 한다. 파일별 동결표(컨트롤 높이 포함)는 생성물에서 원장으로 빠진 파일 몫만 뺀다(`frozenInProjection`). ② 허용 목록의 낡은 항목 검사와 리다이렉트 예시는 원장으로 빠진 대상만 뺀다. ③ 빈 스캔 하한은 원본 값을 두고, 원장이 있을 때만 가장 작은 생성물에서도 성립하는 값으로 내리며 실측을 주석에 남긴다. ④ 빠진 화면을 예시로 쓰는 권한·메뉴·화면 관리 시험은 `pageInProjection` 으로 거르고, core 계약은 모든 생성물에 남는 예시로 늘 등록한다. ⑤ 팩 마커나 다른 팩이 넘기는 화면 부분은 그 블록과 함께 빠지는 같은 팩 파일로 거른다. | D6 2차 뒤에도 core 31개·collaboration 29개 파일이 처음부터 붉었다. 총계가 원본 전체 수였고 예시가 생성물에 없는 화면이었다. 원본에서는 동결값과 단언이 그대로이고 등록되는 시험은 추가 4건 말고 같다. 이제 core 실제 생성물(801개 파일 2,575건)과 collaboration 사본의 vitest 가 모두 통과한다. red 증명 22종. | [시험 도우미](../../frontend/src/test-utils/projection.ts), [가이드 §4.2](../03-guides/reusable-base-guide.md#42-생성물의-일반-테스트) | 2026-10-10 | - |

## DEC-OPS-260

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-260 | accepted | **명령 센터(Ctrl+K)의 방향키가 고르는 순서를 화면에 그린 순서와 맞춘다.** 결과는 분류(즐겨찾기·최근 방문·메뉴·액션·시스템·검색)별로 묶어 그리는데, 고르는 순서는 만든 순서([빠른 이동…, 메뉴…]) 그대로였다. 분류 순서 하나(`CATEGORY_ORDER`)로 그리고 고르며, 같은 분류 안의 순서는 그대로 둔다. | D6 검토 중 찾았다. 메뉴가 있으면 '협업 통합 허브'에서 방향키를 한 번 내릴 때 바로 아래 메뉴가 아니라 맨 아래 '로그아웃'이 골라졌고, 그 상태로 Enter 를 누르면 로그아웃됐다. 화면 낭독기는 다음 항목으로 로그아웃을 읽었다. 시험은 메뉴가 있는 목록에서 보이는 순서대로 내려가며 선택 알림과 Enter 결과를 본다. 수정 전 이 시험이 붉은 것을 확인했다. | [명령 센터](../../frontend/src/app/components/ui/global-command-center.tsx), [시험](../../frontend/src/app/components/ui/__tests__/global-command-center.test.tsx) | 2026-10-10 | - |

## DEC-OPS-261

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-261 | accepted | **메뉴·별칭·화면 코드·백엔드 문자열이 `?tab=` 으로 여는 값을 그 허브의 탭 해석과 대조한다(Phase 2, 슬롯 도입 전 census 범위 확장).** ① `?tab=` 목적지가 있는 다섯 허브(지식·설문·감시·결재함·메모 보고)의 탭 해석을 `*-tabs.ts` 모듈로 꺼내고, 각 모듈이 `TAB_HUB = { routes, parse }` 를 내보낸다. 동작은 그대로다. 감시 탭 목록의 팩 마커는 새 모듈로 옮기고 직접 선택 구성의 블록 소유 표에 같은 규칙으로 넣었다. ② cross-stack 계약이 메뉴 스냅숏의 사용 중 메뉴, 생성 화면 목록의 별칭 목적지, 화면 코드 리터럴, 백엔드 리터럴(같은 파일 상수 결합 포함, 주석 제외)에서 `?tab=` 값을 모은다. 그 값을, `*-tabs.ts` 파일을 import 없이 변환·평가해 얻은 해석에 넣어 탭으로 읽히는지 본다. 해석 없는 화면으로 가는 `?tab=` 과 판정할 수 없는 값은 red 다. 출처마다 하한을 둔다. ③ 생성물에서는 목적지 화면이 원장으로 빠졌으면 보지 않는다. | 허브는 모르는 탭이면 오류 없이 기본 탭을 연다. 허브를 슬롯으로 나누다 탭 이름이 바뀌면 메뉴·알림이 조용히 엉뚱한 탭에 떨어진다(설계서 16.4). 계산된 동적 import·glob 은 도달성 census 가 판정할 수 없고 리터럴 import 는 생성물에서 계약을 지우므로, 탭 모듈은 실행 import 없이 두고 변환해 평가한다. 관리 링크 census 의 범위 밖 누락은 0건이라 슬롯 도입 PR에서 함께 넓힌다. 원본 40건(메뉴 11·별칭 10·화면 코드 11·백엔드 8)이 모두 맞는다. red 증명 16종. | [계약](../../frontend/src/__tests__/cross-stack/tab-destination-contract.test.ts), [설계 문서 §5](../02-architecture/project-composer-design.md) | 2026-10-10 | - |

## DEC-OPS-262

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-262 | accepted | **생성물 DB 번들에 선택한 기능 몫의 참조 데이터를 싣는다(Phase 2, 설계서 B5).** ① 생성기가 원본 마이그레이션을 적용한 임시 DB에서 선택하지 않은 기능의 공통코드 그룹을 지우고, 게시판 기능을 고르면 앱이 하드코딩한 게시판 마스터(`R__seed_demo.sql` 의 4행)를 넣는다. 그 뒤 두 표의 데이터만 `R__seed_reference_data.sql` 로 덤프한다(`ON CONFLICT DO NOTHING`). 공통코드 그룹은 core 소유가 기본이고, COM004·COM009 는 게시판, COM075 는 결재 소유다. ② 재적용 검증이 그룹·게시판 마스터 집합을 대조하고 lock 이 `referenceData` 를 남긴다. 번들 파일은 4개에서 5개가 된다. ③ 계약이 코드 그룹 소유 표를 카탈로그와 같은 소유 판정으로 생산 Java 와 대조하고, 게시판 마스터 시드가 다른 표에 쓰지 않는지 본다. 상세 코드는 원본도 시드하지 않는다(PD-DB-003). | 생성물 DB 는 schema-only 기준선이라 원본이 넣은 공통코드 그룹 76개와 게시판 마스터가 모두 빠졌다. 그래서 결재 상신 전에 COM075 그룹을 손으로 만들어야 했고, 지식 허브·업무 홈의 게시판 영역이 비었다. 원본 R__·V 파일은 바꾸지 않는다. 게시판 목록이 읽는 COM004 는 원본·공유 DB 어디에도 없어 GAP-BOARD-002 로 남긴다. core·collaboration 실제 생성과 산출물 검증(스키마 검증 포함)이 통과한다. red 증명 8종. | [선언](../../scripts/reusable-reference-data.mjs), [생성기](../../scripts/generate-reusable-base-db.mjs), [가이드 §3.2](../03-guides/reusable-base-guide.md) | 2026-10-10 | - |

## DEC-OPS-263

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-263 | accepted | **생성물의 이관 카탈로그를 구성 스키마로 다시 쓴다(Phase 2 B12).** ① 소스 생성기가 루트 `db_columns.json` 을 DB 번들이 검증한 스키마(`schema-contract.json` 의 snapshot — lock 의 스키마 해시와 같아야 한다)로 다시 쓴다. 형식은 원본 스키마 검증과 같고, Flyway 이력 표 항목만 원본에서 가져온다. ② 산출물의 스키마 검증도 카탈로그와 Flyway 적용 스키마를 정확히 대조한다. 양쪽에 있는 표로만 좁히던 투영본 완화는 걷는다. ③ 이관 도구는 루트 카탈로그 하나만 읽어 다른 사본은 없다. | 생성물이 원본 카탈로그(표 91개)를 그대로 복사했다. 그래서 구성에서 빠진 표로 가는 매핑도 이관 검증을 통과하고 적재 직전에야 실패했고, 스키마 검증의 완화가 그 어긋남을 가렸다. 실제 생성에서 카탈로그는 core 표 41개·collaboration 58개이고 산출물 검증이 통과한다. red 증명: 모듈 변형 6종, 산출물에 원본 카탈로그를 두면 스키마 검증이 붉다. | [카탈로그 투영](../../scripts/reusable-migration-catalog.mjs), [스키마 검증](../../api-server/src/test/java/nuri/api/schema/SchemaValidationIntegrationTest.java), [재사용 가이드 §3.5](../03-guides/reusable-base-guide.md#35-소스-projection) | 2026-10-10 | - |

## DEC-OPS-264

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-264 | accepted | **연쇄 제거를 기록하고 프런트 두 판정의 동치를 잰다(Phase 2, 설계서 C4·C5).** ① 프리셋이 타입 참조 연쇄로 지우는 비게이트 Java 를 `profiles.<name>.acknowledgedJavaCascade` 에 적는다(core 105·collaboration 58). 생성기·정밀 점검·운영 계약이 같은 판정(`planJavaRemoval` 의 선언·연쇄 구분)으로 exact 대조하고, 생성물 lock 은 사유와 함께 `java.cascadeRemoved` 를 남긴다. 직접 선택은 lock 기록만 남긴다. ② 생성기 프런트 연쇄에 간선 추출 함수를 끼울 자리를 둔다(기본은 지금의 원문 정규식). 도달성 계약은 census 토크나이저로 두 가지를 본다. 프리셋 3개·단독 선택 19개의 연쇄가 같은지, 실제 프로필의 census 판정이 생성기와 같은지다. 추출 차이 6건과 해석 차이 대상 2개는 사유가 붙은 exact 목록과 래칫으로 묶는다. 그 대상은 어느 구성에서도 지워지지 않아야 한다. | 개인정보 census·컨트롤러 하한이 지키는 일부 말고는, 잘못 들어간 import 한 줄이 컨트롤러·시험을 지워도 붉지 않았다. 소유가 코드에서 도출돼 기대치가 함께 움직이기 때문이다. 프런트 생성기는 주석 속 import 인용도 간선으로 읽어 화면을 조용히 지울 수 있었다(설계서 C5). 측정 결과 두 판정의 차이는 지금 어느 구성의 제거도 바꾸지 않는다. manifest 가 바뀌어 구성 해시가 바뀌므로 로컬 DB 번들은 다시 만든다. red 증명 13종. | [연쇄 승인 대조](../../scripts/reusable-source-gates.mjs), [운영 계약](../../scripts/pack-tagged-registry.test.mjs), [판정 동치 계약](../../scripts/frontend-reachability-census.test.mjs), [가이드 §3.6](../03-guides/reusable-base-guide.md#36-제거되는-거버넌스-게이트와-승인) | 2026-10-11 | - |

## DEC-OPS-265

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-265 | accepted | **연쇄 뒤 남는 화면을 구성의 기대값과 양방향으로 대조한다(슬롯 단계 PR-1, 설계서 11장).** ① `reusable-page-survival.mjs` 가 남겨야 할 화면을 기능 소유로 계산하고 removePaths 로 거르지 않는다. 홈·로그인은 늘 core 화면이고, 목적지가 빠진 리다이렉트 화면은 거버넌스 투영과 같은 규칙으로 뺀다. ② 생성기·정밀 점검·생성물 무결성 검사가 page 파일 이름을 정확히 대조한다. 빠진 화면은 선택 소스 소실과 함께 SOURCE_SURVIVAL(무결성은 일반 실패), 남은 화면은 실패·FRONTEND_SCREEN_EXTRA 다. 무결성은 투영 뒤 디스크를 수렴 없이 본다. dangling 검사를 걷고 진입점은 루트 레이아웃만 본다. page 마커 블록의 redirect·return 과 next.config 마커는 막는다. ③ 라우트 소실 승인 14건은 생성기 기준 화면 대조와 census·생성기 동치가 대신한다. ④ core 에 남던 댓글 관리 화면을 collaboration 으로 걷는다. | dangling 검사는 연쇄와 같은 판정이라 실패할 수 없었고 소실 승인은 손으로 쓴 목록이었다. 첫 대조가 댓글 관리 화면 누수를 찾았다(권한·메뉴가 없어 도달할 수는 없었다). 기대값을 삭제 목록과 따로 계산해야 잘못된 pack 배치가 붉다. core 에 남는 비화면 파일 14개는 preset 통합 몫이다. 로컬 DB 번들은 다시 만든다. red 증명: 판정 코드 21·데이터 4. | [화면 생존](../../scripts/reusable-page-survival.mjs), [정밀 점검](../../scripts/project-composer-deep.mjs), [생성물 무결성](../../scripts/reusable-governance-integrity.mjs), [설계 §9](../02-architecture/project-composer-design.md#9-검증과-실패-처리) | 2026-10-11 | - |

## DEC-OPS-266

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-266 | accepted | **프런트 마커 투영과 import 연쇄를 한 판정으로 모은다(슬롯 단계 PR-2, 설계서 C5).** ① 마커는 `parsePackMarkerBlocks` 하나가 읽고 `createFrontendProjector` 가 pack 과 직접 선택의 블록 소유를 한 번에 정한다. 직접 선택의 소유는 `FRONTEND_MARKER_FILES` 이고 운영 계약이 원본 블록 수와 exact 대조한다. 표에 없는 블록은 실패한다. ② 생성기·정밀 점검·도달성 census 가 같은 `planFrontendRemoval` 을 쓰고, census 는 git 체크아웃에서 생성기의 복사 목록을 모집단으로 쓴다. 간선은 토크나이저로 읽는다 — 주석·문자열 속 인용은 간선이 아니고 require·createRequire·import type·`typeof import()`·.d.ts·자산은 간선이다. 모듈은 해석기의 확장자 전부(.mjs·.mts 포함)다. ③ 판정할 수 없는 import·대소문자만 다른 대상·모호한 해석은 생성 실패(정밀 점검 FRONTEND_PROJECTION)다. ④ 두 번째 마커 파서는 단일 모듈 계약이, 토크나이저의 오판은 TS AST 대조가 막는다. | 마커 파서 4벌·추출 2벌·해석 2벌·연쇄 루프 3벌이 갈라져 있었다. 27개 구성의 제거 집합·직접/연쇄 수·게이트가 전후 같다. red 증명: 판정 코드 68·데이터 11. | [프런트 투영](../../scripts/reusable-source-frontend.mjs), [모듈 그래프](../../scripts/frontend-module-graph.mjs), [가이드 §3.7](../03-guides/reusable-base-guide.md#37-프런트-pack-마커-작성-규칙) | 2026-10-11 | DEC-OPS-088 ④의 주석 인용 금지와 ⑤의 원문 가드, DEC-OPS-264 ②, DEC-OPS-265 ③의 동치 시험 근거 |

## DEC-OPS-267

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-267 | accepted | **기능이 화면에 끼우는 조각을 슬롯으로 두고, 첫 기여로 수신자 피커의 주소록 출처를 옮긴다(슬롯 단계 PR-4, 설계서 11장).** ① `frontend/src/extensions/slots.ts` 가 슬롯 타입과 노출 술어 `visibleWhen`(사유가 붙은 always·permissions·page)을 정한다. 기여는 `src/extensions/<기능>/<슬롯>.ts` 의 데이터만 담은 default export 다. ② 레지스트리 `generated-<슬롯>.ts` 는 `scripts/slot-registry.mjs` 가 만든다(`slots:generate`·`slots:check`). 생성기·정밀 점검·census·거버넌스·타입 검사는 같은 projector 에서 직접 제거되지 않은 기여로 레지스트리를 다시 렌더하고, lock `frontend.slots` 가 남은 기여를 적는다. ③ 카탈로그는 기여 디렉터리를 기능 경로·소유 pack removePaths 와 양방향으로 대조한다. 경계 계약은 원본 parity·이름·소비자 표·함정 규칙(데이터만, import 허용 목록, 키 꼴)을 막는다. ④ 메일·문자 화면은 core 도우미로 출처를 받고 마커 5블록을 걷는다(116/21→106/17). 노출은 그대로다. ⑤ 관리 링크 census 와 리다이렉트 가드를 src/extensions 와 객체 리터럴 링크로 넓힌다. | 마커 블록 대신 데이터로 끼워 셸 링크·허브 분해가 같은 장치를 쓰게 한다. 슬롯 형태(케밥 이름·기능×슬롯 파일·슬롯별 레지스트리·visibleWhen)는 설계서 예시와 다르며 위임 권고안으로 정했다. red 증명 30종. | [슬롯 타입](../../frontend/src/extensions/slots.ts), [레지스트리 생성기](../../scripts/slot-registry.mjs), [가이드 §3.7](../03-guides/reusable-base-guide.md#37-프런트-pack-마커-작성-규칙) | 2026-10-11 | - |

## DEC-OPS-268

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-268 | accepted | **수신자 피커의 주소록 출처를 주소록 조회 권한(ADBK_READ)이 있는 사람에게만 보인다(슬롯 단계 PR-5, H3).** ① 주소록 기여의 노출 술어를 `always` 에서 `{ permissions: ['ADBK_READ'] }` 로 바꾼다. 출처가 부르는 주소록 목록·단건 API 와 같은 권한이다. ② 메일 작성 화면은 주소록 탭과 입력 안내의 '·주소록' 을, 문자 작성 화면은 주소록 탭을 감춘다. 권한 상태를 모르면(인증 맥락 없음·로그아웃·권한 버전 없음) 보이지 않는다. 쪽지·알림 발송은 종전대로 이 출처를 받지 않는다. ③ 노출일 뿐 인가가 아니며 서버 권한은 그대로다. 시험이 술어와 두 API 의 권한, 기본 그룹 셋의 보유를 원장에서 대조한다. 권한 작업대의 화면 목록은 슬롯 술어를 표시 권한으로 잡지 않는다(종전에도 없었다, GAP-COMPOSE-001). | 기본 그룹 셋(ROLE_ADMIN·SYSTEM·USER)은 모두 ADBK_READ 를 가져 화면이 바뀌지 않는다. 바뀌는 쪽은 그 권한이 없는 사용자 정의 그룹이다(예: '메일·문자·알림 운영' 묶음만 준 그룹). 종전에는 탭이 보이고 열면 403 이었다. 결정 위임(2026-08-23)과 2026-10-11 지시("계속진행, 빠르게")에 따라 계획 권고안으로 정했다. 연동 근거 줄이 그대로라 구성 해시는 바뀌지 않는다. red 증명 14종. | [주소록 기여](../../frontend/src/extensions/addressbook/recipient-picker-sources.ts), [노출 행렬](../../frontend/src/app/components/ui/__tests__/recipient-picker-sources.test.tsx), [슬롯 §5](../02-architecture/project-composer-design.md#슬롯-기여와-레지스트리) | 2026-10-11 | - |

## DEC-OPS-269

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-269 | accepted | **게시글 상세의 스크랩 버튼을 스크랩 기능의 `post-actions` 슬롯 기여로 옮기고, 쓰기 권한 census 가 슬롯 기여의 쓰기를 그 기여를 여는 화면에 귀속하게 넓힌다(Phase 2 스크랩 슬롯 S2).** ① 기여는 쓰기 함수 이름(`submit`) 하나를 가리키고, 함수는 스크랩 소유 조회 모듈(`scrap-post-action.ts`)에 둔다. 잠금(추천·삭제·해결 표시와 하나)·토스트·완료 표시는 게시글 상세가 소유한다. ② 축 3 은 기여 파일을 화면 모집단에 넣고, 기여를 여는 화면을 그 레지스트리의 importer(도우미 .ts 면 그 importer)로 잇는다. 기여가 import 하는 비화면·비서비스 모듈은 디렉터리와 무관하게 중간 모듈로 읽고, 기여의 판정은 `visibleWhen.permissions` 원소만 센다. 같은 계산을 쓰는 화면 목록도 따른다. 부채 45·화면 목록은 그대로다. ③ 기여는 등록 전용으로 분류한다. ④ 게시판 시험은 가짜 기여로 호스트 계약을, 스크랩 디렉터리 시험은 실제 레지스트리 조립을 본다. ⑤ 저장이 mutation 을 거치지 않아 오프라인이면 대기 대신 즉시 실패로 알린다(추천·삭제와 같다). | 게시판→스크랩 묶음 간선을 걷기 전에 게시글 상세의 스크랩 import 를 없애야 {board} 생성에서 화면이 남는다(설계서 §16.4). 쓰기가 기여로 옮겨 가면 census 모집단 밖이라 부채가 44 로 줄어 보이고 권한 작업대에서 SCRAP_CREATE 가 빠진다(H2). 기여는 데이터만 담는 PR-4 규칙이라 쓰기를 기여 안에 두지 않았다. 사용자 위임(2026-08-23·2026-10-11). red 증명 19종. | [기여](../../frontend/src/extensions/scrap/post-actions.ts), [축 3](../../scripts/operation-consumer-census.mjs), [게시글 상세](../../frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx) | 2026-10-12 | - |

## DEC-OPS-270

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-270 | accepted | **게시글 상세의 스크랩 버튼을 스크랩 등록 권한(SCRAP_CREATE)이 있는 사람에게만 보인다(Phase 2 스크랩 슬롯 S3, H3).** ① 스크랩 기여의 노출 술어를 always 에서 `{ permissions: ['SCRAP_CREATE'] }` 로 바꾼다. 저장 API(POST /api/v1/scraps)와 같은 권한이다. 권한 상태를 모르면 보이지 않는다. ② 쓰기 권한 census 축 3 의 부채 래칫을 45→44 로 내린다 — 판정 없이 보이던 게시글 상세의 스크랩 쓰기가 기여의 노출 술어로 가려진 몫이다. 같은 계산을 쓰는 화면 목록은 그대로다(SCRAP_CREATE 는 쓰기 권한으로 이미 실린다). ③ 스크랩 소유 조립 시험이 주체 5종 노출 행렬·재렌더·술어와 저장 API 권한의 결속·기본 그룹을 본다. | 기본 그룹 셋은 모두 SCRAP_CREATE 를 가져 화면이 바뀌지 않는다. 바뀌는 쪽은 그 권한이 없는 사용자 정의 그룹이며, 종전에는 버튼을 누를 때마다 403 이었다. 노출일 뿐 서버 인가는 그대로다(H3). 래칫은 DEC-OPS-269 의 census 확장이 기여의 쓰기를 부채로 센 뒤에만 정당하게 내려간다 — 확장 없이 내렸다면 H2 위반이다. 사용자 위임(2026-08-23)과 2026-10-11 권고안 진행 지시. red 증명 4종. | [기여](../../frontend/src/extensions/scrap/post-actions.ts), [조립 시험](../../frontend/src/app/admin/collaboration/scraps/__tests__/board-detail-scrap-action.test.tsx), [census 원장](../../config/governance/operation-consumer-census.json) | 2026-10-12 | - |

## DEC-OPS-271

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-271 | accepted | **수동 도메인 삭제의 동반 삭제를 카탈로그 간선의 역방향 폐포로 정한다(Phase 2 간선 제거 E1).** ① `scripts/domain-deletion-plan.mjs` 가 생성기와 같은 간선 규칙(코드 참조·지원 파일·생성 묶음 선언)을 지금 트리에서 계산해 거꾸로 따라, 지우는 도메인을 요구하는 도메인을 함께 지운다. 카탈로그 전체를 적재하지 않아 생성물·이미 지운 트리·스캐폴드한 트리에서도 돈다. 화면 공유 간선(customOnly)은 보지 않는다. ② `delete-domain.ps1` 은 manifest 묶음의 방향 없는 고정점 확장 대신 이 판정을 부르고, 더한 도메인마다 요구 관계와 사용자 문장을 출력한다. 잔존 참조 경고는 지우는 타입의 정규화된 이름으로 찾는다. ③ 계약이 19개 단독 삭제 표, 원본 트리에서 카탈로그와 같은 간선, 투영·삭제·스캐폴드 트리의 판정을 고정한다. | 종전 확장은 묶음만 봐서 다음 단계(E2)에서 근거 없는 묶음 간선을 걷으면 게시판·결재를 지울 때 그것을 요구하는 스크랩·행사가 남아 컴파일이 깨진다. 바뀌는 동작은 하나다 — 템플릿을 지우면 커뮤니티(system)도 지운다. 커뮤니티 서비스가 주입받는 템플릿 배정 구현이 템플릿 디렉터리에 있어 종전에는 그 구현이 지워진 채 남았다(정적 추론: 컴파일은 되지만 주입할 구현이 없어 기동하지 않는다. 실행 확인은 하지 않았다). 패키지 접두 경고는 템플릿 삭제에서 business-core 같은 이름 패키지까지 걸려 56개 파일이었다(이제 21개). 사용자 위임(2026-08-23)과 2026-10-11 권고안 진행 지시. red 증명 12종. | [판정](../../scripts/domain-deletion-plan.mjs), [계약](../../scripts/domain-deletion-plan.test.mjs), [삭제 스크립트](../../scripts/delete-domain.ps1) | 2026-10-12 | delete-domain.ps1 의 manifest clusters 동반 삭제 규칙 |

## DEC-OPS-272

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-272 | accepted | **근거 없는 묶음 간선 4개를 걷는다(Phase 2 간선 제거 E2).** ① manifest 게시판 묶음을 [게시판, 댓글]로 줄이고 결재 묶음을 지운다. 게시판·댓글→스크랩, 스크랩→댓글, 결재→행사·포상 간선이 사라진다. 코드·필수 외래 키가 지키는 간선(게시판⇄댓글, 스크랩→게시판, 행사·포상→결재)과 대시보드 묶음은 그대로다. ② 사유 표에서 네 쌍의 문장과 묶음 상수를 걷는다. ③ 묶음 형식(방향 없는 domains)은 바꾸지 않는다 — 남는 대칭은 코드가 실제로 양방향인 게시판⇄댓글뿐이고, 매니페스트 v2 가 소유 선언을 다시 쓴다. | 묶음 간선은 코드·화면 근거 없이 게시판만 고른 생성물에 스크랩을, 결재만 고른 생성물에 행사·포상을 끌어왔다. 게시글 상세의 스크랩 import 를 슬롯 기여로 먼저 옮겨(DEC-OPS-269) 게시판 단독 생성에서 화면이 사라지지 않는다. 실측: 단독 선택 평균 포함 수 3.53→2.95, 혼자 풀리는 기능 8→9, 게시판·댓글·도움말·커뮤니티 7→5, 대시보드 9→7, 결재 2→1, CI 대표(게시판+설문) 8→6, 정밀 점검 차단 0. 수동 삭제에서 스크랩·행사가 이제 혼자 지워진다(DEC-OPS-271). 명령 센터의 협업 허브 바로가기는 허브를 소유한 쪽지·스크랩에 묶고, 마커 블록의 라우트가 블록이 남는 구성에 있는지 계약이 본다. 대시보드만 고르면 쪽지가 빠져 업무 홈의 안 읽은 쪽지 카드도 빠진다(쪽지 자신의 진입점). 구성 해시가 바뀐다. 사용자 위임(2026-08-23)과 2026-10-11 권고안 진행 지시. red 증명 7종. | [manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [사유 표](../../scripts/project-composer-reasons.mjs), [설계 §5](../02-architecture/project-composer-design.md) | 2026-10-12 | manifest clusters 의 게시판 묶음 스크랩 포함과 결재 묶음 |

## DEC-OPS-273

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-273 | accepted | **시스템·운영 묶음을 기능 다섯으로 나눈다(DEC-OPS-256 ① 이행).** ① `operation` 을 `event`(행사·약도·행사별 외부인사)·`reward`(포상)로, `system` 을 `community`·`promotion`(배너·팝업)·`showcase`(시연 화면)로 나눈다. business-app 패키지를 기능 id 로 옮기고 api-server 컨트롤러·URL·메뉴 행·권한 코드는 그대로 둔다. ② `showcase` 는 Java·테이블·권한이 없는 프런트 전용 기능이라 manifest `frontendOnlyDomains` 에 적고 카탈로그·재사용 census·생성기가 양방향으로 대조한다. ③ 두 기능을 섞은 프런트 서비스·시험을 화면마다 나누고(행정 구역 코드 폼 시험은 core 로), 나눈 권한 도메인이 정확히 한 선택 기능에만 있음을 카탈로그 시험이 본다. 생성기 영역에 시연·예제를 더한다(5개). | 이질 묶음째 골라 행사만 원해도 결재가, 게시판만 원해도 배너·팝업·시연 화면이 따라왔다. H3: 권한 코드·기본 그룹·바인딩·서비스 가드 그대로, 인가 원장 diff 는 수동 가드 경로 1행. OCI 메뉴 적용 0행이라 DEC-OPS-256 ①의 별도 승인 대상이 없다. 프리셋 3개와 {mail, schedule} 은 그대로이고, 지식 허브로 커뮤니티를 끌어오는 {board, survey} 등에서 배너·팝업·시연 화면(테이블 2·권한 10·경로 3)이 빠진다. 기능 19 → 22, 단독 선택 평균 포함 수 2.95 → 2.68, 혼자 풀리는 기능 9 → 12. 저장된 구성의 `system`·`operation` 은 별칭 없이 거부된다. | [카탈로그](../../scripts/project-composer-catalog.mjs), [재사용 manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json), [재사용 census](../../scripts/reusable-base-census.mjs), [설계 문서](../02-architecture/project-composer-design.md) | 2026-10-12 | DEC-OPS-244 ①의 업무 영역 4개 |

## DEC-OPS-274

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-274 | accepted | **협업 허브를 core 셸과 쪽지·스크랩 탭 기여로 나눈다(Phase 2 허브 분해 H1·H3).** ① 슬롯 `hub-tabs` 를 둔다 — 허브별 뷰 사전(`HubTabViews`)이고 항목 id 는 `?tab=` 값이다. 허브 탭 해석의 `TAB_HUB.slotHub`·`contributable`(탭 → 기여 파일)을 경계 계약이 실제 기여와 양방향으로 대조한다. ② 소비자 표를 `slot-registry.mjs` 로 옮겨 허브별로 적고, 기여의 쓰기(축 3·화면 목록)는 그 허브 셸로만 잇는다. 기여에서 닿는 파일은 기여 기능이 요구하는 기능 소유여야 한다. ③ 명령 센터 바로가기는 쪽지, 주소록 관리·신규 발송 링크는 주소록·메일의 shell-links 기여다. 쪽지⇄스크랩 화면 간선을 걷는다. ④ 탭이 없는 구성의 허브는 빈 상태를 말한다. ⑤ 감시 허브의 하네스 아틀라스 탭도 시연의 `hub-tabs` 기여다(H3). 셸은 sample 뷰의 상세에만 샘플 고지를 단다. | 쪽지만 골라도 스크랩·게시판이 따라왔고, 쪽지 탭의 메일 링크는 메일 없는 생성물에서 404 였다(GAP-COMPOSE-001). 바뀐 화면은 셋이다 — 신규 발송이 허브 머리 외곽선 링크로, 명령 센터 '협업 통합 허브' 설명이 '받은 쪽지 등 협업 목록으로 이동'으로(항목 id act-collab→link-collaboration-hub), 문서 제목이 '협업 목록'이 됐다. 단독 선택 평균 2.68→2.36, 혼자 풀리는 기능 12→13, core 라우트 45→46. 마커 98/14→90/12, 축 3 44·화면 목록 불변, OCI 0행. 사용자 위임(2026-08-23·2026-10-12). | [슬롯 타입](../../frontend/src/extensions/slots.ts), [소비자 표](../../scripts/slot-registry.mjs), [협업 허브 셸](../../frontend/src/app/admin/collaboration/CollaborationHubClient.tsx), [설계 §5](../02-architecture/project-composer-design.md#슬롯-기여와-레지스트리) | 2026-10-12 | DEC-OPS-272 의 명령 센터 바로가기 소유 부분, DEC-OPS-088 ③의 협업 허브 주소록 마커 부분 |

## DEC-OPS-275

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-275 | accepted | **지식 허브를 게시판 셸과 커뮤니티 탭 기여로 나눈다(Phase 2 허브 분해 H2).** ① 지식 허브 화면과 질의응답 해결 판정 모듈은 게시판 소유다. 위키·FAQ·Q&A 는 셸 고유 탭이고 커뮤니티 탭은 커뮤니티의 `hub-tabs` 기여(뷰: 게시판 ID·설명·아이콘·머리 동작)다. 도움말 탭은 새로 두지 않는다(동등 이행만). ② 커뮤니티 탭으로 가는 별칭 화면 `/admin/community/boards` 는 커뮤니티 소유다 — 같은 길이면 exact 선언이 접두 선언을 이긴다. ③ 화면 공유 묶음 '지식 허브'를 걷고 커뮤니티→게시판·도움말→게시판은 화면 import 간선으로 둔다. ④ 기여 탭으로 가는 화면·백엔드 출처가 단독 선택마다 기여와 함께 빠지는지 생성기 투영으로 본다. | 게시판만 골라도 커뮤니티·도움말·템플릿이 따라왔다. 화면은 같다. H0 동등성 그물은 기여 탭 기대를 투영 원장으로 거르고 페이지 기본 탭에서 커뮤니티를 뺐다(기여 탭은 기본 탭이 아니다). 탭 전환은 셸 탭과 기여 탭을 함께 본다. 단독 선택 평균 2.36→1.68, 게시판 단독 5→2, 축 3 44·화면 목록 불변, OCI 0행. 사용자 위임(2026-08-23·2026-10-12). | [지식 허브 셸](../../frontend/src/app/admin/help/KnowledgeHubClient.tsx), [커뮤니티 탭 기여 (당시 소스)](https://github.com/lkindo/egov-enterprise/blob/c4fd2e14cb38f92d2cd7c92ede2bf9470d358a1d/frontend/src/extensions/community/hub-tabs.ts), [카탈로그](../../scripts/project-composer-catalog.mjs) | 2026-10-12 | - |

## DEC-OPS-276

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-276 | accepted | **통계 셸의 게시판·설문 탭과 요약 칸을 `stats-panels` 기여로 옮긴다(Phase 2 허브 분해 H4).** ① 슬롯 `stats-panels` 의 배치는 탭(`hub-tab`)·요약 칸(`overview-card`)이다. 탭은 일자별 집계(`series` — 라우트라 링크 슬롯 항목이고 `href`·`{ page: href }` 를 갖는다)와 기능 본문(`body` — `?tab=` 으로 연다)이다. ② 조회는 셸이 `useQueries` 한 번에 소유하고 기여는 조회 키·로더·본문·내보내기를 이름으로만 가리킨다. 새로고침은 꺼진 조회까지 `refetch` 한다. ③ 미수집 판정은 셸 목록과 기여의 `uninstrumented` 의 합이다. 요약 칸 `summary` 는 미수집 축에만 두고 값은 '미수집' 이다. ④ 통계 개요의 쓰지 않는 게시물 조회를 걷는다. ⑤ 기능 탭은 그 화면에 들어갈 수 있는 주체에게, 설문 탭과 누적 게시물 칸은 통계 조회 권한 보유자에게 보인다 — 종전 노출과 같다. | 셸이 마커 35블록으로 게시판·설문 탭을 직접 조립했다. 원본 화면은 같다(게시판·설문 동등성 시험이 기대값 그대로 통과하고, 개요 탭의 조회 하나만 준다). 마커 90/12→55/7, 카탈로그 간선이 그대로라 KPI 불변, 축 3 44·화면 목록 불변, OCI 0행. 사용자 위임(2026-08-23·2026-10-12). | [슬롯 타입](../../frontend/src/extensions/slots.ts), [통계 셸](../../frontend/src/app/admin/stats/IntelligenceHubClient.tsx), [게시판 기여](../../frontend/src/extensions/board/stats-panels.ts) | 2026-10-12 | - |

## DEC-OPS-277

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-277 | accepted | **협업 허브의 쪽지·스크랩 탭과 통계의 설문조사 분석 탭을 그 탭이 부르는 목록 API 권한 보유자에게만 보인다(Phase 2 허브 분해 H5, H3 판정).** ① 쪽지 탭 기여의 노출 술어를 always 에서 `{ permissions: ['NOTE_READ'] }`, 스크랩 탭을 `{ permissions: ['SCRAP_READ'] }`, 설문 통계 탭을 `STATS_ADMIN_READ` 에서 `SURVEY_READ_ALL` 로 바꾼다. ② 권한이 없으면 탭이 없고 `?tab=` 값은 그 화면의 다른 탭을 연다. 쪽지·스크랩 탭이 모두 없으면 협업 허브는 구성이 아니라 조회 권한이 없다고 말한다. 권한 상태를 모르면 보이지 않고, 확인하는 동안 협업 허브는 빈 상태를, 통계 기능 탭 라우트는 통계 개요를 그리지 않는다. ③ 노출일 뿐 서버 인가는 그대로다. 화면 목록(권한 작업대)은 슬롯 술어를 표시 권한으로 잡지 않는다(GAP-COMPOSE-001, 종전에도 없었다). | 기본 그룹(ROLE_ADMIN·SYSTEM·USER)은 화면이 같다 — 쪽지·스크랩 조회는 세 그룹이, 통계·설문 전체 조회는 관리자 두 그룹이 함께 갖는다. 바뀌는 쪽은 그 권한이 없는 사용자 정의 그룹이며, 종전에는 탭을 열면 목록이 403 이었다. 축 3 44·화면 목록 불변, OCI 0행. 사용자 승인(2026-10-12). red 증명 3종. | [쪽지 탭 기여 (당시 소스)](https://github.com/lkindo/egov-enterprise/blob/c4fd2e14cb38f92d2cd7c92ede2bf9470d358a1d/frontend/src/extensions/note/hub-tabs.ts), [스크랩 탭 기여 (당시 소스)](https://github.com/lkindo/egov-enterprise/blob/c4fd2e14cb38f92d2cd7c92ede2bf9470d358a1d/frontend/src/extensions/scrap/hub-tabs.ts), [설문 통계 기여](../../frontend/src/extensions/survey/stats-panels.ts) | 2026-10-12 | - |

## DEC-OPS-278

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-278 | accepted | **감시 허브의 댓글 탭을 걷고 `/admin/system/comments` 를 댓글 기능의 독립 화면으로 둔다(Phase 2 허브 분해 H6, 안 B).** ① 새 `CommentModerationClient`(A1 셸, 댓글 소유)가 댓글 목록·확인 후 영구 삭제(삭제 대행 권한 보유자에게만 보임)·상세·현재 쪽 반출·`?page=` 복원을 맡는다. 제목은 메뉴 이름 '댓글 및 평가 관리'이고 만족도 평가는 각 게시글 화면에서 관리한다고 말한다. ② 감시 허브에서 협업 마커 20블록과 댓글 탭 값을 걷는다 — `?tab=comments` 는 기본 탭을 연다. ③ 반출 안내는 목록 탭 이름에서 조립한다. ④ 메뉴 경로·라우트 권한·OCI 메뉴 데이터는 그대로다. | 댓글 화면이 감시 허브 전체를 그려, 댓글 담당자에게 로그 탭 넷이 보이고 그 API 는 403 이었다. 허브의 로그 조회 권한만으로 들어온 사람에게는 댓글 탭이 보이고 목록이 403 이었다. 반출 안내는 없는 탭 이름 '서비스 피드백' 을 말했다. 마커 55/7→35/5, A1 채택 43→44, 화면 목록의 감시 허브 행에서 댓글 삭제 대행 권한이 빠진다(사실과 맞다), 축 3 44·폼 검증 165 불변. 사용자 결정(2026-10-12, 안 B). | [댓글 화면](../../frontend/src/app/admin/system/comments/CommentModerationClient.tsx), [감시 허브](../../frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx), [설계 §5](../02-architecture/project-composer-design.md#슬롯-기여와-레지스트리) | 2026-10-12 | 설계서 11장 슬롯 표의 '댓글(hub.tabs.monitoring)' 귀속 |

## DEC-OPS-279

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-279 | accepted | **나의 업무 허브를 core 셸과 링크 기여로 나눈다(Phase 2 업무 허브 분해 W1).** ① `/admin/work-hub` 와 탭 줄(`useWorkHubTabStrip`)은 core 다. core 탭은 업무 관리이고 업무 보고·일정은 `shell-links` 의 `work-hub` 배치로 탭을 더한다(글자 탭, core 탭과 id·목적지가 겹치지 않는다). 기여 탭이 없으면 탭 줄과 tabpanel 을 그리지 않는다. ② 업무 보고·일정은 각 기능 경로의 화면으로 나누고 업무 허브 클라이언트·부서 업무 레이아웃·컨텍스트 슬롯을 걷는다. 나의 업무의 문서 제목은 메뉴 이름을 따른다. ③ '메모보고 관리' 링크와 안내 문장은 메모 보고의 `work-report` 배치 기여이고 함께 보이고 숨는다. ④ 공동 화면 work-hub 와 사유 2행, `/admin/work-hub?tab=` 호환을 걷는다(일정 e2e 는 일정 경로로 옮긴다). ⑤ 화면 목록에는 각 화면이 그리는 권한만 남는다(나의 업무 13→7, 일정·업무 보고 13→3, 사용자·조직 묶음의 관련 화면 −2). | 허브가 보고·일정을 import 해 둘이 서로를 요구했고, core·collaboration 의 '나의 업무'는 목적지 없는 분류였으며, 업무 보고만 고른 생성물에 없는 메모 보고 화면 리터럴이 남았다. 탭이 경로라 새 슬롯 종류를 두지 않는다. 사용자 확인 B1~B3(2026-10-12). PR 카탈로그 실측: 단독 선택 평균 1.68→1.59, 혼자 풀림 13→15. 축 3 44 불변, A1 44→45. 기본 그룹 화면은 같다. OCI 0행. | [설계 §5](../02-architecture/project-composer-design.md), [탭 줄](../../frontend/src/components/business/work-hub/work-hub-tabs.tsx), [카탈로그](../../scripts/project-composer-catalog.mjs) | 2026-10-12 | - |

## DEC-OPS-280

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-280 | accepted | **커뮤니티 후속: api-server 기능 참조를 간선으로 세고, 게시글 모아보기를 게시판 소유로, 커뮤니티→템플릿을 선택 포트로 바꾼다(Phase 2 C).** ① 카탈로그·수동 삭제 판정이 api-server 컨트롤러의 디렉터리 소유 기능이 참조하는 다른 기능을 java 간선으로 센다(커뮤니티→게시판, 댓글→게시판). 소유 기능이 선택된 컨트롤러는 남아야 한다. ② `/admin/community/board` 를 게시판 소유로 옮기고 조회/Enter(G2)로 조회한다(사용자 결정 B4). ③ 템플릿 배정 포트는 `TmplatInfoService` 가 구현하고 커뮤니티는 ObjectProvider 로 받아 없으면 새 지정을 400 으로 거부한다. 관리 창 후보는 `template-options`(COMMUNITY_READ_ALL, 서비스가 TEMPLATE_READ 재확인)로 받고 기능이 없으면 칸을 감춘다. ④ 마법사의 커뮤니티 귀속 4블록은 선택 외래 키 연동 칸이라 남긴다. | 모아보기는 커뮤니티 데이터를 쓰지 않는데 그 import 가 커뮤니티→게시판의 근거였다. 그것만 걷으면 커뮤니티 사용자 API 가 게시판 참조로 연쇄 제거되는데 생존 검사가 통과했다(실측). 게시판 없는 커뮤니티는 두지 않는다(B6). 템플릿을 지우면 커뮤니티도 지우던 수동 삭제가 템플릿만 지우고, 게시판·댓글을 지우면 커뮤니티도 지운다(커뮤니티 사용자 API 간선). 후보를 보는 주체는 그대로다. 단독 평균 1.59→1.55(DEC-OPS-279 뒤 병합 트리), {커뮤니티} 4→3. | [카탈로그](../../scripts/project-composer-catalog.mjs), [CommunityService](../../business-app/src/main/java/nuri/business/service/community/CommunityService.java), [TmplatInfoService](../../business-app/src/main/java/nuri/business/service/template/TmplatInfoService.java) | 2026-10-12 | DEC-OPS-271 의 '템플릿을 지우면 커뮤니티도 지운다' |

## DEC-OPS-281

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-281 | accepted | **업무 홈을 core 셸과 기능의 홈 조각으로 나눈다(Phase 2 9단계).** ① 슬롯 `home-sections`(배치 overlay·actions·cards·main·status·bottom)를 두고 업무 홈 셸의 마커 24블록을 걷는다. 기여는 게시판(글 수 카드·최근 글·새 게시글 작성), 결재(대기 카드·결재함 열기), 쪽지(안 읽은 쪽지), 홍보(팝업·배너), 실시간 대시보드('실시간 상태')다. ② 셸은 core 다. 등록된 기여가 있으면 DASHBOARD_READ 없는 주체에게 종전 문구로 접근 불가를 알리고, 없으면(core 프리셋) 판정 없이 종전 화면이다. 직접 선택 {결재}·{쪽지}·{홍보}·{게시판} 생성물은 이 판정이 새로 생긴다(사용자 정의 그룹만 영향). ③ page 의 Suspense 안 서버 자식이 보이는 기여의 조회를 미리 채운다. 게시판은 종전 대시보드 API 이고 실패는 서버에서 오류 경계로 간다. 결재 대기 수는 결재 대기 API 전체 건수다. ④ 실시간 통계 프레임에 집계 구현 유무를 싣고, 화면은 그 기능이 빠진 구성에서 카드를 그리지 않는다. ⑤ 묶음 realtime-stats 를 걷는다 — 대시보드→알림은 화면 의존, 대시보드→게시판은 포트 연동이다. ⑥ 노출은 조각이 부르는 API 권한이다: 결재 APPROVAL_READ, 팝업 POPUP_READ, 배너 BANNER_READ. | 셸이 기능 데이터를 직접 조립해 마커가 생겼고, 게시판·결재·쪽지 카드가 대시보드 기능에 묶여 그 기능만 고른 생성물 홈에는 없었다. 원본 기본 그룹 화면은 같다(동등성 그물, ⑥ 의 세 권한도 기본 그룹 보유). 사용자 결정 B5(2026-10-12). 마커 35/5→11/2, {대시보드} 4→2, 단독 선택 평균 1.55→1.45·혼자 풀림 15(DEC-OPS-279·280 뒤 실제 카탈로그). | [슬롯 타입](../../frontend/src/extensions/slots.ts), [업무 홈](../../frontend/src/app/UnifiedDashboardClient.tsx), [서버 자식](../../frontend/src/app/home-data-boundary.tsx) | 2026-10-12 | DEC-OPS-272 의 '대시보드 묶음은 그대로다' 부분, DEC-OPS-088 ②의 업무 홈 마커 배치 부분 |

## DEC-OPS-282

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-282 | accepted | **재사용 생성 검증의 입장 순서와 PR 레이아웃을 바꾼다(ADR-0027, CI 비용 축소 1차).** ① 사용자 구성 검증 2잡은 분류 직후 시작한다. ② PR 은 시작 구성마다 한 레이아웃(core 단일·collaboration 멀티·demo 단일)만 생성·검증하고, 표에 없는 시작 구성과 main push·수동 실행·이벤트 미상은 두 레이아웃이다. 사용자 구성 2잡·검증 단계·required 이름은 그대로다. ③ PR 이 놓친 레이아웃 회귀는 병합 뒤 main 이 붉은 동안만 보인다(ADR-0023 과 같은 수용 위험). ④ 병합 뒤 main 처음 5회 중 3회 이상이 15.2분보다 느리면 ①을 되돌린다. | PR 16회 중 12회·main 13회 중 7회에서 사용자 구성이 마지막 잡이었고 분류 직후 러너 4개가 비었다. 이 잡을 backend 뒤로 옮긴 근거(ADR-0026 8차)는 secret-scan 이 분류 직후로, 제품 PIT 가 4슬롯으로 바뀌어 사라졌다. 20러너 재현 모델에서 PR 중앙값 15.5→12.2분, 재사용 러너분 54→35다. 2026-09-20 이후 실패 91회 중 레이아웃 고유의 결정적 회귀는 0이다. 사용자 결정(2026-10-12). | [ADR-0027](../02-architecture/decisions/ADR-0027-ci-reusable-admission-layout-and-nightly.md), [분류기](../../scripts/ci-change-scope.mjs), [CI](../../.github/workflows/ci.yml) | 2026-10-12 | ADR-0026 결정 1의 PR 두 레이아웃 부분·결정 10의 custom 입장(결정 2 는 유지), DEC-OPS-180·CTX-021 의 'custom 2개는 backend 뒤' |

## DEC-OPS-283

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-283 | accepted | **재사용 생성물의 일반 테스트를 별도 워크플로로 돌린다(ADR-0027, T2).** ① `reusable-nightly.yml` 이 카탈로그에서 계산한 시작 구성(두 레이아웃)과 서로 다른 단독 폐포(날짜로 번갈아 한 레이아웃)를 기존 진입점으로 생성·산출물 검증한 뒤 시험을 돈다. 지금은 수동 실행만 두고, 예약(06:17 KST)은 첫 녹색 수동 실행 뒤 켠다. ② 레이아웃별 시험 작업(단일 모듈은 test·foundationTest·coreTest·appTest)의 JUnit XML 과 vitest JSON 으로 판정한다. 보고서가 없거나 모집단이 0이거나 명령이 실패하면 실패다. ③ 이관 시험은 가장 큰 시작 구성의 두 레이아웃에서만 돌고 제외는 원장에 둔다. ④ required 가 아니고 비밀 0·읽기 권한·캐시 읽기·동시 10잡이다. 동시성 그룹이 ref 와 무관하게 하나라 겹친 dispatch·예약도 이 예산 안이다(기다리던 실행은 새 실행에 취소된다). 기능 브랜치의 직접 선택 검증도 `--ref` 로 이 워크플로를 쓴다. | 생성물 일반 테스트는 산출물 검증 밖이라 core·collaboration 이 처음에 붉었고(GAP-BASE-002) 직접 선택은 재지 않았다. 단일 모듈의 test 는 api-server 시험만 돌고, 이관 시험을 구성마다 돌리면 잡이 37~40분이다. 지금 계획은 26잡이다. 러너·판정 순증 ≈370줄. 사용자 결정(2026-10-12). | [ADR-0027](../02-architecture/decisions/ADR-0027-ci-reusable-admission-layout-and-nightly.md), [러너](../../scripts/reusable-nightly.mjs), [워크플로](../../.github/workflows/reusable-nightly.yml) | 2026-10-12 | - |

## DEC-OPS-284

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-284 | accepted | **슬롯 노출 술어를 화면 목록의 표시 권한으로 귀속한다(Phase 2 10단계 10a).** ① 기여 항목의 `visibleWhen.permissions` 를 그 항목을 그리는 셸 화면의 표시 권한으로 붙인다. 판독기는 축 3 의 항목 단위 판독기 하나다. ② `stats-panels` 소비자 표를 배치별로 나누고(`hub-tabs` 는 허브별), 슬롯 셸은 놓인 디렉터리가 아니라 그리는 화면에 귀속한다. 배치 미구분 예외를 걷고, 항목이 여러 값에 걸친 기여 파일을 거치는 쓰기·표시만 거부한다. ③ page·always 술어와 레이아웃 셸만 그리는 항목은 붙이지 않는다. 원본에서 화면 0개면 실패하고, 투영본은 그리던 셸·화면이 지워진 증거(원장의 셸, 또는 고아가 된 셸과 지워진 화면)가 있을 때만 기록한다. 읽을 수 없는 술어(가져온 이름·펼침)는 실패한다. ④ 원본 화면 목록에 14건/10화면이 더해진다. 묶음·인가는 그대로다(H3). | 권한 작업대가 기여가 실제로 보이는 권한을 몰랐다 — 메일·문자 행에 ADBK_READ, 협업 허브 두 화면에 NOTE_READ·SCRAP_READ, 통계 셸 다섯 화면에 SURVEY_READ_ALL, 업무 홈에 APPROVAL_READ·BANNER_READ·POPUP_READ 가 없었다. '그 밖의 기능' 일괄 칸이 이제 SURVEY_READ_ALL 을 뺀 여섯을 함께 켜고 끈다(DEPT_READ·USER_READ 와 같은 규칙). red 증명 15종. | [생성기](../../scripts/generate-screen-registry.mjs), [판독기](../../scripts/operation-consumer-census.mjs), [소비자 표](../../scripts/slot-registry.mjs) | 2026-10-12 | GAP-COMPOSE-001 의 술어 귀속 문장, DEC-OPS-268 ③·DEC-OPS-277 ③ 의 화면 목록 미귀속 서술 |

## DEC-OPS-285

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-285 | accepted | **시작 구성은 이름 붙은 기능 목록이고 같은 목록은 같은 결과를 낸다(ADR-0028, Phase 2 10단계 13a).** ① 계약이 카탈로그의 시작 구성마다 같은 기능 목록의 직접 선택과 대조한다 — 해석된 구성(식별·제거 경로 문자열 제외)과 정밀 점검의 Java·프런트·게이트·규칙 제거 집합이 같아야 한다. 새 시작 구성도 받는다. ② collaboration pack 제거 경로에 게시판·쪽지·문자 화면 디렉터리를 더해, core 시작 구성 생성물에 남던 제외 기능 비화면 파일 17개(레이아웃·폼 검증·게시판 컴포넌트, 시험 5)를 걷는다. 라우트 원장 9행의 직접 투영 프로필에서 core 가 빠진다. ③ 투영 수단 둘(pack·기능 소유)은 그대로 두어 pack 모드 관찰자(도달성 census·라우트 원장)와 생성기가 어긋나지 않는다. pack·rank 제거와 해석기 단일화는 매니페스트 v2 에서 한다. | 2026-10-12 측정에서 core 시작 구성만 프런트 파일 15개를 덜 지웠고, 10단계 B4 가 문자 스키마·게시판 시험을 기능 소유로 옮겨 19개가 됐다. 리다이렉트 화면 2개는 거버넌스 투영이 이미 지운다. 화면 생존 대조는 화면만 봐서 비화면 파일을 잡지 못했다. 변경 뒤 세 시작 구성 차이 0·차단 0. 구성 해시가 바뀌어 로컬 DB 번들은 다시 만든다. 사용자 결정 U2(2026-10-12)의 '두 줄' 은 B4 뒤 세 줄이 됐다. red 증명 4종. | [ADR-0028](../02-architecture/decisions/ADR-0028-presets-are-named-domain-lists.md), [계약](../../scripts/project-composer-preset-equivalence.test.mjs), [manifest](https://github.com/lkindo/egov-enterprise/blob/52527499a62d/config/reusable-base-profiles.json) | 2026-10-13 | DEC-OPS-265 의 'core 에 남는 비화면 파일은 preset 통합 몫' |

## DEC-OPS-286

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-286 | accepted | **생성물의 API 계약 사슬을 구성으로 다시 만든다(Phase 2 10c-2, U5-A).** ① 생성기가 인가 원장 바인딩으로 핸들러 소스가 지워진 연산을 api-docs 에서 빼고 스키마 폐포·태그를 정리한다. 바인딩 없는 연산은 실패이고 정밀 점검이 미리 막는다. ② 생성 타입 3종은 원본 frontend 의 도구로, 경계·소비 census 는 생성물 트리에서 다시 만든다. 소비자만 빠진 연산은 `consumer-not-in-composition`(근거는 투영 원장의 지운 소비자 파일)으로 적고 기대값은 생성물 실측이다. ③ 경로 린터가 api-docs ⊆ 컨트롤러도 본다. ④ 원본 frontend 의존성이 없으면 TOOL_UNAVAILABLE 이다. CI 재사용 잡과 사전 점검이 설치를 맡고, TypeScript 모듈은 생성기가 동적 import 로만 부른다. ⑤ springdoc 재추출 대조는 T2 다. ⑥ 남는 프런트 코드(시험 포함)가 사라진 계약 이름을 쓰면 파일·줄을 밝히며 실패하고 정밀 점검이 예측으로 미리 막는다. 주인 없던 댓글·만족도 폼 검증과 댓글 타입은 기능 경로로 선언한다. ⑦ unwiredMax·ungatedWriteMax 가 원본보다 크면 실패하고, 늘어난 화면 고아와 별칭만 남는 연산은 lock 에 적는다. | core 생성물은 431개 연산 중 242개가 없는 API 였고 경계·소비 census 가 생성물에서 붉었다. 전체 구성은 api-docs·생성 타입 3종·두 census 가 원본과 같다. core·collaboration·직접 선택 5종 투영에서 census 오류 0. red 증명 13종. 검토 반영 뒤 27구성에서 계약 이름 참조 0(트랙 B 화면 소스와 합친 근사), red 증명 9종. | [계약 투영](../../scripts/reusable-contract-projection.mjs), [census 투영](../../scripts/reusable-contract-census.mjs), [경로 린터](../../api-server/src/test/java/nuri/api/harness/ApiDocsPathCoverageLinterTest.java) | 2026-10-13 | - |

## DEC-OPS-287

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-287 | accepted | **생성물의 권한 정의·바인딩·묶음·화면 목록을 구성으로 함께 투영한다(Phase 2 10단계 10b-2, 설계서 12.3).** ① 카탈로그·코드 상수·시드 생성 블록을 구성 코드로 줄이고, 인가 원장 바인딩은 핸들러 소스가 지워진 행을 뺀다. 런타임 = 원장이라 동치 검사 셋은 그대로이고, 하네스는 원장에 지워진 핸들러 행이 없는지도 본다. ② 묶음은 구성 코드로 줄여 여는 화면이나 관련 화면이 남을 때만 두고, 남는 권한이 묶음 밖이면 생성 제외로 적는다. 원본 규칙은 그대로다. ③ 화면 목록은 TypeScript 없이 데이터로 투영하고 라벨은 원본 라우트 원장 스냅숏에서 가져온다. 재생성 동치는 T2 `--check` 가 본다. ④ 투영본 하한은 하네스 census 와 정확히 비교한다. ⑤ 정밀 점검(PERMISSION_PROJECTION)은 생성기와 같은 함수로 남는 page 전부(넘기는 page 포함)의 카탈로그·바인딩·묶음을 미리 판정하고, 복사 트리에서 생성기 단계와 대조한다. 무결성 검사는 투영 불변식을 다시 본다. ⑥ 이미 배포된 DB 의 구성 밖 배정은 업그레이드 키트 선행 조건이다. | core 생성물 권한 작업대가 246개를 보였지만 구성은 85개였다. 묶음은 없는 기능의 권한을 더하거나 결재 권한을 숨겼고, 생성물에서 화면 목록을 다시 만들 수 없었다. 정밀 점검 27구성 차단 0. 모사 트리 27구성에서 데이터 투영 = 재생성, 권한 생성물 `--check` 통과. demo 는 원본과 바이트가 같다. core 실제 생성물에서 무결성·`--check`·하네스·vitest 전체가 녹색이다. 사용자 결정 U3·U4·U6(2026-10-12). red 증명 20종. | [권한 투영](../../scripts/reusable-permission-projection.mjs), [화면 목록 뼈대](../../scripts/screen-registry-model.mjs), [재사용 가이드 §3.5](../03-guides/reusable-base-guide.md#35-소스-projection) | 2026-10-13 | - |

## DEC-OPS-288

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-288 | accepted | **기능 선언을 매니페스트 v2(`config/modules`)로 옮기고, 카탈로그가 그것을 읽으며 시작 구성을 직접 선택과 같은 해석기로 푼다(Phase 2 11단계 C1·C2).** ① 기능 파일 22개·core·presets 와 스키마를 둔다. 전환(C7) 전까지 v1(manifest·생성기 상수)에서 생성기가 만들고(`modules:generate`·`modules:check`), 동치 계약이 v2 만으로 만든 카탈로그를 v1 과 대조한다. 스키마 검사(ajv)는 운영 계약과 `modules:check` 가 한다 — 로더는 생성기 import 폐포라 Node 내장 모듈만 쓴다. ② 카탈로그는 v2 로더로 읽는다. 생성기가 pack 으로 투영하는 동안(C3 전) pack 축만 v1 에서 덧붙이고, 둘이 어긋나면 적재가 멈춘다. ③ Java 포트 연결(업무 기능이 구현하고 소유가 다른 빈이 주입받는 포트)을 계산해 연동 선언 또는 '잃는 것 없음' 분류 중 정확히 하나에 두게 한다. ④ 시작 구성도 화면 계열 간선을 따르고 화면 제외 경로를 기능 규칙에서 계산한다. 목록이 필수 의존에 닫혀 있는지는 적재가 검사한다. 생성기 투영은 C3·B5 전까지 pack 이라 core 생성물에는 같은 목록의 직접 선택보다 비화면 파일 13개가 남는다. ⑤ 출처 해시는 화면 문구·미배정 권한 안내를 뺀다. | 한 기능의 선언이 manifest 와 생성기 상수 여러 곳에 흩어져 있었다. 시작 구성과 같은 목록의 직접 선택은 화면 제외 경로가 달랐고(core 106 대 121), 포트 연동은 손으로 선언해 누락을 찾지 못했다(GAP-COMPOSE-001). 카탈로그 해시가 바뀌어 로컬 DB 번들은 다시 만든다. red 증명 23종. | [매니페스트 v2](../../config/modules), [로더](../../scripts/composer-modules.mjs), [포트 연결](../../scripts/project-composer-integrations.mjs), [설계 §5](../02-architecture/project-composer-design.md) | 2026-10-13 | - |

## DEC-OPS-289

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-289 | accepted | **생성기 투영을 매니페스트 v2 의 기능 소유로 옮기고 pack·순위를 걷는다(Phase 2 11단계 C3).** ① 소스·DB 생성기·정밀 점검·하네스 프로필은 시작 구성도 해석된 기능 목록·화면 제외 경로와 v2 기능 소유(기능 목록·지원 파일·시작 구성 기대치)로 투영한다. 마커 블록은 소유 기능으로만 거르고 걷은 수를 lock `frontend.markerBlocks` 에 남긴다. ② 소유 기능이 빠진 공유 테이블은 선언 순서의 첫 선택 소비자가 넘겨받는다. ③ 생성물 `config/modules` 에 구성의 기능 파일·core·활성 구성 하나를 남기고, 무결성 검사가 파일 집합·활성 구성·테이블 소유를 대조한다. ④ 시작 구성도 선택 소스 생존 검사를 받는다. ⑤ pack 축은 옛 소비자(투영 manifest·거버넌스·검토 범위, 도달성 census·라우트 원장)용으로 남긴다(C4·C5). | 29개 구성의 정밀 점검 파일 목록이 B5 기준선과 같다. core 시작 구성은 비화면 13개·리다이렉트 2개를 더 지운다(같은 목록의 직접 선택과 같다). 직접 선택 투영 manifest 의 게이트 순서·RBAC 사유 문구가 바뀐다. 수동 삭제 판정은 기능 파일만 본다. red 증명 10종. | [매니페스트 v2](../../config/modules), [생성기](../../scripts/generate-reusable-base-source.mjs), [무결성](../../scripts/reusable-governance-integrity.mjs), [가이드 §2](../03-guides/reusable-base-guide.md#2-프로필) | 2026-10-13 | DEC-OPS-288 ④의 'C3·B5 전까지 pack 투영' |

## DEC-OPS-290

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-290 | accepted | **횡단 게이트 원장 셋의 pack 태그를 걷고, 남고 빠지는 기대를 기능 소유에서 계산해 시작 구성마다 생성기 계획과 대조한다(Phase 2 11단계 C4).** ① 개인정보 접근·결합·입력 계약 원장에서 `packs` 어휘와 항목 태그 230개를 걷는다. 되살리면 Java 게이트가 모르는 필드로 거부한다. ② node 계약은 항목 소스의 기능 소유(카탈로그 sourceOwner 규칙)로 기대 생존을 계산해 시작 구성 셋과 '협업 + 설문' 합성 구성의 `planJavaRemoval` 과 양방향 대조한다. 합성 구성은 13b 까지 둔다. ③ 생성물의 세 Java 게이트는 투영 기록(`retainsType`·`retainsSource`) 하나로 판정하고 `customDomains` 분기를 걷는다. ④ 시작 구성의 Java 게이트 승인·연쇄는 presets.json 목록과 exact 대조한다(교체도 red). ⑤ 부트스트랩 시드 시험은 pack 제거 경로 대신 기능 화면 경로를 읽는다. | 태그는 소유를 손으로 옮겨 적은 사본이었다. 시작 구성을 저장소에서 모두 대조하므로 생성물 쪽 독립 기대를 저장소 계약으로 옮겨도 신호가 줄지 않는다(H2). api-server 기능 디렉터리 밖 소스 셋(외부인사 컨트롤러·결재 요청 DTO 둘)은 참조로 소유가 정해져 연쇄와 같은 판정이라, 그 신호는 Java 연쇄 exact 목록이 받친다. red 증명 15종. | [원장 계약](../../scripts/pack-tagged-registry.mjs), [개인정보 게이트](../../api-server/src/test/java/nuri/api/harness/PrivacyAccessCensusLinterTest.java), [가이드 §3.6](../03-guides/reusable-base-guide.md#36-제거되는-거버넌스-게이트와-승인) | 2026-10-13 | DEC-OPS-089·090 의 pack 태그 판정, DEC-OPS-289 ⑤ 의 C4 몫 |

## DEC-OPS-291

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-291 | accepted | **관찰자도 기능 소유와 시작 구성으로 판정하고 카탈로그·구성·lock 의 pack 축을 걷는다(Phase 2 11단계 C5).** ① CI 범위 분류는 파일 → 소유 기능 → 그 기능이 남는 시작 구성이고 소유 미상은 전수다. PR 레이아웃은 `presets.json` 의 `ci.pr`(해시 밖)이다. ② 라우트 원장·도달성 census 는 시작 구성의 해석된 구성으로 투영하고, 검토 범위 행은 `requiredDomains` 만 둔다. ③ 생성물 표지는 `presets.json` 의 `active` 다. 권한 생성기·하네스 프로필·원장 계약·무결성 검사는 생성기 투영 구조와 함께 확인해 다르거나 lock 만 있으면 실패하고, 생성물에 v1 manifest 를 남기지 않는다. ④ adoption-review 입력은 `config/modules` 다(없으면 실패). ⑤ 재사용 census 의 pack 순위 검사는 카탈로그의 시작 구성 닫힘 검사가 대신한다. Atlas 는 시작 구성·기능 선언을, 수동 삭제는 지우는 기능의 화면 소유를 쓴다. | 생성기는 C3 부터 pack 을 보지 않는데 관찰자는 pack 으로 판정해 둘이 어긋났다. 라우트 원장에서 core 에 남는다던 화면 13개가 빠져 생성기와 같아졌고, 수동 삭제는 행사만 지워도 행사 화면을 지운다. v1 manifest 는 C7 까지 v2 의 원천이다. red 증명 22종. | [CI 분류기](../../scripts/ci-change-scope.mjs), [생성물 표지](../../scripts/composer-modules.mjs), [라우트 원장](../../scripts/ui-route-capabilities-contract.mjs) | 2026-10-13 | DEC-OPS-282 ②의 레이아웃 표 위치(분류기 상수), DEC-OPS-289 ⑤ 의 C5 몫(관찰자·검토 범위·lock 의 pack 축) |

## DEC-OPS-292

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-292 | accepted | **프런트 마커 토큰을 기능 id 로 바꾸고 마커 선언을 기능 파일로 옮긴다(Phase 2 11단계 C6).** ① 토큰이 곧 소유 기능이다 — 통합 검색 7블록은 `board`, 게시판 마법사 4블록은 `community` 이고, 블록은 그 기능이 구성에 있을 때만 남는다. ② 파일별 블록 수·이행 단계·사유는 기능 파일의 `owns.markerBlocks` 에 둔다. 투영은 스크립트가 속한 저장소의 기능 파일을 읽고, 기능이 아닌 토큰(`unknown marker feature`)과 선언 없는 블록(`Unclassified composer UI block`)에서 생성·정밀 점검·census 가 실패한다. ③ 소유 표 `FRONTEND_MARKER_FILES`·소유 함수와 `token`·`alsoRequires` 필드를 걷는다. 운영 계약이 원본 블록 수와 기능 파일 선언을 정확히 대조한다. ④ 가이드 §3.7 의 블록 의존 규칙을 순위가 아니라 기능 요구 관계로 적는다. | 소유 표는 pack 토큰을 기능으로 다시 옮기는 두 번째 소유 선언이었다. 29개 구성에서 정밀 점검 파일 목록·게이트·걷은 블록 수와 토큰을 지운 투영 본문이 전후 같고, URL-state census 는 바뀌지 않는다. red 증명 10종. | [프런트 투영](../../scripts/reusable-source-frontend.mjs), [마커 선언](../../scripts/composer-modules.mjs), [가이드 §3.7](../03-guides/reusable-base-guide.md#37-프런트-마커슬롯-작성-규칙) | 2026-10-13 | DEC-OPS-266 ①의 소유 표(`FRONTEND_MARKER_FILES`), DEC-OPS-088 ④의 순위 하향 의존 규칙 |

## DEC-OPS-293

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-293 | accepted | **스크립트가 시작 구성 이름을 열거하지 않고 presets.json 에서 읽는다(Phase 2 11단계 C8).** ① 새 `composition-profiles.mjs`(Node 내장만)가 시작 구성 id 와 생성물 profile 이름(시작 구성 + `custom`)을 이 스크립트가 속한 저장소의 presets.json 에서 읽는다 — 원본은 모든 시작 구성, 생성물은 활성 구성 하나다. 읽지 못하면 실패한다. 기관 승인 범위가 이 파일을 묶고(생성물은 필수) 메타 게이트가 내용 해시로 동결한다. ② 열거가 있던 18개 파일(운영 10·시험 8)의 생성 검증·생성물 검사·기관 승인·CI 범위·라우트 원장을 이것으로 바꾼다. 라우트 원장은 시연 화면 소유 'demo' 를 늘 받고, '시연 기능이 다른 구성에 샌다' 검사는 시연 밖의 모든 시작 구성을 본다. ③ CI 범위 분류는 기능 파일을 읽지 못해도 presets.json 의 모든 시작 구성으로 닫는다. 재사용 생성기도 시작 구성 선언도 없는 독립 산출물은 재사용 대상이 없고, 생성기가 있는데 선언을 읽지 못하면 분류를 멈춘다. ④ 운영 계약이 스크립트·도구·워크플로에서 시작 구성 id 전부를 쉼표·`|` 로 잇거나 한 줄에 따옴표로 모두 적은 열거를 막는다. 모든 id 를 키로 쓴 객체는 잡지 않는다(남은 v1 원천 둘은 C7 이 걷는다). ⑤ `custom` 은 원본 시작 구성 id 가 될 수 없다(스키마·로더·이름 판정). | 이름 목록이 13b 의 새 시작 구성을 생성 검증 진입부터 거부했다(R3). 새 게이트 대신 pack·순위 읽기를 막는 운영 계약 파일에 시험을 더했다 — 그 가드는 정한 파일만 본다. 생성물 원장의 'demo' 는 직접 선택 생성물이 제 원장을 거부하지 않게 둔다. red 증명 10종. | [구성 이름](../../scripts/composition-profiles.mjs), [CI 분류기](../../scripts/ci-change-scope.mjs), [계약](../../scripts/project-composer-source.test.mjs) | 2026-10-13 | - |

## DEC-OPS-294

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-294 | accepted | **매니페스트 v2 전환을 마친다 — 기능 소유의 원천은 `config/modules` 하나다(Phase 2 11단계 C7).** ① v1 manifest·생성기 상수(기능 경로·연동·사용자 문장·표시 문구·미배정 권한 안내·게이트·RBAC 표면·공통코드 그룹)·v1→v2 생성 스크립트·임시 동치 계약·`merge:main` 재생성 단계를 걷는다. 기능 파일을 직접 고치고 `modules:check` 가 스키마·파일 사이를 대조한다. ② 권한 투영·계약 사슬을 포함한 모든 소비자가 로더를 읽는다. 원본 스키마 실측은 `core.json` 의 `databaseSnapshot` 이고 재사용 census 는 기능 파일을 검사한다. ③ 생성물 무결성 검사는 카탈로그 출처 해시를 원본 기능 선언 스냅숏에 결속한다. ④ 옛 파일이 되살아나면 로더가 `old ownership declaration remains` 로 멈추고, 운영 계약이 생산 코드의 그 이름 참조를 막는다. | 같은 소유를 두 곳에 적고 생성기로 맞추던 이중 선언을 끝낸다. 카탈로그 본문·해석·투영은 같고 출처 해시와 묶음 근거 문자열만 바뀐다(구성 해시 1회 변경). pack 우산 검사와 읽는 곳 없는 `sourcePolicy` 는 대상과 함께 사라졌다. red 증명 12종. | [로더](../../scripts/composer-modules.mjs), [기능 파일](../../config/modules), [census](../../scripts/reusable-base-census.mjs), [계약](../../scripts/project-composer-source.test.mjs) | 2026-10-13 | DEC-OPS-288 ①의 C7 전까지 v1 에서 생성, DEC-OPS-243 ①·244 ①·264 ① 의 정본 위치(사유 표·표시 문구 모듈·`profiles.<name>.acknowledgedJavaCascade` → 기능 파일의 `requires[].userReason`·`presentation`·presets.json 의 `expected.javaCascade`) |

## DEC-OPS-295

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-295 | accepted | **'공통 기반 + 설문'·'공통 기반 + 결재' 를 인증 시작 구성으로 둔다(DEC-OPS-256 ③, Phase 2 13b-1).** ① `presets.json` 에 `survey`([survey])·`approval`([informalsanction]) 을 더한다. 둘 다 혼자 닫힌 폐포라 같은 목록의 직접 선택과 결과가 같다(동치 계약이 대조한다). ② 기대치는 생성기 계획을 재서 정했다 — Java 게이트 승인 11·12건(기능 게이트 소유에서 계산한 목록과 exact), 비게이트 연쇄 96·99건, 규칙 2개, 정밀 점검 차단 0. ③ 원장 셋의 '협업 + 설문' 합성 구성을 걷는다 — 설문 시작 구성이 설문을 다른 기능과 가르고, 계약이 그 분리를 요구한다. ④ 결재 구성에는 알림이 없어 알림까지 보는 `ApprovalWorkflowIntegrationTest` 가 통째로 빠진다. | 순위 접두로는 만들 수 없던 조합이다. 실제 생성·산출물 검증(`base:verify --profile survey`·`approval`)은 CI 수동 전수와 T2(5×2+21=31잡)가 한다. 결재 통합 시험의 알림 검사 1건을 떼면 나머지 13건을 결재 구성에 남길 수 있다(후속). red 증명 5종 — 연쇄 한 줄 삭제는 JAVA_CASCADE_UNACKNOWLEDGED, 게이트 한 줄 삭제는 게이트 소유 exact 실패. | [시작 구성](../../config/modules/presets.json), [원장 계약](../../scripts/pack-tagged-registry.mjs), [가이드 §2](../03-guides/reusable-base-guide.md#2-프로필) | 2026-10-13 | DEC-OPS-290 ②의 합성 구성 |

## DEC-OPS-296

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-296 | accepted | **새 인증 시작 구성은 PR CI 에서 빼고 main 두 레이아웃과 T2 에서만 돈다(U15, Phase 2 CI 2차-a).** ① `presets.json` 의 `ci.pr` 이 `null` 이면 PR 은 그 시작 구성을 생성·검증하지 않고, 그때는 `ci.main` 에 두 레이아웃을 적어야 한다(스키마·분류기 모두). main push·수동 실행은 늘 두 레이아웃이라 `ci.main` 이 하나라도 빠지면 분류가 멈춘다. ② `survey`·`approval` 에 적용한다. 사용자 구성 대표 2잡·기존 세 시작 구성의 PR 레이아웃·required 이름은 그대로다. ③ PR 에서 고른 시작 구성이 모두 PR 제외면 재사용 검증을 고르지 않는다(빈 matrix 를 넘기지 않는다). | 두 구성의 기능은 demo 에 모두 있어 PR 의 demo 가 같은 코드를 생성·검증하고, 생성기 계획(연쇄·게이트·화면·차단)은 PR 의 운영 계약이 대조한다. 구성 고유 회귀는 병합 뒤 main 이 붉은 동안만 보인다(ADR-0027 결정 3 과 같은 수용 위험). PR 러너 증가 0, main 은 재사용 잡 +4. red 증명 6종 — PR 에 뜨거나, main 에서 빠지거나, main 레이아웃 검사·빈 matrix 가드·`ci` 선언·스키마 조건을 걷으면 붉다. | [분류기](../../scripts/ci-change-scope.mjs), [스키마](../../config/modules/_schema.json), [CI 가이드](../03-guides/cicd-pipeline.md#재사용-프로필과-독립-이관-검증) | 2026-10-13 | ADR-0027 결정 2 의 'PR 은 시작 구성마다 한 레이아웃' 중 `ci.pr` 이 null 인 시작 구성 |

## DEC-OPS-297

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-297 | accepted | **생성기·도구 전용 경로만 바꾼 변경은 이관·PIT·frontend 를 돌리지 않고, 남길 축은 그 경로를 읽는 시험에서 계산한다(Phase 2 CI 2차-b, C11).** ① 분류기 표(`GENERATOR_TOOL_PATHS` — `config/modules`·메뉴 스냅숏·생성기 스크립트·`tools/project-composer`)는 모든 시작 구성의 재사용 검증과 항목의 축만 고른다. ② 운영 계약이 Java·프런트 소스와 ci.yml 조건부 진입점에서 경로 문자열·디렉터리 읽기·표 안 실행 사슬로 축을 다시 계산해 항목마다 같은지 본다. ③ 프런트 시험이 보던 scripts/ 제어문자 검사를 늘 도는 운영 계약으로 옮긴다. ④ 조건 'T2 녹색 기록'(U22): 수리 뒤 이 PR 브랜치의 수동 실행 run 38349516611(브랜치 59b79fa78, 31잡 전부 녹색·벽시계 63분)이 녹색이다. | 하네스 두 개가 scripts/ 를 디렉터리째 읽고 기본 관리자 시드 스키마 검증·생성기 화면 시험이 생성기를 실행해, 계획과 달리 backend·schema·E2E 는 남는다. 끄는 것은 이관 3잎·PIT 14범위·frontend 이고, frontend 를 건너뛰면 재사용 검증이 분류 직후 시작한다. 생성기 화면만 바꾸면 재사용·E2E 만 돈다. red 증명 9종. | [분류기](../../scripts/ci-change-scope.mjs), [표 계약](../../scripts/ci-change-scope-tool-paths.test.mjs), [CI 가이드](../03-guides/cicd-pipeline.md) | 2026-10-13 | - |

## DEC-OPS-298

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-298 | accepted | **T2 야간 검증을 매일 06:17 KST 에 예약 실행하고 계약 재생성 대조를 기본으로 켠다(Phase 2 B8, U20).** ① 예약(`17 21 * * *`, 정각 회피)은 첫 녹색 수동 실행 뒤 켠다는 사용자 결정(U20·ADR-0027 결정 4)대로, 수리 뒤 이 PR 브랜치의 수동 실행 run 38349516611(브랜치 59b79fa78, 31잡 전부 녹색·벽시계 63분)을 확인하고 켰다. 새 시작 구성 survey·approval 의 두 레이아웃도 그 실행에서 처음 생성·검증됐다. ② 예약 실행은 입력이 없어 전체 계획·auto 레이아웃·계약 대조 켬으로 돈다. `contracts` 는 'false' 만 끄고 그 밖의 값은 오타가 대조를 조용히 끄지 않게 실패다. ③ 계약 재생성 단계(화면 목록·슬롯·권한·경계·소비 census `--check`)를 켜는 근거는 권한 투영(DEC-OPS-287)과 계약 사슬 투영(DEC-OPS-286)이 이 생성물들을 구성으로 다시 만든다는 것이다. ④ 첫 실행의 원인·수리는 GAP-BASE-002 가 적는다. | 첫 실행(run 38275695802)의 붉은 25잡은 모두 생성·T1 통과 뒤 일반 테스트였고 인프라 신호가 없었다. ADR-0027 본문은 accepted 라 고치지 않는다. red 증명 5종(예약 0·2개, 분 0, 기본값 false, 러너 해석). | [워크플로](../../.github/workflows/reusable-nightly.yml), [러너](../../scripts/reusable-nightly.mjs), [GAP-BASE-002](../../.agent/memory/known-gaps.md) | 2026-10-13 | - |

## DEC-OPS-299

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-299 | accepted | **Phase 2(모듈 선택 고도화)의 종료 조건을 기능 22개 기준으로 다시 정하고 실측으로 닫는다(U11).** ① 종료 KPI 는 단독 선택 평균 포함 수 ≤1.46·혼자 풀리는 기능 15·서로 다른 단독 폐포 21·프런트 마커 블록 ≤14·소유 선언 위치 1(`config/modules`)·v1 소유 상수 0 이다. 설계서의 1.26 은 기능 19개 시점 목표이고 1.26 급은 도움말·커뮤니티가 게시판 없이 서야 가능해, 커뮤니티가 게시판을 요구한다는 결정(DEC-OPS-280)과 어긋난다. ② 2026-10-13 측정: 1.455(32/22)·15·21·11블록/2파일·1·0. 시작 구성 5개와 단독 선택 22개의 정밀 점검 차단은 0 이다. ③ 남은 일은 Phase 3 범위다 — 슬롯 연동 기계 대조와 저하 생성물 문구(GAP-COMPOSE-001), 수리 뒤 T2 녹색 확인(GAP-BASE-002), 허브 탭 레지스트리 분리(GAP-SLOT-001), 재현성(GAP-REPRO-001), 업그레이드 키트. | 기능을 22개로 나눈 뒤(DEC-OPS-273) 옛 목표는 도달할 수 없는 기준이 됐고, 사용자가 권고안(U11)으로 다시 정하기로 했다(2026-10-12). | [설계 문서 §9](../02-architecture/project-composer-design.md#9-검증과-실패-처리), [기능 선언](../../config/modules), [ADR-0028](../02-architecture/decisions/ADR-0028-presets-are-named-domain-lists.md) | 2026-10-13 | 설계서 16.2 의 KPI 목표값(저장소 밖 문서라 이 행이 대체를 기록한다) |

## DEC-OPS-300

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-300 | accepted | **워크플로우 예시 화면(정적 목업)은 시연 기능이 소유하고, 라우트 원장의 확인된 소유는 투영과 대조한다(Phase 2 마무리 검토).** ① `/admin/workflow`·`/admin/sanctn/workflow`·공동 `WorkflowHubClient`(템플릿과 함께)와 진입 권한 도메인 WORKFLOW 를 약식 결재에서 시연 기능으로 옮긴다. 인증 시작 구성 '공통 기반 + 결재' 는 그 화면과 WORKFLOW_READ 를 싣지 않고 demo 는 그대로다. 권한 코드·기본 그룹·진입 판정은 같다(H3). ② 프런트 전용 기능은 테이블 없이 화면 진입 권한만 가질 수 있고, 서버 인가 원장이 그 권한을 부르지 않는지 운영 계약이 본다. ③ 라우트 원장은 확인된 `profileOwners` 가 원본 투영의 `directProjectionProfiles` 를 모두 덮는지 본다(생성물은 보지 않는다). | C9 이 결재를 인증 시작 구성으로 두자 처분이 demo-isolated 인 목업이 결재 생성물에 실렸는데, 원장은 손으로 'demo' 만 적어 누수 가드가 보지 못했다. 목업은 결재 업무가 아니라 시연이다. DEC-OPS-293 ② 의 '시연 화면 소유 demo' 는 이 이동으로 사실이 된다. 결재 구성 정밀 점검은 프런트 제거 423→427·차단 0 이다. red 증명 3종. | [시연 기능](../../config/modules/showcase.json), [라우트 원장 계약](../../scripts/ui-route-capabilities-contract.mjs), [카탈로그 계약](../../scripts/project-composer-catalog.test.mjs) | 2026-10-13 | DEC-OPS-273 의 '프런트 전용 기능은 권한 도메인을 갖지 않는다', 11단계 C5 의 워크플로우 예시 화면 결재 소유 |

## DEC-OPS-301

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-301 | accepted | **T2 계획은 시작 구성과 기능 목록이 같은 단독 폐포를 돌지 않는다(Phase 2 마무리 검토).** ① 전체 계획은 같은 목록의 시작 구성이 두 레이아웃으로 덮는 단독 폐포를 뺀다 — 지금 설문·결재 둘이다. 이름으로 고른 직접 선택은 그대로 돈다. 계획은 5×2+19=29잡이다. ② CI 가이드의 생성기 화면 변경 서술을 실제대로 고친다 — E2E 축은 생성기 화면 시험이 켜고, 켜지면 Playwright 전체 샤드가 돈다. ③ ADR-0027 결정 4 의 '지금 6 + 20 = 26잡' 은 결정 당시 수라 본문 편집을 되돌린다. 그 뒤 수(DEC-OPS-280 의 커뮤니티 폐포로 27잡, 13b 로 31잡, ①로 29잡)는 이 행과 CI 가이드가 적는다. | 같은 목록은 같은 결과라(ADR-0028·동치 계약) 두 잡(첫 실행 10.8·16.3분)은 밤마다 같은 결과를 다시 냈다. 승인 예산 26잡보다는 여전히 셋 많다. accepted ADR 본문은 고치지 않는다(ADR 색인 규칙). red 증명: 건너뛰기를 걷으면 계획 시험 2건이 붉다. | [러너](../../scripts/reusable-nightly.mjs), [계획 시험](../../scripts/reusable-nightly.test.mjs), [CI 가이드](../03-guides/cicd-pipeline.md) | 2026-10-13 | ADR-0027 결정 4·DEC-OPS-283 ① 의 '서로 다른 단독 폐포' 가운데 시작 구성과 같은 목록, DEC-OPS-295 의 '31잡', DEC-OPS-297 의 '생성기 화면만 바꾸면 재사용·E2E 만 돈다' |

## DEC-OPS-302

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-302 | accepted | **결재 기안 화면(`/approvals/draft`)과 결재 허브(`/approvals`)의 원장·처분을 실제 동작에 맞춘다.** ① 기안 화면의 목업 판정 둘(`draft.form-catalog` demo·`draft.submit` unavailable)을 `draft.compose`(partial·후보 live·`approvals-api`·E3)로 바꾼다. 결재 허브는 지표 판정(`approvals.visualization-metrics` demo)을 걷고 서버 검색 미지원 판정을 search·filter 로 옮긴다. ② 두 화면의 소유를 결재 기능 선언에서 `approval`·`demo` 로 적어 DEC-OPS-300 의 투영 대조와 시연 누수 가드에 넣는다. ③ 기안 화면의 demo-isolated 승인을 거두고 `consolidate-to-canonical`(정본 `/approvals`, proposed)로 제안한다. 리다이렉트는 하지 않는다. ④ 탭 제목을 '새 결재 기안' 으로 고친다. ⑤ 처분 계약은 demo-isolated 화면을 시연 밖 시작 구성이 싣지 않는지 본다. | 2026-09-16 기안 화면이 결재함과 같은 기안 창을 열게 됐는데 원장·처분은 목업 판정을 그대로 들었고, 승인 근거의 줄 번호·e2e 파일은 이미 없다. 결재 허브에는 지표 화면이 없고 DEC-OPS-165 가 서버 검색을 넣었다. 인증 시작 구성 '공통 기반 + 결재' 가 두 화면을 실어 시연 기능을 싣는다고 말했지만, 소유가 미검증이라 누수 가드가 보지 못했다. red 증명 14종. | [라우트 원장 계약](../../scripts/ui-route-capabilities-contract.mjs), [처분 계약](../../scripts/ui-navigation-disposition-contract.mjs), [기안 화면](../../frontend/src/app/approvals/draft/ApprovalDraftHubClient.tsx) | 2026-10-13 | DEC-OPS-030 ④ 뒤 문장의 '/approvals/draft 목업(demo-isolated approved)은 그대로 둔다' 부분, 그 화면의 2026-08-23 웨이브 1 처분 승인 |

## DEC-OPS-303

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-303 | accepted | **결재 통합 시험에서 알림 행을 보는 시험 하나를 떼어 '공통 기반 + 결재' 생성물에서도 나머지 13건이 돌게 한다(GAP-BASE-003).** ① 지워진 참조자 계정 시험을 `ApprovalReferenceNotificationIntegrationTest` 로 옮기고 결재 기능 파일의 게이트로 적는다(`alsoRequires: notification`). ② 남은 `ApprovalWorkflowIntegrationTest` 는 알림 타입을 참조하지 않는다. 알림이 있는 구성에서는 이름에 TestConfig 가 든 중첩 설정이 알림 요청 리스너의 bean 정의를 클래스 이름 문자열로 걷고, 시험마다 리스너 클래스와 알림 테이블이 함께 있거나 없는지와 bean 부재를 확인한다. 이 게이트의 `alsoRequires` 는 걷는다. ③ 제거 게이트 기대치는 생성기 계획으로 재서 approval 12건(교체)·core 14·collaboration 11·survey 12건이다. 연쇄 목록은 그대로이고 구성 해시는 바뀐다. | 목(@MockitoBean)은 타입 참조라 생성기가 알림과 함께 클래스 전체를 지웠는데, 알림 행을 보는 검사는 하나뿐이었다. red 증명 8종 — 알림 import 나 옮긴 시험의 단순 이름 한 줄이면 approval 에서 클래스가 다시 지워지고, 리스너 bean 이 남거나 이름이 어긋나면 13건이 가드에서 실패한다. | [결재 통합 시험](../../api-server/src/test/java/nuri/api/schema/ApprovalWorkflowIntegrationTest.java), [게이트 선언](../../config/modules/informalsanction.json), [시작 구성](../../config/modules/presets.json) | 2026-10-13 | DEC-OPS-295 ④의 '결재 통합 시험이 통째로 빠진다' |

## DEC-OPS-304

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-304 | accepted | **2026-10-13 Dependabot 배치를 한 PR 로 적용한다.** ① #887(액션 6건 — setup-node 7.1.0·codeql-action 4.38.3·upload-artifact 7.0.2·download-artifact 8.0.2)·#874(프런트 10건, next 16.4.0·radix-ui 1.7.0)·#853(pg 8.23.1)·#854(api-server 빌더 이미지 gradle 9.8.0-jdk21)를 가져온다. ② 새 SHA 는 각 릴리스 태그가 가리키는 서명된 커밋이다. required-check manifest 의 CodeQL 핀과 재사용 제품 CI 템플릿의 setup-node·upload-artifact 핀을 같은 SHA 로 옮긴다. 템플릿의 액션 핀이 원본 ci.yml 의 핀과 같은지는 기존 진입점 계약이 본다. CodeQL 번들은 `tools:` 로 2.26.4 에 고정돼 있다. ③ #854 의 이미지 gradle 은 실행되지 않는다 — Dockerfile 은 `./gradlew`(wrapper 9.7.1)로 `classes`·`bootJar` 만 돌린다. 바뀌는 것은 빌드 JDK(21.0.12+8 → 21.0.12.1+1)이고 wrapper 9.8.0 차단(DEC-OPS-237)은 그대로다. | Dependabot 은 계약이 만드는 템플릿 문자열을 고치지 않아, 템플릿 핀은 사람이 기억해 맞출 때만 원본과 같았다. 린트 경고는 같은 20건이고, JS gzip 합계는 main CI 의 1,968,504B 에서 이 배치 로컬 빌드 1,874,835B 로 줄었다. | [CI 가이드](../03-guides/cicd-pipeline.md), [required 계약](../../scripts/required-checks-contract.mjs), [진입점 계약](../../scripts/reusable-artifact-entrypoints-contract.test.mjs) | 2026-10-13 | - |

## DEC-OPS-305

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-305 | accepted | **레거시 표준화 이관 설계를 ADR-0029 로 채택하고 결정 대기 Q1~Q10 을 닫는다.** ① 사용자: 민감 컬럼은 도구가 호환 암호화를 직접 구현하고(런타임 foundation 미의존, eGov 암호 라이브러리 직접 사용도 범위 안) 시험 범위 계약이 온라인 변환기로 복호화해 증명한다. 키는 실행 때 주입하고 산출물·로그에 남기지 않으며, 주민번호 이관의 법적 근거와 키 일치는 기관 이관 통제 mapping-schema-driver 가 본다(Q1). 원장은 Git 검토 YAML/JSON(Q2), 외부 LLM 후보는 기본 꺼짐·기관 승인 기록·이름과 코멘트만·전송 전 검사(Q3, L2), 의미 불명 데이터는 외부 덤프로 대상 스키마 무변경(Q4). L3 1:N 을 위한 도구 제어 테이블(keymap·checkpoint 매핑 식별자) 변경 승인(Q5). meta_standard_* 동의어·허용값·폐기 컬럼은 L2 Flyway, OCI 적용은 별도 승인(Q8). JPA 전용 시퀀스는 OWNED BY 없이 매핑 선언(preserve·remap)·도구 차단(Q9). 비 PostgreSQL 소스 외부 드라이버의 별도 프로세스 실행은 기관 환경·라이선스 뒤 L3, 그때까지 COMMIT 차단(Q10). ② 위임: 분할·조인은 MappingSpec 확장(Q5), 기본 fail-closed 에 원장 승인 예외 행만 격리하며 원장(L2) 전에는 예외 경로가 없다(Q6), app-scan 1차는 Spring·MyBatis/iBATIS XML·JSP(Q7), 표준 스키마 메타 불일치는 GAP-STD-001. ③ 순서는 L1 → L2 → L3 → L4. | 의미 식별·용어 확정이 도구 밖 손 작업이었고 raw JDBC 적재가 주민번호 암호화를 지나지 않았다. 사용자 결정 2026-10-13(17:50 포함), 나머지 위임(2026-08-23). | [ADR-0029](../02-architecture/decisions/ADR-0029-legacy-standardization-migration.md), [이관 도구 설계](../02-architecture/legacy-migration-tool-design.md) | 2026-10-13 | - |

## DEC-OPS-306

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-306 | accepted | **이관 도구의 표준 ID 를 온라인 형식과 맞추고, 원본 키를 쓴 시퀀스를 적재 계약 안에서 맞춘다(레거시 표준화 L1 D5).** ① `StandardIdGenerator` 가 `IdGenerationUtil` 과 같은 `접두사 + 대문자 hex`(1..32자, 같은 인자 검증)를 만든다. 접두사만 주는 mapping 은 총 20자다(온라인 `GROUP_` 16자만 다르다). 시험이 foundation 원본을 직접 컴파일해 두 구현을 대조한다 — Gradle 의존은 생성 제품의 이관 모듈 독립 검사와 이관 단독 제품을 깨서 쓰지 않는다. ② 원본 키를 identity·serial·`nextval` 기본값 컬럼에 쓰면 적재 뒤 `setval` 로 최댓값 뒤로 옮긴다. pooled 묶음까지 키 뒤로, 앞으로만 옮기고 실행 JSON `sequenceResets` 에 이름과 결과만 남긴다. 온라인 쓰기를 막은 cutover 창이 전제다. ③ 시퀀스를 정할 수 없거나 시퀀스 권한이 없으면 COMMIT 이 행을 쓰기 전에 멈춘다. `preserve`·`remap` 정수 키가 카탈로그로 연결되지 않으면 `identity.targetSequences` 에 시퀀스나 `none` 을 선언한다. | 주석은 "동일한 형태"라 했지만 이관 ID 는 소문자였다. `preserve` 뒤 시퀀스가 1 에 머물러 온라인 앱의 첫 INSERT 가 충돌했다. `@SequenceGenerator` 전용 시퀀스(`sq_answer_no`·`sq_dgstfn_sn`)는 카탈로그에 연결이 없어 선언으로만 안다. 사용자 위임(2026-10-13). red 증명: 대문자·재설정·판정 실패를 되돌리면 새 시험만 붉다. | [생성기](../../migration-tool/src/main/java/nuri/migration/keymap/StandardIdGenerator.java), [시퀀스 재설정](../../migration-tool/src/main/java/nuri/migration/etl/TargetSequenceSynchronizer.java), [설계](../02-architecture/legacy-migration-tool-design.md#적재-transaction과-재시작-의미) | 2026-10-13 | - |

## DEC-OPS-307

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-307 | accepted | **이관 도구가 live 대상 계약과 표준 사전으로 매핑을 검증한다(ADR-0029 L1, D1).** ① plan·load 가 매핑 표의 information_schema 컬럼 계약을 JDBC metadata 와 대조해 읽고, 같은 schema 에 meta_standard_terms·domains 가 있으면 컬럼 영문약어의 도메인도 읽는다. 둘 다 target schema digest(fingerprint v3)에 결속해 plan 뒤의 변경은 load 가 막는다. ② 값 종류와 선언 길이·정밀도·소수 자릿수가 물리 컬럼과 도메인 중 좁은 한계에 맞아야 하고(보호 컬럼은 암호문 길이, 생성 ID·fkRef 는 생성 길이, hex 10자 미만 접두사는 거부), 기본값 없는 NOT NULL 컬럼은 매핑·const 가 채워야 한다. ③ 계약·사전을 읽지 못하거나 사전이 하나만 있거나 용어·도메인이 모호하면 실패하며, 코드젠 스냅샷으로 대신하지 않는다. 사전이 없으면 도메인 대조만 생략한다. ④ 메시지는 표·컬럼 이름과 타입·길이만 싣는다. | 종전 검증은 타깃 컬럼이 있는지만 봐서, 넓은 물리 컬럼에 표준보다 긴 값을 넣거나 소수를 반올림하는 적재가 조용히 통과했다. 2026-10-13 OCI 읽기에서 도메인이 있는 720컬럼 중 26개가 물리 타입이 달랐다. 일련번호 NUMERIC→bigint·integer 20개는 같은 종류로 허용하고, 다른 종류 6개는 매핑하면 실패한다. 줄이는 변환은 내장이 아닌 변환기로 선언한다. 사용자 위임(2026-10-13). | [검증기](../../migration-tool/src/main/java/nuri/migration/validate/TargetStandardValidator.java), [계약 읽기](../../migration-tool/src/main/java/nuri/migration/postgres/PostgresTargetStandardReader.java), [이관 도구 설계](../02-architecture/legacy-migration-tool-design.md#표준-계약-검증) | 2026-10-13 | - |

## DEC-OPS-308

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-308 | accepted | **온라인 앱이 암호화하는 컬럼은 이관 도구가 같은 암호문으로 쓰고, 평문·키 부재는 쓰기 전에 막는다(레거시 표준화 L1 A1).** ① 보호 목록(`tb_user_info.user_enrrno` ARIA, `tb_auth_otp_cert.otp_secret_encpt_cn` 이관 불가)과 mapping 의 `encrypt` 가 다르면 검증·적재 시작에서 멈춘다. ② 도구가 eGov ARIA 호환 암호(독자 ARIA-256·키 32자 절단·X.923 변형 채움·ECB·Base64)를 직접 만든다. 실행 의존은 그대로다(DEC-OPS-005). 키는 `MIGRATION_ALGORITHM_KEY` 로만 받고, 없으면 dry-run 도 시작하지 않는다. ③ 문자열만 암호화하고 암호화할 소스는 키로 못 쓴다(GAP-MIG-002). 값마다 되읽기·평문 형태·암호문 형식을 확인하고, 어긋나면 그 chunk 를 쓰지 않고 멈추며(DEC-OPS-309) 테이블·컬럼·행 위치와 고정 사유만 남긴다. ④ 계약 시험이 온라인 변환기·CryptoUtil·암호 설정 원본을 컴파일해 두 암호문이 같고 서로 되읽는지, 목록이 `@Convert` 와 같은지 본다. 시험 의존은 외부 라이브러리(eGov 암호·JPA API·Lombok)뿐이다. PIT `migration-protect` 를 더했다(15개). | 이관 도구에 암호 경로가 없어 주민번호가 평문으로 적재될 수 있었고, 온라인 변환기는 평문을 경고만 하고 읽는다. 사용자 결정 Q1(2026-10-13). 허용된 시험용 프로젝트 의존은 생성 제품 검사·이관 단독 제품을 깨서 쓰지 않았다. red 증명: 평문 차단·키 검사·선언 대조·암호를 되돌리면 새 시험만 붉다. | [보호 목록](../../migration-tool/src/main/java/nuri/migration/protect/ProtectedTargetColumns.java), [호환 계약](../../migration-tool/src/test/java/nuri/migration/protect/OnlineRrnoConverterContractTest.java), [설계](../02-architecture/legacy-migration-tool-design.md#mappingyml-계약) | 2026-10-13 | - |

## DEC-OPS-309

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-309 | accepted | **이관 행 변환 실패를 chunk 단위 fail-closed 로 바꾸고 codemap·date 의미를 엄격히 한다(레거시 표준화 L1 PR-D, Q6 위임 중 행 변환 실패).** ① transform·codemap·type·fkRef·identity·보호 컬럼 중 하나라도 실패한 행이 있으면 그 chunk 는 쓰지 않고 새 keymap 도 버린 뒤 테이블과 run 을 멈춘다. 오류·보고·gate 는 테이블·컬럼·행 순번만 밝히고 재개는 마지막 커밋 checkpoint 다음부터다. 쓰기 단계 오류(SQL 오류 전부·재변환·TARGET_GENERATED 쓰기)는 여전히 행 단위로 격리되고 나머지가 커밋된다(GAP-ETL-001). ② 적용 순서는 transform → codemap → type 이다. codemap 은 `values`·`unmapped`(기본 fail)·`fallback`·`nullAs` 형식이고, NULL 은 `nullAs: fallback` 일 때만 대체값을 받는다(옛 `default` 는 NULL 도 바꿨다). 옛 평면 형식은 이 두 변화를 밝혀 거부하고, 따옴표 없는 표준 코드도 거부한다. 숫자 원천값은 정규화해 찾는다. ③ `type: date` 는 자정이 아닌 시각을 거부하고, 버리려면 `transform: date-truncate` 로 밝힌다. | 종전에는 실패 행만 건너뛰고 나머지를 커밋했고, 미매핑 코드가 통과했으며 `default` 키가 레거시 코드와 겹쳤다. 승인 예외 행 격리(L2 원장)가 없어 모든 행 변환 실패가 fail-closed 다. 구현 digest 가 바뀌어 기존 plan 은 다시 승인한다. 사용자 위임(2026-10-13). | [EtlExecutor](../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java), [CodeTranslator](../../migration-tool/src/main/java/nuri/migration/transform/CodeTranslator.java), [설계](../02-architecture/legacy-migration-tool-design.md) | 2026-10-13 | - |

## DEC-OPS-310

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-310 | accepted | **이관 쓰기 단계 실패도 chunk 단위 fail-closed 로 바꾼다(GAP-ETL-001 종료, 2026-10-14 사용자 승인).** ① batch 가 실패하면 같은 chunk 를 한 transaction 안에서 행마다 다시 쓰고, 모두 성공하면 한 번에 커밋한다. 한 행이라도 SQL 오류(`ATOMIC_WRITE_FAILED`)나 재변환 실패(`ROW_RETRY_TRANSFORM_FAILED`)가 나면 chunk 전체를 롤백하고 테이블과 run 을 멈춘다. ② `target_generated` 도 chunk 를 한 transaction 으로 커밋한다(`TARGET_GENERATED_WRITE_FAILED`). ③ 오류는 처음 실패한 행의 순번과 SQLSTATE 만 싣는다. ④ 승인된 예외 행 격리는 여전히 L3 다. | 쓰기 오류가 행 단위로 격리돼 같은 chunk 의 다른 행과 뒤 chunk·테이블이 승인 없이 커밋됐다(P1). 원장 없이 fail-closed 로 만드는 방식은 DEC-OPS-309 와 같다. PR #894 가 재변환 실패를 run 정지로 바꿨지만 DEC 가 없었고, 행마다 커밋해 실패 행 앞의 행이 남았다 — 이 행이 함께 기록·정정한다. 행마다 다시 쓰는 경로는 드라이버가 batch 결과를 증명하지 못할 때를 위해 남긴다. | [EtlExecutor](../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java), [설계](../02-architecture/legacy-migration-tool-design.md#적재-transaction과-재시작-의미), [복구 런북](../04-operations/migration-recovery-runbook.md) | 2026-10-14 | ADR-0029 결정 8의 '쓰기 단계 fail-closed 는 L3 의 예외 행 격리와 함께 한다' 부분 |

## DEC-OPS-311

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-311 | accepted | **수집 명령 `profile`·`app-scan` 을 둔다(ADR-0029 L2a).** ① `profile` 은 inventory 와 같은 소스·드라이버·scope 이고 discover 뒤 소스가 바뀌지 않았을 때만(live 재조사 digest) inventory 테이블을 한 읽기 전용 트랜잭션으로 훑어 컬럼 집계·값 모양 수·연도 범위와 코멘트(inventory 해시와 대조)를 싣는다. 값 빈도는 개인정보 모양이 없고 서로 다른 값 20개 이하인 대문자·숫자 코드 중 5번 이상 나온 값만이다. ② `app-scan` 은 소스 디렉터리만 읽어 매퍼·Java·JSP·SQL 의 컬럼 사용처를 모은다. 설정 파일은 읽지 않고 동적 SQL·압축본·소스 없는 빌드 산출물은 PARTIAL 이며 사용처 없음을 판정하지 않는다. ③ 두 산출물은 자격 검사와 개인정보 값 검사를 모두 지나야 쓴다. ④ 이관 PIT 범위 `migration-collect` 를 더한다(6개). | 표준화 근거(코멘트·데이터·사용처)를 도구가 모아야 L2b 의 후보 생성이 가능하다. 따옴표가 필요한 식별자는 읽지 않고 SKIPPED 로 남기며(적재기와 같은 제한), 드라이버가 REMARKS 를 주지 않으면 코멘트는 INVENTORY_ONLY 다. 구현 digest 가 바뀌어 기존 plan 은 다시 승인한다. red 증명: 개인정보 검사·digest 대조를 끄면 해당 시험만 붉다. | [수집 명령](../02-architecture/legacy-migration-tool-design.md#수집-명령adr-0029-l2a), [SourceProfiler](../../migration-tool/src/main/java/nuri/migration/profile/SourceProfiler.java), [AppSourceScanner](../../migration-tool/src/main/java/nuri/migration/appscan/AppSourceScanner.java) | 2026-10-14 | - |

## DEC-OPS-312

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-312 | accepted | **용어 매핑 원장과 표준 메타 확장을 둔다(ADR-0029 L2b-1).** ① V2_128 이 `meta_standard_terms` 에 동의어·허용값·폐기 여부를 더하고 공통표준 CSV(2025-11) 값으로 5,683행을 채운다. 값이 둘로 갈리는 약어 3개는 비운다. 공유 OCI 적용은 별도 승인이다. ② mapping.yml 이 `ledger: {path, sha256}` 로 원장을 선언하면 원장 바이트 digest 가 mapping digest 에 들어가 plan·load 가 같은 원장을 요구한다. 원장이 없는 mapping 의 digest 는 그대로다. ③ plan·load 는 원장 형식, 전이 이력(확정·제외·보관은 사람만), 상태별 필수 항목(확정은 적합률 100 또는 승인 예외, 대상 컬럼 = 표준 영문약어), mapping 이 옮기는 모든 컬럼의 확정 행, 확정 용어의 live 메타 일치·폐기 여부를 본다. ④ 원장 필수화는 원장에서 mapping 을 만드는 L3 에서 한다. | ADR-0029 결정 3 은 모든 매핑이 확정 행을 참조하라고 하지만, 원장에서 mapping 을 만드는 경로 없이 지금 필수로 하면 기존 승인 계보가 모두 원장을 손으로 써야 한다. 그래서 선언한 원장은 빠짐없이 집행하고 필수화는 L3 로 미룬다. 폐기 여부 컬럼이 없는 DB 에서는 원장 대조를 멈춘다(fail-closed). | [원장](../02-architecture/legacy-migration-tool-design.md#용어-매핑-원장adr-0029-l2b-1), [TermLedgerValidator](../../migration-tool/src/main/java/nuri/migration/validate/ledger/TermLedgerValidator.java), [V2_128](../../api-server/src/main/resources/db/migration/V2_128__extend_meta_standard_terms.sql) | 2026-10-14 | ADR-0029 결정 3 의 "아니면 validate 가 실패한다" 의 시행 시점(L3 전에는 원장을 선언한 mapping 에만) |

## DEC-OPS-313

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-313 | accepted | **규칙 기반 용어 후보 `term-suggest` 를 둔다(ADR-0029 L2b-2).** ① profile·app-scan 산출물과 대상 DB 표준 사전(V2_128 확장, 없으면 멈춤)으로 컬럼마다 후보를 최대 5개 낸다. 이름=영문약어·코멘트=용어명은 EXACT, 코멘트=동의어는 SYNONYM, 표준 단어 조합·화면 라벨은 INFERRED, 근거 없음은 UNKNOWN 이고 폐기 용어는 내지 않는다. ② 근거끼리 다른 용어를 가리키거나 데이터 모양(값 95% 이상)이 도메인과 맞지 않으면 충돌로 남기고 INFERRED 로 낮춘다. ③ 후보마다 프로파일 집계로 적합률(분모는 공백 포함)·위반·필요한 변환(mapping 어휘 또는 `custom:*`)을 추정하고, 셀 수 없는 위반(길이·자릿수 초과, 확인 못 한 허용값, LOB 값, 일부만 읽은 표)이 있으면 적합률을 비운다. 프로파일은 판 2 만 받는다. ④ `--ledger-draft` 는 컬럼마다 PROPOSED(대상 비움) 행을 mapping 소스 표기(`schema.table`, catalog 제외)로 쓰고, 두 산출물을 모두 검사한 뒤에 쓴다. ⑤ 외부 LLM 경로는 두지 않는다 — 전송 경로가 없어 기본 꺼짐이 구조로 성립하고, 승인 기록·전송 전 검사는 경로를 둘 때 함께 만든다. | 확정할 근거를 도구가 모아 손 작업을 줄이되(결정 1·2) 행 값 없이 집계만 쓰고 확정은 원장 검토가 한다. 쓸 곳 없는 가드를 먼저 두면 검증할 수 없는 코드가 된다. | [설계](../02-architecture/legacy-migration-tool-design.md#용어-후보adr-0029-l2b-2), [TermSuggester](../../migration-tool/src/main/java/nuri/migration/suggest/TermSuggester.java), [ConformanceEstimator](../../migration-tool/src/main/java/nuri/migration/suggest/ConformanceEstimator.java) | 2026-10-14 | DEC-OPS-305 ① 의 Q3 가드 시행 시점(L2 → LLM 경로를 두는 단계) |

## DEC-OPS-314

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-314 | accepted | **V2_128 을 공유 OCI DB 에 적용한다(2026-10-14 사용자 사전 승인 — L3 착수 때 승인 필요 항목을 한꺼번에 승인, PR #897 병합 뒤).** 병합본(ddbc8add9)에서 꺼낸 마이그레이션 폴더로 사전 읽기(스키마 2.127, 확장 컬럼 없음) → info(대기 2.128 하나, 반복 시드 변화 없음) → pg_dump 백업(목차에 `meta_standard_terms` 구조·데이터 확인) → Flyway 12.4.0 migrate → validate(151개) 순서로 했다. 읽기 확인: 확장 컬럼 3개(`synonyms`·`allowed_values` text NULL 허용, `deprecated_yn` varchar NOT NULL DEFAULT 'N'), 용어 13,231행 가운데 채운 행 5,683(동의어 759·허용값 5,033·폐기 5), `deprecated_yn` NULL 0. | DEC-OPS-312 가 공유 OCI 적용을 별도 승인으로 남겼다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 지운 행은 없고 원본은 적용 직전 백업이다. | [V2_128](../../api-server/src/main/resources/db/migration/V2_128__extend_meta_standard_terms.sql), [DEC-OPS-312](../../.agent/memory/decisions.md) | 2026-10-14 | - |

## DEC-OPS-315

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-315 | accepted | **표준 도메인 변환기와 규칙 정제 `nullify` 를 둔다(ADR-0029 L3a-1).** ① 내장 ymd8·ymd8-truncate·ymdhms14·hms6·yn·date-text·timestamp-text·timestamp-from-date 와 date-truncate v2 는 값 대신 위반 코드로 거부하고, `nullify` 는 BLANK·PLACEHOLDER_DATE 만 maxRows 안에서 NULL 로 바꾸며 건수를 실행 JSON `nullified` 에 남긴다. ② 비문자 `type` 의 공백은 BLANK, 제어 문자뿐이면 FORMAT 이다. ③ 날짜 값은 timestamp 컬럼에 쓰지 않는다(timestamp-from-date). ④ 시간대 있는 소스(timestamptz·timetz, MySQL·MariaDB TIMESTAMP)는 변환하지도 시간대 없는 컬럼에 그대로 옮기지도 않는다. 내장 탈출 경로는 없고 시간대 있는 컬럼이나 버전·digest 를 밝힌 프로젝트 변환기로만 옮긴다. ⑤ 격리 어휘 대응표를 설계서에 둔다(L3b 가 쓴다). ⑥ L3 은 PR 6개다(ADR 의 1~2개와 다르다). | 추정기가 센 위반은 실행도 같은 코드로 멈춰 승인 없는 정제를 막는다. 막은 통과 경로 셋은 값이 실행 환경 시간대나 checksum 대조로 조용히 달라지는 조합이다. 사용자 위임(2026-08-23)과 L3 진행 지시(2026-10-14). | [설계서](../02-architecture/legacy-migration-tool-design.md#표준-도메인-변환기와-nullify), [DomainValues](../../migration-tool/src/main/java/nuri/migration/domain/DomainValues.java), [TargetStandardValidator](../../migration-tool/src/main/java/nuri/migration/validate/TargetStandardValidator.java) | 2026-10-15 | DEC-OPS-307 의 DATE→TIMESTAMP 허용과 timestamptz→timestamp·timetz→time 그대로 옮기기 허용 |

## DEC-OPS-316

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-316 | accepted | **용어 매핑 원장을 형식 2로 올리고 원장에서 mapping 을 만든다(ADR-0029 L3a-2).** ① 확정 행은 mapping 컬럼이 쓸 `load`(내장 변환기·type·codemap·nullify)를 함께 정하고, 형식 1 은 거부한다. ② 적합률은 참고값이다. 확정하려면 기록된 위반마다 실행 시점 처리(nullify·승인 예외·codemap)가, 셀 수 없었던 위반(`unmeasured`)마다 행 단위 판정과 사유가 있어야 하며 SAMPLED 로는 확정하지 않는다. 승인 예외는 1~1000행·사유·격리할 수 있는 코드만이고 격리 실행은 L3b 다. ③ 추정기 힌트는 mapping 어휘(`transform:<내장>`·`type:<type>`·`codemap`·`mixed`)이고, 초안은 셀 수 없어도 힌트·위반·이유를 남긴다. ④ `mapping-generate` 가 skeleton·원장·inventory 로 mapping 을 만들고 접속 자리표시는 글자 그대로 둔다. 기본이 아닌 mapping·via·ARCHIVE 는 L3c·L3d·L3e 전까지 거부한다. | 원장 검토가 실제 적재를 정하게 한다. 표·컬럼 해석은 플래너·생성기·coverage 가 InventoryTables 하나를 쓴다. 사용자 위임(2026-08-23)과 L3 진행 지시(2026-10-14). | [설계서](../02-architecture/legacy-migration-tool-design.md#원장에서-mapping-만들기), [원장 검증](../../migration-tool/src/main/java/nuri/migration/validate/ledger/TermLedgerValidator.java), [생성기](../../migration-tool/src/main/java/nuri/migration/generate/MappingGenerator.java) | 2026-10-15 | DEC-OPS-313 의 `custom:*` 힌트 어휘, DEC-OPS-312 ③ 의 "확정은 적합률 100 또는 승인 예외", ADR-0029 결정 3 의 같은 확정 조건(적합률은 참고값, unmeasured 와 사유로 확정) |

## DEC-OPS-317

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-317 | accepted | **plan·load 는 원장을 선언한 mapping 만 받는다(ADR-0029 L3a-2).** ① 원장이 없거나 원장 경로가 mapping 디렉터리 밖이면 게이트로 멈춘다. coverage 는 inventory 기준 정방향·역방향·소스 단위 완전성과 mapping 변환이 원장 load 와 정확히 같은지를, codemap 은 실재와 live 허용값을 본다. ② U1(사용자 사전 승인 2026-10-14): 표준 용어가 없는 대상 컬럼은 `nonStandardTarget: {reason}` 으로 확정한다. live 메타에 그 컬럼의 용어가 없다는 증명이 있어야 하고, 도메인·적합성 대조는 없으며 물리 타입 검사는 그대로다. ③ U3(같은 승인): 허용값을 확인하지 못한 CODE·YN 컬럼은 사유가 있으면 codemap 없이 확정한다. 허용값 대사는 L4 가 맡고, 허용값을 읽을 수 있으면 codemap 출력은 그 안이어야 한다. ④ 날짜·시각이 아닌 소스는 type·내장 date·timestamp 로 날짜·시각 컬럼에 옮기지 않는다. ⑤ 원장 load 는 내장 변환기만 받으므로 프로젝트 변환기는 workflow 에서 쓰지 못한다. | 원장이 선택이면 검토하지 않은 적재가 남는다(DEC-OPS-312 가 L3 로 미룬 일). | [설계서](../02-architecture/legacy-migration-tool-design.md#원장에서-mapping-만들기), [runner](../../migration-tool/src/main/java/nuri/migration/MigrationWorkflowRunner.java), [복구 런북](../04-operations/migration-recovery-runbook.md) | 2026-10-15 | DEC-OPS-312 의 원장 없는 mapping 의 plan·load(필수화 유보)와 ③ 의 "대상 컬럼 = 표준 영문약어" 가운데 비표준 대상, ADR-0029 결정 3 의 비표준 대상 부분과 U3 의 허용값 미확인 확정, DEC-OPS-315 ④ 의 프로젝트 변환기 경로, DEC-OPS-307 의 "줄이는 변환은 내장이 아닌 변환기로 선언" |

## DEC-OPS-318

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-318 | accepted | **원장이 승인한 위반으로만 실패한 행을 격리하고 값 한계 가드를 둔다(ADR-0029 L3b).** ① mapping-generate 가 승인 예외 가운데 nullify 로 NULL 이 되지 않는 위반을 컬럼 `isolate`(원장 행·상한 1~1000·위반)로 옮기고, coverage 가 원장과 양방향으로 대조한다. ② isolate 가 있는 표는 순서 키가 필수이고, target_generated·자기참조·다른 매핑의 부모 표와 암호화·fkRef·const 컬럼에는 둘 수 없다. ③ 실행기는 행의 컬럼·채번·복합 FK·identity 실패를 모두 모아 전부 그 컬럼의 승인 위반일 때만 격리한다. 이미 커밋된 행의 새 실패와 원장 행 상한 초과는 멈춘다. ④ isolate 컬럼과 문자 소스→decimal·numeric 컬럼은 쓰기 전에 길이·정밀도·NOT NULL 가드를 받는다. 선언 길이·자릿수의 정적 판정은 isolate 컬럼에도 그대로다(행 가드로 옮길지는 미결). ⑤ 격리 행의 키는 시퀀스 재설정 목표에 넣고(preserve·remap), 그 키를 모르면 멈춘다. ⑥ verify 는 조회 = 변환 + 격리와 원장 행별 상한을 보고, 실행 JSON 형식 2 는 격리 순번만 싣는다(값·키 없음). 쓰기 단계 오류는 계속 격리하지 않는다(DEC-OPS-310 유지). | 원장 승인 예외(DEC-OPS-316)가 기록만 되고 실행되지 않아 위반 행 하나에도 적재가 멈췄다. | [설계서](../02-architecture/legacy-migration-tool-design.md#예외-행-격리), [실행기](../../migration-tool/src/main/java/nuri/migration/etl/EtlExecutor.java), [복구 런북](../04-operations/migration-recovery-runbook.md) | 2026-10-15 | DEC-OPS-309 의 "모든 행 변환 실패는 fail-closed" 가운데 원장 승인 행, DEC-OPS-307 의 문자 소스→decimal·numeric 정적 정밀도 오류(행 가드로 옮김) |

## DEC-OPS-319

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-319 | accepted | **한 소스 표를 여러 대상으로 나누고 checkpoint 를 매핑 단위로 기록한다(ADR-0029 L3c).** ① 표 매핑 `id`(소문자 식별자, mapping 전체 유일)로 나누며 id 를 생략할 수 있는 매핑은 소스마다 하나다. ② keymap 은 소스 단위 그대로이고 소스마다 keymap 을 만드는 매핑(idStrategy·identity)은 하나다 — fkRef·foreignKeys 의 부모(격리 판정 포함)는 그 매핑이다. ③ 제어 스키마 V2 가 checkpoint 에 `mapping_id`(기존 행은 '')를 더하고 PK 를 다시 만든다. 기존 제어 스키마를 올리는 COMMIT 은 `--ack-control-schema-upgrade`(wrapper `ackControlSchemaUpgrade`)가 있어야 시작하고 증거에 전후 버전을 남긴다. ④ 이 run 에 기록된 매핑 id 가 없어지거나 대상이 바뀌면 쓰기 전에 멈춘다. ⑤ 나눈 소스의 매핑에는 isolate 를 두지 않는다. 그 소스의 보관은 소유 매핑(없으면 id 없는 매핑)이 읽고, 그 매핑에 where 가 없거나 모든 매핑의 where 가 같아야 한다. ⑥ 공유 OCI 에 V2 를 적용하는 일은 별도 승인이다. ⑦ L3c·L3d 를 한 PR 로 합쳐 L3 은 PR 5개다. | 원장의 기본이 아닌 mapping 을 실행할 길이 없었다. keymap 에 매핑 id 를 넣지 않고 소유 규칙으로 좁혀 승인 범위(ADR-0029 결정 7)보다 작게 바꿨다. PR 병합은 사용자의 시간 단축 요청(2026-10-15)이다. 사용자 위임(2026-08-23)과 L3 진행 지시(2026-10-14). | [설계서](../02-architecture/legacy-migration-tool-design.md#매핑-식별자와-분할adr-0029-l3c), [MappingIndex](../../migration-tool/src/main/java/nuri/migration/mapping/MappingIndex.java), [복구 런북](../04-operations/migration-recovery-runbook.md) | 2026-10-15 | DEC-OPS-316 ④ 의 "기본이 아닌 mapping 거부", DEC-OPS-315 ⑥ 의 "PR 6개" |

## DEC-OPS-320

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-320 | accepted | **매핑이 다른 소스 표를 단일 키로 조회해 그 컬럼을 옮긴다(ADR-0029 L3d).** ① 표 매핑 `lookups`(별칭·조회 표·where·`key{from,to}`·`exactly_one` 또는 `at_most_one`+`maxMissing`)와 컬럼 `alias.COLUMN` 을 둔다. 쓰는 매핑에는 id 와 순서 키가 필요하다. ② keyset page 마다 같은 읽기 세션에서 키 IN 조회로 짝을 정한다 — 키는 계열과 정규화한 글자로 비교하고(빈 문자열도 키다) CHAR·복합 키는 거부한다. 정확히 같은 글자의 짝이 없는 키는 DB 에 다시 묻는다. 짝 둘 이상·exactly_one 짝 없음·키 형식 밖·DB 비교 의미 차이·maxMissing 초과는 그 chunk 를 쓰지 않고 멈추며 격리하지 않는다. COMMIT 은 조회 키 유일성을 행을 읽기 전에 증명한다. ③ 원장 `via` 확정 행이 조회 컬럼이고 생성기가 만든다. 조회만 하는 표는 소스 단위 완전성을 받고 처분은 덤프해도 `LOOKUP_INPUT` 하나다. ④ 조회 컬럼의 isolate 는 받되 짝 없는 at_most_one 의 NULL 로 난 실패는 `LOOKUP_MISSING` 으로 멈춘다. ⑤ 제어 테이블은 바꾸지 않는다. ⑥ L3b~L3e 를 합친 실행 JSON 은 형식 4 다(형식 1~3 도 읽는다). | 여러 레거시 표를 한 표준 표로 모을 길이 없었다. 순서 키는 MySQL 스트리밍 결과가 열린 동안 조회 문장을 보내지 않으려는 것이다. 사용자 위임(2026-08-23)과 L3 진행 지시(2026-10-14). | [설계서](../02-architecture/legacy-migration-tool-design.md#조회-조인adr-0029-l3d), [LookupResolver](../../migration-tool/src/main/java/nuri/migration/lookup/LookupResolver.java) | 2026-10-15 | DEC-OPS-316 ④ 의 "via 거부", DEC-OPS-318 ⑥ 의 "형식 2"·DEC-OPS-321 ④ 의 "형식 3", DEC-OPS-321 ① 의 조회만 하는 표의 EXPORT_ONLY |

## DEC-OPS-321

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-321 | accepted | **보관 덤프를 COMMIT load 와 같은 원천 읽기 세션에서 쓰고 격리 행의 키를 반출한다(ADR-0029 L3e).** ① mapping-generate 가 원장 ARCHIVE 행을 (소스 표, 보존 기한)마다 `archives` 로 묶고 coverage 가 양방향으로 대조한다. 매핑된 표는 같은 읽기에 보관 컬럼을 더해 읽은 행을 모두(재개 건너뜀·격리 포함) 덤프하고, 덤프만 하는 표는 review `EXPORT_ONLY` 와 정렬 키로 같은 세션 끝에 읽는다. 정렬 키 NULL 행은 어느 표·모드든 읽기 전에 멈춘다(`ORDER_KEY_NULL`). ② COMMIT 에 보관이나 isolate 가 있으면 `--archive-dir`(adoption-execute `archiveDir`)가 필요하다. 절대 경로·링크 없음·승인 산출물 디렉터리와 Git 작업 트리 밖이어야 한다(`.git` 판정은 휴리스틱). dry-run 은 파일 없이 센다. ③ nonce 머리를 둔 JSON Lines 를 실행마다 새로 쓰고(덮어쓰기 거부·0600·실패한 표의 파일 삭제) 이전 파일은 지우지 않는다. 옮길 때마다 STARTED 증거를 다시 쓰고 강제 종료로 남은 임시 파일은 다음 load 가 막는다. ④ verify 는 덤프 행 수 = 조회 수, 격리 키 반출 = 격리 수를 보고, 실행 JSON 형식 3 은 파일 이름·행 수·SHA-256·보존 기한·개인정보 모양 수와 keymap 보존 의무만 싣는다. ⑤ U2 는 사용자 결정 (a)다 — 주민등록번호 모양 값은 덤프에 그대로 두고 보관·정렬 키 컬럼별 수만 보고하며, ARCHIVE 행은 정렬 키까지 덮는 `archive.personalData: acknowledged` 가 있어야 한다. | 원장 ARCHIVE 행을 실행할 길이 없었고, 격리한 행은 값·키가 어디에도 남지 않았다. | [설계서](../02-architecture/legacy-migration-tool-design.md#보관-덤프), [보관 실행](../../migration-tool/src/main/java/nuri/migration/archive/ArchiveRun.java), [복구 런북](../04-operations/migration-recovery-runbook.md) | 2026-10-15 | - |

## DEC-OPS-322

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-322 | accepted | **isolate 가 `LENGTH_EXCEEDED`·`PRECISION_EXCEEDED` 를 승인한 컬럼은 선언 길이·자릿수 정적 판정을 행 가드로 옮긴다(ADR-0029 L3e, 위임 결정).** ① 그 코드를 승인한 컬럼은 문자·정확한 수 값의 선언 길이 판정(`LENGTH_EXCEEDED`)과 정확한 수 값의 정밀도 판정(`PRECISION_EXCEEDED`)을 plan·load 의 표준 검증 대신 값 한계 가드가 행마다 본다(물리 컬럼·표준 도메인 모두). 상한 안이면 격리하고 넘으면 멈춘다(fail-closed). ② 그 코드를 승인하지 않은 컬럼과 가드가 길이를 재지 않는 값(UUID·날짜)은 정적 판정을 그대로 받고, 값 종류 호환은 늘 정적이다. | 승인한 길이·자릿수 예외가 정적 판정에 먼저 막혀 실행될 수 없었다(DEC-OPS-318 ④ 의 미결). | [설계서](../02-architecture/legacy-migration-tool-design.md#예외-행-격리), [표준 검증](../../migration-tool/src/main/java/nuri/migration/validate/TargetStandardValidator.java) | 2026-10-15 | DEC-OPS-307 의 선언 길이·자릿수 정적 판정 가운데 그 코드를 승인한 isolate 컬럼, DEC-OPS-318 ④ 의 '선언 길이·자릿수의 정적 판정은 isolate 컬럼에도 그대로다(…미결)' 가운데 그 코드를 승인한 컬럼 |

## DEC-OPS-323

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-323 | accepted | **Oracle Free 원천으로 표준화 이관을 리허설하고 드러난 결함 셋을 고친다(ADR-0029 L4-B).** ① 새 IT 가 한글 코멘트와 더러운 값이 든 합성 표로 profile→term-suggest→원장 확정→mapping-generate→plan·review·validate→공개 DRY_RUN 을 지나고, 공개 COMMIT 은 `UNVERIFIED` 로 막히며, 엔진 COMMIT·verify 가 격리 3행·시퀀스 재설정까지 맞춘다. ② R1: `TIMESTAMP(n)` 이 드라이버 고유 클래스로 오면 드라이버의 지역 일시를 `Timestamp` 로 바꾸고, JVM 시간대에 없는 시각(일광절약 간격)이면 멈춘다(본 읽기·조회 표·정렬 경계·자기참조·프로파일러). R2: 프로파일러가 Oracle 코멘트를 사전 뷰에서 소유자 한정으로 읽는다(대조는 `NOT_IN_INVENTORY`). R3: CHAR·NCHAR(길이 1 제외, 조회 표 포함) 소스의 codemap 앞에 trim 이 없으면 생성기와 coverage 가 거부한다. ③ Free 시험 이미지를 digest 로 고정한다. ④ 증거 등급·공개 COMMIT 차단은 그대로다. 19c 재리허설은 하지 않고 Tibero 는 라이선스 부재로 보류한다(GAP-MIG-001). ⑤ L4-P1: 사용자가 2026-10-15 L3 전체 병합 전 L4 착수 예외를 승인했다("예외 허용"). | 탐색·DRY_RUN 까지만 돈 Oracle 이 L3 기능을 처음 만났고, probe 가 세 결함의 원인(REMARKS 없음·드라이버 고유 TIMESTAMP·공백 채움)과 다음 문장에 보인 다른 커밋(COUNT 2→3, freeze 필수)을 실측했다. 판정은 사용자 위임(2026-08-23). 합성 데이터·Free 는 기관 증거가 아니다. | [리허설](../04-operations/readiness-followups.md#이관-oracle-free-표준화-리허설), [설계](../02-architecture/legacy-migration-tool-design.md) | 2026-10-15 | ADR-0029 실행 규칙 "각 단계는 앞 단계가 병합된 뒤 시작한다" 가운데 L4 착수 시점, DEC-OPS-311 이유의 "REMARKS 를 주지 않으면 INVENTORY_ONLY" 가운데 Oracle |

## DEC-OPS-324

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-324 | accepted | **load 는 적재 뒤 대사를 지나야 PASS 다(ADR-0029 L4 D2).** ① 실행기가 같은 원천 읽기 세션에서 (소스, where)마다 집계 문장 하나(savepoint 안, 실패하면 COUNT 전용)를 재고, 격리 행 기여·codemap 결과·표본은 메모리 홀더에만 모은다. verify 는 기존 재조회 패스에서 행 수·NULL 계정·정확 수치 합·최소최대·코드 분포·조회 NULL 하한·형식 도메인·표본 재계산을 PASS·FAIL·NOT_COVERED(사유)로 판정한 뒤 run 상태를 기록한다. ② 물리 FK 는 bound fingerprint 4(제약·자식 RI 트리거 상태)와 끝 재조회의 트리거(`O`·`A`)·행 버전, 쓰기 세션 origin, 재개 행 없음으로 이번 실행의 쓰기를 증명하고(NOT VALID 면 `NOT_VALIDATED` 메모), 못 하면 선언 참조와 함께 대상 DB 안 `NOT EXISTS` 로 센다. 유일 인덱스는 시작·끝 valid·ready 다. ③ 위임 P3: isolate 가 있고 키를 그대로 쓰는 표는 `verify.references` 나 `referencedBy: none`+사유가 있어야 plan 이 통과한다. ④ 실행 JSON 형식 5 는 검사 이름·결과·건수·사유 코드만 싣는다. ⑤ 미룬 것: 논리 UNIQUE·문자 길이 parity·새 세션 재조회 표본 — ADR D2 의 UNIQUE·샘플 diff 를 일부만 채운다. Oracle 대사 리허설(O2)은 PR-D 다. | 종전 verify 는 실행기가 의도한 값만 증명해 읽기 손실·변환 의미·물리 FK 없는 참조·형식 도메인을 보지 못했다. fingerprint·핵심 클래스가 바뀌어 기존 plan 은 다시 승인한다. | [설계](../02-architecture/legacy-migration-tool-design.md#대사adr-0029-l4-d2), [MigrationVerifier](../../migration-tool/src/main/java/nuri/migration/verify/MigrationVerifier.java), [런북](../04-operations/migration-recovery-runbook.md#대사-증거) | 2026-10-15 | - |

## DEC-OPS-325

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-325 | accepted | **공통코드를 쓰기 전과 적재 뒤에 대조한다(ADR-0029 L4 D7).** ① 제품 Java 의 공통코드 바인딩 6행을 이관 도구 카탈로그로 두고 운영 계약이 생산 Java 의 그룹 리터럴과 양방향으로 대조한다. 쓰기 검증(VALIDATE)은 결재 본표 `task_se_cd` 하나, 나머지는 표시(DISPLAY)다. ② plan·load 는 VALIDATE 컬럼이 codemap(미매핑 그대로 쓰기 아님)이나 상수로 채워지고 출력이 사용 중 상세코드인지 쓰기 전에 본다. ③ COMMIT 은 바인딩·읽을 수 있는 메타 허용값의 코드 컬럼을 대상 컬럼 전체로, 표마다 문장 하나로 센다. codemap 결과 종류와 맞지 않은 키 위치도 남긴다. ④ 사용자 결정 L4-P2(2026-10-15): U3 로 확정한 코드 컬럼은 대조 원천(VALIDATE 바인딩·읽을 수 있는 메타 허용값)이 있으면 포함 판정으로 FAIL, 없으면 load 는 PASS 로 두고 `UNRECONCILED` 로 남겨 컷오버 전에 업무 소유자가 확인·서명한다. 원장 형식은 그대로다. ⑤ 이관 역할에 `tb_com_cd`·`tb_com_dtl_cd` SELECT 가 필요하다. | codemap 은 대상 공통코드와 대조하지 않아(설계 D7) 앱이 상신에서 거부할 업무 구분이 이관으로 들어갈 수 있었다. VALIDATE 컬럼은 상세코드로 허용값을 확인할 수 있어 U3 의 전제가 성립하지 않는다. | [설계](../02-architecture/legacy-migration-tool-design.md#공통코드-대사adr-0029-l4-d7), [바인딩](../../migration-tool/src/main/java/nuri/migration/validate/ProductCodeBindings.java), [CodeSetReconciler](../../migration-tool/src/main/java/nuri/migration/verify/CodeSetReconciler.java) | 2026-10-15 | DEC-OPS-317 ③ 의 '허용값 대사는 L4 가 맡는다' 가운데 대조 원천이 없는 컬럼(사람 확인·서명으로 바뀐다)과, ②·③ 가운데 VALIDATE 바인딩 컬럼의 codemap 없는 확정 |

## DEC-OPS-326

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-326 | accepted | **원천 사용자 이름이 원천 schema 이름과 같으면 credential 검사에서 사용자 이름으로 보지 않는다(GAP-MIG-001 의 결정 필요 항목).** ① 승인 workflow 가 산출물을 쓰기 전에 하는 접속 정보 검사에서, 원천 사용자 이름이 원천 schema 이름(inventory 의 discovery scope·객체 schema, term-suggest 는 프로파일의 표 schema)과 대소문자 없이 같으면 사용자 이름 검사를 건너뛴다. ② 비밀번호·URL·endpointId 와 대상 접속 정보는 그대로 막는다 — 비밀번호가 schema 이름과 같아도 멈춘다. ③ owner 가 곧 접속 사용자인 Oracle 은 대소문자와 상관없이 사용자 이름을 쓴다. | Oracle 은 schema 한정 이름(`OWNER.표`)이 사용자 이름을 담는다. 그래서 Oracle 이 저장한 꼴(대문자)로 적은 설정은 discover 부터 멈췄고, 소문자로 적은 설정은 같은 이름이 산출물에 대문자로 남는데도 대소문자만 달라 통과했다. 판정이 적은 꼴에 따라 갈렸을 뿐 새로 드러나는 값은 없다. 접속 계정 이름을 산출물에 남기지 않으려면 owner 와 다른 읽기 전용 계정을 쓴다. 사용자 위임(2026-08-23)과 "계속진행"(2026-10-16). | [MigrationWorkflowRunner](../../migration-tool/src/main/java/nuri/migration/MigrationWorkflowRunner.java), [Oracle 리허설](../04-operations/readiness-followups.md), [설계](../02-architecture/legacy-migration-tool-design.md) | 2026-10-16 | - |

## DEC-OPS-327

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-327 | accepted | **알림 기능 없이 만든 생성물의 결재·메모 보고 화면은 알린다고 말하지 않는다(GAP-COMPOSE-001).** ① 슬롯 `delivery-channels` 에 알림 기능이 `{ id: 'notification' }` 하나를 기여하고(노출 `always` — 타입이 묶는다) core 도우미 `hasDeliveryChannel` 이 채널 유무를 답한다. ② 채널이 없으면 결재 재알림 단추와 '하루 한 번' 안내를 감추고, 결재자 바꾸기·참조자 지정·보완 요청·메모 보고 지시 바꾸기의 알림 문장을 뺀다. 알림이 있는 구성의 문구는 글자 그대로다. ③ 서버 API 는 그대로다 — 재알림 API 는 남고, 알림 없이 부르면 처리 기록만 남는다. ④ 두 기능의 연동 사유 문장을 고친다. | 사용자 요청(2026-10-16 "알림 기능 빼고 만든 생성물에는 표시 안 되게"). 화면이 알림 기능을 import 하면 알림이 빠진 구성에서 화면까지 연쇄로 지워지므로 슬롯으로 묻는다. 결재·메모 보고 단독 투영에서 기여가 직접 지워지고 레지스트리가 빈 배열로 렌더되는 것을 확인했다. red 증명 10종. | [슬롯 타입](../../frontend/src/extensions/slots.ts), [도우미](../../frontend/src/lib/delivery-channels.ts), [결재 협업 패널](../../frontend/src/app/approvals/ApprovalCollaborationPanel.tsx) | 2026-10-16 | GAP-COMPOSE-001 의 결재·메모 보고 알림 문구 부분 |

## DEC-OPS-328

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-328 | accepted | **나의 결재선과 알림 카드 바로 승인을 둔다(2026-10-16 사용자 승인 "4번의 db 새테이블 추가 승인").** ① V2_129 가 개인 결재선 표 `tb_ifml_atrz_indv_apln`·`_dtl` 을 두고 용어 IFML_ATRZ_INDV_APLN_SN 을 등록한다. 본인만(남의 것 404), 1인 20개(C014), 같은 이름 409(C008)·덮어쓰기, 사용자 삭제 시 CASCADE 다(DEC-OPS-219 선례). ② 저장과 불러오기 모두 결재자 자격(사용 중·APPROVAL_APPROVE·본인 아님)을 다시 판정한다 — 저장은 단계 번호만 밝혀 거부하고, 불러오기는 자격을 잃은 사람을 이름 없이 빼고 그 수만 싣는다. 공용 결재선은 범위 밖이다. ③ 알림 드로어의 결재 차례 알림에 [승인]·[열기] 를 둔다. 결재가 `notification-actions` 슬롯에 기여하고(노출 APPROVAL_READ·APPROVAL_APPROVE — 누른 뒤 부르는 두 API) 드로어는 결재 코드를 import 하지 않는다. 누르면 상세를 다시 읽어 차례·버전을 확인한 뒤 결재함과 같은 10초 되돌리기 대기열에 올린다(DEC-OPS-218 ②). | 같은 결재선을 매번 다시 고르던 비용(D2)과 알림에서 결재함을 거쳐야 승인하던 동선을 줄인다. 보완 요청의 답을 기다리거나 지금 단계에서 답이 온 문서는 바로 승인하지 않는다 — 답하며 고친 본문을 읽지 않고 승인하게 된다. | [V2_129](../../api-server/src/main/resources/db/migration/V2_129__add_approval_saved_lines.sql), [ApprovalSavedLineService](../../business-app/src/main/java/nuri/business/service/informalsanction/ApprovalSavedLineService.java), [바로 승인](../../frontend/src/queries/approval-notification-action.ts), [알림 드로어](../../frontend/src/app/components/ui/app-notification-drawer.tsx) | 2026-10-16 | - |

## DEC-OPS-329

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-329 | accepted | **V2_129 를 공유 OCI DB 에 적용한다(2026-10-16 사용자 승인 — 나의 결재선 새 테이블, PR #912 병합 뒤).** 병합본(c4fd2e14c)에서 꺼낸 마이그레이션 폴더로 사전 읽기(스키마 2.128, 두 표 없음, 용어 13,231) → info(대기 2.129 하나, 반복 시드 변화 없음) → pg_dump 백업(목차 확인) → Flyway 12.4.0 migrate → validate(152개) 순서로 했다. 읽기 확인: `tb_ifml_atrz_indv_apln`(열 7)·`_dtl`(열 8)과 주석, 사용자·부모 FK 두 개 모두 CASCADE, 용어 `IFML_ATRZ_INDV_APLN_SN`(일련번호N19) 등록(13,231→13,232), 0행. | DEC-OPS-328 의 저장 결재선 표다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 지운 행은 없고 원본은 적용 직전 백업이다. | [V2_129](../../api-server/src/main/resources/db/migration/V2_129__add_approval_saved_lines.sql), [DEC-OPS-328](../../.agent/memory/decisions.md) | 2026-10-16 | - |

## DEC-OPS-330

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-330 | accepted | **권한이 빠진 투영 묶음은 원본 이름·설명을 들고 가지 않는다(GAP-COMPOSE-001).** ① 생성물 묶음 원장에서 원본보다 권한이 하나라도 적은 묶음은 이름 뒤에 '(이 구성에 남은 권한)'을 붙이고, 설명을 기능을 열거하지 않는 고정 문장으로 바꾼다. 권한이 그대로인 묶음은 원본과 바이트가 같다 — 원본 산출물은 바뀌지 않는다. ② 맡기는 일은 묶음 대화상자가 권한 수와 여는 화면·관련 화면의 이름으로 보인다. 화면 이름은 설명에 옮겨 적지 않는다 — 화면 이름 2개가 묶음 문구 금지 용어 '허브'를 쓴다. ③ 판정은 권한 집합이다. 권한은 그대로인데 화면만 빠지는 '로그·감사 열람'·'메뉴·코드 설정'은 설명이 그 화면을 말하지 않아 그대로 둔다. ④ 정밀 점검과 생성기가 줄어든 묶음을 같이 보고하고, 계획의 '생성 뒤 직접 배정할 권한' 안내도 생성물에 실릴 이름으로 부른다. | 사용자 요청(2026-10-16 "추천대로"). core 의 '기본 업무'는 권한 72개 중 11개만 남는데 설명은 결재·게시판·쪽지를 말했고, 게시판만 고른 생성물에도 '게시판·커뮤니티 운영'이 커뮤니티를 맡긴다고 말했다. 시작 구성 5·빈 선택·단독 선택 22에서 바뀐 이름·설명이 용어·중복 검사를 통과하는 것은 정밀 점검으로 한 번 실측했고(커밋된 시험은 core·collaboration·demo 프로필별과 정밀 점검 동치 3개 구성), 같은 권한 집합 묶음의 중복 제거는 선행 묶음을 남기는 기존 순서 그대로라 줄어든 묶음이 앞서면 온전한 뒤 묶음 대신 남을 수 있다. | [권한 투영](../../scripts/reusable-permission-projection.mjs), [묶음 대화상자](../../frontend/src/app/admin/security/authority/components/PermissionBundleDialog.tsx), [재사용 가이드 §3.5](../03-guides/reusable-base-guide.md#35-소스-projection) | 2026-10-16 | GAP-COMPOSE-001 의 투영 묶음 이름·설명 부분 |

## DEC-OPS-331

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-331 | accepted | **메모 보고 지시는 보고를 받은 사람만 남긴다(GAP-MEMO-001 종료, 2026-10-16 사용자 선택).** ① 지시 작성·변경 가드(`MemoReportService.assertRecipient`)는 수신자만 통과시키고 관리자 우회가 없다 — 전체 수정 권한(MEMO_RPT_UPDATE_ALL)도 수신자가 아니면 403 이다. 지시 기능 권한(MEMO_RPT_INSTRUCT), 지시 뒤 본문 수정 409, 삭제 보호는 그대로다. ② 응답 힌트 `instructable` 은 지시 기능 권한과 수신자 여부로만 판정하고, 화면은 힌트 없는 행에서도 같은 규칙으로 계산한다. 인가 원장은 그 경로를 STRICT_OWNER 로 적는다. ③ MEMO_RPT_UPDATE_ALL 은 이제 남의 보고 본문만 대행해 고치므로 기본 권한 MEMO_RPT_UPDATE 와 함께 '다른 사람 업무 자료 대행' 묶음에 넣는다. 생성기 사실 검사가 가드·힌트·다른 Java 판정을 고정해, 이 권한이 지시를 다시 열면 실패한다. 스키마는 바꾸지 않는다. | 지시에는 작성자 칸이 없어, 수신자가 아닌 사람이 단 지시도 보고한 사람에게는 수신자의 지시처럼 보였다. 작성자 칸을 두는 안은 스키마 변경이 필요하다. 관리자가 이미 달린 지시를 비우기만 하는 길은 두지 않았다(수신자가 비활성이면 보고 삭제만 남는다). 수신자가 없는 레거시 행은 지시할 수 없다. | [MemoReportService](../../business-app/src/main/java/nuri/business/service/memoreport/MemoReportService.java), [묶음 원장](../../config/governance/permission-bundles.json), [사실 검사](../../scripts/generate-screen-registry.test.mjs) | 2026-10-16 | DEC-OPS-138 ⑤·DEC-OPS-196 ④의 지시 판정 중 전체 수정 권한 부분, DEC-OPS-214 의 MEMO_RPT_UPDATE_ALL 제외 사유 |

## DEC-OPS-332

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-332 | accepted | **게시판 유형 이름의 정본을 화면 상수 하나로 두고 공통코드 COM004 조인을 걷는다(GAP-BOARD-002, 2026-10-16 사용자 선택).** ① 서버는 유형 코드만 저장·응답한다 — 마스터 목록의 COM004 조인과 응답·DTO 의 `bbsTypeCdNm` 을 걷는다. ② 유형 코드·템플릿·이름은 `board-types.ts` 하나가 정하고 생성 마법사와 마스터 목록이 읽는다. 목록은 코드와 템플릿이 정본의 짝일 때만 이름을, 아니면 저장된 코드를 보인다. ③ 목록 검색 축은 게시판명 하나다. ④ 게시판 기능의 공통코드 그룹과 이관 도구 바인딩에서 COM004 를 뺀다. 데이터·마이그레이션 변경은 없다. | COM004 는 원본·공유 DB·생성물 어디에도 없어 이름이 늘 비었고, 유형 코드를 정하는 곳은 마법사뿐이다. 시드·라이브 게시판 4개는 코드와 템플릿을 다른 짝으로 저장해(BBST03 + TMPLT_QNA 등) 코드만으로 이름을 붙이면 사실과 다르게 말한다 — 맞추려면 데이터 변경 승인이 필요하다. 화면이 searchCnd 를 보내지 않아 게시판명 검색어가 무시되던 결함도 함께 닫았다. 카탈로그 해시가 바뀌어 로컬 DB 번들을 다시 만들고, 이관 도구 구현 digest 가 바뀌어 기존 plan 은 다시 승인한다. | [유형 정본](../../frontend/src/lib/board/board-types.ts), [목록 조회](../../business-app/src/main/java/nuri/business/domain/board/BoardMasterRepositoryImpl.java), [참조 데이터 계약](../../scripts/reusable-reference-data.test.mjs) | 2026-10-16 | DEC-OPS-262 의 COM004 게시판 소유 부분, DEC-OPS-325 의 바인딩 6행 중 `bbs_type_cd` 행 |

## DEC-OPS-333

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-333 | accepted | **rewrite 프록시는 백엔드 연결을 유휴 재사용하지 않고, 격리 E2E 의 Next 서버는 클라이언트보다 오래 유휴를 유지한다(GAP-FE-002 종료).** ① `proxy.ts` 가 `/api/v1`·`/actuator`·`/ws` 요청에 `Connection: close` 를 싣는다(업그레이드 제외). httpxy 가 그 헤더를 백엔드에 그대로 보내 요청마다 새 연결을 맺는다. ② 러너가 `next start --keepAliveTimeout 3600000` 으로 Next 서버 유휴 수명을 e2e 잡 한도(30분)보다 길게 둔다. ③ 계약이 두 값과 설치된 Next 의 연결 재사용 여부를 고정한다. | Next 16 rewrite 의 Agent 는 timeout 이 없고 주입할 수 없으며 Node 22 는 그때 서버의 Keep-Alive 힌트를 무시해, 클라이언트 유휴 수명이 Tomcat 20초·Node 서버 5초보다 길었다. 격리 재현에서 수정 전 9/20 → 0/20(Tomcat), 15/20 → 0/20(Node 서버). 대안 중 Tomcat 유지 시간 연장은 경계만 미루고 Agent 는 주입 수단이 없다. 재시도·flaky 완화·node_modules 패치는 하지 않았다. 사용자 요청(2026-10-16 "추천대로"). red 증명: 두 수정을 되돌리면 계약·단위 시험이 붉다. 비용: 백엔드의 close 가 브라우저 응답에도 복사돼 edge 없는 직접 노출 배포는 브라우저↔Next 연결도 새로 맺으므로 권장하지 않는다(운영 edge 는 이미 close). | [proxy.ts](../../frontend/src/proxy.ts), [러너](../../scripts/run-isolated-e2e.mjs), [계약](../../scripts/frontend-proxy-keepalive-contract.test.mjs), [재현](../04-operations/readiness-followups.md#프록시-연결-재사용-경합-gap-fe-002-2026-09-30) | 2026-10-16 | - |

## DEC-OPS-334

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-334 | accepted | **허브 탭 슬롯을 허브마다 나눈다(GAP-SLOT-001 종료).** `hub-tabs` 를 `hub-tabs-collaboration`·`-knowledge`·`-monitoring` 셋으로 나눠 레지스트리·기여 파일(`<기능>/hub-tabs-<허브>.ts`)·소비 셸을 허브마다 하나로 둔다. 항목 타입은 `HubTab<허브>` 이고 항목에서 `hub` 키를 걷는다(슬롯 이름이 허브다). 소비자 표의 허브별 나눔과 census 의 허브 귀속 분기를 걷었고, 나눔은 `stats-panels` 의 배치 하나만 남는다. 슬롯 종류는 항목 타입으로 세어 10개 상한을 유지하고, 같은 항목 타입을 여러 슬롯이 쓰는 것은 허브 탭뿐이며 슬롯은 `HubTabViews` 키마다 하나라고 경계 계약이 고정한다. 탭·순서·노출 술어는 그대로다. | 레지스트리 하나를 세 허브 셸이 읽어 다른 허브의 탭 뷰(커뮤니티 관리, 하네스 표본, 쪽지·스크랩)가 번들에 함께 실렸다. 프로덕션 빌드 실측(main c4fd2e14c 대비, 라우트 청크 gzip 합): 협업 허브 −36,638B, 지식 허브 −25,518B, 감시 허브 −29,820B, 통계 −1,974B, 댓글 관리 −1,974B, 업무 홈 −1,974B(공용 청크 정리분). 최대 청크는 불변이다. 구성별 투영(생성기 함수): 탭 기능이 없는 구성은 해당 허브 레지스트리가 빈 배열이고 허브 셸은 연쇄로 지워지지 않는다. red 증명: 셸이 다른 허브 레지스트리를 읽거나 항목에 hub 키를 되살리면 경계 계약이 붉다. 사용자 요청(추천대로, 2026-10-16). | [슬롯 타입](../../frontend/src/extensions/slots.ts), [소비자 표](../../scripts/slot-registry.mjs), [경계 계약](../../scripts/reusable-frontend-boundaries-contract.test.mjs), [설계 §5](../02-architecture/project-composer-design.md#슬롯-기여와-레지스트리) | 2026-10-16 | DEC-OPS-274·275·277·284 의 '`hub-tabs` 슬롯 하나·항목의 `hub` 값으로 허브 구분' 부분 |

## DEC-OPS-335

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-335 | accepted | **계약·하네스의 반복 실행 비용과 중복 판정을 줄이고 검사 모집단·단언은 유지한다(코덱스 작업분과 보완).** ① 로컬 경로: pre-push 는 Atlas 단독 계약을 불변식·cross-stack Vitest 와 겹쳐 돌리지 않고, `verify` 각 범위는 같은 시험 파일을 한 번만 돈다(local-full 의 프런트 Vitest 결속은 `test:coverage`). ② 생성 계약 드리프트 검증은 작업 트리·index 를 쓰지 않는다 — index 의 스펙으로 임시 디렉터리에서 다시 만들어 index 생성물과 비교하고, 그 명령이 맡은 스펙·생성물의 작업 트리가 index 와 다르면 작업 트리 쌍도 비교한다(pre-commit 의 `GIT_INDEX_FILE` 을 따른다). 생성기 실행 정의는 검증 스크립트 한 곳이고 재사용 투영이 import 한다. ③ 하네스: ZDM 이력 검사는 블롭을 `git cat-file --batch` 로 읽고 이력 fixture 저장소를 클래스당 한 번 만든다. node 의 `git show <rev>:<path>` 는 `cat-file blob` 으로 바꿨다 — 이 형태의 재도입을 막는 가드는 Java 하네스 소스에만 있고 node 스크립트에는 두지 않았다(지금 0건이고, 다시 쓰면 cwd 가 긴 로컬 Windows 에서만 시끄럽게 실패한다). Hibernate 설정 전달은 Boot JPA 자동 설정과 실제 SessionFactory 로 확인한다. 앱이 같은 경로를 쓴다는 전제는 정적으로 본다 — 운영 소스에 목록의 JPA 부트스트랩 타입(EMF 를 만드는 팩토리·빌더·공급자, Hibernate SessionFactory 빌더, Hibernate 속성·빌더 커스터마이저)이나 반환형이 EntityManagerFactory·SessionFactory 인 `@Bean`·`FactoryBean` 이 나오면 red 다. 이름과 선언 모양으로 찾으므로 그 밖의 EMF 정의 형태는 보지 않는다(앱 전체 컨텍스트로 보던 이전 판보다 좁다). 오프셋 보존 마스커는 공용 인덱스 하나이고, 공용 인덱스의 직접 읽기 예외가 1건(일회성 프로세스 출력 바이트) 늘었다. 하네스 매니페스트는 `node scripts/harness-baseline-manifest.mjs` 가 JVM 메타 게이트와 같은 값으로 계산·검사·쓴다(권위는 CI 의 JVM 메타 게이트). 매니페스트의 경로와 줄 형식(머리 주석, Java TreeMap 과 같은 코드 단위 순서, LF)은 `scripts/harness-baseline-manifest-format.mjs` 한 곳에 두고 계산 도구·재사용 투영 생성기·`merge:main` 이 import 한다(`merge:main` 은 node 내장만 쓰는 이 모듈만 읽는다). 생성기가 localeCompare 대신 같은 렌더로 쓰므로 이 변경 전에 만든 생성물은 첫 `--write` 에서 키·값은 같고 줄 순서만 바뀐다(커밋본 키로 모의하면 482줄 중 23줄). 매니페스트가 작업 트리에 없거나 충돌 표기 없이 남은 병합은 `merge:main` 이 키 없이 그 사정을 수동 항목으로 안내한다. ④ 생성기·재사용 계약: 정밀 점검·계획은 한 호출 안에서 원문을 한 번 읽고, 시험은 저장소 원문·계획·카탈로그 적재를 메모로 나눠 쓴다(루트 밖 준비물과 변이는 다시 읽는다). 투영 단계에는 승인 필드 없는 구성만 넘겨 승인 목록만 바꾼 시험이 제거 집합을 재사용한다. 시작 구성 승인의 exact 대조는 정밀 점검 동치 계약(blockers 0)이 소유하고 pack-tagged-registry 의 Java 게이트 사본을 걷었다(투영본 분기만 남는다). 투영 TS 검사는 바뀌지 않은 파일의 SourceFile 을 구성 사이에 나눠 쓴다. 진입점 폐포 계약이 덮는 정규식 폐포 시험을 걷었다. ⑤ 프런트 가드: 디렉터리를 걷거나 실측에서 코드가 지워지던 가드(소유 가드·cross-stack 배치 가드·정책 화면과, form action 교착·관리자 역할 판정·권한 거부 안내 정직성·pageUnit 상한·e2e force 클릭 래칫·fill 셸 루트 census 의 TS 몫)는 주석 제거를 공용 판정(TS 파서·Java lexer) 하나로 하고 node 환경이다. 옮길 때마다 문자열·정규식 리터럴 속 주석 기호 뒤에 위반을 넣어 종전 제거가 놓치는 것을 red 로 확인했다. 정규식으로 주석을 지우는 frontend 시험 16개(그중 5개는 CSS 도 읽는다)가 남았고, 그 모집단에서 코드가 지워지는 곳은 실측 0 이다(목록·재개 조건은 PR 설명). mount gate 는 생산 소스 전수 0 고정, 색 가드 총계와 A1 census 수는 표 합·목록 길이에서 계산한다. cross-stack 배치 가드는 `frontend/src` 전체를 보고, 백엔드를 읽던 기능 시험 단언 4건을 cross-stack 으로 옮겼다. 업무 홈 술어는 기능 import 없는 공유 기대표로 양쪽을 결속한다 — 검증자 보정안의 '기능 import 유지'는 그 연쇄가 생성기를 GATE_UNACKNOWLEDGED 로 멈추게 한 실측 때문에 따르지 않았다. 페이지 크기 census 는 모집단을 exact 분류하고 factory 결속을 구문 트리로 본다 — 결속은 함수 단위 키(`@/queries/<모듈>#<callee>`)로 기록하고, 함수마다 크기만 다른 두 호출의 queryKey 가 다르다고 단언하는 단위 시험 it 를 exact 표로 가리킨다. 수동 조회·클라이언트 페이징 목록의 사유는 화면별 크기 변경 렌더 시험이 지킨다. ⑥ CI: secret-scan 의 gitleaks 는 checkout 직후에 돈다. 의존성 snapshot 대기값은 검증기 기본값과 결속한다. Atlas vitest 는 HTML 에 실린 catalog 를 기대값으로 쓰고 신선도는 생성물 계약이 단독으로 본다. | 사용자 요청(2026-10-17: 계약·하네스가 유연성을 막거나 비효율적인 곳을 최적화하고 코덱스 작업의 빠진 부분을 보완, 진행 방식 위임)이다. 감사 지적 48건(반박 검증 confirmed 33·needs-change 15) 가운데 이번에 집행한 몫이고, 같은 브랜치의 적대적 검토가 남긴 지적(유지 36건)도 반영했다. 집행하지 않은 몫과 사유는 PR 설명에 둔다. 측정은 같은 조건의 쌍만 적는다(같은 기계, CI 수치 아님): 운영 계약 전체(`npm run test:operational-contracts`)는 같은 부하 조건에서 main 1,567건 1,070초 → 보완 1,605건 625초다. 하네스는 보완 브랜치의 통합 검증에서 `harnessTest` 전체가 2분 2초였다 — main 을 같은 조건으로 다시 재지 않았고, 콜드 기동 비용이 클래스 사이로 옮겨 가므로 클래스 단위로 나눠 적지 않는다. ZDM 이력 검사는 실제 감사 1회의 git 프로세스가 약 138→8개로 줄었고, 긴 worktree 경로(Windows 260자)의 거짓 red 도 사라졌다. 신호: 모집단·단언·래칫은 그대로이고 늘어난 예외는 위 직접 읽기 1건이며, 항목마다 의도적 위반이 의도한 실패 문구로 red 인 것을 확인했다 — ZDM 의 커밋·index 블롭 없음 분기는 `git rm --cached` 로 보호 V 파일을 index·커밋에서만 지우고 작업 트리 사본을 남긴 fixture 로 본다. 작업 트리 안에서만 일관되게 고친 스펙·생성물 쌍은 이제 green 이다(커밋될 index 쌍이 일관되므로 CI 결과와 같다). | [생성 계약 검증](../../scripts/verify-generated-contracts.mjs), [매니페스트 도구](../../scripts/harness-baseline-manifest.mjs), [주석 제거 판정](../../scripts/code-without-comments.mjs), [동치 계약](../../scripts/project-composer-preset-equivalence.test.mjs), [테스트 가이드](../03-guides/testing-guide.md), [훅 안내](../../.githooks/README.md) | 2026-10-17 | DEC-OPS-264 ①·DEC-OPS-290 ④ 의 시작 구성 승인 exact 대조 소유(pack-tagged-registry → 정밀 점검 동치 계약), DEC-OPS-090 ⑤ 의 pack-tagged-registry.test.mjs Java 승인 exact 소유(투영본 분기는 남는다) |

## DEC-OPS-336

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-336 | accepted | **Atlas 도구와 operation 소비 원장을 생성기·도구 전용 경로 표에 넣는다(DEC-OPS-297 확장).** ① `scripts/atlas-*`·`scripts/build-atlas.mjs`·`config/governance/operation-consumer-census.json` 만 바꾼 변경은 미분류 전수 대신 모든 시작 구성의 재사용 검증과 표에 적힌 축만 고른다. 축은 DEC-OPS-297 ② 의 표 계약이 그 경로를 읽는 시험에서 다시 계산해 항목마다 대조한다. ② 셋 다 이관·PIT·frontend 를 건너뛴다. Atlas 도구 두 경로는 재사용 생성기의 Atlas 제거 규칙(`UPSTREAM_ATLAS`)이 경로 이름을 적어 생성기 화면 시험과 기본 관리자 시드 스키마 검증이 표 안 사슬로 읽으므로 E2E·schema 가 남는다. 소비 원장은 backend 만 남는다. ③ Atlas 원천 변경은 늘 도는 생성물 신선도 계약이 낡은 HTML 로 잡고, 미분류 입력이 섞이면 전수로 돌아간다. ④ CI 가이드의 경로 열거와 효과를 같은 변경에서 고친다. | Atlas 도입(2026-09-10) 때 범위 분류 회귀 시험은 Atlas 도구를 미분류 전수로 고정했다. 코덱스 작업분이 이 경로를 표에 넣고 시험을 바꿨지만 문서·결정 기록이 빠져, CI 가이드는 Atlas 도구를 바꾸면 전수 검증이 돈다고 읽혔다(감사 CX-04). 2026-10-17 분류 실측: Atlas 도구 두 경로는 frontend·migration·mutation 이 꺼지고, 소비 원장은 schema·E2E 도 꺼진다. 사용자 요청(2026-10-17). | [분류기](../../scripts/ci-change-scope.mjs), [표 계약](../../scripts/ci-change-scope-tool-paths.test.mjs), [CI 가이드](../03-guides/cicd-pipeline.md) | 2026-10-17 | 범위 분류 회귀 시험이 Atlas 도구 셋을 미분류 전수로 고정하던 부분(Atlas 도입 2026-09-10) |

## DEC-OPS-337

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-337 | accepted | **이관 PIT 여덟 범위를 두 슬롯에서 실측 긴 순서로 돌린다.** ① `mutation-scope-migration` 은 `max-parallel: 2` 이고, matrix 는 main 실행 38985970318(af79c310f)의 job 시간이 긴 순서(verify 209·validate 197·standardize 176·collect 171·protect 72·runtime-state 64·registry 61·converter 55초)로 선언한다. ② `sast-scope` 의 1슬롯은 그대로다. ③ 대상 클래스·시험·75% 판정·fail-fast 비활성·집계는 바뀌지 않고, 필수 체크 계약이 두 잡의 슬롯 수와 이관 PIT 순서를 정확히 대조한다. ④ 효과는 같은 SHA 연속 green 실행의 중앙값으로 판정한다 — 이 결정 시점에는 CI 로 재지 않았다. | 1슬롯은 합산 약 4분 12초(실행 36575378891, ADR-0029 L4 전)를 전제로 초기 runner 를 E2E·재사용 검증에 양보했다. L4 뒤 같은 잡의 합이 1005초가 되어 하나씩 이어 돈 마지막 범위가 1486초에 끝났고, 나머지 job 은 모두 1025초 안에 끝나 이 잡이 전수 CI 의 임계 경로가 됐다. 슬롯이 1개인 한 범위를 나눠도 합계는 그대로다. 이 순서로 두 슬롯에 넣으면 사슬별 job 시간 합은 505·500초다 — 같은 실행의 범위별 job 시간으로 계산한 값으로 runner 대기는 빠졌고, 두 슬롯의 벽시계는 결정 시점에 CI 로 재지 않았다. 같은 실행만 세면 동시 job 정점은 18개라 둘째 슬롯을 더해도 19개다. 다만 초반 runner 대기(138→375초) 동안 이 실행의 동시 수는 11~15개였으므로 계정 한도 20 안이라는 판단은 함께 도는 다른 실행을 뺀 값이고 보장이 아니다. 둘째 슬롯이 E2E·재사용 입장을 늦출 수 있지만 reusable-base 마지막 종료(1015초)가 이관 PIT 종료(1486초)보다 약 470초 앞서므로 벽시계는 줄 것으로 보고 ④ 의 중앙값 판정으로 확인한다. ADR-0026 은 Accepted 라 결정 10 의 이 부분은 기록 규칙(2026-10-17)에 따라 후속 ADR(ADR-0032)로 승격한다. 사용자 요청(2026-10-17). | [ADR-0032](../02-architecture/decisions/ADR-0032-migration-pit-two-slots.md), [ci.yml](../../.github/workflows/ci.yml), [필수 체크 계약](../../scripts/required-checks-contract.test.mjs), [CI 가이드](../03-guides/cicd-pipeline.md) | 2026-10-17 | ADR-0026 결정 10 의 `mutation-scope-migration` `max-parallel: 1` 부분 |

## DEC-OPS-338

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-338 | accepted | **로컬 검증 경로의 순서·시간대·결속을 실행과 맞춘다.** ① pre-push 소스 경로와 `verify` 의 fast·push·fe·full·e2e 는 실패가 잦고 짧은 정적 검사(tsc·codegen·lint·폼 census — pre-push 소스 경로와 fast·push 는 Java 컴파일 포함, e2e 는 E2E 타입 검사만)를 운영 계약보다 먼저 돌리고, 정적 검사가 실패하면 운영 계약을 기다리지 않는다. full·be 의 Java 컴파일은 backend 전수 lane(gradle 한 줄) 안에서 운영 계약 뒤에 돈다. 명령 집합·인자는 그대로이고 운영 계약은 그것을 부르는 경로(pre-push 문서·소스 경로, verify 의 docs·fast·push·be·fe·full·e2e)에서 한 번 돈다 — verify 의 ops·migration 과 삭제 전용 push 는 돌지 않는다. 문서 전용 경로와 be·docs 범위의 순서는 그대로다. ② `verify` 의 하위 명령은 기본 `TZ=Asia/Seoul` 이고 명시한 `TZ` 가 이긴다 — `npx cross-env TZ=UTC npm run verify:<범위>`(bash·PowerShell·cmd 공통, 셸 세션에 TZ 를 남기지 않음)로 CI 러너 조건을 재현한다. pre-push 는 시간대를 강제하지 않는다. 생성물 검증(`verify-reusable-artifact`)·T2(`reusable-nightly`) 실행기는 이 손잡이 없이 KST 고정이다 — CI 에서도 실행기가 자식 환경을 만들어 KST 로 돈다. ③ gate registry 의 `scripts/verify.mjs` binding 은 tier 가 뜻하는 범위 분기(local-full=`full`, local-e2e=`e2e`)에서 호출을 따라 닿는 줄이어야 하고, 조건 안이면 `conditional` 을 선언한다. 닿지 않거나 선언과 실제가 다르면 양방향 red 다. pre-push binding 은 종전대로 줄 존재만 본다. 범위 분기가 함수(선언·표현식·화살표·메서드·콜백) 본문 안에 있으면 구조 오류다. 분기 자체가 실행되는지(분기 앞 최상위 코드·scope 값)는 정적 분석 밖이고, pre-push 계약이 `verify.mjs` 를 범위마다 실행해 정확한 명령 목록과 `process.exit` 부재로 본다. | 감사 지적(PREPUSH-VERIFY-FAIL-FAST-ORDER·VERIFY-TZ-DIVERGES-FROM-CI·VERIFY-BINDING-TIER-NOT-EXECUTED)이다. 운영 계약(로컬 약 11분)이 앞에 있어 정적 검사 실패를 늦게 알았다. 로컬 기본 KST 와 CI 의 UTC 가 갈려 날짜 경계 시험이 로컬에서만 달랐다(KST 기본은 개발 기계 조건이라 유지). DEC-OPS-027 ② 의 local-full 선언은 줄 존재만으로 성립해 범위 분기 밖의 줄도 tier 를 주장할 수 있었다 — 넓힌 검사가 옮기기 전 verify 에서 4건을 잡았다. 감사 제안은 fast·fe 순서였고 같은 원리로 full·e2e 도 바꿨다. red 증명: 순서·실패 전파는 pre-push 계약의 훅 실행, TZ 는 명시 UTC 무시 변이, binding 은 분기 밖·조건 미선언·거짓 conditional 변이로 확인했다. 검토 뒤 보완 red 증명: 운영 계약 실패의 exit 1 제거, 이관+Atlas 에서 Atlas 생략·소스 경로 단독 실행 제거, try 앞·e2e 한정 조기 종료, 부르지 않는 함수 안으로 옮긴 full 분기. 사용자 요청(2026-10-17). | [verify](../../scripts/verify.mjs), [pre-push 계약](../../scripts/pre-push-ref-contract.test.mjs), [registry 계약](../../scripts/governance-gates-contract.mjs), [훅 안내](../../.githooks/README.md) | 2026-10-17 | - |

## DEC-OPS-339

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-339 | accepted | **메뉴 스냅숏의 `sourceMigrationHash` 는 메뉴 inventory 에 닿을 수 있는 SQL 입력만 담는다(형식 v2).** ① 반복 시드 둘(`R__seed_framework`·`R__zz_seed_base_admin`)과 인가 Contract 는 늘 넣는다. ② versioned migration 은 의심스러우면 넣는다(fail-closed): 메뉴·권한 계열 낱말을 쓰거나(주석 포함), 이름 없이 닿는 수단(동적 SQL·dblink·search_path·TRUNCATE·DROP … CASCADE·함수·프로시저·트리거·규칙 정의·U& 이스케이프 식별자·ALTER DOMAIN)을 쓰거나, SQL 입력이 정의한 함수를 부르거나, 번지는 이름(전파 외래 키의 부모, 감시 이름을 쓰는 트리거·규칙이 걸린 테이블 — 같은 문장에서 달러 인용 본문을 못 찾는 정의가 있으면 쓰는 것으로 본다 —, 감시 이름을 읽는 뷰, 감시 테이블의 새 이름과 상속·파티션으로 이어진 테이블, 반복 시드가 읽는 테이블의 닫힘)을 쓰면 넣는다. 이벤트 트리거 정의가 있으면 모든 입력을 넣는다. 문장 단위 판정은 원문 조각과 주석만 걷은 조각의 합집합이다. 규칙의 정본은 검증기 머리 주석이다. ③ 스냅숏 내용은 그대로이고 해시 값과 접두(v2)만 바뀐다. 정본 대조(DB 번들 생성이 실제 적용 결과와 스냅숏 전체를 비교)는 그대로다. ④ 인덱스나 메뉴와 무관한 업무 테이블만 바꾼 migration 은 `npm run project:menus:refresh` 가 필요 없다. | 2026-09-01 이후 스냅숏 변경 24회 중 19회가 해시만 바꾼 교체였고, 그때마다 일회용 PostgreSQL 컨테이너 갱신과 해시 커밋이 따랐다. 실물 저장소에서 입력 132개 중 61개를 넣고 71개를 뺀다(V2_100 이후 19개가 빠진다). 옛 v1 식으로 현재 입력을 다시 해시하면 커밋된 값과 같아, 스냅숏 내용이 이 마이그레이션 집합의 결과임을 Docker 없이 확인했다. 정적 해시는 이른 신호이고, 놓치는 경우(문자열로 조립한 이름 등)는 마이그레이션을 바꾸는 변경의 CI 에서 DB 번들 내용 대조가 잡는다. red 증명: 무관한 인덱스 migration 은 해시 불변, 메뉴 테이블 UPDATE·뷰 경유 DELETE·전파 외래 키·시드 읽기는 갱신 요구. 검토 뒤 넓힌 경우(작은따옴표·BEGIN ATOMIC 본문과 불투명한 재정의, 이벤트 트리거, 번진 테이블의 RENAME, 주석·문자열 속 문장 경계, 상속·파티션, U&·ALTER DOMAIN)도 갱신 요구이고, 실물 포함 집합(입력 132개 중 61개)과 해시 값은 그대로다. 사용자 요청(2026-10-17). | [검증기](../../scripts/project-composer-menu-preview.mjs), [시험](../../scripts/project-composer-menu-preview.test.mjs), [메뉴 스냅숏](../../config/project-composer-menus.json), [생성기 가이드](../03-guides/project-composer-guide.md#메뉴-미리보기-자료-갱신) | 2026-10-17 | 메뉴 스냅숏 해시가 모든 migration·seed·인가 Contract SQL 을 입력으로 삼던 부분 |

## DEC-OPS-340

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-340 | accepted | **공용 메모리 행은 원장이 세는 수를 다시 적지 않고 원장에 링크한다(GAP-WIRING-001·GAP-ARCH-001).** ① GAP-WIRING-001 은 operation 수·unwired·화면 고아 상한을, GAP-ARCH-001 은 app→app·app→core edge 수를 걷고 각 원장(`operation-consumer-census.json` 의 `expected`, `cross-domain-coupling-census.json` 의 edge 정확 집합)에 링크한다. ② 공용 메모리 계약은 수치 일치 대조 대신 두 행의 원장 링크와, 그 라벨 가까이의 수치 표기(조사·기호·'수'·짧은 낱말 하나를 건넌 수, 'N개 라벨' 어순, 굵게 표시·띄어쓰기·화살표·대소문자 변형)가 어느 공용 메모리 행에도 없는지를 본다. 라벨에서 떨어진 문장 속 서술은 보지 않으므로 그 몫은 행이 수를 쓰지 않는다는 규약이 지킨다. ③ 프로토콜 §6.4 의 operation 수 재생성에서 GAP-WIRING-001 갱신을 걷는다. | 2026-09-01 이후(merge 제외) operation 원장을 바꾼 커밋 57개 중 50개, 결합 원장 17개 중 13개가 known-gaps.md 를 함께 바꿨고, 그중 45개·11개는 같은 메모리 행(GAP-WIRING-001·GAP-ARCH-001)을 다시 썼다. 같은 사실을 두 곳에 적은 데서 나온 비용이고, 빠뜨리면 pre-push 운영 계약을 다시 돌았으며 양쪽 브랜치가 같은 GAP 행을 고치면 merge:main 이 멈췄다. AGENTS.md 의 '정본은 하나'·'메모리는 결론·링크·다음 행동'과 CTX-008 의 선례를 따른다. 정본 게이트(배선 census 단조 래칫, 결합 원장 edge 정확 집합과 하네스)는 그대로라 판정 신호는 줄지 않는다. red 증명: 실제 행에 `unwired **10개**`·`unwired는 10개`·`app→app 0을` 을 넣거나 원장 링크를 지우면 붉다. 합성 시험이 우회 표기(조사·기호·어순·굵게 표시·띄어쓰기·화살표·대소문자)·링크·행 부재·다른 메모리 파일의 재진술을 red 로, 수 없는 라벨 언급·라벨을 품은 경로·ID·날짜를 green 으로 고정하고, 탐지기의 각 부분(다리·역순·대소문자·단위 없는 수의 배제·낱말 경계)을 걷으면 그 부분이 맡은 사례가 붉다. 사용자 요청(2026-10-17). | [공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs), [operation 원장](../../config/governance/operation-consumer-census.json), [결합 원장](../../config/governance/cross-domain-coupling-census.json), [Gap 인덱스](../../.agent/memory/known-gaps.md) | 2026-10-17 | DEC-OPS-090 ⑥ 의 공용 메모리 결합 수 대조, GAP-WIRING-001 수치 결속(2026-09-15 커밋 2c55b9924, DEC 없음) |

## DEC-OPS-341

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-341 | accepted | **메일·문자 발송을 접수 트랜잭션의 영속 작업으로 처리하고, 영속 작업 실행기를 전용 스케줄러·작업 스레드·유형별 상한·임대 갱신으로 운영한다(ADR-0033 이행).** ① `MailService`·`SmsService` 는 이력·수신자와 `MAIL_DELIVERY`·`SMS_DELIVERY` 의도를 같은 트랜잭션에 저장한다. 메일은 접수 `Q` → 발송 착수 `P` 선점(별도 트랜잭션) → 결과 `S`/`F` 이고, 결과 불명 `P` 는 자동으로 다시 보내지 않는다. 응답 코드는 `Q` 를 `P` 로 보인다. ② 메일 payload 는 접수 당시 주소의 암호문이고 성공·최종 실패 때 지운다. 지운 작업은 재처리 API 가 거절하며, 목록 응답의 `retryable` 이 같은 서버 판정을 싣고 화면은 그 값으로만 '다시 처리' 단추를 보인다. ③ 실행기는 poll·임대 갱신 전용 스케줄러와 대기열 없는 작업 스레드 4개, 유형별 로컬 상한(메일 2·문자 1), 30초 간격 120초 임대 갱신(같은 시도 식별자일 때만)을 쓴다. ④ 영속 의도를 거치지 않던 SMS 진입점(`processSending`)을 걷는다. ⑤ 메일 처리기가 온라인 암호(`CryptoUtil.encrypt`)를 직접 부르므로 이관 도구 보호 계약의 사용처 표에 사유와 함께 더한다 — 암호문은 운영 대기열 payload 의 한 필드라 이관 대상 컬럼이 아니며 보호 목록에는 넣지 않는다. | 커밋 뒤 비동기 제출은 제출 전에 프로세스가 끝나면 접수만 남고 발송이 사라졌다. 긴 외부 I/O 가 공용 poll 과 다른 유형의 처리 몫을 붙잡지 않게 한다. 실패 상태만 보고 둔 재처리 단추는 주소를 지운 메일 작업에서 누를 때마다 거절됐다(서버 판정을 화면이 그대로 말한다, DEC-OPS-145). 2026-10-18 사용자 선택(ADR-0033), 코덱스 구현, 통합 검토 보완. red 증명: 실행기·handler·`MailDeliveryStateIntegrationTest`·payload 보존 기본값 변이(코덱스 기록), `retryable` 은 `DurableWorkIntegrationTest` 와 화면 시험. | [ADR-0033](../02-architecture/decisions/ADR-0033-encrypted-mail-delivery-snapshot.md), [후속 작업 재처리](../04-operations/durable-work-recovery.md), [실행기](../../business-core/src/main/java/nuri/business/service/system/job/DurableWorkDispatcher.java), [화면](../../frontend/src/app/admin/system/durable-jobs/DurableJobsClient.tsx) | 2026-10-18 | 메일·SMS 의 커밋 후 `runAfterCommit` 비동기 제출(DEC 없음) |

## DEC-OPS-342

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-342 | accepted | **부서 계층·지정 ID 등록·첨부 묶음·메모 삭제·투표 항목 수정의 경합 경계를 잠금과 식별자로 닫는다.** ① 부서 계층 저장은 관련 부서 행을 ID 순으로 잠그고 최종 그래프에서 순환과 깊이 상한을 검사한다. 같은 배치에 같은 부서를 두 번 넣으면 400 이다. ② 공통코드 분류·그룹·코드, 행정 구역 코드, 권한 그룹의 신규 등록은 지정 ID 를 `insert` 로만 쓰고 merge 덮어쓰기를 막는다(경합은 409). ③ 첨부 묶음 추가와 메모 보고 삭제는 부모 행을 잠근다. ④ 온라인 투표 항목 수정은 `pollArtclSn` 으로 맞춘다. 요청에 없는 기존 항목은 지우고, 응답이 모인 항목의 삭제·이름 변경은 409, 기존 항목이 있는데 모든 항목에 ID 가 없으면 400 이다. ⑤ 투표 수정·삭제는 부모를 `FOR NO KEY UPDATE`, 투표는 `FOR SHARE` 로 잠가 수정과 투표는 직렬화하고 투표끼리는 기다리지 않는다. | 위치로 맞추던 항목 수정은 순서만 바뀌어도 결과가 다른 항목에 옮겨 붙었고, `save` 의 merge 는 동시 등록이 서로의 행을 덮었다. 현재 화면은 투표 수정에 항목을 보내지 않아 화면 동작은 그대로이며 API 계약 설명을 갱신했다. 코덱스 실측 결함 수정, 투표 공유 잠금은 통합 검토 보완. red 증명: 실제 PostgreSQL 통합 시험 변이 12건(코덱스 기록), 투표끼리 기다리지 않음은 `OnlinePollItemIntegrityIntegrationTest`, 배타 잠금 재도입은 단위 시험. | [부서](../../business-core/src/main/java/nuri/business/service/department/DeptManageService.java), [투표](../../business-app/src/main/java/nuri/business/service/survey/OnlinePollService.java), [투표 경합 시험](../../api-server/src/test/java/nuri/api/schema/OnlinePollItemIntegrityIntegrationTest.java), [지정 ID 시험](../../api-server/src/test/java/nuri/api/schema/AssignedIdentifierCreationIntegrityIntegrationTest.java) | 2026-10-18 | 온라인 투표 항목 수정의 위치 기준 매칭(DEC 없음) |

## DEC-OPS-343

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-343 | accepted | **주소록 쓰기 단추를 동작별 권한으로 보이고, 저장한 레이아웃 테마를 전역에서 복원하되 다크 모드와 기본색은 덮지 않는다.** ① 주소록 등록·수정·구성원 편집·삭제는 `ADBK_CREATE`·`ADBK_UPDATE`·`ADBK_DELETE` 로 보인다(구성원 삭제는 수정 요청이라 `ADBK_UPDATE`). 확인창이 열린 사이 권한을 잃으면 실행 직전에 다시 판정하고, 소유자·전체 권한 판정은 서버가 한다(DEC-OPS-185 와 같은 방식). ② 전역 테마 provider 가 새 로드에서 저장값을 복원한다. 다크 모드에서는 색 토큰을 덮지 않고, 기본색 그대로 저장한 값은 브랜드 프로필 색을 따르며, 반경은 모드와 무관하게 복원한다. | operation 원장의 무게이트 쓰기 5건을 닫았다. 테마 화면은 "이 브라우저에 저장" 이라고 말했지만 다음 로드에 사라졌다. 라이트에서 고른 색이 다크 블록을 덮으면 대비가 무너진다(`#0050ff` 는 다크 배경에서 약 3:1). 코덱스 구현, 다크·기본색 처리는 통합 검토 보완. red 증명: 주소록 권한·전역 복원 변이(코덱스 기록), 다크·기본색 판정은 `theme-provider` 시험에서 각각 걷으면 붉다. | [주소록 목록](../../frontend/src/app/admin/collaboration/address-book/select-address-book-list/AddressBookListClient.tsx), [테마 복원](../../frontend/src/lib/theme/layout-theme.ts), [provider](../../frontend/src/app/components/theme-provider.tsx), [operation 원장](../../config/governance/operation-consumer-census.json) | 2026-10-18 | - |

## DEC-OPS-344

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-344 | accepted | **CI 의 cross-stack 계약은 frontend 축이 켜지면 커버리지 전체 스위트가 소유하고, 커버리지 분모에 queries·extensions 를 넣으며, 화면 목록 생성기는 레이아웃 셸 제거를 원장 근거로만 받는다.** ① frontend 축이 켜진 실행에서는 `frontend-coverage-scope`(required `frontend-build` 에 집계)의 전체 스위트가 cross-stack 을 돌고, 꺼진 backend·Atlas 변경에서만 `secret-scan` 이 돈다. gate registry 는 두 실행 위치를 모두 결속한다. ② 프런트 커버리지 분모에 `src/queries`·`src/extensions` 를 넣고 슬롯 등록 생성물은 뺀다. 하한은 그대로다. ③ 화면 목록 생성기는 레이아웃 셸도 소비자 표에서 찾고, 파일이 없고 투영 원장에 정확히 기록됐을 때만 제거된 소비자로 받는다. | frontend 축 실행에서 같은 시험 파일이 두 번 돌았다(DEC-OPS-335 와 같은 성격). 화면이 실행하는 코드가 분모 밖에 있었다. 알림 없는 결재 구성에서 제거된 셸을 처리하지 못했고, 근거 없는 부재는 계속 실패해야 한다. red 증명: `required-checks-contract` 의 조건·실행 위치 변이, 생성 구성 3종의 원장 항목 누락(코덱스 기록). | [CI](../../.github/workflows/ci.yml), [gate registry](../../config/governance/gates.json), [커버리지 설정](../../frontend/vitest.config.mts), [화면 목록 생성기](../../scripts/generate-screen-registry.mjs) | 2026-10-18 | ci.yml 주석의 "몇십 초 중복이 증거를 잃는 것보다 싸다" 판단 |

## DEC-OPS-345

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-345 | accepted | **차트 범주 색을 브랜드 프로필의 `--chart-1..5` 토큰으로 두고 코드의 하드코딩 Hex 를 동결한다.** ① 두 프로필의 라이트·다크 블록에 `--chart-1..5` 를 두고(`@theme` 배선), 배경 대비 3:1 이상을 `status-token-contrast` 가 검사한다. ② 활성 차트·게이지·온보딩·커맨드 센터 배경의 Hex 를 토큰으로 바꾼다. 커맨드 센터 배경은 다크 모드에서 대화상자와 같은 값이 되지 않게 `background` 를 쓴다. ③ 코드의 Hex 는 테마 선택기 데이터(`layout-theme.ts`·레이아웃 관리 프리셋)만 허용하고 새 Hex 는 붉다. | 범주 색이 화면마다 Hex 로 흩어져 브랜드 프로필·다크 모드를 따르지 않았다(DEC-OPS-014 의 토큰 원칙). 제미나이 작업분(Track A-3), 커맨드 센터 다크 배경은 통합 검토 보완. red 증명: 무작위 컴포넌트에 Hex·`bg-[#…]` 를 넣으면 붉다(제미나이 기록, 통합 검토 재현). | [디자인 토큰](../03-guides/design-tokens.md), [대비 계약](../../frontend/src/__tests__/status-token-contrast.test.ts), [Hex 동결](../../frontend/src/__tests__/hardcoded-color-guard.test.ts) | 2026-10-18 | - |

## DEC-OPS-346

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-346 | accepted | **대형 화면·서비스·이관 도구 클래스를 동작을 바꾸지 않고 나누며, 단일 파일을 읽던 계약은 나뉜 파일 전체로 넓힌다.** ① 화면: 노트, 사용자·조직, 공통코드, 결재 기안의 표시·순수 함수 조각만 옮기고 쓰기 호출과 권한 판정은 화면 파일에 둔다. ② 서비스: 결재·게시판·인가 관리의 읽기 조립·정책 헬퍼를 같은 패키지의 정적 협력 클래스로 옮기고, 트랜잭션·권한 집행·조회는 서비스에 둔다. ③ 이관 도구: 매핑·원장 검증기와 ETL 실행기의 보조 책임을 나누고 실행 계약 핵심 클래스에 결속한다. 실행 계약 digest 가 바뀌므로 기존에 승인한 이관 plan 은 다시 승인한다. ④ 옮긴 코드를 읽던 원장·계약(폼 검증·라우트 기능·URL 상태·정직성·접근성·민감 콘솔·게시판 통계)은 새 파일까지 읽는다. ⑤ A1 채택 census 는 같은 폴더의 셸 화면이 `./조각` 으로 불러 쓰는 파일을 그 화면의 일부로 센다 — 화면을 나눠도 직접 조립 판정이 바뀌지 않는다. ⑥ 쓰기 권한 표시 census 는 판정을 마친 importer 의 결과를 기억한다 — 권한을 보는 화면이 직접과 중간 조각을 거쳐 두 길로 여는 조각(결재 기안 → 저장 결재선 패널 → 결재자 선택기)을 두 번째 길에서 순환으로 보고 부채로 세지 않는다. 판정 중인 파일로 되돌아오는 순환만 거짓이다. | 한 파일에 1천 줄 넘게 모인 화면·서비스·실행기를 기능 변경과 섞지 않고 분해한다(제미나이 계획의 사용자 검토 판정). 파일을 옮기면 단일 파일 계약이 빈 검사가 될 수 있다(H2). 제미나이 작업분(Track A-4·B·C), 통합 검토가 좁아진 계약 2건(접근성 미선택 안내·게시판 통계), 분리로 셸 화면의 조각을 직접 조립 화면으로 센 census 오탐 2건(공통코드 상세 표·사용자·조직 조각), 마름모 import 를 순환으로 본 쓰기 권한 표시 census 의 결함, 지워진 설계 근거 주석을 바로잡았다. red 증명: 확장한 계약마다 의도적 위반(제미나이 기록), 접근성·게시판 통계 계약은 통합 검토 변이로 재확인, census 는 조각을 부르는 화면이 셸을 떠나면 조각과 화면이 함께 직접 조립으로 붉어짐을 확인, 마름모 회귀 시험은 고치기 전 판정에서 붉고 중간 조각을 권한 없는 화면도 열면 여전히 부채로 센다. | [노트 화면](../../frontend/src/app/note/NoteHubClient.tsx), [게시판 정책 조각](../../business-app/src/main/java/nuri/business/service/board/BoardPolicySupport.java), [이관 실행 계약](../../migration-tool/src/main/java/nuri/migration/artifact/MigrationExecutionContract.java), [복구 런북](../04-operations/migration-recovery-runbook.md) | 2026-10-18 | - |

## DEC-OPS-347

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-347 | accepted | **410만 돌려주던 구 롤·롤 권한·권한 쓰기 API 12개 operation 을 경로째 걷는다(ADR-0034).** ① `RoleApiController`(6)·`AuthorRoleApiController`(2)와 권한 API 의 등록·수정·삭제·일괄 삭제(4)를 걷는다. 화면이 쓰는 권한 목록·단건·메뉴 조회는 남긴다. ② 정책 원장·operation 원장·API 계약에서 함께 빼고, 걷은 서비스·DTO·시험과 던지는 곳이 없어진 오류 코드 C015(`AUTHORIZATION_ENDPOINT_RETIRED`)·메시지 키도 지운다. ③ `AuthorManageDto` 는 조회 응답으로 남아 입력 계약 원장과 하한은 그대로다. ④ 걷은 경로는 원장에 없는 연산이라 디스패치 전에 거부된다 — 관리자도 403, 미인증 401 을 RBAC 시험이 고정하고, 권한 상승 시험은 남은 관리자 전용 쓰기 경로(권한 그룹 삭제)로 옮긴다. ⑤ 전환 런북의 '구 관리 API 410' smoke 항목을 이 응답으로 고친다. | 410 은 호출자를 새 API 로 옮기라는 신호였고 저장소의 프런트·E2E 에는 호출자가 없다. 실제 동작 없는 표면이 API 계약·정책 원장에 계속 집계됐다. red 증명: 걷은 경로 자리에 살아 있는 경로를 넣으면 RBAC 시험이 200 을 잡아 실패한다. 2026-10-18 사용자 선택("둘 다 정리"). | [ADR-0034](../02-architecture/decisions/ADR-0034-retire-ended-authorization-surfaces.md), [전환 런북](../04-operations/authorization-cutover-runbook.md), [입력 계약 게이트](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java) | 2026-10-18 | ADR-0016 '영향과 검증'의 종료 API 무변경 거부(410) 부분(ADR-0034) |

## DEC-OPS-348

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-348 | accepted | **결재 API 로 대체된 비공식결재(ISM) API 를 걷고 INFORMAL_* 권한 10개를 퇴역한다(ADR-0034).** ① `InformalSanctionApiController` 의 두 기본 경로(`/api/v1/informal-sanctions`·`/api/v1/admin/system/ism`) 6개 operation 과, 그 API 만 쓰던 서비스 메서드(제자리 수정·받은 목록)를 걷는다. 화면 별칭 `/admin/system/ism` → `/approvals` 는 그대로다. ② INFORMAL_* 10개를 권한 카탈로그·정책·묶음·기본 시드에서 뺀다. APPROVAL_* 를 묵시로 주지 않는다(H3). ③ V2_130 이 기존 배정을 지우고 같은 트랜잭션에 REMOVE 이력을 남긴다(V2_124 선례). ④ 결재 기능은 RBAC demo 매트릭스의 소유 기능에서 빠진다 — 그 몫이던 ISM 승인 단언이 API 와 함께 사라졌고, 결재 시작 구성의 기대 게이트에 그 시험 제외를 사유와 함께 둔다. | 결재 API 가 같은 서비스로 목록·상세·등록·승인·삭제를 덮고, 프런트·E2E 의 ISM API 호출은 0건이었다. 원장에 없는 권한 배정이 남으면 권한 스냅샷이 fail-closed 로 실패해 그 그룹 구성원의 인증이 막힌다. 2026-10-18 OCI 읽기: 25행(ROLE_ADMIN 10, ROLE_SYSTEM 10, ROLE_USER 5). 공유 OCI 적용은 병합 뒤 별도 승인이다. red 증명: V2_130 의 삭제를 무력화하면 마이그레이션 시험이 남은 25행을 잡는다. 2026-10-18 사용자 선택("둘 다 정리"). | [ADR-0034](../02-architecture/decisions/ADR-0034-retire-ended-authorization-surfaces.md), [V2_130](../../api-server/src/main/resources/db/migration/V2_130__retire_unenforced_permission_grants.sql), [권한 원장](../../config/governance/permission-catalog.json) | 2026-10-18 | DEC-OPS-053 의 ISM API superseded-surface 등재(표면 제거로 종료) |

## DEC-OPS-349

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-349 | accepted | **집행 지점이 없던 기관코드 쓰기 권한 INST_CODE_CREATE·UPDATE·DELETE 를 퇴역한다.** ① 권한 카탈로그·정책·묶음·기본 시드에서 빼고 V2_130 이 기존 배정을 지우며 REMOVE 이력을 남긴다. ② 조회(INST_CODE_READ)와 수신 반영(INST_CODE_IMPORT)은 그대로다. ③ 로그인 정책의 `dpcn_prm_yn` 컬럼은 유지한다(GAP-LOGIN-001 그대로). | 2026-10-07 기관코드 원장 쓰기 경로를 걷은 뒤 어느 연산도 이 권한을 요구하지 않았다(GAP-CODE-001). 2026-10-18 OCI 읽기: 6행(ROLE_ADMIN·ROLE_SYSTEM × 3). 컬럼 제거는 Expand-Contract 와 관측 기간이 필요한 스키마 변경이라 이번에 하지 않는다. 2026-10-18 사용자 선택("INST_CODE 권한만 퇴역"). | [V2_130](../../api-server/src/main/resources/db/migration/V2_130__retire_unenforced_permission_grants.sql), [GAP-CODE-001](../../.agent/memory/known-gaps.md) | 2026-10-18 | GAP-CODE-001 의 '쓰기 권한 퇴역은 별도 결정' 부분 |

## DEC-OPS-350

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-350 | accepted | **next.config 리다이렉트 뒤에서 실행될 수 없던 `/admin/observability`·`/admin/system/audit` 를 redirect 스텁으로 바꾸고 그 화면 전용 코드를 지운다.** ① 두 `page.tsx` 는 next.config 와 같은 목적지(감시 허브의 관측·시스템 탭)로 보내는 `redirect()` 스텁이다. 라우트 원장 행은 남기고 스텁 목적지를 기록한다. ② 전용 코드(`ServiceTopology`·`AuditTimelineClient`·`TimelineItem`·관측성 대시보드 지표 조회)와 그 시험을 지운다. 감시·통계 허브가 쓰는 차트와 대시보드의 감사 타임라인은 남긴다. ③ 그 코드를 읽던 가드(상태 색·진입 애니메이션·단일 머리글·고정 높이·셸 접근성)는 표면 제거만큼 맞추고, P2 일관성 단언은 같은 불변식을 지닌 감시 허브 관측 탭으로 옮긴다. | next.config 의 무조건 리다이렉트가 먼저 적용돼 두 화면은 실행될 수 없었는데, 코드·가드·원장은 살아 있는 화면처럼 셌다. 라우트를 지우지 않는 것은 문자열 URL 참조의 오삭제 선례(V2_30) 때문이다. red 증명: 남은 화면에 상태 색 리터럴을 넣으면 상태 색 가드가, 스텁 목적지를 바꾸면 라우트 원장 계약이 실패한다. 2026-10-18 사용자 선택("redirect 스텁 + 전용 코드 제거"). | [관측성 스텁](../../frontend/src/app/admin/observability/page.tsx), [감사 스텁](../../frontend/src/app/admin/system/audit/page.tsx), [라우트 원장](../../config/ui-route-capabilities.json) | 2026-10-18 | V2_48 주석의 /admin/system/audit 실기능 판정과 "추측으로 지우지 않는다"(실행 불가 실측으로 종료) |

## DEC-OPS-351

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-351 | accepted | **V2_130 을 공유 OCI DB 에 적용한다(2026-10-18 사용자 승인 — 집행 지점 없는 권한 배정 정리, PR #932 병합 뒤).** 병합본(347e616ac)에서 꺼낸 마이그레이션 폴더로 사전 읽기(스키마 2.129, 퇴역 배정 31행: INFORMAL_* 25·INST_CODE 쓰기 6) → info(대기 2.130 과 반복 시드 하나) → pg_dump 백업(목차 확인) → Flyway 12.4.0 migrate → validate(154개) 순서로 했다. dev 시드 위치(`db/seed-dev`)는 OCI 에 적용한 적이 없어 넣지 않았다. 읽기 확인: 남은 퇴역 배정 0, `migration:2.130` 이력 31행(DEC-OPS-348 25·349 6, 권한 원장 버전 1개), INST_CODE_READ·IMPORT 배정 4행 유지. | DEC-OPS-348·349 의 배정 정리다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 반복 시드는 권한 배정이 빈 새 DB 에서만 배정을 넣어 OCI 데이터를 바꾸지 않았다. 원본은 적용 직전 백업이다. | [V2_130](../../api-server/src/main/resources/db/migration/V2_130__retire_unenforced_permission_grants.sql), [전환 런북](../04-operations/authorization-cutover-runbook.md), [DEC-OPS-348](../../.agent/memory/decisions.md) | 2026-10-18 | - |

## DEC-OPS-352

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-352 | accepted | **operation census 의 화면 고아·미배선을 다시 분류한다(GAP-WIRING-001).** ① 메뉴 서비스의 죽은 경로 3개를 걷는다 — 권한별 메뉴 할당 저장(서버가 늘 400 으로 통합 권한 화면을 안내한다), 권한별 메뉴 생성 관리 목록(권한 화면이 getAuthors·getAuthorMenus 로 읽는다), 페이지 검색 메뉴 목록(모든 메뉴 화면이 전체 트리로 그린다). 세 연산은 원장에 대체된 표면으로 적는다. ② 근거가 낡은 미배선 셋을 대체된 표면으로 옮긴다 — 권한별 메뉴 목록(getAuthorMenus 와 같은 값), 가입(DEC-OPS-135 로 USER_CREATE 에 묶여 관리자 등록 insertUser 와 같은 일), 사용자 접속 통계(홈 차트가 없고 통계 화면은 관리자 연산을 쓴다). 아이디 중복 확인·기관코드 상세·개인 일정 목록은 사유만 고친다. ③ 남은 화면 고아 25개(단건 조회 21, 결정 선행 4 — 발신 메일 상세·주소록 사용자 검색·커뮤니티 포틀릿·기간별 일정)는 두고 래칫을 실측값(미배선 7, 화면 고아 25)으로 내린다. 백엔드 엔드포인트는 걷지 않는다. | 원장 사유가 코드와 어긋나 래칫이 부채를 과장했고, 서버가 늘 거부하는 저장 경로가 살아 있는 것처럼 남아 있었다. 단건 조회는 래칫을 내리려고 배선하지 않는다(DEC-OPS-062). 2026-10-16 브랜치(chore/wiring-orphan-cleanup)에 DEC-OPS-336 으로 적었으나 병합 전에 그 번호가 main 의 다른 결정에 쓰여, 2026-10-18 main 위로 옮기며 번호를 새로 받았다(사용자 "필요하면 바로 진행"). red 증명: 걷은 메서드를 되살리면 화면 고아 28/25 와 해소된 원장 항목 3건으로 census 가 붉다. | [census 원장](../../config/governance/operation-consumer-census.json), [메뉴 서비스](../../frontend/src/services/foundation/system/MenuAdminService.ts), [GAP-WIRING-001](../../.agent/memory/known-gaps.md) | 2026-10-18 | operation census 원장의 가입·사용자 접속 통계·권한별 메뉴 목록 미배선 사유(DEC 없음) |

## DEC-OPS-353

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-353 | accepted | **슬롯 기여의 연동 분류를 소스로 대조한다(GAP-COMPOSE-001).** ① 소비자 표의 파일마다 종류를 적는다(`SLOT_CONSUMER_KINDS`) — 항목을 그리는 셸(shell)과, 값을 다른 화면에 넘기는 값 소비자(value: 넘기는 export 이름과 읽는 기여 선택자)다. 레지스트리를 import 하는 파일이 선언에 없거나 선언된 소비자가 import 하지 않으면 카탈로그가 로드되지 않는다. ② 값 소비자의 export 를 쓰는 importer 에서 core 파일(확장자 무관, 타입 전용 참조 제외)을 지나 다른 기능 소유 화면을 reader 로 찾고, 선택자가 고른 기여에만 붙인다. importer 없는 core 진입점은 reader 'core' 다. 판정할 수 없는 슬롯은 그 기여만 건너뛴다. ③ reader G 가 기여 F 없이 구성될 수 있으면 그 기여는 registrationOnly 일 수 없고, G→F 연동이 anchor 나 `contributions`(종류 무관)로 덮어야 한다. 덮는 연동의 from 은 reader 여야 한다. ④ 실제 결과는 셋이다: 주소록→메일·문자(기존 anchor), 알림 전달 채널→결재·메모 보고(두 알림 연동의 `contributions`), 메모 보고 링크→업무 보고(새 연동 report→memoreport). | DEC-OPS-327 에서 알림 채널 기여를 registrationOnly 로 적은 실수를 사람의 리뷰가 잡았다. ④ 의 셋째는 확장자로 셸을 가리던 첫 구현이 놓쳤다(`.tsx` 안의 값 훅). 값 소비자 선언은 손으로 적지만 importer 집합·선택자를 원본과 대조한다. 기능 선언 해시가 바뀌어 로컬 DB 번들을 다시 만든다. red 증명 13종. 2026-10-16 브랜치(feat/composer-slot-degradation)에 DEC-OPS-335 로 적었으나 병합 전에 그 번호가 main 의 다른 결정에 쓰여, 2026-10-18 main 위로 옮기며 번호를 새로 받았다(사용자 "필요하면 바로 진행"). | [소비자 종류](../../scripts/slot-registry.mjs), [reader 계산](../../scripts/project-composer-slot-readers.mjs), [분류 대조](../../scripts/project-composer-integrations.mjs) | 2026-10-18 | DEC-OPS-327 의 알림 전달 채널 기여 registrationOnly 분류 |

## DEC-OPS-354

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-354 | accepted | **로그인 실패 횟수를 행 잠금 안에서 올리고, 로그인 요청 제한 기본값을 낮춘다(ADR-0035).** ① 비밀번호 대조(bcrypt)는 잠금 밖에서 하고, 실패하면 사용자 행을 `PESSIMISTIC_WRITE` 로 다시 읽어 상태를 다시 판정한 뒤 횟수를 올리고 잠금을 정한다. 그 사이 비밀번호가 바뀌었으면 새 해시로 다시 대조한다. `noRollbackFor`·잠금 분·없는 계정의 시간 균등화·단일 401 은 그대로다. ② 로그인 버킷 기본값을 IP당 분당 2,000 에서 30 으로 낮추고 전체 10,000 은 둔다. E2E 프로파일만 종전 값으로 덮어쓴다. | 동시 실패 요청이 서로의 증가분을 덮어 잠금 임계값보다 많이 대입할 수 있었고, 기본값 2,000 은 계정을 돌아가며 대입하는 공격을 막지 못했다(2026-10-19 품질 평가 과제 2·4, 사용자 지시 "모두 완료할 때까지"). red 증명: 잠금 재조회를 걷으면 동시 실패 4건이 1로 기록되는 PostgreSQL 시험이 실패한다. 남은 위험: 관리자 사용자 수정처럼 다른 경로의 전체 행 저장이 동시에 일어나면 횟수를 옛 값으로 덮을 수 있다(종전부터). | [ADR-0035](../02-architecture/decisions/ADR-0035-login-rate-limit-default.md), [인증 처리](../../business-core/src/main/java/nuri/business/security/iam/EgovAuthenticationProvider.java), [요청 제한](../../business-core/src/main/java/nuri/business/security/filter/RateLimitFilter.java) | 2026-10-19 | ADR-0019 결정 6의 로그인 기본값과 관측 뒤 인하 순서(ADR-0035) |

## DEC-OPS-355

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-355 | accepted | **주소록 구 사용자 검색을 걷고, 사용자 목록의 연락처를 가리며, 개인정보 조회 기록에 정보주체를 남긴다.** ① `GET /api/v1/address-books/search-users`(연락처를 돌려주던 구 계약)를 걷는다. 연락처 없는 `/user-selections` 는 그대로다. ② 관리 사용자 목록 응답은 휴대전화·이메일을 가리고, 상세는 원문을 보이며 조회 기록을 남긴다. 목록은 입력 규칙이 없는 응답 전용 `UserListItemDto` 로 나간다 — 등록·수정용 `UserDto` 의 이메일 형식 규칙이 응답 스키마에 실려 가린 이메일을 화면 응답 검증이 거부했기 때문이다(첫 PR CI 의 E2E 가 잡았다). 사용자 수정 폼은 상세가 온 뒤에만 열고, 가린 값(`*` 포함)의 저장은 400 으로 거부한다. ③ V2_131 이 `tb_privacy_log.trpr_id`(용어 TRPR_ID 대상자아이디)를 더하고, 한 사람을 대상으로 한 조회(사용자 상세, 수신자가 한 명인 문자 수신자 조회)는 그 내부 키를 기록한다. 목록 조회는 비운다. | 일반 사용자 기본 권한만으로 두 글자 검색이 활성 사용자의 이메일·휴대전화를 돌려줬고, 사용자 목록은 연락처를 원문으로 실었으며, 조회 기록에는 누구의 정보를 봤는지가 없었다(2026-10-19 품질 평가 과제 3·5, 사용자 선택 "전부 진행"). 남긴 것: 외부인사 목록은 상세 API 가 없고 수정 폼이 목록 항목으로 채워져 이번에 가리지 않았다. 사무실 전화는 가리지 않는다. | [V2_131](../../api-server/src/main/resources/db/migration/V2_131__add_logout_cutoff_and_privacy_log_subject.sql), [감사 aspect](../../api-server/src/main/java/nuri/api/interceptor/SensitiveResponseAuditAspect.java), [사용자 목록](../../business-core/src/main/java/nuri/business/domain/user/repository/UserRepositoryImpl.java) | 2026-10-19 | 구 search-users 계약을 외부 소비자 확인 전까지 유지하던 판단(evidence-first-policy-decisions-2026-09-27.md) |

## DEC-OPS-356

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-356 | accepted | **로그아웃하면 그 사용자의 액세스 토큰을 끊는다.** ① V2_131 이 `tb_user_info.last_lgt_dt`(용어 LAST_LGT_DT)를 더하고, 로그아웃이 인증 주체나 저장값과 일치하는 리프레시 토큰의 주인에 대해 애플리케이션 시계로 기록한다. 쓰기는 원자 UPDATE 한 곳이고 엔티티는 읽기 전용으로 매핑해 전체 행 저장이 옛 값으로 덮지 못한다. ② 토큰 검증은 비밀번호 변경과 같은 초 단위 비교로 그 시각 이전에 발급된 액세스 토큰을 거부하고, WebSocket 은 연결 시점과 열린 연결 모두 끊는다. ③ 사용자당 세션 하나인 모델(DEC-OPS-158)이라 모든 토큰을 끊는다. E2E 의 로그아웃 시험은 공유 인증 상태 대신 일회용 주체를 쓴다. | 로그아웃 뒤에도 액세스 토큰이 만료(최대 1시간)까지 유효했다(2026-10-19 품질 평가 과제 13, 사용자 선택 "전부 진행"). 여러 노드에서는 시계 동기화를 전제하며, 늦은 노드가 발급한 토큰은 그 차이만큼 거부될 수 있다(안전한 쪽 실패). | [토큰 검증](../../foundation/src/main/java/nuri/foundation/security/jwt/JwtTokenProvider.java), [로그아웃](../../business-core/src/main/java/nuri/business/service/auth/impl/AuthServiceImpl.java), [V2_131](../../api-server/src/main/resources/db/migration/V2_131__add_logout_cutoff_and_privacy_log_subject.sql) | 2026-10-19 | - |

## DEC-OPS-357

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-357 | accepted | **감사 원장 세 표(`tb_sys_adt_log`·`tb_authrt_chg_hstry`·`tb_privacy_log`)의 수정과 임의 삭제를 DB 트리거로 막는다.** ① UPDATE 는 언제나 거부하고, DELETE 는 같은 트랜잭션이 `SET LOCAL app.audit_retention = 'on'` 으로 보존 정리를 선언했을 때만 허용한다. ② 보존 정리(LogRetentionScheduler 의 개인정보 접근 기록·민감 작업 감사)가 삭제 트랜잭션 안에서 선언한다. 권한 변경 이력에는 보존 정리 경로가 없어 선언 없이는 지울 수 없다. ③ 세 표의 앱 쓰기 경로가 INSERT 뿐임을 전수 확인했다. | 고칠 수 있는 감사 기록은 증거가 되지 못한다 — 앱 버그·잘못 쓴 관리 SQL·주입이 행을 바꾸거나 지워도 DB 가 막지 않았다(2026-10-19 품질 평가 과제 13, 사용자 선택 "전부 진행"). 한계: 표 소유자·DB 관리자의 트리거 해제와 문장 단위 비우기(TRUNCATE)는 막지 않는다 — 운영 계정 분리 몫이다. TRUNCATE 트리거는 무중단 린터가 `TRUNCATE` 문자열을 파괴적 DDL 로 읽어 두지 않았다. | [V2_132](../../api-server/src/main/resources/db/migration/V2_132__protect_audit_ledgers_from_modification.sql), [보존 정책](../04-operations/log-retention-policy.md) | 2026-10-19 | - |

## DEC-OPS-358

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-358 | accepted | **기록이 로그인 ID 로 소유를 판정하는 표에 남은 ID 는 새 계정에 다시 주지 않는다.** ① foundation 포트 `LoginIdReferenceContributor` 를 core(첨부 원장·부서 업무)와 기능마다(`loginid/` 12개) 구현해, 소유·작성 판정에 쓰는 컬럼 19개를 등록한다. business-core 는 business-app 을 import 하지 않는다. ② 사용자 등록은 `LoginIdReuseGuard` 로 그 컬럼들에 같은 ID 가 남아 있으면 일반 중복과 같은 `DUPLICATE_USER_ID` 로 거부해 더 알리지 않는다. 조회가 실패하면 등록을 막는다(fail-closed). ③ 대상은 업무보고·일정(등록자·담당자·일지)·메모 보고·부서 업무 대체 판정·업로더 첨부와 첨부 원천 10개, 주소록·댓글·스크랩·만족도·투표 참여다. 응답 취소가 계정 생성 시각으로 이미 거르는 설문 응답, 기능 권한으로만 판정하는 표의 감사용 등록자, esntlId 로 판정하는 표는 대상이 아니다. | 사용자는 행이 실제로 지워지는데 ID 중복 검사는 현재 사용자만 봐서, 지운 ID 로 새 계정을 만들면 옛 기록의 소유권이 넘어갔다(2026-10-19 품질 평가 과제 1, 사용자 선택 "남은 기록의 ID 는 재사용 금지"). 스키마는 바꾸지 않는다. 남은 경계: 새 기능이 로그인 ID 로 소유를 판정하는 표를 더하면 기여를 함께 등록해야 한다 — 기능 선언의 포트 연결과 카탈로그 시험이 빈 기여를 잡지만 컬럼 누락은 리뷰 몫이다. | [판정기](../../business-core/src/main/java/nuri/business/service/user/LoginIdReuseGuard.java), [포트](../../foundation/src/main/java/nuri/foundation/core/user/LoginIdReferenceContributor.java), [통합 시험](../../api-server/src/test/java/nuri/api/schema/LoginIdReuseIntegrationTest.java) | 2026-10-19 | - |

## DEC-OPS-359

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-359 | accepted | **동시 수정을 버전으로 막고 잠금 대기에 상한을 둔다.** ① V2_133 이 업무보고·일정·부서 업무·포상·배너·팝업·설문(머리)·공통코드 분류·코드·상세 10개 표에 `version integer NOT NULL DEFAULT 0`(음수 CHECK)을 더하고 엔티티는 `@Version` 을 쓴다(게시판·결재의 선례). ② 읽기 응답이 version 을 싣고, 수정 요청에 version 이 없으면 400, 다르면 409 `CONCURRENT_MODIFICATION` 이다. 대조는 인가 판정 뒤에 한다. 같은 DTO 가 응답에도 쓰여 필수 판정은 DTO 가 아니라 서비스가 한다. 부서 업무의 일괄 담당자 해제도 버전을 올린다. ③ 화면 9곳이 읽은 버전을 보내고 409 면 서버 사유를 보이며 다시 읽는다. ④ `jakarta.persistence.lock.timeout` 5000ms 를 운영·시험 설정 양쪽에 두고, 넘으면 기존 잠금 실패(409)로 끝낸다. | 버전 검사가 소수 엔티티에만 있어 나머지 화면은 나중 저장이 조용히 이겼고, 비관적 잠금은 대기 상한이 없었다(2026-10-19 품질 평가 과제 8, 사용자 선택 "버전 검사 도입 + 잠금 대기 상한"). `version` 은 표준 단어가 없는 기술 컬럼이라 처분안의 C(예외 후보)에 든다 — GAP-STD-001 의 용어 없는 컬럼 수가 10 늘어난다. 공유 OCI 적용은 병합 뒤 별도 승인이다. | [V2_133](../../api-server/src/main/resources/db/migration/V2_133__add_optimistic_version_columns.sql), [버전 대조](../../foundation/src/main/java/nuri/foundation/core/util/EntityVersions.java), [잠금 대기 시험](../../api-server/src/test/java/nuri/api/schema/LockWaitTimeoutIntegrationTest.java) | 2026-10-19 | - |

## DEC-OPS-360

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-360 | accepted | **화면에서만 하던 검사를 서버가 맡는다.** ① 팝업 게시 종료일이 시작일보다 앞서면 400 이다. ② 포상은 수상자·포상 코드가 비면 400, 포상 일자는 기존 날짜(Ymd) 형식 검증을 쓴다. ③ 없는 공통코드(분류·코드·상세)의 수정·삭제와 없는 배너의 삭제는 200 대신 404 다. ④ 일정은 서버가 시작일을 요구하고(월 조회가 시작일로 걸러 없는 일정이 사라졌다) 두 입력 화면도 필수로 받으며, 조회 월은 yyyyMM 이 아니면 400 이다. ⑤ 입력 계약 원장의 필수·날짜 하한을 실측대로 올린다. | 화면을 거치지 않은 요청이 순서가 뒤집힌 기간·형식이 틀린 날짜를 저장했고, 없는 코드를 고쳐도 성공으로 답했다(2026-10-19 품질 평가 과제 10). 배너 표에는 게시 기간 컬럼이 없어 기간 검사는 해당하지 않는다. 기존 행 가운데 새 규칙에 맞지 않는 것은 OCI 적용 전 읽기 집계로 확인한다. | [입력 계약 원장](../../config/governance/input-contract-mirror-census.json), [입력 계약 게이트](../../api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java) | 2026-10-19 | - |

## DEC-OPS-361

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-361 | accepted | **탭·초점·대형 화면·시각 표시를 정리한다.** ① `StandardTabs` 를 의존성 없이 다시 써 tablist·tab·tabpanel·aria-selected·aria-controls 와 roving tabindex·방향키·Home/End(끝에서 돌기, 꺼진 탭 건너뛰기, 자동·수동 활성화)를 갖춘다. 손으로 만든 탭 15곳을 옮기고, 손으로 쓴 `role="tablist"`·`tab`·`tabpanel` 은 기존 lint 규칙(`no-restricted-syntax`)이 막는다 — 새 게이트를 두지 않았다. 이미 Radix Tabs 인 화면과 라우트 링크·토글은 탭이 아니라 남긴다. ② 초점 윤곽을 지우던 단추·입력을 고치고 base 레이어에 우선순위 0 의 `:focus-visible` 기본 윤곽을 둔다. ③ 결재 허브·사용자/조직 허브·메뉴 관리·설문 문항 패널의 가장 큰 함수를 389~407줄로 나눈다. 파일 단위 census 가 읽는 쓰기 처리기·권한 리터럴·페이지 크기·URL 읽기는 허브 파일에 남기고, 나뉜 파일까지 계약을 넓힌다. ④ 후속 작업 화면은 UTC 로 저장한 시각을 한국 시각으로 보인다. | 화면마다 만든 탭 대부분에 방향키 이동·탭 패널 연결이 없었고, 천 줄이 넘는 화면 함수가 여럿이었으며, 후속 작업 시각이 한국 시간과 어긋났다(2026-10-19 품질 평가 과제 12·14). 분해 중 권한 훅을 다른 파일로 옮기자 쓰기 권한 census 의 판정 없음이 늘어 되돌렸다 — census 가 파일 단위라 분해 위치가 신호를 바꾼다. Radix 로 바꾸지 않은 것은 선택 이벤트·id 생성·패널 구조가 기존 E2E 와 단일 패널을 깨기 때문이다. | [탭 원천](../../frontend/src/app/components/ui/standard-tabs.tsx), [탭 시험](../../frontend/src/app/components/ui/__tests__/standard-tabs.test.tsx), [lint 가드](../../frontend/eslint.config.mjs) | 2026-10-19 | - |

## DEC-OPS-362

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-362 | accepted | **쓰지 않는 백엔드 의존성 7종을 걷는다.** Spring Batch(infrastructure·starter)·egovframe-rte-bat-core·starter-quartz·commons-net·jdom2·commons-dbcp2·scribejava(apis·core)는 소스 import·설정·자동 구성 제외 목록 어디에도 쓰는 곳이 없었다. 배치·예약 작업은 `@Scheduled` 와 `tb_sys_job` 내구 원장(ADR-0025)이, 커넥션 풀은 HikariCP 가 맡는다. 되살릴 때는 쓰는 코드와 함께 넣는다. | 선언만 있는 의존성은 공급망 노출과 운영 jar 크기만 늘렸다(2026-10-19 품질 평가 과제 7). api-server runtimeClasspath 비교에서 빠진 것은 이들과 이들만 끌어오던 전이 의존성 18개(운영 jar 에 섞여 있던 spring-batch-test 포함)이고, 남은 라이브러리의 버전 변화는 0건이다. 전체 컨텍스트 시험이 그대로 뜬다. spring-retry 는 백엔드 모듈들이 직접 선언해 남으므로 유지 판단(DEC-OPS-125)은 바뀌지 않는다. SAST-FP-007 은 빌드 파일 변경을 재검토해 다시 결속했다. | [api-server 빌드](../../api-server/build.gradle), [버전 카탈로그](../../gradle/libs.versions.toml), [spring-retry 판단](../04-operations/readiness-followups.md#후속-정리-2026-09-24) | 2026-10-19 | - |

## DEC-OPS-363

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-363 | accepted | **V2_131·V2_132 를 공유 OCI DB 에 적용한다(2026-10-19 사용자 승인, PR #936 병합 뒤).** 병합본(bffa8be8d)에서 꺼낸 마이그레이션 폴더로 사전 읽기(스키마 2.130, 두 컬럼·트리거·`fn_adt_log_chg_prhb` 없음, 용어 TRPR_ID 없음·LAST_LGT_DT 있음, 감사 세 표 130·834·6행) → info(대기 2.131·2.132 뿐, 반복 시드는 다시 돌지 않음) → pg_dump 백업(목차에 영향 표 확인) → Flyway 12.4.0 migrate → validate(156개) 순서로 했다. dev 시드 위치는 넣지 않았다. 읽기 확인: 두 컬럼 nullable(`timestamp`·`varchar(20)`), 트리거 3개 활성, 용어 TRPR_ID(대상자아이디·명V20) 1행, 감사 세 표 행 수 불변, 로그아웃 시각이 있는 사용자 0. | DEC-OPS-355·356·357 의 스키마다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 트리거가 걸린 뒤로 세 감사 표의 UPDATE 와 보존 정리 밖의 DELETE 는 OCI 에서도 거부된다 — 표 소유자의 트리거 해제·TRUNCATE 는 막지 않는다(DEC-OPS-357). 원본은 적용 직전 백업이다. | [V2_131](../../api-server/src/main/resources/db/migration/V2_131__add_logout_cutoff_and_privacy_log_subject.sql), [V2_132](../../api-server/src/main/resources/db/migration/V2_132__protect_audit_ledgers_from_modification.sql), [보존 정책](../04-operations/log-retention-policy.md) | 2026-10-19 | - |

## DEC-OPS-364

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-364 | accepted | **운영 계약 비용을 실측하고, 문서 전용 푸시의 계약 범위를 줄이지 않는다.** ① 계약 125개의 최상위 시험 시간 합은 68.3분, 로컬 벽시계는 8.2분, 가장 긴 시험은 core 시작 구성 투영(295초)이다. CI 에서는 secret-scan 잡 안의 약 6분으로 임계 경로가 아니다. ② 문서 전용 푸시도 전체 계약을 그대로 돈다 — 무거운 투영·생성기 시험이 `docs` 트리를 통째로 입력으로 복사해 생성물의 문서·메모리 투영을 대조하므로, 정적 참조나 읽기 추적으로 건너뛸 수 있는 무거운 시험이 없다. ③ 투영 시험은 이미 시작 구성마다 나뉘어 가장 긴 단위가 시험 하나라 파일을 더 나누지 않는다. ④ 재개 조건과 후보(변경하지 않는 투영 시험의 준비물·투영 공유)는 실측 기록에 둔다. | 2026-10-19 품질 평가 과제 9 가 문서 하나에도 운영 계약 전체가 돈다는 비용을 지적했다. 범위를 고르는 선택기를 새로 두면 그 자체가 거버넌스 코드를 늘리고(AGENTS 거버넌스 총량 관리), 문서 트리를 입력으로 쓰는 투영 시험을 건너뛰면 생성물 문서 투영의 회귀를 로컬에서 놓친다. 실측으로 줄일 구조적 여지가 없음을 확인하고 신호를 유지한다. | [실측 기록](../04-operations/readiness-followups.md#운영-계약-비용-실측-2026-10-19), [투영 시험 준비물](../../scripts/reusable-governance-projection.test-helpers.mjs), [pre-push 훅](../../.githooks/pre-push) | 2026-10-19 | - |

## DEC-OPS-365

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-365 | accepted | **V2_133 을 공유 OCI DB 에 적용한다(2026-10-19 사용자 사전 승인, PR #937 병합 뒤).** 병합본(1c0becb74)에서 꺼낸 마이그레이션 폴더로 사전 읽기(스키마 2.132, 대상 10개 표에 `version` 없음 — 기존 3개 표만 있음, 새 검증에 걸리는 기존 행 0: 팝업 기간 역전 0·일정 시작일 공백 0) → info(대기 2.133 뿐) → pg_dump 백업(목차에 10개 표 확인) → Flyway 12.4.0 migrate → validate(157개) 순서로 했다. 읽기 확인: 10개 표 모두 `version integer NOT NULL DEFAULT 0`, CHECK 10개 추가(기존 1개와 합쳐 11), 행 수 불변(공통코드 76·상세 415 등), 모든 행 버전 0. | DEC-OPS-359 의 스키마다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 같은 날 표준 메타 집계를 다시 셌다 — 컬럼 1,023개 중 용어 없는 컬럼 286개(늘어난 10개는 모두 `version`), 폐기 용어 0, V2_131 의 두 컬럼은 용어·도메인과 맞는다. 원본은 적용 직전 백업이다. | [V2_133](../../api-server/src/main/resources/db/migration/V2_133__add_optimistic_version_columns.sql), [처분안](../04-operations/standard-metadata-disposition.md) | 2026-10-19 | - |

## DEC-OPS-366

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-366 | accepted | **PIT 범위를 제품 10개에서 13개로 넓힌다.** ① `business-app-survey`(설문 전체, 배송·운영 범위의 `SurveyResultService` 를 옮겨 겹치지 않게), `business-app-participation`(커뮤니티·메모 보고·일정), `business-core-user-org`(사용자·그룹·부서·정책·부재)를 둔다. 각 범위는 같은 테스트 glob 과 75% 하한을 독립 적용한다. ② 영속 작업(`system.job`)은 api-server 통합 시험이 다뤄 business-core 모듈 PIT 가 변이를 잡을 수 없으므로 넣지 않는다. ③ 핵심 대상에 `UserService`·`LoginIdReuseGuard` 를 더하고 `SurveyResultService` 는 설문 범위로 옮긴다. ④ 사용자 관리의 살아남은 변이가 드러낸 단언 공백 — 권한 잠금 재확인·보호 계정 가드·재발급 토큰 폐기·자격 변경 이벤트·민감 작업 감사·마지막 관리자 보호 — 을 시험 6건으로 닫는다. ⑤ 새 범위는 실측 긴 순서로 기존 긴 범위 여섯 뒤, foundation 범위 앞에 둔다. | PIT 대상이 일부 도메인뿐이라 설문·사용자 관리 같은 큰 서비스의 시험 탐지력이 보이지 않았다(2026-10-19 품질 평가 과제 13). 로컬 strict 실측: 설문 84%(380 변이)·참여 85%(282)·사용자/조직 84%(237, 보강 전 영속 작업 포함 66%)·배송·운영 86%(482, 설문 결과를 뺀 뒤). 네 슬롯 동시 실행에 범위가 셋 늘어 mutation-test 의 벽시계가 길어질 수 있다 — main 실측으로 다시 본다. red 증명: 계약은 새 핵심 대상을 빼면 실패하는 부정 시험을 두고, 보강 시험은 보강 전 살아남던 변이가 죽는 것으로 확인했다. | [CI 매트릭스](../../.github/workflows/ci.yml), [게이트 원장](../../config/governance/gates.json), [PIT 문서](../02-architecture/pitest-mutation-testing.md), [보강 시험](../../business-core/src/test/java/nuri/business/service/user/UserServiceAdministrativeSideEffectsTest.java) | 2026-10-19 | - |

## DEC-OPS-367

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-367 | accepted | **처리 흐름 없는 상태 표면 넷을 걷는다(물리 컬럼은 남긴다).** ① 업무보고 상태(`rptSttsCd`) — 어디서도 쓰지 않고 응답에서 늘 null 이었다. ② 포상 승인 필드 다섯(`sanctnerId`·`confmAt`·`sanctnDt`·`returnResn`·`ifmlAtrzSn`)과 등록의 대기(`N`) 기록 — 승인 상태를 바꾸는 경로가 없었다. 새 포상의 `confm_yn` 은 NULL 로 들어간다(CHECK 는 NULL 을 통과시킨다). ③ 행사 승인 여부·일자와 승인 값 변경을 400 으로 막던 가드 — 등록의 `N` 말고 쓰는 곳이 없었다. ④ 인터넷 서비스 안내 반영 여부(`rfltYn`) — 저장만 되고 읽는 공개 화면·처리가 없었다. DTO·요청·서비스·화면의 열·폼·안내문에서 걷고, 엔티티는 그 컬럼을 `insertable=false, updatable=false` 로 매핑해 다시 저장해도 DB 값을 덮지 않는다. 엔드포인트는 걷지 않아 operation·권한 원장은 그대로다. | 상태 필드만 있고 처리 흐름이 비어, 화면이 없는 업무 흐름을 암시했다(2026-10-19 품질 평가 과제 11, 사용자 선택 "쓰지 않는 표면을 걷기"·물리 컬럼 유지). 입력 계약 원장의 길이 251→246·읽기 전용 68→62·날짜 13→12 를 실측대로 내렸다. 걷지 않은 것: 늘 null 인 `WorkReportDto.rptTypeCd`·저장소의 쓰이지 않는 검색 인자는 범위 밖이다. | [입력 계약 원장](../../config/governance/input-contract-mirror-census.json), [포상 서비스](../../business-app/src/main/java/nuri/business/service/reward/RewardManageService.java), [행사 서비스](../../business-app/src/main/java/nuri/business/service/event/EventInfoService.java) | 2026-10-19 | - |

## DEC-OPS-368

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-368 | accepted | **보고서 통계 화면을 퇴역한다(2026-10-19 사용자 승인 "메뉴와 탭을 걷기", 마이그레이션 저장소 반영도 같은 날 승인).** ① 통계 허브의 운영 보고서 탭·`/admin/stats/report` 페이지·`GET /api/v1/admin/system/statistics/report`·`ReportStatsService` 의 조회·등록 경로·`ReprtStats` 엔티티를 걷는다. 메뉴가 사라지고 가리키는 곳이 없어 redirect 를 남기지 않는다(마이페이지 퇴역 선례). ② V2_134(데이터만, Contract DML)가 메뉴 9040105 「보고서통계」 한 행과 그 메뉴를 가리키는 NAVIGATION 배정·즐겨찾기를 지우고, 지운 배정마다 REMOVE 이력을 남긴다. 경로가 다르거나 하위가 있거나 다른 행이 같은 경로를 가리키면 아무것도 지우지 않고 실패한다. 이미 지운 환경에서는 아무것도 하지 않는다. ③ 물리 표 `tb_rptp_stats` 는 남긴다(스키마 변경은 별도 승인). `STATS_ADMIN_READ` 는 다른 통계 탭이 계속 쓴다. | 원장 `tb_rptp_stats` 에 쓰는 제품 경로가 없어(등록 메서드는 자기 단위 시험만 불렀다) 탭이 어떤 기간에도 비어 있었다(2026-10-19 품질 평가 과제 11). 탭만 걷으면 활성 메뉴가 없는 화면을 가리키므로 메뉴 행도 걷는다. operation 수 411→410, 권한 원장 버전이 바뀐다. 실행 순서·되돌리기는 인가 전환 런북의 V2_134 절을 따른다. red 증명: 즐겨찾기 삭제 조건을 빗나가게 하면 "형제 메뉴의 즐겨찾기만 남는다" 단언이 실패한다. 공유 OCI 적용은 병합 뒤다. | [V2_134](../../api-server/src/main/resources/db/migration/V2_134__retire_report_stats_menu.sql), [전환 런북](../04-operations/authorization-cutover-runbook.md), [마이그레이션 시험](../../api-server/src/test/java/nuri/api/schema/ReportStatsMenuRetirementMigrationIntegrationTest.java) | 2026-10-19 | - |

## DEC-OPS-369

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-369 | accepted | **프런트 커버리지 하한을 실측 가까이 올린다.** statements·branches·functions·lines 하한을 71/63/64/73 에서 85/79/82/87 로 올린다. 값은 PR #940 CI 커버리지 잡의 실측(86.01·80.18·83.15·88.31)을 정수 내림한 뒤 1포인트를 뺀 것이다. `frontend/vitest.config.mts` 의 thresholds 와 게이트 원장 `QUALITY-FRONTEND-*-COVERAGE` 의 current·baseline 을 같은 변경에서 맞춘다(registry 계약이 둘을 대조한다). | 하한이 실측보다 14~17포인트 낮아 그만큼 떨어져도 필수 CI 가 통과했다(2026-10-19 품질 평가 과제 6). 실측과 같은 하한은 덜 시험된 코드 몇 줄에도 CI 를 막아 1포인트 여유를 둔다. 로컬 coverage 실행은 이 PC 의 계측 부하로 시험 11건이 시간 초과해 집계를 남기지 못했다 — 같은 소스 트리의 CI 실측을 정본으로 썼다(그 뒤 커밋은 E2E spec·Java 시험뿐). 하한을 내리는 것은 이 결정의 대체 DEC 가 필요하다. | [vitest 설정](../../frontend/vitest.config.mts), [게이트 원장](../../config/governance/gates.json) | 2026-10-19 | - |

## DEC-OPS-370

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-370 | accepted | **V2_134 를 공유 OCI DB 에 적용한다(2026-10-19 사용자 사전 승인, PR #940 병합 뒤).** 병합본(f5a0c63f3)에서 꺼낸 마이그레이션 폴더로 사전 읽기(스키마 2.133, 메뉴 9040105 「보고서통계」 한 행 — 경로 /admin/stats/report·사용 중·하위 0, 같은 경로의 다른 행 0, NAVIGATION 배정 ROLE_ADMIN 1건, 즐겨찾기 0, 전체 메뉴 76) → info(대기 2.134 뿐) → pg_dump 백업(목차에 메뉴·배정·이력 표 확인) → Flyway 12.4.0 migrate → validate(158개) 순서로 했다. 읽기 확인: 메뉴 9040105 없음, 그 배정 0·REMOVE 이력 1건(migration:2.134), 전체 메뉴 75·활성 70, `tb_rptp_stats` 그대로. | DEC-OPS-368 의 데이터 정리다. dev 스택이 OCI 를 보므로 적용해 두지 않으면 다음 기동이 백업 없이 적용한다. 메뉴 행과 즐겨찾기에는 감사 표가 없어 되돌리는 원본은 적용 직전 백업이고, 배정은 REMOVE 이력으로 되살린다(인가 전환 런북 V2_134 절). | [V2_134](../../api-server/src/main/resources/db/migration/V2_134__retire_report_stats_menu.sql), [전환 런북](../04-operations/authorization-cutover-runbook.md) | 2026-10-19 | - |

## DEC-OPS-371

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-371 | accepted | **규칙·기록·계약의 중복과 반복 재생성을 걷는다(2026-10-19 사용자 승인 — A·B "지금 진행", C 추천안 "진행", C1 3단계 "추천대로 진행").** 검사 모집단·단언·승인 경계와 H1~H5 는 줄이지 않는다. ① 결정 기록: 운영 결정 인덱스의 반복 열(이유·정본)을 걷고 ID 를 보관 원문 앵커로 삼으며, 지금의 작업을 제약하지 않는 86행(퇴역·대체됨·일회성 실행·구현 기록)을 자동 로드되지 않는 역사 색인으로 옮긴다. Atlas 가 두 색인이 보관 원문의 DEC 를 정확히 한 번씩 나눠 갖는지 검사한다. DEC 는 앞으로의 작업을 제약하는 규칙·경계이거나 사용자 승인일 때만, 승인 묶음당 하나만 쓴다(정본 AGENTS.md). 공유 OCI 마이그레이션 적용은 적용 로그에 남긴다. ② 고정값: operation 수·메뉴 수·마이그레이션 시험 수·PIT 범위 수·입력 계약 하한·라우트 셸 분포를 사람이 검토하는 원장 하나에서 계산하고 수를 못 박는 확인 지점은 한 곳만 둔다. 계약 시험의 수량 증감 이력 주석을 걷는다. 공용 메모리의 원장 수 재진술 검출을 GAP-CONTRACT-001 행으로 넓힌다. ③ 재생성: npm run regen 이 생성기 사슬 → URL 승인 재결속 → SAST 예외 해시 확인(자동 결속 없음, --rebind-sast 로 재검토 뒤에만) → 하네스 기준선 → Atlas 순서로 다시 만들고, --check 가 pre-push 맨 앞에서 낡은 생성물을 알린다. 하네스 기준선은 registry 등록 게이트를 다시 적지 않는다. 흩어진 퇴역 pack 어휘 단언을 표 하나의 계약으로 모은다. ④ 결속 축소: Atlas 는 읽은 원본의 경로만 싣고(신선도는 생성물 바이트 대조), URL 승인 해시는 개수뿐인 census summary 를 결속하지 않으며, IA 처분 제안 원장은 라우트 원장의 처분 범위와 ADR 결정 절에만 결속한다. ⑤ 정리: 백엔드 헌법 §10.3 을 영속 작업 표준(ADR-0033·DEC-OPS-341)에 맞추고 프런트 §14.4 순환 참조·DB §7.3 수치 재진술을 정리한다. 출처를 확인할 수 없거나 겹치는 범용 스킬 6개를 걷고 남은 외부 스킬에 출처·라이선스를 적으며 생성물에는 이 저장소 전용 스킬만 복사한다. 쓰지 않는 파일·중복 문서를 걷고 끝난 문서 다섯 개를 보관한다. 문서 인덱스의 ADR 표를 ADR 색인 링크로 바꾼다. ⑥ 실행 비용: 투영 무결성의 소스 범위 해시가 파일마다 JS realpath 로 경로를 가두던 것을 루트 실경로 1회와 native realpath 로 바꾸고 정밀 점검의 제외 폴더 훑기를 호출당 1회 색인으로 바꾼다(해시·점검 결과는 바이트 단위로 같다, 로컬 운영 계약 740초 → 571초). 실행 범위 디스크 캐시와 투영 입력 복사 축소는 이득에 비해 위험이 커서 채택하지 않는다. ⑦ 하네스 기준선: manifest 계산을 scripts/harness-baseline-manifest.mjs 하나로 모으고 HarnessBaselineIntegrityTest 는 그 --check 를 실행해 판정한다(Node 부재·시간 초과는 fail-closed). 등록·태그·실행 binding 은 그대로라 원본 CI·pre-push·생성물의 검사 범위는 같고, 도구·형식 모듈의 해시와 메타 게이트 본문을 manifest 에 싣는다. | 2026-10-19 규칙·문서·계약·생성 원장 감사가 세션마다 읽는 공용 메모리(약 210KB, decisions.md 133KB 중 41KB 반복 문구)와 같은 사실의 손 사본·전체 파일 해시 결속이 반복 비용과 실패한 push 의 주원인임을 실측했다(최근 30일 커밋 638건 중 Atlas 352건, URL 승인 81건 중 해시만 79건). 사용자가 A·B 진행과 C 추천안·C1 3단계 (a)안을 승인했다. | [AGENTS.md 기록 기준](../../AGENTS.md#documentation-and-memory), [역사 색인](operational-decisions-index-historical.md), [적용 로그](../04-operations/shared-oci-migration-apply-log.md), [regen](../../scripts/regenerate.mjs), [퇴역 pack 어휘 계약](../../scripts/retired-pack-vocabulary.test.mjs), [URL 승인 결속](../../scripts/ui-url-state-approval-binding.mjs) | 2026-10-19 | DEC-OPS-335 의 Atlas 소스 다이제스트 결속, 구현 기록·공유 OCI 적용을 DEC 로 쓰던 관행, 백엔드 헌법 §10.3 의 외부 발송 runAfterCommit 표준, 하네스 기준선의 Java·node 이중 구현과 거울 대조 |

## DEC-OPS-372

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-372 | accepted | **완성도 개선 배치를 적용한다(2026-10-19 사용자 승인 — "제안한 방법으로 진행", "2번도 추천대로").** ① 결함: 첨부 응답에서 서버 저장 경로·저장 파일명을 걷고, 댓글은 폐기된 비밀번호를 받지도 저장하지도 않으며(실으면 400), 사용자 팝업 단건 조회는 오늘 게시 중인 것만 돌려주고(아니면 404), 같은 사용자의 같은 주소 스크랩은 409 이고 V2_136 이 (등록자, 주소) 유일 제약을 둔다. 메모보고 수신자는 받은 보고의 첨부를 열람만 한다(personalReaderGrant, 삭제 불가·관리자 우회 없음). 문자 발송 목록은 발송 건 단위로 쪽을 나눈다. ② 정직성: 쓰임 없는 인터넷서비스안내(공유 OCI 0행·메뉴 없음)의 화면·API·기능 선언·SERVICE_* 권한을 걷고 V2_135 가 배정을 REMOVE 이력과 함께 지운다(전제가 깨지면 fail-closed, 물리 표는 core 소유로 남김). 도움말·온라인 매뉴얼은 로그인 사용자가 도움말 센터에서 공개용 DTO 로 읽는다(관리 목록은 HELP_READ 유지). 대시보드 연결 카드는 이 서버의 연결 수임을 말하고, 통계 차트 시간축은 과거에서 최근으로 흐르며, 투표 제출 전에 확인받는다. ③ 번들: 루트 레이아웃의 애니메이션을 CSS 로 옮기고 생성 zod·연산 계약을 API 태그 묶음 모듈로 나눠 모든 라우트가 받는 공용 JS 를 16.6% 줄이고, bundle:check 에 공용 JS 예산을 둔다. ④ 복구: 백업·복구 런북에 템플릿 권장 시작값(매일 02:00, 일일 14·주간 8 세대, 호스트 밖 보관과 불변 사본, RPO 24시간·RTO 4시간 시작 목표, PITR 기본 미사용)과 복원 훈련 도구를 둔다. 실제 값과 운영 훈련 기록은 기관 몫이다(DEC-OPS-107 경계 유지). | 2026-10-19 3차 평가에서 80점 미만 도메인의 감점이 작은 실제 결함과 겉만 있는 기능에서 나왔고, 공용 JS·복구 기준이 남은 감점이었다. 사용자가 권고안을 승인했다. V2_135·V2_136 의 공유 OCI 적용은 병합 뒤 별도 승인이다. | [V2_135](../../api-server/src/main/resources/db/migration/V2_135__retire_internet_service_guidance_grants.sql), [V2_136](../../api-server/src/main/resources/db/migration/V2_136__add_scrap_owner_url_unique.sql), [백업·복구 런북](../04-operations/backup-and-restore-runbook.md), [인가 전환 런북](../04-operations/authorization-cutover-runbook.md) | 2026-10-19 | DEC-OPS-048 의 인터넷서비스안내 배선, 백업·복구 런북의 시작값 미기재 방침, 메모 첨부 판정의 보고자 축 미채택 |

## DEC-OPS-373

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-373 | accepted | **검증 비용·얇은 도메인 연구 보고서의 1단계(결정 없이 가능한 항목)를 적용한다(2026-10-20 사용자 지시 "바로 가능한 작업 우선 진행").** ① 사본 결속: Atlas 는 의존성 버전과 액션 커밋 핀을 싣지 않고 선언 파일로 링크한다. 액션 핀의 정본은 워크플로이고, 검토가 필요한 핀만 `REVIEWED_ACTION_PINS` 와 required-checks 의 `criticalSteps` 에 둔다. 한 액션 저장소는 모든 워크플로·재사용 템플릿에서 한 커밋을 쓴다. pre-push 의 계약 codegen 검사는 `regen --check` 가 한 번 소유한다. ② 신호 앞당김: 원장이 세는 수(operation·메뉴·기능·시작 구성·schema-validation 등록·PIT 범위 등)를 시험 소스가 라벨 가까이에 다시 적으면 공용 메모리 계약이 붉게 한다. 의도한 고정은 `ledger-pin(<결정 ID>)` 표기와 그 결정이 인덱스에 있을 때만 통과한다. CodeQL 이 반복해 막은 JS 규칙 셋(js/file-system-race 등)의 AST 근사가 pre-push·verify 에서 바뀐 파일을 먼저 본다(권위는 CI CodeQL, 근사 통과로 예외를 늘리지 않는다). 갈래 통합 뒤에는 `npm run verify:integrate`(Flyway 번호 충돌·적용분 수정 검사 → regen → 전체 vitest·`:api-server:test`·선별 스키마·생성기 화면 시험)를 돌린다. ③ CI: 제품 PIT 는 6슬롯이고(ADR-0037) 업무 홈·홍보(`business-app-home-promotion`)와 관측(`business-core-observability`) 범위를 더해 제품 15개다. 스키마 검증 공용 PostgreSQL 은 autovacuum 을 끄고 띄운다(NOWAIT migration 잠금과의 경합이 17회 첫 시도 실패의 원인이었다). ④ 도메인: 공지 팝업은 aria-modal 대화상자이고 좁은 화면에서는 CSS 로 아래쪽 시트가 되며, 다시보지않기 설정을 따른다. 포상 수상자는 사용자 피커로 고르고 서버가 등록·수상자 변경 때 계정 존재·사용 중을 검사한다(아니면 400). 업무 홈에 오늘 일정·받은 보고·참여할 설문·내 담당 업무 카드를 두고 각 카드는 부르는 API 권한으로 보이며, 빈 최근 활동·중복 개인 알림 구독·전 사용자 미읽음 집계를 걷는다(연결 수 카드는 결정 대기로 남긴다). 대시보드 응답의 `pendingApprovalCount` 를 걷는다. 관리자 홈은 권한 있는 조회만 부르고 실패 요청을 그 이름으로 부르며, 운영 신호 API 는 신호마다 원천 조회 권한이 있을 때만 싣는다(새 권한 없음). ⑤ 통계: 시계열은 `{date, value}` 오름차순이고 기록하는 계열만 빈 날을 0 으로 채운다(미수집 계열은 채우지 않는다). 기간은 366일 상한(넘으면 400)이고 `statsKind` 와 늘 0 이던 필드를 걷는다. 사용자 활동은 조회·등록·수정·삭제 계열로 내고, 하위 화면은 A7 보고서 셸로 옮긴다. ⑥ 공통코드·감사: 생산 코드가 읽는 공통코드 그룹 = 기능 선언 `commonCodeGroups` = 사용처 기여(`CommonCodeUsageContributor`)를 계약이 대조하고, 관리 화면은 사용처와 영향을 보이고 확인받는다. 공통코드 조회 캐시를 걷는다. 민감 작업 감사 원장은 작업 종류로 찾고, 내보내기는 `@PrivacyAccess` 아래 사유(2~200자)가 필수이며 사유와 함께 기록된다. | 연구(2026-10-20)가 CI 실패의 63% 가 CI 에서만 도는 검사에서, 커밋의 35% 가 결속·실패 후속에서 나온다고 실측했고, 80점 미만 도메인의 감점이 처리 흐름·원천·사용자 화면·이름 불일치의 반복이었다. 메뉴 이름·권한 퇴역·스키마 변경·결재 연동·연결 수 카드는 사용자 결정 대기라 이 배치에서 뺐다. 2026-08-23 결정 위임. | [ADR-0037](../02-architecture/decisions/ADR-0037-product-pit-six-slots.md), [재진술 탐지](../../scripts/ledger-count-restatement.mjs), [CodeQL 근사](../../scripts/sast-approximation.mjs), [통합 점검](../../scripts/integration-precheck.mjs), [통계 서비스](../../business-core/src/main/java/nuri/business/service/stats/ReportStatsService.java), [운영 신호](../../business-core/src/main/java/nuri/business/service/system/signal/OperationalSignalService.java) | 2026-10-20 | ADR-0026 결정 9 의 제품 PIT `max-parallel: 4`(ADR-0037), DEC-OPS-281 ⑤ 의 "대시보드→알림은 화면 의존", DEC-OPS-276 ③ 의 미수집 축 요약 칸 `summary`, 공통코드 조회의 인스턴스 로컬 캐시(DEC 없음) |

## DEC-OPS-374

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-374 | accepted | 직접 맡은 작업 브랜치의 완료 범위를 PR·최신 HEAD의 required CI·main 병합·병합 확인 후 원격/로컬 브랜치 삭제까지로 명시한다. 현재 사용자의 범위 제한이 우선하며, 다른 작업의 브랜치·WIP와 worktree 산출물을 보존한다. | 2026-10-20 사용자가 자신이 지시한 작업 브랜치는 재승인 없이 병합·삭제하되 다른 에이전트의 브랜치에 대한 임의 작업을 제한하려는 뜻이라고 명확히 하고 Markdown 반영을 요청했다. | [AGENTS Git 규칙](../../AGENTS.md#공유-워킹트리와-git), [SOP](../03-guides/orchestration-protocol.md), [마무리 스킬](../../.agent/skills/finishing-a-development-branch/SKILL.md) | 2026-10-20 | - |

## DEC-OPS-375

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-375 | accepted | 부서 미배정 사용자의 '부서 공유' 일정을 기본조직으로 묶어 미배정자끼리 공유하는 현재 동작과, 일반 사용자 관리자(USER_UPDATE·USER_DEPT)가 보호 관리자 계정의 이름·연락처·부서를 바꿀 수 있는 현재 권한 의미를 유지한다(2026-10-21 사용자 결정). | 2026-10-21 소스 실측 평가가 두 동작을 결함 후보로 올렸다. 재검증에서 일정 폴백은 코드가 의도를 밝힌 설계이고 '부서 공유'로 지정한 일정만 보이며, 타인 정보 수정은 비밀번호 힌트·정답과 역할을 바꾸지 못하고 공개 비밀번호 찾기도 없어 권한 상승·탈취 경로가 없음을 확인했다. 사용자가 현 상태 유지를 정했다. 보호계정 가드는 비밀번호 초기화·잠금 해제·상태 변경·로그인 정책에 그대로 둔다. | [일정 서비스](../../business-app/src/main/java/nuri/business/service/schedule/ScheduleService.java), [사용자 서비스](../../business-core/src/main/java/nuri/business/service/user/UserService.java) | 2026-10-21 | - |

## DEC-OPS-376

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-376 | accepted | 운영 오버레이의 api·frontend·edge 는 리눅스 권한을 모두 빼고(`cap_drop: ALL`·`no-new-privileges`) 메모리 상한을 두며, api 힙은 고정 `JAVA_OPTS` 로 상한에 비례해 잡는다. 번들 db 는 대상 밖이고 `read_only` 는 후속이다(2026-10-21 사용자 승인). | 2026-10-21 소스 실측 평가가 운영 컨테이너에 권한 축소·자원 상한이 없음을 지적했고 사용자가 (가)안을 골랐다. 격리 릴리스 스모크에서 강화한 컨테이너가 첫 설치·인가 전환·로그인·세션 연장·첨부·백업·복원을 통과했고 최대 메모리가 상한 안이었다(api 918MiB/1.5GiB, frontend 146MiB/768MiB, edge 13MiB/128MiB). 상한은 환경변수로 바꾸고 JVM 옵션은 호스트 환경으로 받지 않으며 `ConfigSafetyLinterTest` 가 고정한다. db 는 기동 때 권한이 필요하고 메모리 필요량이 데이터에 따라 달라 뺐다. 같은 검증이 시험 파일 때문에 깨져 있던 프런트 Docker 빌드와 ADR-0038·ADR-0036 이후 낡은 스모크 기대값을 드러내 함께 고쳤다. | [운영 오버레이](../../docker-compose.prod.yml), [설정 안전 게이트](../../api-server/src/test/java/nuri/api/harness/ConfigSafetyLinterTest.java), [시작 가이드](../../docs/03-guides/getting-started.md) | 2026-10-21 | - |

## DEC-OPS-377

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-377 | accepted | 첫 화면 직후 앱 전체 공급자의 context 값을 바꾸지 않고(같은 사용자 재조회는 이전 객체, 실시간 연결·현재 메뉴는 구독 저장소, 하이드레이션 중에는 서버 기준값) 머리글·사이드바를 셸과 함께 보낸다(GAP-FE-003 종료, 2026-10-22 사용자 승인). | React 19.2 는 서버가 보낸 Suspense 조각을 300ms 묶음으로 공개한다. 첫 화면 직후 공급자 값이 바뀌면 공개를 기다리던 경계를 브라우저가 다시 그려 서버 HTML 을 버리고, 숨은 사본이 남아 E2E 가 본문을 두 벌 셌다(PR #959). 값을 안정화하자 따로 스트리밍하던 사이드바가 빠른 이동 뒤 늦게 하이드레이션해 서버와 어긋났다(React #418). 셸이 메뉴 조회를 기다려 머리글·사이드바와 함께 오면 늦은 셸 하이드레이션이 없다 — 메뉴 조회는 같은 백엔드이고 실패하면 빈 메뉴다. 격리 E2E(CI 에서 실패했던 시험 포함 30건)에서 #418 0건을 확인했다. | [루트 레이아웃](../../frontend/src/app/layout.tsx), [레이아웃 공급자](../../frontend/src/contexts/LayoutContext.tsx), [셸 접근성 계약](../../frontend/src/app/components/layout/__tests__/shell-accessibility-contract.test.ts) | 2026-10-22 | DEC-OPS-228 의 사이드바 Suspense 자리표시 표지 부분(자리표시를 걷었다) |


## DEC-OPS-378

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-378 | accepted | 낙관적 잠금 컬럼은 새 표에도 `version integer NOT NULL DEFAULT 0` 과 `ck_<표>_version`(>= 0)을 쓰는 기술 컬럼 예외로 둔다. 표준 용어를 새로 만들지 않는다(2026-10-22 사용자 결정). | 13개 엔티티가 이미 Integer `@Version` 이고 버전 대조 도우미도 Integer 만 받는다. 새 표준 용어(예: 잠금버전일련번호 bigint)를 두면 관례가 둘이 되어 다음 기능이 매번 고르고 타입이 어긋난다. 업무 의미가 없는 기술 컬럼이라 기존 열 이름 변경(13개 표의 Expand/Contract)은 이득이 없다. ADR-0039 첫 적용. | [처분안](../04-operations/standard-metadata-disposition.md), [EntityVersions](../../foundation/src/main/java/nuri/foundation/core/util/EntityVersions.java), [V2_133](../../api-server/src/main/resources/db/migration/V2_133__add_optimistic_version_columns.sql) | 2026-10-22 | 처분안 `version` 행의 미확정 C(예외 후보) |

## DEC-OPS-379

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-379 | accepted | ADR-0040 의 스키마 변경(게시판 마스터 버전 컬럼, 게시판 변경 이력 표, 예약·고정·비밀글·추천 설정 컬럼, 상단 고정 컬럼, 신규 표준 용어 6건, `BOARD_PIN`, 메뉴 표시명 데이터 변경)을 저장소 Flyway 로 일괄 승인하고, 공유 OCI 적용은 PR 이 병합될 때마다 하며, 예약 집행 전 진단에서 나온 미래 시작일·형식 오류 행은 보정하지 않는다(2026-10-23 사용자 결정). | 사용자가 A0~B3 를 이어서 구현하도록 하면서 배치마다 멈추지 않게 승인 범위를 한 번에 정했다. 모두 추가만 하는 Expand 이고 기존 컬럼을 지우거나 바꾸지 않는다. 기록용 미래 시작일 글은 지워지지 않고 시작일까지 작성자·조회 대행 권한자에게만 보인다. 게시글 버전 NULL 보정·NOT NULL 전환과 그 밖의 코어 데이터 변경은 이 승인 밖이다. | [ADR-0040](../02-architecture/decisions/ADR-0040-board-operations-management.md), [설계서 §7](../02-architecture/board-management-expansion-design.md#7-구현-배치와-검증), [적용 로그](../04-operations/shared-oci-migration-apply-log.md) | 2026-10-23 | - |

## DEC-OPS-380

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-380 | accepted | 공유 OCI DB 의 ROLE_ADMIN 그룹에 상단 고정 권한 `BOARD_PIN` 을 배정하고 같은 트랜잭션에 GROUP_GRANT/ADD 이력 1건(`ops:2026-10-23:board-pin`, 정책 버전은 그때의 카탈로그 버전)을 남긴다(2026-10-23 사용자 승인). 템플릿 기본값(기본 그룹 없음, ADR-0040 결정 5)과 도입 기관 DB 의 자동 미배정은 그대로다. | V2_140~V2_142 를 적용한 뒤 공유 OCI 에서는 아무도 글을 고정할 수 없었다. [DEC-OPS-181](#dec-ops-181)(공지·FAQ 편집 권한)과 같은 방식으로 개발 환경에서만 기능을 쓰게 했다. 사전 읽기는 ROLE_ADMIN 배정 305·`BOARD_PIN` 0, 사후는 306·1(이력 1행)이다. 이 배정 뒤에는 #966 이전 코드(카탈로그에 `BOARD_PIN` 없음)로 공유 OCI 를 보는 앱에서 ROLE_ADMIN 사용자의 권한 스냅숏이 fail-closed 로 막힌다 — 공유 OCI 는 병합마다 main 을 따른다. 되돌리기는 그 배정 행을 지우고 GROUP_GRANT/REMOVE 이력을 남긴다. | [ADR-0040](../02-architecture/decisions/ADR-0040-board-operations-management.md), [권한 원장](../../config/governance/permission-catalog.json) | 2026-10-23 | - |

## DEC-OPS-381

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-381 | accepted | **자동 로드되는 결정 인덱스를 늘 걸리는 제약으로 줄이고, 특정 경로에만 걸리는 결정은 필요할 때 읽는 영역 색인으로 나눈다(2026-10-24 사용자 결정 — 자동 로드 지시 축소 3안 "모두 권장하는대로 작업진행").** 검사 모집단·단언·승인 경계와 H1~H5 는 줄이지 않는다. ① 결정 색인 분할: `.agent/memory/decisions.md` 운영 결정 표에는 어느 경로를 고치든 걸리는 결정만 남기고(기준 정본 AGENTS.md 기록 기준), 나머지 현재 결정은 영역 결정 색인 넷 — [CI·검증·거버넌스](../04-operations/operational-decisions-index-ci-governance.md)·[프로젝트 생성기·재사용 투영](../04-operations/operational-decisions-index-composer.md)·[레거시 이관 도구](../04-operations/operational-decisions-index-migration.md)·[제품 동작·화면·도메인](../04-operations/operational-decisions-index-product.md) — 으로 행 그대로 옮긴다. 영역 색인은 에이전트 진입점이 자동으로 읽지 않는다. Atlas 가 공용·영역·역사 색인이 보관 원문의 DEC 를 정확히 한 번씩 나눠 갖는지, 공용 메모리 계약이 영역 색인 행의 형식·길이·공개 안전·원장 수 재진술을 검사한다. ② 읽기: 변경 작업은 decisions.md 「영역 결정 색인」 표에서 대상 경로가 걸리는 색인을 읽고, 어느 행에도 걸리지 않거나 판단이 서지 않으면 넷을 모두 읽는다(정본 AGENTS.md 작업 시작 시 필수 읽기). CLAUDE.md·GEMINI.md 의 import 집합은 그대로다. ③ 기록: 새 운영 결정은 걸리는 경로의 영역 색인에 쓰고, 늘 걸리는 절차·경계일 때만 decisions.md 에 쓴다(정본 AGENTS.md 기록 기준). ④ Accepted ADR index 는 ID·상태·결정·시행일·supersedes 5열이다 — ADR ID 가 ADR 색인의 키이고 링크·이유는 ADR 색인과 ADR 이 갖는다. ⑤ 공용 메모리 계약이 자동 로드되는 세 파일마다 전체 크기 상한을 검사한다. 상한을 올리거나 늘 걸리는 행을 크기 때문에 옮기는 것은 H2 판단이다. 생성물에 복사되는 영역 색인은 upstream 이력이며 도입 기관의 현재 결정이 아니다. | 세션마다 자동 로드되는 공용 메모리 가운데 decisions.md 가 가장 컸고(54,119자·84,582바이트, main 73f2123a7) 그 대부분이 특정 경로에만 걸리는 운영 결정 280행이었다. 2026-10-24 분류안(행마다 보관 원문·집행 시험·AGENTS 중복을 대조)에서 행 전체가 글로만 지켜지는 것은 셋(DEC-OPS-019·050·378)이었고, 일부 조항만 글로 남는 8행(030·032·128·233·256·287·313·335)은 AGENTS 승인 경계가 덮거나 어겼을 때 피해가 작다고 판정해 영역에 두었다. 글로만 지켜지고 어기면 피해가 큰 경계(013·062·358·375·379)와 모든 작업에 걸리는 절차는 자동 로드에 남겼다. 영역 색인은 대상 경로를 고칠 때만 읽으므로, 경로 표의 어느 행에도 걸리지 않으면 넷을 모두 읽게 해 빠짐을 막는다. Accepted ADR 의 이유·정본 열은 ADR 색인과 ADR 의 사본이었다. | [AGENTS.md 기록 기준](../../AGENTS.md#documentation-and-memory), [결정 색인 경로](../../scripts/decision-indexes.mjs), [공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs), [Atlas 분할 검사](../../scripts/atlas-catalog.mjs) | 2026-10-24 | DEC-OPS-371 ① 의 'Atlas 가 두 색인이 보관 원문의 DEC 를 정확히 한 번씩 나눠 갖는지 검사한다' 가운데 두 색인(현재·역사 → 공용·영역·역사 색인), Accepted ADR index 의 이유·정본 열(기록 템플릿, DEC 없음) |

## DEC-OPS-382

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-382 | accepted | **방법론 보완 배치를 한 결정으로 묶는다(2026-10-24 사용자 승인 — 가드레일 시안·파생 산출물 계획의 권고 12개 "권고한대로 모두 승인").** 검사 모집단·단언·승인 경계와 H1~H5 는 줄이지 않는다. ① 설계 검토: 설계 문서를 두고 구현 전에 검토하는 작업은 결정 카드(D-n)를 두고, 결정 유형(화면 확인·계약 의미·정직성 계약·혼합)마다 확정 수단을 나누며, 등급별 검토 상한(화면만 1관점, 의미 L1 적대 1회 2관점, 인가·스키마·데이터 L2 최대 2회이고 2회차는 바뀐 행만)을 지킨다. 시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다. 이 규칙은 모든 오퍼레이터에 같이 적용한다. ② 산출물 내보내기: Atlas 와 같은 비규범 파생물이다. 커밋하지 않는 `build/deliverables` 에만 쓰고, 수동 실행·workflow_dispatch·릴리스 태그에서만 만든다. `frontend/public`·`npm run regen`·required CI 에 넣지 않는다. 원장의 UNVERIFIED·증거 수준·빈칸을 그대로 싣고 '100%·수기 0%' 같은 표현을 쓰지 않는다. 금지 입력은 `.agent/memory`, `docs/archived`, ADR 색인, 공유 OCI, 생성물의 메뉴 스냅숏이고, 기관이 넘기는 요구사항 추적 CSV 만 커밋하지 않는 실행 인자로 받는다. ③ 스캐폴더: 현행 규칙 위반을 없애는 최소 정합화와 읽기 전용 등록 점검기로 두고, Flyway 파일·권한 원장·검토 원장에 자동으로 쓰지 않는 경계를 유지한다. 실사용 1건 전에는 Node 코어로 옮기지 않고, 6개월 동안 사용이 0건이면 퇴역을 검토한다. ④ 시연(status demo) 라우트를 메뉴 관리의 연결 화면 선택지·생성 화면 목록·권한 묶음이 여는 화면에서 뺀다. ⑤ 공개 저장소 CI artifact: 시험 결과 XML·SARIF 는 보관 기간을 정해 올리고, 산출물 패키지는 올리지 않고 다이제스트만 잡 요약에 남긴다. ⑥ 출력 형식은 Markdown·CSV 이고 xlsx 는 외부 시범 검토 뒤 정한다. ⑦ OpenAPI 계약(api-docs)에서 연산 바인딩이 PUBLIC 인 연산은 security: [] 로 전역 bearer 요구를 지운다(401·403 을 붙이지 않는 판정과 같다). 패턴 갤러리의 시각 회귀 기준선은 미룬다. 릴리스 첨부의 첫 적용, 외부 시범 검토자 지정, GAP-STD-001 새 불일치의 처분, CMS 요청 DTO 의 입력 계약 등재는 각 소유자가 따로 정한다. | 제미나이의 '가드레일 프로토타이핑·역산출물' 제안을 저장소·공유 OCI 읽기 전용 집계·공공 SW 규범(감리기준 2024-53호, 구축·운영 지침 2024-66호, DB 표준화 지침 2025-19호)과 대조했다. 근거로 든 파일 일부가 저장소에 없었다. 앱 안 시안 장치(패턴 갤러리)는 이미 있었다. 원장은 내용이 완결되지 않았다(라우트 역할 UNVERIFIED, capability E4 0건, 표준 용어 없는 컬럼). 감리는 감리법인의 점검이라 산출물이 그 절차를 대신하지 못한다. 그래서 새 /dev 트리·목업 승격·전 계층 자동 생성·병합마다 커밋되는 산출물 대신 기존 장치를 넓혀 앞단과 뒷단을 잇는다. 설계 검토 상한은 지금까지 한 오퍼레이터의 개인 메모리에만 있어 다른 오퍼레이터에 적용되지 않았다. 시연 라우트는 지금 메뉴 관리에서 실제 메뉴로 연결할 수 있고 화면 목록에 운영 화면처럼 실렸다. | [설계 검토 예산(SOP §7)](../03-guides/orchestration-protocol.md#7-설계-검토-예산-design-review-budget), [설계·산출물 가이드](../03-guides/design-to-deliverables-guide.md), [AGENTS.md 안전 경계](../../AGENTS.md#공통-작업-원칙) | 2026-10-24 | - |

## DEC-OPS-383

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-383 | accepted | **로컬 이관 작업공간(ADR-0041)의 병합 전 보완을 한 결정으로 묶는다(2026-10-25 사용자 승인 — 병합 전 적대 검토 보완안 "모두 고치고 병합").** 승인 경계·검사 모집단·H1~H5 는 줄이지 않는다. ① 로컬 세션: 실행기는 시작할 때마다 32바이트 실행 비밀을 만들어 터미널에 출력하는 주소의 URL 조각(`#launch=`)으로만 화면에 넘긴다. 화면은 비밀을 그 탭의 세션 저장소에 옮기고 주소에서 지운 뒤 전용 헤더로만 보내며, 실행기는 상수 시간 비교로 맞을 때만 요청 토큰을 준다(아니면 403 `LAUNCH_REQUIRED`, 쿼리 문자열은 받지 않는다). 비밀은 파일·작업 색인·로그에 쓰지 않는다. Host·Origin·Sec-Fetch·요청 토큰 검사는 그대로다. ② 결과 불명 작업: PASS 실행 증거 없이 끝난 COMMIT 과 실행기 재시작으로 끊긴 적재는 결과 불명이다. DRY_RUN 은 대상 DB·이관 제어 스키마에 쓰지 않으므로 실패하면 실패다. 사람 확인 기록이 없는 결과 불명 작업은 새 DRY_RUN·COMMIT 만 막고 읽기 단계·입력 저장은 막지 않는다. 사람은 그 작업이 만든 실행 증거(파일·SHA-256·고정 요약)를 불러와 대상 상태를 기관 절차로 확인한 뒤 메모를 남긴다. 기록은 성공이나 복구 승인이 아니고 상태는 결과 불명 그대로다. 결과 불명 COMMIT 을 확인하면 리허설 통과 기록을 지워 다음 COMMIT 전에 새 리허설을 요구한다. 자동 재개는 없다. 이전 실행기의 작업 프로세스가 살아 있거나 종료를 판정할 수 없으면 모든 작업을 막는다(`PREVIOUS_PROCESS_ALIVE`). ③ AI 전송: 승인 위치는 기관 AI 전송 승인 파일(`--ai-approval`)이고 신선도는 그 바이트 SHA-256 으로 본다. 기관 자료 문맥을 보내기 직전에 작업공간 색인 `ai.transmissions` 에 비밀이 아닌 기록(제공자·모델·모드·승인 reference·승인 파일 SHA-256·보낸 문맥 SHA-256·항목 수·시각)을 남기고, 기록하지 못하면 보내지 않는다. AI 제안을 반영한 원장 초안 메모에 전송 기록 id 와 문맥 SHA-256 을 남긴다. 근거 요청의 질문은 화면 대화와 같은 기준으로 재검사한다. Codex 홈에 실행기가 만들지 않은 설정·지시 입력이 있으면 Codex 를 열지 않는다. profile 을 허용하는 읽기 계획은 표당 행 한도를 요구한다. ④ 시험 실행 경로: `tools/migration-workspace/`·`tools/migration-workspace-prototype/` 의 `*.test.mjs` 는 손으로 나열한 import 래퍼 대신 운영 계약 실행기(`npm run test:operational-contracts` — required CI `secret-scan`·pre-push·`npm run verify`)가 glob 으로 찾고, gate registry 의 운영 계약 카탈로그가 그 안의 skip·only·todo 를 막는다. Windows 전용 시험은 플랫폼 주입으로 모든 OS 에서 돈다. 두 생성 CSS 의 신선도도 이 실행기에서 본다. ⑤ SAST: 두 디렉터리를 CodeQL JavaScript 분석 범위와 로컬 근사 모집단에 넣는다. ⑥ CLI 계약: 실행기가 만드는 CLI 인자(명령·옵션·mode·adapter·object kind·`-D` 속성)·산출물 형식 판·`MW_DIAGNOSTIC` 코드를 Java 소스와 대조하는 계약 시험을 둔다. JAR·DB 를 잇는 자동 통합 증거는 아직 없다. ⑦ CI 분류: 두 디렉터리를 생성기·도구 전용 경로 표(DEC-OPS-297)에 축 없이 넣는다. 그 경로만 바꾸면 운영 계약·SAST·재사용 검증만 돌고, migration-tool 을 함께 바꾸면 이관 축이 켜진다. | 2026-10-25 병합 전 적대 검토가 지적 22건을 냈고 사용자가 모두 고치고 병합하라고 승인했다. 같은 PC 의 다른 로컬 클라이언트가 조건 없이 요청 토큰을 받아 JAR 실행 API 까지 쓸 수 있었다. 결과 불명 작업은 모든 작업을 영구히 막고 해소 경로가 없었으며, 대상에 쓰지 않는 DRY_RUN 의 실패도 결과 불명이 됐다 — migration-tool 의 DRY_RUN 은 대상 쓰기 연결·keymap·상태 저장소를 COMMIT 에서만 연다. ADR-0029 결정 5 의 승인 원장 기록과 보낸 범위 digest 조항은 구현도 대체 표기도 없이 비어 있었다. 이관 승인 원장(ADR-0018)에는 외부 전송 필드가 없어 승인 위치는 승인 파일로 대체를 명시하고(ADR-0041 대체 줄), digest 기록은 구현했다. 시험은 손으로 나열한 import 래퍼로만 돌아 새 파일과 Windows 전용 skip 을 잡지 못했고, 실행기·시안은 CodeQL 범위 밖이었으며, 실행기와 Java CLI 의 인자·형식·진단 코드를 묶는 계약이 없었다. Codex 0.162.1 오프라인 실측에서 홈 `config.toml` 의 지시·MCP 정의가 실제 세션에 상속되고 실행 인자로 지워지지 않아, 인자 대신 입력 파일이 없을 때만 여는 조건으로 삼았다. | [ADR-0041](../02-architecture/decisions/ADR-0041-local-migration-workspace-and-ai.md), [실행 안내](../03-guides/migration-workspace-guide.md), [실행기](../../tools/migration-workspace/server.mjs), [엔진](../../tools/migration-workspace/engine.mjs), [AI 경로](../../tools/migration-workspace/ai.mjs), [CLI 계약](../../tools/migration-workspace/cli-contract.test.mjs), [gate registry](../../config/governance/gates.json), [CodeQL 범위](../../config/security/codeql.yml) | 2026-10-25 | - |

## DEC-OPS-384

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-384 | accepted | **릴리스 이력 검증과 main 비교 기준의 판정 결론을 정한다(2026-10-26 사용자 결정 — 코덱스 하네스 분석 한계 L5 의 선택지 A~D 중 "D로 가는것으로 결정").** ① 릴리스 `verify` 잡은 태그 SHA 의 필수 체크 성공에 더해, 직전 발행 릴리스 이후의 main first-parent 커밋마다 main `ci.yml` 실행을 본다. 직전 발행 릴리스는 태그 대상 앞의 first-parent 커밋에 붙은 `v*` 태그 가운데 GitHub Release 가 발행된(초안 아님) 가장 최근 것이다 — 발행에 실패한 태그와 main 밖의 태그는 아니며, 이 규칙이 들어온 커밋보다 앞으로 가지 않는다. 커밋은 성공한 main push 실행(실패 잡 재실행으로 초록이 된 실행 포함)이 있으면 검증됐다. 그 커밋부터 태그 사이에 성공한 main 수동 실행(workflow_dispatch — 비교 기준이 없어 전수다)이 있으면 그 전수가 덮는다 — 같은 코드로는 다시 돌려도 실패하는 실제 결함은 고친 뒤 수동 전수를 초록으로 만들고 태그한다. 그 밖에 실패·시간 초과·취소·판정 없음·진행 중인 실행이 있거나 조회에 실패하면 막는다. main push 실행이 아예 없는 중간 커밋(push 이벤트 누락)은 다음 push 가 전수로 검증했으므로(DEC-OPS-183) 막지 않고, 태그 대상 커밋이면 막는다. 실행 목록은 페이지로 한 번에 받고 빠진 커밋만 하나씩 다시 묻는다. ② main push 의 비교 기준(`event.before`)은 그 커밋을 판정한 실행 — 성공·실패·시간 초과, 또는 진행 중 — 이 있을 때만 검증된 것으로 본다. 시작 실패·승인 대기·건너뜀·stale·neutral·결론 없이 끝난 실행은 어느 축도 판정하지 않았으므로 전수로 간다. 실패한 실행을 검증으로 보는 DEC-OPS-183 의 판정은 유지한다. | main push 는 직전 SHA 와의 차이만 검증해, 앞 커밋의 실패(main 전용 축·일시 실패)가 그 커밋에만 남은 채 다음 커밋이 초록이 될 수 있고, 릴리스는 태그 SHA 하나의 초록만 봤다. 실패를 곧바로 전수로 바꾸는 안(B)은 최근 main 실행 100회 중 12회 실패(2026-10-09~25) 실측에서 일시 실패마다 전수 비용을 낸다. 릴리스가 드물어(태그 `v0.1.0` 하나) 그 순간에 한 번 보는 D 가 같은 위험을 가장 싸게 막는다. 병합 전 적대 검토가 발행 실패 태그·곁가지 태그로 범위가 줄어드는 구멍, 다시 돌려도 실패하는 실제 결함의 교착, 앞 실행 취소로 전수 전제가 깨지는 경우, 커밋당 조회의 호출 한도를 찾아 위 규칙으로 닫았다. 판정 없는 결론은 DEC-OPS-183 의 근거("그 실행이 그 커밋을 스스로 검증한다")에 맞지 않았다. 규칙 이전 이력의 빨간 실행은 이 규칙 없이 남은 것이라 검사하지 않는다. | [릴리스 이력 검증](../../scripts/release-main-history.mjs), [릴리스 워크플로](../../.github/workflows/release.yml), [변경 분류기](../../scripts/ci-change-scope.mjs), [CI 가이드](../03-guides/cicd-pipeline.md) | 2026-10-26 | DEC-OPS-183 의 '취소되지 않은 실행이면 있음으로 본다' 가운데 판정 없이 끝난 결론 |

## DEC-OPS-385

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-385 | accepted | 방법론 후속 보완 배치를 한 결정으로 묶는다(2026-10-26 사용자 승인). ① `verify:docs` 는 문서 전용 변경의 넓은 경로이지 작업 중 최소 검사가 아니고, 병렬 에이전트·워크플로가 도는 동안 메인도 무거운 검증을 시작하지 않으며, H1·H3·식별자·동시성·게이트 의미를 보는 검토 관점은 채택률로 줄이지 않는다. ② 실행 스킬은 모두 AGENTS·SOP 를 상위 권위로 가리키고 배치 대기·매 작업 검토·필수 재검토·섹션별 승인을 강제하지 않는다. ③ 의미를 바꾸는 변경(H3·H1·식별자·게이트)은 병합 전 독립 검토를 한 번 두고, 검토자는 사용자 원문과 diff 로 반례를 먼저 적은 뒤 재진술을 읽는다. ④ 실행 기록은 겹친 무거운 실행과 실행 중 입력 변경을 경고만 하고 막지 않는다. ⑤ 자동 로드 인덱스에는 어느 경로를 고치든 걸리는 Accepted ADR 의 행과 나머지 Accepted ADR 의 영역별 ID·제목 목록만 두고, 나머지 행은 영역 색인 표 맨 위에 두며, ADR 행에 길이 상한을 둔다. 변경 작업은 그 목록에서 작업과 닿는 ADR 을 영역과 상관없이 읽는다(AGENTS 필수 읽기 3). ⑥ 동시에 작업하면 별도 작업 트리를 쓰고, 커밋할 경로에 다른 작업의 변경이 섞여 있으면 `--only` 커밋 대신 멈추고 보고한다(잠금은 두지 않는다). | 코덱스 방법론 개선 보고(2026-10-26)를 적대 검토해 권고 여섯으로 좁혔다. ① `verify:docs` 를 '최소' 로 적은 문구 때문에 문서 변경에도 pre-push 가 곧 돌릴 운영 계약 전체를 미리 돌렸고(§6.2), 운영 계약은 실행 기록에서 가장 자주 실패한 단계였다. ② 다섯 실행 스킬만 상위 권위에 정렬돼 나머지 다섯이 배치 대기·매 작업 검토·섹션별 승인·기준선 실패 승인을 강제했다. ③ 메인의 재진술만 받은 검토자는 메인의 오해를 그대로 확인한다 — 같은 날 실패가 구현 단계에서야 드러난 사례가 있었다. ④ `run-end` 없는 기록과 실행 중 HEAD 가 바뀐 기록이 실제로 남아 있었다. 원자적 실행 잠금은 진입점 밖에서 난 겹침을 막지 못하고 죽은 프로세스의 잠금이 남을 위험이 있어 진단만 둔다. ⑤ 자동 로드 결정 인덱스가 전체 크기 상한에 가까웠고 ADR 행이 그 절반 가까이였다. 다만 2026-10-26 전수 대조에서 영역에 둔 ADR 대부분이 집행 계약·시험 때문에 다른 영역 경로에도 걸려 경로 라우팅만으로는 닿지 않는 경우가 있었으므로, 행은 영역 색인으로 옮기되 ID·제목 목록은 자동 로드에 남긴다. ⑥ `git commit --only` 는 지정한 경로의 작업 트리 내용을 통째로 담아, 같은 파일에 섞인 다른 작업의 hunk 도 함께 커밋한다. | [오케스트레이션 프로토콜](../03-guides/orchestration-protocol.md), [AGENTS.md 필수 읽기](../../AGENTS.md#작업-시작-시-필수-읽기), [AGENTS.md 공유 워킹트리](../../AGENTS.md#공유-워킹트리와-git), [실행 기록기](../../scripts/verification-record.mjs), [공용 메모리 계약](../../scripts/shared-memory-contract.test.mjs), [결정 인덱스](../../.agent/memory/decisions.md) | 2026-10-26 | DEC-OPS-381 의 '공용 결정 인덱스에는 Accepted ADR(5열)' 가운데 Accepted ADR 전부를 자동 로드하는 부분 |

## DEC-OPS-386

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-386 | accepted | 세 에이전트(Claude Code·Codex·Antigravity) 하네스 공용화 배치를 한 결정으로 묶는다(2026-10-27 사용자 승인). ① 스킬 정본은 `.agent/skills` 하나이고 `npm run regen` 이 `.agents/skills`·`.claude/skills` 에 안내 파일을 만든다 — 안내 경로에 스킬을 직접 쓰지 않는다. ② 셸 명령의 실행 전 가드는 `scripts/agent-guard.mjs` 규칙 표가 정본이고 세 어댑터(`.claude/settings.json`·`.codex/hooks.json`·`.agents/hooks.json`)는 부르기만 한다. 판정할 수 없으면 막지 않고 막지 않은 명령에 승인을 대신 내리지 않는다. ③ 반복된 실수는 기억·문서보다 먼저 가드·lint·계약으로 막고 실제 사례가 붉어지는 시험과 함께 둔다. ④ `npm run dev` 는 원격 DB 에서 Flyway 자동 적용을 끈다(옵트인해도 seed-dev 제외). ⑤ `.agents/`·`.claude/`·`.codex/` 는 내용물만 무시하고 안내 파일·훅만 추적한다. ⑥ 의미를 바꾸는 변경의 독립 검토(DEC-OPS-385 ③)는 가능하면 다른 회사 모델에 맡긴다. | 같은 워킹트리를 세 에이전트가 쓰는데 저장소 스킬 22개는 어느 도구의 탐색 경로에도 없었고(2026-10-27 각 도구 설치본·문서 실측), CI 도 못 잡는 함정(작업 브랜치 마이그레이션의 공유 DB 자동 적용, mutationFn 의 렌더 상태 클로저, 러너 시간의 E2E 날짜)과 셸 명령 실수가 Claude 개인 기억에만 글로 있어 Codex·Antigravity 는 무방비였다. 검토자와 같은 모델은 같은 맹점을 갖는다(pstack `/interrogate`). | [가드](../../scripts/agent-guard.mjs), [스킬 안내 생성기](../../scripts/agent-skill-adapters.mjs), [AGENTS 도구별 진입점](../../AGENTS.md#도구별-진입점), [dev 기동](../../scripts/dev.mjs), [lint 규칙](../../frontend/eslint.config.mjs), [E2E 날짜 계약](../../frontend/src/__tests__/e2e-harness-hygiene.test.ts), [검토 스킬](../../.agent/skills/requesting-code-review/SKILL.md) | 2026-10-27 | - |

## DEC-OPS-387

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-387 | accepted | 하네스·방법론 정합화 배치를 한 결정으로 묶는다(2026-10-27 사용자 승인). ① 다른 회사 모델 독립 검토로 diff·사용자 원문을 보내는 것은 매번 묻지 않되 비밀·토큰·쿠키·개인정보·운영 데이터·`.env` 내용은 보내지 않는다(AGENTS 안전 경계의 예외). ② 포괄 승인("진행해")은 Workflow 도구 동의가 아니고, 작업 브랜치 완료의 상시 승인과 별개다. ③ 훅 우회는 사용자가 명시 지시한 경우뿐이며 실행 전 가드가 환경 변수·`core.hooksPath` 우회도 묻는다. ④ 병합한 브랜치의 로컬 강제 삭제는 끝 커밋이 원격 추적 ref 에 있으면 묻지 않고, 작업 트리 디렉터리 제거는 묻는다. | 2026-10-27 하네스·방법론 읽기 전용 감사(집행 계층·규칙 문서·스킬 세 갈래)가 규칙끼리의 모순을 드러냈다 — AGENTS 의 외부 전송 승인과 DEC-OPS-386 ⑥ 의 다른 회사 모델 검토, 플랫폼의 워크플로 명시 동의와 SOP 의 포괄 승인, 승인 어휘의 두 뜻, SOP 의 훅 우회 금지와 가드의 빈틈(환경 변수·hooksPath), AGENTS 상시 승인의 브랜치 삭제와 가드의 승인 요구(squash 병합 뒤 `-d` 는 거부된다). 같은 배치에서 스킬의 상위 규칙 어긋남(병합 전 독립 검토 누락, dev 스택으로 상호작용 감사, 시험 기대값 조정 허용 등)을 고치고, 에이전트 하네스 다섯 경로를 생성기·도구 경로 표에 넣어(DEC-OPS-297·336 방식, 축은 표 계약이 계산) 하네스만 바꾼 변경이 이관·PIT 를 돌지 않게 했다 — 이 둘은 구현 기록이라 결정 조항에 넣지 않는다. | [AGENTS.md 공통 작업 원칙](../../AGENTS.md#공통-작업-원칙), [SOP Stage 1·§2.1·§2.3·§6.2](../03-guides/orchestration-protocol.md), [실행 전 가드](../../scripts/agent-guard.mjs), [정책 계약](../../scripts/governance-policy-contract.test.mjs) | 2026-10-27 | SOP §2.1 이 포괄 승인을 Workflow 도구 동의로 보던 문구(DEC 없음), 실행 전 가드가 작업 트리 이름 `setup` 을 막던 부분(DEC-OPS-386 ② 구현) |

## DEC-OPS-388

| ID | 상태 | 결정 | 이유 | 정본 | 시행일 | supersedes |
|---|---|---|---|---|---|---|
| DEC-OPS-388 | accepted | 방법론·하네스 감사 후속 배치를 한 결정으로 묶는다(2026-10-28 사용자 승인, 결정 위임 2026-10-29). ① 예약 워크플로가 두 번 연속 비성공이면 green 까지 known-gaps 행이나 같은 추적 기록을 두고, 주간 거버넌스 검토 잡에만 `actions: read` 를 줘 연속 실패 표를 요약에 싣는다. ② 주간 ZAP 은 OpenAPI 사본에서 세션을 끝내는 연산(`POST /api/v1/auth/logout`)만 빼고 스캔하며 세션 확인 단계는 그대로다. ③ pre-push·verify fast/push 는 짧은 결정적 단계(불변식·원문 계약·하네스)를 운영 계약 앞에 두고, `regen --check` 가 손으로 고치는 원장 확인을 함께 돈다. ④ CI 가 내려받아 실행하는 gitleaks 는 고정 SHA-256 을 확인한 뒤 푼다. ⑤ 실행 전 가드는 판정 실패를 규칙 id·오류 이름만 남기고 통과시키며, `echo AGENT_GUARD_CANARY` 로 어댑터 생존을 확인하고, 작업 트리 재귀 삭제를 묻는다. ⑥ 문서 전용 push 범위(DEC-OPS-364)·커밋하는 Atlas(DEC-OPS-335)·정확값 원장(DEC-OPS-371 ②)은 유지하고, 공유 OCI 적용 기록만 담는 PR 은 다음 작업 PR 에 싣거나 하루치를 묶는다. ⑦ 게시글 비밀 여부 NULL 은 응답에서 'N' 으로 내고 새 글은 'N' 으로 저장하며 기존 행은 보정하지 않는다. | 2026-10-28 방법론·하네스 감사(9개 축, 반박 검증, Claude·Codex 교차 비평)에서 예약 워크플로 셋(T2 9회·이관 회귀 4회·ZAP 4회)이 몇 주째 붉은데 받아 볼 경로가 없었고, ZAP 은 스캐너가 로그아웃을 불러 스스로 세션을 끊었다. 짧은 단계가 10분짜리 운영 계약 뒤에서 늦게 붉어졌고(8일 4건), gitleaks 는 바이트 고정 없이 실행됐으며, 가드는 셸 형태·Monitor·작업 트리 삭제에서 빠졌다. 문서 범위 축소·Atlas 산출물화·원장 하한 전환은 측정상 이득이 작거나 신호를 바꾸므로 유지했다. NULL 비밀 여부는 공유 OCI 의 공지·FAQ 게시판에 111행이 있어 도움말 FAQ 목록을 깨뜨렸다. | [예약 실패 보고](../../scripts/ci-flaky-report.mjs), [ZAP 워크플로](../../.github/workflows/zap-scan.yml), [pre-push](../../.githooks/pre-push), [가드](../../scripts/agent-guard.mjs), [SOP §6.2](../03-guides/orchestration-protocol.md#62-검증은-한-커밋에-한-번) | 2026-10-29 | DEC-OPS-126 의 'API 전체' 가운데 세션 종료 연산, DEC-OPS-338 ① 의 소스 경로에서 불변식·원문 계약·하네스를 운영 계약 뒤에 두던 순서 |

## 종료·이전 Gap 기록

아래 문단은 이전 시점의 기록이다. 남은 위험·재개 조건은 현재 Gap 인덱스에서 확인한다.

### GAP-BLOG-001

`GAP-BLOG-001`은 2026-09-08 사용자 요청에 따른 [블로그 도메인 제거 결정(ADR-0012)](../02-architecture/decisions/ADR-0012-retire-blog-domain.md)으로 활성 인덱스에서 종료했다. 종전 유지 결정은 DEC-OPS-073이 대체하며, 과거 구현·스키마 이력은 Git과 Flyway에 보존한다.

### GAP-SEC-006

`GAP-SEC-006`(로그인 정책 보호 계정 가드)은 2026-10-03 종료했다([DEC-OPS-213](../../.agent/memory/decisions.md)). 로그인 정책 등록·수정·삭제가 보호 계정 가드를 부르고, 접속 제한된 관리자는 마지막 관리자 수에서 빠지며, 인가 정책 원장이 세 경로의 가드 호출을 필수 토큰으로 고정한다(가드를 빼면 하네스가 실패하는 것을 확인했다). 묶음 분류에서는 로그인 정책 권한이 '사용자·조직 관리'로 돌아갔다.

### GAP-PROGRAM-001

`GAP-PROGRAM-001`(레거시 프로그램 원장 잔여)은 2026-10-05 종료했다([DEC-OPS-231·233](../../.agent/memory/decisions.md)). 앱이 `prgrm_file_nm` 매핑과 chkURL 대체 경로를 걷고, [V2_126](../../api-server/src/main/resources/db/migration/V2_126__backfill_menu_routes_from_legacy_program_names.sql)이 기동 때 하던 경로 보강을 한 번 했으며, [V2_127](../../api-server/src/main/resources/db/migration/V2_127__drop_retired_program_ledger_and_personal_page_contents.sql)이 그 컬럼·외래 키와 `tb_prgrm_lst`, 빈 `tb_indv_pg_conts` 를 지웠다. 선행 Expand 와 같은 릴리스에 실은 것은 사용자가 이 한 건만 승인한 관측 기간 예외다. 이관 대상 카탈로그 `db_columns.json` 은 이미 지운 다른 테이블도 담는 코드젠 스냅샷이라 두었다.

### GAP-REPRO-001

`GAP-REPRO-001`(재사용 DB 번들 seed 의 행 순서)은 2026-10-16 종료했다. 데이터 seed 는 덤프 직전에 표를 기본 키 순서로 다시 쓴다([덤프 함수](../../scripts/reusable-db-postgres.mjs), 계약은 [DB 생성 시험](../../scripts/project-composer-db.test.mjs)). 실제 생성기로 core 두 번·collaboration 한 번을 만들어 비교했다. 수정 전에는 같은 구성을 두 번 만들면 해시가 같았지만, 내용이 같은 표준 메타 seed 가 core 와 collaboration 에서 달랐다. 덤프 직전 작업 DB 의 물리 행 순서가 구성마다 달랐기 때문이다. 수정 뒤에는 세 번 모두 표준 메타 seed 해시가 같고, 스키마 기준선 해시는 수정 전과 같다.

### GAP-FE-002

`GAP-FE-002`(프록시 연결 재사용 경합)는 2026-10-16 종료했다([DEC-OPS-333](../../.agent/memory/decisions.md)). 미들웨어가 rewrite 요청에 `Connection: close` 를 실어 백엔드 연결을 유휴 재사용하지 않고, 격리 E2E 러너가 Next 서버를 `--keepAliveTimeout 3600000` 으로 띄워 요청 컨텍스트의 유휴 재사용이 서버 종료보다 먼저 닫히지 않는 경합을 없앴다. 격리 재현 전후는 [근거 기록](../04-operations/readiness-followups.md#프록시-연결-재사용-경합-gap-fe-002-2026-09-30)에 있다. CI 의 flaky 감소는 실행 누적으로만 확인되므로, main CI frontend.log 나 Playwright 오류에 `socket hang up`/`ECONNRESET` 이 다시 나오면 이 행을 재개한다.

### GAP-MEMO-001

`GAP-MEMO-001`(메모 보고 지시 작성자)은 2026-10-16 종료했다([DEC-OPS-331](../../.agent/memory/decisions.md)). 지시는 보고를 받은 사람만 남긴다 — 가드(`MemoReportService.assertRecipient`)와 응답 힌트 `instructable`, 화면의 계산에서 전체 수정 권한(MEMO_RPT_UPDATE_ALL) 우회를 걷었고, 인가 원장이 그 경로를 STRICT_OWNER 로 적어 가드 안의 권한 판정을 막는다. 그 권한은 남의 보고 본문만 대행해 고치게 되어 '다른 사람 업무 자료 대행' 묶음으로 돌아갔고, 생성기 사실 검사가 이 판정을 고정한다. 지시에는 여전히 작성자 칸이 없으므로, 이 변경 전에 수신자가 아닌 사람이 단 지시가 있었는지는 저장소로 가릴 수 없다.

### GAP-BASE-002

`GAP-BASE-002`(재사용 생성물의 일반 테스트)는 2026-10-16 종료했다. 수리 뒤 T2 예약 실행 세 번(run 38489580323·38657187882·38825139443)이 31잡 모두 녹색이다. 뒤의 두 번(38657187882·38825139443)은 단독 구성 19개가 서로 다른 레이아웃을 돌아 두 레이아웃을 모두 보았고, 시작 구성 5개는 매번 두 레이아웃을 돌았다. T2 는 required 가 아니므로 다시 붉어지면 원인과 함께 새 gap 으로 연다. core 시작 구성에 소비자 없는 게시판 DTO 3개(요청 2·응답 1)가 남는 것과, 투영 원장이 의도치 않은 연쇄 제거도 적어 시험이 그 부재를 받아들이는 것은 그대로다.

### GAP-BASE-003

`GAP-BASE-003`(결재 구성의 결재 통합 시험 소실)은 2026-10-13 종료했다([DEC-OPS-303](../../.agent/memory/decisions.md)). 알림 행을 보는 시험 하나를 결재·알림이 함께 소유하는 `ApprovalReferenceNotificationIntegrationTest` 로 옮기고, `ApprovalWorkflowIntegrationTest` 의 나머지 13건은 알림 타입 없이 알림 리스너를 무력화해 '공통 기반 + 결재' 생성물에 남는다. 같은 날 로컬 `base:verify --profile approval`(소스 커밋 f6dfd5c80, multi-module)의 생성물 스키마 검증에서 이 클래스 13건이 실패 0으로 돌았고, 새 시험은 그 생성물에 없다. 종전 행이 적은 'T2' 는 부정확했다 — 이 시험은 생성물 검증(T1)의 `schemaValidationTest` 가 돌리고 일반 `test` 는 그 태그를 뺀다.

### GAP-ETL-001

`GAP-ETL-001`(이관 쓰기 단계의 부분 커밋)은 2026-10-14 종료했다([DEC-OPS-310](../../.agent/memory/decisions.md)). batch 가 실패하면 같은 chunk 를 한 transaction 안에서 행마다 다시 쓰고, 한 행이라도 SQL 오류·재변환 실패·`target_generated` 쓰기 실패가 나면 chunk 전체를 롤백하고 run 을 멈춘다. 종전에는 그 행만 빼고 같은 chunk 의 다른 행과 뒤 chunk·테이블을 커밋했고, PR #894 이후에도 재변환 실패 앞의 행은 행마다 커밋된 채 남았다. 승인된 예외 행만 격리하는 경로는 ADR-0029 L3 에서 L2 원장과 함께 만든다. 이미 커밋된 앞 chunk 는 그대로 남으므로 전체 되돌리기는 여전히 승인된 백업 복원이다([복구 런북](../04-operations/migration-recovery-runbook.md)).

### GAP-SLOT-001

`GAP-SLOT-001`(허브 탭 레지스트리가 하나라 다른 허브의 탭 뷰를 함께 싣는 번들 증가)은 2026-10-16 종료했다([DEC-OPS-334](../../.agent/memory/decisions.md)). 슬롯을 `hub-tabs-collaboration`·`-knowledge`·`-monitoring` 으로 나눠 허브 셸이 자기 허브의 레지스트리만 import 한다. 같은 방법(라우트 client reference manifest 의 청크 gzip 합)으로 main `c4fd2e14c` 와 비교한 프로덕션 빌드 실측: 협업 허브 691,596→654,958B(−36,638B), 지식 허브 694,150→668,632B(−25,518B), 감시 허브 709,202→679,382B(−29,820B). 최대 청크는 148,518B 로 불변이고 `bundle:check` 는 통과한다(여유 1.0% 경고는 종전과 같은 청크다). 동적 import 는 쓰지 않아 축 3 과 화면 목록의 귀속은 그대로다.

### GAP-BOARD-002

`GAP-BOARD-002`(게시판 유형 이름의 권위 원천)는 2026-10-16 종료했다([DEC-OPS-332](../../.agent/memory/decisions.md)). 사용자가 화면 상수를 정본으로 고르고 데이터 변경을 하지 않기로 했다. 게시판 마스터 목록은 공통코드 COM004 를 조인하지 않고 응답에 유형 이름을 싣지 않으며, 유형 코드·템플릿·이름은 [게시판 유형 표](../../frontend/src/lib/board/board-types.ts) 하나가 정한다 — 생성 마법사와 마스터 목록이 읽는다. 게시판 기능의 공통코드 그룹과 [이관 바인딩](../../migration-tool/src/main/java/nuri/migration/validate/ProductCodeBindings.java)에서 COM004 를 뺐고, [참조 데이터 계약](../../scripts/reusable-reference-data.test.mjs)이 생산 Java 가 COM004 를 다시 읽으면 실패한다. 남은 사실: 시드·라이브 게시판 4개(`R__seed_demo.sql` 의 BBSMSTR_*)는 유형 코드와 템플릿이 정본의 짝이 아니어서 목록에 이름 없이 코드 그대로 보인다. 맞추려면 데이터 변경 승인이 필요하다.

### GAP-DOMAIN-001

`GAP-DOMAIN-001`(도메인 노출·무결성)은 2026-09-26 닫았다. 메일 본문·수신 주소 노출과 논리 삭제 글의 첨부 공유는 [DEC-OPS-134](../../.agent/memory/decisions.md), 포상 승인 필드의 요청 저장과 늘 비던 관리자 댓글 목록은 DEC-OPS-138, 추천 반복·열람 가드 부재와 만족도 다중 평가·점수 검증 부재는 DEC-OPS-139 가 항목마다 붉음 증명과 함께 고쳤다. 추천 1인 1회는 [V2_107](../../api-server/src/main/resources/db/migration/V2_107__add_recommendation_history_and_rating_unique.sql) 의 이력 PK 가, 만족도 1인 1건은 같은 마이그레이션의 UNIQUE 가 DB 에서도 막는다. 이 변경 전의 추천수(like_cnt)는 이력이 없어 그대로다.

### GAP-BOARD-001

`GAP-BOARD-001`·`GAP-CI-001`은 2026-09-27 종료했다([DEC-OPS-178](../../.agent/memory/decisions.md)). [V2_111](../../api-server/src/main/resources/db/migration/V2_111__clear_retired_post_password.sql)이 폐기된 게시글 비밀번호의 값(199건, 모두 '1')을 비웠고, 새 저장은 DEC-OPS-174부터 멈췄으며 읽는 코드는 없다. 컬럼 제거는 스키마 계약 변경이라 하지 않았다. main CI는 커밋마다 `ci-main-<sha>` 그룹에서 취소 없이 끝까지 돈다 — 취소만 끄면 같은 그룹의 대기 실행이 다음 실행으로 교체되므로 그룹을 SHA로 나눴고, [required-check 계약](../../scripts/required-checks-contract.test.mjs)이 그 형태를 고정한다. 이 변경 전에 병합된 커밋 가운데 main 실행이 취소된 것은 재실행으로 확인했다(#787).

### GAP-SEC-005

`GAP-SEC-005`(인증·세션)는 2026-09-25 종료했다. 공개 가입·ID 확인, 재발급의 정책 재검사, OTP 스위치, 실패를 기록하지 않던 로그인 로그는 [DEC-OPS-135](../../.agent/memory/decisions.md)로, 원문 리프레시 토큰 저장은 [DEC-OPS-136](../../.agent/memory/decisions.md)(SHA-256 해시 저장·V2_106 이 기존 행 삭제)으로 닫았다. 비밀번호 규칙도 같은 변경에서 네 경로를 하나로 맞췄다.

### GAP-DEP-002

`GAP-DEP-002`는 2026-09-24 종료했다. [ADR-0024](../02-architecture/decisions/ADR-0024-spring-boot-4-two-phase-migration.md) 두 단계로 Spring Boot 4.1.1과 Jackson 3에 올랐고, main에서 수동 실행한 NVD 스캔의 억제되지 않은 CVSS≥7 탐지가 198건에서 0건이 되어 Spring 6.2·6.5 라인의 미수정 CVE가 사라진 것을 확인했다. 남은 spring-retry 유지 판단과 재검토 조건은 [DEC-OPS-125](../../.agent/memory/decisions.md)와 [후속 정리](../04-operations/readiness-followups.md#후속-정리-2026-09-24)에 둔다. 4.1 라인의 OSS 지원 종료(2027-07-31)는 다음 minor 결정 시점이다.

### GAP-POLL-001

`GAP-POLL-001`·`GAP-POLICY-001`은 2026-09-22 종료했다. 신규 소실은 각각 [DEC-OPS-082](../../.agent/memory/decisions.md)와 수정 경로의 기존 값 유지로 이미 닫혀 있었고, 남은 행동이던 기존 NULL 행 백필은 OCI 읽기 실측(온라인 투표 3행 전부 `N`·NULL 0, 로그인 정책 0행)과 재사용 DB 번들이 schema-only라는 사실로 대상이 없다. 로그인 정책 등록 경로는 요청에 값이 없으면 `N`으로 저장하도록 [서비스](../../business-core/src/main/java/nuri/business/service/login/LoginPolicyManageService.java)를 맞췄다 — 종전 gap 행이 전제한 등록 보정은 실제로 없었고 화면 폼이 이 값을 보내지 않아 새 행이 NULL로 시작하고 있었다. 다른 도입 환경의 기존 행 분포는 도입처가 읽기 집계로 확인한다.

### GAP-UIDENSITY-001

`GAP-UIDENSITY-001`은 2026-09-23 닫았다. 공용 컴포넌트·화면별 축·일괄 액션 바·지표 카드에 이어 컨트롤 높이 축을 다섯 차례([DEC-OPS-117~121](../../.agent/memory/decisions.md))로 옮겨, 밀도 대상 컨트롤의 고정 높이 덮어쓰기는 11건만 남았고 모두 비대상 판단이다(도달 불가 화면 4·테마 CSS 없는 전역 오류 화면 1·의도적 소형 6). [밀도 계약](../../frontend/src/__tests__/work-screen-grammar-contract.test.ts)이 기본 컴포넌트의 토큰 선언과 덮어쓰기의 파일별 수를 exact 로 막는다. 도달 불가 화면은 DEC-OPS-023 ①에 따라 이행하지 않는다.

### GAP-AUTH-002

`GAP-AUTH-002`는 [V2_85](../../api-server/src/main/resources/db/migration/V2_85__add_authority_reference_fks.sql)와 [FK 통합 검증](../../api-server/src/test/java/nuri/api/schema/AuthorityReferenceFkIntegrationTest.java)으로 해결됐다. 2026-09-09 OCI에서 사용자·메뉴·역할 참조 FK가 모두 validated 상태임을 재확인했다.

### GAP-API-001

`GAP-API-001`은 외부 JSON 응답의 `Map`/`Object` census가 0건이 되어 종료했다. [DashboardResponse](../../api-server/src/main/java/nuri/api/controller/business/main/DashboardResponse.java)와 [ResponseContractLinterTest](../../api-server/src/test/java/nuri/api/harness/ResponseContractLinterTest.java)가 정본이다. 대시보드 핵심 필드는 타입화했지만 내부 `DashboardItemProvider`의 Map과 `@JsonAnyGetter` 추가 필드의 wire 호환성은 유지한다. 모든 확장 필드의 타입화나 승인된 binary/stream 전송까지 닫았다는 의미는 아니다.

### GAP-OPS-002

`GAP-OPS-002`(백업·DR), `GAP-SEC-001`(자격 회전), `GAP-DATA-001`(레거시 암호문), `GAP-AUTH-003`(인가 배포 검증)은 2026-09-21 사용자 결정으로 **기관 채택 수명으로 이전**했다(DEC-OPS-107). 원본 저장소에는 운영 환경이 없어 그 증거를 만들 대상 자체가 없고, 의무의 수신자가 원본이 아니라 채택 기관이다. 앞의 셋은 온라인 승인 통제 [`backup-recovery`·`crypto-lifecycle`](../03-guides/governance-review-lifecycle.md#3-온라인-제품의-기관-도입)로 옮겼고, `GAP-AUTH-003`은 새 통제를 만들지 않고 기존 `authorization` 통제의 검토 내용에 배포 시점 확인(앱 버전·구 writer 종료·로그인·복수 그룹·권한 회수·메뉴)으로 편입했다. [승인 검증기](../../scripts/adoption-review.mjs)가 근거 없는 승인을 거부하며, 이전 전 5통제 집합이 더 이상 승인되지 않는 것을 [계약](../../scripts/governance-review.test.mjs)이 대조군으로 고정한다. 원본에서 닫히지 않았다는 사실이 채택 환경에서 면제된다는 뜻은 아니다.

### GAP-SEC-003

`GAP-SEC-003`(첨부 provenance census), `GAP-STORAGE-001`(정기 첨부 점검의 운영 실행·경보), `GAP-OPS-001`(운영 규모 부하·NVD 전량·인증 ZAP)은 2026-09-23 사용자 결정으로 같은 패턴을 따라 **기관 채택 수명으로 이전**했다(DEC-OPS-111). 온라인 승인 통제 [`attachment-operations`·`operational-assurance`](../03-guides/governance-review-lifecycle.md#3-온라인-제품의-기관-도입)가 그 증거를 요구하며, 이전 전 7통제 집합이 더 이상 승인되지 않는 것을 [계약](../../scripts/governance-review.test.mjs)이 대조군으로 고정한다. 원본에 남는 것은 증거가 아니라 설계 결정 둘이다 — 직접 DB 쓰기·import 경로에 첨부 provenance 강제를 둘지, 인증 ZAP context 를 compose seed-dev 계정에 결속할지(저장소 안에서 가능한 별건). 후자는 2026-09-24 주간 ZAP 이 개발 시드 관리자로 로그인해 OpenAPI 로 API 를 스캔하게 되며 닫혔다(DEC-OPS-126).

### GAP-CONTRACT-001 보강 기록

GAP-CONTRACT-001의 2026-09-06 보강은 길이·필수 제약에 더해 Memo/Work 보고 13필드와 DeptJob 계열 15필드, 총 28개의 서버 소유·응답 전용 필드를 Jackson/OpenAPI read-only로 고정했다. Work 보고 등록은 [서비스](../../business-app/src/main/java/nuri/business/service/report/WorkReportService.java)가 인증 loginId를 직접 확인하고, 수정·응답의 `rptYmd` 왕복도 복원한다. 이 완료 증거는 남은 미검사 DTO·공백 의미·root validation 사각을 닫았다는 뜻이 아니다.

### GAP-FE-003

`GAP-FE-003`(스트리밍 공개와 하이드레이션)은 2026-10-22 종료했다([DEC-OPS-377](../../.agent/memory/decisions.md)). 첫 화면 직후 공급자 값 변경 셋(같은 사용자 재조회의 새 객체·실시간 연결·머리글의 현재 메뉴)을 없애 공개를 기다리던 경계를 브라우저가 다시 그리지 않게 했고, 그로 드러난 사이드바의 늦은 하이드레이션 불일치(빠른 이동 뒤 React #418)는 머리글·사이드바를 셸과 함께 보내 닫았다. 회귀는 공급자 단위 시험 셋과 셸 접근성 계약이 막고, 하이드레이션 전 입력은 E2E 공용 대기(`waitForHydration`)가 다룬다. 공개를 늦춰 경합을 재현한 시험과 trace 분석은 PR #959 에 있다.

### GAP-BOARD-003

`GAP-BOARD-003`(게시판 가시성 판정 불일치)은 2026-10-23 종료했다([ADR-0040](../02-architecture/decisions/ADR-0040-board-operations-management.md), [설계서 §7](../02-architecture/board-management-expansion-design.md#7-구현-배치와-검증)). A0(#963)이 공개 FAQ 목록·상세와 첨부 판정에 게시 종료일을 넣고, 목록 응답에 게시 기간을 싣고, 만족도 수정·삭제를 평가의 실제 게시판·글과 대조하게 하고, 영구 삭제 단건 판정을 일괄과 같은 질의로 맞췄다. 본문·첨부 판정은 `BoardAttachmentAccessTest`가 대조한다. A2가 사용 안 함 게시판의 등록·수정·삭제·해결 표시와 파일 경로 쓰기를 쓰기 판정(`loadWritableMaster`)으로 닫고, 사용 여부를 커뮤니티 가드보다 먼저 봐 사용 안 함 커뮤니티 게시판의 비회원 요청도 없는 게시판과 같은 404를 받게 했다. 사용 안 함 게시판에서는 작성자의 첨부 소유 근거(열람·삭제)도 닫았다(D1 기각 ②). 기간 조건과 쓰기 판정을 뺀 변이의 red 증명은 각 PR에 있다.
