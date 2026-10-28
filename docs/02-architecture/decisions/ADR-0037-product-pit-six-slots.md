# ADR-0037 — 제품 PIT 여섯 슬롯

- 상태: Accepted
- 결정일: 2026-10-20
- 승인 근거: 2026-10-20 사용자 지시 "바로 가능한 작업 우선 진행"(검증 비용·얇은 도메인 연구 보고서의 1단계, [DEC-OPS-373](../../archived/operational-decisions-history.md#dec-ops-373))과 2026-08-23 결정 위임.
- 대체: [ADR-0026](ADR-0026-ci-critical-path-and-reusable-impact.md) 결정 9 가운데 `mutation-scope` 의 `max-parallel: 4`. ADR-0027 맥락의 "제품 PIT 는 4슬롯" 서술도 함께 대체한다. 대상·임계값·LPT 선언 순서, `sast-scope` 와 `mutation-scope-migration` 의 슬롯은 그대로다.
- 후속 결정: 결정 1·2의 여섯 슬롯·선언 순서와 "board 657초 하한" 전제, 결정 3의 "값이 정확히 6"·75% 판정, 결정 4의 되돌림 규칙은 [ADR-0044](ADR-0044-ci-tuning-values-and-pit-scope-floors.md)가 대체한다 — 값은 ci.yml·실측 profile 이 정본이고 바꾸면 PR 설명에 실측 run id 를 남긴다. 하한은 범위별이다.
- 관련: [CI 가이드](../../03-guides/cicd-pipeline.md), [필수 체크 계약](../../../scripts/required-checks-contract.test.mjs), [ADR-0032](ADR-0032-migration-pit-two-slots.md).

## 맥락

ADR-0026 은 제품 PIT 10범위를 4슬롯으로 돌렸다. 나머지 한 슬롯은 분류 직후 custom composition 이 들어갈 자리로 남겼다.

그 뒤 사정이 바뀌었다.
- 제품 범위가 13개로 늘었고(DEC-OPS-366), 이 결정과 같은 배치에서 업무 홈·홍보와 관측 범위 둘을 더해 15개가 된다(DEC-OPS-373).
- custom 은 분류 직후 들어가게 바뀌어(ADR-0027) 약 7.8분에 끝난다.

PIT 21범위 구성 뒤의 full 실행 7건에서 확인한 것은 다음과 같다. 대상 실행은 39197910752·39211581858·39213303597·39241700358·39243734759·39291663884·39294207891 이다.
- `mutation-scope` 가 매번 가장 늦게 끝났다. 종료 시각 중앙값은 16.7분이고, 2등인 reusable-base 는 14.9분이었다.
- 9분 이후에는 runner 가 14개 이상 비어 있었는데, PIT 는 4~6개만 돌았다.

## 결정

1. `mutation-scope` 는 `max-parallel: 6` 으로 돈다.
2. matrix 선언 순서(실측이 긴 범위 먼저)는 유지한다.
   - 같은 7건의 범위별 job 시간 중앙값으로 선언 순서대로 빈 슬롯을 채우면, 13범위 기준 4슬롯은 904초, 6슬롯은 657초다.
   - 6슬롯 값은 가장 긴 business-app-board 한 범위(657초)와 같아 더 줄일 수 없는 하한이다.
   - 새 두 범위는 로컬 실측(354초·154초)에 따라 foundation 범위 앞에 둔다.
3. 대상 클래스·시험, 75% 판정, fail-fast 비활성, required context 집계는 바뀌지 않는다.
   - 필수 체크 계약은 값이 정확히 6이기를 요구한다. 빈 값, 주석 처리, 다른 값은 실패한다.
4. 효과는 이후 green full 실행의 벽시계 중앙값으로 판정한다.
   - 줄지 않으면 4로 되돌린다.
   - 다른 잡(E2E·재사용)이 늦게 입장해 꼬리가 되어도 4로 되돌린다.

## 근거와 검증 경계

범위별 job 시간은 runner 대기를 뺀 값이다. 6슬롯의 벽시계는 결정 시점에 CI 로 재지 않았다.

첫 8분은 runner 풀이 19~20개로 포화된다. 그래서 늘린 두 슬롯이 그 구간에 다른 잡의 입장을 늦출 수 있다. 이 위험은 결정 4 의 판정으로 확인한다.

새 두 범위의 벽시계 비용은 로컬 실측이다. CI 시간은 첫 full 실행에서 다시 잰다.
