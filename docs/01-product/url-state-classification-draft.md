# URL-state 분류 초안 (승인 회의 입력물)

> **작성일**: 2026-09-04 · **대상 census**: [config/ui-url-state-census.json](../../config/ui-url-state-census.json) (`asOf: 2026-08-21`, 377 record · 216 state item)
> **선행 결정**: [PD-UX-002](../04-operations/pending-decisions.md) — "분류 초안이 선행돼야 승인 회의가 성립한다"

## 0. 이 문서의 지위

**이 문서는 승인이 아니다. 승인 회의의 입력물이다.**

- 여기의 모든 판정은 **권고와 근거**이며, 어떤 항목도 "승인됨"·"검토 완료"가 아니다.
- 이 문서 때문에 [config/ui-url-state-census.json](../../config/ui-url-state-census.json) 은 **바뀌지 않는다.** census 계약([scripts/ui-url-state-census.mjs](../../scripts/ui-url-state-census.mjs))이 `canonical.status`·`capabilityRoles`·`objectAuthorization`·`stateItems[].dataClass`·`approvalStatus` 를 전부 `unverified` 로 강제하고, 값을 바꾸면 `canonical route status cannot be approved by syntax`(:1110)·`state classification must remain unverified`(:1117)로 red 를 낸다. **승인은 사람의 몫이고, 문법으로는 승인할 수 없다.**
- census 스스로도 자기 권위를 `generated-pre-decision-census-not-policy` 로, 제안 결정을 `PD-UX-003 / not-registered / blocked-input / accountableOwner: unassigned` 로 선언한다.
- census `limitations` 가 이미 명시한 한계는 이 초안에도 그대로 승계된다 — 정적 문법은 값이 개인정보인지 알 수 없고, 계산된 타깃·공유 컴포넌트 route 컨텍스트는 fail-closed 로 남으며, **CDN·리버스프록시·브라우저 히스토리 보존은 이 저장소가 관측하지 않는다.**

### 조사 범위와 방법

전 5개 부류를 병렬 조사했고, 소스를 직접 개봉한 범위와 추론에 의존한 범위를 구분해 표시한다.

| 부류 | 개봉 범위 |
|---|---|
| 표현 상태(presentation) | producer/consumer 전건 개봉 + 백엔드 8파일 교차 검증 |
| 리소스 식별자(resource-id) | 7개 이름 45개 항목 전건 개봉 |
| 검색 입력(search-input) | 5개 소스 파일 전건 개봉 |
| 제어 플래그(control-flag) | 3종 전건 개봉 + `frontend/src` 전수 grep |
| 불투명(opaque) | 60건 전건 추적 |
| 상태 없음(stateless) | form-producer 46파일 **전건 기계 검사**, navigation-producer 리터럴 73건은 census `targetCandidate` 문자열 전수 검사 후 **6파일만 소스 개봉**(67건은 파서 신뢰 추론), 계산된 타깃 52건 중 **13건만 개봉 · 39건 미확인** |

---

## 1. 한 장 요약 — owner 가 결정할 것 5가지

377 record 를 나열하지 않는다. 실제로 갈리는 축은 다섯 개이고, **이 다섯 답이 396개 판정 단위의 대부분을 결정한다.**

| # | 질문 | 걸린 건수 | 기본 검토안 대비 |
|---|---|---|---|
| **Q1** | **사용자가 타이핑한 검색어를 URL 에 실을 것인가** — `/search?q=`(화면이 "임직원 성명"을 검색 대상으로 고지), 게시판 `searchWrd`(검색 조건에 '작성자' 모드 존재), export 다운로드 URL 의 `searchKeyword`(개인정보 열람 로그 화면 포함) | 14 | **기본안과 충돌.** 저장소는 로그 화면에서 이미 "검색어는 URL 에 싣지 않는다"를 주석 계약으로 명문화했는데, 같은 값이 export 경로로는 나간다 |
| **Q2** | **copy-all 캐리어를 allowlist 재조립으로 바꿀 것인가** — 지금은 `new URLSearchParams(searchParams)` 가 들어온 쿼리를 이름을 묻지 않고 전부 보존·재발행한다 | 34 (copy-all 20 + config redirect 통과 14) | 기본안이 성립하려면 필요. 미지의 이름이 URL 에 한 번 들어오면 탭·페이지 클릭마다 재첨부된다 |
| **Q3** | **DB 메뉴(`tb_menu_info.modern_route`)가 소유한 쿼리 키 공간을 어떻게 다룰 것인가** — allowlist 를 둘 것인가, DB 값이라 판정 대상 밖으로 볼 것인가 | 52 (계산된 내비게이션 타깃) | 기본안의 사각. **소스만 읽는 census 는 이 축을 원리적으로 볼 수 없다** |
| **Q4** | **죽은·미완결 URL 표면을 걷을 것인가** — `expired`(생산자 7·소비자 0), 세그먼트를 읽지 않는 `[id]` 2건, `pstSn` 별칭 `nttId` 2건, producer 없는 `searchWrd` 2건·`pageNo` 1건, 레거시 별칭 route 1건, `groupId` 1건 | 14 | 기본안과 무충돌. **잃는 동작이 없어 비용이 0 인 정리분** |
| **Q5** | **이번 회의에서 어디까지 승인하고, 승인하지 못한 나머지의 `reviewBy` 를 어떻게 할 것인가** | 377 record 전체 | §5 참조 — **초안만으로는 2026-10-31 만료가 풀리지 않는다** |

### 총계

| 권고 | 판정 단위 | 내역 |
|---|---|---|
| `keep-in-url` | **282** | state item 158 + 상태 없음이 증명된 record 124 |
| `remove-from-url` | **5** | 세그먼트 미소비 `[id]` 2 · `nttId` 2 · `admin/error.tsx` 의 `redirect=path+search` 1 |
| `needs-owner-decision` | **109** | state item 53 + census 가 상태를 읽지 못한 record 56 |

> 판정 단위 396 = state item 216 + 상태 항목이 없는 record 180. census 의 record 377건 중 197건이 216개 state item 을 나눠 갖는다.

### 기본 검토안에 대한 결론

PD-UX-002 의 기본 검토안("페이지·탭 등 비민감 상태만 URL 에 두는 안")은 **표현 상태 80건에서 실측으로 지지된다** — 다섯 항목(`page`·`tab`·`view`·`orderBy`·`pageNo`) 모두 자유 입력 경로가 없고, 여러 소스가 "새로고침·공유·뒤로가기 복원"을 URL 보유 사유로 주석에 명시하며, 같은 화면들이 검색어는 개인정보 우려로 이미 URL 에서 배제했다.

**다만 기본안은 세 곳에서 그대로 적용되지 않는다.**

