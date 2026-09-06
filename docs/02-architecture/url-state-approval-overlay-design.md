# URL-state 부류 오버레이 설계와 검토 결과

> **지위**: 2026-09-05 구현 완료. [`config/ui-url-state-approval.json`](../../config/ui-url-state-approval.json)은
> `state: class-governed`, `authority: non-normative-url-state-class-registry`인 **비규범 부류 컨테이너**다.
> top-level 전체 승인이나 단일 ADR 지배를 뜻하지 않는다. 네 부류가 각자 `approved` 검토 기록을 가지며,
> 그중 `search-input`만 class-level `decisionRef`로 [ADR-0009](decisions/ADR-0009-controlled-url-search-state.md)에 결속한다.
> 이 문서는 오버레이의 설계 의도와 운영 계약을 설명하며, 설정 파일이나 ADR을 대신하는 규범은 아니다.

## 1. 해결한 문제

`config/ui-url-state-census.json`은 소스를 정적으로 훑어 만든 생성물이다. 따라서 각 record의
`review.status`, `canonical.status`, 인가 경계, `stateItems[].dataClass`와 승인 상태를 계속
`unverified`로 유지한다. 생성기가 이 값을 직접 승인하도록 허용하면 문법 탐지가 사람의 보안·도메인
판정을 대신하게 된다.

승인은 생성물 바깥의 수동 오버레이에 기록한다. census는 관찰 사실을, 오버레이는 사람의 판단과
근거를 각각 소유한다.

## 2. 현행 provenance와 결속

| 항목 | 현행 값 |
|---|---|
| top-level `state` | `class-governed` |
| top-level `authority` | `non-normative-url-state-class-registry` |
| top-level `decisionRef` | 없음 — 컨테이너 전체를 단일 결정에 결속하지 않음 |
| `search-input.decisionRef` | `docs/02-architecture/decisions/ADR-0009-controlled-url-search-state.md` |
| `schemaRef` | `config/ui-url-state-approval.schema.json` |
| `manifestRef` | census 경로와 내용 SHA-256 |

`manifestRef.sha256`이 현재 census와 다르면 어떤 부류의 승인 기록도 만료 면제에 사용하지 않는다. 승인된 부류도 두 승인 축의
reviewer·날짜·비어 있지 않은 evidence가 완결되고 selector가 현재 census 항목을 정확히 덮을 때만
만료 면제에 사용한다. 새 state item이나 새 route는 기존 이름과 같다는 이유만으로 자동 승인되지 않는다.

## 3. 부류 단위 승인

record를 일일이 복제하지 않고 같은 의미와 경계를 가진 state item을 부류로 묶는다. 현행 7개 부류의
상태는 다음과 같다.

| 부류 | 상태 | 데이터 분류·잔여 조건 |
|---|---|---|
| `presentation-state` | `approved` | 비민감 화면 표현 상태 |
| `resource-identifier` | `approved` | 서버 발급 식별자, 서버 인가 별도 집행 |
| `search-input` | `approved` | 일반 개인정보가 포함될 수 있는 업무 검색어, `accepted-risk` |
| `control-flag` | `approved` | 닫힌 값 집합의 제어 플래그 |
| `path-intent` | `proposed` | 내부 경로 의도에 맞는 데이터 분류와 검증 계약 필요 |
| `hand-assembled-segment` | `proposed` | 사람이 조립한 세그먼트의 값 검증 계약 필요 |
| `opaque` | `blocked-input` | detector가 의미를 식별하기 전 승인 금지 |

record의 모든 state item이 승인된 부류로 덮일 때만 그 record가 만료 검사에서 면제된다. 승인된 항목과
미승인 항목이 섞인 record는 계속 red 대상이다.

## 4. `search-input`의 제한 승인

ADR-0009는 성명·사번·계정명처럼 일반 개인정보를 포함할 수 있는 **업무 검색어**의 URL 사용을
허용한다. 이는 모든 문자열이나 모든 화면을 승인한 것이 아니다. 오버레이는 다음 키·record·route를
함께 고정한다.

### 4.1 정확한 키와 census record 5건

- 키: `q`, `searchCnd`, `searchWrd`
- `URL-204665E3AB9C4A`
- `URL-3E36A25946033C`
- `URL-A13AC14823B70F`
- `URL-E28F88902ADC75`
- `URL-E910532B42785F`

### 4.2 route-key binding 3건

