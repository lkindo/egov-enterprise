# URL 상태 프라이버시 분류 초안 — PD-UX-002 승인 회의 입력물

> **역사적 snapshot — 현재 규범 아님:** 이 문서는 2026-08-23 워크숍의 선행 입력물을 당시 표현과 수치로 보존한다. 2026-09-05 [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md)이 화면별 exact route/query-key allowlist 아래 일반 개인정보성 업무 검색어를 URL에 둘 수 있도록 승인했다. [현재 부류 registry](../../config/ui-url-state-approval.json)는 `class-governed`·`non-normative-url-state-class-registry`인 비규범 컨테이너이지 전체 승인이 아니다. `presentation-state`·`resource-identifier`·`search-input`·`control-flag`가 각자 승인 기록을 가지며 `search-input`만 class-level `decisionRef`로 ADR-0009에 결속한다. `opaque`·`path-intent`·`hand-assembled-segment` 3개 부류는 계속 미해결이다. 앱은 자격증명·세션 비밀·인증/복구 token·고위험 개인정보·응답/업무 본문용 전용 URL state를 만들거나 입력을 유도하지 않는다. 일반 자유 검색어에 예상 밖 값이 들어올 가능성은 내용 기반으로 완전 판별할 수 없는 잔여 위험이다. 허용 검색어는 client log·analytics·오류 로그 payload에 복제하지 않으며 URL은 인가 증거가 아니다.
>
> 아래의 523-record 수치, `draft-blocked-input`, 검색어 전면 금지안과 미등록 follow-up 문구는 그 시점의 제안·증거다. 현재 생성 census와 ADR-0009를 대신하지 않으며, 결정 이력을 보존하기 위해 본문을 소급 재작성하지 않았다.

> - **상태: `draft-blocked-input` — 승인 아님.** 이 문서는 어떤 allowlist/denylist도 확정하지 않으며, 구현 변경의 승인 근거가 아니다.
> - **용도:** `PD-UX-002` 승인 회의의 입력물. [IA 문서 §14.3](../01-product/information-architecture.md) 워크숍에서 "census 523 record의 프라이버시 분류 초안 작성을 별도 태스크로 선행한다"고 기록된 그 선행 태스크의 산출물이다.
> - **작성:** 2026-08-23
> - **입력 원본:** [config/ui-url-state-census.json](../../config/ui-url-state-census.json) (`asOf` 2026-08-21, records 523, `inventoryHash b8e5bee533987c43d010115b1890d58ee4d3a57e6468ee0b93962f42fbebe3f7`), 생성기는 [scripts/ui-url-state-census.mjs](../../scripts/ui-url-state-census.mjs)
> - **분류 기준 원본:** [IA 문서 §14.2의 PD-UX-002 제안 문구](../01-product/information-architecture.md) — 비민감·공유 가치·복원 가치 3조건을 모두 만족하는 상태만 URL 허용(초기 allowlist는 category·bounded page), 개인정보·IP·자유 검색어·record identifier·exact 조사 상태는 URL·client log·analytics 금지.

## 1. 이 초안이 하는 것과 하지 않는 것

**한다:** census 523개 record 전부를 파라미터/패턴 그룹으로 묶고, 그룹마다 4개 분류 중 하나의 **초안 판정**과 근거·오분류 위험을 제시한다. 그룹 합계가 523과 일치함을 산술로 보인다.

**하지 않는다:**

- 어떤 record의 `approvalStatus`도 바꾸지 않는다. census의 모든 state item은 여전히 `unverified`다.
- 코드·redirect·sanitizer·analytics를 변경하지 않는다.
- `PD-UX-002`(로그 scope)와 미등록 전역 URL follow-up(후보 `PD-UX-003`)의 scope 경계를 결정하지 않는다. census는 전역 표면(navigation 358 + request-telemetry 165)을 다루므로, 승인 회의는 각 그룹을 어느 결정 ID가 소유할지도 함께 정해야 한다(§6).
- 정적 구문 census의 한계를 대신 메우지 않는다. 정적 분석은 값이 개인정보인지·공개인지·인가된 locator인지 판별하지 못하므로(census `limitations`), 본 초안의 분류는 **패턴 수준의 우선 판정**이며 record 단위 확정은 owner 리뷰 몫이다.

