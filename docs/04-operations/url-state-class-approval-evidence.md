# URL-state 부류 승인 근거와 현재 판정

> **지위**: 2026-09-05 owner 판정의 근거 기록. [`config/ui-url-state-approval.json`](../../config/ui-url-state-approval.json)은
> `class-governed` 상태의 **비규범 부류 컨테이너**이며 top-level 승인이나 단일 결정의 권위를 주장하지
> 않는다. 네 부류가 각각 `approved` 검토 기록을 가지고, `search-input`만 class-level `decisionRef`로
> [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md)에 결속한다.
>
> 확인 2026-09-05 · 대상 census 368 record / 부류 7개 · 승인 4개 / 미해결 3개
>
> 아래 **[직접 확인]**은 명령으로 재현한 근거이고 **[조사]**는 승인 당시 조사 기록이다.
> 재승인 시 현재 코드·설정과 외부 운영 토폴로지를 다시 확인한다.

## 0. 승인이 무엇을 여는가

`reviewState`가 `approved`이고 `approvals` 두 축이 완결되면, **그 부류의 stateItem만 가진
record**가 `reviewBy` 만료에서 면제된다. 다른 부류가 섞인 record는 그대로 만료된다
(부분 승인 누수 금지). 계약이 요구하는 것은 셋이다.

| 필드 | 요구 |
|---|---|
| `reviewer` | 명명된 사람 또는 책임 역할. 빈 문자열은 승인이 아니다 |
| `reviewedAt` | ISO 날짜 |
| `evidence` | **비어 있지 않은** 문자열 배열 |

계약은 승인된 부류 목록을 exact하게 동결하고, manifest 해시·비규범 top-level authority·부류별 근거·
selector가 어긋나면 fail-closed한다. `decisionRef`는 `search-input`에만 요구하며 다른 부류나 top-level로
번지면 red다. 새 이름이나 route는 기존 승인에 조용히 편입되지 않는다.

## 1. 모든 부류에 공통으로 적용되는 사실

이 세 가지는 부류와 무관하게 "값이 어디까지 새는가" 의 경계를 정한다.

| 사실 | 근거 | 확인 |
|---|---|---|
| 응답 헤더가 `Referrer-Policy: strict-origin-when-cross-origin` 이라 교차 출처 요청에 **쿼리스트링이 실린 Referer 가 나가지 않는다** | [next.config.ts:77](../../frontend/next.config.ts) | **[직접 확인]** |
| 프런트 소스에 서드파티 텔레메트리(Sentry·GA·PostHog·Datadog 등)가 **0건** | `grep -rniE "sentry\|gtag\|googletagmanager\|posthog\|datadog\|mixpanel" frontend/src` → 0 | **[직접 확인]** |
| 감사 로그는 `request.getRequestURI()` 를 적재한다 — **쿼리스트링을 저장하지 않는다** | [OperationalAuditInterceptor.java:83](../../api-server/src/main/java/nuri/api/interceptor/OperationalAuditInterceptor.java) | **[직접 확인]** |

⚠ **저장소 밖은 여전히 미확인이다.** 리버스 프록시·WAF·CDN 의 액세스 로그가 쿼리스트링을
기록하는지, 보존 기간이 얼마인지는 저장소가 답할 수 없다(census `limitations` 가 스스로
그렇게 적어 두었다). 브라우저 히스토리·북마크도 구조적으로 남고 저장소가 지울 수 없다.

## 2. 부류별

### 2.1 `presentation-state` (stateItem 80) — **승인됨 (2026-09-05)**

`page` · `tab` · `view` · `orderBy` · `startDate` · `endDate`

**권고 `dataClass`: `non-sensitive-presentation`**

근거로 쓸 수 있는 사실:

1. 이 부류 stateItem 전부가 census 상 `riskSignals` 0건이고, 걸쳐 있는 route 가 전부 `/admin`
   아래라 인증·역할 게이트 뒤에서만 발행된다. **[조사]**
2. `page` 는 소비자 전원이 정수 변환 + 하한 클램프를 한다(`Math.max(1, Number(...) || 1)` 계열). **[조사]**
3. `tab` 소비자 전원이 닫힌 열거형에 대조하고 불일치는 기본 탭으로 내린다 — **"존재하지만 못 보는 탭"
   과 "존재하지 않는 탭" 이 화면상 구분되지 않아 열거 오라클이 성립하지 않는다.** **[조사]**
