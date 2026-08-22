# UI/UX 사용성·접근성·반응형·성능 Baseline Protocol

- **Status:** Active protocol · baseline evidence `unmeasured`
- **Owner:** UX research + quality engineering — 담당자 미지정
- **Accessibility reviewer:** 담당자 미지정
- **Review by:** 2026-10-31
- **Protocol version:** 1
- **Evidence review date:** 2026-08-21

> 이 문서는 긴급 보안·접근성 수리 뒤, 수직 파일럿 전의 **post-emergency / pre-pilot reference baseline**을 같은 조건으로 수집·재검증하기 위한 운영 절차다. 2026-08-20 착수 전 tree의 exact SHA·dirty patch·실행 artifact가 없어 원래 pre-change 사용자·성능 baseline은 `unavailable`이며 사후에 창작하거나 현재 측정치로 대체하지 않는다. 현재 권위 자동 증거는 2026-08-21 r12 실행이다. exact 자동 모집단·privacy 검사와 격리 synthetic mutation 36건의 case-bound 실행/readback/rollback/cleanup은 완료했지만, 수동 AT/전문가 검토·사용자 연구·artifact 내구성이 완료되지 않아 reference baseline은 여전히 `unmeasured`다. 숫자가 없는 상태를 0 또는 통과로 해석하지 않고, 자동 위반 0건을 WCAG 준수나 전체 baseline 완료로 승격하지 않는다. 상세 provenance와 과거 실행 이력은 §13.1에 기록한다.

## 1. 목적, 권위와 증거 경계

reference baseline의 목적은 긴급 수리 이후의 현재 기반과 이후 파일럿·웨이브를 같은 `route + role + state + brandTheme + colorMode + viewport`에서 비교하고, 기능·사용성·접근성·성능 중 하나를 다른 지표로 가리지 않는 것이다. 2026-08-20 착수 전 구조 census는 계획 문서에 과거 snapshot으로 남지만, 실행 artifact가 없는 과거 UX 수치와 동일하지 않다.

- 실행 입력과 exact 모집단은 [UI quality scenario manifest](../../config/ui-quality-scenarios.json)가 소유한다.
- 제품 목표·사용자 연구와 success/rollback 초안은 [UI/UX 제품 brief](../01-product/ui-ux-modernization-brief.md)가 소유한다.
- 현대화 단계와 gate는 [UI/UX 현대화 계획](../02-architecture/ui-ux-modernization-plan.md)이 소유한다.
- 테스트 실행 계층은 [testing guide](../03-guides/testing-guide.md)가 소유한다.
- WCAG 2.2 A·AA 목표와 수동 평가 의무는 [프런트엔드 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)이 우선한다.

이 protocol은 다음을 증명하지 않는다.

- 화면이 존재한다는 이유만으로 기능이 `live`라는 주장.
- axe 위반 0건만으로 WCAG 2.2 준수라는 주장.
- 소규모 expert task 결과를 실제 사용자 빈도·선호·성과로 일반화하는 주장.
- lab interaction proxy를 field INP로 부르는 주장.
- 실행하지 않은 Playwright, LCP, CLS, route JS, completion time 값을 채우는 행위.

## 2. Baseline archetype과 현재 선택 근거

### 2.1 Exact scenario population

| Scenario ID | Archetype | Exact route·actor | 재현할 상태·task | 현재 baseline | Evidence path |
|---|---|---|---|---|---|
| `auth-login` | 인증·오류·복귀 | `/login`; `ANONYMOUS`→synthetic `ADMIN` | invalid credentials, 오류 focus, 성공 인증, 안전한 상대 목적지 복귀 | `unmeasured` | `build/reports/ui-quality-baseline/auth-login/baseline-result.json` |
| `admin-shell-hub` | shell/hub/navigation | `/admin`; `ADMIN` | dashboard ready, sidebar/overlay, 지정 업무 목적지 탐색 | `unmeasured` | `build/reports/ui-quality-baseline/admin-shell-hub/baseline-result.json` |
| `dense-user-logs` | dense list | `/admin/system/logs/user`; `ADMIN` | dense rows, filter, filtered-zero, injected 5xx, scoped retry | `unmeasured` | `build/reports/ui-quality-baseline/dense-user-logs/baseline-result.json` |
| `user-management-hub` | master-detail hub | `/admin/user/manage`; `ADMIN` | search, row/detail selection, synthetic role/status edit, mutation error와 readback | `unmeasured` | `build/reports/ui-quality-baseline/user-management-hub/baseline-result.json` |
| `board-article-composer` | form/composer/autosave | `/admin/community/boards/insert-board-article?bbsId={syntheticBoardId}`; `ADMIN` | validation, rich text, autosave/reload 복구, authoritative save | `unmeasured` | `build/reports/ui-quality-baseline/board-article-composer/baseline-result.json` |
| `faq-admin-user-lifecycle` | admin→user complete process | composer→`/admin/help/faq` (`ADMIN`)→`/help` (`USER`) | 작성, 관리자 readback, 사용자 검색·답변 열람 | `unmeasured` | `build/reports/ui-quality-baseline/faq-admin-user-lifecycle/baseline-result.json` |
| `board-maker-wizard` | complex interaction/wizard | `/admin/community/boards/maker`; `ADMIN` | 4단계 진행, validation focus, 이전/다음, deploy readback | `unmeasured` | `build/reports/ui-quality-baseline/board-maker-wizard/baseline-result.json` |
| `first-use-onboarding` | first-use guidance | `/admin`; `ADMIN` | 최초 1회 안내 modal, 설명 연결, focus 진입, 닫기 action | `unmeasured` | `build/reports/ui-quality-baseline/first-use-onboarding/baseline-result.json` |

각 scenario의 `role`은 이번 baseline에서 사용할 actor이지 해당 route의 전체 허용 역할을 선언한 것이 아니다. 현재 [route capability manifest](../../config/ui-route-capabilities.json)에서 위 route의 역할·상태·action은 모두 `unverified`이므로 owner와 2026-10-31 review bound를 유지한다.

### 2.2 잘못된 route 대리 사용 방지

게시글 composer의 현재 production-evidenced 진입점은 `/admin/community/boards/insert-board-article`다.

- 실제 page는 `BoardRegistClient`를 렌더한다: [insert-board-article/page.tsx](../../frontend/src/app/admin/community/boards/insert-board-article/page.tsx).
- 게시글 생명주기와 autosave E2E source도 이 route를 사용한다: [03-board-community.spec.ts](../../frontend/e2e/03-board-community.spec.ts), [04-quality-resilience.spec.ts](../../frontend/e2e/04-quality-resilience.spec.ts).
- `/admin/community/boards/write`는 redirect alias가 아니라 별도 parallel page이고 위 생명주기 증거가 없다. baseline composer를 이 route로 바꾸면 contract test가 red다.

현재 `BoardRegistClient`에서는 rich editor와 autosave 근거는 확인했지만 가시적인 upload control은 확인하지 못했다. 따라서 upload 성공을 baseline task 결과로 선결하지 않는다. 실행 시 첨부 action이 보이면 capability truth와 서버 readback을 먼저 확인하고, 보이지 않거나 지원되지 않으면 `unavailable/unverified`로 기록한다. 첨부 기능을 흉내 낸 mock 성공은 금지한다.

### 2.3 Cross-role 후보 선택과 한계

FAQ를 선택한 이유는 기존 E2E source가 관리자 작성→관리자 목록 확인→사용자 `/help` 검색까지 UI를 통과하도록 정의하기 때문이다: [05-public-experience.spec.ts](../../frontend/e2e/05-public-experience.spec.ts), [KnowledgePage.ts](../../frontend/e2e/pages/KnowledgePage.ts).

기존 test는 사용자 목록에서 질문이 보이고 검색되는 것까지 주장하지만 답변 panel을 열어 내용까지 읽는 완료 상태는 고정하지 않는다. 이번 baseline은 답변 열람을 authoritative end state로 추가 측정하되, 실행 전 결과를 성공으로 기록하지 않는다.

설문 lifecycle은 현재 사용자 투표 단계가 API-first라 UI complete-process 증거가 아니다. 설문을 후속 후보로 바꾸려면 관리자 생성·사용자 UI 응답·중복 방지·관리자 결과 readback을 모두 같은 scenario로 실행해야 한다.

### 2.4 Complex interaction 후보

`/admin/community/boards/maker`는 4단계 wizard와 validation·배포 readback source가 있어 complex interaction 후보로 선택했다. drag-and-drop을 자동화하지 않는 조직도 test보다 현재 실행 정의가 구체적이다. route source는 [maker/page.tsx](../../frontend/src/app/admin/community/boards/maker/page.tsx), 기존 E2E 정의는 [03-board-master-management.spec.ts](../../frontend/e2e/03-board-master-management.spec.ts)다. E2E source 존재는 현재 pass 증거가 아니다.

## 3. Case identity와 render matrix

### 3.1 Case ID

모든 측정 행은 다음 여섯 축을 빠짐없이 가진다.

```text
caseId = route + role + state + brandTheme + colorMode + viewport
```

`state`는 최소 `data`, `interaction`, `network`를 가진다. 예를 들어 동일 route의 `filtered-zero`와 `injected-5xx`를 하나의 “empty” 결과로 합치면 안 된다. query에는 실제 식별자나 검색어 대신 `{syntheticBoardId}`처럼 placeholder만 manifest에 기록한다.

### 3.2 현재 고정 matrix

- `brandTheme`: `current-default` 하나. 현재 렌더 기준선을 식별하는 이름이며 승인된 기관 브랜드 profile이 아니다.
- `colorMode`: `light`, `dark`.
- `viewport`: `320×800`, `768×1024`, `1280×800` CSS px.
- 수동 reflow: 별도로 1280px 기준 Chrome 400% zoom에서 `window.innerWidth`가 약 320 CSS px인지 확인한다.

각 scenario는 위 `brandTheme × colorMode × viewport`의 6개 조합을 모두 선언한다. 실행 비용 때문에 일부 조합을 제외하려면 manifest에서 조용히 삭제하지 않고 owner, 이유, 만료일이 있는 별도 승인 변경을 먼저 만든다.

### 3.3 State 준비 계약

1. 모든 데이터는 고정된 synthetic seed와 격리 계정을 사용한다.
2. `loaded`, `filtered-zero`, `server-error`, `validation-error`, `mutation-error`를 별도 fixture로 만든다.
3. 네트워크 오류는 대상 요청 하나만 식별해 주입한다. 모든 요청을 실패시켜 어떤 경계가 복구하는지 모르게 만들지 않는다.
4. 완료 상태는 toast·heading이 아니라 server ID, 재조회, 다른 actor의 readback 중 해당 과업의 권위 원천으로 확인한다.
5. scenario 시작 전 이전 실행의 draft, query cache, storage, 생성 데이터를 정리하고 정리 결과를 기록한다.

## 4. 실행 전 preflight

baseline runner는 매 실행마다 다음을 `environment.json`에 기록한다.

- exact Git commit SHA, dirty 여부와 대상 production build input이 dirty라면 `dirtyBuildInputDiffHash`. 진단 실행은 canonical delta의 lowercase SHA-256 `64-hex`를 기록할 수 있지만, `r13` full/combined 후보는 정확히 `null`인 clean committed input만 허용한다.
- API·frontend image가 소비하는 명시적 production build input과 baseline runner/manifest만의 `buildInputTreeHash`. root Gradle 설정과 `lombok.config` annotation-processing 설정도 production build input에 포함하고, `gradle/**`, `api-server`, `business-app`, `business-core`, `foundation`, frontend build source를 함께 묶는다. ignored auth state, `.env*`, key store, `application-local.yml|yaml|properties`, storage, log, build·test 생성물은 읽거나 hash하지 않는다. 로컬 Spring 설정은 root Docker context에서도 제외되어야 하며 exclusion 제거나 negation 재포함은 operational contract를 red로 만든다.
- inspect로 실측한 frontend/backend image 식별자와 frontend/API loopback base URL. 운영 환경은 사용하지 않는다.
- Node, pnpm, Playwright, Chromium, axe-core version.
- OS, locale `ko-KR`, timezone `Asia/Seoul`, device scale factor.
- scenario manifest hash와 route capability manifest hash.
- 이 protocol 파일의 exact raw bytes SHA-256 `protocolHash`와 종료 시 동일성 확인 boolean. decoded text나 현재 문서의 사후 hash를 실행 provenance로 대체하지 않는다.
- semantic baseline ID `r13`과 매 attempt마다 새로 만드는 lowercase UUID-v4 `executionId`. 282개 자동 JSON, 8개 environment, progress/summary와 final seal은 모두 같은 두 ID를 가져야 한다.
- runner/core/runner-contract/scenario-contract의 exact raw-byte hash. 시작·종료 모두 현재 worktree raw bytes와 실행 commit의 Git blob bytes가 일치해야 한다.
- synthetic seed ID, actor role, 권한 preflight 결과. 실제 user ID나 token은 기록하지 않는다.
- `brandTheme`, `colorMode`, viewport, browser zoom, forced-colors/reduced-motion 설정.
- 실행자, manual reviewer, redaction reviewer와 실행 시각.

