# URL-state 승인 오버레이 설계안

> **지위**: 설계 제안 → **2026-09-05 구현 완료**(승인 자리만 생성, 승인은 비어 있음). 여전히 규범이 아니다.
> 이 문서는 PD-UX-002 Q5 의 잔여 축 하나 — "재검토 완료를 무엇으로 기록할 것인가" — 에 대한
> 권고안이다. 채택 시 [decisions.md](../../.agent/memory/decisions.md) 에 DEC 로 등재한다.
>
> 작성 2026-09-05 · 구현 2026-09-05 · 근거 커밋 `577f29dee`

## 1. 무엇이 문제인가

`config/ui-url-state-census.json` 의 370 record 는 `reviewBy` 만료 시계에 걸려 있고, 만료되면
required `secret-scan` 이 red 가 되어 **문서 한 줄 PR 까지 막힌다**.

그런데 **그 재검토를 완료했다고 기록할 방법이 없다.**
[ui-url-state-census.mjs](../../scripts/ui-url-state-census.mjs) 의 record 검증부가 일곱 축을
전부 `unverified` 로 강제한다.

| 축 | 강제되는 값 |
|---|---|
| `review.status` / `review.decisionSafe` | `'unverified'` / `false` |
| `canonical.status` | `'unverified'` |
| `authorizationBoundary.capabilityRoles` | `'unverified'` |
| `authorizationBoundary.objectAuthorization` | `'unverified'` |
| `stateItems[].dataClass` | `'unverified'` |
| `stateItems[].approvalStatus` | `'unverified'` |
| `stateItems[].exception` | `'none-proposed'` |

생성기도 같은 값을 하드코딩하므로 `--write` 로도 다른 값이 나오지 않는다.

## 2. 이것은 결함이 아니다

먼저 분명히 해 둔다 — **위 강제를 푸는 것이 해결책이 아니다.**

이 census 는 소스를 정적으로 훑어 **기계 생성**된다. 여기에 승인을 쓸 수 있게 하면
**문법이 스스로를 승인**하게 된다. 계약 코드가 그 의도를 문장으로 남겨 두었다.

```js
// scripts/ui-url-state-census.mjs
errors.push(`${label}: canonical route status cannot be approved by syntax`);
errors.push(`${label}/${state?.name}: exception cannot be fabricated`);
```

즉 빠진 것은 "완료를 적을 필드" 가 아니라 **"사람이 판단을 적는 자리"** 다.
그 자리는 생성물 바깥에 있어야 한다.

## 3. 선례 — 저장소가 이미 같은 문제를 풀었다

[`config/ui-navigation-disposition-proposal.json`](../../config/ui-navigation-disposition-proposal.json)
이 정확히 같은 구조를 쓴다. 생성 manifest(`ui-route-capabilities.json`)는 그대로 두고,
**사람이 직접 쓰는 오버레이**가 그 위에 판단을 얹는다.

현재 그 오버레이의 120 route 중 **6건이 이미 `approved`** 다 — 즉 이 패턴은 이론이 아니라
실제로 승인을 통과시켜 본 경로다.

### 3.1 오버레이가 갖는 것

| 필드 | 역할 |
|---|---|
| `manifestRef: { path, sha256 }` | 어느 생성물의 어느 버전에 대한 판단인지 결속. 생성물이 바뀌면 red |
| `state` / `authority` | `proposed` · `non-normative-pre-decision-evidence` — 오버레이 자신의 지위 |
| `schemaRef` | JSON Schema 경로 |
| `reviewState` | `blocked-input` → `proposed` → `approved` |
| 축별 review | `authorizationReview` · `privacyReview` · … 각각 `unverified`/`verified`/`not-applicable` |
| `approvals` | 축별 `{ reviewer, reviewedAt, evidence[] }` 또는 `null` |
| `consumerBindings` | 승인 전 소비를 fail-closed 로 막는다 |

### 3.2 승인 1건의 실물

```json
"approvals": {
  "domain": {
    "reviewer": "lkindo (DEC-OPS-013)",
    "reviewedAt": "2026-08-23",
    "evidence": [
      "config/ui-route-capabilities.json routes[/admin/sanctn/forms] — … status=demo(static-mock)",
      "frontend/src/app/admin/sanctn/WorkflowHubClient.tsx:3 — '[데모 스캐폴드]' 자가선언 주석"
    ]
  }
}
```

계약이 요구하는 것은 셋뿐이다 — `reviewer`(명명된 사람 또는 책임 역할),
`reviewedAt`(ISO 날짜), `evidence`(**비어 있지 않은** 문자열 배열).
근거 없는 승인은 계약이 거부한다.

