# URL-state 부류 승인 근거 (owner 서명용 준비 자료)

> **지위**: 승인이 아니다. owner 가 `config/ui-url-state-approval.json` 의 `approvals` 를 채울 때
> 그대로 쓸 수 있도록 **근거를 모아 둔 것**이다. 서명은 owner 의 행위다.
>
> 준비 2026-09-05 · 대상 census 370 record / 부류 7개
>
> ⚠ 아래 근거 중 **[직접 확인]** 표시는 이 문서를 쓰며 명령으로 재현한 것이고,
> **[조사]** 는 병렬 조사에서 나와 교차 검증하지 않은 것이다. 서명 전에 후자를 다시 확인하라.

## 0. 승인이 무엇을 여는가

`reviewState` 를 `approved` 로 올리고 `approvals` 두 축을 채우면, **그 부류의 stateItem 만
가진 record** 가 `reviewBy` 만료에서 면제된다. 다른 부류가 섞인 record 는 그대로 만료된다
(부분 승인 누수 금지). 계약이 요구하는 것은 셋이다.

| 필드 | 요구 |
|---|---|
| `reviewer` | 명명된 사람 또는 책임 역할. 빈 문자열은 승인이 아니다 |
| `reviewedAt` | ISO 날짜 |
| `evidence` | **비어 있지 않은** 문자열 배열 |

⚠ 승인을 채우면 `ui-url-state-approval-contract.test.mjs` 의 마지막 테스트
("오버레이는 승인을 선언하지 않은 상태로 시작한다")가 **의도적으로 red** 가 된다.
그 테스트를 명시적으로 제거하는 것이 정상 절차이며, 그 커밋이 "여기서부터 승인이 존재한다" 를
이력에 남긴다.

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

### 2.1 `presentation-state` (stateItem 80) — 승인 권고

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

### 2.3 `search-input` (stateItem 5) — **보류 권고**

`q` · `searchWrd` · `searchCnd`

**승인하지 말 것을 권고한다.**

이유:

1. **프록시·WAF·CDN 의 쿼리스트링 로깅 여부가 미확보다.** 이 축 없이 `privacyReview=verified` 를
   선언하면 **"모르는 것" 을 "안전한 것" 으로 바꾸는 것**이고, 그것은 `opaque` 부류에 대해
   이 오버레이가 막고 있는 조작과 같은 방향이다.
2. `q` 는 **설계상 임직원 성명을 담는다** — `/search` 가 "게시글 제목, 임직원 성명, 메뉴 이름을
   찾습니다" 라고 고지하고 백엔드도 성명 부분일치 조회를 한다. `searchCnd=2` + `searchWrd`
   조합도 마찬가지다. **[조사]**
3. 브라우저 히스토리·북마크는 구조적으로 남고 저장소가 지울 수 없다.

⚠ **보류 비용은 record 5건뿐이다.** 그 5건은 전부 순수 `search-input` 이라 다른 부류와 섞이지
않으므로, 보류해도 다른 부류의 승인을 막지 않는다. **[직접 확인]**

⚠ Q1(2026-09-04 owner 결정)이 "URL 유지" 를 확정한 것과 모순되지 않는다. Q1 은 **"주소창에
실린다" 는 사실의 승인**이지 데이터 등급 판정이 아니다.

### 2.4 `control-flag` (stateItem 8) — 승인 권고

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

`redirect` 의 위험은 별도로 기록해 둔다 — producer 하나(`admin/error.tsx`)가
`pathname + search` 를 통째로 실어 **이전 화면의 검색어를 로그인 URL 로 나른다**. **[조사]**

### 2.6 `opaque` (61) — 승인 불가

`reviewState: blocked-input` 으로 고정돼 있고 계약이 강제한다. census 가 "이게 뭔지 모르겠다"
고 표시한 것을 "안전하다" 로 승인하면 그것이 바로 이 오버레이가 막으려는 조작이다.

## 3. 승인해도 만료는 완전히 해소되지 않는다

| | 만료 시 red |
|---|---|
| 현재 | 259 |
| `search-input` 제외 3개 부류 승인 | 약 137 |
| 4개 부류 전부 승인 | 132 |

### ⚠ 2026-09-05 정정 — 이 절의 종전 서술 두 곳이 틀렸다

**정정 1 — "detector 를 더 파도 줄지 않는다" 는 전체로는 거짓이다.**
`opaque` 61건의 정확한 배분은 이렇다.

| 무엇이 필요한가 | 건수 |
|---|---|
| detector 만으로 닫힘 | **≥20 (33%)** |
| **코드 형태 변경**이 있어야 닫힘 | **27 (44%)** — copy-all `<unknown-source-query>` 19 + 그 downstream 8 |
| owner 정책 판단이 유일한 경로 | 14 (23%) — `next.config` redirect. Next 에 per-redirect 쿼리 차단 knob 이 없다 |
| 기타 | 2 (그중 1건은 주소창이 아니라 axios `paramsSerializer` — 범위 오탐) |

"원리적으로 닿지 않는다" 가 참인 것은 마지막 14건뿐이다. 27건은 무한이라서가 아니라
**copy-all 을 선택해서** 무한해진 것이다.

**정정 2 — "allowlist 헬퍼로 모으면 정적으로 키 이름이 드러난다" 는 형태에 따라 반대로 간다.**
현재 detector 는 `.set(key, …)`·`.get(key)` 의 키가 **인라인 단일 문자열 리터럴**이 아니면
무조건 `<computed>` 로 떨어뜨린다. 그래서 2026-09-04 Q2 에서 만든 **루프형** `buildListParams`
(`for (const key of LIST_PARAM_KEYS)`)는 copy-all 을 없앴는데도 opaque 를 **60 → 61 로 올렸다.**

즉 권고는 "헬퍼로 모아라" 가 아니라 **"키를 리터럴로 열거하는 헬퍼로 모아라"** 다.
루프형으로 19개 파일에 확장하면 opaque 가 오히려 는다.

---

따라서 **승인은 만료 해결책이 아니다.** 2026-12-31 에는 다음 중 하나가 필요하다.

1. 기한 연장(사유 필수)
2. detector 개선 — ≥20건, 저장소 안에서 가능
3. copy-all 27건을 **리터럴 키 열거 헬퍼**로 이행 — 형태 선택이 결과를 뒤집으므로 위 정정 2 를 먼저 읽어라
4. `next.config` redirect 14건의 쿼리 정책 — owner 판단

## 관련

- [승인 오버레이 설계](../02-architecture/url-state-approval-overlay-design.md)
- [URL-state 분류 초안](../01-product/url-state-classification-draft.md)
- [PD-UX-002](pending-decisions.md)