1. `orderBy` 만 프런트 검증이 없다 — 안전이 백엔드 화이트리스트에 의존한다(§2.1).
2. 검색어 3종은 "비민감만"을 문자 그대로 적용하면 제거인데, 제거 비용이 실재한다(Q1).
3. URL 키 공간의 일부가 소스가 아니라 **DB** 에 있어 기본안의 적용 대상 자체가 저장소 밖에 있다(Q3).

---

## 2. 부류별 분류 결과

### 2.1 표현 상태 — 80 state item

| 항목 | 건수 | 값 출처 | PII 위험 | 권고 | 한 줄 근거 |
|---|---|---|---|---|---|
| `page` | 38 | computed | none | `keep-in-url` | UI 페이저만 만드는 1-base 정수. 13개 route 중 12곳이 읽는 즉시 정수 클램프하고 기본값이면 파라미터를 삭제한다 |
| `tab` | 31 | enumerated | none | `keep-in-url` | DB 메뉴 `modern_route` 가 `?tab=` 으로 화면을 지목하고 구 경로 14개가 이 형태로 북마크를 흡수한다. 소비자 9곳 전부 닫힌 집합 검증 후 기본 탭으로 축퇴 |
| `view` | 6 | enumerated | none | `keep-in-url` | 두 route 뿐이고 둘 다 엄격 일치 이진 토글(`=== 'matrix'`). 데이터 범위가 아니라 같은 데이터의 표현만 바꾼다 |
| `orderBy` | 4 | enumerated | low | `keep-in-url` | UI writer 는 3-옵션 Select 뿐이나 **프런트 읽기 경로에 검증이 없다.** 안전은 백엔드 화이트리스트 `switch` 와 QueryDSL 동적경로 금지 게이트가 담당 |
| `pageNo` | 1 | computed | none | `keep-in-url` | 값 성격은 `page` 와 동일하나 **producer 가 0건**이라 새로고침 복원이 현재 작동하지 않는다(§3-D) |

주요 인용: [UserOrgHubClient.tsx:316](../../frontend/src/app/admin/user/UserOrgHubClient.tsx) "페이지 번호는 URL 에 반영한다 — 새로고침·공유·뒤로가기가 복원된다" · [MemoReportManagementClient.tsx:193-194](../../frontend/src/app/admin/operation/memo-reports/MemoReportManagementClient.tsx) "검색어는 개인정보 노출 우려로 URL 에 싣지 않는다" · [BoardRepositoryImpl.java:132-151](../../business-app/src/main/java/nuri/business/domain/board/BoardRepositoryImpl.java) 화이트리스트 `switch`, default 는 `sortOrdr.desc()` · [QuerydslDynamicPathLinterTest.java:20-22](../../api-server/src/test/java/nuri/api/harness/QuerydslDynamicPathLinterTest.java) "CVE-2024-49203(CVSS 8.2)은 orderBy 를 통한 blind HQL 인젝션이다".

**함께 올릴 정비 4건**(승인 대상이 아니라 권고):

1. `orderBy` 값 도메인을 프런트에서도 `date|views|comments` 로 좁힌다 — 백엔드 `BoardSearchCondition` 이 이미 그 세 값을 선언한다.
2. `pageNo` 이름·producer 정합(§3-D).
3. [select-board-list/page.tsx:32](../../frontend/src/app/admin/community/boards/select-board-list/page.tsx) 만 하한 클램프가 없어 `?page=-5` 가 생성 zod `min(0)` 에서 throw 된다. fail-closed 라 보안 문제는 아니지만 형제 13곳은 조용히 1페이지로 수렴하므로 같은 입력에 화면이 다르게 반응한다.
4. copy-all 관용구 → Q2.

### 2.2 리소스 식별자 — 45 state item

| 항목 | 건수 | 값 출처 | PII 위험 | 권고 | 한 줄 근거 |
|---|---|---|---|---|---|
| `bbsId` | 21 | server-id | low | `keep-in-url` | 화면 상태가 아니라 **DB 에 영속된 라우팅 키**다 — 생성 마법사가 `modern_route` 에 `?bbsId=` 를 써 넣고 브레드크럼이 그 값으로 메뉴를 역해석한다 |
| `[id]` (세그먼트 소비 7 route) | 7 | server-id | low | `keep-in-url` | 세그먼트가 곧 라우트다. IDENTITY 정수라 열거 가능하지만 개인 소유 리소스는 서비스 계층 `assertOwnerOrAdmin` 이 실제로 막는다 |
| `[id]` (세그먼트 **미소비** 2 route) | 2 | unknown | none | **`remove-from-url`** | `/admin/community/[id]`·`/admin/community/boards/[id]` 는 `params` 를 받지도 `useParams` 를 쓰지도 않고, 같은 경로의 정적 형제가 이미 존재한다. 어떤 값을 넣어도 같은 화면 |
| `[id]` (레거시 별칭 1 route) | 1 | server-id | none | `needs-owner-decision` | 세그먼트는 정본 경로로 넘기는 통로일 뿐. 판정 불가는 **별칭 route 존치 여부**(§3-D) |
| `pstSn` | 8 | server-id | none | `keep-in-url` | `(bbsId, pstSn)` 쌍이 맞아야 조회되고 비밀글은 작성자·관리자만. 값은 항상 목록·검색 결과에서 나온다 |
| `nttId` | 2 | server-id | none | **`remove-from-url`** | `pstSn` 의 별칭이다 — 소비자가 두 이름을 같은 값으로 받고 producer 도 실제로는 `item.pstSn` 을 싣는다. 같은 글이 두 URL 로 공유·북마크된다 |
| `srvySn` | 2 | user-typed | none | `keep-in-url` | 이 부류에서 유일한 사용자 타이핑이나 `type="number" min={1}` 로 정수만 받고, 통계 응답에 응답자 축이 없다 |
| `groupId` | 1 | enumerated | none | `needs-owner-decision` | **producer 0건**의 소비자 전용 잔존 파라미터. DEC-OPS-022 가 legacy 로 보존하며 신규 producer 를 계약으로 금지했다(§3-D) |
| `[type]` | 1 | enumerated | none | `keep-in-url` | `systemPolicyRepository.findById(type)` 이라 값 도메인이 등록 PK 로 한정. 경로 파라미터는 `encodeURIComponent` 를 거친다 |

