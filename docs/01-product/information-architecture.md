# 정보구조·URL·민감 상태 의사결정 패키지

- **Status:** Provisional direction selected — [ADR-0004](../02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md); exact IA·`PD-UX-001/002`·G1은 `blocked-input`
- **Document owner:** product/UX — 담당자 미지정
- **Decision owners:** `PD-UX-001` product/IA owner, `PD-UX-002` security/privacy owner — 담당자 미지정
- **Global URL follow-up:** 기존 `PD-UX-002`는 로그 검색 범위이므로 전역 locator·redirect·login intent 계약은 별도 결정이 필요함
- **Required reviewers:** domain owners, frontend architecture, accessibility, DB/menu operator — 담당자 미지정
- **Route evidence reviewBy:** 2026-10-31 — 현재 route manifest의 bounded exception 기한
- **Decision reviewBy:** 미정 — 제품 소유자와 대상 배포 맥락이 지정될 때 정한다
- **Last evidence review:** 2026-08-21

> 이 문서는 승인자가 판단할 수 있는 선택지·권고안·연구·검증·rollback 계약을 제공한다. [ADR-0004](../02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md)는 하이브리드를 prototype/research의 잠정 방향으로만 채택했다. 목표 메뉴 트리, 실제 사용자 선호, live 메뉴 중복·고아 수, route disposition, URL 개인정보 정책이 승인됐다는 기록이 아니며, 이 문서와 ADR-0004만으로 [pending decisions](../04-operations/pending-decisions.md)의 `PD-UX-001/002` 상태나 G1을 바꾸지 않는다.

> **Scope guard:** `PD-UX-002`의 현재 registry 문구는 “로그 검색 조건”에 한정된다. 이 문서가 발견한 전역 route query, dynamic locator, redirect, login intent 위험은 그 좁은 승인을 빌려 닫지 않는다. 최적안은 로그 결정은 `PD-UX-002`로 유지하고, 전역 계약은 제품 소유자가 별도 pending decision(후보 ID `PD-UX-003`)을 실제 등록·승인하는 것이다. 이 문서는 해당 ID를 생성하거나 승인하지 않는다.

## 1. 결론부터: 권고안과 현재 차단선

### 1.1 최적 권고안

**과업 중심 기본 내비게이션 + 명시적인 관리 센터를 결합한 하이브리드 IA**를 prototype, card sort와 tree test의 잠정 방향으로 채택한다. 이 범위는 ADR-0004가 정본이며 최종 제품 IA 승인이 아니다.

1. 일반 사용자의 기본 탐색은 `나의 업무`, `소통·지식`, `참여`처럼 사용자가 얻으려는 결과를 중심으로 구성한다.
2. 사람·권한·콘텐츠 운영·시스템 설정·감사처럼 권한과 실패 비용이 높은 기능은 `관리 센터` 아래에 명시적으로 격리한다.
3. 첫 이행에서는 기존 URL을 유지한다. URL과 메뉴의 `label`, `group`, `order`, `visibility`를 분리해 IA 검증 결과를 적용한다.
4. alias는 북마크·외부 딥링크 호환용으로만 유지하고 메뉴·검색·breadcrumb는 canonical terminal route를 가리킨다.
5. URL 상태는 **비민감 + 공유 가치 + 새로고침 복원 가치**를 모두 만족하는 화면별 allowlist만 허용한다. 기본 허용 후보는 유한 enum인 탭/카테고리와 유효 범위가 제한된 페이지 번호뿐이다.
6. 개인정보, IP, 자유 검색어, 로그·설문 응답, 사용자·조직·사건·레코드 식별자는 URL과 analytics에서 금지한다. 현재 동적 `[id]` 경로는 이 원칙의 자동 승인 예외가 아니라 별도 검토 대상이다.
7. open card sort로 사용자 용어를 찾고, closed sort와 role-filtered tree test로 제안 구조를 검증한 뒤에만 목표 트리를 확정한다.

이 안은 현재 경로를 일괄 개명하는 안보다 rollback이 쉽고, 역할별 포털을 완전히 분리하는 안보다 교차 역할 과업의 단절이 적다. 잠정 방향 선택은 완료됐지만 exact label/tree/role/route disposition의 승인 결과는 아니다.

### 1.2 지금 안전하게 확정할 수 없는 것

- 2026-08-21 live test target의 read-only 구조 census에서 메뉴 88건·활성 77건·숨김 11건, broken 0건, 중복 route group 9건, 부모/자식 동일 route 5건, orphan route 41건을 관측했다. 별도 authority aggregate에서 `ROLE_ADMIN`은 활성 메뉴 77건/배정 사용자 1명, `ROLE_USER`는 33건/23명, `ROLE_ANONYMOUS`와 `ROLE_SYSTEM`은 각 0건으로 관측됐다. endpoint·사용자 식별자·credential은 보존하지 않았다. 이 값은 release SHA에 결속된 synthetic sample-user effective-menu artifact가 아니므로 G1 승인 증거로 승격하지 않는다.
- [route capability manifest](../../config/ui-route-capabilities.json)의 119개 구현 경로 모두 `roles=["UNVERIFIED"]`, `menuExposure="unverified"`, `decisionSafe=false`다.
- 실제 사용자, top-task 빈도, 기관별 역할·용어·지원 디바이스와 연구 결과가 없다.
- 따라서 위 live 구조·authority aggregate는 예비 입력으로만 사용하며, “사용자가 이 구조를 선호한다” 또는 “G1 통과”라고 쓰지 않는다.

### 1.3 현재 허용되는 일과 금지되는 일

| 허용 | 승인 전 금지 |
|---|---|
| route·redirect·proxy·capability evidence 재계측 | 메뉴 DB/Flyway 변경 또는 실행 가능한 메뉴 SQL 생성 |
| live read-only menu 구조 census 재시도와 authority/effective-menu census 설계 | generator가 menu parent/order/role을 추론하도록 변경 |
| 연구 모집·스크립트·synthetic task 준비 | route 일괄 개명·삭제·redirect sunset |
| ADR-0004 범위의 제안 트리 prototype과 card-sort/tree-test | `PD-UX-001/002` 상태 변경, full overlay acceptance 또는 final IA ADR 생성 |
| 명백한 개인정보 누출 결함의 별도 보안 수정 | 승인되지 않은 analytics·세션 녹화 도입 |

## 2. 근거 계층과 용어

### 2.1 이번 결정의 정본

| 판단 대상 | 정본 | 이 문서의 사용법 |
|---|---|---|
| 구현 route 모집단·route kind·effective target | [ui-route-capabilities.json](../../config/ui-route-capabilities.json) | 119행을 이 문서에 복제하지 않고 exact population으로 참조한다. |
| route census 생성·검증 의미 | [route contract](../../scripts/ui-route-capabilities-contract.mjs), [contract test](../../scripts/ui-route-capabilities-contract.test.mjs) | filesystem, proxy, redirect, profile 관측이 무너지면 manifest를 신뢰하지 않는다. |
| UI shell 입장 경계 | [proxy.ts](../../frontend/src/proxy.ts) | `sourceShellAccess`와 `shellAccess`를 계산한다. 도메인 권한의 증거로 승격하지 않는다. |
| config redirect | [next.config.ts](../../frontend/next.config.ts) | source, target, permanent와 query target을 확인한다. |
| live 메뉴 구조 | [menu-census.mjs](../../scripts/menu-census.mjs) + live `tb_menu_info` | 현재 도구는 구조 예비 진단용이다. 자체 route collector 대신 manifest와 다시 join해야 한다. |
| authority-menu assignment | live `tb_menu_crt_dtl`을 읽는 별도 assignment census | JWT coarse role 또는 실제 사용자 노출과 동일시하지 않는다. |
| effective 사용자 메뉴 | 사용자-authority 매핑과 실제 menu service projection + route manifest | 현재 구현·실행 artifact가 없다. migration이나 authority row만으로 대체하지 않는다. |
| 제품·연구 범위 | [UI/UX modernization brief](ui-ux-modernization-brief.md) | adopter와 end user, top-task 가설, 개인정보 연구 경계를 상속한다. |
| 상태·URL 규범 | [frontend UX constitution](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md), [ADR-0003](../02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md) | 비민감 allowlist, 과업·증거 우선, 접근성·진실성의 상위 원칙이다. |
| 잠정 방향·보류 결정 | [ADR-0004](../02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md), [pending-decisions.md](../04-operations/pending-decisions.md) | ADR-0004는 검증 방향만 선택한다. exact route/menu 승인 근거와 별도 final acceptance 전에는 `PD-UX-001/002`를 닫지 않는다. |

### 2.2 필드를 혼동하지 않는 읽기 규칙

| 개념 | manifest 필드/파생 | 의미 | 의미하지 않는 것 |
|---|---|---|---|
| implementation route | `route` | `frontend/src/app/**/page.*`에서 발견한 구현 entry | 독립 메뉴, live 기능, 사용자 top task |
| route kind | `routing.kind` | `page`, `page-redirect`, `config-redirect` | page 파일 존재만으로 사용자가 그 page를 렌더한다는 뜻 |
| canonical/effective target | `page`이면 자신의 `route`, redirect면 `routing.target` | 사용자가 최종 도달해야 할 주소와 query | 메뉴 DB가 이미 그 target을 쓴다는 뜻 |
| source shell access | `sourceShellAccess` | source path만 proxy에 대입한 입장 분류 | redirect 이후 권한 |
| effective shell access | `shellAccess` | terminal target을 반영한 UI shell 입장 분류 | API·객체·action 권한 |
| capability role | `roles`, `capabilities[].actorScope` | 도메인 증거로 확인해야 하는 수행 주체 | proxy 통과 역할을 그대로 복사한 값 |
| 기능 진실 상태 | route `status`, capability별 `status` | `live/partial/demo/unavailable/unverified`와 세부 action 상태 | 화면이 예쁘거나 API 문자열이 있다는 사실만으로 `live` |
| 메뉴 노출 | `menuExposure` + authority assignment + effective sample-user menu artifact | 현재 역할/authority별 탐색 노출 | `tb_menu_info` 구조, `tb_menu_crt_dtl` row, proxy role 중 하나만으로 확인된 노출 |
| 프로필 | `profileOwners`, `directProjectionProfiles` | 전자는 의미 소유권, 후자는 direct removePaths 관측 | 직접 projection이 positive ownership이라는 뜻 |

`shellAccess`는 첫 번째 UI 문을 설명할 뿐이다. 실제 기능 권한은 백엔드 URL 인가, 도메인 action, 객체 소유권을 함께 검증해야 한다. 메뉴 visibility도 보안 경계가 아니며 숨김은 접근 거부를 대체할 수 없다.

## 3. 2026-08-21 현재 route·alias census

### 3.1 exact population

| 항목 | 현재 수 | 해석 |
|---|---:|---|
| filesystem implementation route entry | 119 | 승인 시 disposition이 정확히 한 번씩 있어야 하는 모집단 |
| 직접 렌더 `page` | 101 | canonical 후보이지만 capability와 메뉴는 별도 검토 |
| `page-redirect` | 5 | page 구현 자체가 다른 주소로 이동 |
| filesystem route를 가리는 `config-redirect` | 13 | page entry는 census에 있지만 effective 동작은 redirect |
| page가 없는 redirect-only external alias | 2 | 119 모집단 밖 호환 source; 별도로 존속·sunset 검토 |
| source shell access | public 1 / authenticated 49 / admin-system 69 | source 주소 기준 |
| effective shell access | public 1 / authenticated 48 / admin-system 70 | `/cop/sms/selectSmsList`가 admin target으로 이동해 1건 변경 |
| route 상태 | partial 9 / unavailable 2 / unverified 108 | `live`로 확정된 route는 0 |
| role·menu exposure·decision safety | 119/119 roles `UNVERIFIED`; 119/119 menu `unverified`; 119/119 `decisionSafe=false` | IA 승인 입력이 아직 완결되지 않음 |

따라서 `119 routes`를 `119 screens`, `119 menu items` 또는 `119 supported features`라고 부르면 안 된다. 사용자가 입력할 수 있는 source 주소는 구현 route 119개에 page-less alias 2개가 더 있지만, redirect source는 독립 화면이 아니다.

### 3.2 namespace 분포는 제품 구조가 아니라 현재 코드의 위치다

| 현재 namespace | route 수 | 관찰 |
|---|---:|---|
| `/admin` 전체 | 94 | 그중 effective authenticated shell이 25개라 경로 이름과 사용자 역할 의미가 충돌할 수 있다. |
| `/admin/system` | 23 | 로그·메뉴·코드·모니터링·정책 등 서로 다른 top task가 한 기술 namespace에 모여 있다. |
| `/admin/survey` | 13 | hub와 query-tab alias, 별도 manage child, poll 기능이 혼재한다. |
| `/admin/community` | 12 | 일반 사용자 게시·조회와 관리자 master/maker/template가 같은 prefix를 공유한다. |
| `/admin/collaboration` | 11 | 일반 인증 사용자에게 열린 주소록·메일·스크랩 흐름이다. |
| 기타 `/admin/*` | 35 | 운영·보안·통계·사용자·워크플로·도움말 등이 분산돼 있다. |
| 비-`/admin` route | 25 | login, approvals, note, search, survey, smart-toolkit, legacy `/cop` 등을 포함한다. |

이 숫자는 메뉴 priority나 사용 빈도를 말하지 않는다. 특히 `/admin` prefix 아래 일반 사용자 과업이 있다는 사실은 현재 proxy 정책의 관측이며, 그 기능이 관리자 전용이어야 한다거나 일반 사용자에게 안전하다는 결론이 아니다.

### 3.3 effective authenticated인 `/admin` 경로의 위험