다음 조건이면 숫자를 수집하지 않고 `invalid-run`으로 종료한다.

- 격리 DB·API·frontend 중 하나가 준비되지 않음.
- frontend/API container의 exact ID·run-scoped name·Compose project/service/network 결속이 다르거나, `docker inspect` CLI 실패·timeout·malformed projection·multiple port mapping으로 현재 stack을 단일하게 검증하지 못함.
- inspect의 actual image가 선언한 build ID와 다르거나, image의 revision/build-input label이 실행 commit·`buildInputTreeHash`와 다름.
- frontend/API 중 하나가 `State.Running=true`, `State.Status=running`, `Health.Status=healthy`, `RestartCount=0`을 만족하지 않거나 URL의 loopback host port가 private `3000/tcp`·`8080/tcp`의 단일 published mapping과 다름.
- synthetic role 또는 권한이 scenario와 다름.
- route가 redirect·403·demo 등 예상과 다르지만 원인을 판정하지 않은 상태.
- 콘솔/API 오류가 fixture 의도와 구분되지 않음.
- manifest와 실행 build가 다른 commit의 route population을 가리킴.
- 실행 시작과 종료의 `buildInputTreeHash`가 다름. 장시간 실행 중 source가 바뀐 결과는 일부 case가 정상이어도 승격하지 않는다.
- 실행 시작과 종료의 `protocolHash`가 다르거나 exact raw bytes를 읽고 lowercase SHA-256 `64-hex`로 만들지 못함.
- manifest의 protocol pointer가 이 문서의 canonical repository path와 다르거나, protocol·runner·core·두 contract의 worktree raw bytes가 실행 commit의 Git blob bytes와 다름.
- full 실행의 production input dirty fingerprint가 `null`이 아니거나, UUID 실행 ID가 artifact 전반에서 누락·중복·다른 attempt와 혼합됨.
- 실제 개인정보·자격증명·운영 log가 노출됨.

### 4.1 현재 자동 runner와 fail-closed preflight

현재 자동 실행 진입점은 `frontend/scripts/ui-quality-baseline-runner.mjs`이고, 순수 모집단·redaction 계약은 `frontend/scripts/ui-quality-baseline-core.mjs`, 부정 검증은 `scripts/ui-quality-baseline-runner-contract.test.mjs`가 소유한다.

`dirtyBuildInputDiffHash`는 HEAD 대비 tracked·staged·deleted 상태와 untracked production input의 현재 content hash를 경로 순서에 무관한 canonical record로 합성한다. 이때 `buildInputTreeHash`와 동일한 production path gate를 먼저 적용한다. `.env*`, Playwright auth state, key/keystore, `application-local.*`, storage/log/build/test 생성물처럼 제외된 후보에는 filesystem stat·read·content hash를 호출하지 않는다. artifact에는 최종 `64-hex` 또는 clean을 뜻하는 `null`만 남기며 원문 diff, raw diff, 파일 경로, 파일 내용은 남기지 않는다. `buildInputTreeHash`는 실행 commit의 selected Git blob raw bytes로 계산하고, protocol·runner·core·두 contract는 worktree raw bytes와 같은 commit의 blob raw bytes가 exact 일치할 때만 hash를 채택한다. 이 분리는 Windows CRLF checkout을 blob LF로 오인하거나, 반대로 변경된 worktree를 committed source로 가장하는 일을 막는다. Git 조회·선택 파일 읽기·hash 계산·형식 검증 중 하나라도 실패하면 fallback 값을 만들지 않고 browser launch 전 preflight를 red로 종료한다. runner는 시작과 종료에 commit SHA, tree hash, dirty fingerprint, manifest/plan, route truth, protocol과 tooling raw-byte hash를 모두 다시 계산하며 하나라도 달라지면 final seal을 쓰지 않는다.

```powershell
pnpm -C frontend run ui-quality:plan
node --test scripts/ui-quality-baseline-runner-contract.test.mjs
```

`ui-quality:plan`은 브라우저나 데이터에 접근하지 않고 다음 exact population을 검증한다.

- 첫 사용 안내를 포함한 8개 scenario.
- `brandTheme 1 × colorMode 2 × viewport 3`인 48개 render case.
- 16개 journey state 각각을 같은 6개 render 조합에 바인딩한 96개 state case.
- performance target 48개와 각 target의 cold 3회, 기록하지 않는 warm prime 1회, warm 3회. 즉 기록 대상 performance run은 288회이고 cache prime은 별도 48회다.

이 분모는 문서나 별도 schema test에만 의존하지 않는다. runner core가 frozen scenario별 journey step, brand theme, color mode, viewport, performance target과 최종 `8/48/96/48` population을 실행 직전에 다시 검증한다. step 또는 dimension을 manifest와 scenario 양쪽에서 함께 줄이거나 늘려도 실행은 시작되지 않는다.

첫 사용 안내는 일반 route 측정에서 우연히 나타나는 timer 잡음으로 취급해 제외하지 않는다. runner는 `onboarding-first-use` 이외의 모든 case에서 navigation 전에 비민감 UI preference `egov_smart_tour_v1=true`를 주입한다. 전용 first-use case는 private auth storage state를 파싱하거나 복사하지 않고, synthetic same-origin preference preparation document를 먼저 확립한 뒤 그 origin의 `egov_smart_tour_v1` 한 key만 제거하고 실제 route로 이동한다. storage state 복원과 init script의 실행 순서에 의존한 remove는 결정적 준비로 인정하지 않는다. 전용 case는 이름·설명이 있는 modal, 내부 focus와 닫기 action이 준비된 뒤 axe·responsive·performance를 관측한다. 이 분리는 제품의 최초 1회 자동 노출 계약을 보존하면서 다른 scenario의 상태 귀속을 결정적으로 만든다.

일반 실행은 아래 환경이 모두 준비되지 않으면 browser launch 전에 `baseline-preflight-incomplete`로 red가 된다. 값은 synthetic fixture용 비밀 저장소나 현재 process environment로 주입하며 문서·명령 이력·artifact에 실제 값을 적지 않는다.

이미지는 임의 working tree나 수동 `docker build`에서 준비하지 않는다. clean `HEAD`의 Git archive만 stdin context로 사용하는 아래 contract-first 진입점을 쓰며, `<outside-repository>`는 저장소 밖에 미리 만든 디렉터리의 새 absolute 파일 경로여야 한다.

```powershell
npm run ui-quality:baseline:build -- --build-sha <40-hex-head> --api-image egov-uiux-r13-api:<tag> --frontend-image egov-uiux-r13-frontend:<tag> --backend-api-url http://api:8080/api/v1 --public-api-url http://api:8080/api/v1 --attestation-output <outside-repository>/build-attestation.json --execute confirmed
```

wrapper는 Docker 호출 전에 tracked·untracked dirty 상태, HEAD/build SHA, committed production-input tree, archive policy와 attestation 출력 경계를 fail-closed로 확인한다. 각 `docker build --pull --no-cache`는 별도 `--iidfile`을 사용한다. 각 build 직후 bounded `docker image inspect`(5초, 최대 4,096 bytes)로 같은 tag의 actual `.Id`가 iidfile의 `sha256:<64 lowercase hex>`와 exact 일치하는지, image-level `Config.Labels`의 `org.opencontainers.image.revision`과 `io.egov.ui-quality.build-input-tree-sha256`가 committed build SHA/tree와 exact 일치하는지 읽는다. 두 이미지가 모두 닫힌 뒤에만 `{payload,payloadSha256}` closed envelope를 canonical compact UTF-8+LF로 저장소 밖 새 regular file에 atomic rename하고 exact readback한다. `payload`는 schema/kind, `baselineRunId=r13`, build SHA, build-input tree hash, `commitTreeId`와 API/frontend actual image ID만 가진다. payload digest는 canonical payload bytes에, runner 환경의 attestation SHA-256은 exact envelope file bytes에 각각 결속한다. malformed·oversize·CLI 실패·wrong tag ID·label mismatch·기존 출력 파일·symlink는 publication 전에 red다.

attested image의 표준 기동·실행 진입점은 아래 root package command다. 실행 전 `UI_BASELINE_DB_PASSWORD`, `UI_BASELINE_JWT_SECRET`, `UI_BASELINE_ADMIN_ID`, `UI_BASELINE_ADMIN_SECRET`을 현재 process에 안전하게 주입해야 하며 실제 값은 문서·명령 인자·로그에 쓰지 않는다. DB 이름과 사용자는 `UI_BASELINE_DB_NAME`, `UI_BASELINE_DB_USER`로 선택 주입할 수 있다.

```powershell
npm run ui-quality:baseline:launch -- --attestation <absolute-outside-repository-attestation-path> --attestation-sha256 <64-lowercase-hex> --web-port <loopback-host-port> --api-port <different-loopback-host-port> --execute confirmed
```

launcher는 clean `HEAD`와 attestation commit/tree를 먼저 exact 비교하고 scenario·runner·launcher contract를 Docker보다 먼저 실행한다. 그 뒤 OS 임시 디렉터리 아래에 secret value가 없는 전용 `compose.json`을 만들고, exact readback한 canonical bytes를 `docker compose --file -`의 stdin으로만 전달해 descriptor path 교체가 다른 Compose 실행으로 이어지지 않게 한다. `egov-uiux-baseline-r13-<32 lowercase hex>` project와 그 project에서 파생한 DB/API/frontend container·network name을 사용한다. API/frontend image에는 attestation의 immutable image ID를 직접 지정하고 build·pull을 금지하며, 두 host port는 `127.0.0.1`에만 publish한다. `docker compose up --wait` 뒤 full container ID, actual image, Compose project/service, network membership, health, restart count, exact port와 image-level provenance label을 bounded inspect로 다시 검증한다. 검증된 값과 필요한 admin credential만 closed allowlist environment로 같은 stack의 auth setup과 authoritative `--execute --include-performance` runner에 전달하며 DB/JWT/그 밖의 상속 환경은 runner에 전달하지 않는다. 성공·실패 모두 project·ephemeral DB volume을 `down --volumes --remove-orphans`로 정리하고 raw inspect, attestation path, credential은 출력하지 않는다. 기본 `docker-compose.yml`은 읽거나 수정하지 않으므로 개발용 고정 container 동작은 바뀌지 않는다.

비정상 종료와 cleanup 실패에는 secret이 없는 descriptor를 남긴다. 오류에 표시된 project 또는 OS 임시 디렉터리 `egov-ui-quality-baseline-r13` 아래 exact project directory를 확인한 뒤 다음 bounded recovery만 사용한다. descriptor가 canonical launcher shape와 다르거나 path가 symlink/junction·repository 내부이면 Docker 명령 전에 red다.

```powershell
npm run ui-quality:baseline:launch -- --recover-project egov-uiux-baseline-r13-<32-lowercase-hex> --execute confirmed
```

| 변수/파일 | 요구사항 | artifact 기록 |
|---|---|---|
| `UI_BASELINE_WEB_URL` | `localhost`, `127.0.0.1`, `::1` 중 하나의 격리 frontend origin과 명시적 host port. credential/query/fragment/path 금지 | query 없는 origin만 기록 |
| `UI_BASELINE_API_URL` | 같은 격리 stack의 API loopback origin과 명시적 host port. credential/query/fragment/path 금지 | 기록하지 않음 |
| `UI_BASELINE_STACK_CLASSIFICATION` | 정확히 `isolated-synthetic` | 분류 문자열 |
| `UI_BASELINE_FRONTEND_BUILD_ID`, `UI_BASELINE_BACKEND_BUILD_ID` | 현재 격리 stack의 immutable `sha256:<64 lowercase hex>` image ID. environment 형식만 믿지 않고 inspect의 actual `.Image`와 exact 비교 | 검증된 safe identifier |
| `UI_BASELINE_BUILD_ATTESTATION_PATH` | 위 wrapper가 만든 저장소 밖 absolute canonical envelope 경로. regular file만 허용하고 symlink·repository 내부 경로 금지 | 경로 기록 금지 |
| `UI_BASELINE_BUILD_ATTESTATION_SHA256` | attestation exact raw file bytes의 lowercase SHA-256 `64-hex`. runner가 bounded readback으로 다시 계산 | 검증 여부만 기록 |
| `UI_BASELINE_FRONTEND_CONTAINER_ID`, `UI_BASELINE_BACKEND_CONTAINER_ID` | 서로 다른 full `64 lowercase hex` container ID. name 검색이나 짧은 ID 대신 inspect 대상 자체를 exact 결속 | ID 기록 금지 |
| `UI_BASELINE_FRONTEND_CONTAINER_NAME`, `UI_BASELINE_BACKEND_CONTAINER_NAME` | caller가 만든 서로 다른 exact run-scoped name. `egov-frontend`·`egov-api` 같은 기본 이름을 추론하지 않음 | name 기록 금지 |
| `UI_BASELINE_DOCKER_PROJECT` | exact `egov-uiux-baseline-r13-*` project. 두 container의 `com.docker.compose.project` label과 일치 | 원문 기록 금지 |
| `UI_BASELINE_DOCKER_NETWORK` | 두 container가 함께 연결된 exact run-scoped network name | 원문 기록 금지 |
| `UI_BASELINE_SYNTHETIC_SEED_LABEL` | 실제 식별자가 아닌 고정 fixture label | label만 기록 |
| `UI_BASELINE_ADMIN_ID`, `UI_BASELINE_ADMIN_SECRET` | 로그인 성공 state와 로그인 performance 반복에만 메모리에서 사용 | 기록 금지 |
| `frontend/playwright/.auth/admin.json`, `user.json` | 같은 stack에서 setup으로 생성된 private ignored storage state. 내용을 사람이 읽거나 복사하지 않음 | 경로·내용 모두 결과에 기록하지 않음 |
| `UI_BASELINE_SYNTHETIC_BOARD_ID`, `UI_BASELINE_SYNTHETIC_FAQ_BOARD_ID` | 필요 시 격리 seed의 synthetic board를 지정. 미지정 시 현재 고정 synthetic seed ID 사용 | manifest placeholder만 기록 |