주요 인용: [BoardMakerWizard.tsx:269](../../frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx) 가 생성 시 `modernRoute` 에 `?bbsId=` 를 써 넣는다 · [V2_2__seed_framework_data.sql:288](../../api-server/src/main/resources/db/migration/V2_2__seed_framework_data.sql) 시드 메뉴도 동일 형태 · [DynamicBreadcrumb.tsx:45](../../frontend/src/app/components/layout/DynamicBreadcrumb.tsx) 가 메뉴 route 의 `bbsId` 로 현재 메뉴를 역탐색 · [AddressBookService.java:45-48](../../business-app/src/main/java/nuri/business/service/addressbook/AddressBookService.java) "[IDOR] 소유자/관리자만 열람(PII)" · [next.config.ts:77](../../frontend/next.config.ts) `Referrer-Policy: strict-origin-when-cross-origin`.

> ⚠ `bbsId` 는 순수 server-id 가 아니다 — [CommunityBoardsWriteClient.tsx:144](../../frontend/src/app/admin/community/boards/write/CommunityBoardsWriteClient.tsx) 에 `maxLength=20` 자유 텍스트 '게시판 식별자' 입력이 있고 저장 성공 시 그 값이 URL 로 들어간다. 값 도메인이 게시판 코드라 실질 위험은 낮지만 "리소스 식별자는 전부 서버가 만든다"는 가정에는 예외가 있다.

> ⚠ 부서업무 상세 읽기(`DeptJobService.getDeptJob`)에는 소유 가드가 없다(쓰기 경로에만 있다). 다만 같은 도메인 목록 API 가 조건 없이 전량을 반환하므로 상세 읽기가 목록보다 넓은 노출을 만들지 않는다 — **id 를 URL 밖으로 옮겨도 전혀 완화되지 않는 축**이라 URL-state 결함으로 계상하지 않았다.

### 2.3 검색 입력 — 19 state item

| 항목 | 건수 | 값 출처 | PII 위험 | 권고 | 한 줄 근거 |
|---|---|---|---|---|---|
| `searchWrd` | 6 | user-typed | **high** | `needs-owner-decision` | 게시글 목록 4건은 진짜 URL 상태이고 검색 조건에 **'작성자' 모드가 있다**(→ 사람 이름). 주소록·프로그램 2건은 **producer 가 없어** 제거 비용 0 (Q1·Q4) |
| `searchCnd` | 4 | enumerated | none | `keep-in-url` | `'0'\|'1'\|'2'` 닫힌 열거. 단 **짝인 `searchWrd` 의 민감도를 라벨링**하며, `searchWrd` 를 걷으면 홀로 남아 함께 제거돼야 한다 |
| `startDate` | 4 | computed | low | `keep-in-url` | Calendar 가 만든 값을 `toQueryDate()` 가 `yyyy-MM-dd` 로 조립. 자유 문자열 producer 없음 |
| `endDate` | 4 | computed | low | `keep-in-url` | 위와 동일. 뷰 위치로 재사용되지 않아 의미가 하나뿐 |
| `q` (`/search`) | 1 | user-typed | **high** | `needs-owner-decision` | 화면이 "게시글 제목, 임직원 성명, 메뉴 이름을 찾습니다"라 고지하고 백엔드 `@Operation` 이 "성명 부분일치로 조회"라 명시한다. **사람 이름 입력이 정상 사용법**(Q1) |