## 2. 분류 카테고리 정의

| 분류 | 의미 | 승인 시 후속 조치 |
|---|---|---|
| `allow` | URL에 상태가 없거나, 3조건(비민감·공유 가치·복원 가치)을 구조적으로 만족하는 bounded 상태 | typed allowlist에 등재하고 계약 테스트로 고정 |
| `canonicalize-default` | 허용 가능하나 default/unknown/invalid 값은 URL에서 제거·정규화해야 하는 상태 | 단일 정본 parser/serializer가 default 제거·unknown 거부·단일값 강제 |
| `forbid-move-to-memory` | §14.2 denylist(자유 검색어·개인 식별자 등)에 해당 — URL·client log·analytics에서 금지하고 memory 또는 승인된 POST 검색으로 이전 | URL/GET에서 제거, memory/POST 대체의 refresh·Back 복원 검증 |
| `needs-owner-call` | 정적 구문만으로 민감도·locator 의미·전파 경로를 판정할 수 없어 소유자 결정이 필요 | 승인 회의에서 그룹별 결정 후 위 3개 중 하나로 재분류 |

## 3. 그룹 산정 방법과 총계 산술

그룹은 census record의 `kind` + state item 이름 집합(+ navigation-producer는 `targetCandidate` 유무)으로 기계적으로 나눴다. 각 record는 정확히 하나의 그룹에 속한다.

- 파라미터 가족: 검색어 = {`searchWrd`, `searchCnd`, `q`, `keyword`, `searchKeyword`}, 콘텐츠 locator = {`bbsId`, `pstSn`, `nttId`, `parnts`, `parntsId`, `groupId`, `srvySn`, `replyYn`}, 기간 = {`startDate`, `endDate`}.
- 우선순위: 검색어·locator·기간 파라미터가 하나라도 있으면 computed 표기보다 그 가족 그룹으로 배정한다(`<computed-request-query>`+`keyword` → 검색어 그룹).

**총계 산술 — 그룹 합계는 523이다.**

- 표면별: navigation 358 + request-telemetry 165 = **523**
- kind별(census `summary.byKind`와 일치): navigation-producer 152 + query-consumer 58 + query-producer 52 + query-builder 20 + config-redirect 15 + page-redirect 5 + form-producer 45 + url-observer 7 + dynamic-segment 11 + request-query-producer 158 = **523**
- 그룹 표 소계(§4): N군 152 + Q군 110 + S군 103 + R군 158 = **523**
- 분류별(§5): allow 167 + canonicalize-default 103 + forbid-move-to-memory 26 + needs-owner-call 227 = **523**

## 4. 패턴 그룹별 분류 초안 (27개 그룹, 합계 523)

### N군 — 화면 내비게이션 producer (navigation-producer, 소계 152)