현재 proxy는 다음 5개 prefix를 일반 인증 사용자에게 열고, community의 3개 관리자 하위 경로만 다시 차단한다.

- `/admin/work-hub`
- `/admin/collaboration`
- `/admin/help`
- `/admin/community` — `boards/master`, `boards/maker`, `templates`는 admin-only 예외
- `/admin/survey/polls/participate`

manifest 기준으로 이 규칙에 걸리는 effective route entry는 25개다. 위험은 두 방향이다.

1. **과소 노출 위험:** 사용자는 `/admin`이라는 내부 명명 때문에 자기 업무 기능을 관리자 기능으로 오해하거나 메뉴에서 찾지 못할 수 있다.
2. **과다 노출 위험:** prefix가 넓어 새 child route가 추가되면 명시적 검토 없이 USER shell에 들어올 수 있다. backend가 막더라도 403 화면·민감 label·dead action이 노출될 수 있다.

따라서 IA 연구에서는 URL 문자열을 카드 label로 보여 주지 않고 과업·결과 용어를 사용한다. 구현 검토에서는 25개를 capability와 API 단위로 전수 확인하고, 단순히 `/admin`을 제거하거나 proxy allowlist를 넓히지 않는다.

### 3.4 alias 수렴 구조

| alias 군 | 현재 source 수 | canonical/effective target | 주의점 |
|---|---:|---|---|
| survey hub | 7 | `/admin/survey/hub` + route별 `tab` | `items`와 `questions`가 같은 tab으로 수렴한다. alias를 메뉴 node로 중복 노출하지 않는다. |
| monitoring hub | 5 | `/admin/system/monitoring/hub` + `tab` | observability, security/system audit, login policy label이 한 hub로 수렴한다. tab 권한·용어를 따로 검증한다. |
| workflow | 1 | `/admin/workflow` | source와 target 모두 현재 `decisionSafe=false`; alias가 기능 완성을 뜻하지 않는다. |
| SMS | 1 | `/admin/uss/ion/sms` | source는 authenticated, effective target은 admin-system이다. source 기준 메뉴 노출은 권한 혼동을 만든다. |
| address book | 1 | `/admin/collaboration/address-book/select-address-book-list` | index alias이며 canonical label은 사용자 용어로 별도 결정한다. |
| smart-toolkit legacy verbs | 3 | 목록·생성·상세 canonical route | 동적 `[id]` 보존과 안전한 encoding을 실행 검증해야 한다. |
| board camelCase external alias | 2 | kebab-case board route | page-less permanent 호환 alias다. 119 route disposition과 별도 항목으로 검토한다. |

source가 여럿이라는 사실은 live 메뉴 중복의 증거가 아니다. 메뉴 중복·부모/자식 동일 경로·broken menu·고아 route·숨김 menu는 live census가 성공한 뒤에만 수치화한다.

### 3.5 live menu 예비 실측과 아직 `unknown`인 경계

[menu-census.mjs](../../scripts/menu-census.mjs)는 read-only DB의 `tb_menu_info`에서 활성·숨김 메뉴를 읽고, 자체 수집한 route와 결합해 broken, duplicate, parent-child-same, orphan, sub-route를 구분한다. 2026-08-21 live test target에서 이 예비 구조 census와 별도 authority aggregate를 실행해 1.2절의 bounded count를 확인했다. 다만 DB deployment release SHA, synthetic sample-user의 실제 menu service projection, authority inheritance와 role별 route disposition을 같은 artifact로 결속하지 못했으므로 manifest의 `menuSnapshot.status`와 G1은 계속 `blocked-external`이다.

도구가 성공하더라도 곧바로 G1 증거가 되지 않는다.

- 기본 `menu-census.mjs` 자체는 `tb_menu_crt_dtl`을 읽지 않는다. 이번 별도 read-only aggregate는 authority별 활성 메뉴·배정 사용자 수만 측정했으며 exact assignment와 effective menu artifact를 보존하지 않았다.
- 자체 route collector는 `page.ts/tsx` 중심이며 119-route 계약의 모든 확장자·config redirect·effective target·충돌 방어를 소유하지 않는다.
- JSON의 `measuredAt`은 현재 `null`이라 실행 시각·release provenance를 자체 증명하지 않는다.
- manifest의 `menuSnapshot.source` 문구는 실행 증거가 아니라 metadata다. 실제 script가 읽는 source와 다르면 계약이 red여야 하며, 구조 census 문구를 authority/role evidence로 승격하지 않는다.

따라서 현재 스크립트 결과는 **live menu 구조의 예비 입력**으로만 쓴다. G1 전에는 authority assignment와 effective 사용자 메뉴 artifact가 별도로 필요하다.

1. live `information_schema`로 `tb_menu_info`와 `tb_menu_crt_dtl`의 실제 컬럼·키를 먼저 확인한다.
2. read-only query로 활성/숨김, parent/order/label/source route와 authority-menu assignment를 최소 필드로 수집한다.
3. DB authority code를 proxy JWT coarse role과 자동 등치하지 않는다. 현재 runtime menu repository가 사용자별 authority mapping으로 menu를 projection하므로 authority inheritance·다중 authority·scalar subquery 의미를 live schema와 service 실행으로 확인한다.
4. 승인된 synthetic sample user별 실제 menu service 결과를 수집하되 사용자 식별자는 artifact에서 제거한다.
5. route 모집단과 redirect 의미는 자체 collector가 아니라 exact [route manifest](../../config/ui-route-capabilities.json)를 사용한다.
6. proxy shell class, DB authority assignment, effective sample-user menu, backend capability/owner scope를 별도 열로 유지한 join을 만든다.
7. 실행 시각, release SHA, DB 환경 식별자, query/tool version, row count와 artifact hash를 기록한다.
8. raw DB dump, 실제 사용자 식별자, 비밀을 보존하지 않는다.

- migration 주석, seed, 과거 보고서 수치는 현재 메뉴가 아니다.
- 정적 route에 메뉴 조상이 없다고 해서 곧 삭제 대상은 아니다. command palette, notification link, 외부 deep link, cross-role handoff가 있을 수 있다.
- 메뉴가 있다고 capability가 live이거나 해당 역할에 허용된다는 뜻도 아니다.

예비 구조 census 재시도 명령은 저장소 루트에서 `node scripts/menu-census.mjs --json`이다. 실패 출력에 접속 정보나 비밀이 섞이지 않았는지 확인한다. 성공 결과도 authority assignment·effective sample-user artifact와 manifest join 전에는 승인 근거로 승격하지 않는다.

## 4. role × top task × current route matrix

아래 과업은 [제품 brief](ui-ux-modernization-brief.md)의 조사 후보를 route evidence에 연결한 것이다. priority나 사용 빈도가 확정됐다는 뜻은 아니다. `현재 shell`은 UI 입장 분류이고 `capability role`을 대신하지 않는다.

| 가설 역할 | top-task 후보/완료 결과 | 현재 route 후보 | 현재 shell 관측 | 현재 한계와 연구 질문 |
|---|---|---|---|---|
| 익명 사용자 | 로그인 후 안전한 원래 시작점 도달 | `/login` → `/` 또는 허용된 내부 목적지 | public → authenticated/admin-system | `redirect`가 안전한 canonical 목적지만 담는지, 오류·재인증 후 입력과 초점이 복원되는지 검증한다. |
| 일반 인증 사용자 | 오늘의 업무·보고·일정을 확인하고 다음 action 수행 | `/`, `/admin/work-hub`, `/smart-toolkit/dept-job`, `/smart-toolkit/schedule`, `/smart-toolkit/work-report` | authenticated | route role과 live action은 대부분 미검증이다. 실제 첫 과업과 “업무” 용어를 조사한다. |
| 일반 인증 사용자 | 쪽지·주소록·메일·스크랩으로 협업 결과 전달 | `/note`, `/admin/collaboration/*` | authenticated | `/admin` 명명과 기능 label의 발견 가능성, owner-only action과 privacy를 검증한다. |
| 일반 인증 사용자/관리자 | 역할에 맞는 메뉴·게시글·사용자를 통합 검색 | `/search`와 role-filtered command search | authenticated | route는 partial이다. USER 사용자 검색은 admin API 403로 unavailable, menu shortcut은 demo, article search는 unavailable이며 `q`가 URL에 있다. 실패≠0건, role별 source와 label/count 비노출을 검증한다. |
| 콘텐츠 작성자/독자 | 게시글 게시·조회·댓글 또는 커뮤니티 이동 | `/admin/community/*`, `/cop/cmy/*` | 대부분 authenticated | board 운영 기능과 사용자 게시 흐름이 같은 prefix에 있다. 역할별 tree를 분리해 시험한다. |
| 설문 응답자 | 참여 가능한 설문을 찾아 응답·제출 결과 확인 | `/admin/survey/polls/participate`, `/survey`, `/survey/[id]`, `/survey/response/*` | authenticated | 응답·record ID URL 노출, 제출 후 back/refresh 중복, 결과 공개 범위를 확인한다. |
| 업무 사용자/승인자 | 요청 작성→승인/반려→상태 확인 | `/approvals`, `/approvals/draft` | authenticated | 두 route 모두 현재 route 상태가 partial이다. 지원 action과 역할별 다음 단계를 먼저 확인한다. |
| 사용자 관리자 | 사용자를 찾고 상태·조직·권한을 안전하게 변경 | `/admin/user/manage`, `/admin/user/departments`, `/admin/user/absences`, `/admin/security/*` | admin-system | 사람 관리와 RBAC가 여러 group에 분산됐다. 고위험 mutation은 대상·결과·rollback task로 시험한다. |
| 콘텐츠/참여 관리자 | 게시판·템플릿·설문을 만들고 공개 범위 확인 | `/admin/community/boards/master`, `/admin/community/boards/maker`, `/admin/community/templates`, `/admin/survey/hub`, `/admin/survey/manage/*` | admin-system | hub alias와 child route의 label·현재 위치·back contract를 검증한다. |
| 감사·개인정보 담당 | synthetic 사건을 최소 조건으로 찾아 근거 확인 | `/admin/system/logs`, `/admin/system/logs/{system,login,user,web,privacy}` | admin-system | 현재 URL에는 page와 category만 동기화하고 검색어는 memory에 둔다. unknown query 보존 gap과 민감 API 검색도 검토한다. |
| 운영 담당 | 시스템 상태·정책·네트워크 신호의 출처와 미가용 상태 판단 | `/admin/system/monitoring/hub`, `/admin/system/network`, `/admin/system/policies`, `/admin/stats/*` | admin-system | network route는 unavailable이며 운영 계측 source가 없다. 가짜 정상 수치를 IA 우선순위에 쓰지 않는다. |
| 업무 설계 관리자 | 승인/워크플로 정의와 실행 상태 관리 | `/admin/workflow`, `/admin/sanctn/forms` | admin-system | 현재 demo/partial capability가 섞여 있다. `관리 센터` 정식 메뉴가 아니라 demo 격리 후보로 연구한다. |
| framework adopter | profile 선택·생성·검증·운영 인수 | 제품 UI route 없음; 문서·CLI·manifest | 해당 없음 | end-user sitemap에 억지로 넣지 않는다. adopter IA는 docs/CLI 여정으로 별도 연구한다. |

## 5. 현재 구조에 대한 적대적 검토

### 5.1 경로 namespace가 사용자 mental model과 권한을 동시에 표현하려 한다

`/admin/community`, `/admin/collaboration`, `/admin/help`, `/admin/work-hub`는 일반 사용자에게 열리지만 이름은 관리 영역처럼 보인다. 반대로 `/approvals`처럼 admin prefix가 아닌 route도 action별 capability 역할이 미검증이다. URL prefix로 메뉴 group과 권한을 동시에 추론하면 다음 실패가 생긴다.

- 일반 사용자에게 필요한 기능을 숨긴다.
- backend admin API를 쓰는 child를 넓은 USER prefix 아래 노출한다.
- URL을 바꾸는 순간 메뉴·bookmark·redirect·테스트·문서·감사 로그까지 불필요하게 결합한다.

**보완:** URL은 호환 식별자로 유지하고, nav node와 capability authorization을 별도 모델로 둔다.

### 5.2 alias가 메뉴 항목처럼 보이면 중복과 breadcrumb 왜곡이 생긴다

survey와 monitoring은 여러 legacy source가 하나의 hub+tab으로 수렴한다. 각 source를 메뉴에 그대로 유지하면 같은 결과가 다른 label로 반복되고, 사용자는 서로 다른 기능이라고 기대한다. 반대로 alias를 즉시 삭제하면 기존 bookmark와 외부 문서가 깨진다.

**보완:** alias는 inbound compatibility layer로만 보존하고 canonical node 하나에 수렴한다. alias 사용량·외부 계약·지원 기간이 확인될 때만 sunset을 결정한다.

### 5.3 menu census 부재를 과거 수치로 메우면 잘못된 삭제가 가능하다

현재 메뉴 노출은 119/119 `unverified`다. 이 상태에서 orphan을 정하면 “메뉴에 없음 = 가치 없음”이라는 오류가 된다. 상세·작성 route는 상위 메뉴가 있는 정상 sub-route일 수 있고, cross-role handoff 링크만으로 진입할 수도 있다.

**보완:** live census와 static/deep-link 소비를 함께 보고 `orphan`, `expected child`, `alias`, `hidden by role`, `external entry`를 구분한다.

### 5.4 route 존재와 capability 완성을 합치면 dead action을 정식 IA에 올린다

현재 route별 `live`는 0이고 모든 route가 decision-safe가 아니다. workflow, sanction form, notification dispatch, network monitoring처럼 demo·partial·unavailable action이 섞인 화면을 메뉴 이름만 정리해 정식 운영 capability처럼 보이게 하면 신뢰가 악화된다.

