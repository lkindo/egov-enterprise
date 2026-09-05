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

### 2.2 `resource-identifier` (stateItem 46) — 조건부 승인 권고

`bbsId` · `pstSn` · `nttId` · `srvySn` · `groupId` · `[id]`

**권고 `dataClass`: `server-issued-identifier`**

근거:

1. 값은 항상 목록·검색 결과에서 나오며 사용자가 만들어 내지 않는다. **[조사]**
2. `bbsId` 는 화면 상태가 아니라 **DB 메뉴(`modern_route`)가 지목하는 라우팅 키**다.
   2026-09-04 운영(OCI) 실측에서 메뉴 84행 중 쿼리 보유 12행, distinct 키는 `tab` 1종이었다. **[직접 확인 — 이전 세션]**
3. 접근 통제는 URL 이 아니라 서비스 계층이 한다. **[조사]**

⚠ **서명 전에 반드시 확인할 것 둘.**

- **열거 억제가 없다.** 조사에 따르면 `RateLimitFilter` 기본 용량이 IP 당 분당 10,000 이라
  순차 IDENTITY 를 훑어도 차단되지 않는다. 즉 이 부류의 안전성은 전적으로 **객체 가드가
  있는가** 에 달려 있다. **[조사 — 미검증]**
- 조사가 "객체 가드 없음" 으로 지목한 목록에 **의도된 설계가 섞여 있다.** `SurveyService#getSurvey`
  는 가드가 없는 것이 맞지만 컨트롤러에 `@Authenticated` 가 붙어 있고 **DEC-OPS-010 이 설문 열람을
  인증 사용자에게 개방하기로 결정**한 것이다. **[직접 확인 — 오판 정정]**
  나머지 항목(`DeptJobService`·`CommunityService`·`OnlinePollService`·`SurveyResultService`)도
  같은 방식으로 **결정 이력을 먼저 확인**한 뒤 판단하라.

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

남는 132건은 `opaque` 61 · 타깃 미해소 약 53 · 경로에 `[computed]` 11 · 기타 7 이다.
**detector 를 더 파도 줄지 않는다** — 미해소의 지배적 형태가
`router.replace(query ? \`${pathname}?${query}\` : pathname)` 인데 해소해도 양쪽이 computed 라
`<computed>` → `opaque` 로 가기 때문이다.

따라서 **승인은 만료 해결책이 아니다.** 2026-12-31 에는 기한 연장 또는 URL 조립 방식 변경
(allowlist 헬퍼로 모아 정적 판정 가능하게)이 필요하다.

## 관련

- [승인 오버레이 설계](../02-architecture/url-state-approval-overlay-design.md)
- [URL-state 분류 초안](../01-product/url-state-classification-draft.md)
- [PD-UX-002](pending-decisions.md)