| 그룹 | 패턴 | n | 예시 route | 분류 | 근거 | 오분류 시 위험 |
|---|---|---|---|---|---|---|
| N1 | 리터럴 경로만 있는 링크/redirect (query 상태 없음) | 83 | `/admin`, `/admin/collaboration/address-book` | `allow` | 상태를 URL에 싣지 않는 canonical 경로 이동 | 낮음 — 단, 대상이 canonical route가 아니면 alias 정리 대상 |
| N2 | 대상이 런타임 계산되는 내비게이션 (`targetCandidate` 없음) | 37 | `/admin`, `/admin/collaboration/scraps/selectScrapDetail/[id]` | `needs-owner-call` | 구문만으로 대상 경로·query 유입을 판정 불가 | allow로 오분류 시 forbidden 값이 계산 URL로 유입돼도 탐지 못함 |
| N3 | 계산된 query를 싣는 내비게이션 (`<computed>`) | 8 | `/admin/collaboration`, `/admin/help` | `needs-owner-call` | query 이름/값이 정적으로 확정되지 않음 | 검색어·식별자가 조용히 URL로 승격될 수 있음 |
| N4 | 콘텐츠 locator query 내비게이션 (`bbsId`·`pstSn`·`nttId`·`parnts`·`replyYn`·`srvySn`) | 14 | `/admin/community/board`, `/admin/community/boards/detail` | `needs-owner-call` | public 콘텐츠 locator인지 내부 record identifier인지 구분이 locator 분류(전역 follow-up) 몫 | 일괄 forbid는 게시글 deep-link 공유 가치 파괴, 일괄 allow는 §14.2 record identifier 금지 위반 |
| N5 | `tab` query 내비게이션 | 5 | `/admin/security/audit`, `/admin/survey/items` | `canonicalize-default` | bounded enum UI 상태 — 비민감·공유·복원 가치 충족, default 값은 제거 | unknown 값 허용 시 open query 표면이 남음 |
| N6 | 로그인 intent (`redirect`·`expired`) | 5 | `/admin/system/banner` 등에서 `/login?redirect=...` | `needs-owner-call` | login intent 복원 계약은 §15.3 전역 follow-up 승인 사항(open-redirect·role escalation 방어 포함) | allow로 오분류 시 redirect 값 검증 없이 고정될 수 있음 |

### Q군 — 화면 query 상태 producer/consumer (query-consumer 58 + query-producer 52, 소계 110)

| 그룹 | 패턴 | n | 예시 route | 분류 | 근거 | 오분류 시 위험 |
|---|---|---|---|---|---|---|
| Q1 | `page`·`pageNo` | 36 | `/admin/community/boards/select-board-list` | `canonicalize-default` | §14.2 초기 allowlist의 bounded page — default(1)·invalid는 정규화 | 무한/음수/비수치 page 허용 시 캐시·공유 URL 오염 |
| Q2 | `tab`·`view` | 23 | `/admin/collaboration`, `/admin/notifications` | `canonicalize-default` | bounded enum UI 상태, 복원·공유 가치 있음 | enum 밖 값 통과 시 unknown query 표면 존속 |
| Q3 | `orderBy` | 4 | `/admin/community/boards/select-board-list` | `canonicalize-default` | bounded 정렬 enum — default 정렬은 URL에서 제거 | 자유 문자열 정렬 허용 시 injection·표면 확대 |
| Q4 | `startDate`·`endDate` | 8 | `/admin/community/boards/select-board-list` | `needs-owner-call` | 일반 목록에선 비민감 필터지만 audit/log 표면에선 §14.2가 금지한 exact 조사 상태가 됨 | 일괄 allow 시 조사 시간창이 URL·referrer로 노출 |
| Q5 | 콘텐츠 locator query (`bbsId`·`pstSn`·`nttId`·`parnts`·`parntsId`·`groupId`·`srvySn`) | 17 | `/admin/community/boards/detail` | `needs-owner-call` | N4와 동일 — public locator vs record identifier 판정 선행 필요 | N4와 동일 |
| Q6 | 자유 검색어 (`searchWrd`·`searchCnd`·`q`) | 11 | `/admin/community/boards/select-board-list`, `/admin/system/programs`, `/search` | `forbid-move-to-memory` | §14.2 명시 금지 — 자유 검색어는 URL·client log·analytics 불허, memory/POST 검색으로 이전 | 방치 시 개인정보성 검색어가 history·referrer·로그에 잔존; 반대로 `/search` 공유 요구가 있으면 owner가 명시 예외를 별도 승인해야 함 |
| Q7 | 인증 흐름 query (`redirect`·`auth_error`) | 3 | `/login` | `needs-owner-call` | login intent·오류 코드 계약은 전역 follow-up scope | N6과 동일 + 오류 상세의 정보 노출 |
| Q8 | 계산된 query (`<computed>`) | 8 | `/admin/system/logs`, `/admin/system/monitoring` | `needs-owner-call` | 이름/값 미확정 — 특히 log/monitoring 화면이라 §14.2 로그 scope 심사 필수 | 로그 검색 조건이 통째로 URL에 실릴 수 있음 |