**보완:** 메뉴 eligibility는 route 파일 존재가 아니라 역할별 primary capability의 evidence 수준과 상태를 사용한다. demo는 demo profile 또는 명시된 sandbox에 격리한다.

### 5.5 현재 URL helper는 검색어를 보호하지만 strict allowlist는 아니다

[use-log-url-state.ts](../../frontend/src/app/admin/system/logs/use-log-url-state.ts)는 검색어를 로컬 상태에 두고 `page`, `cat`을 URL과 동기화한다. 이는 안전한 방향이지만 `new URLSearchParams(searchParams.toString())`로 **알 수 없는 기존 query를 그대로 보존**한다. 현재 테스트도 `keep=1` 보존을 계약으로 둔다.

**보완:** `PD-UX-002`가 strict allowlist를 승인하면 unknown·forbidden query를 제거하는 parser/serializer와 red test로 계약을 바꿔야 한다. 승인 전에는 현재 코드를 조용히 변경하지 않는다.

### 5.6 로그인 복귀 query가 dynamic record path를 복제할 수 있다

현재 [proxy.ts](../../frontend/src/proxy.ts)는 인증이 없으면 요청 `pathname`을 `/login?redirect=...`에 넣고, login client는 동일 출처 상대 경로인지 검사한 뒤 복귀한다. open redirect 방어는 있지만 pathname이 dynamic record를 포함하면 record locator가 login URL, browser history와 지원 screenshot에 복제될 수 있다.

**보완:** 별도 전역 URL follow-up 기본안은 raw URL 대신 server/session-bound safe intent를 권고한다. 최소한 정적 canonical route allowlist, query·fragment 제거, dynamic segment 분류, 길이·encoding 검증을 적용하고 로그인 성공 시 login entry를 replace한다. 이는 현재 결함 수정이 완료됐다는 뜻이 아니라 승인 후 구현 gap이다.

### 5.7 URL 위험은 동적 `[id]` route에만 있지 않다

현재 manifest에는 dynamic pattern이 11개(그중 `[id]` 10개와 `/help/policies/[type]` 1개)지만, 정적 route도 query에서 식별자·자유 입력을 생산하거나 소비한다. 2026-08-21 코드 대조에서 확인한 **대표 divergence**는 다음과 같다. 전수 목록이 아니며 이 표 자체로 모집단을 닫지 않는다.

| 현재 route/producer | 현재 URL 값 | 제안 정책과의 차이 |
|---|---|---|
| `/search`와 global command | `q` 자유 검색어 | free text 금지안과 충돌; role별 검색 source도 partial/unavailable/demo가 혼재 |
| board detail | `bbsId`, `pstSn`/`nttId` | board·post record locator가 query에 있음 |
| board list | `bbsId`, `searchWrd`, `startDate`, `endDate`, search/sort/page 계열 | ID·free text·조사 기간이 한 URL에 혼재 |
| address-book list | `searchWrd` | 이름·조직·연락처 검색 가능성이 있는 free text consumer |
| survey stats | `srvySn` | survey record locator를 client가 query에 쓰고 push함 |
| common-code | `groupId` | 내부 group record locator consumer |
| programs | `searchWrd` | 관리자 검색어 consumer |
| login | `redirect` | 직접 입력된 query·fragment·dynamic path도 단순 상대경로 regex를 통과할 수 있음 |

**보완:** G1 전에 navigation URL과 API request URL을 나눠 **전체 producer/consumer census**를 만든다. 최소 탐지 범위는 server `searchParams`, `useSearchParams`, `URLSearchParams`, `Link/href`, router/history/location, GET form, page/proxy/config redirect, login intent, API client query serialization, analytics/client log다. 각 값에 route pattern, producer, consumer, data class, allow/deny/exception, canonicalization, owner, evidence를 부여하고 empty population을 fail-closed로 막는다.

### 5.8 config redirect가 임의 query를 자동 제거하지 않는다

현재 설치된 Next 16 redirect 구현을 직접 확인하면 initial URL query와 destination query를 merge하고 destination 값이 같은 이름만 덮어쓴다. 따라서 `/admin/survey/manage?keyword=...&tab=evil` 같은 요청은 target의 `tab=manage`는 고쳐도 알 수 없는 `keyword`는 보존할 수 있다. 이 동작은 [next.config.ts](../../frontend/next.config.ts)의 15개 config redirect(implementation source 13 + page-less alias 2) 모두에 적용될 수 있다.

또한 page-less board alias 2개는 현재 `permanent=true`지만 외부 소비자와 지원 기간은 아직 미검증이다. 이는 장기 호환이 틀렸다는 증거는 아니나, 이 문서의 “근거가 있는 경우만 permanent” 제안 조건을 현재 증명하지 못한다.

**보완:** static config redirect만으로 unknown query sanitization이 된다고 가정하지 않는다. alias별 middleware/route redirect sanitizer 또는 target canonicalizer를 설계하고 15개 전부에 forbidden·repeated·encoded query negative test를 둔다. 현 permanent alias는 소비자·지원 정책을 확인할 때까지 기존 호환 동작으로 표시하되 새 영구 승인의 근거로 재사용하지 않는다.

## 6. IA 대안 비교와 잠정 방향

### 6.1 평가 기준

| 기준 | 질문 |
|---|---|
| top-task findability | 사용자가 내부 도메인명 없이 원하는 결과를 첫 선택에서 찾는가? |
| 역할·프라이버시 | 허용되지 않거나 민감한 기능 label과 count가 불필요하게 노출되지 않는가? |
| 교차 역할 연속성 | 작성→검토→응답처럼 역할을 넘는 여정의 상태와 handoff가 끊기지 않는가? |
| URL 호환성 | bookmark, external link, refresh와 rollback을 보존하는가? |
| 참조 구현 확장성 | 기관별 label·group·profile 차이를 core 재작성 없이 수용하는가? |
| 접근 가능한 탐색 | keyboard, screen reader, zoom, touch에서 같은 구조와 현재 위치를 제공하는가? |
| 증거 비용 | live menu와 119 disposition을 검증 가능한 방식으로 이행할 수 있는가? |

### 6.2 대안 A — 현 도메인 트리 정리

현재 top-level domain을 유지하고 duplicate·broken·orphan만 정리한다.

**장점**

- 변경량과 조직 학습 비용이 가장 작다.
- 현재 menu DB 구조를 재사용하기 쉽다.
- URL·도메인 owner와 nav group이 대체로 맞으면 빠르게 안정화할 수 있다.

**적대적 반론**

- `/admin`, `uss`, `sanctn`, `hpcm`, `ism` 같은 기술·레거시 용어를 일관되게 만들 뿐 사용자 문제를 해결하지 못할 수 있다.
- 현재 live menu를 모르는 상태라 “정리” 대상 자체가 없다.
- 조직/코드 소유권을 사용자 mental model로 오인한다.

**판정:** emergency cleanup의 낮은 위험 fallback으로는 가능하지만 목표안으로 권고하지 않는다.

### 6.3 대안 B — 역할별 독립 포털

일반 사용자 portal, 관리자 portal, 감사/운영 portal을 분리하고 역할 전환기를 둔다.

**장점**

- 민감 기능과 관리 기능의 경계가 명확하다.
- 각 역할의 메뉴 밀도와 용어를 줄이기 쉽다.
- 관리자 기능이 일반 사용자 task를 압도하는 문제를 줄인다.

**적대적 반론**

- 한 사람이 콘텐츠 작성자·승인자·관리자를 겸하면 context switching이 늘어난다.
- 같은 capability가 여러 portal에 복제되거나, role 판정이 틀리면 기능을 찾을 수 없다.
- route와 상태를 portal별로 재작성하면 중복 구현과 bookmark migration 비용이 커진다.

**판정:** 강한 조직 분리가 검증된 파생 제품에는 적합할 수 있으나 공통 reference 기본값으로는 경직된다.

### 6.4 대안 C — 과업 중심 기본 IA + 관리 센터 분리 (ADR-0004 잠정 방향)

일반 과업은 결과 중심으로 묶고, 권한·위험이 높은 운영 capability는 하나의 관리 센터 안에서 다시 task group으로 나눈다. 역할은 node visibility를 제한하지만 URL과 capability authorization은 별도다.

**제안 tree — 연구용 label 가설**

```text
홈
├─ 나의 업무
│  ├─ 업무·일정·보고
│  ├─ 요청 작성
│  └─ 승인·처리 현황
├─ 소통·지식
│  ├─ 게시판·커뮤니티
│  ├─ 쪽지·주소록·메일
│  └─ 도움말·FAQ·Q&A
├─ 참여
│  ├─ 설문·여론조사 참여
│  └─ 내 응답·결과(공개 정책이 허용할 때)
└─ 관리 센터 (권한 있는 역할만)
   ├─ 사람·접근 관리
   ├─ 콘텐츠·참여 운영
   ├─ 업무 흐름 설계
   ├─ 운영·감사
   └─ 플랫폼 설정
```

`홈`, `나의 업무`, `소통·지식`, `참여`, `관리 센터`라는 문구도 사용자 검증 전 확정 label이 아니다.

**장점**

- 일반 사용자에게 열린 `/admin/*` URL을 사용자 친화 label로 표현하면서 URL을 깨지 않는다.
- 고위험 admin action을 명시적 영역에 모으되, 한 사용자가 여러 역할을 겸해도 같은 shell 안에서 이동할 수 있다.
- 기관별 profile은 nav node visibility와 label을 바꾸고 canonical route·component를 공유할 수 있다.
- alias와 technical namespace를 사용자 구조에서 숨길 수 있다.

**잔여 위험과 완화**

- role 기반 숨김이 authorization으로 오인될 수 있다 → backend action 권한 계약을 별도 유지한다.
- “관리 센터”가 너무 커질 수 있다 → tree test에서 각 역할의 5~7개 critical task를 우선하고 progressive disclosure를 쓴다.
- 개인화로 메뉴 위치가 흔들릴 수 있다 → 같은 역할/profile에서는 order를 안정적으로 유지하고 최근 항목은 보조 영역으로만 둔다.
- 조직마다 mental model이 다르다 → core label을 진리로 고정하지 않고 approved profile overlay로 제공한다.

### 6.5 최종 IA 승인 조건

ADR-0004의 잠정 방향을 exact target tree와 실행 가능한 route disposition으로 최종 승격하려면 다음이 모두 필요하다.

1. live menu 구조 census, `tb_menu_crt_dtl` authority assignment, synthetic sample-user effective menu 검증이 성공하고 manifest join 결과가 exact release SHA에 고정된다.
2. 각 critical role의 open sort에서 공통 label/cluster 후보와 반례를 기록한다.
3. 대안 A/B/C의 closed sort/tree test에서 대안 C가 critical task 성공·첫 선택·노출 오류 면에서 승인 threshold를 만족하고 baseline보다 악화되지 않는다.
4. 119개 implementation route와 2개 external alias의 disposition이 승인된다.
5. security/privacy가 role visibility와 URL allowlist를 승인한다.
6. ADR-0004와 구분되는 final acceptance record가 URL 안정성, nav node 분리, alias·history·rollback과 승인 evidence hash를 기록한다.

## 7. 제안 IA 데이터 계약

### 7.1 URL과 nav node를 분리한다

한 nav node는 다음 의미를 가져야 한다. 이는 승인 후 구현할 schema의 요구사항이지 현재 DB 컬럼이 이미 충족한다는 주장이 아니다.

| 필드 | 요구 의미 |
|---|---|
| `navNodeId` | route 문자열과 독립적인 안정 식별자. menu DB PK를 외부 URL이나 analytics에 내보내지 않는다. |
| `canonicalRoute` | terminal page와 화면별 allowlisted 기본 query. alias를 쓰지 않는다. |
| `label` | 한국어 우선 사용자 용어. 내부 class·테이블·약어를 기본 label로 쓰지 않는다. |
| `groupId` / `parentNodeId` | 연구로 승인된 hierarchy. 코드 directory parent를 자동 복사하지 않는다. |
| `order` | 동일 역할·profile 안에서 안정적인 순서. 사용량 개인화는 primary order를 흔들지 않는다. |
| `visibility` | profile + capability role + feature state로 파생. `hidden`은 authorization이 아니다. |
| `capabilityId` | route capability manifest의 primary task와 연결한다. route 하나에 capability가 여러 개면 node를 분리하거나 page 안에서 상태를 명시한다. |
| `aliases` | inbound 호환 source. menu, breadcrumb, command search 결과로 노출하지 않는다. |
| `state` | `live/partial/demo/unavailable/unverified`에 따른 노출·고지 정책. `unverified`는 기본 비노출·`decisionSafe=false`이며 unsupported action을 숨기거나 명시적으로 disabled한다. |
| `profile` | 현재 `core/collaboration/demo` 또는 별도 승인된 배포 profile의 의미 소유권. 정의되지 않은 `derived` 값을 enum처럼 만들거나 direct removePaths 관측을 소유권으로 복사하지 않는다. |

### 7.2 label·group·order·visibility 원칙

