# URL-state 승인 오버레이 설계안

> **지위**: 설계 제안(pre-decision). 규범이 아니다.
> 이 문서는 PD-UX-002 Q5 의 잔여 축 하나 — "재검토 완료를 무엇으로 기록할 것인가" — 에 대한
> 권고안이다. 채택 시 [decisions.md](../../.agent/memory/decisions.md) 에 DEC 로 등재한다.
>
> 작성 2026-09-05 · 근거 커밋 `577f29dee`

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

## 6. 미해결

- **부류 경계를 누가 정하는가** — 초안 §2 의 다섯 부류를 그대로 쓸지, 프라이버시 위험 축으로
  다시 나눌지. 이 문서는 전자를 가정했다.
- **`accessibility` 축이 필요한가** — disposition overlay 는 4축(domain·productIa·
  securityPrivacy·accessibility)이지만 URL 상태 분류에 접근성 축은 해당하지 않아 보인다.
  2축(securityPrivacy·domain)을 제안하나 owner 판단이다.
- **기존 370 record 의 부류별 배정** — 자동 파생 가능한지, 사람이 지정해야 하는지.

## 관련

- [URL-state 분류 초안](../01-product/url-state-classification-draft.md) — 부류 정의와 Q1~Q5
- [PD-UX-002](../04-operations/pending-decisions.md) — 결정 등록
- [DEC-OPS-020](../../.agent/memory/decisions.md) — disposition overlay 의 acceptanceEvidence 계약
- [DEC-OPS-027](../../.agent/memory/decisions.md) — reviewBy 실시간 시계 결속
- [DEC-OPS-029](../../.agent/memory/decisions.md) — Q1~Q4 판정