4. `orderBy` 는 URL 에 **컬럼명을 싣지 않는다.** 화면은 추상 토큰 3개(`date`·`views`·`comments`)만
   제공하고 서버가 화이트리스트 `switch` 로 Q-클래스 경로에 매핑한다. **[조사]**
5. `startDate`·`endDate` 는 화면에서 타이핑할 수 없다(Popover 안 Calendar 두 개). **[조사]**
   그리고 2026-09-05 에 **URL 읽기 경로의 검증 부재를 고쳤다** — 종전에는 `?startDate=bogus` 가
   SSR 을 죽였다. 이제 `fromQueryDate` 가 왕복 검증으로 거른다. **[직접 확인 — 이 PR]**

⚠ 서명 전 확인할 것: 이 부류 안 6 record 는 census 가 `deny-until-reviewed` 로 매겨 두었는데,
그것은 **발견된 위험이 아니라 이름 화이트리스트 부작용**이다(`CANDIDATE_VIEW_STATE_NAMES` 에
`orderBy`·`startDate`·`endDate` 가 없을 뿐). 나머지와 뭉뚱그리지 말고 위 4·5 근거로 개별 판단하라.

### 2.2 `resource-identifier` (stateItem 46) — **승인됨 (2026-09-05)**

`bbsId` · `pstSn` · `nttId` · `srvySn` · `groupId` · `[id]`

**권고 `dataClass`: `server-issued-identifier`**

근거:

1. 값은 항상 목록·검색 결과에서 나오며 사용자가 만들어 내지 않는다. **[조사]**
2. `bbsId` 는 화면 상태가 아니라 **DB 메뉴(`modern_route`)가 지목하는 라우팅 키**다.
   2026-09-04 운영(OCI) 실측에서 메뉴 84행 중 쿼리 보유 12행, distinct 키는 `tab` 1종이었다. **[직접 확인 — 이전 세션]**
3. 접근 통제는 URL 이 아니라 서비스 계층이 한다. **[조사]**

### 2.2.1 승인 조건 검증 결과 (2026-09-05) — **승인됨**

조건은 "열거 억제 부재와 객체 가드 목록 확인" 이었다. 둘 다 검증했다.

**열거 억제는 없다.** `RateLimitFilter.java:63` 의 기본 용량이 IP·분당 10,000 이다. **[직접 확인]**
따라서 이 부류의 안전성은 전적으로 객체 가드에 달려 있고, 그 목록을 다음과 같이 확인했다.

**가드 목록은 이미 두 겹으로 존재한다 — 종전 서술 "읽기 census 없음" 은 틀렸다.**
- `SecurityAuthAnnotationLinterTest` 가 GET 인가 표면(route gate + `@PreAuthorize`)을 **해시로
  동결**한다. GET 이 늘거나 게이트가 바뀌면 red 다. **[직접 확인]**
- `authorization-policies.json` `serviceGuardPolicies` 에 **읽기 객체 가드 7건**이 등재돼 있다 —
  `getAddressBook`·`getPostDetail`·`getScrap`·`getSchedule`·`getSentMail`·`getWorkReport`·
  `getMemoReportList`. **[직접 확인 — 종전 "0건" 은 잘못된 필드를 본 측정 오류]**

**식별자 6종이 도달하는 읽기 엔드포인트 29개 중 26개는 가드가 확인됐다** — 게시판은 비밀글
owner-or-admin + 활성 게시판 술어, 주소록·스크랩은 PII IDOR 가드, 공통코드·투표·설문응답은
`/api/v1/admin/**` URL 게이트, 설문 열람 3종은 **DEC-OPS-010 의 의도된 개방**. **[조사 + 3건 직접 확인]**

**미판정 3건의 판정** — 인가 의미 변경(H3)이라 "가드가 없다" 만으로 결함이라 부르지 않고,
**형제 자원이 무엇을 하는가**와 **결정 이력이 무엇을 말하는가**로 갈랐다.

| 대상 | 판정 | 근거 | 처리 |
|---|---|---|---|
| 만족도 목록·평균·등록 | **결함** | 형제(댓글)는 `assertCommentAccess` 로 비밀글을 막는데 만족도만 `useYn` 만 거름. 문서가 약속한 "서비스 소유권 재검증" 이 조회에 없음 | **PR #548 에서 수정** |
| 커뮤니티 사용자 상세 | **결함** | 7ec5e25fd 가 목록에 적용한 논리("관리자는 전체를 봐야 하므로 사용자용 분리")가 상세에 글자 그대로 적용되는데 상세만 빠짐 | **PR #548 에서 수정** |
| 부서업무 상세 | **제품 결정** | 컨트롤러가 `'dept' 만 전체 열람으로 해석`, `미지정 시 전체가 나오면 [위험]하므로 기본값 mine` 이라 **스스로 문서화**. `deptId` 를 호출자가 고르게 한 설계라 타 부서 열람이 의도. 미지정 시 전체 노출이 의도인지는 어떤 DEC 도 말하지 않음 | **손대지 않음 — owner 결정으로 남김** |