auth state는 같은 origin/API에 대해 기존 setup으로 먼저 생성한다. setup과 runner 사이에 stack/image/port를 바꾸면 다시 생성한다.

모든 provenance를 기록하는 full·mutation diagnostic·일반 diagnostic execute는 browser launch 전에 같은 build envelope와 stack을 검증하고 final seal 직전 둘 다 다시 검증한다. 먼저 runner는 저장소 밖 attestation regular file을 symlink·비정규 파일 없이 최대 4,096 bytes로 읽어 exact raw-file SHA-256, canonical `{payload,payloadSha256}` envelope, 실행 `buildSha`·`buildInputTreeHash`·`commitTreeId`, 환경의 두 image ID를 교차 검증한다. 시작과 종료는 같은 path·raw digest·payload identity에 결속된다.

runner는 full container JSON을 읽지 않고 `docker inspect --type container --format`의 fixed projection만 최대 4,096 bytes·5초로 읽는다. container projection은 provenance label을 읽지 않으며, `.Id`, `.Name`, actual `.Image`, `State.Running`, `State.Status`, `Health.Status`, `RestartCount`, published port map, 요구 network membership boolean과 `com.docker.compose.project`·`com.docker.compose.service`만 포함한다. container의 `.Config.Labels`는 실행 시 override할 수 있으므로 image build provenance의 원천으로 사용하지 않는다. 이어서 각 actual `.Image`를 exact 인자로 넘긴 별도 `docker image inspect --format`을 같은 크기·시간 한계로 실행하고, image-level `.Id`와 `Config.Labels`의 아래 두 provenance 값만 읽는다.

- attestation payload ID, 환경 build ID, container actual `.Image`, image inspect actual `.Id`는 frontend/API 역할별로 모두 exact 일치한다.
- image-level `org.opencontainers.image.revision`은 실행 `buildSha`와 exact 일치한다.
- image-level `io.egov.ui-quality.build-input-tree-sha256`는 실행 `buildInputTreeHash`와 exact 일치한다.
- `com.docker.compose.project`는 `UI_BASELINE_DOCKER_PROJECT`, `com.docker.compose.service`는 frontend/API 각각 `frontend`/`api`와 exact 일치한다.
- frontend private `3000/tcp`, API private `8080/tcp`는 각 URL에서 추출한 loopback host IP/port에 정확히 한 번만 published되어야 한다. `0.0.0.0`, `::`, wrong port, missing 또는 multiple mapping은 허용하지 않는다.

attestation path·raw SHA·canonical envelope·payload digest·commit tree·image ID 결속이 다르면 `baseline-build-unverified`, container/image inspect CLI missing·timeout·malformed JSON·multiple mapping, stopped/unhealthy/restarting container, restart count 증가, 다른 image·project·service·network·image label 중 하나라도 발견되면 `baseline-stack-unverified`로 red가 된다. 시작 검증 실패는 workspace·browser·attempt artifact 생성 전에 끝나고, 종료 재검증 실패는 이미 만든 staging 증거를 publish하지 않으며 final seal을 쓰지 않는다. raw attestation과 container/image의 raw inspect output, attestation path, full container ID/name은 성공·실패 artifact, stdout/stderr, 로그에 기록하지 않는다.

```powershell
# NEXT_PUBLIC_WEB_URL과 NEXT_PUBLIC_API_URL은 현재 격리 stack으로 미리 주입한다.
pnpm -C frontend exec playwright test --project=setup

# 위 표의 UI_BASELINE_* 값도 현재 process에 안전하게 주입된 상태에서 실행한다.
pnpm -C frontend run ui-quality:baseline
```

표준 package script는 scenario/runner contract를 exact 파일 경로로 먼저 실행한 뒤 `--execute --include-performance`를 함께 고정한다. runner는 시작 시 manifest raw bytes와 canonical protocol pointer를 다시 캡처하고, 선행 계약·protocol·runner/core·두 contract의 worktree bytes가 실행 commit blob과 exact 일치하는지 확인한다. 따라서 계약 프로세스가 green이 된 뒤 runner hash 시작 전에 파일을 바꾸거나 주석/dead code만으로 실행 binding을 흉내 내도 browser launch 전에 red다. 계약 파일을 삭제하거나 선행 명령에서 빼면 baseline 실행 전에 실패한다. 성능을 빼거나 state 일부만 실행한 결과를 full baseline으로 저장할 수 없다. 개발 중 adapter 진단에만 `UI_BASELINE_DIAGNOSTIC_LIMIT=<N>`을 명시할 수 있으며, 이 모드는 서로 다른 journey step의 대표 case만 실행하고 `diagnostic-summary.json`에 `diagnostic-not-baseline-evidence`로 기록한 뒤 `baseline-result.json`을 만들지 않는다.

모든 execute attempt는 browser launch 전에 `build/reports/ui-quality-baseline-attempts/.staging-<executionId>`를 새로 만들고 `final:false` progress를 먼저 기록한다. 자동 artifact는 canonical root에 직접 덮어쓰지 않는다. `artifactRoot`의 lexical repository containment만 신뢰하지 않으며 repository root부터 대상까지 기존 ancestor를 각 segment별 `lstat`·`realpath`로 확인한다. path escape, symlink/junction, non-directory ancestor는 경로 원문을 포함하지 않는 하나의 generic boundary error로 실행 전에 닫고, 없는 디렉터리는 검증된 부모 아래에 한 단계씩 만든 뒤 다시 검증한다. staging의 각 JSON write와 final marker prepare/verify/write, archive/swap/rollback rename 전후에도 같은 bounded directory identity를 다시 확인하므로 중간 ancestor 교체(TOCTOU)는 seal이나 repository 밖 publish로 이어질 수 없다. full 실행은 staging의 exact 282개 JSON 경로·동일 execution identity·8/48/96/48 모집단을 닫은 뒤 모든 source/protocol/tooling provenance를 마지막으로 재검증하고, 283번째 파일 `automated-run-seal.json`을 마지막에 기록한다. 그 뒤에만 기존 canonical root를 `ui-quality-baseline-history/pre-<executionId>-current`로 rename 보존하고 staging을 canonical root로 rename한다. 두 번째 rename이 실패하면 이전 root를 복원하며 파일을 삭제하지 않는다. 진단은 `ui-quality-baseline-diagnostics/<executionId>` sibling에만 봉인하고 canonical full root·combined authoritative inventory에 섞지 않는다. seal이 없거나 `final:false`, staging 잔존, 다른 execution ID, 281/284 raw 파일, source drift 중 하나라도 있으면 그 attempt는 권위 결과가 아니다.

runner는 raw trace, video, HAR, screenshot, response body와 console 원문을 저장하지 않는다. axe 결과는 rule/impact/WCAG tag/node count와 `redacted-node-N` locator만 남긴다. 브라우저의 4xx 응답은 raw URL·query·body·header·method를 artifact에 남기지 않고 고정 enum별 count만 기록한다. `auth-login`의 관련 login step에서 exact `GET /api/v1/auth/me` 401 bootstrap과 `invalid-credentials` step의 exact `POST /api/auth/login` 401만 서로 다른 expected category다. invalid-credentials synthetic fixture는 먼저 login request validation 계약을 만족해야 하며 request validation에서 발생한 400은 401로 간주하지 않고 `unexpected-http-4xx`로 유지한다. scenario·step·method·canonical pathname·status 중 하나라도 다르거나 그 밖의 4xx이면 `unexpected-http-4xx`로 fail closed한다. 각 case 뒤 redacted checkpoint와 진행 요약을 갱신하므로 장시간 실행을 중단해도 마지막 완료 지점과 fail code를 민감정보 없이 감사할 수 있다.

실행하지 않은 authoritative mutation/save/readback/rollback/deploy는 `passed=false` assertion으로 만들지 않는다. 허용된 task ID와 고정 reason code의 exact pair만 `taskEvidence[{status:"not-executed"}]`로 기록하며, 한 건이라도 있으면 해당 case는 `blocked-prerequisite / automated-observation-incomplete`다. 실제로 실행한 assertion의 실패는 그대로 failed assertion으로 남고, 같은 case의 unexpected runtime signal은 blocked보다 우선해 `invalid-run`으로 닫는다. desktop/mobile duplicate DOM의 empty state는 `:visible` instance만 관측하고, effect 뒤 local draft 복원은 100ms 간격 최대 100회의 bounded poll로만 판정한다.

승인된 격리 synthetic mutation은 namespace label을 정확히 `uiq-baseline-mutation-v1`로 고정한다. 실제 사용자·운영/shared DB·권한 완화·제품 API를 우회하는 직접 DML은 허용하지 않는다. 실행 증거는 허용된 6개 task ID에 대해 product mutation 관측, authoritative API readback, rollback readback, cleanup과 `zero-active-residue`가 모두 닫히고 active residue count가 정확히 0일 때만 `taskEvidence[{status:"executed"}]`가 된다. mutation 요구의 SSOT는 scenario manifest 각 journey step의 optional/nullable `requiredTaskEvidenceId`다. 승인된 6개 scenario-step만 서로 다른 closed ID를 정확히 한 번 선언하고 나머지 step은 이 값을 생략하거나 null로 유지하며, unknown·duplicate·다른 scenario-step으로 이동한 선언은 실행 전에 red가 된다. `buildExecutionPlan`은 이 선언을 각 state case에 그대로 전파하고 runtime은 별도 scenario/step hardcode로 요구를 재창작하지 않는다. scenario 완료 집계는 validated state plan의 exact `scenarioId → stepId → caseId → brandTheme × colorMode × viewport`에 각 실행 증거를 exactly once로 결속하며, 한 case에 증거를 몰거나 다른 step·dimension의 개수로 대체할 수 없다. executed evidence에는 기존 privacy-safe `uiq-<20 hex>` case ID만 추가하며 계획 state case의 ID와 exact 일치해야 한다. case ID가 없거나 다른 dimension의 evidence를 복사·교환한 경우에는 task ID와 cleanup 값이 맞아도 incomplete다. mutation이 선언된 3개 scenario만 이 증거를 functional completion 선행조건으로 요구한다. 선언이 없는 5개 scenario는 mutation 증거를 만들거나 요구하지 않고 각 case의 `taskEvidence`가 비어 있어야 하며, undeclared·duplicate·wrong-namespace·residue evidence를 끼워 넣으면 fail closed한다. 이 5개도 exact state/performance, manual evidence와 durability가 모두 닫혀야만 `measured`가 될 수 있다. runtime의 planned state/performance count는 관측 결과 수가 아니라 `buildExecutionPlan`의 선언 집합에서만 계산하고, case ID 누락·중복·대체·미선언 결과 또는 관측 dimension 불일치는 `partial-automated-evidence`로 닫는다. 이 schema에는 실제 합성 ID·제목·검색어·비밀번호·URL·query·response body를 담을 필드가 없다. runner는 성공·실패와 무관하게 cleanup을 먼저 수행하고 residue를 다시 읽으며, cleanup 또는 residue readback 실패를 `synthetic-mutation-cleanup-failed`로 우선 처리한다. user 상태 변경은 단일 합성 계정 선택과 P↔A readback·rollback, FAQ는 합성 게시글 생성/역할별 UI readback/owner-or-admin 삭제, board deploy는 wizard 생성/board+menu readback/menu 선삭제/board 논리·물리 삭제 순서를 사용한다.