## 4. 권고 설계

`config/ui-url-state-approval.json` 을 신설한다. 선례를 그대로 따르되 **한 가지만 다르다.**

### 4.1 record 단위가 아니라 부류 단위로 승인한다

disposition overlay 는 route 120건이라 1:1 이 가능했다. url-state 는 **370 record** 이고,
초안 §2 가 이미 다섯 부류로 정리해 두었다(표현 상태 · 리소스 식별자 · 검색 입력 ·
제어 플래그 · 불투명). 370건을 개별 승인하면 실제로는 아무도 읽지 않는 승인이 된다.

```jsonc
{
  "schemaVersion": 1,
  "state": "proposed",
  "authority": "non-normative-pre-decision-evidence",
  "manifestRef": { "path": "config/ui-url-state-census.json", "sha256": "…" },
  "classes": [
    {
      "classId": "presentation-state",
      "selector": { "stateItemNames": ["page", "tab", "view", "orderBy", "pageNo"] },
      "reviewState": "proposed",
      "dataClass": "non-sensitive-presentation",
      "privacyReview": "unverified",
      "authorizationReview": "unverified",
      "owner": "security/privacy + FE/domain owner",
      "reviewBy": "2026-12-31",
      "approvals": { "securityPrivacy": null, "domain": null }
    }
  ]
}
```

### 4.2 census 계약이 오버레이를 존중하는 방식

**census 는 그대로 둔다.** 일곱 축의 `unverified` 강제도 그대로다 — 생성물은 계속
"나는 판단하지 않는다" 고 말해야 한다.

바뀌는 것은 **만료 검사 한 줄**이다.

> record 의 모든 stateItem 이 `reviewState: "approved"` 인 class 에 덮여 있으면
> 그 record 의 `reviewBy` 만료를 오류로 세지 않는다.

이렇게 하면
- 생성물은 여전히 스스로를 승인하지 못한다(H2 유지)
- 승인은 사람이 쓴 파일에만 존재한다
- **덮이지 않은 record 는 그대로 만료된다** — 부분 승인이 전체 면제가 되지 않는다

### 4.3 필수 red 증명 (신설 시 함께)

1. `manifestRef.sha256` 이 census 와 어긋나면 red — 승인이 낡은 생성물을 가리키지 못한다
2. `approvals` 의 `evidence` 가 비면 red — 근거 없는 승인 금지
3. `reviewState: "approved"` 인데 축별 review 가 `unverified` 로 남으면 red
4. class selector 가 어떤 record 도 덮지 못하면 red — 유령 승인 금지
5. **덮이지 않은 record 는 승인 뒤에도 만료된다** — 면제 범위 누수 금지

## 5. 채택하지 않은 대안

| 대안 | 기각 사유 |
|---|---|
| census 스키마의 `unverified` 강제를 푼다 | 문법이 스스로를 승인하게 된다. 계약 주석이 명시적으로 금지 |
| `DEFAULT_REVIEW_BY` 를 계속 연장한다 | 재검토를 영구히 미루는 것이며 DEC-OPS-027 의 강제 재검토 취지를 지운다 |
| 만료 검사를 제거한다 | H2 정면 위반 |
| record 단위 370건 승인 | 실제로 읽히지 않는 승인이 된다. 부류 단위가 초안 §2 의 구조와도 일치 |

## 6. 구현 시 확정된 사항 (2026-09-05)

이 설계안은 세 가지를 미해결로 열어 두었다. 구현하면서 실측으로 셋 다 닫혔다.

### 6.1 ⚠ 다섯 부류로는 덮이지 않는다 — 여섯 번째가 필요하다

초안 §2 의 다섯 부류를 그대로 쓰겠다는 **가정이 틀렸다.** census 의 실제 stateItem 이름 25종을
세어 보니 76건이 어느 부류에도 안 들어갔다.

| 부류 | stateItem |
|---|---|
| `presentation-state` | 81 |
| `resource-identifier` | 47 |
| `search-input` | 5 |
| `control-flag` | 14 |
| **`opaque`** (신설) | **61** |
| 합계 | **208** |

미포괄 76건의 정체는 둘이었다 — 합성 마커 61건(`<computed>` 20 · `<unknown-source-query>` 19 ·
`<source-query>` 14 · `<raw-url-or-component>` 7 · `<form-field-population>` 1)과, 부류 목록에서
빠뜨린 실제 이름 15건(라우트 세그먼트 `[id]` 10 · `[type]` 1, 날짜 필터 `startDate`/`endDate` 4).