### S군 — 구조적 URL 표면 (소계 103)

| 그룹 | 패턴 | n | 예시 route | 분류 | 근거 | 오분류 시 위험 |
|---|---|---|---|---|---|---|
| S1 | 기존 query 전체 복사 후 변형 (query-builder `<unknown-source-query>`) | 20 | `/admin`, `/admin/community/boards/select-board-list` | `canonicalize-default` | unknown·repeated·encoded 이름이 생존하는 패턴 — typed allowlist serializer로 교체해 정규화 | 방치 시 forbidden 이름이 화면 간 이동에서 무한 전파(census 필수 negative case) |
| S2 | Next config redirect의 source-query 병합 (config-redirect) | 15 | `/admin/community/boards/selectBoardList` → canonical | `canonicalize-default` | redirect 경계에서 unknown/forbidden query를 제거·정규화해야 함 | 레거시 URL의 임의 query가 canonical URL로 세탁됨 |
| S3 | 경로 전용 page redirect (page-redirect, 상태 없음) | 5 | `/admin/survey` → `/admin/survey/hub` | `allow` | 리터럴 canonical 경로로의 상태 없는 이동 | 낮음 — encoding 정책 검증은 census상 잔여 항목 |
| S4 | method가 정적으로 불명확한 form (form-producer) | 45 | `/admin/collaboration/address-book/insert-address-book` | `needs-owner-call` | GET submit이면 form 필드(개인정보 가능)가 URL로 직렬화됨 — 명시적 POST/interception 증거 필요 | GET 오판 시 입력 개인정보가 URL·access log에 노출 |
| S5 | `location.href` 등 raw URL 관측 (url-observer) | 7 | `/admin` error boundary, session-expiry 컴포넌트 | `needs-owner-call` | 읽기 자체보다 client log/telemetry 전파 여부가 쟁점 — data-flow 리뷰 필요 | URL의 forbidden 값이 오류 리포트·모니터링으로 복제 |
| S6 | dynamic path segment (`[id]`·`[type]`) | 11 | `/admin/community/[id]` | `needs-owner-call` | segment 이름만으로 locator 의미(공개/인가 필요/bearer) 판정 불가 | bearer성 값이면 URL 공유·history 자체가 유출 경로 |

### R군 — request-telemetry: API 요청 URL producer (request-query-producer, 소계 158)

이 군은 브라우저 주소창이 아니라 **API 요청 URL**이다. §14.2 원칙 중 "URL·client log·analytics 금지"는 server access log·proxy log까지 데이터 흐름 검토를 요구하는 §15.2 기준과 함께 읽는다.

