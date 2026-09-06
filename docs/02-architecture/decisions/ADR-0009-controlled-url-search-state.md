# ADR-0009 — 화면별 계약 아래 개인정보성 검색어의 URL 사용을 허용한다

**Status:** Accepted

**Date:** 2026-09-05

**Deciders:** lkindo (repository owner · security/privacy owner · frontend architecture owner)

**Partially supersedes:** [ADR-0003](ADR-0003-frontend-ux-modernization-principles.md) Decision §5 중 개인정보·민감 검색어의 URL 절대 금지 부분만

**Related:** [`DEC-OPS-029`](../../../.agent/memory/decisions.md), [프론트엔드 헌법 제4조](../../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md), [URL-state 승인 오버레이](../url-state-approval-overlay-design.md)

## Context

ADR-0003과 프론트엔드 헌법은 개인정보 또는 민감 검색어를 URL에 두지 않는 절대 규칙을 채택했다. 그러나 현재 제품은 다음 검색 경로를 의도적으로 제공한다.

- `/search?q=`는 게시글·메뉴뿐 아니라 임직원 성명을 검색하며, 서버와 클라이언트가 같은 URL 검색어를 사용해야 SSR과 첫 hydration 결과가 일치한다.
- 게시판의 `searchCnd=2&searchWrd=...`는 작성자 이름 검색을 지원하고, 공유·새로고침·뒤로가기에서 같은 결과를 복원한다.
- `/admin/community/[id]`도 `searchCnd=2&searchWrd=...`로 작성자 검색을 제공한다. 공용 URL-state 훅은 호출 화면이 선언한 키만 재조립해야 한다.
- 로그 전체 결과 다운로드는 조회 화면과 동일한 `searchKeyword`를 same-origin binary GET에 전달한다. 이를 제거하려면 POST+Blob으로 바꾸어 스트리밍·브라우저 다운로드 계약을 함께 변경해야 한다.

`DEC-OPS-029`는 이 현행을 알고 유지하도록 승인했지만, 하위 운영 결정만으로 상위 헌법과 ADR-0003의 절대 금지를 바꿀 수 없어 규범과 실행이 충돌했다.

## Decision drivers

- GET 검색의 공유·새로고침·북마크·SSR 이점을 보존한다.
- 개인정보가 포함될 수 있다는 이유만으로 정상적인 업무 검색을 전부 POST 또는 메모리 상태로 강제하지 않는다.
- URL 허용을 자격증명·고위험 개인정보·응답 원문의 허용으로 확대하지 않는다.
- 검색어가 unknown query 전달, 클라이언트 로그 또는 분석 이벤트로 증폭되지 않게 한다.
- URL 값과 서버 인가를 분리한다. URL에 값이 있다는 사실은 열람 권한의 증거가 아니다.

## Considered options

1. **개인정보성 검색어를 URL에서 전면 제거** — 노출면은 줄지만 GET 검색, SSR, 공유·복원과 binary 다운로드의 단순성을 잃고 현재 제품 계약을 대규모로 바꿔야 하므로 선택하지 않았다.
2. **모든 자유 입력을 제한 없이 URL에 허용** — 자격증명·고위험 정보와 unknown query 전파까지 열 수 있어 선택하지 않았다.
3. **화면별 계약으로 개인정보성 업무 검색어만 허용** — 현재 기능을 보존하면서 허용 범위와 잔여 위험을 명시할 수 있어 선택했다.

## Decision

1. 사용자가 검색·필터 화면에서 명시적으로 입력하는 업무 검색어는 성명·사번·계정명 등 일반 개인정보가 포함될 수 있더라도 URL query에 둘 수 있다.
2. 허용은 route와 query key의 명시적 allowlist에 한정한다. 현재 승인된 주소창 검색 키는 `/search`의 `q`, `/admin/community/boards/select-board-list`와 `/admin/community/[id]`의 `searchWrd`·`searchCnd`다. 로그 화면 검색어를 로컬 상태로 유지하는 현행도 유효하며, 허용은 모든 화면의 URL 동기화를 의무화하지 않는다.
3. same-origin binary GET 전체 결과 다운로드의 `searchKeyword`는 조회 조건과 파일 조건을 일치시키기 위해 허용한다. 이 경로는 주소창 상태와 별도 계약으로 관리한다.
4. 애플리케이션은 자격증명, 쿠키·세션 비밀, 인증·복구 토큰, 주민등록번호 등 고유식별정보, 금융·건강·생체 등 고위험 개인정보, 응답 데이터와 업무 본문을 의미하는 전용 URL field/state를 설계하거나, 2항의 일반 검색창에서 그런 값을 요구·유도하지 않는다. 다만 자유 입력의 의미를 클라이언트에서 완전 판별할 수 없으므로 사용자가 예상 밖의 고위험 값을 검색어에 직접 넣을 가능성은 accepted residual risk이며, 고위험 용도의 허용으로 간주하지 않는다.
5. 허용된 검색어도 클라이언트 로그, 분석 이벤트, 오류 로그 payload에 복제하지 않는다. 2항에서 승인한 검색 route의 serializer는 기존 query를 이름 확인 없이 복사하지 않고 선언된 key로 다시 조립한다. 다른 화면에 남은 `copy-existing-query` 경로는 이 ADR이 승인한 범위가 아니며 `PD-UX-002`의 `opaque` remainder로 계속 추적한다.
6. 같은 화면의 검색·페이지·정렬 변경은 불필요한 브라우저 history 누적을 피하도록 `replace`를 우선한다. 별도 화면 이동과 사용자가 명시한 공유는 예외다.
7. URL·브라우저 이력·북마크·다운로드 기록, same-origin `Referer`와 저장소 밖 프록시·WAF·CDN 로그에 값이 남을 수 있음을 accepted risk로 기록한다. 파생 제품은 자기 보존·접근 정책에 따라 이 허용 범위를 더 좁힐 수 있다.
8. URL은 인가 경계가 아니다. 검색 결과와 상세 객체의 인증·역할·소유권 판정은 서버가 계속 집행한다.