1. **Label:** 사용자가 이루려는 결과를 앞에 둔다. `관리`, `현황`, `처리`만 반복하지 않고 대상과 action을 구체화한다.
2. **Group:** 코드 package나 담당 조직이 아니라 card sort와 top-task 연결을 사용한다.
3. **Order:** 빈도만이 아니라 실패 비용과 시간 민감도를 함께 본다. 고위험 저빈도 task를 깊이 숨기지 않는다.
4. **Visibility:** role이 수행할 수 없는 primary action은 노출하지 않는다. nav/search/command projection은 서버가 effective authority로 필터링한 뒤 클라이언트에 보낸다. client hide만으로 관리자 node·label·count를 HTML/RSC/API payload에 싣지 않는다. 단, 권한 신청·담당자 문의가 제품 과업이면 unavailable node와 다음 행동을 명시할 수 있다.
5. **Alias:** 같은 canonical capability의 별도 메뉴 node를 만들지 않는다.
6. **Child route:** create/detail/edit는 독립 top task가 아니면 메뉴 node로 만들지 않고 parent/list의 task flow에서 진입한다.
7. **Demo/unavailable:** core의 정상 메뉴처럼 배치하지 않는다. demo profile/sandbox 또는 명시된 상태 페이지로 격리한다.
8. **Search/command palette:** role-filtered canonical node만 검색하고 alias·관리자-only label·unavailable action을 누출하지 않는다.

### 7.3 접근 가능한 findability 계약

- primary navigation은 `<nav>` landmark와 명확한 accessible name을 가진다.
- 현재 route의 canonical node에 `aria-current="page"`를 제공하고 redirect source가 아니라 target을 현재 위치로 본다.
- 펼침/접힘은 link와 분리된 button으로 제공하며 `aria-expanded`, `aria-controls`, keyboard activation을 지원한다.
- visible label과 accessible name은 같은 핵심 용어를 사용한다. icon, 색, hover tooltip만으로 group/action을 표현하지 않는다.
- skip link, heading hierarchy, breadcrumb를 제공하되 breadcrumb와 menu가 서로 다른 alias label을 말하지 않는다.
- 200% text, 400% zoom/320 CSS px, 긴 한국어·URL에서 primary action과 현재 위치를 잃지 않는다.
- mobile drawer는 열 때 합리적인 시작점으로 focus를 옮기고, 닫을 때 trigger로 돌려보내며, background scroll과 focus escape를 막는다.
- route 이동 후 page heading 또는 main 시작점으로 focus를 관리한다. validation·mutation 중에는 무조건 focus를 초기화하지 않는다.
- role/profile에 따라 메뉴가 달라도 같은 역할의 항목 순서는 예측 가능해야 한다. 사용 기록에 따른 자동 재정렬은 기본 금지다.
- screen reader와 keyboard 사용자를 tree test의 별도 사후 감사가 아니라 모집·task 수행에 포함한다.

## 8. 119개 route disposition 승인 절차

### 8.1 왜 119행을 이 문서에 복제하지 않는가

119행을 Markdown 표로 복사하면 route 추가·삭제·redirect 변경 때 두 원본이 생긴다. 승인 모집단은 [route capability manifest](../../config/ui-route-capabilities.json) 하나로 유지하고, review view는 exact manifest에서 생성한다.

승인 기록은 다음을 고정해야 한다.

- release tag와 commit SHA
- manifest `asOf`, schema version, 파일 SHA-256
- route contract 실행 명령과 결과
- live menu 구조, authority assignment, effective sample-user menu artifact의 실행 시각·환경 식별자·결과 hash
- review view 생성기 버전/명령
- 승인한 disposition overlay의 hash

이렇게 하면 “119개를 검토했다”는 문장 대신 어떤 119개였는지를 재현할 수 있다.

### 8.2 disposition enum

모든 implementation route는 다음 중 정확히 하나의 **source disposition**을 가진다. canonical target disposition은 별도 필드로 연결한다.

| Disposition | 사용 조건 | 필수 후속 |
|---|---|---|
| `retain-canonical` | 사용자 top task 또는 필요한 child flow의 terminal route | approved nav node 또는 명시적 non-menu child, owner, capability evidence |
| `retain-alias-permanent` | 공개·외부 계약상 장기 호환 source | terminal target, query mapping, loop test, 문서화된 영구 사유 |
| `retain-alias-temporary` | migration window 동안만 필요한 source | telemetry/privacy 승인, sunset owner/date, fallback·rollback |
| `non-menu-child` | create/detail/edit처럼 parent task 안에서만 진입 | parent capability, return/focus/back contract, direct-link 권한 |
| `profile-conditional` | 특정 approved profile에서만 의미가 있음 | positive profile owner, 생성·제거·검증 증거 |
| `demo-isolated` | 실운영 기능으로 오인될 demo | demo profile/sandbox, visible notice, core menu 비노출 |
| `unavailable-hidden` | source/operation이 없고 탐색 가치도 없음 | 지원 재개 조건, owner/reviewBy; deep link는 정직한 unavailable |
| `consolidate-to-canonical` | 다른 route와 같은 capability·상태를 제공 | target, field/path mapping, bookmark·history·query 보존 |
| `retire-candidate` | 소비·외부 계약·profile·capability 증거가 없고 대체 경로가 있음 | 안전 삭제 절차, usage window, 승인, rollback redirect |
| `blocked-review` | 역할·capability·메뉴·법적 의미가 불명확 | blocker, named owner, reviewBy; G1 unresolved count에 포함 |

`retire-candidate`는 삭제 승인이 아니다. 별도 reachability, static URL, menu, 외부 계약, runtime artifact와 rollback이 모두 통과해야 실제 삭제할 수 있다.

### 8.3 route별 review record

review view의 각 행은 최소 다음 필드를 가진다.

```yaml
route: <manifest route; exact key>
routeKind: page|page-redirect|config-redirect
effectiveTarget: <canonical path + allowlisted query>
sourceShellAccess: public|authenticated|admin-system
effectiveShellAccess: public|authenticated|admin-system
authorization:
  status: unverified|verified|not-applicable
  actorScopes: []
  evidence: []
primaryCapabilities: []
capabilityState: live|partial|demo|unavailable|unverified
menuAuthorityAssignment:
  status: unverified|verified|not-applicable
  liveMenuIds: []
  authorityCodes: []
  evidenceArtifact: <hash/path>
effectiveMenuExposure:
  status: unverified|verified|not-applicable
  syntheticCohorts: []
  evidenceArtifact: <hash/path>
profileOwnership:
  status: unverified|verified|not-applicable
  profiles: []
journeys: []
topTasks: []
disposition: <enum>
nav:
  nodeId: <or null>
  proposedLabel: <or null>
  groupId: <or null>
  orderBand: primary|secondary|utility|none
  visibility:
    status: unverified|verified|not-applicable
    actorScopes: []
privacy:
  status: unverified|verified|not-applicable
  urlAllowlist: []
  producerConsumerReview: pass|exception-requested|blocked
owner: <named person/role>
reviewBy: <date>
evidence: []
approvals:
  domain: <name/date or pending>
  productIa: <name/date or pending>
  securityPrivacy: <name/date or pending>
  accessibility: <name/date or pending>
```

현재 manifest 값을 채운 뒤 사람이 모르는 값은 `unverified`로 유지한다. 빈 배열은 status가 `verified` 또는 `not-applicable`이고 “검증된 actor/menu/profile 없음”의 근거가 있을 때만 허용한다. 빈 문자열, 추정 role, migration에서 복사한 menu ID로 review를 green으로 만들지 않는다.

page-less external alias 2개는 route record에 억지로 넣지 않고 다음 별도 schema를 사용한다.

```yaml
source: <externalAliases.source exact key>
target: <effective canonical target>
permanent: true|false
knownConsumers: []
consumerEvidenceStatus: unverified|verified
sunset:
  status: not-planned|proposed|approved
  owner: <name or null>
  reviewBy: <date or null>
queryMapping:
  status: unverified|verified
  allowed: []
privacyReview: unverified|verified|blocked
authorizationReview: unverified|verified|blocked
owner: <named person/role>
evidence: []
```

`knownConsumers: []`도 `consumerEvidenceStatus=verified`일 때만 “전수 확인 결과 없음”을 뜻한다. `unverified`의 빈 배열은 모른다는 뜻이다.

### 8.4 승인 전에 먼저 만드는 실행 증거

승인 수용 조건을 검증할 schema/gate를 승인 후 wave로 미루면 순환 논리가 된다. decision workshop 전에 다음 **비규범 proposed artifact**를 만든다.

1. route manifest의 SHA-256만 참조하고 route metadata를 복제하지 않는 disposition overlay
2. 119 route key와 정확히 같은 key set을 강제하는 JSON schema/contract test
3. `externalAliases.source` 2개와 정확히 같은 별도 alias overlay/test
4. missing, duplicate, extra, invalid disposition, unverified authorization/privacy를 재현하는 red fixture
5. overlay state가 `proposed`일 때 menu/generator가 소비하지 못하게 하는 binding test
6. final approval metadata와 ADR-0004와 구분되는 final acceptance record가 없으면 `accepted`로 전이하지 못하는 fail-closed test

현재 실행 증거는 [disposition proposal](../../config/ui-navigation-disposition-proposal.json), [JSON schema](../../config/ui-navigation-disposition.schema.json), [contract](../../scripts/ui-navigation-disposition-contract.mjs), [contract test](../../scripts/ui-navigation-disposition-contract.test.mjs)에 있다. overlay는 CRLF/LF만 LF로 정규화한 manifest UTF-8 SHA-256과 route/alias key만 참조하고 shell·role·menu·target metadata를 복제하지 않는다. external alias의 target/permanent 같은 관측 metadata는 review view에서 hash가 고정된 manifest와 join하며 overlay에 재기록하지 않는다. 119개 route와 2개 external alias의 record는 전건 disposition 초안이 기입된 `proposed`에서 출발했고, 2026-08-23 웨이브 1에서 저위험 8건(demo-isolated 4·unavailable-hidden 2·retain-alias-permanent 2)만 owner PR 리뷰(ADR-0007 §Decision 4, DEC-OPS-013 채널)로 `approved`가 됐다. 잔여 113건의 review 축은 `unverified`, approval은 `null`이다. route owner/reviewBy는 manifest의 bounded review 역할과 2026-10-31을, alias는 `product/IA + domain owner`와 같은 reviewBy를 갖지만 담당자 지정이나 승인을 뜻하지 않는다. menu/generator binding도 disabled다. 이는 잠정 검증 방향과 승인 전 completeness 장치, 그리고 개별 record 승인의 진행을 뜻할 뿐 overlay 전체의 accepted 전이나 G1을 승인했다는 뜻이 아니다.

최종 acceptance record는 manifest hash, proposed overlay hash, research evidence hash와 contract 결과를 참조한다. ADR-0004는 자체 hash로 잠정 방향에만 결속된다. 최종 승인 뒤 Wave IA-0은 이 최초 증거를 “새로 만드는” 단계가 아니라 accepted state와 실제 consumer binding을 추가하는 단계다.

### 8.5 승인 순서

1. **모집단 동결:** route contract를 실행해 119/119 exact population, duplicate 0, dangling/cycle 0을 확인하고 manifest hash를 고정한다.
2. **live menu 구조 재계측:** 허용된 read-only 연결에서 현재 menu census를 실행해 `tb_menu_info` 구조를 예비 측정한다. 실패하면 `blocked-external`을 유지한다. 성공해도 역할 노출은 아직 미검증이다.
3. **authority assignment census:** 실제 schema를 확인한 뒤 `tb_menu_crt_dtl`의 authority-menu 관계를 read-only로 수집한다. current script를 실행했다는 이유로 이 단계를 skip하지 않는다.
4. **effective menu 실행:** 사용자-authority mapping과 menu service를 통해 승인된 synthetic cohort가 실제 받는 menu를 검증한다. DB authority code를 proxy role로 치환하지 않는다.
5. **manifest join:** menu source route와 manifest source/effective target을 모두 비교한다. query를 제거한 path join과 query를 포함한 exact join을 분리해 alias·tab 의미를 잃지 않는다. route 모집단은 menu script의 자체 collector가 아니라 manifest를 사용한다.
6. **자동 prefill:** route kind, target, shell access, capability status/evidence, profile direct observation을 복사한다. role·product label·top task·semantic ownership은 추론하지 않는다.
7. **domain review:** primary action, data source, owner/owner-or-admin/admin-only 의미, 실제 오류·empty 상태를 확인한다.
8. **product/IA review:** top task, proposed label/group/order, menu/non-menu/alias disposition을 검토한다.
9. **security/privacy review:** effective target 권한, label/count leakage, 전체 URL producer/consumer, analytics payload를 검토한다.
10. **accessibility review:** tree depth, keyboard/focus, visible/accessibility label, cognitive load와 AT task를 검토한다.
11. **연구 검증:** 승인 후보 tree를 open sort → closed sort → tree test 순으로 시험하고 반례와 segment 차이를 기록한다.
12. **exact completeness gate:** pre-decision contract로 119개 source route와 2개 external alias가 각각 exactly once인지 검사한다. `blocked-review`는 active/user-visible route의 authorization, privacy, effective menu exposure에 허용하지 않는다. 비활성·demo 격리 route의 비보안 label/profile만 owner+reviewBy 예외가 가능하다.
13. **결정:** 제품 소유자가 범위·profile·연구 결과·예외를 승인하고, security/privacy owner가 로그 URL과 별도 전역 URL 결정의 각 scope를 승인한다.
14. **정본 갱신:** ADR-0004와 구분되는 final acceptance record와 route manifest를 먼저 갱신한 뒤에만 해당 pending decision 행을 제거한다. menu/generator 구현은 그 이후 별도 변경으로 한다.

### 8.6 exact completeness 불변식