**`[id]` 세그먼트 검증** — 10 라우트 중 6곳이 `Number.isSafeInteger` 로 검증하고 2곳
(`admin/community/[id]`·`boards/[id]`)은 세그먼트를 읽지 않는다. 검증 없이 읽는 2곳은
`scraps/selectScrapDetail/[id]` 와 `dept-job/selectDeptJobDetail/[id]`(내부 경로 redirect 통로)이며
둘 다 뒤에 소유자 가드 또는 정본 경로의 가드가 있다. **[직접 확인]**

⚠ **서명하지 않은 초안 문장** — 초안 §2.2 는 `srvySn` 을 "이 부류에서 유일한 사용자 타이핑,
`type="number" min={1}`" 이라 적었으나, 2026-09-05 grep 에서 `srvySn` 을 타이핑하는 입력 요소가
**0건**이었다. 확인되지 않은 문장은 승인 근거에 넣지 않았다.

### 2.3 `search-input` (stateItem 5) — **accepted-risk 승인됨 (2026-09-05)**

`q` · `searchWrd` · `searchCnd`

ADR-0009는 성명·사번·계정명 등 일반 개인정보를 포함할 수 있는 업무 검색어를 URL에 두는 잔여
위험을 명시적으로 수용했다. `privacyReview: accepted-risk`는 외부 노출 가능성이 없다는 뜻이
아니라, 검색 복원·공유·SSR 이점과 다음 제한을 함께 승인했다는 뜻이다.

1. 허용 키는 `q`, `searchCnd`, `searchWrd`뿐이며 unknown query를 일괄 전달하지 않는다.
2. 자격증명·쿠키·세션 비밀·인증/복구 토큰·주민등록번호 등 고유식별정보·금융·건강·생체정보·
   응답 원문을 의미하는 전용 URL field/state를 만들거나 일반 검색창에서 그런 입력을 요구·유도하지 않는다.
3. 검색어를 클라이언트 로그·분석 이벤트·오류 로그 payload에 복제하지 않는다.
4. URL은 인가 증거가 아니며 서버가 인증·역할·객체 소유권을 계속 판정한다.
5. 브라우저 이력·북마크, same-origin referrer, 저장소 밖 프록시·WAF·CDN 로그의 잔여 위험을
   알고 수용한다. 파생 제품은 운영 환경에 따라 더 좁은 정책을 택할 수 있다.

자유 입력의 의미는 클라이언트가 완전 판별할 수 없다. 따라서 사용자가 일반 검색창에 예상 밖의
자격증명·고위험 값을 직접 붙여 넣을 가능성도 accepted residual risk에 포함되며, 아래
`credential-name-signal` 검사는 전용 URL **key**의 신설만 차단한다. 이는 고위험 검색 용도의
승인이나 내용 기반 DLP 보장이 아니다.

이 census와 승인은 프런트엔드 내비게이션·검색 상태의 범위다. 당시 별도 API 계약이었던 만족도
삭제 `pswd` query는 이 승인의 근거가 아니며, 2026-09-05
[ADR-0011](../02-architecture/decisions/ADR-0011-retire-anonymous-satisfaction-password-proof.md)이 익명
비밀번호 증명과 함께 퇴역을 결정했다. 따라서 이 증거 자체를 저장소 전체 자격증명 URL 0건의
근거로 확대해석하지 않고, 백엔드 request-target 계약은 별도 게이트로 검증한다.

승인 selector는 다음 **census recordId 5건**을 exact하게 고정한다.

- `URL-204665E3AB9C4A`
- `URL-3E36A25946033C`
- `URL-A13AC14823B70F`
- `URL-E28F88902ADC75`
- `URL-E910532B42785F`

route-key binding도 다음 **3건**으로 제한한다.

| route | 키 | 구현 근거 |
|---|---|---|
| `/search` | `q` | server/client 검색 결과 복원 |
| `/admin/community/[id]` | `searchCnd`, `searchWrd` | `useSearchState` exact allowlist + `replace` |
| `/admin/community/boards/select-board-list` | `searchCnd`, `searchWrd` | `LIST_PARAM_KEYS` exact allowlist + `replace` |

