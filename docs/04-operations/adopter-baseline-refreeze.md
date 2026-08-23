# Adopter 기준선 재동결 절차 (Baseline Refreeze Runbook)

> [ERP 전환 마스터플랜](../02-architecture/erp-transformation-master-plan.html) Track B **D10** 산출물 — 사용자 위임(2026-08-23)에 따른 집행이다.
> 이 문서는 파생 제품(adopter)이 이 저장소를 base 로 채택한 뒤, 자체 밀도·브랜드·래칫 **기준선을 자기 제품의 실측값으로 재동결**하는 절차를 정의한다.

## 1. 배경과 원칙

base 저장소의 게이트 다수는 "현재 실측값과 정확히 같아야 한다"는 **양방향 동결(exact census/baseline)** 방식이다. adopter 가 브랜드 프로필을 갈아끼우고 화면을 추가·삭제하면 이 동결값들은 필연적으로 어긋난다. 그때 게이트를 끄거나 목록을 비우는 것이 아니라, **자기 실측값으로 재동결**하는 것이 이 절차의 목적이다.

모든 단계에 다음 원칙이 적용된다([AGENTS.md Evidence guardrails](../../AGENTS.md#evidence-guardrails)).

- **red 실측 후 재동결 (H2·H5)** — 동결값을 바꾸기 전에 반드시 해당 게이트를 실행해 red 와 함께 출력되는 **실측 카운트를 확인**하고, 그 값으로만 갱신한다. 게이트를 돌려보지 않고 상수를 추정치로 고치는 것은 금지다.
- **신호 은폐 금지 (H2)** — 예외 목록을 늘리거나 baseline 을 올려 red 를 지우지 않는다. 상향(악화 방향)은 사유를 코드 리뷰에 명시해야 한다.
- **diff 리뷰 의무 (D10 채택 조건)** — 재동결 커밋은 기준선 파일만 바꾸는 **단독 커밋**으로 만들고, PR 리뷰에서 "왜 이 값이 되었는가"를 항목별로 설명한다. 생성 스크립트가 있는 기준선은 스크립트로만 재생성하고 수기 편집하지 않는다.

## 2. 재동결 대상 목록 (현존 게이트 실측)

아래 6개 축이 adopter 채택 시 재동결 대상 전부다. 각 항목은 현재 저장소에 실존하는 파일로 실증한다.

| # | 축 | 동결 위치 | 재동결 방법 |
|---|---|---|---|
| 1 | status 색 하드코딩 | [status-color-guard.test.ts](../../frontend/src/__tests__/status-color-guard.test.ts) 의 `BASELINE` 상수 | red 실측 → 상수 갱신 (§3) |
| 2 | 중립·액센트 색 하드코딩 | [hardcoded-color-guard.test.ts](../../frontend/src/__tests__/hardcoded-color-guard.test.ts) 의 `BASELINE` 상수 | red 실측 → 상수 갱신 (§3) |
| 3 | URL 상태 census | [config/ui-url-state-census.json](../../config/ui-url-state-census.json) | `node scripts/ui-url-state-census.mjs --write` (§4) |
| 4 | 거버넌스 게이트 exact census | [config/governance/gates.json](../../config/governance/gates.json) | manifest 를 실제 게이트 소스와 함께 갱신 (§5) |
| 5 | 브랜드 프로필 키 패리티 | [theme-token-contract.test.ts](../../frontend/src/__tests__/theme-token-contract.test.ts) | 프로필 CSS·allowlist 3방향 패리티 충족 (§6) |
| 6 | e2e shard 시간 프로필 | [frontend/e2e/shard-duration-profile.json](../../frontend/e2e/shard-duration-profile.json) | 자기 CI 성공 run 실측으로 재작성 (§7) |

마지막으로 required checks 결속(§8)을 adopter 자신의 원격 저장소에 다시 건다.

## 3. 색 하드코딩 baseline 재측정 — status/hardcoded color guard

두 게이트는 소스 스캔 총 occurrence 가 상수와 **정확히 같아야** green 이다(감소도 red — 개선분을 baseline 하향으로 확정해야 한다).

- [status-color-guard.test.ts](../../frontend/src/__tests__/status-color-guard.test.ts) — success/warning/destructive 계열 팔레트 하드코딩. 현재 base 동결값 `BASELINE = 656`.
- [hardcoded-color-guard.test.ts](../../frontend/src/__tests__/hardcoded-color-guard.test.ts) — 중립+브랜드 액센트 하드코딩. 현재 base 동결값 `BASELINE = 69`.

절차:

1. adopter 소스가 안정된 시점에 두 테스트를 실행한다.

   ```powershell
   pnpm -C frontend exec vitest run src/__tests__/status-color-guard.test.ts src/__tests__/hardcoded-color-guard.test.ts
   ```

2. red 실패 메시지가 실측 총계와 방향(증가/감소)을 출력한다. **이 출력값이 유일한 재동결 근거다.** 추정·수기 집계로 상수를 바꾸지 않는다.
3. 감소(개선)면 `BASELINE` 을 실측값으로 내린다. 증가(악화)면 먼저 토큰 치환으로 줄이는 것이 원칙이고, 불가피하게 올릴 때는 사유를 코드 리뷰에 명시한다(테스트 파일 상단 주석에 규정된 운영 규칙).
4. 재실행해 green 을 확인하고, baseline 변경을 diff 리뷰로 승인받는다.

## 4. URL 상태 census 재생성

프론트 화면·URL 상태의 census 는 [config/ui-url-state-census.json](../../config/ui-url-state-census.json) 에 동결돼 있고, 검사는 [scripts/ui-url-state-census.mjs](../../scripts/ui-url-state-census.mjs) 의 `--check` 모드(gates.json 등재 generator)가 drift 를 red 로 만든다. adopter 가 화면을 추가·삭제하면 반드시 어긋난다.

```powershell
node scripts/ui-url-state-census.mjs --write
```

- **수기 편집 금지** — 이 파일은 생성물이다. `--write` 로만 재생성한다.
- 재생성 후 diff 를 리뷰한다: 새로 잡힌 URL 상태가 개인정보·프라이버시 분류 대상인지 확인한다(base 의 분류 초안: [url-state-privacy-classification-draft.md](url-state-privacy-classification-draft.md)).

## 5. 거버넌스 게이트 exact census — gates.json

[config/governance/gates.json](../../config/governance/gates.json) 은 governance JUnit·ArchUnit·schema-validation 게이트, runner catalog, execution profile, quality population 과 quality ratchet 을 **소스 파일·task·실행 tier·CI 소비자에 exact-match** 로 결속하는 중앙 registry 다. 검증은 [scripts/governance-gates-contract.mjs](../../scripts/governance-gates-contract.mjs)([계약 테스트](../../scripts/governance-gates-contract.test.mjs))가 수행하며, 등재 안 된 게이트 신설·등재된 게이트 소실 양쪽 모두 red 다.

adopter 절차:

1. 게이트(테스트 클래스·ratchet)를 추가·삭제·개명하는 변경은 **같은 변경 세트에서** gates.json 의 해당 행을 갱신한다. registry 만 고치고 소스를 안 고치거나 그 반대는 계약이 red 로 잡는다.
2. `qualityRatchets` 의 하한(coverage·mutation 등)을 adopter 실측으로 조정할 때도 §1 원칙대로 red 실측을 먼저 확인하고, 하한 하향(악화)은 사유를 리뷰에 남긴다.
3. 검증: 루트에서 `npm run verify:fast` (registry 계약 포함) 또는 계약 테스트 직접 실행.

## 6. 브랜드 프로필 키 패리티 — theme-token-contract

adopter 가 자기 브랜드 프로필 CSS 를 추가/교체하면 [theme-token-contract.test.ts](../../frontend/src/__tests__/theme-token-contract.test.ts) 의 다음 계약을 충족해야 한다.

- 프로필 파일마다 `:root[data-brand-theme="<profile>"]` 라이트 블록과 `:root[data-brand-theme="<profile>"].dark` 다크 블록이 있어야 한다.
- **시맨틱 키 집합 패리티**: 모든 프로필의 라이트·다크 토큰 키 집합이 기준 프로필과 완전히 같아야 한다. DEC-OPS-014 의 밀도·구조 토큰 12종(`--control-h` 등)도 이 패리티에 포함된다 — 새 프로필은 값만 바꾸고 키는 전부 재선언한다.
- **3방향 완전 패리티**: 프로필 CSS 파일 ↔ [globals.css](../../frontend/src/app/globals.css) `@import` ↔ resolver allowlist 가 일치해야 한다. 밀도 축(`data-density`) 배선은 [density.ts](../../frontend/src/lib/theme/density.ts)·globals.css 의 compact 오버라이드 블록 계약을 따른다(DEC-OPS-015).

검증:

```powershell
pnpm -C frontend exec vitest run src/__tests__/theme-token-contract.test.ts
```

## 7. e2e shard-duration-profile 재생성

내부 e2e 는 [frontend/e2e/shard-duration-profile.json](../../frontend/e2e/shard-duration-profile.json) 의 spec 별 실행시간으로 shard 를 균형 분배한다([scripts/e2e-shard-plan.mjs](../../scripts/e2e-shard-plan.mjs)). 검증기는 발견된 spec 과 프로필 기록이 **양방향으로 완전 일치**할 것을 요구한다 — spec 추가 시 `missing duration profile`, 삭제 시 `stale duration profile` 로 red 다.

adopter 절차:

1. adopter 의 e2e spec 집합이 안정된 뒤, **자기 CI 의 최근 성공 run** 에서 spec 별 실행시간을 수집한다.
2. 프로필 JSON 을 재작성한다 — `schemaVersion: 1`, `source` 증거 필드(`workflowRunId`·`commit`·`capturedAt`(ISO, 미래 불가)·`runner`·`workers`), 전체 spec 의 `durationsMs`. source 증거 없는 임의 숫자는 검증기가 거부한다.
3. shard 수 변화와 무관하게 브랜치 보호에는 안정 context `e2e-test` 하나만 노출하는 구조([CI workflow](../../.github/workflows/ci.yml), DEC-OPS-008)는 그대로 승계한다.

## 8. required checks 결속 재확인

기준선 재동결의 마지막은 **병합 권위 재결속**이다. adopter 의 원격 저장소는 base 의 ruleset 을 자동 승계하지 않는다.

1. [.github/required-checks.json](../../.github/required-checks.json) 을 adopter 의 required context 명세로 확정한다(변경 없으면 그대로 승계).
2. 명세 ↔ CI workflow 정합은 [scripts/required-checks-contract.mjs](../../scripts/required-checks-contract.mjs) 가, 명세 ↔ **원격 브랜치 보호 실측** 대조는 [scripts/verify-branch-protection.mjs](../../scripts/verify-branch-protection.mjs) 가 수행한다.
3. adopter 저장소에 ruleset 을 적용한 뒤 `npm run verify:ops` 로 exact-match 를 실측한다(admin 읽기 권한 필요). review policy 값(base 는 단독 운영 DEC-OPS-009 로 approval 0)은 adopter 의 인력 구조에 맞게 명세·계약 상수·결정 기록을 **함께** 바꾼다.

## 9. 실행 순서 요약과 완료 기준

1. §3 색 guard 2종 → §4 URL census → §5 gates.json → §6 프로필 패리티 → §7 shard 프로필 순으로 로컬 재동결.
2. 각 항목은 "red 실측 → 재생성/갱신 → green 재실행" 을 개별 커밋으로 남긴다.
3. 통합 검증: `npm run verify:push` (필요 범위에 따라 `verify:fe`·`verify:full`), 마지막으로 §8 의 `npm run verify:ops`.
4. **완료 기준**: 전 게이트 green + 재동결 diff 가 항목별 사유와 함께 PR 리뷰로 승인됨. 게이트 비활성화·예외 목록 확대로 green 을 만든 항목이 0건이어야 한다.

## 10. 이 문서가 다루지 않는 것

- base 저장소 자체의 baseline 변경 정책(그건 각 게이트 파일 상단 주석과 AGENTS.md 가 정본).
- 시각 회귀 스냅샷(리눅스 기준선은 update-visual-baseline workflow 경로, DEC-OPS-017 참조)과 UI quality evidence(r12, ADR-0005) — adopter 가 해당 축을 승계할 때는 각 정본 문서를 따른다.
- KRDS/KWCAG 등 외부 표준 준수 판정 — 이 절차는 저장소 내부 게이트 재동결만 다룬다.