- `manifest routes = 119`이며 review key set이 route key set과 정확히 같다.
- redirect source도 빠지지 않고 source disposition을 가진다.
- canonical target이 같은 여러 alias는 하나의 nav node만 참조한다.
- page-less external alias 2개는 implementation route count에 더하지 않되 별도 review set에서 누락되지 않는다.
- dynamic route의 `[id]`를 하나의 route pattern으로 세며 실제 record 수를 route 수로 세지 않는다.
- 모든 nav node는 최소 하나의 approved primary capability를 참조한다.
- menu node는 terminal target을 사용하고 redirect source를 canonical로 선언하지 않는다.
- USER-visible node가 admin-system effective target으로 이동하지 않는다. 예외는 명시적 권한 요청/안내 capability로 별도 설계한다.
- demo/unavailable primary capability는 `live` label과 정상 수치로 노출되지 않는다.
- unresolved role, menu exposure, capability 상태는 G1을 자동 통과하지 않는다.
- authorization, privacy, active menu exposure는 owner+reviewBy만으로 승인되지 않는다.
- unauthorized capability ID·label·count가 DOM뿐 아니라 HTML, RSC payload, menu/search API response에도 0개다.

### 8.7 authority-aware live menu와 route join 판정표

| route evidence | live menu evidence | 분류 | 기본 조치 |
|---|---|---|---|
| canonical page | 정확한 canonical menu 1개 | candidate aligned | role/capability/label 검토 후 유지 |
| canonical page | 같은 effective cohort에 menu 여러 개 | duplicate candidate | authority mapping, parent·label·query가 실제로 같은지 확인 후 하나로 수렴 |
| canonical page | menu 없음 | orphan candidate | parent flow, command/search, notification, external deep link를 확인; 자동 삭제 금지 |
| alias | alias menu 있음 | navigation duplication | menu를 canonical로 옮기되 inbound alias는 별도 존속 판단 |
| route 없음 | 활성 menu 있음 | broken candidate | dynamic match, redirect target, deployment version을 확인 후 수정/숨김 |
| admin-system target | USER menu 노출 | authorization asymmetry | 즉시 high-risk review; visibility만 고쳐 권한 결함을 숨기지 않음 |
| demo/unavailable | core live menu 노출 | truthfulness defect | 격리·고지·비노출 중 승인된 disposition 적용 |

## 9. redirect·deep-link·query·back/history 계약

이 절은 `PD-UX-001`의 route/alias 계약과 별도 전역 URL follow-up의 **제안안**이다. 로그 전용 `PD-UX-002` 승인만으로 이 절 전체를 accepted로 만들지 않는다.

### 9.1 canonical과 alias

1. 내부 menu, breadcrumb, command palette, notification의 새 link는 canonical terminal route만 만든다.
2. alias 요청은 한 번의 결정적 redirect로 terminal target에 도달해야 하며 cycle·chain·dangling target이 없어야 한다.
3. redirect는 source의 임의 query를 그대로 전달하지 않는다. target 화면의 allowlist에 있는 이름·값만 명시적으로 mapping한다.
4. 동적 segment는 decode→validate→canonical encode를 거친다. path traversal, slash injection, double encoding, control character를 거부한다.
5. source와 target의 effective authorization이 다르면 target 권한을 기준으로 진입을 판단한다. `/cop/sms/selectSmsList` 같은 escalation source를 일반 사용자 메뉴에 두지 않는다.
6. `permanent=true`는 외부 계약과 target 안정성이 확인된 경우만 사용한다. temporary alias에는 owner·sunset·rollback을 둔다.
7. canonical metadata와 공유 UI는 target을 내보내며 alias를 복사하지 않는다.
8. alias hit telemetry가 필요하면 raw query·record ID·user ID·IP 없이 route pattern과 coarse outcome만 수집하고 별도 승인을 받는다.

### 9.2 deep-link 계약

| 상황 | 기대 동작 |
|---|---|
| canonical list/hub | 역할이 허용되면 allowlisted view state로 복원; 금지 param 제거 |
| canonical detail/create | 권한과 record 접근을 서버가 재검증; 실패를 빈 목록/404로 위장하지 않음 |
| legacy alias | terminal canonical로 replace 의미의 redirect; Back이 alias↔target loop를 만들지 않음 |
| 인증 없음 | login으로 이동하되 안전한 복귀 intent만 보존; query·fragment·record ID를 raw 복사하지 않음 |
| 인증됐으나 권한 없음 | login이 아니라 명시적 403/권한 안내; 더 낮은 권한 화면의 empty로 위장하지 않음 |
| target unavailable | 실제 상태와 재개 조건 표시; 가짜 데이터 또는 silent fallback 금지 |
| 잘못된 tab/page | 화면별 기본값으로 축퇴하고 URL에서 잘못된 값 제거 |

### 9.3 브라우저 history와 focus

- 메뉴·목록→상세·목록→작성처럼 **과업 단계가 바뀌는 이동**은 history에 남는 navigation을 사용한다.
- 같은 화면의 page/tab/sort처럼 **복원 가능한 view state**는 기본적으로 `replace`를 사용해 Back stack을 오염시키지 않는다. tree test에서 tab 자체가 독립 과업으로 판정되면 route 또는 `push` 전환을 별도 결정한다.
- 자유 검색어·민감 filter 변화는 URL/history에 넣지 않는다. 검색 결과 상세로 이동했다 돌아오면 승인된 memory/server state와 focus anchor로 복원한다.
- alias redirect와 로그인 성공 후 복귀는 login/alias 중간 주소를 history에 반복 남기지 않는다.
- Back으로 목록에 돌아올 때 page/tab, scroll anchor, 이전 trigger focus를 복원한다. 삭제된 항목이면 가장 가까운 합리적 heading/row로 이동하고 알림을 제공한다.
- modal/sheet open을 URL에 넣는 것은 독립 deep-link 가치가 승인된 경우만 허용한다. 그렇지 않으면 로컬 상태와 focus return을 사용한다.
- POST/mutation 성공 후 refresh/Back이 재전송을 유발하지 않도록 PRG(Post/Redirect/Get) 또는 동등한 idempotency 계약을 사용한다.

### 9.4 redirect 회귀 테스트

- 18개 implementation redirect + 2개 external alias 전부 terminal 도달
- dangling, cycle, 2-hop 이상의 불필요한 chain 0
- source와 terminal의 effective shell access 비교
- survey/monitoring tab enum이 정확하고 unknown tab이 default로 정규화됨
- dynamic `[id]`의 정상/encoding/invalid boundary
- Back 1회로 alias가 아니라 이전 과업으로 복귀
- refresh 후 canonical URL·선택 상태 유지
- 15개 config redirect에서 forbidden·unknown·repeated·encoded query가 전후 제거됨; Next 기본 merge 동작을 그대로 통과시키는 fixture는 red
- 5개 page redirect도 source query·dynamic encoding의 allowlist 교집합만 전달
- login intent가 `/api`, `/ws`, `/login` loop, admin-only target, query, fragment, dynamic record locator, protocol-relative/backslash/double-encoded 입력을 거부
- role별 401/403/allowed가 empty와 구분됨

## 10. 로그 `PD-UX-002`와 전역 URL·개인정보 follow-up

### 10.1 decision scope를 분리한다

| Decision | 현재 registry 범위 | 이 문서의 제안 | 상태 |
|---|---|---|---|
| `PD-UX-002` | 로그 검색 조건을 URL에 얼마나 보존할지 | log hub/list의 category·page·search/filter 계약만 승인 | `blocked-input`; 변경 없음 |
| 전역 URL/privacy follow-up | 아직 pending registry에 없음 | 모든 route query, dynamic locator, redirect, login intent, API query와 analytics 계약 | 후보 `PD-UX-003`; **미등록·미승인** |

제품 소유자가 전역 범위를 실제로 승인하려면 새 pending decision을 등록하고 owner·영향·재개 조건을 정한다. `PD-UX-002` 문구를 확장하는 대안도 가능하지만, 로그 결정과 전역 locator migration의 rollback 경계가 달라 별도 ID를 권고한다.

### 10.2 세 가지 조건을 모두 만족해야 한다

URL에 둘 상태 `s`는 다음 세 질문이 모두 `yes`일 때만 허용한다.

1. **비민감:** 주소창, browser history, referrer, screenshot, proxy/CDN/server log, support ticket에 남아도 개인정보·조사 대상·업무 내용을 드러내지 않는가?
2. **공유 가치:** 다른 권한 있는 사용자가 같은 주소를 받았을 때 의미 있는 동일 view를 얻는가?
3. **복원 가치:** refresh/Back/새 탭에서 복원하지 않으면 과업 비용이 실제로 커지는가?

하나라도 `no` 또는 `unknown`이면 URL에 두지 않는다. 단순 구현 편의, cache key, API가 GET이라는 이유는 허용 근거가 아니다.

### 10.3 `PD-UX-002` 로그 Phase 1 제안 allowlist

이 표는 승인할 기본안이다. route별 값 enum과 상한을 코드 계약으로 고정하기 전에는 채택된 정책이 아니다.

| Route scope | Param | 허용 값 | 기본/정규화 | 근거 |
|---|---|---|---|---|
| `/admin/system/logs` integrated hub | `cat` | `SYS`, `LGN`, `USR`, `WEB` | `SYS`는 param 생략; unknown 제거 | 비민감 category, 공유·복원 가치 있음 |
| log list routes | `page` | 1-base positive integer, server-known max 이내 | 1은 생략; 음수·NaN·과대 값 정규화 | 결과 위치만 표현하며 query 자체를 노출하지 않음 |
| log dense list | `sort`, `dir` | privacy owner가 공개로 분류한 column key enum, `asc|desc` | default 생략 | **후보**. 조사 의미를 드러내는 column이면 허용하지 않음 |

현재 로그 구현에서 실제 URL state는 `cat`과 `page`다. `sort`, `dir`은 구현됐다는 뜻이 아니라 승인 후 사용할 수 있는 후보 계약이다. 자유 검색어, 사용자/IP/record ID, exact incident filter는 로그 URL에서 허용하지 않는다.

### 10.4 전역 follow-up allowlist 후보

| Scope | 후보 상태 | 조건 |
|---|---|---|
| approved hub `tab` | route별 compile-time enum | label 자체가 비민감하고 공유·복원 가치가 있을 때만 |
| non-sensitive list `page/sort/dir` | bounded integer와 공개 enum | record/filter 의미를 드러내지 않고 default canonicalization이 있을 때만 |
| login return intent | raw URL 대신 server/session-bound canonical route ID | query·fragment·dynamic locator 제거, role 확인, 짧은 수명·1회 소비, loop 금지 |
| public content locator | 별도 public slug 또는 공개 locator | 개인정보·존재 확인 위험이 없고 공개 resource임을 domain/privacy가 승인 |

이 표는 `PD-UX-002`의 일부가 아니며 새 전역 decision 없이는 구현 승인 근거가 아니다.

### 10.5 명시적 denylist

다음 값은 이름을 바꾸거나 hash/base64로 포장해도 URL, client log, analytics payload에 두지 않는다.

| 금지 분류 | 예시 | 대체 |
|---|---|---|
| 자격증명·세션 | password, token, cookie, one-time code | HttpOnly cookie, server session |
| 개인정보 | 이름, 이메일, 전화, 주소, 사번, 계정명, 조직 식별 정보 | memory의 최소 입력 또는 승인된 POST 검색 |
| 네트워크 식별 | IP, device identifier, user-agent fingerprint | 필요 시 권한 있는 서버 검색 body; analytics 금지 |
| 자유 검색어 | `q`, `keyword`, `searchWrd`, `searchKeyword`의 실제 값 | component memory; 민감 검색은 POST body/서버 저장 query handle |
| 응답·콘텐츠 | 로그 message/payload, 게시글 문구, 설문 질문·응답, form value | server data와 권한 검증; URL에는 view type만 |
| record identifier | user ID, menu ID, log ID, response ID, survey ID, 사건 번호, DB PK | 선택 상태는 memory/server handle; 필요한 공개 콘텐츠 locator도 별도 분류·승인 |
| 조사 상태 | exact incident time, 대상 조직/직원, 개인정보 열람 사유 | memory/POST 검색; coarse preset도 privacy owner 승인 |
| 내부 운영 정보 | host, pod, trace ID, stack signature | 운영 도구의 승인된 server-side filter |

기존 filesystem에는 dynamic route pattern 11개(`[id]` 10개와 `[type]` 1개)가 있고 정적 route query에도 locator가 있다. 이 문서는 그것을 소급 승인하지 않는다. 전체 URL census와 119 disposition에서 각각 다음 중 하나로 처리한다.

- **공개 slug/locator:** 공개 resource이며 enumeration·상관관계 위험을 검토하고 명시 승인
- **인증된 non-secret opaque locator:** 불투명성에 기대지 않고 모든 요청에서 server object authorization; URL/log 노출을 전제로 분류
- **short-lived bearer handle:** 최소 TTL, single-use, `Referrer-Policy`, cache 금지, 로그 redaction, 유출 대응을 갖춘 경우만 제한 승인
- **memory/server selection:** 공유·refresh 가치가 낮은 민감 선택에 기본 사용
- legacy exception으로 기간·노출 경계·sunset을 가진 별도 ADR 요청

hash, base64, UUID 또는 “opaque”라는 이름만으로 비민감해지지 않는다. bearer handle은 오히려 URL/history/log 유출이 곧 권한 유출일 수 있다. one-time handle은 refresh/Back/share를 깨므로 해당 route의 복원 가치와 함께 검증한다. `record ID는 개인정보가 아닐 수 있다`는 주장만으로 허용하지 않고 존재 확인, 상관관계, 접근 패턴과 referrer/log 확산 위험을 함께 본다.

### 10.6 전체 URL producer/consumer census

전역 decision 전에 기계적으로 다음 두 모집단을 만든다.