앞의 61건이 초안 §2.5 의 "불투명" 이다. 여섯 번째 부류로 세우니 208건이 정확히 떨어졌다.

### 6.2 `opaque` 는 `approved` 에 도달할 수 없다

가장 중요한 판정이다. **census 가 "이게 뭔지 모르겠다" 고 표시한 항목을 "안전하다" 로 승인하면,
그것이 바로 이 오버레이가 막으려는 조작이다.**

이 부류만 `reviewState: "blocked-input"` 으로 고정했고 계약이 그것을 강제한다. 판정하려면
detector 를 고쳐 항목의 정체를 먼저 밝혀야 한다(초안 §3-C 의 detector 개선 과제).

### 6.3 승인 축은 2축이다

`accessibility` 는 URL 상태 분류에 해당하지 않아 제외했다. `securityPrivacy` 와 `domain` 만 둔다.

### 6.4 부류 배정은 자동 파생한다

이름 목록을 손으로 적으면 census 가 바뀔 때 조용히 어긋난다. 계약이 **양방향**으로 막는다 —
census 에 있는데 안 덮인 이름도, 부류가 선언했는데 census 에 없는 이름(유령 selector)도 red 다.

## 7. 구현 결과

| 파일 | 역할 |
|---|---|
| [`config/ui-url-state-approval.json`](../../config/ui-url-state-approval.json) | 오버레이. **전 부류 `approvals: null`** — 자리만 만들고 승인은 비워 둔다 |
| [`config/ui-url-state-approval.schema.json`](../../config/ui-url-state-approval.schema.json) | 스키마 |
| [`scripts/ui-url-state-approval-contract.test.mjs`](../../scripts/ui-url-state-approval-contract.test.mjs) | 계약 8건. 글롭 selector 로 required `secret-scan` 에 자동 편입 |

census 의 만료 검사는 `readApprovedStateItemNames` 로 오버레이를 읽되 **fail-closed** 다 —
오버레이 부재·파싱 실패·해시 드리프트는 전부 "아무것도 승인되지 않음" 으로 처리한다.

**7축 `unverified` 강제는 그대로 두었다.** 생성물은 여전히 스스로를 승인하지 못한다.

### 실측 검증 (2027-06-01 시계)

| 시나리오 | 만료 오류 |
|---|---|
| 승인 0건(현재) | 370 |
| `presentation-state` 만 승인 | 298 |
| `opaque` 빼고 전부 승인 | 242 |
| 위와 같은 승인 + 해시 드리프트 | **370** (승인 무효화) |

면제가 실동작하고, 부분 승인이 전체 면제로 새지 않으며, 해시가 어긋나면 fail-closed 임을 확인했다.

red 증명 6축 — 해시 드리프트 · 근거 없는 승인 · 검토 미완 approved · 유령 selector ·
합성 마커를 opaque 밖으로 이동 · 부류가 census 이름 누락. 전부 재현 후 완전 복원했다.

## 8. 남은 것 — 승인 자체

> **2026-09-05 현황** — 아래 절은 구현 시점(승인 0건)의 서술이다. 같은 날 owner 승인으로
> 7개 부류 중 3개가 `approved` 됐다(`presentation-state` · `control-flag` · `resource-identifier`),
> 만료 시 red 369 → 144. "승인 없는 상태로 시작한다" 테스트는 절차대로 **승인 목록 exact 동결**
> (`APPROVED_AS_OF_2026_09_05`)로 교체됐다. 미승인 4개의 사유는
> [승인 근거 문서](../04-operations/url-state-class-approval-evidence.md) §2.3~2.6 에 있다.

이 구현은 **승인이 기록될 자리까지**다. `approvals` 를 채우는 것은 owner 의 행위이며, 계약이
그것을 막지 않되 조용히 생기지도 못하게 한다 — 승인이 나타나면 "오버레이는 승인을 선언하지
않은 상태로 시작한다" 테스트가 **의도적으로 red** 가 되고, 그 테스트를 명시적으로 제거하는
커밋이 "여기서부터 승인이 존재한다" 를 이력에 남긴다.

## 관련

- [URL-state 분류 초안](../01-product/url-state-classification-draft.md) — 부류 정의와 Q1~Q5
- [PD-UX-002](../04-operations/pending-decisions.md) — 결정 등록
- [DEC-OPS-020](../../.agent/memory/decisions.md) — disposition overlay 의 acceptanceEvidence 계약
- [DEC-OPS-027](../../.agent/memory/decisions.md) — reviewBy 실시간 시계 결속
- [DEC-OPS-029](../../.agent/memory/decisions.md) — Q1~Q4 판정