FAQ authoritative readback은 저장 경로의 의미를 함께 검증한다. API로 직접 seed한 plain-text 본문은 `semantic-plain-text`, Tiptap UI로 작성한 본문은 합성 fixture의 HTML-escaped text를 정확히 한 `<p>`로 감싼 `canonical-tiptap-html`만 허용한다. 둘은 성공/실패 boolean으로 뭉개지 않고 closed enum으로 비교하며, 그 밖의 markup은 `not-matched`로 fail closed한다. raw HTML·본문·응답은 artifact field, log, error message에 저장하지 않는다. 사용자 FAQ 화면은 범용 게시판 목록 projection에 본문을 추가하지 않고, 펼침 동작에서 exact FAQ board의 public·active detail만 lazy read한 뒤 안전한 semantic text로 표시한다. 비밀글·다른 게시판·삭제 상태 detail은 UI content로 승격하지 않는다.

구현 중 bounded 검증은 `UI_BASELINE_MUTATION_DIAGNOSTIC=synthetic-mutation-v1`의 고정형 모드만 허용한다. 임의 scenario/step/case filter가 아니라 user 2개, FAQ 3개, board 1개 step의 대표 render case 정확히 6개를 선택하며, `isolated-synthetic` stack·build identifiers·seed label·양 역할 private auth state preflight를 full run과 동일하게 요구한다. performance를 결합하거나 일반 diagnostic limit와 동시에 사용할 수 없고, 별도 diagnostic 하위 경로에 `diagnostic-not-baseline-evidence`만 기록하며 `baseline-result.json`을 생성하지 않는다. 따라서 대표 6개 성공은 full 36개 task evidence나 8/96/48 baseline 완료로 승격할 수 없다.

performance 실패 artifact에는 raw exception, message, URL, response payload를 넣지 않는다. 고정 enum인 `failureStage`와 `invalidReasonCode`만 기록한다. `conditionRuns` 전체 배열은 선언된 cold+warm 반복 수의 합과 정확히 같고 모든 원소의 condition이 closed set `{cold,warm}`에 속해야 한다. cold/warm 각 3회의 계획 반복 수가 정확하지 않거나 missing·duplicate repeat 또는 extra/unknown condition이 있으면 `repeat-validation / performance-repetition-incomplete`, 어느 한 반복이라도 route JS, LCP, CLS, readiness latency proxy가 null 또는 비유한 값이면 `metric-validation / required-performance-metric-not-observed`, 실행 단계 예외는 허용된 stage와 `performance-probe-failed`로 `invalid-run` 처리한다. scenario별 performance completion은 `buildExecutionPlan`이 선언한 `renderCaseId`가 정확히 한 번 존재하고 status가 exact `lab-performance-observed`일 때만 센다. missing·duplicate·substituted·undeclared identity는 `partial-automated-evidence`, `invalid-run` 또는 unknown status는 completed로 세지 않고 fail closed하므로 동일한 계획 ID를 가진 임의 status가 `measured`를 만들 수 없다.

단, 현재 `artifactRoot`인 `build/reports/ui-quality-baseline`은 `.gitignore`의 `**/build/`에 해당한다. 따라서 현재 96/96 자동 case와 48/48 performance target이 모두 실행돼도 이 경로의 파일만으로는 clean checkout에서 지속 가능한 `measured` 증거가 아니다. runner는 이를 `ephemeral-ignored`, `eligibleForMeasuredPromotion=false`로 기록한다. [ADR-0005](../02-architecture/decisions/ADR-0005-ui-quality-durable-evidence.md)는 보존 mode를 `versioned-compact-summary`로 승인했다. tracked index와 digest-derived r12 automated-only summary는 local commit `65f8b5ea34be332aaf4714e9a56774e7fa2721f4`에서 시작해 PR #434 head required CI run `32502622801`을 통과한 뒤 merge commit `f39ba9930df973710318088ccb00a2800643d9a3`에 병합됐다. clean-checkout digest/blob readback과 병합 뒤 Java CI run `32504902346`, dependency graph run `32504902338`도 성공했다. 이 summary는 실행 시점 `protocolHash`가 기록되지 않은 historical evidence라 durable publication이 완료됐어도 `measured`로 승격할 수 없다. `measured` 후보에는 protocol hash를 실행 중 기록한 새 authoritative run과 그 exact provenance에 결속된 수동 48/48가 필요하다.

## 5. Task metric protocol

### 5.1 공통 측정식

| Metric | 시작/종료와 판정 | 기록 규칙 |
|---|---|---|
| `task-success` | prompt를 다 읽은 시점부터 authoritative end state까지 | `unassisted-success`, `assisted-success`, `failed`, `invalid-attempt`를 분리한다. |
| `completion-time-ms` | monotonic clock의 start→authoritative readback | 환경/진행자 pause는 시각·이유를 별도 기록하고 사후 임의 제외하지 않는다. |
| `critical-error-count` | 권한 오부여, 데이터 손실·중복, 개인정보 노출, 잘못된 대상의 파괴 mutation | 1건도 다른 속도 지표로 상쇄하지 않는다. |
| `noncritical-error-count` | 잘못된 목적지, 되돌림, 재입력, 상태 오해 | 같은 원인의 연속 입력은 coding rule에 따라 한 episode와 event 수를 함께 둔다. |
| `assistance-count` | 진행자가 해결법·경로를 제공한 순간 | prompt 단순 재독과 assist를 분리하고 내용·시각을 기록한다. |
| `first-click-correct` | 첫 목적지 action이 사전 허용 경로인지 | hidden menu를 열기 위한 action은 path definition에 포함할지 사전 고정한다. |
| `recovery-success` | 주입 오류 후 입력·focus·상태를 보존해 완료하는지 | `unassisted`, `assisted`, `failed`, `not-triggered`를 사용하며 미주입을 성공으로 세지 않는다. |

사용자 연구 참여자가 없으면 expert walkthrough의 task time·first click은 `expert-baseline`으로 표시한다. 실제 사용자 metric과 같은 열에 합산하거나 “사용자가 개선됐다”고 표현하지 않는다.

### 5.2 Scenario task script

#### 로그인

1. `/login?redirect={safeRelativeRoute}`에서 synthetic invalid credentials를 제출한다.
2. 오류가 alert로 발화되고 문제 field 또는 오류 요약으로 focus가 이동하는지 확인한다.
3. 입력 가능한 값의 보존과 비밀번호 비노출을 확인한다.
4. synthetic admin credentials로 다시 제출한다.
5. 안전한 상대 목적지로 복귀하고 role에 맞는 heading을 확인하면 종료한다.

#### Admin shell/hub

1. `/admin`의 `<main>`과 task heading이 준비된 뒤 측정을 시작한다.
2. “사용자 로그에서 특정 사건을 찾으라”는 목적지만 주고 메뉴 경로를 알려주지 않는다.
3. keyboard와 pointer 각각 sidebar/command/overlay를 사용해 목적지로 이동한다.
4. 좁은 viewport에서 menu가 본문을 가리지 않고 닫힌 뒤 focus가 trigger로 돌아오는지 확인한다.

#### Dense user logs

1. 고정 개수의 synthetic log page를 로드하고 지정 사건을 filter한다.
2. detail에 들어가 actor·시각·결과를 확인하되 raw identifier는 artifact에 복사하지 않는다.
3. 0건 조건을 주고 filter를 해제해 복구한다.
4. 다음 반복에서는 log query 하나에 5xx를 주입하고 error와 0건이 구분되는지 확인한다.
5. scoped retry 뒤 기존 page·filter·focus가 보존되는지 확인한다.
6. 자동 runner는 visible text fallback이나 broad regex가 아니라 사용자에게 노출된 accessible name `데이터 다시 불러오기`를 exact role locator로 사용한다.

#### User management hub

1. 유사한 표시명을 가진 synthetic 사용자 중 지정 대상을 검색·선택한다.
2. 현재 role/status와 변경 영향을 확인한다.
3. mutation error를 한 번 주입해 입력 보존·중복 요청 방지를 확인한다.
4. 재시도 후 server readback과 synthetic 대상 계정의 접근 결과가 일치하면 종료한다.
5. 테스트 종료 시 권한 snapshot으로 rollback하고 재조회한다.

#### Board article composer

1. synthetic board ID로 composer를 연다.
2. 비어 있는 필수 field 제출로 label·instruction·오류 연결과 focus를 확인한다.
3. synthetic 제목·본문을 입력하고 autosave 완료 상태를 확인한다.
4. reload 뒤 복구 prompt와 제목·본문·focus 맥락을 확인한다.
5. 저장 후 server ID와 목록/detail readback을 확인한다.
6. 첨부 action이 보이면 capability truth와 server readback을 확인한다. 근거가 없으면 upload를 성공 단계에 넣지 않고 `unavailable/unverified` finding으로 남긴다.

#### FAQ admin→user lifecycle

1. ADMIN이 FAQ용 synthetic board에서 질문·답변을 작성한다.
2. `/admin/help/faq`에서 같은 server ID/제목의 readback을 확인한다.
3. USER 새 context로 `/help`에 진입해 경로 안내 없이 FAQ를 찾는다.
4. 검색하고 항목을 열어 답변 내용까지 확인하면 종료한다.
5. USER에게 admin action이 노출되거나 admin-only detail이 보이면 critical authorization/privacy finding으로 기록한다.

#### Board maker wizard

1. 첫 단계에서 필수 이름을 비워 다음을 눌러 오류와 focus를 확인한다.
2. synthetic 정의로 basic→template→ACL 안내→menu deploy 단계를 keyboard로 이동한다.
3. 이전 단계로 돌아가 값·현재 step 발화가 보존되는지 확인한다.
4. deploy를 한 번만 실행하고 server/menu readback을 확인한다.
5. reload 또는 injected failure 뒤 중복 board/menu가 생기지 않는지 확인한다.

## 6. Automated accessibility protocol

### 6.1 Deterministic axe 조건

모든 render case는 다음 조건을 만족한 뒤 `@axe-core/playwright`를 실행한다.

1. Chromium, `ko-KR`, `Asia/Seoul`, 고정 viewport와 color mode를 사용한다.
2. runner는 scenario state 상호작용 전에 `animation: none`·`transition: none`·caret 안정화 style을 먼저 주입한다. `duration: 0s`만 적용하면 shake 같은 keyframe의 중간 transform을 고정할 수 있으므로 사용하지 않는다. 상호작용 또는 hard navigation 뒤에는 같은 style을 다시 주입하고, 남은 유한 animation은 final state로 완료하며 무한 animation은 취소한 뒤 두 animation frame을 기다린다. DOM-visible 오류와 React effect의 focus 복원을 같은 commit으로 가정하지 않으며, 오류 focus assertion은 boolean 일치만 최대 12 animation frame 동안 bounded poll한다. active element의 raw text·ID·DOM path는 artifact에 남기지 않고, 이 범위 안에 focus가 복원되지 않으면 assertion finding을 그대로 유지한다. 별도 reduced-motion 수동 검사의 의미는 유지한다.
3. broad timeout 대신 scenario별 heading, synthetic fixture, pending indicator 종료를 기다린다. post-state animation 정리 뒤의 visual readiness는 inline motion style의 내용 비노출 SHA-256 aggregate, active animation 수, visible `aria-busy` 수, 비어 있지 않은 document title 여부만 메모리 안에서 비교하며 최소 12 frame의 delivery window와 최대 24 frame 경계 안에서 3회 연속 안정돼야 한다. hash·sample은 artifact에 저장하지 않으며 text·selector·locator·DOM path를 읽거나 반환하지 않는다. 경계 안에 title/idle/stability가 관측되지 않으면 axe rule·threshold를 완화하거나 0건으로 기록하지 않고 `visual-readiness-failed` invalid로 닫는다. responsive geometry가 3회 연속 안정된 뒤, 화면에 보이고 실제 overflow 중인 `StandardDataTable` scroll region의 `role=region`·비어 있지 않은 accessible name·`tabIndex=0` commit을 최대 12 frame 안에서 2회 연속 확인하고 나서 axe를 실행한다. 이 readiness가 끝내 관측되지 않으면 rule을 끄거나 기다림을 무한정 늘리지 않고 해당 case를 invalid로 닫는다.
4. clock·random content·차트처럼 결정적이지 않은 영역은 테스트 data를 고정한다. 화면 전체를 넓게 exclude하지 않는다.
5. `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa` tag를 사용한다.
6. `color-contrast`는 required rule이며 disabled rule은 0개다. 기존 test의 disable 설정을 baseline으로 재사용하지 않는다.
7. loading, loaded, validation error, filtered-zero, server error, open dialog처럼 실제 task에 필요한 state마다 scan한다.
8. violation artifact에는 rule, impact, WCAG mapping, redacted locator, 사용자 영향과 재현 state를 남긴다.