| 그룹 | 패턴 | n | 예시 대상 | 분류 | 근거 | 오분류 시 위험 |
|---|---|---|---|---|---|---|
| R1 | query 없는 path 전용 요청 | 75 | `/actuator/health`, `/scraps/[computed]` | `allow` | query 상태 없음 — path 내 REST locator의 의미 분류는 S6과 같은 locator 결정의 잔여 | path locator가 bearer성이면 access log 노출 — locator 결정에 위임 |
| R2 | 계산된 요청 query (`<computed-request-query>`, `pageIndex`·`pageUnit`·`scope`·`type` 동반 포함) | 63 | `/admin/system/survey-responses` | `needs-owner-call` | 필드 의미가 도메인 리뷰 전 미확정 — 검색어/식별자 포함 가능 | allow 오판 시 R3와 같은 노출을 그룹 단위로 놓침 |
| R3 | 명시적 검색어 요청 query (`keyword`·`searchWrd`·`searchCnd`·`searchKeyword`) | 14 | `UserSearchService` → `/search`, `SurveyAdminService` → `.../respondents` | `forbid-move-to-memory` | 자유 검색어 GET은 access/proxy log에 잔존 — §14.2에 따라 memory/승인된 POST 검색으로 이전(백엔드 API 계약 변경 동반) | 방치 시 검색어가 서버 로그 보존기간 동안 잔존; 일괄 강행 시 API 호환성 파손이므로 owner가 전환 순서를 정해야 함 |
| R4 | bounded 목록 제어 (`pageIndex`·`pageUnit`·`size`·`sort`) | 3 | `/scraps` 목록 | `allow` | 비민감 bounded 페이징/정렬 | 낮음 — 범위 검증 없으면 과대 페이지 요청 표면 |
| R5 | 기간 요청 query (`startDate`·`endDate`) | 1 | `.../range` | `needs-owner-call` | Q4와 동일 — 대상 API가 audit성일 경우 조사 시간창 노출 | Q4와 동일(server log 축) |
| R6 | `menuNo` | 1 | `/left?menuNo=...` | `allow` | 내부 메뉴 번호 — 비개인·bounded 식별 값 | 낮음 |
| R7 | `userId` | 1 | `UserAdminService` → `/check-id` | `forbid-move-to-memory` | 개인 식별자가 GET query로 access log에 기록됨 — POST body 이전 대상 | 방치 시 사용자 ID 목록이 로그에 축적(중복확인 호출마다) |

## 5. 분류 총계

| 분류 | 그룹 | record 수 |
|---|---|---|
| `allow` | N1, S3, R1, R4, R6 | 83+5+75+3+1 = **167** |
| `canonicalize-default` | N5, Q1, Q2, Q3, S1, S2 | 5+36+23+4+20+15 = **103** |
| `forbid-move-to-memory` | Q6, R3, R7 | 11+14+1 = **26** |
| `needs-owner-call` | N2, N3, N4, N6, Q4, Q5, Q7, Q8, S4, S5, S6, R2, R5 | 37+8+14+5+8+17+3+8+45+7+11+63+1 = **227** |
| **합계** | 27개 그룹 | **523** |

## 6. 승인 회의가 결정해야 할 사항

1. **scope 소유:** 로그/audit 표면 그룹(Q4·Q8의 log/monitoring·audit route)은 `PD-UX-002`로, 나머지 전역 그룹은 별도 등록될 전역 URL follow-up(후보 `PD-UX-003`)으로 배정할지 — [IA 문서 §10](../01-product/information-architecture.md)의 권고대로 별도 ID 등록 여부를 포함해 결정한다.
2. **locator 분류:** N4·Q5·S6·R1의 콘텐츠 locator를 public locator / authenticated non-secret locator / bearer handle로 나누는 기준과 그룹별 판정.
3. **검색어 예외:** Q6의 `/search?q=`처럼 공유 가치가 큰 공개 검색에 명시 예외를 둘지, 전면 memory/POST 이전할지.
4. **needs-owner-call 227건의 해소 순서:** 위험 상위(S4 form GET 가능성, Q8 로그 화면 computed query, R2 computed 요청 query)부터 record 단위 리뷰 일정과 owner를 지정한다.
5. **집행 방식:** 승인 후 typed parser/serializer 단일 정본과 red test(unknown·repeated·encoded·forbidden name)로 §15.2 acceptance를 충족시키는 구현 순서.

## 7. 한계와 재검증 조건

- 본 초안은 `asOf` 2026-08-21 census의 정적 구문 증거에만 기반한다. census `limitations`가 명시하듯 정적 분석은 값의 개인정보성·인가 경계를 판정하지 못하며, CDN·proxy·browser history·외부 analytics 보존은 관측 범위 밖이다.
- census가 재생성되어 record 수·`inventoryHash`가 바뀌면 이 문서의 산술은 무효이며, 같은 그룹 규칙(§3)으로 재산출한 뒤 갱신해야 한다.
- 이 문서의 어떤 분류도 승인 전에는 코드 변경·baseline 완화·게이트 예외의 근거가 되지 않는다.