같은 키를 쓰는 새 route는 자동 승인되지 않는다. 로그 목록이 검색어를 주소창에 동기화하지 않는
현행도 유지한다. 허용은 모든 화면에 URL 상태를 강제하는 의무가 아니다.

### 2.4 `control-flag` (stateItem 8) — **승인됨 (2026-09-05)**

`expired` · `auth_error`

**권고 `dataClass`: `enumerated-control-flag`**

근거:

1. producer·consumer 양쪽이 **리터럴 상수를 정확 일치 비교**한다 — `expired=true` / `=== 'true'`,
   `auth_error=unauthorized` / `=== 'unauthorized'`. 값 도메인이 실제로 코드에 고정돼 있다. **[조사]**
2. 두 값 다 **개인을 식별하지 않는다** — 세션이 끊겼다는 사실, 권한이 부족했다는 사실뿐이다.
3. 2026-09-04 에 두 값의 소비처를 신설했다(로그인 화면 만료 안내, 홈 권한 안내). 그 안내는
   **막힌 자원의 이름을 말하지 않는다** — 계약이 그 축을 고정한다. **[직접 확인 — 이전 세션]**

⚠ `redirect` 는 이 부류에서 **분리했다**(`path-intent`). 그 값 도메인은 라우트 전체라
`enumerated` 가 거짓이기 때문이다.

### 2.5 `path-intent` (6) · `hand-assembled-segment` (1) — 판정 보류

둘 다 `dataClass: indeterminate` 다. 스키마 enum 에 이들을 정직하게 가리키는 값이 없다
("내부 경로 intent", "사람이 조립한 세그먼트"). **어휘 확장 자체가 별도 판단**이므로 그 결정
전에는 승인하지 않는다.

`admin/error.tsx`는 2026-09-05에 `window.location.search` 전달을 제거해 로그인 URL에는
`pathname`만 싣는다. 따라서 이전 화면 검색어의 불필요한 복제 경로는 닫혔다. 다만 census의
`path-intent` 6건(페이지 redirect 4건과 proxy/LoginClient의 로그인 복귀 producer·consumer)은
허용 목적지·역할·loop·query merge 경계를 아직 하나의 typed 계약으로 닫지 않았으므로 승인하지
않는다. **[직접 확인]**

### 2.6 `opaque` (58) — 승인 불가

`reviewState: blocked-input` 으로 고정돼 있고 계약이 강제한다. census 가 "이게 뭔지 모르겠다"
고 표시한 것을 "안전하다" 로 승인하면 그것이 바로 이 오버레이가 막으려는 조작이다.

## 3. 현재 승인 영향과 남은 경계

2026-09-05 네 부류의 독립 승인 기록 직후 생성 census를 기준으로 한 실측은 다음과 같다.

| 지표 | 값 |
|---|---:|
| census record | 368 |
| 승인 부류 | 4 |
| 승인 selector로 완전히 덮인 state-bearing record | 119 |
| 그중 `search-input` 승인으로 추가된 record | 5 |
| 2027-01-01 시계에서 `reviewBy` 재승인 없이 발생하는 만료 red | 258 |

`119`는 승인 selector의 완전 포괄 record 수이고 `258`은 미래 시계의 만료 오류 수이므로 단순 합계로
census 총수를 계산하는 지표가 아니다. 종전 설계 단계의 가상 만료 수치는 과거 스냅샷이며 현행
만료 영향으로 사용하지 않는다.

승인되지 않은 부류는 `path-intent`, `hand-assembled-segment`, `opaque` 세 개다.

- `path-intent`: 내부 경로 의도에 맞는 데이터 분류와 query 보존 경계를 정한다.
- `hand-assembled-segment`: 허용 값·인코딩·traversal 방지 계약을 만든다.
- `opaque`: 합성 마커를 실제 키·경로로 해소하도록 detector나 코드 형태를 개선한다. 의미를 모르는
  상태에서 승인하지 않는다.

따라서 승인 자체는 만료 해결책이 아니다. 2026-12-31 전에 현재 코드와 운영 토폴로지를 재검증해
근거 있는 재승인·기한 갱신을 하거나, 남은 세 부류를 실제로 해소해야 한다.

## 관련

- [승인 오버레이 설계](../02-architecture/url-state-approval-overlay-design.md)
- [ADR-0009](../02-architecture/decisions/ADR-0009-controlled-url-search-state.md)
- [URL-state 분류 초안](../01-product/url-state-classification-draft.md)
- [PD-UX-002](pending-decisions.md)