현재 [01-core-base.spec.ts](../../frontend/e2e/01-core-base.spec.ts)의 axe 정의는 `color-contrast`를 포함한다. 다만 해당 smoke 실행의 통과 여부만으로 상태·theme·viewport 전 조합과 수동 평가를 포함하는 Task 0.5 baseline으로 승격하지 않는다.

### 6.2 자동 범위의 한계

- 렌더되지 않은 virtual row, 닫힌 overlay, hover/focus/selected/disabled, 미주입 오류는 자동으로 전부 검사되지 않는다.
- name/role/value 존재는 이름이 업무상 이해 가능하거나 발화 순서가 유용함을 증명하지 않는다.
- keyboard trap, focus 복귀, drag 대체, 화면낭독기 browse/focus mode의 실제 과업은 수동 검사가 필요하다.
- 이미지·gradient·반투명 합성, forced colors, 배경 동영상 위 텍스트는 `color-contrast` 하나로 완전 판정할 수 없다.
- axe 위반 0건은 정해진 DOM state의 자동 검출 항목 0건일 뿐 WCAG 준수 선언이 아니다.

## 7. Manual accessibility procedures

모든 수동 결과는 scenario, step, build SHA, OS/browser/AT version, theme/mode/viewport, 실행자, 날짜, pass/fail/not-run, 재현 증거와 사용자 영향을 기록한다. 실제 AT 사용자가 참여하지 않았다면 `expert-manual`, 참여했다면 동의된 `user-AT`로 구분한다.

### 7.1 Keyboard-only

**WCAG 2.2:** 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11.

1. pointer를 사용하지 않고 새 navigation에서 시작한다.
2. 첫 `Tab`으로 skip link와 focus indicator가 나타나는지, skip 후 main heading으로 이동하는지 확인한다.
3. DOM/시각 순서와 Tab 순서가 업무 흐름에 맞고 숨겨진 control·양의 `tabindex`가 끼지 않는지 기록한다.
4. link는 Enter, button은 Enter/Space, tabs/menu/combobox는 해당 native/ARIA pattern key로 조작한다.
5. dialog·sheet·popover 진입 시 focus 초기 위치, trap, Escape, 닫힘 후 trigger 복귀를 확인한다.
6. validation 실패 시 오류 요약 또는 첫 오류 field로 이동하고 label/error relation을 확인한다.
7. destructive action은 대상·영향 확인 뒤 한 번만 실행되며 취소 가능해야 한다.
8. 모든 방향으로 빠져나올 수 있고 sticky header/footer에 focus가 가려지지 않는지 확인한다.

**사용자 영향:** keyboard·switch·speech input 사용자가 action에 도달하지 못하거나 현재 위치를 잃으면 핵심 task 자체가 차단된다. trap, 보이지 않는 focus, 잘못된 destructive action은 P0/P1 후보로 분류한다.

### 7.2 NVDA+Chrome

**조합:** Windows의 실제 NVDA + Chrome. NVDA/Chrome/Windows version과 speech setting을 기록하고, 브라우저 accessibility tree simulator를 실제 NVDA 결과로 가장하지 않는다.

**WCAG 2.2:** 1.3.1, 2.4.2, 2.4.6, 3.3.1, 3.3.2, 4.1.2, 4.1.3.

1. 새 page title, language, landmark와 H1을 NVDA shortcut으로 탐색한다.
2. heading list와 landmark list만으로 task 영역을 찾을 수 있는지 확인한다.
3. button/link/form control의 visible label과 accessible name이 일치하며 중복·빈 이름이 없는지 듣는다.
4. table은 caption/heading, 열·행 관계, sort/pagination 상태가 전달되는지 확인한다. mobile card 대체에서도 정보·action parity를 비교한다.
5. form instruction, required, current value, validation error를 browse/focus mode에서 확인한다. placeholder만 label로 쓰지 않는다.
6. loading, save pending/success/failure, filtered-zero, retry, autosave restore가 과도한 반복 없이 적절한 live region으로 전달되는지 확인한다.
7. dialog 이름·설명·현재 단계, wizard step 변화, 닫힘 후 focus 복귀를 확인한다.
8. client route 전환 후 title/heading/focus가 새 맥락을 알리는지 확인한다.

**사용자 영향:** 상태가 발화되지 않으면 저장 실패를 성공으로 오인하거나 중복 제출할 수 있다. table 관계·오류 연결이 없으면 dense list와 mutation task를 완료하기 어렵다.

### 7.3 200% text

**WCAG 2.2:** 1.4.4.

1. desktop-1280 case를 100%에서 준비하고 Chrome zoom을 200%로 바꾼다.
2. 실제 `window.innerWidth`, zoom setting, screenshot을 기록한다. CSS transform이나 test 전용 font 축소로 통과시키지 않는다.
3. text, label, error, button 이름이 잘리거나 겹치지 않고 필요한 정보·action이 사라지지 않는지 확인한다.
4. fixed-height container, line-clamp, tooltip-only 정보, icon-only fallback을 확인한다.
5. zoom을 유지한 채 전체 task를 완료하고 overlay가 viewport 밖으로 나가지 않는지 확인한다.

**사용자 영향:** 저시력 사용자가 글자를 키웠을 때 action과 오류를 잃으면 입력·검토·복구가 불가능해진다.

### 7.4 400% zoom/320 CSS px reflow

**WCAG 2.2:** 1.4.10.

1. Chrome content 영역을 1280 CSS px 상당으로 준비한 뒤 browser zoom을 400%로 설정한다.
2. `window.innerWidth`가 약 320 CSS px인지 기록한다. 환경상 실제 zoom이 불가능해 320px device emulation만 사용했다면 결과를 `simulation`으로 표시하고 실제 zoom을 별도 보류한다.
3. page 전체에 예상하지 않은 양방향 scroll이 없는지 `scrollWidth`와 시각 확인을 함께 수행한다.
4. 표·지도처럼 본질적으로 2차원인 영역의 국소 scroll은 허용할 수 있지만 page action, row identity와 현재 scroll 맥락을 잃지 않아야 한다.
5. sticky action, drawer, dialog, keyboard focus, long Korean/URL, validation error가 reflow 후에도 보존되는지 확인한다.
6. 축소해 내용을 보라는 지시 없이 전체 primary task를 완료한다.

**사용자 영향:** 400%에서 page 전체를 좌우로 왕복하거나 action이 화면 밖에 고정되면 저시력 사용자의 탐색·비교 비용이 급격히 증가한다.

### 7.5 Forced colors

**WCAG 2.2:** 1.4.1, 1.4.3, 1.4.11, 2.4.7.

1. Windows High Contrast/forced colors를 실제 OS 설정으로 켠 뒤 새 browser context를 연다.
2. `matchMedia('(forced-colors: active)')`를 기록한다. DevTools emulation만 사용하면 `simulation`으로 표시한다.
3. text, link, button boundary, input, focus, selected/current, error/success, disabled 상태를 확인한다.
4. 색만으로 전달하던 chart·badge·validation 의미에 text/icon/pattern 대체가 있는지 확인한다.
5. transparent border가 focus 또는 control boundary를 없애지 않는지, system color override가 가독성을 보존하는지 확인한다.
6. light/dark 각각에서 primary task를 수행하되 forced color 결과를 일반 contrast ratio로만 판정하지 않는다.

**사용자 영향:** 상태·focus·control 경계가 사라지면 저시력·색각 사용자가 현재 위치와 mutation 결과를 구분하지 못한다.

### 7.6 Reduced motion

**WCAG 2.2:** 2.2.2, 2.3.1. WCAG AA 외에도 프로젝트의 `prefers-reduced-motion` 계약을 함께 본다.

1. OS의 motion 감소를 켜고 새 browser context에서 `matchMedia('(prefers-reduced-motion: reduce)')`를 확인한다.
2. carousel, skeleton pulse, page transition, dialog/sheet, drag animation, progress effect를 관찰한다.
3. 비필수 이동·반복·parallax가 제거 또는 즉시 전환되고 상태 변화 자체는 text/live feedback으로 남는지 확인한다.
4. 자동 재생이 있으면 pause/stop/hide가 가능한지, 시간 제한이 motion과 결합하지 않는지 확인한다.
5. wizard·composer·shell task를 완료해 motion 제거가 focus·완료 feedback을 함께 없애지 않았는지 확인한다.

**사용자 영향:** 전정 장애·주의/인지 부담이 있는 사용자는 불필요한 이동으로 task를 중단할 수 있고, 반대로 feedback까지 제거하면 저장·단계 변화를 알 수 없다.

## 8. Performance and responsive measurement

### 8.1 Cold/warm 반복

각 scenario의 `performanceTargetStepId`와 render case에서 다음을 분리한다.

| Condition | Context | Cache | Repeat |
|---|---|---|---:|
| cold | 매 반복 새 browser context | HTTP cache disabled, storage/application cache 정리 후 synthetic auth 복원 | 3 |
| warm | 같은 build/context에서 기록하지 않는 prime navigation 1회 후 측정 | HTTP cache enabled | 3 |

두 조건은 같은 role, state, data, theme, mode, viewport, server build를 사용한다. 한 번의 가장 좋은 값만 고르지 않고 median, min, max, median absolute deviation을 기록한다. mobile/desktop과 cold/warm을 합산하지 않는다.

`lab-performance-observed`는 단순히 반복 loop가 끝났다는 뜻이 아니다. cold 3회와 warm 3회의 repetition identity가 각각 exact하고, protocol-required route JS·LCP·CLS·readiness latency proxy가 **모든 계획 반복에서** 유한한 실측값일 때만 사용한다. null·`NaN`·무한대를 0으로 대체하지 않으며 하나라도 빠지면 해당 render case는 bounded `invalid-run`이다.

### 8.2 Route JS

- navigation과 lazy interaction에서 발생한 same-origin `script` PerformanceResourceTiming을 분리한다.
- resource path, `transferSize`, `encodedBodySize`, `decodedBodySize`, cache condition을 기록한다.
- warm cache에서 `transferSize=0`을 “JS 0 bytes”라고 표현하지 않는다.
- prefetch가 측정 전에 실행됐다면 cold run을 오염시킨 것으로 보고 invalid 처리하거나 prefetch 단계를 명시한다.

### 8.3 Actual LCP element/resource

- buffered `largest-contentful-paint` entry를 observer로 수집하고 observer handle을 page lifetime 동안 유지한다.
- readiness와 animation 안정화 뒤에도 callback delivery가 늦을 수 있으므로 매 poll 전에 observer의 `takeRecords()`를 drain하고, 최대 60 animation frame 동안 entry 유무를 bounded 재확인한다. 이 대기는 callback delivery race만 흡수하며 LCP 값을 합성하지 않는다.
- `startTime`, 닫힌 allowlist로 정규화한 element tag/role, element size, resource의 same-origin 여부와 bounded category/redacted route template만 기록한다.
- text/content 원문, DOM selector/locator, raw URL/path, hostname, signed query, record identifier, filename, private segment는 기록하지 않는다. cross-origin·non-http·invalid resource는 원본 위치 없이 닫힌 분류만 남긴다.
- bounded drain 뒤에도 LCP entry가 없으면 0ms나 다른 반복의 값이 아니라 `not-observed`/`null`이며 해당 performance case를 `required-performance-metric-not-observed` invalid로 유지한다.
- route마다 실제 LCP가 image인지 text인지 확인한 뒤 preload/image 변경을 제안한다.

### 8.4 CLS

- `hadRecentInput=false`인 layout shift를 task 안정 시점까지 누적한다.
- 가장 큰 shift의 redacted locator와 발생 시각을 남기되 개인 콘텐츠는 저장하지 않는다.
- 사용자 action 직후 제외되는 shift도 interaction 결과를 가리거나 오동작을 만들면 UX finding으로 별도 기록한다.

### 8.5 Interaction latency proxy

- scenario에 고정된 action—menu open, filter apply, row detail open, form validation, wizard next—을 사용한다.
- Playwright action 직전 monotonic start를 잡고 observable state + authoritative readback + 안정된 두 animation frame 뒤 종료한다.
- browser가 제공하는 `PerformanceEventTiming`이 있으면 함께 기록하되 짧은 lab session의 proxy를 field p75 INP로 표현하지 않는다.
- network와 render 시간을 분리할 수 있도록 대상 request 시작/종료와 pending UI 시각을 함께 저장한다.

### 8.6 Responsive 결과