1. **Navigation URL:** filesystem dynamic segment, server/client search param consumer, `Link/href`, router/history/location, GET form, config/page/proxy redirect, login intent.
2. **Request/telemetry URL:** API client GET query, RSC/server fetch query, referrer, CDN/proxy/app/access log, analytics/client error payload.

각 record는 route/request pattern, producer file, consumer file, param/segment, data class, current behavior, proposed allow/deny/exception, canonicalization, authorization boundary, owner, reviewBy와 evidence를 가진다. parser failure, computed URL, unresolved producer는 `ambiguous`로 fail-closed하며 zero population을 허용하지 않는다. current divergence 표는 seed fixture일 뿐 census 전체 모집단이 아니다.

2026-08-21 현재 정적 구문 모집단은 [generated URL-state census](../../config/ui-url-state-census.json)가 보존하고, [generator/check](../../scripts/ui-url-state-census.mjs)와 [semantic/red contract](../../scripts/ui-url-state-census.test.mjs)가 현재 소스와 exact-match한다. 이 자산은 filesystem dynamic route 11개, Next config redirect 15개, page-only redirect 5개와 query/navigation/request/form/login-intent 관찰점을 분리하고 unknown query copy 및 repeated·encoded 입력 위험을 명시한다. 다만 모든 record의 privacy class, canonical status, capability role, object authorization과 승인 상태는 `unverified`·`decisionSafe=false`다. CDN/proxy/app access log와 외부 analytics retention은 저장소 정적 검사 범위 밖이므로 이 자산은 IA-OI-08의 **구문 census 부분만** 충족하며 전역 정책이나 sanitizer 승인 근거가 아니다.

### 10.7 strict parser/serializer 계약

승인 후 각 화면은 하나의 typed schema가 parse와 serialize를 함께 소유해야 한다.

1. schema에 없는 param은 읽지 않고 canonical URL에서 제거한다.
2. 허용 이름도 값 enum·형식·길이·중복 개수·상한을 검증한다.
3. default 값은 URL에서 생략해 canonical 표현을 하나로 만든다.
4. param 순서를 결정적으로 직렬화해 cache·snapshot·공유 비교를 안정화한다.
5. repeated param, array syntax, mixed case, Unicode confusable, double encoding을 fail-closed로 처리한다.
6. route 이동과 redirect는 allowlist 교집합만 전달한다.
7. 오류 telemetry에는 raw param/value를 남기지 않고 `forbidden_param_removed` 같은 coarse code만 기록한다.
8. SSR/RSC와 client hydration이 같은 parser를 사용해 초기 tab/page가 뒤집히지 않게 한다.

현재 `use-log-url-state`의 unknown query 보존 테스트는 `PD-UX-002` 승인 시 의도적으로 red가 되어야 한다. 그 뒤 unknown 제거, 검색어 비보존, 정상 `cat/page` 복원, Back/refresh를 함께 green으로 만든다. 전역 parser는 별도 decision과 census 전에는 이 log 승인을 근거로 일괄 변경하지 않는다.

### 10.8 analytics 최소화