## Consequences

### Positive

- 기존 GET 검색, SSR, 공유·복원과 스트리밍 다운로드 계약을 유지한다.
- 개인정보라는 한 이유로 모든 검색을 비공유 메모리 또는 POST로 강제하지 않는다.
- 허용된 일반 검색 용도와 계속 금지되는 고위험 전용 URL state·입력 유도를 같은 규범에서 구분한다.

### Costs and risks

- 사용자가 입력한 검색어는 브라우저와 인프라의 URL 기록에 남을 수 있다.
- 새 배포 환경은 프록시·WAF·CDN의 query logging, 접근 통제와 보존 기간을 별도로 판정해야 한다.
- 새 검색 route 또는 key를 추가할 때 allowlist·데이터 분류·인가 경계를 함께 검토해야 한다.
- 승인된 검색 route 밖의 기존 query 일괄 복사 경로는 제거된 것으로 간주하지 않으며, 후속 `opaque` 분류·정규화 대상이다.
- 일반 자유 입력을 내용 기반 DLP로 완전 분류하거나 차단한다는 보장은 없다. 고위험 검색이 실제 업무 요구라면 이 ADR의 allowlist를 재사용하지 않고 별도 입력·전송·보존 계약을 먼저 결정한다.
- 프런트엔드 검색 상태 밖에는 만족도 삭제 비밀번호를 query로 받는 기존 API가 남아 있다. 이는 이 ADR이 승인한 검색어가 아니며 [`GAP-SEC-002`](../../../.agent/memory/known-gaps.md)에서 별도 이전 대상으로 추적한다.

## Non-goals

- 로그 검색어를 주소창에 새로 동기화하는 것
- 모든 자유 입력, 개인정보 또는 식별자를 URL에 허용하는 것
- URL을 객체 접근 권한이나 검색 결과 공개 근거로 사용하는 것
- 외부 프록시·WAF·CDN의 보존 정책을 이 저장소가 대신 확정하는 것
- 기존 만족도 삭제 API의 `pswd` query 계약을 이 결정에서 즉시 변경하는 것

## Validation

- [`ui-url-state-approval.json`](../../../config/ui-url-state-approval.json)의 `search-input` 부류만 이 ADR에 결속하고 정확한 route·key·record 집합을 기록한다. 레지스트리의 다른 부류 승인을 이 ADR이 소유하지 않는다.
- [`ui-url-state-approval-contract.test.mjs`](../../../scripts/ui-url-state-approval-contract.test.mjs)는 검색 승인 범위, class-level 결정 연결, 자격증명 key로의 selector 확장 금지와 근거 존재를 검증한다.
- [`ui-url-state-census.test.mjs`](../../../scripts/ui-url-state-census.test.mjs)는 프런트엔드 내비게이션 모집단의 자격증명형 전용 URL key(`credential-name-signal`) 0건과 합성 `token` key의 즉시 red를 검증한다. 이는 자유 검색어 값의 의미를 판별하는 DLP나 저장소 전체 HTTP API의 query 검사로 확대해석하지 않는다.
- [`log-search-url-boundary-contract.test.mjs`](../../../scripts/log-search-url-boundary-contract.test.mjs)는 로그 주소창 미노출과 binary GET 검색어 전달의 의도된 비대칭을 유지한다.
- [`safe-error-log.test.ts`](../../../frontend/src/lib/__tests__/safe-error-log.test.ts)는 원본 오류 객체에 검색어·토큰·URL이 있더라도 안전한 오류 로그 payload로 전달되지 않음을 검증한다.
- 게시판의 `LIST_PARAM_KEYS` 계약은 unknown query 재전파와 조건 변경 history 누적을 차단한다.
- 공용 `useSearchState` 훅 계약은 호출 화면이 선언하지 않은 query를 버리고 same-view 변경에 `replace`를 사용하도록 고정한다.