animation을 `none`인 final state로 안정화한 뒤에도 첫 geometry 값을 즉시 판정하지 않는다. 한 animation frame 간격으로 최대 12회 관측하며 `scrollWidth`, `clientWidth`, viewport width, color-mode 적용 여부가 3회 연속 동일할 때만 geometry를 stable로 채택한다. horizontal overflow finding은 이 마지막 stable sample만으로 판정하고, 중간의 최대 overflow는 `maxHorizontalOverflowPxObserved` 진단값으로만 남긴다. 12회 안에 안정되지 않으면 threshold를 올리거나 마지막 값을 채택하지 않고 `responsive-geometry-not-stable` invalid로 닫는다. 기존 finding 경계인 1px 초과는 변경하지 않는다. 이 geometry settle은 axe보다 먼저 수행하며, 이어서 실제 overflow 중인 visible `StandardDataTable` region의 접근성 속성 commit도 최대 12 frame·2회 연속으로 확인한다. 따라서 ResizeObserver/React commit 경합을 axe finding으로 오인하지 않되, commit이 오지 않는 제품 결함은 invalid로 은폐하지 않는다.

viewport별로 다음을 기록한다.

- page `scrollWidth/clientWidth`, stable status, sample count, 연속 stable count, 중간 최대 overflow와 국소 2D scroll 예외.
- overflow offender 메타데이터는 최대 5개의 element tag, 제한된 semantic role, `inline-start`/`inline-end`/`both`, 정수 overflow px만 허용한다. selector, id, class, text/content, DOM HTML은 기록하지 않는다.
- sidebar, drawer, sticky action, overlay의 화면 내 위치.
- dense table과 mobile card의 정보·action·선택 parity.
- 긴 한국어, URL, 200% text, 400%/320 reflow에서 누락된 field/action.
- touch target과 hover-only 정보의 keyboard/touch 대안.

## 9. Privacy, redaction and artifact handling

### 9.1 금지 데이터

baseline은 synthetic data만 사용한다. 다음 값과 이에 준하는 원문은 manifest, screenshot 이름, JSON, trace, console, PR, issue에 기록하지 않는다.

- Authorization, cookie, access/refresh token, password.
- 실제 user ID, 이름, 이메일, 전화번호, 주소, IP, 주민등록번호·민감 식별자.
- 자유 검색어, 게시글/댓글/설문/FAQ 원문, form raw input, API response body.
- 실제 조직·기관명, 운영 log payload, signed resource query.

계약 테스트는 대표 forbidden key가 scenario/runtime data에 들어오면 red다. 단순히 key 이름을 바꿔 값을 보존하는 것은 redaction이 아니다.

### 9.2 수집 전 최소화

1. 계정과 데이터는 `UI_BASELINE_*`처럼 synthetic fixture namespace로 만든다.
2. 자동 runner의 network recorder는 raw method/path/URL/query/status별 event를 저장하지 않고 위의 bounded category count만 남긴다. 수동 성능 진단에서 allowlisted path template·status·duration이 꼭 필요하면 별도 redaction review를 거치며 header/body/query는 수집하지 않는다.
3. axe node HTML은 필요한 locator와 semantic만 추출하고 입력 value/text를 제거한다.
4. screenshot은 동적 개인정보 영역을 먼저 synthetic으로 만들고, 남은 식별 영역을 crop/mask한다.
5. Playwright raw trace/video/HAR는 repository 저장을 금지한다. 디버깅에 필요하면 접근 제한된 임시 위치에 두고 redacted summary 생성 후 삭제한다.

### 9.3 Artifact 구조

```text
build/reports/
├── ui-quality-baseline-attempts/.staging-<executionId>/  # 미완료 attempt; 권위 없음
├── ui-quality-baseline-history/pre-<executionId>-current/ # 성공 전 기존 canonical 보존
├── ui-quality-baseline-diagnostics/<executionId>/         # 별도 non-authoritative 진단
└── ui-quality-baseline/                                    # seal된 최신 full run만
    ├── automated-run-seal.json                             # 283번째·마지막 파일
    ├── run-progress.json
    ├── run-summary.json
    └── <scenario-id>/
```

각 `<scenario-id>` 하위는 다음 구조를 가진다.

```text
build/reports/ui-quality-baseline/<scenario-id>/
├── baseline-result.json          # redacted summary; manifest의 evidence path
├── environment.json             # version/config, secret 없음
├── manifest-snapshot.json        # 실행 입력 hash와 case
├── task-observations.json        # expert 또는 동의된 연구 결과 구분
├── axe/                          # state별 redacted rule result
├── performance/                  # cold/warm raw metric, content 없음
├── manual/                       # keyboard/NVDA/zoom/forced-colors/motion
└── screenshots-redacted/         # 필요한 경우만
```

[durable evidence policy](../../config/ui-quality-evidence-policy.json)는 raw artifact tree를 Git에 복제하지 않고 `config/ui-quality-baseline/summaries/sha256-{artifactDigest}.json`의 closed compact summary와 [tracked index](../../config/ui-quality-baseline-index.json)를 사용한다. 기존 summary는 덮어쓰지 않고 exact predecessor를 `supersedes`로 연결한다. canonical summary bytes의 SHA-256과 committed Git blob identity를 독립 검증하고, raw path·URL·endpoint·locator·DOM/text·request/response·인증 값·실제 사용자·screenshot/trace/HAR/video는 summary/index에서 금지한다. UA-04의 r12 summary는 `repository-governance` 역할의 redaction review를 거쳐 digest `e7822b6a31dcf9ff5e129238e42cce7be29d5f126554e8ea400cf249c69af8e4`로 index에 결속됐다. local commit `65f8b5ea34be332aaf4714e9a56774e7fa2721f4`, detached clean-checkout digest/blob readback, PR head required CI run `32502622801`, merge commit `f39ba9930df973710318088ccb00a2800643d9a3`의 post-merge Java CI run `32504902346`, dependency graph run `32504902338`이 모두 통과해 UA-04 durable publication은 완료됐다. 다만 r12는 automated-only/manual 0/execution-captured protocol hash 부재 때문에 `measured`로 승격할 수 없다.

`baseline-result.json`은 다음 최소 필드를 가진다.

```json
{
  "scenarioId": "auth-login",
  "protocolVersion": 1,
  "buildSha": "<sha>",
  "manifestHash": "<sha256>",
  "status": "measured",
  "automatedOutcome": "no-automated-finding-observed",
  "cases": [],
  "taskMetrics": [],
  "performanceMetrics": [],
  "axe": [],
  "manual": [],
  "findings": [],
  "redaction": {
    "reviewedBy": "<named reviewer>",
    "reviewedAt": "<ISO timestamp>"
  }
}
```

`status`는 증거의 완결성과 내구성을 나타내며 품질 합격 여부가 아니다. `measured`에는 state 96개뿐 아니라 performance target 48개의 exact completion과 invalid 0건도 필요하다. performance 일부 누락은 `partial-automated-evidence`, state 또는 performance `invalid-run` 1건 이상은 scenario `invalid-run`이며 수동·기능·내구성 조건이 충족돼도 승격할 수 없다.

자동 case는 `automated-state-observed` 상태와 별도로 `automatedOutcome`을 기록한다. scenario 집계 우선순위는 `automated-observation-invalid` → `automated-observation-incomplete` → `automated-findings-observed` → `no-automated-finding-observed`다. 따라서 invalid case가 blocked case와 함께 있어도 incomplete로 축약하지 않는다. axe·상태 단언·최종 route·horizontal overflow·color mode 중 하나라도 finding이면 `automated-findings-observed`, 선행조건 차단 또는 실행 무효면 각각 `automated-observation-incomplete | automated-observation-invalid`다. 어떤 값도 `pass`의 별칭으로 사용하지 않는다.

`assertions`에는 실제 실행한 check만 둔다. 실행하지 않은 작업을 false assertion으로 섞어 실패 수를 부풀리거나, 반대로 목록에서 제거해 완료처럼 보이게 하지 않는다. `taskEvidence.status=not-executed`는 별도 incomplete 축이며 허용된 reason code 없이는 생성할 수 없다. 따라서 failed assertion 0건은 task 완료를 뜻하지 않고, not-executed task evidence가 있는 case와 scenario는 clean observation 또는 `measured`로 승격할 수 없다.

manifest의 `artifactPath`는 ignored raw 결과의 **예정·로컬 진단 위치**이며 durable 판정 입력이 아니다. `status=measured`는 clean checkout에서 tracked current combined summary의 exact 8 scenario·96 state·48 performance·48 manual projection과 digest/blob/provenance 결속을 검증한 경우에만 허용한다. ignored raw 파일이 우연히 남아 있는지 여부로 승격하거나, raw 파일 부재만으로 이미 검증된 durable projection을 무효화하지 않는다. contract test는 combined summary의 누락·중복·시나리오 치환·모집단 불일치를 fail closed로 확인한다.

## 10. Finding, WCAG mapping and user impact

각 finding은 다음을 포함한다.

| Field | 내용 |
|---|---|
| ID | `UIQ-<scenario>-<number>` |
| Evidence | build/case/state, 자동 또는 수동, redacted 재현 artifact |
| WCAG | 적용 success criterion과 level. 미확정이면 `needs-mapping`+owner/reviewBy |
| User impact | 어떤 사용자가 어떤 task를 왜 완료/이해/복구하지 못하는지 |
| Severity | P0/P1/P2/P3와 근거 |
| Remediation | 구현 제안이 아니라 확인 가능한 결과 계약 |
| Owner/reviewBy | 개인/팀과 최대 90일 이내 날짜 |
| Retest | 같은 case의 전/후 artifact와 결과 |

Severity 기본안:

- **P0:** 권한·개인정보·데이터 무결성 또는 파괴적 action의 잘못된 실행.
- **P1:** 핵심 task를 keyboard/AT/주요 viewport에서 완료할 수 없거나 회복 불가.
- **P2:** task는 가능하지만 반복 오류·큰 우회·중대한 이해 비용이 있음.
- **P3:** 국소 불편 또는 일관성 문제로 완료와 안전에 직접 영향이 낮음.

자동 tool의 `impact` 문자열을 제품 severity로 그대로 복사하지 않는다. WCAG criterion, 발생 state, task 영향과 재현 가능성을 함께 판정한다.

## 11. 실행 순서와 재검증

1. `node --test scripts/ui-quality-scenarios-contract.test.mjs scripts/ui-quality-baseline-runner-contract.test.mjs`와 `pnpm -C frontend run ui-quality:plan`으로 schema, exact 8개 scenario·48개 render case·96개 state case·48개 performance target, route source, contrast, privacy, review bound와 runner binding을 확인한다. `ui-quality:baseline`도 같은 두 계약을 선행하므로 이 수동 단계 누락이 실행 경계를 약화하지 않는다.
2. 같은 격리 stack에서 synthetic auth setup을 수행하고 §4.1의 fail-closed preflight 값과 build/manifest/source-tree hash를 고정한다.
3. `pnpm -C frontend run ui-quality:baseline`으로 state fixture·자동 assertion·deterministic axe를 96개 case에서 실행하고, 각 실패를 `invalid-run`, `blocked-prerequisite`, 자동 finding으로 구분한다.
4. 48개 performance target에서 cold/warm을 각각 3회 실행한다. warm prime 1회는 cache 준비용이며 통계에 섞지 않는다.
5. task functional run의 authoritative save/readback/rollback이 모두 실행됐는지 확인한다. runner가 `route-loaded-only` 또는 `blocked-*`로 남긴 state를 heading/axe 도달만으로 완료 처리하지 않는다.
6. keyboard, NVDA+Chrome, 200% text, 400% zoom/320 CSS px, forced colors, reduced motion 수동 검사를 수행한다.
7. artifact를 redaction reviewer가 확인하고 compact redacted `baseline-result.json`과 상세 artifact의 보존 위치·checksum을 확정한다.
8. evidence가 사람 redaction review를 거친 tracked compact summary와 index로 clean checkout에서 지속되고, current indexed combined summary가 execution-captured protocol hash를 가진 새 authoritative run의 자동 증거와 수동 48/48를 같은 provenance로 포함하는지 확인한 뒤에만 manifest status를 `measured`로 바꾸고 canonical digest·committed Git blob identity·supersedes 관계를 재검증한다. r12의 누락 hash를 현재 값으로 소급 채우지 않는다.
9. 수정 후 동일 build 조건이 아니라 **동일 case 조건**으로 다시 측정하고 before/after를 함께 보존한다.
10. finding이 닫혀도 다른 role/state/theme/viewport의 회귀가 없는지 영향 matrix를 재실행한다.

기존 smoke E2E는 baseline의 일부 기능 preflight에 재사용할 수 있지만 task metric, cold/warm performance, 모든 render state와 manual AT evidence를 자동으로 제공하지 않는다.

## 12. Contract red proof

[ui-quality-scenarios-contract.test.mjs](../../scripts/ui-quality-scenarios-contract.test.mjs)는 현재 manifest green뿐 아니라 임시 fixture에서 다음 위반이 실제 red가 되는지 확인한다.