| route | 허용 키 |
|---|---|
| `/search` | `q` |
| `/admin/community/[id]` | `searchCnd`, `searchWrd` |
| `/admin/community/boards/select-board-list` | `searchCnd`, `searchWrd` |

같은 키 이름을 쓰더라도 위 route와 producer/consumer 근거에 포함되지 않은 새 경로는 별도 검토 대상이다.
위 세 검색 route의 serializer에서는 unknown query를 일괄 전달하지 않는다. 다른 route에 남은
`copy-existing-query`는 이 승인에 포함되지 않으며 `opaque` remainder로 추적한다.

### 4.3 허용되지 않는 확장과 자유 입력의 한계

- 자격증명, 쿠키·세션 비밀, 인증·복구 토큰을 의미하는 전용 URL field/state
- 주민등록번호 등 고유식별정보와 금융·건강·생체정보를 요구·유도하는 URL 검색 계약
- API 응답 원문이나 업무 payload를 직렬화하는 URL state
- 검색어의 클라이언트 로그, 분석 이벤트, 오류 로그 payload 복제

브라우저 이력·북마크, same-origin referrer, 저장소 밖 프록시·WAF·CDN 로그에는 검색어가 남을 수
있다. `privacyReview: accepted-risk`는 이 잔여 위험을 알고 수용했다는 뜻이며 “노출 위험 없음”을
뜻하지 않는다. 자유 입력의 내용을 클라이언트가 완전 분류할 수 없어 사용자가 예상 밖의 고위험 값을
직접 넣을 가능성도 잔여 위험에 포함된다. 이는 고위험 검색 용도의 승인이 아니며, 파생 제품은 입력
안내·검증·운영 토폴로지에 따라 더 좁은 정책이나 비URL 검색을 채택할 수 있다.

URL은 인가 증거가 아니다. 검색 결과와 상세 객체의 인증·역할·소유권 검사는 서버가 계속 집행한다.
또한 허용은 의무가 아니므로 로그 화면처럼 주소창 동기화를 하지 않는 현재 선택도 유지할 수 있다.

## 5. 채택 시점의 영향

2026-09-05 결정 시점 기준 승인 부류가 덮는 state-bearing record는 **119건**이며,
`search-input` 승인이 그중 **5건을 추가**했다. 모든 부류의 `reviewBy`는 2026-12-31이다.
그 날짜가 지난 뒤 재승인이나 정당한 기한 갱신이 없으면 **258건이 red**가 된다.

따라서 부류 승인은 만료 검사를 제거하는 수단이 아니다. 남은 `path-intent`,
`hand-assembled-segment`, `opaque`는 각각 분류·검증·detector 개선을 거쳐야 한다.

## 6. fail-closed 계약

계약 테스트는 최소한 다음 위반을 red로 만든다.

1. census와 `manifestRef.sha256` 불일치
2. 비규범 컨테이너의 `class-governed` state·authority 불일치 또는 `decisionRef`가 `search-input` 밖에 놓임
3. 승인 근거 누락, 검토 축 미완료, 유령 selector
4. `search-input`의 recordId·route-key binding 누락 또는 확장
5. 자격증명·토큰을 의미하는 전용 URL key나 새 검색 surface를 검색 허용 목록에 추가
6. 승인되지 않은 state item이 섞인 record를 만료 면제

생성 census의 `unverified` 값은 계속 유지된다. 비규범 오버레이는 각 부류의 사람 검토 기록을 제공할
뿐 생성물이나 컨테이너 전체를 승인하지 않는다.

## 7. 역사 메모

이 문서는 처음에는 `proposed` 상태와 빈 승인 자리만 설명하는 설계안이었다. 당시의 record 수와
가상 만료 수치는 구현 전 스냅샷이며 현행 운영 수치가 아니다. 2026-09-05 네 부류의 독립적인 owner
검토가 기록되면서 top-level은 `class-governed` 비규범 컨테이너로 전환했다. ADR-0009는 그중
`search-input`에만 규범 근거를 제공한다.

## 관련

- [ADR-0009](decisions/ADR-0009-controlled-url-search-state.md)
- [URL-state 부류 승인 근거](../04-operations/url-state-class-approval-evidence.md)
- [URL-state 분류 초안](../01-product/url-state-classification-draft.md) — 역사적 결정 입력물
- [사용자 결정 대기 레지스트리](../04-operations/pending-decisions.md)