주요 인용: [BoardListFilters.tsx:52-54](../../frontend/src/app/admin/community/boards/select-board-list/components/BoardListFilters.tsx) `0 제목 / 1 내용 / 2 작성자` · [SearchClient.tsx:219](../../frontend/src/app/search/SearchClient.tsx) 화면 고지 문구 · [UserApiController.java:107-115](../../api-server/src/main/java/nuri/api/controller/UserApiController.java) "성명 부분일치로 조회" · [search/page.tsx:9-22](../../frontend/src/app/search/page.tsx) GET 폼을 택한 사유(React #418 하이드레이션 불일치 회피).

### 2.4 제어 플래그 — 12 state item

| 항목 | 건수 | 값 출처 | PII 위험 | 권고 | 한 줄 근거 |
|---|---|---|---|---|---|
| `redirect` | 6 | computed | low | `keep-in-url` | 인증 경계는 하드 내비게이션이라 URL 외에 복귀 지점을 나를 수단이 없다. open-redirect 는 닫혀 있고 **검증기가 query·fragment 를 잘라낸다** |
| `expired` | 5 | enumerated | none | `needs-owner-decision` | **완전한 dead write** — 생산자 7곳, 소비자 0곳. 세션 만료로 튕긴 사용자에게 로그인 화면이 그 사실을 한 번도 말하지 않는다(Q4) |
| `auth_error` | 1 | enumerated | none | `keep-in-url` | 하드코딩 리터럴 단일값이고 **거부된 경로를 싣지 않는다**(목적지가 `/`). 보안 회귀 스위트 8곳이 이 값을 미들웨어 거부의 관측 신호로 단언한다 |

주요 인용: [LoginClient.tsx:47,55](../../frontend/src/app/login/LoginClient.tsx) `const canonicalPath = parsed.pathname;` 로 query·fragment 폐기 · [login/__tests__/page.test.tsx:283-299](../../frontend/src/app/login/__tests__/page.test.tsx) 부정 케이스 13건 동결 · [proxy.ts:442-446](../../frontend/src/proxy.ts) "인증은 됐고 권한이 부족한 경우다. /login 리다이렉트와 구분돼야 진단이 성립한다" · [23-security-auth-supplement.spec.ts](../../frontend/e2e/23-security-auth-supplement.spec.ts) 8곳 단언.

> `auth_error` 는 URL 유지가 판정됐지만 **화면 소비처가 없다** — 목적지 `/` 가 `searchParams` 를 받지도 않는다. 비관리자는 아무 설명 없이 대시보드로 이동해 '클릭이 씹힌' 것과 구분하지 못한다. URL 결정과 무관한 별도 UX 과제다.

### 2.5 불투명 — 60 state item

census 의 `<computed>`·`<unknown-source-query>` 는 "값이 불투명"이 아니라 **"인자가 문자열 리터럴이 아니라서 이름을 못 읽었다"**는 뜻이다. 60건을 추적한 결과 실제 자유 입력은 **1건**이고, 나머지 위험은 전부 "다른 화면이 실은 값이 살아남는" 캐리어 경로였다.

| 항목 | 건수 | 값 출처 | PII 위험 | 권고 | 한 줄 근거 |
|---|---|---|---|---|---|
| `<source-query>` (next.config redirect 통과) | 14 | unknown | unknown | `needs-owner-decision` | 값이 저장소 밖(북마크·외부 링크)에서 온다. 게시판 2건은 목적지 소비자가 실재해 load-bearing, 나머지 12건은 소비자 미확인(Q2) |
| `<unknown-source-query>` (copy-all) | 20 | unknown | medium | `needs-owner-decision` | 화면이 직접 `set` 하는 이름은 전부 열거형이나, 들어온 것을 **이름을 묻지 않고 재발행**한다(Q2) |
| `<computed>` ▸ 열거형 상태 갱신 | 12 | enumerated | none | `keep-in-url` | 전부 같은 라우트의 쿼리만 바꾸는 형태이고 변수 키의 실제 값은 `page`·`tab`·`cat` 뿐. 허용 목록 밖은 fallback 으로 흡수 |
| `<computed>` ▸ `use-search-state` 캐리어 | 3 | user-typed | medium | `needs-owner-decision` | 키가 호출자 `initialValues` 에서 온다. **live 호출자 1개**가 `searchWrd` 를 싣고 `router.push` 라 히스토리가 쌓인다 |
| `<computed>` ▸ `full-result-download` | 1 | user-typed | **high** | `needs-owner-decision` | 로그 화면이 "검색어는 URL 에 싣지 않는다"를 계약으로 명문화해 놓고, 같은 검색어를 `window.location.assign` 최상위 내비게이션으로 내보낸다. **개인정보 열람 로그 화면 포함**(Q1) |
| `<computed>` ▸ axios `paramsSerializer` | 1 | server-id | low | `keep-in-url` | XHR 요청 쿼리다. 주소창·히스토리·공유 링크에 나타나지 않는다 — **주소창 상태로 오인하면 잘못된 결론이 난다** |
| `<computed>` ▸ `active-menu` 읽기 | 1 | server-id | none | `keep-in-url` | URL 에 싣는 것이 없다. 다만 **Q2 의 allowlist 를 설계할 때 반드시 함께 봐야 하는 제약** — 메뉴가 선언한 키를 빠뜨리면 사이드바가 자기 위치를 잃는다 |
| `<raw-url-or-component>` (url-observer) | 6 | computed | low | `keep-in-url` | 7건을 전건 개봉해 데이터 흐름을 검토한 결과 **텔레메트리 전파 0건** |
| `<raw-url-or-component>` ▸ `admin/error.tsx` | 1 | unknown | medium | **`remove-from-url`** | 401 화면이 `pathname + search` 를 통째로 `/login?redirect=` 에 접어 넣는다. 같은 목적의 다른 두 구현은 이미 `pathname` 만 쓴다 — 정책이 아니라 **비대칭** |
| `<form-field-population>` (`/search` GET 폼) | 1 | user-typed | **high** | `needs-owner-decision` | 이 폼의 successful control 은 `name="q"` 하나로 완전히 특정된다. §2.3 `q` 와 같은 결정(Q1) |

주요 인용: [full-result-download.ts:36,69](../../frontend/src/lib/navigation/full-result-download.ts) 변수 key 로 `append` 한 뒤 `window.location.assign` · [full-result-export.ts:67,72](../../frontend/src/app/components/patterns/full-result-export.ts) `if (searchKeyword) query.searchKeyword = searchKeyword;` · [use-log-url-state.ts:13-15](../../frontend/src/app/admin/system/logs/use-log-url-state.ts) "로그 검색어에는 사번·이름 등 개인정보가 실릴 수 있어" · [SystemLogsPrivacyClient.tsx:53-56](../../frontend/src/app/admin/system/logs/privacy/SystemLogsPrivacyClient.tsx) 개인정보 열람 로그 화면도 같은 경로 사용 · [active-menu.ts:4-6](../../frontend/src/lib/navigation/active-menu.ts) 쿼리로 갈리는 메뉴 2026-08-27 live 실측 11건.

### 2.6 상태 없음 — 180 record

**"URL 에 아무것도 싣지 않는다"가 증명된 것은 124건이고, 나머지 56건은 census 가 못 잡은 것이지 상태가 없는 것이 아니다.**

| 항목 | 건수 | 값 출처 | PII 위험 | 권고 | 한 줄 근거 |
|---|---|---|---|---|---|
| navigation-producer ▸ 리터럴 타깃 | 73 | — | none | `keep-in-url`(현행 승인) | `targetCandidate` 73개 문자열 전수 검사 결과 `?` 포함 0건. **단 6파일만 소스 개봉 — 67건은 파서 신뢰 추론** |
| navigation-producer ▸ 계산된 타깃 | 52 | unknown | unknown | `needs-owner-decision` | 빈 `stateItems` 는 "없다"가 아니라 "못 읽었다"다. 실제로는 `?page=`·`?tab=`·`?bbsId=` 를 싣는다. **21건은 같은 파일에 대체 record 조차 없어 커버리지 0**(Q3) |
| form-producer | 46 | user-typed | none | `keep-in-url`(현행 승인) | detector 가 fail-closed 로 남긴 기록. **46파일 전건 기계 검사** 결과 네이티브 GET 제출 경로 0건(25파일 직접 `preventDefault`, 21파일 react-hook-form 래퍼) |
| page-redirect | 5 | enumerated | none | `keep-in-url`(현행 승인) | 5건 전부 리터럴 경로 `redirect()`. `redirect()` 는 원 URL 쿼리를 **버린다** — 프라이버시상 안전한 방향 |
| query-builder | 3 | user-typed | medium | `needs-owner-decision` | 빈 `new URLSearchParams()` 라 키가 형제 record 로 갈렸고 그 형제도 `<computed>` 다. 실제 이름은 `searchKeyword`(Q1) |
| request-query-producer | 1 | unknown | unknown | `needs-owner-decision` | 범용 HTTP 래퍼 1건. **단독 판정 대상이 아니다** — 실을 것은 전적으로 호출부가 정하고 호출부는 이미 별도 record 다 |

원인 인용: [ui-url-state-census.mjs:337-348](../../scripts/ui-url-state-census.mjs) 의 `expressionTarget()` 이 리터럴·템플릿이 아니면 `target: null` 을 반환하고, [:418-425](../../scripts/ui-url-state-census.mjs) 의 `queryKeysFromTarget()` 이 그 `null` 에서 키를 0개로 만든다. **이 두 함수가 52건의 빈 `stateItems` 를 만든 원인이다.** 반례: [use-log-url-state.ts:36](../../frontend/src/app/admin/system/logs/use-log-url-state.ts) 은 조건식 타깃이라 `target: null` 로 기록됐지만 실제로는 URL 에 쿼리를 쓴다.

---

## 3. 판정이 갈리는 지점 — needs-owner-decision 109건

각 항목에 대해 **무엇을 알아야 정할 수 있는지**를 적는다. 저장소 안에서 답이 나오지 않는 것은 그렇게 표시한다.

### A. Q1 — 자유 입력 검색어 (`q` 1 · `searchWrd` 6 · `use-search-state` 3 · export `searchKeyword` 4)

**알아야 할 것**

1. 이 조직에서 임직원 이름 검색을 개인정보 열람으로 취급하는가. 주소록 상세·사용자 검색에는 `@PrivacyAccess` 가 붙어 있으나 `/users/search` 에는 없다.
2. **운영 프런트 앞단(리버스프록시·WAF·CDN)이 쿼리스트링을 액세스 로그에 남기는가, 남긴다면 보존 기간은.** 저장소 밖 사실이라 운영자만 답할 수 있고, census `limitations` 가 명시적으로 범위 밖이라 선언한 축이다.
3. 게시글 목록에서 "조건이 걸린 목록 링크를 남에게 보내거나 즐겨찾기로 복원하는 것"이 실제 업무 요구인가.
4. '작성자' 검색 모드(`searchCnd=2`)를 유지할 것인가. 유지하면 **URL 에 사람 이름이 실리는 것을 승인하는 결정**이 된다.
5. 운영자가 로그 검색에 실제로 무엇을 입력하는가(사람 이름·계정 id 가 들어가는가).

**선택지와 대가**

| 대상 | 제거 시 잃는 것 |
|---|---|
| `/search?q=` | GET 폼 포기 → JS 로드 전 동작 상실 + React #418 재발 위험(코드 주석이 실측으로 기록) |
| 게시판 `searchWrd` | 조건 포함 링크 공유 · SSR 첫 화면과 클라이언트 재조회의 조건 일치 |
| export `searchKeyword` | POST + Blob 전환 시 대용량 스트리밍의 메모리 이점 상실. binary GET 계약([DEC-OPS-016](../../.agent/memory/decisions.md)) 영향 확인이 선행 |
| 주소록·프로그램 `searchWrd` 2건 | **없음 — producer 가 아예 없다.** 위 답과 무관하게 즉시 처리 가능 |

**경계 질문**: URL 비노출 계약의 경계가 '주소창'인가 '요청 URL 전체'인가. 로그 화면은 주소창 기준으로 계약을 지키고 있고 export 는 그 경계 밖에 있다.

### B. Q2 — copy-all 캐리어 (config redirect 통과 14 + copy-all 20)

**알아야 할 것**

1. DB 메뉴 `modern_route` 가 선언하는 쿼리 키 전수(현재 실측: 쿼리로 갈리는 메뉴 11건). allowlist 에서 빠뜨리면 사이드바 활성 판정이 깨진다 — [active-menu.ts:74-76](../../frontend/src/lib/navigation/active-menu.ts) 이 그 제약이다.
2. 외부 도구(분석 태그·캠페인 파라미터)가 이 화면들에 키를 붙이는가.
3. 허브 탭 9건·경로정리 3건의 레거시 인바운드 링크가 실제로 쿼리를 달고 들어오는가. 확인 경로는 (a) DB 메뉴에 해당 source 경로가 쿼리와 함께 등록됐는지, (b) 리버스프록시 액세스 로그 표본.
4. 게시판 목록의 `router.push` 를 `router.replace` 로 바꿔 히스토리 누적을 끊는 것이 UX 상 허용되는가.

**왜 지금 정해야 하나**: 지금은 실을 것이 없어 무해하다. 그러나 민감한 파라미터가 URL 에 한 번 들어오면 **탭·페이지 클릭마다 보존·재발행된다.** 게시판 목록의 `?searchCnd=2&searchWrd=<사람 이름>` 이 실제로 그 경로이며, 그 화면만 `router.replace` 가 아니라 `router.push` 를 쓰므로 히스토리 항목이 계속 쌓인다.

### C. Q3 — DB 소유 쿼리 키 공간 (계산된 내비게이션 타깃 52)

**정할 것**: `modern_route`·`chk_url` 의 쿼리 키를 allowlist(예: `tab`·`bbsId` 만)로 제한할 것인가, 아니면 DB 값이라 저장소 판정 대상 밖으로 볼 것인가.

**판단의 축**: [internal-route.ts:9-10,68](../../frontend/src/lib/navigation/internal-route.ts) 의 `normalizeInternalRoute` 는 **결함이 아니라 문서화된 의도로** 쿼리를 보존해 반환한다("Query strings and fragments remain intact"). 즉 메뉴 행에 무엇이 들어가든 그대로 URL 이 된다. 현재 저장소 실측 범위에서는 `tab`(열거형)·`bbsId`(서버 발급)뿐이라 즉시 위험은 낮으나, **파생 제품(adopter)이 `modern_route` 를 자유롭게 바꾼다**는 점이 이 결정의 핵심이다.

**부수 결정**: 커버리지 0 인 21건을 개별 확인할 것인가, 아니면 detector 를 고쳐(조건식·삼항 타깃을 `<computed-target>` 상태 항목으로 기록) 재생성한 뒤 볼 것인가.

### D. Q4 — 죽은·미완결 표면 14건

| 대상 | 건수 | 정해야 할 것 | 알아야 할 것 |
|---|---|---|---|
| `expired` | 5 | 만료 안내를 구현할 것인가, 파라미터를 걷을 것인가 | 세션 만료로 튕긴 사용자에게 그 사실을 알려야 하는가. **현상 유지만은 선택지가 아니다** — 죽은 값이 남거나 안내가 영원히 안 뜨거나 둘 중 하나다. **제거 대상은 census 가 센 5곳이 아니라 7곳**(§4-E) |
| `[id]` 미소비 | 2 | 정적 라우트로 수렴할 것인가 | 라우트 형태 변경이라 disposition overlay([ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md) §Decision 4)의 route 별 owner PR 리뷰 경로를 타야 한다 |
| `nttId` | 2 | producer 2곳을 `pstSn=` 으로 바꿀 것인가, 소비자 폴백 폐지 시점은 | 순수한 canonical 이름 정합 문제. 개인정보·인가 위험 0 |
| 주소록·프로그램 `searchWrd` | 2 | 소비자 코드까지 걷을 것인가 | 없음 — 제거 비용 0 |
| `groupId` | 1 | 보존인가 소멸인가 | DEC-OPS-022 가 이 파라미터를 남긴 의도가 '외부 딥링크 계약 보존'인가 '이행 중 임시 보존'인가. 운영 DB `modern_route` 에 `groupId=` 참조가 있는지(읽기 전용 census 로 확인 가능) |
| 레거시 별칭 route | 1 | 별칭을 폐지할 것인가 | 운영 DB `modern_route` 에 해당 경로가 있는지. **시드 부재는 운영 부재의 증거가 아니다** — 메뉴는 런타임 편집 가능 |
| `pageNo` | 1 | producer 를 붙일 것인가, 소비자에서 걷을 것인가 | 이름 통일(`page`)은 기존 북마크를 깨는 공개 URL 계약 변경이라 keep/remove 축과 분리해 결정 |

#### Q4 진행 상황 — 2026-09-04 기준 14건 중 9건 종결

owner 위임(2026-08-23)에 따라 **잃는 동작이 없는 정리분**을 먼저 집행했다. 종결분은 아래 표에서
빠지지 않고 그대로 두되 상태를 표시한다 — 결정 이력이 사라지면 왜 그렇게 됐는지 추적할 수 없다.

| 대상 | 건수 | 상태 | 무엇을 했나 |
|---|---|---|---|
| `expired` | 5(실 producer 7) | **종결** | 걷어내지 않고 **소비했다**. 로그인 화면이 "세션이 만료되어 로그아웃되었습니다" 를 안내한다. `'true'` 정확 일치·`role="status"`·제출 오류 우선. 계약 5건, red 2건 실측 |
| `nttId` | 2 | **종결** | producer 2곳을 canonical `pstSn=` 으로 바꾸고, **클라이언트가 서버와 같은 키 공간을 읽게 했다**. ⚠ 단순 이름 정합이 아니라 **실제 결함**이었다 — 서버는 두 키를 받는데 클라이언트는 `pstSn` 만 읽어 `?nttId=` 진입 시 전 상호작용이 0번 글로 동작했다(화면이 "게시글 번호: 0", 수정 버튼이 0번 글로 이동, 댓글·만족도에 0 전달, 추천은 가드에 막혀 조용히 사망). 계약 4건, red 2건 실측 |
| 주소록·프로그램 `searchWrd` | 2 | **종결** | 소비자 코드까지 제거(사용자 지시, 2026-09-04) |
| `auth_error` | (§2.4 별건) | **종결** | 같은 dead-write 패턴이라 함께 처리했다. 권한 부족으로 되돌려진 사용자에게 루트 화면이 "접근 권한이 없어 홈으로 이동했습니다" 를 안내한다. **막힌 자원의 이름은 말하지 않는다**(계약이 고정). 계약 6건, red 3건 실측 |
| `[id]` 미소비 | 2 | **owner 대기** | 라우트 형태 변경이라 ADR-0007 §Decision 4 의 route 별 owner PR 리뷰 경로가 선행이다. 코드로 앞서갈 수 없다 |
| `groupId` | 1 | **증거 확보, owner 대기** | ⚠ **'죽은 표면' 이라는 전제가 틀렸다** — `/admin/system/common-code/page.tsx` 가 이 값으로 코드 그룹을 선택하고 상세를 필터하는 **동작하는 딥링크 소비자**다. 필요했던 외부 증거(운영 `modern_route` 에 `groupId=` 참조가 있는가)는 확보했다: **없다**(§4-K). 남은 것은 "외부 딥링크 계약으로 보존" 인지의 판정뿐 |
| 레거시 별칭 route | 1 | **증거 확보, owner 대기** | 필요했던 증거(운영 메뉴에 해당 경로가 있는가)는 §4-K 의 실측 범위에 들어온다 |
| `pageNo` | 1 | **owner 대기** | 이름 통일(`page`)은 공개 URL 계약 변경이라 별도 축이다 |

종결분은 전부 **소비처를 만드는 쪽**을 택했다. 셋 다 코드가 이미 이유를 URL 에 실어 보내는데
화면만 버리고 있었다 — 걷어내면 그 의도까지 지운다. 방향이 저장소의 기존 사례와 반대다:
[DEC-OPS-022](../../.agent/memory/decisions.md)·GAP-CMTY-001·GAP-CODE-001 은 **화면이 없는 일을
약속한** 것을 정정했고, 여기는 **아는 사실을 말하지 않은** 것을 고쳤다.

census 상 'producer 는 있는데 consumer 0' 인 URL 키는 이제 `<form-field-population>`(네이티브 GET
폼의 합성 마커, 필드 `q` 는 `/search` 가 실제로 소비) 하나뿐이다.

### E. 판정 단위 자체가 문제인 1건

`request-query-producer` 1건은 삭제·유지 판단이 아니라 **판정 단위를 어디에 둘지**의 문제다. 정하려면 '요청 URL(request-telemetry)'과 '주소창 URL(navigation)'을 같은 승인 기준으로 볼지 먼저 정해야 한다.

---

## 4. 예상 밖 사실

조사 중 드러난 것 중, **회의 전에 알고 있어야 결론이 달라지는 것**만 적는다.

### A. 전제의 정정 — `tb_web_log` 는 쿼리스트링을 저장하지 않는다

이 분류 과제의 출발 전제 중 하나는 "이 저장소는 `tb_web_log` 에 요청 URL 을 저장한다"였다. **절반만 맞다.**

- [OperationalAuditInterceptor.java:83](../../api-server/src/main/java/nuri/api/interceptor/OperationalAuditInterceptor.java) 이 쓰는 것은 `request.getRequestURI()` 로, 서블릿 규격상 **쿼리스트링을 제외한 경로**다.
- 같은 메서드 :84-86 이 `/api/` 로 시작하지 않는 요청을 early return 으로 버린다 → **Next.js 화면 URL 은 애초에 적재 대상이 아니다.**
- [WebAuditLogListener.java:80-82](../../business-core/src/main/java/nuri/business/service/log/WebAuditLogListener.java) 가 그 값을 그대로 `url` 컬럼에 넣는다.
- 백엔드 전체에서 `getQueryString()` 을 호출하는 곳은 [GlobalMenuAdvice.java:22](../../api-server/src/main/java/nuri/api/advice/GlobalMenuAdvice.java) 하나뿐이고 영속화하지 않는다(`build/` 아래 사본은 생성물).

**결과**: 이 census 대상 전체의 URL 잔존 위험은 "우리 DB 에 쌓인다"가 아니라 **"브라우저 히스토리·다운로드 관리자·공유 링크·저장소 밖 프록시 로그에 쌓인다"**로 다시 세워야 한다. 그대로 두면 검색어류의 위험을 실제보다 높게, export 축의 위험을 낮게 평가한다.

**남는 것**: 경로 세그먼트는 남는다 — 다만 화면 라우트가 아니라 그 화면이 호출한 API 경로다(예: `/api/v1/address-books/12`).

### B. 자유 입력 `searchKeyword` 가 census 에 한 번도 등장하지 않는다

216개 state item 전체에 `searchKeyword` 도 `searchKeywordFrom` 도 없다. 이유는 두 단계다.

1. 이름을 짓는 [full-result-export.ts](../../frontend/src/app/components/patterns/full-result-export.ts) 는 URL API 를 직접 만지지 않고 평범한 객체를 넘기기만 해서 **census record 가 0건**이다.
2. 그 객체를 받는 [full-result-download.ts:36](../../frontend/src/lib/navigation/full-result-download.ts) 은 변수 key 로 `append` 하므로 `<computed>` 로만 남는다.

그런데 그 값은 `window.location.assign` 으로 **최상위 브라우저 내비게이션 URL** 에 실리고, 소비 화면 5개 중 하나가 **개인정보 접근 로그**다. 노출면은 브라우저 다운로드 관리자(원본 URL 보관) · same-origin Referer(전체 URL) · 앞단 프록시 로그다.

**이것이 "빈 `stateItems` 가 안전을 뜻하지 않는다"의 가장 선명한 사례다.**

### C. 저장소가 자기 규칙을 한쪽에서만 지킨다

로그 5화면은 "검색어에 사번·이름이 실릴 수 있어 URL 에 넣지 않는다"를 **주석 계약으로 명문화**했다([use-log-url-state.ts:13-15](../../frontend/src/app/admin/system/logs/use-log-url-state.ts)). 같은 화면의 '전체 결과 내보내기'는 그 검색어를 최상위 내비게이션 쿼리로 내보낸다. **같은 값이 화면 상태로는 금지, export 로는 통과다.**

### D. census 가 상태를 못 읽은 56건은 "상태 없음"이 아니다

`stateless` 부류 180건 중 **56건은 detector 의 구조적 한계로 빈 `stateItems` 가 됐다.** 원인은 [ui-url-state-census.mjs:337-348](../../scripts/ui-url-state-census.mjs)·[:418-425](../../scripts/ui-url-state-census.mjs) 이며, 그중 21건은 같은 파일에 상태를 담은 형제 record 조차 없어 **커버리지가 0** 이다.

**회의에서 "stateless 180건은 상태가 없으니 일괄 종결"로 처리하면 안 된다.** 안전하게 일괄 종결 가능한 것은 124건이다.

### E. `expired` 는 완전한 dead write 이고 census 는 그 표면을 과소 계상한다

- 생산자 7곳(`page.tsx` 5 + [client.ts:208](../../frontend/src/lib/api/client.ts) + [session-expiry-warning.tsx:107](../../frontend/src/app/components/ui/session-expiry-warning.tsx)), **소비자 0곳**(`frontend/src` 전수 grep 에서 `get('expired')` 0건).
- census 는 5건으로 센다 — `client.ts` 는 템플릿 문자열이라 `<computed>` 로, `session-expiry-warning.tsx` 는 `<raw-url-or-component>` 로 분류돼 이름 기준 매칭에서 빠졌다.
- **owner 가 '제거'를 택하면 대상은 5곳이 아니라 7곳이다.** census 숫자만 보고 작업하면 2곳이 남는다.

### F. 검증기가 오히려 census 신호보다 강하다 — `resolveInternalRedirect`

census 는 `redirect` 에 `raw-login-intent-signal` 위험 신호를 붙였지만, 실제 검증기는 **query·fragment 를 잘라낸다**([LoginClient.tsx:47,55](../../frontend/src/app/login/LoginClient.tsx)). `/admin/work-hub?tab=my#pending` 이 `/admin/work-hub` 로 수렴하는 것이 테스트로 동결돼 있다. 즉 원 화면의 record locator·검색어가 인증 경계를 넘어 재전파되는 경로가 **구조적으로 막혀 있다.** 부작용이 아니라 설계다.

다만 같은 목적의 세 구현이 비대칭이다 — `proxy.ts:417`·`client.ts:208` 은 `pathname` 만 쓰고 [admin/error.tsx:58](../../frontend/src/app/admin/error.tsx) 만 `location.search` 를 함께 접어 넣는다. 좁은 쪽이 이미 존재하므로 넓은 쪽을 맞추는 것이 최소 변경이다.

### G. `tab` 이 전부 순수 표현은 아니다

`/admin/operation/memo-reports?tab=ALL` 은 타인의 메모보고 전체를 여는 **권한 결속 데이터 범위**다. 위조로 권한이 넓어지지는 않는다 — 서버가 `@PreAuthorize("hasRole('ADMIN')")` 로 집행하고([MemoReportApiController.java:33-34](../../api-server/src/main/java/nuri/api/controller/business/memoreport/MemoReportApiController.java)) 클라이언트도 표시·요청·축퇴 3중으로 막는다. 그래도 **"tab = 비민감"이라는 일반화를 그대로 승인문에 쓰면 이 사례가 예외로 남는다.**

### H. 표현 상태는 재로그인 후 복원되지 않는다

`admin/error.tsx:58` 이 401 시 `pathname + search` 를 통째로 실어 보내지만 `LoginClient.tsx:47` 이 `parsed.pathname` 만 남기고 쿼리를 버린다. 보안 판단으로는 옳다(census 의 `query-fragment-in-login-intent` 부정 케이스가 요구하는 동작). 다만 결과적으로 **'공유·복원'이라는 keep 근거가 세션 만료 경로에서는 적용되지 않는다** — owner 가 그것을 알고 승인하는 편이 낫다.

### I. 부수 결함 3건 (URL-state 결정과 무관하나 회의에서 언급 가치가 있다)

1. **달력 버튼이 필터를 덮어쓴다** — [BoardListClient.tsx:216-227](../../frontend/src/app/admin/community/boards/select-board-list/BoardListClient.tsx) 의 이전/다음 달 버튼이 둘 다 `startDate` 를 설정한다. '보기 위치' 조작이 '조회 조건'을 조용히 바꿔 목록 결과가 달라진다. 한 파라미터가 두 의미를 겸한다.
2. **`IsmClient.tsx:303` 의 `<form>` 은 `onSubmit` 이 아예 없다** — 지금 안전한 유일한 이유는 내부 컨트롤이 `<textarea>` 하나뿐이라 Enter 가 암묵적 제출을 일으키지 않는다는 것이다. `<input>` 하나나 제출 버튼 하나를 추가하면 그 순간 조용히 네이티브 GET 폼이 되어 모든 필드가 URL 로 나간다.
3. **존재 여부가 응답 코드로 갈린다** — 소유자 가드는 403, 미존재는 404 라 남의 비밀글·주소록·스크랩에 대해 '존재하지만 내 것이 아님'과 '없음'이 구분된다. 열거 오라클이지만 값이 URL 에 있어서 생긴 문제가 아니라 오류 처리 정책 문제다.

### J. `PD-UX-002` 의 record 수가 현재 census 와 다르다

[pending-decisions.md](../04-operations/pending-decisions.md) 의 PD-UX-002 는 "URL-state census **523 record**"라 적었으나 현재 census 는 **377 record**다(census `asOf: 2026-08-21`, PD 본문 기준일은 2026-08-20). 분류 대상 규모가 회의 안건에 그대로 실리므로 **PD 행의 수치를 현행 census 로 정정하는 것이 회의 준비의 일부**다. 이 초안은 그 파일을 수정하지 않는다.

### K. 운영(OCI) DB 실측으로 Q3·Q4 의 외부 입력 일부가 확보됐다

§5.2 의 4단계("운영 DB `modern_route`·`chk_url` 의 쿼리 키 전수")는 초안 작성 시점에 접속 변수가
없어 미실행으로 남겼으나, **2026-09-04 운영 OCI 인스턴스에 읽기 전용으로 접속해 수행했다**
(`db-bridge` 허용 SELECT 범위. 값·자격은 기록하지 않는다).

| 측정 | 값 |
|---|---|
| `tb_menu_info` 행 | 84 |
| `modern_route` 보유 | 70 (미보유 14 — **전부 `prgrm_file_nm='dir'` 폴더**) |
| `modern_route` 에 쿼리 보유 | 12 |
| distinct 쿼리 키 | **`tab` 1종** (값 12개 전부 열거형) |
| `tb_prgrm_lst.url` 행 | 18 (레거시 `.do` **0건**, API 패턴 16, 와일드카드 11) |

이 실측이 답하는 것 셋.

1. **Q3 의 배포 안전** — 저장 시점 형식 제약(`MenuDto.modernRoute` 의 `@Pattern`)에 운영 70행을
   전부 넣어 **불통과 0** 을 확인했다. 즉 이 제약으로 편집이 막히는 기존 메뉴가 없다.
2. **Q4 `groupId`** — 운영 메뉴 어느 행도 `groupId=` 를 싣지 않는다(쿼리 키가 `tab` 뿐).
   따라서 "메뉴가 만드는 딥링크" 라는 보존 사유는 성립하지 않는다. 남은 보존 사유는
   외부 북마크·타 시스템 링크뿐이며, 그것은 저장소도 DB 도 답할 수 없다.
3. **Q4 레거시 별칭 route** — 시드에만 있고 운영에는 없는지를 이 범위에서 판정할 수 있다.

⚠ **이 실측이 답하지 않는 것**: 메뉴는 런타임 편집 가능하므로 이 값은 **측정 시점의 사실**이다.
파생 제품(adopter)의 DB 는 다르다. 그래서 Q3 의 결론은 "지금 안전하니 제약이 불필요하다" 가
아니라 "제약을 지금 넣어도 아무도 막히지 않는다" 다 — 제약의 존재 이유는 미래의 자유 입력이다.

⚠ 같은 접속에서 확인한 부수 사실: 로컬 5432 의 `sr-db` 는 **다른 프로젝트**(`D:\project\sr`,
`sr_db`)이며 이 저장소와 무관하다. 건드리지 않았다.

---

## 5. 다음 단계

### 5.1 이 초안이 하지 못하는 것 — 2026-10-31 만료는 풀리지 않는다

**초안 작성만으로는 만료가 해소되지 않는다.** 근거는 계약 코드다.

- [ui-url-state-census.mjs:1107-1109](../../scripts/ui-url-state-census.mjs) 가 **실시간 시계**로 `reviewBy` 를 검사한다: 만료 시 `review horizon expired on <날짜> — 재검토를 완료하거나, 사유와 함께 DEFAULT_REVIEW_BY 를 연장하고 --write 로 재생성하세요`.
- 377 record 전부의 `reviewBy` 가 `2026-10-31`(`DEFAULT_REVIEW_BY`, :39)이다 → **2026-11-01 부터 required `secret-scan` 이 red 가 된다.**
- 만료 해소 경로는 계약이 **딱 두 개**로 못박았다: **(가) 실제 재검토 완료** 또는 **(나) 사유를 남긴 명시적 기한 연장 커밋 + `--write` 재생성.** 문서를 쓰는 것은 둘 중 어느 쪽도 아니다.
- 이 일괄 만료는 사고가 아니라 [DEC-OPS-027](../../.agent/memory/decisions.md) 이 **의도된 강제 재검토 지점**으로 남긴 것이다.

### 5.2 남은 순서

| 단계 | 내용 | 선행 조건 |
|---|---|---|
| 1 | **owner 승인 회의 개최** — §1 의 Q1~Q5 를 안건으로 | 이 초안(완료) · PD-UX-002 record 수 정정(§4-J) |
| 2 | ~~회의에서 **Q4(죽은 표면 14건)를 먼저 처리**~~ → **9건 집행 완료**(2026-09-04, §3-D 진행 상황). 남은 5건은 라우트 형태 변경·공개 URL 계약이라 owner 판단이 선행이다 | 없음 |
| 3 | **Q1·Q2 의 외부 입력 확보** — 운영 리버스프록시·WAF·CDN 의 쿼리스트링 로깅 여부와 보존 기간 | 운영자만 답할 수 있다. **저장소로는 확인 불가**(census `limitations` 3번) |
| 4 | ~~**Q3·Q4 의 외부 입력 확보**~~ → **완료**(2026-09-04, §4-K). 운영 OCI 에 읽기 전용 접속해 `modern_route` 70행·`tb_prgrm_lst.url` 18행을 전수 측정했다 | ~~접속 변수 부재~~ 해소 |
| 5 | 승인된 항목에 대해 census 를 **`--write` 로 재생성**하고 `dataClass`·`approvalStatus` 를 사람이 결정한 값으로 갱신 | 계약이 요구하는 형태 확인 선행 — **수기 편집 금지**([DEC-OPS-019](../../.agent/memory/decisions.md)) |
| 6 | 승인하지 못한 나머지의 `reviewBy` 처분 | 아래 5.3 |

### 5.3 2026-10-31 까지 결정이 없으면

**기한 연장이 유일한 선택지다.** 그리고 연장은 계약상 "사유와 함께"여야 한다 — 사유 없는 `DEFAULT_REVIEW_BY` 인상은 [AGENTS.md Evidence guardrails H2](../../AGENTS.md)(동결 baseline 을 비우거나 예외를 늘려 red 를 없애지 않는다)에 정면으로 걸린다.

연장을 하게 된다면 커밋에 다음이 함께 있어야 한다.

1. 무엇이 막혀 연장하는가 — §3 의 외부 입력(프록시 로그 정책 · 운영 DB 메뉴 census) 중 무엇이 미확보인지.
2. 새 기한을 그 날짜로 잡은 근거 — 막힌 입력의 확보 예상 시점.
3. 부분 승인이 있었다면 그 범위 — **전체를 미루는 것과 남은 것만 미루는 것은 다르다.**

> 회의가 §1 의 다섯 질문 중 일부만 답해도 **부분 승인은 유효하다.** Q4(14건)와 표현 상태 80건은 다른 답을 기다리지 않고 닫을 수 있고, 그만큼 연장 대상이 줄어든다.