- JSON schema의 필수/허용 field drift.
- 8개 archetype 누락·추가, first-use onboarding state drift, duplicate scenario/step ID, stale parallel board route.
- non-deterministic axe, `color-contrast` disable, task/performance metric 누락.
- `unknown`, stale review date, 90일을 넘긴 unbounded review.
- evidence path 누락, artifact 없이 `measured` 승격.
- privacy-forbidden key 유입.
- scenario별 journey 또는 theme/mode/viewport 축소·추가, 48개 performance target 누락.
- package baseline 명령에서 scenario/runner contract 파일 삭제·누락.

테스트 파일 존재 또는 green만으로 baseline 수치·접근성 품질을 증명하지 않는다. 이 gate는 **측정 계약의 구조**를 지킬 뿐 실제 browser/manual 실행은 별도 증거다.

## 13. 현재 상태와 bounded blockers

| ID | 상태 | 현재 사실 | 재개 조건 | Owner | reviewBy |
|---|---|---|---|---|---|
| `baseline-runtime-evidence` | `unmeasured` | current authoritative r12는 exact 8 scenario·96/96 state·48/48 performance를 실행해 state/performance invalid 0, assertion 156/156, axe·horizontal overflow·failed assertion 0을 기록했다. synthetic mutation evidence 36건도 case-bound 실행·authoritative readback·rollback·cleanup·active residue 0으로 닫혔고 automated-only summary의 내구성도 닫혔지만, execution-captured protocol hash와 manual 48건이 없어 8개 scenario 모두 `partial-automated-evidence`다. | protocol hash를 실행 중 기록한 새 run과 §6·§7 수동 48건을 같은 current indexed combined summary에 결합 | quality engineering | 2026-10-31 |
| `baseline-artifact-durability` | `unmeasured` | ADR-0005의 r12 automated-only historical summary는 사람 redaction review 8/8을 거쳐 digest-derived summary와 index 첫 entry로 발행됐다. canonical SHA-256은 `e7822b6a31dcf9ff5e129238e42cce7be29d5f126554e8ea400cf249c69af8e4`, Git blob identity는 `git-blob-sha1:109466308336cf4d235ab48c61631ffdadfc2b67`, `supersedes=null`이다. local commit과 detached clean-checkout readback, PR #434 head required CI run `32502622801`, merge commit `f39ba9930df973710318088ccb00a2800643d9a3`의 post-merge Java CI run `32504902346` 및 dependency graph run `32504902338`이 모두 성공해 UA-04는 완료됐다. 원본 290개는 계속 ignored/untracked이고 r12에는 execution-captured protocol hash와 manual evidence가 없다. | 별도의 `measured` 후보를 protocol hash를 기록한 새 authoritative run과 같은 provenance의 수동 48건으로 생성하고 r12 digest를 `supersedes`로 연결한다. | quality engineering + repository governance | 2026-10-31 |
| `manual-at-evidence` | `blocked-external` | r12의 48개 manual evidence 중 40개는 `not-run-manual-review-required`, NVDA/Chrome 8개는 `blocked-external`이다. 지정 평가자와 승인된 실제 Windows 접근성 기록 환경이 없다. | accessibility owner·평가자 지정, synthetic 계정, recording/redaction 승인 | accessibility owner | 2026-10-31 |
| `brand-profile-identity` | `unverified` | `current-default`는 baseline label일 뿐 승인된 기관 brand profile이 아니다. | 제품/디자인 소유자가 profile ID와 적용 자격 승인 | design-system + product/UX | 2026-10-31 |
| `route-capability-truth` | `unverified` | 8개 scenario가 참조하는 후보 route의 역할·상태·지원 action이 capability manifest에서 미검증이다. | domain owner가 actor/action/data source를 검토하고 manifest 갱신 | product/UX + domain owners | 2026-10-31 |
| `user-validation` | `blocked-external` | 사용자 연구·task 빈도·assistive technology 사용 분포 결과가 없다. | 승인된 연구 모집과 [제품 brief](../01-product/ui-ux-modernization-brief.md)의 protocol 수행 | product/UX | 2026-10-31 |

### 13.1 2026-08-21 runtime provenance와 current r12 자동 증거

이 기록은 `measured` baseline 선언이 아니다. 같은 날 수행된 진단·실패 attempt와 r4·r6·r8·r9·r10·r11·r12 실행은 provenance와 증거 완결성이 다르므로 분리해 해석한다. r12만 현재 권위 자동 증거이며, 앞선 결과는 수기 재분류하지 않은 역사다.