- production analytics는 이 문서로 승인되지 않는다.
- IA 연구 event가 필요하면 [제품 brief의 allowlist](ui-ux-modernization-brief.md#14-최소-analytics-event-정책)를 따르고 raw URL/query를 보내지 않는다.
- destination은 raw route가 아니라 승인된 coarse `capabilityId`를 사용한다.
- user/menu/record ID, IP, free text, response, organization, exact timestamp는 금지한다.
- 역할은 재식별 가능한 세부 직함이 아니라 승인된 coarse cohort로만 기록한다.
- allowlist 밖 필드는 ingest에서 거부하며 client가 보내지 않는 것만으로 보호를 끝내지 않는다.

## 11. IA 연구 프로토콜

### 11.1 연구 질문

1. 각 역할이 내부 코드·조직 용어 없이 critical task를 어떤 말로 부르는가?
2. 어떤 capability를 함께 묶고, 무엇을 별도 관리 영역으로 인식하는가?
3. role별 tree가 다를 때도 cross-role handoff 목적지를 예측할 수 있는가?
4. alias/hub/tab 구조가 같은 결과의 중복처럼 보이는가, 독립 capability로 이해되는가?
5. keyboard, screen reader, zoom/touch 환경에서 같은 정보 scent와 현재 위치를 얻는가?
6. 민감 검색 상태가 공유되지 않는 이유와 안전한 공유 대안을 이해할 수 있는가?

### 11.2 participant cohort와 표본

모집은 직함보다 최근 실제 과업과 권한을 기준으로 한다.

| Cohort | 포함 | full 연구 권고 | 모집 제한 시 최소 formative |
|---|---|---:|---:|
| 일반 인증 사용자 | 업무·협업·게시·설문 경험자 | open sort 12~15, closed/tree 20+ | round당 5 |
| 콘텐츠/업무 담당 | 게시판·설문·승인 생성/처리 경험자 | open sort 12~15, closed/tree 20+ | round당 5 |
| 사용자·콘텐츠 관리자 | 사람·권한·메뉴·콘텐츠 운영 경험자 | open sort 12~15, closed/tree 20+ | round당 5 |
| 감사·운영 담당 | 로그·개인정보·상태 판단 경험자 | open sort 8~12, closed/tree 15+ | round당 5 |
| adopter reviewer | 파생 제품 profile/운영 책임자 | stakeholder sort 6~10 | 3~5 expert walkthrough |

위 표본은 purposive/nonprobability 모집이므로 모집단 대표성을 자동 보장하지 않는다. 역할별 raw 분자/분모와 불확실성을 먼저 보고하고 서로 다른 cohort를 평균내지 않는다. Wilson interval을 병기할 수는 있지만 이는 recruited sample 안의 **탐색적 구간**이며 확률표집 모집단 신뢰구간으로 표현하지 않는다. 최소 formative만 수행하면 백분율을 사업 효과로 일반화하지 않고 반복 설계용 증거로만 쓴다.

open sort 참가자는 원칙적으로 closed sort/tree test의 confirmatory 표본에서 제외해 독립 holdout을 만든다. 희소 전문 역할 때문에 재사용하면 학습·기억 효과를 기록하고 closed/tree 결과를 `exploratory`로 강등하며, G1 전에 fresh participant로 핵심 task를 다시 확인한다.

접근성 조건은 별도 cohort로 격리하지 않는다. 각 주요 cohort에 keyboard-only, screen reader, 확대/reflow, touch 또는 alternative input 사용자를 가능한 범위에서 포함하고 accommodation을 참가자가 선택하게 한다. 실제 모집이 불가능하면 AT expert review를 별도 evidence type으로 기록하되 사용자 검증으로 표현하지 않는다.

### 11.3 카드 준비

- 119 route 문자열을 그대로 119장으로 주지 않는다. capability manifest의 primary task를 바탕으로 **사용자가 이해할 수 있는 결과 단위**로 카드를 만든다.
- 한 카드에 action 하나와 완료 결과 하나를 둔다. 예: “사용자 권한을 변경하고 적용 결과 확인”.
- `admin`, `system`, `uss`, class/table 이름과 기존 group을 카드 label에서 숨겨 anchoring을 줄인다.
- demo/unavailable capability는 별도 상태 표식 없이 먼저 분류하게 하지 않는다. 실제 top task 후보와 혼동을 막기 위해 연구 질문에 따라 별도 round에서 상태 이해를 시험한다.
- 역할에 수행 불가능한 카드를 억지로 주지 않는다. cross-role handoff 카드는 “누가 시작/누가 이어받는지”를 함께 묻는다.
- 카드 set, source capability IDs, 제외 사유, randomized order와 protocol version을 보존한다. 실제 콘텐츠·개인정보는 사용하지 않는다.

### 11.4 Round 1 — open card sort

1. 최근 실제 과업 맥락을 짧게 확인하되 기존 메뉴 이름을 먼저 보여 주지 않는다.
2. 역할별 30~50개 이하의 capability card를 제공한다. 피로가 예상되면 의미 있는 block으로 나누되 같은 카드를 중복 집계하지 않는다.
3. 참가자가 자유롭게 group을 만들고 이름을 붙이며 “해당 없음/모름/다른 역할” pile을 허용한다.
4. think-aloud는 선택 사항으로 하고 발화가 sorting을 방해하면 사후 probing으로 전환한다.
5. 결과는 item×group 원자료, participant label, split/merge 이유와 모순을 기록한다.
6. similarity matrix와 label frequency는 패턴 탐색에 사용하되 낮은 표본의 dendrogram을 정답으로 선언하지 않는다.
7. cohort 간 같은 단어의 의미가 다르면 하나로 평균내지 않고 profile/role variant 후보로 남긴다.

**Round 1 종료 조건:** 반복되는 cluster·label 후보, 갈등 항목, role-specific item, 연구에서 누락된 capability가 정리돼 대안 tree를 만들 수 있다. 합의율 하나로 종료하지 않는다.

### 11.5 Round 2 — closed card sort

1. open sort에서 나온 용어로 대안 A/B/C의 group을 만들고 기존 구조를 무조건 control 정답으로 두지 않는다.
2. card 순서와 대안 제시 순서를 counterbalance한다.
3. “어디에도 맞지 않음”, “둘 이상에 속함”, “이 용어를 모름” 선택을 허용해 강제 성공을 막는다.
4. role별 misplaced rate, ambiguous placement, group label 이해와 cross-role disagreement를 측정한다.
5. security/privacy reviewer는 민감 capability label이 권한 없는 cohort에게 노출되는지 별도 기록한다.
6. open sort와 다른 holdout participant를 사용한다. 재사용이 불가피하면 결과를 confirmatory threshold에 쓰지 않는다.

**Round 2 종료 조건:** tree-test 후보는 각 critical card가 하나의 primary home을 갖고, secondary cross-link가 필요한 항목과 역할별 숨김이 명시돼야 한다.

### 11.6 Round 3 — role-filtered tree test

실제 visual design과 검색을 제거한 text tree로 다음 후보 task를 수행한다. task에는 목표 menu label이나 route 이름을 넣지 않는다.

| Task ID | 역할 | scenario 후보 | 성공 node |
|---|---|---|---|
| IA-T01 | 일반 사용자 | 오늘 제출해야 할 업무 보고를 작성한다. | 승인된 업무·보고 capability |
| IA-T02 | 일반 사용자 | 참여 가능한 설문에 응답하고 제출 여부를 확인한다. | 설문 참여 capability |
| IA-T03 | 콘텐츠 담당 | 게시판을 만들거나 게시 정책을 변경한다. | admin content operation capability |
| IA-T04 | 사용자 관리자 | 특정 synthetic 사용자의 권한을 변경하고 결과를 확인한다. | people/access management capability |
| IA-T05 | 감사 담당 | synthetic 로그인 사건의 감사 근거를 찾는다. | log/audit capability |
| IA-T06 | 승인자 | 들어온 요청을 검토하고 반려 사유를 남긴다. | approvals processing capability |
| IA-T07 | 겸임 역할 | 일반 업무에서 관리 센터로 이동한 뒤 다시 원래 업무로 돌아온다. | 올바른 role context + return |
| IA-T08 | 일반 사용자/관리자 | 통합 검색으로 권한에 맞는 업무·게시글·사용자를 찾는다. | role별 live source만; unavailable/demo 결과·관리자 label/count 비노출 |

각 task는 다음을 수집한다.

- first click와 first-click success
- 최종 success (`direct`, `indirect`, `fail`)
- path, backtrack 수, depth와 선택 시간
- 잘못 노출된 node 또는 기대했지만 보이지 않은 node
- label confidence와 사후 이유

text tree test는 information scent와 hierarchy만 검증한다. nav landmark, `aria-current`, expand/collapse, focus, reflow는 검증할 수 없으므로 다음 별도 round를 둔다.

### 11.7 Round 4 — interactive prototype/실제품 AT task

승인 후보를 keyboard-operable interactive prototype 또는 실제 shell에 구현해 다음을 실행한다.

- keyboard-only로 skip link→primary nav→current node→sibling→main heading 이동
- screen reader로 nav landmark 이름, group 펼침 상태, current page, route 전환 announcement 확인
- mobile drawer의 focus trap, background scroll lock, trigger focus return
- 200% text와 400% zoom/320 CSS px에서 메뉴·현재 위치·primary action 보존
- forced colors와 reduced motion에서 focus/state 의미 보존
- role 전환 또는 synthetic cohort별 HTML/RSC/API payload에 unauthorized node·label·count 0
- `/search` API 실패가 0건으로 위장되지 않고 USER에게 admin 사용자 결과·demo shortcut이 노출되지 않음

실제 AT/version, browser/OS, viewport, task outcome과 evidence를 기록한다. expert AT review는 사용자 수행과 별도 evidence type으로 남긴다.

### 11.8 승인 threshold 기본안

threshold는 연구 전에 제품 소유자가 승인해야 한다. 결과를 본 뒤 낮추지 않는다.

| Metric | 권고 gate | 해석 제한 |
|---|---|---|
| critical task unassisted tree success | 역할별 ≥ 80% | holdout full sample의 내부 gate. raw n/N과 탐색적 interval을 함께 보고 모집단 수치로 일반화하지 않음 |
| critical task first-click success | 역할별 ≥ 75% | first click만 높고 최종 실패하면 통과 아님 |
| directness | 성공 중 direct path ≥ 70% | 합리적 cross-link 경로는 별도 분류 |
| forbidden exposure | 권한 없는 critical capability 노출 0 | label/count만 보여도 exposure로 기록 |
| critical dead-end | 0 | back/escape 없는 leaf, alias loop 포함 |
| baseline regression | 고정 -5%p 비열등 gate 없음 | 사전 MDE·power·할당·충분한 표본 설계가 승인된 경우만 정량 gate; 아니면 새 반복 실패 pattern을 정성 hold/retest guardrail로 사용 |
| AT blocker | 핵심 task를 막는 keyboard/SR/reflow blocker 0 | 자동 axe 결과로 대체하지 않음 |

모집 제한으로 역할별 5명만 수행하면 `4/5=80%`를 정밀한 모집단 성공률로 표현하지 않는다. 한 명의 severe privacy/authorization 노출이나 반복된 critical dead-end는 평균 성공률과 무관하게 block한다. threshold는 같은 task·tree를 보지 않은 holdout 표본에만 적용한다.

### 11.9 연구 개인정보와 artifact

- synthetic account·record·content만 사용한다.
- card-sort/tree-test 도구에 이름, 이메일, IP, 기관 세부, 실제 route query, record ID를 넣지 않는다.
- 참가자에게는 `pseudonymous study ID`를 부여한다. 모집·보상·철회·후속 연락 동안 identity key는 연구 data와 분리된 제한 저장소에서 최소 인원만 접근하고, 승인된 철회 가능 기간과 보상 완료 뒤 정해진 날짜에 파기한다. 난수 ID만으로 익명이라고 주장하지 않는다.
- screen/audio recording은 별도 동의와 삭제일이 있을 때만 수집한다.
- raw recording과 미가공 free text를 Git/issue/PR에 넣지 않는다.
- repository에는 de-identified aggregate, protocol/version, sample/deviation, counter-evidence와 decision link만 둔다.
- rare role·기관·세부 직함·AT 조합은 교차표로 공개하지 않는다. privacy owner가 최소 공개 cell을 사전 승인하고 작은 cell은 suppress/상위 cohort로 합친다. raw n/N은 제한 저장소에 두며 공개 aggregate가 역산되지 않게 한다.
- 직접 인용은 별도 동의와 quote-level 재식별 review를 거치며 희소 직무·기관 맥락을 제거한다.
- 외부 SaaS는 참가자가 입력한 값뿐 아니라 vendor가 자동 수집하는 IP, cookie, device/browser metadata, telemetry도 평가한다. DPA, data region, subprocessor, retention, access, export/delete와 계정 종료 후 삭제를 security/privacy가 승인하지 못하면 사용하지 않는다.

### 11.10 사용자 접근이 불가능할 때

UX, domain, security/privacy, accessibility reviewer가 독립적으로 cognitive walkthrough를 수행할 수 있다. 이 결과는 `expert-walkthrough`이며 다음을 확정할 수 없다.

- 실제 label 선호
- task 빈도·우선순위
- 사용자 tree success baseline
- 접근성 준수

명백한 duplicate alias 노출, forbidden query, keyboard dead-end 같은 결함은 수정 후보로 만들 수 있지만 대규모 IA rollout에는 제품 소유자의 제한 범위·가설·rollback 승인이 필요하다.

## 12. RACI와 승인 책임

`A`는 항목당 한 명이어야 한다. 아래 이름이 없는 역할은 자리표시자이며 승인으로 간주하지 않는다.

| 결정/활동 | Product owner | Product/IA owner | UX researcher | FE architecture | Domain owner | Security/privacy | Accessibility | DB/menu operator |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 대상 profile·critical role·top task 승인 | A | R | C | C | C | C | C | I |
| `PD-UX-001` 목표 IA | C | A | R | R | C | C | C | C |
| live menu 구조 + authority assignment + effective synthetic menu | I | C | I | R | C | C | I | A/R |
| 119 route capability/disposition | I | A | C | R | R | C | C | C |
| card sort/tree test 설계·수행 | C | A | R | C | C | C | C | I |
| `PD-UX-002` 로그 URL/privacy allowlist | C | C | C | R | C | A | C | I |
| 전역 URL producer/consumer census와 후속 decision | C | C | I | R | R | A | C | I |
| accessible navigation acceptance | I | C | R | R | C | C | A | I |
| ADR 작성·기술 계약 | A | R | C | R | C | C | C | I |
| menu/nav 구현 go/no-go | A | R | C | R | C | C | C | R |
| rollback 발동 | A | C | I | R | C | C | C | R |

`PD-UX-001`과 전체 현대화 go/no-go가 같은 사람일 수 있지만, 실제 승인 기록에는 각 결정의 accountable person과 범위를 따로 쓴다. `PD-UX-002`는 security/privacy owner가 로그 범위의 최종 책임을 가진다. 전역 URL follow-up은 새 pending decision이 실제 등록된 뒤 별도 scope와 accountable owner를 기록하며, 제품 편의를 이유로 denylist를 완화하지 않는다.

## 13. open input와 reviewBy

`T0`는 제품 소유자·IA owner·privacy owner가 지정되고 G1 decision workshop 날짜가 잡힌 날이다. 상대 기한은 계획용 SLA이며 현재 약속된 날짜가 아니다.

> **지명 기록 (2026-08-23, DEC-OPS-013)** — 단독 운영 기간의 세 owner 역할(Product owner·IA owner·Security/Privacy owner)은 저장소 소유자 **lkindo** 로 지명됐다. 승인 채널은 이 저장소의 PR 리뷰다.
>
> **워크숍 기록 (2026-08-23, ADR-0007)** — 같은 날 G1 decision workshop 이 개최돼 **T0 가 성립**했다. 결과는 [§14.3](#143-2026-08-23-g1-decision-workshop-기록): PD-UX-001 은 **참조-기본 범위로 accepted**(사용자 연구 없는 승인임을 accepted-risk 로 영구 기록), PD-UX-002 는 deferred. live census·연구·AT 증거 요건은 **기관 채택 시점의 재검증 의무로 이전**됐으므로, 아래 표에서 해당 입력들의 T0 기준 SLA 는 adoption-triggered 로 읽는다. route 별 disposition 은 일괄 승인되지 않았고 owner PR 리뷰로 개별 승인한다.

| ID | 필요한 입력 | 상태 | Owner | reviewBy/SLA | 차단 범위 |
|---|---|---|---|---|---|
| IA-OI-01 | 대상 기관/파생 제품/profile과 critical role | `received 2026-08-23 (참조 범위)` — 대상 제품 = 참조 구현 자체(ADR-0007). 기관별 입력은 채택 시점 재입력 | Product owner | T0 → adoption-triggered | 카드 set·목표 tree |
| IA-OI-02 | IA/product owner 실명과 승인 채널 | `received 2026-08-23` — lkindo, 채널=저장소 PR 리뷰(위 지명 기록). T0 는 워크숍 개최로 성립 | Product owner | T0 | `PD-UX-001` 전체 |
| IA-OI-03 | security/privacy owner와 로그 URL 분류 승인 | `partial 2026-08-23` — owner 는 lkindo 로 지명됨. 로그 URL 분류 **승인은 계속 blocked-input** | Product owner | T0 | `PD-UX-002` 전체 |
| IA-OI-03B | 전역 URL/privacy pending decision의 등록 여부·scope·owner | `blocked-input` | Product owner + security/privacy | G1 전 | redirect·login·locator·전역 parser |
| IA-OI-04 | live DB 접속과 `tb_menu_info` 구조 census artifact | `blocked-external` | DB/menu operator | T0+5 영업일 | duplicate/orphan 구조 후보 |
| IA-OI-04B | `tb_menu_crt_dtl` authority assignment + effective synthetic-user menu와 manifest join | `blocked-input` | DB/menu operator + FE architecture | T0+10 영업일 | 역할별 menu exposure·G1 |
| IA-OI-05 | 119 route의 capability role·owner·상태 | `open` | FE architecture + domain owners | manifest reviewBy 2026-10-31 이내, G1 전 | disposition·visibility |
| IA-OI-06 | adopter/end-user 모집·동의·보상 | `blocked-input` | Product owner + UX | T0+10 영업일 | card sort/tree test |
| IA-OI-07 | current IA baseline task/tree | `blocked-input` | UX researcher | 첫 tree test 전 | regression 판정 |
| IA-OI-08 | [generated URL-state census](../../config/ui-url-state-census.json)의 privacy·canonical·role/object authorization 분류와 외부 telemetry 검증 | `proposed` — 정적 구문 census 완료, 분류·승인은 `blocked-input` | Security/privacy + FE/domain | G1 전 | query·dynamic locator·redirect·login intent |
| IA-OI-09 | external alias 소비자·지원 기간 | `blocked-input` | Product/domain owner | disposition 승인 전 | permanent/sunset 결정 |
| IA-OI-10 | 지원 browser/device/AT와 accommodation | `blocked-input` | Accessibility owner | 모집 전 | accessible findability gate |
| IA-OI-11 | 비규범 119+2 disposition overlay schema와 exact/red/binding test | hybrid 잠정 방향은 hash-bound, overlay는 `proposed` — final 승인은 `blocked-input`. 웨이브 1(2026-08-23): 저위험 8건(demo-isolated 4·unavailable-hidden 2·retain-alias-permanent 2)을 owner PR 리뷰로 개별 `approved` 전이, 잔여 113건 `proposed`(ADR-0007 §Decision 4 채널) | FE architecture + product/IA | decision workshop 전 | 승인 completeness evidence |

owner나 reviewBy가 비어 있으면 완료로 닫지 않는다. 2026-10-31은 manifest의 현재 bounded review 기한이며 제품 승인 날짜가 아니다.

## 14. decision log와 ADR 전이

### 14.1 승인 회의 전에 채울 record

```yaml
decisionId: PD-UX-001|PD-UX-002|<registered-global-url-decision-id>
status: proposed|accepted|rejected|deferred
scope:
  productProfile: <value>
  releaseSha: <sha>
  routeManifestSha256: <hash>
evidence:
  liveMenuStructure: <artifact/hash or blocked>
  menuAuthorityAssignment: <artifact/hash or blocked>
  effectiveSyntheticMenus: <artifact/hash or blocked>
  dispositionOverlay: <artifact/hash or blocked>
  urlProducerConsumerCensus: <artifact/hash or blocked/not-in-scope>
  researchProtocolVersion: <version>
  participantSummary: <redacted counts by cohort>
  findings: []
optionsConsidered: []
decision: <exact normative wording>
exceptions: []
acceptanceThresholds: []
rollbackTriggers: []
owner: <named accountable person>
approvers:
  - role: <role>
    name: <name>
    approvedAt: <timestamp>
reviewBy: <date>
finalAcceptanceRecord: <ADR-0004와 구분되는 final acceptance record link; only after creation>
```

원시 사용자 session, 녹화, free text, DB dump를 decision log에 붙이지 않는다. aggregate evidence와 보존 위치/삭제일만 연결한다.

### 14.2 최종 승인 제안 문구 — exact IA에는 아직 accepted 아님

**`PD-UX-001` 제안 — ADR-0004가 방향만 잠정 채택**

> 공통 reference의 기본 내비게이션은 과업 중심 영역과 역할 제한 관리 센터를 결합한다. 첫 migration에서는 canonical URL을 유지하고 label/group/order/visibility와 alias를 분리한다. 정확한 target tree와 profile overlay는 role별 card sort/tree test 및 119 route disposition을 통과한 버전만 채택한다.

**`PD-UX-002` 제안**

> 로그 화면 URL에는 typed allowlist가 승인한 비민감·공유 가치·복원 가치 상태만 둔다. 초기 allowlist는 category와 bounded page이며 default/unknown은 canonicalize한다. 로그 검색의 개인정보, IP, 자유 검색어, 응답/콘텐츠, record identifier와 exact 조사 상태는 URL·client log·analytics에서 금지하고 memory 또는 승인된 POST 검색을 사용한다.

### 14.3 2026-08-23 G1 decision workshop 기록

참조 구현에는 운영 DB·실사용자가 구조적으로 부재해 원 G1 증거 요건이 영구 미충족임이 상정됐고, [ADR-0007](../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md)이 G1을 참조-기본(reference-default) 범위로 재정의했다. 원 요건은 기관 채택 시점의 재검증 의무로 이전됐다.

```yaml
decisionId: PD-UX-001
status: accepted            # 참조-기본 범위 한정 — exact tree/disposition 일괄 승인 아님
scope:
  productProfile: reference-default (기관 미지정 — 채택 시 재검증)
  releaseSha: 02a4aaae1
  routeManifestSha256: 51e44c78d112e95d1ac68a5063a4f5e46f8e64f26b67ef073e268d50e0193ffd
evidence:
  liveMenuStructure: structurally-absent → 채택 시점 의무로 이전(ADR-0007)
  menuAuthorityAssignment: structurally-absent → 채택 시점 의무로 이전(ADR-0007)
  effectiveSyntheticMenus: blocked (IA-OI-04B)
  dispositionOverlay: config/ui-navigation-disposition-proposal.json (state=proposed 유지)
  urlProducerConsumerCensus: config/ui-url-state-census.json (분류·승인은 PD-UX-002 잔여)
  researchProtocolVersion: 미수행 — accepted-risk(ADR-0007), 채택 시 §11.8 원 기준 적용
  participantSummary: 0 (참여자 없음 — 사실 그대로 기록)
  findings: []
decision: 하이브리드 IA(ADR-0004 방향)를 참조-기본 IA로 승인한다. route별 disposition은
  본 결정으로 일괄 승인되지 않으며 owner PR 리뷰로 개별 승인한다(ADR-0007 §Decision 4).
exceptions: [사용자 연구 미수행 — accepted-risk 영구 기록]
acceptanceThresholds: [채택 시점 재검증에서 §11.8 원 기준 적용]
rollbackTriggers: [채택 기관 재검증에서 hybrid 구조가 §11.8 기준 미달 시 참조-기본 IA 재심의]
owner: lkindo (DEC-OPS-013)
approvers:
  - role: Product owner · IA owner · Security/Privacy owner
    name: lkindo
    approvedAt: 2026-08-23
reviewBy: 기관 채택 시점 (adoption-triggered)
finalAcceptanceRecord: ../02-architecture/decisions/ADR-0007-reference-default-ia-approval.md
```

```yaml
decisionId: PD-UX-002
status: deferred
decision: 분류는 면제가 아니라 수행 대상이다 — URL-state census 523 record의 프라이버시
  분류 초안 작성을 별도 태스크로 선행한 뒤 승인 회의를 다시 연다.
owner: lkindo (DEC-OPS-013)
reviewBy: 분류 초안 완성 시
```

**별도 전역 URL follow-up 제안 — pending registry 미등록**

> 모든 route의 query·dynamic locator·redirect·login intent는 전체 producer/consumer census와 화면별 typed allowlist를 가진다. public locator, authenticated non-secret locator, bearer handle, memory/server selection을 구분하고, forbidden 값은 navigation·request·referrer·log·analytics 전체에서 차단한다. 이 결정은 `PD-UX-002` 승인으로 대체하지 않는다.

각 문구에 승인자·날짜·scope·예외·근거가 붙고 final acceptance record가 생성되기 전에는 해당 pending decision 상태를 변경하지 않는다. ADR-0004는 이 조건을 대신하지 않는다. 전역 제안은 pending ID 등록 전에는 승인 대상으로도 취급하지 않는다.

### 14.3 헌법 개정 판단

현재 [frontend UX constitution](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)의 제1조는 중대한 IA 변경에 사용자·과업·baseline·검증을 요구하고, 제4조는 비민감 URL allowlist와 민감 상태 격리를 이미 규정한다. 접근성·상태 진실성 규범도 이 패키지의 상위 원칙을 제공한다.

따라서 **Task 1.1을 위해 추가 헌법 개정을 권고하지 않는다.** route disposition schema, label tree, query enum, history 동작은 배포 맥락에 따라 바뀌는 실행 계약이므로 이 문서와 final acceptance record/테스트가 소유하는 편이 정본 중복을 줄인다. 연구 결과가 “canonical route와 nav node의 분리를 모든 프로젝트에 영구 강제해야 한다”는 새 불변식을 입증할 때만 별도 헌법 개정안을 제안한다.

## 15. 승인 수용 기준

### 15.1 `PD-UX-001` acceptance

- exact release SHA의 route contract가 119 implementation route를 검증한다.
- page 101, page redirect 5, config-shadowed redirect 13과 external alias 2의 차이가 review set에 보존된다. 수치가 바뀌면 문서가 아니라 current manifest를 기준으로 다시 승인한다.
- live `tb_menu_info` 구조, `tb_menu_crt_dtl` authority assignment, effective synthetic-user menu가 manifest와 join돼 broken/duplicate/parent-child/orphan/sub-route/hidden과 실제 노출을 구분한다.
- pre-decision schema/gate가 119개 source route와 2개 external alias를 별도 schema로 exactly once 검증하고 red/binding fixture를 통과한다.
- active/user-visible route의 authorization, privacy, effective menu exposure, primary capability, state와 canonical target이 검증된다. owner+reviewBy 예외는 격리된 비활성/demo route의 비보안 label/profile에만 허용한다.
- independent holdout의 critical role top task와 대안 tree가 사전 threshold를 만족하고 counter-evidence가 기록된다.
- USER-visible admin-prefix route 25개가 capability/API/label 단위로 검토된다.
- alias는 canonical nav node 하나로 수렴하고 redirect/deep-link/back/focus 계약이 실행 검증된다.
- `/search`가 role별 live source만 제공하고 API 실패≠0건, USER admin result/label/count 0, demo shortcut 비노출을 증명한다.
- interactive prototype/실제품 AT task에서 접근성 blocker, HTML/RSC/API forbidden exposure, critical dead-end가 0이다.
- 제품/IA owner와 제품 소유자의 명시 승인 및 ADR-0004와 구분되는 final acceptance record가 있다.

### 15.2 `PD-UX-002` acceptance

- log route별 typed allowlist와 denylist가 승인돼 parser/serializer의 단일 정본이 있다.
- log의 unknown param, repeated/invalid `cat/page`, free text, PII, IP, response, record ID, exact 조사 filter fixture가 red→제거/거부 green으로 증명된다.
- 정상 `cat/page`의 refresh/share/canonicalization이 실행 검증된다.
- log URL뿐 아니라 client log, analytics, referrer와 backend GET 검색 노출까지 data flow를 검토한다.
- 로그 검색어·민감 filter의 memory/POST 대체가 refresh·Back·상세 복귀에서 안전하게 작동한다.
- privacy/security owner의 **로그 scope** 명시 승인, 예외·reviewBy·sunset과 accepted ADR이 있다.

### 15.3 전역 URL/privacy follow-up acceptance

- pending decision ID, scope, accountable owner와 영향 범위가 실제 registry에 등록된다.
- navigation URL과 request/telemetry URL producer/consumer census가 non-empty exact population과 unresolved parser failure를 fail-closed로 검증한다.
- 11개 dynamic route와 정적 query consumers/producers, 15개 config redirect, 5개 page redirect, proxy/login intent가 모두 disposition된다.
- 15개 config redirect의 Next query merge를 재현하는 negative fixture가 red이고 sanitizer/canonicalizer 뒤 forbidden·unknown·repeated·encoded query가 0이다.
- login intent는 canonical role-allowed target만 복원하고 API/WS/login loop, admin escalation, query/fragment/dynamic locator와 encoding 우회를 거부한다.
- locator 유형별 authorization, TTL/referrer/cache/log, Back/refresh/share 계약이 승인된다. hash/base64/opaque만으로 민감도 승격은 없다.
- unauthorized capability ID·label·count와 forbidden 값이 HTML/RSC/API/referrer/CDN·proxy·app log/analytics에서 0이다.
- security/privacy owner의 전역 scope 명시 승인과 accepted ADR이 있다.

### 15.4 현재 판정

| Gate | 상태 | 이유 |
|---|---|---|
| provisional architecture direction | `accepted-provisional-direction` | ADR-0004가 대안 C를 prototype/research 기본값으로 선택했으며 URL·consumer·route disposition은 바꾸지 않음 |
| decision package 완결성 | 내부 초안 완료 | 선택지·잠정 방향·절차·privacy·research·RACI·rollback이 정의됨 |
| `PD-UX-001` | `blocked-input` | 잠정 방향 외 exact tree의 owner, menu authority/effective exposure, holdout 연구, 119+2 승인 없음 |
| `PD-UX-002` | `blocked-input` | log privacy owner와 `cat/page` allowlist 승인 없음 |
| 전역 URL/privacy follow-up | 미등록 `blocked-input` | 정적 구문 census는 생성됐지만 pending ID·owner·privacy/authorization 분류·외부 telemetry·locator/redirect/login runtime 계약과 승인 없음 |
| G1 | 미통과 | manifest 119/119 decision-safe false, menu exposure unverified |
| menu/generator migration | 금지 | IA와 URL 결정 및 ADR 전에는 실행하지 않음 |

## 16. 구현 wave와 rollback

### 16.1 승인 후 wave

1. **Wave IA-0 — final accepted binding:** pre-decision overlay/schema/exact-red gate를 final acceptance evidence에 결속하고 실제 nav consumer가 accepted artifact만 읽게 한다. ADR-0004만으로 consumer를 활성화하지 않는다. scope가 승인된 strict URL parser binding을 추가하며 메뉴 데이터는 바꾸지 않는다.
2. **Wave IA-1 — alias 정규화:** 새 내부 link를 canonical로 바꾸고 redirect chain/query/history를 검증한다. alias 자체는 아직 삭제하지 않는다.
3. **Wave IA-2 — 일반 사용자 pilot:** 한 complete journey의 label/group/order/visibility만 profile flag 아래 적용한다. URL은 유지한다.
4. **Wave IA-3 — 관리 센터 pilot:** 사람·접근 또는 운영·감사 중 하나를 선택해 role·forbidden exposure·AT task를 검증한다.
5. **Wave IA-4 — menu DB migration:** live schema와 승인된 menu IDs를 다시 조회하고 별도 L2 DB task/rollback migration으로 적용한다.
6. **Wave IA-5 — 확장:** 3~5 route 또는 complete process 단위로 확대하며 매 wave tree/task baseline을 재검증한다.
7. **Wave IA-6 — alias sunset:** 사용량과 외부 소비자 지원 정책이 확인된 temporary alias만 별도 승인으로 제거한다.

URL migration, menu data migration, visual component migration은 rollback 경계가 다르므로 한 배포에 억지로 묶지 않는다.

### 16.2 rollback trigger

- critical task success가 승인 baseline보다 허용 폭 이상 악화
- 권한 없는 역할에 menu label/count/action 노출
- 401/403가 empty/0건으로 보이거나 USER source가 admin target으로 silent 이동
- bookmark/deep-link/Back/refresh/로그인 복귀 파손
- forbidden URL/query/referrer/log/analytics 값 관측
- keyboard/SR/reflow에서 primary navigation 또는 복귀 불가
- authority/effective-user live menu와 manifest join의 duplicate/broken/unresolved 증가
- demo/unavailable capability가 live처럼 노출

### 16.3 rollback 방법

- nav label/group/order/visibility는 versioned profile/menu snapshot으로 이전 승인본을 복원한다.
- URL은 첫 wave에서 유지하므로 대부분의 IA rollback은 route code rollback 없이 가능해야 한다.
- 새 canonical link를 되돌리더라도 inbound alias는 compatibility window 동안 유지한다.
- DB menu 변경은 적용 전 live schema/version precondition과 row hash를 확인하고 menu row뿐 아니라 authority assignment snapshot을 최소·암호화된 운영 증거로 보존한다. rollback은 임의 DML이나 추정 역연산이 아니라 검토된 forward compensating migration으로 수행한다. transaction/부분 실패를 주입해 원자성을 확인하고, 완료 후 119 route join·authority assignment·synthetic cohort effective menu의 exact before/after diff를 named DB operator와 reviewer가 확인한다.
- privacy leak가 있으면 feature flag를 기다리지 않고 offending navigation/query/analytics 전송을 차단한다. 그 다음 browser/cache, CDN·proxy·app/access log, analytics/SaaS, support artifact의 위치·보존기간·접근자를 inventory한다.
- 유출 artifact는 무조건 삭제하지 않는다. incident owner가 legal/forensic hold와 개인정보 최소화를 판정해 격리·접근 통제·보존 timeline을 정하고, 노출 범위와 통지 의무를 평가한다. 삭제가 승인되면 provider deletion, cache invalidation, bearer handle/credential rotation과 삭제 확인 증거를 남긴다.
- containment 뒤 forbidden/repeated/encoded query와 RSC/API label leakage negative test를 추가하고 같은 source의 재발 0을 확인한다.
- rollback 후 실패한 연구·실행 증거를 숨기지 않고 decision log에 scope·원인·재개 조건을 남긴다.

## 17. 승인 체크리스트

### Product/IA owner

- [ ] 대상 product/profile/critical role이 명시됐다.
- [ ] live menu 구조, authority assignment, effective synthetic-user menu와 119+2 disposition을 검토했다.
- [ ] URL을 유지한 채 label/group/order/visibility를 분리하는 안을 승인했다.
- [ ] card-sort/tree-test protocol, threshold와 결과를 승인했다.
- [ ] alias·child·demo·unavailable의 메뉴 노출 원칙을 승인했다.

### Security/privacy owner

- [ ] `PD-UX-002`의 로그 scope와 `비민감 + 공유 가치 + 복원 가치` 3조건을 승인했다.
- [ ] 로그의 PII/IP/free text/response/record ID denylist와 `cat/page` allowlist를 승인했다.
- [ ] 전역 URL follow-up은 별도 pending ID·owner·scope가 생기기 전 승인하지 않았다.
- [ ] 전역 decision이 등록됐다면 query/dynamic locator/login intent/redirect/referrer/server log/analytics census를 검토했다.
- [ ] external SaaS의 vendor-generated IP/device telemetry, DPA/region/subprocessor/삭제 계약을 검토했다.
- [ ] strict allowlist red test와 incident containment·legal/forensic 보존·provider deletion/negative retest를 승인했다.

### Architecture/domain/accessibility reviewers

- [ ] shell access와 capability authorization을 혼동하지 않았다.
- [ ] primary action·data source·상태·owner가 evidence와 맞다.
- [ ] canonical/alias/deep-link/back/history 계약이 실행 가능하다.
- [ ] nav landmark, current state, expand/collapse, focus return, zoom/AT task가 포함됐다.
- [ ] server projection으로 unauthorized node·label·count가 HTML/RSC/API payload에 없다.
- [ ] menu DB/generator 변경이 accepted decision 뒤의 별도 task로 분리됐다.

### 최종 상태 전이

- [ ] 승인자 이름·날짜·scope가 decision log에 있다.
- [ ] ADR-0004와 구분되는 final acceptance record가 생성되고 관련 manifest/계약이 같은 변경 세트에 있다.
- [ ] 그 이후에만 해당 scope의 `PD-UX-001/002` pending 행을 제거한다. 전역 후보는 실제 등록·승인된 별도 ID로 처리한다.
- [ ] 사용자 결과가 없거나 조건부이면 그대로 `unknown`/예외로 남긴다.

---

*현재 상태: ADR-0004로 hybrid를 검증용 잠정 방향으로 선택 · overlay는 계속 `proposed`, `acceptedDecision=null` · 119+2 review와 `PD-UX-001/002`는 `blocked-input` · 전역 URL 후속 결정은 미등록 `blocked-input` · menu/generator consumer 변경 없음*