- 이전 실행은 2026-07-28 생성 API image와 repository보다 앞선 Flyway V2.86 DB를 함께 사용했다. 해당 DB에는 현재 소스에 없는 qbank 활성 메뉴가 포함돼 있었다. 따라서 그 실행에서 관측된 `/admin/qbank/questions` 404와 teardown 500은 현재 소스의 제품 결함이나 baseline 결과를 뒷받침하는 증거로 사용할 수 없다.
- 당시 source snapshot으로 API image `sha256:7c4c82c80eb6…`를 새로 만들고 fresh PostgreSQL DB에서 실행했다. DB의 최대 versioned migration은 V2.84였고 메뉴는 전체 84건, 활성 81건, qbank 경로 0건이었다. 이는 fresh seed 구조 smoke이지 live 운영 메뉴·authority·effective exposure 증거가 아니다.
- 해당 smoke에 사용한 frontend production Docker build는 compile·TypeScript·page generation을 통과했고, 전송 context는 1.49 MB였다. Playwright 인증·trace·report·환경 파일은 context에서 제외됐다. 이후 header·auth·security 소스가 변경됐으므로 이 이미지를 최신 소스 build라고 부르지 않는다.
- 첫 current-source 실행의 WebSocket 403은 격리 프런트 포트가 API의 명시적 Origin allowlist에 없었던 테스트 topology 불일치였다. 제품 코드·인가·테스트 예외를 바꾸지 않고 격리 컨테이너의 허용 Origin을 현재 포트와 정합화한 뒤 같은 검사를 다시 실행했다.
- 관리자·일반 사용자 synthetic 인증 setup 2건이 통과했다.
- `01-core-base.spec.ts`와 `04-quality-resilience.spec.ts`의 targeted 실행 결과는 15건 통과, Windows 전용 VRT 1건 의도적 skip이었다. login과 admin axe assertion에는 `color-contrast`가 포함됐으며 해당 렌더 상태에서 통과했다.
- global cleanup도 통과했다. 이 결과는 지정된 smoke 경로의 기능과 자동 접근성 검사 도달 가능성만 증명하며, 전체 route·state·theme·viewport나 WCAG 2.2 준수를 증명하지 않는다.
- 이후 exact runner의 구조 검증은 7 scenario, 42 render case, 90 state case와 non-loopback 실행 차단·금지 key/JWT/Bearer redaction·ignored evidence 승격 차단의 부정 검증까지 통과했다.
- 최신 source image가 준비되기 전 runner adapter 자체를 검증하기 위해 위의 과거 frontend/API image와 fresh V2.84 synthetic DB에서 서로 다른 journey step 대표 15개를 `UI_BASELINE_DIAGNOSTIC_LIMIT=15`로 실행했다. 12개는 자동 state 관측까지 도달했고, 성공 로그인 자격정보와 승인된 mutation target이 필요한 2개는 `blocked-prerequisite`, 과거 image의 `/admin` heading readiness 1개는 `invalid-run`이었다. 이 실행은 90개 matrix도, 성능 반복도 아니며 diagnostic mode가 `baseline-result.json`을 만들지 않으므로 baseline 결과가 아니다.
- 그 진단은 mobile/light 대표 case 중 6개에서 axe 후보를 기록했고 로그인 case에는 `color-contrast` 후보 1건과 page horizontal overflow 4px를 기록했다. 이는 오래된 image의 자동 후보이며 human severity·WCAG 적합성 판정이나 최신 source 결함으로 승격하지 않는다. 최신 build의 같은 case로 재실행해 재현 여부를 판정해야 한다.
- current source로 새로 만든 API image `sha256:946687a5fc2aec2b78477daf60424a4d004254ee5ce33d78be4e340bfa19a976`와 frontend image `sha256:592fe6ae878bc3fd9890364bda253e225fda709f47694136109a9d5f70abdec6`를 전용 `egov-uiux-baseline-20260821-r1` stack에서 실행했다. frontend/API는 각각 loopback `3013`/`18091`만 노출했고 기존 current/e2e 자원은 변경하지 않았다. fresh DB는 Flyway 88행(versioned 85, repeatable 3, 실패 0, 최신 V2.84), 메뉴 전체 84·활성 비삭제 81·활성 route 67건이었다. 이는 synthetic seed 구조이지 운영 데이터·role-aware 노출 증거가 아니다.
- 첫 exact full attempt의 격리 frontend Origin 누락, 다음 attempt의 Windows `pnpm` version probe, 집계 invalid 우선순위 결함은 각각 current product finding과 분리한 failed-run provenance로 보존했다. runner는 Windows 고정 argv, aggregate `invalid → incomplete → findings → no-findings`, performance completeness/실패 enum, production build-input 시작·종료 hash 동등성 계약을 TDD로 보강한 뒤 r4를 새로 시작했다. 과거 checkpoint를 r4 결과로 수기 승격하지 않았다.
- r4는 Git `c9d07f260a3c41161362ceef444188fddeaa11bf`, dirty tree, build-input hash `0f7e812259c1bd738732bdbe133692026fe5325f79adaeb800eea2f78e4ac495`를 기록했고 시작·종료 hash 동등성을 확인했다. 실행 결과는 state 90/90 중 자동 관측 78, blocked prerequisite 6, invalid 6이고 performance 42/42 중 유효 관측 39, invalid 3이다.
- state invalid 6건은 `auth-login`의 성공 인증 state 전 render 조합에서 bounded `unexpected-runtime-signal`로 기록됐다. targeted smoke의 로그인 성공과 모순된다고 임의로 지우지 않으며 console/HTTP 진단 신호를 의도된 인증 흐름과 구분해 같은 case로 재실행해야 한다.
- performance invalid 3건은 `admin-shell-hub/light/tablet` cold 2회차, `dense-user-logs/dark/mobile` cold 3회차, `faq-admin-user-lifecycle/light/tablet` cold 3회차의 LCP가 `not-observed`여서 `metric-validation / required-performance-metric-not-observed`로 닫혔다. 값을 0으로 대체하거나 남은 반복만으로 요약하지 않았다.
- r4 후속 triage를 반영해 runner에는 §8.3의 observer drain/bounded delivery와 §8.6의 연속 stable geometry 계약을 회귀 테스트와 함께 추가했다. 아직 이 변경으로 r5 full run을 수행하지 않았으므로 r4의 invalid·finding 이력은 재분류하거나 지우지 않는다.
- 같은 r4 state triage 후 runner는 로그인 4xx를 privacy-safe exact category로 축소하고, 미실행 authoritative task를 bounded `not-executed` evidence로 분리하며, duplicate desktop/mobile empty DOM과 draft hydration race를 deterministic하게 관측하도록 TDD 보강했다. 이 보강 역시 r5를 실행한 결과가 아니므로 r4의 6 invalid·6 blocked·65 failed assertion을 수기로 재분류하지 않는다.
- scenario 결과는 `auth-login`, `admin-shell-hub`, `dense-user-logs`, `faq-admin-user-lifecycle` 4개가 `invalid-run`; `user-management-hub`, `board-article-composer`, `board-maker-wizard` 3개가 `partial-automated-evidence`다. state 자동 후보는 axe violation case 49건(violation 66건), failed assertion case 56건(assertion 65건), horizontal overflow 2건이며 color mode 미적용과 unexpected final route는 0건이었다. 이는 human triage 전 후보라 WCAG 준수·severity·제품 결함 수를 뜻하지 않는다.
- 7개 scenario 모두 수동 6개 항목 중 NVDA+Chrome은 `blocked-external`, 나머지 5개는 `not-run-manual-review-required`다. 사용자 task metric, authoritative mutation save/readback/rollback, NVDA·keyboard·확대·forced-colors·reduced-motion과 사용자 연구는 여전히 미완료다.
- r4의 `environment.json`, `baseline-result.json`, performance/axe/checkpoint/run summary 259개 JSON은 forbidden key와 credential-like value 검사를 통과했다. 그러나 모두 ignored local artifact라 clean checkout 내구성이 없고 `eligibleForMeasuredPromotion=false`다.
- r6는 hardened current source의 새 API·frontend image와 격리 synthetic stack에서 setup 2/2, 대상 `01-core-base`·`04-quality-resilience` 15건 통과와 Windows VRT 1건 의도적 skip을 확인한 뒤 exact 96/96 state와 48/48 performance target을 실행했다. 산출물 282개는 모두 JSON이고 privacy guard를 통과했지만 ignored local artifact라 `ephemeral-ignored`이며 `measured` 승격 자격은 없다.
- r6의 `auth-login/invalid-credentials` 6건은 요청 경로 분류를 넓혀야 하는 제품 오류가 아니라 synthetic actor가 login request의 최대 길이를 넘어 exact POST가 400 request-validation으로 끝난 runner fixture 결함이었다. `first-use-onboarding`의 state 6건과 performance 6건은 private auth storage 복원과 init script의 preference 제거 순서에 의존한 runner 준비 결함이었다. 후속 TDD는 auth fixture를 입력 계약 안으로 제한하고 first-use에서 synthetic same-origin을 확립한 뒤 preference 한 key만 제거하도록 보강했지만, r6 artifact를 수기 재분류하거나 같은 결과로 승격하지 않는다.
- r8은 exact 96 state와 48 performance를 모두 완료하고 state/performance invalid 0을 기록했다. 자동 state는 관측 60·blocked prerequisite 36이었고, 로그인 focus assertion 실패 6건, axe violation case 14건(violation 16건), mobile horizontal overflow 4px 2건이 남았다. 이 결과와 282개 privacy-green JSON은 r8 역사로 보존하며 후속 수정으로 수기 재분류하지 않는다.
- 당시 current r9은 API image `sha256:d889bbd7dde8d1791fb9eb2be378c2e0271e268543886391513ead9133b18cad`와 frontend image `sha256:bda52cade3fff4ee847cce4367ecf65ab0a8841d833765a0c1bcd2c5be01fdda`를 current source에서 clean no-cache build했다. frontend의 API·actuator·WebSocket compiled destination은 3/3 일치했고, 격리 DB는 Flyway 성공 88·실패 0, 메뉴 전체 84·활성 81·활성 route 67이었다.
- r9 production build-input tree hash는 `375ba989a36d8423682f39dba3b96813a8c3de9902db44b668465c0a4c8d995c`, dirty build-input diff hash는 `88df5e98c735b3c922755eb19b5bb6a155d2c23c41cbd8ae18dd78a22e56fd76`이다. build 전·두 image build 후·baseline 시작/종료·독립 종료 readback이 일치했고 artifact의 두 finish verification flag도 `true`다. 원문 diff·파일 경로·content는 기록하지 않는다.
- r9 precondition은 synthetic 인증 setup 2/2, bounded navigation·auth-me·WebSocket proxy status 200, 대상 `01-core-base`·`04-quality-resilience` 15건 통과와 Windows VRT 1건 의도적 skip, global cleanup 통과였다. 이는 해당 경로의 실행 가능성 증거이며 전체 제품·운영 데이터·권한 노출을 대표하지 않는다.
- r9 exact 결과는 state 96/96 중 `automated-state-observed` 60·`blocked-prerequisite` 36, state invalid 0, assertion 114/114, performance 48/48 `lab-performance-observed`·invalid 0이다. axe violation, horizontal overflow, failed assertion은 모두 0이다. 이는 정의된 자동 state에서 관측된 후보 0건일 뿐 WCAG 2.2 준수나 사용자 과업 성공을 뜻하지 않는다.
- 36개 `not-executed` task evidence는 승인된 synthetic board deploy target 6, FAQ mutation target 18, user mutation target 12가 없어서 fail-closed로 남았다. manual evidence는 전문가 검토 필요 40·NVDA/Chrome 외부 차단 8이다. 따라서 8개 scenario 모두 `partial-automated-evidence`이고 manifest `currentBaseline.status`는 `unmeasured`를 유지한다.
- r9 artifact는 JSON 282개, non-JSON·symlink·unsafe artifact 0이며 raw trace와 response payload 저장도 0이다. 그러나 ignored/untracked `ephemeral-ignored`라 clean checkout 내구성과 `measured` 승격 자격이 없다. r8 current root는 별도 역사로 보존했고 r9 결과를 r8 파일에 덮어쓰거나 과거 finding을 삭제하지 않았다.
- r9 이후 `synthetic-mutation-v1` 대표 6-case 진단은 JSON 8개 privacy 검사를 통과하고 user 2개·board 1개의 mutation/readback/rollback/active residue 0을 관측했다. FAQ 3개는 DELETE 성공과 DB active residue 0 뒤에도 목록 API가 논리 삭제 행을 반환해 `synthetic-mutation-cleanup-failed`로 fail-closed 되었고, 원인은 `BoardService`가 전달한 `useYn=Y`를 `BoardPredicate`가 소비하지 않던 제품 조회 조건 누락으로 확인했다. 또한 실행 중 production input fingerprint가 변했으므로 이 진단 전체는 invalid provenance이며 r9 baseline이나 full 36개 evidence로 승격하지 않는다. 조회 조건 회귀 수정은 새 source image에서 재검증해야 한다.
- r10은 API image `sha256:7b6632216533a50f46b58537d0af9caa418281f311ddcda4e7621ceecd94d3dd`와 frontend image `sha256:5b14e0a39e61d85fe1f29ffc63bab32e02db8ffba8966374185ba393effa8dbe`를 production build-input tree `2e898232435de440cde7bbbe69409954c9b31974b6ea4eeb097db74d330e1070`, dirty build-input diff `678619203144fe0e1a54eec3ee2a5699da9758b86e4b38a45ff4bfd1ba1a6651`에서 clean no-cache build했다. compiled API·actuator·WebSocket destination 3/3, health·exact CORS, Flyway 성공 88/실패 0, 메뉴 84/81/67, synthetic 인증 setup 2/2가 통과했고 build 전·후 및 diagnostic 종료 source fingerprint가 일치했다.
- r10의 고정 6-case mutation diagnostic은 6/6을 종료하고 JSON 8개 privacy 검사를 통과했으며 active residue는 user·FAQ·board·menu 모두 0이었다. user 2개, FAQ 관리자 API readback 1개, board deploy 1개는 관측됐지만 `admin-compose-faq`는 저장값이 Tiptap canonical HTML인데 plain text와 비교한 runner expectation 때문에 `synthetic-faq-detail-readback-mismatch`, `user-faq-search`는 범용 목록 projection에 의도적으로 없는 본문을 UI가 답변으로 사용해 `synthetic-faq-user-answer-readback-failed`로 닫혔다. threshold·권한·projection을 완화하거나 결과를 수기 보정하지 않았고, proxy/target/full baseline은 시작하지 않았다. r10은 failed diagnostic provenance이며 당시 current r9이나 full 36개 mutation evidence가 아니다. 후속 TDD는 위 closed rich-text 판정과 exact public FAQ detail lazy read를 고정했으며 새 source image에서만 재검증할 수 있다.
- r11 API·frontend image는 후속 수정 전 snapshot에서 build만 완료했으며 container·setup·diagnostic·baseline을 시작하지 않아 authoritative evidence가 아니다. 독립 hostile audit가 generic FAQ 조회 경계와 scenario aggregate의 performance status/비-mutation gating 결함을 확인해 r12 build 전에 실행을 중단했다. aggregate는 manifest `requiredTaskEvidenceId` SSOT와 exact `lab-performance-observed` completion으로 TDD 보강했지만, 이는 새 full run 결과가 아니므로 r9·r10 artifact를 수기 재분류하지 않는다.
- current r12는 API image `sha256:70f8042a67c61db857a8524ddf5e8919d5c821e312f1db37adfb269c8729fd59`와 frontend image `sha256:999534250148a783f17ea98041d040df8e36931eb128d2b1b386a278a2fdd804`를 frozen current source에서 `--pull --no-cache`로 새로 만들었다. frontend image 내부 API·actuator·WebSocket compiled destination은 exact r12 API로 3/3 일치했다. r10 API/frontend는 삭제하지 않고 stop-preserve 했고 r12 API/frontend는 기존 격리 DB/network에 연결해 loopback `18091`/`3013`으로만 노출했다. 두 컨테이너는 종료 readback에서 healthy·restart 0이었다.
- r12 production build-input tree hash는 `5ebb43f59773661c65df645f9da3c0ebe0a9af1cef93b046a3a56c4707cd9c05`, dirty build-input diff hash는 `929b3b571c10dfc7f8f5d5606a441e7da478e21e9b04ebd417b72037cdc14a0e`, build-input file count는 1,341이다. runtime manifest file SHA-256은 `d2db90308b4f4766d3448cc9ab64b557f0a1f9dc673cf643a208cc03b0ee6781`, core/runner/runner-contract/scenario-contract file SHA-256은 각각 `ec41b33fdfef10f927bbd7c3f37b413144a7d8a9fcb3ce729dc6134d5dae196a`, `66092706a07b4903fadcd6c26be34166434f3d21389956e807ada66679dcc712`, `704e2bab956995a8b7ba9b36be8ac5830636cae30d658ea59f9a381a5c16e173`, `5c6ce3b5997e6dab2d06749393659bd634f6546828ba34106f87b0dbe65c0a13`이다. build 전·두 image build 후·diagnostic/target/full 시작과 full 종료·독립 종료 readback이 일치했고 diagnostic/full artifact의 두 finish verification flag도 `true`였다. 이 provenance는 아래 post-run manifest 설명문 동기화 전 실행 snapshot이며 원문 diff·선택 파일 내용은 기록하지 않는다.
- r12 격리 DB는 실행 전·후 Flyway 성공 88·실패 0·versioned 85·repeatable 3·최신 V2.84, 메뉴 전체 84·활성 81·활성 route 67로 동일했다. runtime CORS는 exact frontend origin을 허용하고 비허용 origin은 403과 allow-origin 헤더 없음으로 닫혔다. synthetic 인증 setup 2/2와 global teardown, bounded navigation·auth-me·WebSocket proxy 3/3 status 200, 대상 `01-core-base`·`04-quality-resilience` 15건 통과와 Windows VRT 1건 의도적 skip이 모두 단일 attempt에서 통과했다.
- full 실행 전 `synthetic-mutation-v1` 대표 6-case diagnostic은 privacy-safe JSON 8/8, state 6/6·invalid 0, 서로 다른 task evidence 6/6을 기록했다. 모든 evidence는 계획 case ID에 exact 결속됐고 product mutation·authoritative readback·rollback·cleanup·`zero-active-residue`를 만족했다. 독립 DB readback도 synthetic user·활성 FAQ·board·menu 네 residue 축 0이었으며 이 diagnostic을 full 36개 증거로 대신하지 않았다.
- r12 full exact 결과는 state 96/96 `automated-state-observed`·invalid 0, assertion 156/156, performance 48/48 `lab-performance-observed`·invalid 0이다. performance는 cold 3·warm 3의 기록 run 288개이며 warm prime 48개는 의도대로 기록하지 않는다. axe violation·horizontal overflow·failed assertion·자동 finding은 모두 0이다. 이는 정의된 자동 state의 후보 0건일 뿐 WCAG 2.2 준수나 실제 사용자 과업 성공을 뜻하지 않는다.
- mutation 요구가 있는 36개 state case는 task evidence 36건을 exact executed/readback/rollback/cleanup/residue 0으로 기록했고, mutation 요구가 없는 60개 case의 task evidence는 정확히 빈 배열이다. user 12·FAQ 18·board deploy 6의 planned identity가 모두 닫혔으며 다른 dimension의 evidence 복사·대체나 미선언 evidence는 없었다. full 종료 뒤 독립 DB readback도 네 synthetic residue 축 0이었다.
- r12 full artifact는 diagnostics를 제외해 JSON 282/282, non-JSON·symlink·unsafe artifact 0이고, 별도 diagnostic도 JSON 8/8·unsafe 0이다. 원본은 모두 ignored/untracked `ephemeral-ignored`지만, closed automated-only compact summary와 index는 UA-04에서 durable repository evidence로 발행·검증됐다. 그 summary에도 execution-captured protocol hash와 manual evidence가 없으므로 `measured` 승격 자격은 없다. manual evidence는 전문가 검토 필요 40·NVDA/Chrome 외부 차단 8로 열려 있어 8개 scenario 모두 `partial-automated-evidence`, manifest `currentBaseline.status`는 모두 `unmeasured`를 유지한다. 기존 current root의 JSON 298개는 내용을 열거나 지우지 않고 `pre-r12-current` local history로 이동해 보존했지만 이 local history 자체는 durable repository evidence가 아니다.

따라서 r12 자동 모집단과 mutation 실행 증거는 현재 권위 증거지만 `baseline-runtime-evidence`와 모든 scenario의 reference baseline은 수동 평가와 current combined evidence가 닫히지 않아 계속 `unmeasured`다. 원래 pre-change 사용자·성능 baseline은 `unavailable`이다. “pre-change baseline 수집 완료”, “접근성 준수”, “성능 개선률”은 선언할 수 없다. r12는 실행 시점 protocol hash가 없어 historical automated-only summary로만 보존한다. protocol hash를 실행 중 기록한 새 authoritative run의 자동 증거와 수동 48/48가 같은 current indexed combined summary로 발행되고 clean-checkout digest·blob readback을 통과한 뒤에만 이 표와 scenario manifest의 status/evidence를 함께 갱신한다.
