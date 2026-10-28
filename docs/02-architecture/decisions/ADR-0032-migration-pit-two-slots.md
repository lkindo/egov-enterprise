# ADR-0032 — 이관 PIT 두 슬롯과 실측 긴 순서

- 상태: Accepted
- 결정일: 2026-10-17
- 승인 근거: [DEC-OPS-337](../../archived/operational-decisions-history.md#dec-ops-337). 2026-10-17 사용자의 계약·하네스·파이프라인 효율 점검 요청과 2026-08-23 결정 위임에 따른다.
- 대체: [ADR-0026](ADR-0026-ci-critical-path-and-reusable-impact.md) 결정 10 가운데 `mutation-scope-migration`의 `max-parallel: 1`. 같은 결정의 `sast-scope` 1슬롯과 재사용·secret-scan 입장 규칙은 유지한다(custom 입장은 이미 ADR-0027이 대체했다).
- 후속 결정: 결정 1의 슬롯 수·선언 순서 값과 결정 3의 정확값 대조·75% 판정은 [ADR-0044](ADR-0044-ci-tuning-values-and-pit-scope-floors.md)가 대체한다 — 값은 ci.yml·실측 profile 이 정본이고 계약은 양의 슬롯 수와 profile 순서만 본다. 하한은 범위별이다.
- 관련: [CI 가이드](../../03-guides/cicd-pipeline.md), [필수 체크 계약](../../../scripts/required-checks-contract.test.mjs).

## 맥락

ADR-0026은 이관 PIT 네 범위의 실행 합계가 약 4분 12초(run `36575378891`)라는 실측을 근거로 이관 PIT를 한 슬롯에서 차례로 돌렸다. 그 뒤 ADR-0029 L1~L4가 이관 PIT 범위를 여덟 개로 늘렸고, main 실행 `38985970318`(af79c310f)에서 이 잡의 범위 실행 합계는 1005초, 마지막 범위의 끝은 1486초였다. 같은 실행의 나머지 job은 모두 1025초 안에 끝나 이관 PIT가 전수 CI의 임계 경로가 됐다. 한 슬롯 안에서 범위를 나누거나 합쳐도 합계는 줄지 않는다.

## 결정

1. `mutation-scope-migration`은 `max-parallel: 2`로 돈다. matrix는 위 실행의 범위별 job 시간이 긴 순서(verify·validate·standardize·collect·protect·runtime-state·registry·converter)로 선언해 두 사슬이 비슷한 길이로 끝나게 한다.
2. `sast-scope`의 한 슬롯은 그대로다.
3. 대상 클래스·시험·75% 판정·fail-fast 비활성·required context 집계는 바뀌지 않는다. [필수 체크 계약](../../../scripts/required-checks-contract.test.mjs)이 두 잡의 슬롯 수와 이관 PIT 순서를 정확히 대조하고, 빈 값·주석 처리·다른 값은 실패한다.
4. 효과는 같은 SHA의 연속 green 실행 중앙값으로 판정한다. 범위 실행 시간이 바뀌어 순서가 실측과 크게 어긋나면 새 실측으로 순서를 다시 선언한다.

## 근거와 검증 경계

현재 실행 조건은 [CI 워크플로](../../../.github/workflows/ci.yml)가 소유하고 범위 목록의 정본은 [gate registry](../../../config/governance/gates.json)다. 이 순서로 두 슬롯에 넣으면 사슬별 job 시간 합은 505·500초다. 이 값은 위 실행의 범위별 job 시간(CI 실측)으로 계산한 것으로 runner 대기는 빠졌고, 두 슬롯의 벽시계는 결정 시점에 CI 로 재지 않았다. 같은 실행만 세면 동시 job 정점은 18개라 둘째 슬롯을 더해도 19개다. 다만 초반 runner 대기(138→375초) 동안 이 실행의 동시 수는 11~15개였으므로, 계정 한도 20 안이라는 판단은 함께 도는 다른 실행을 뺀 값이고 보장이 아니다. 둘째 슬롯이 E2E·재사용 입장을 늦출 수 있다. 그래도 reusable-base 마지막 종료(1015초)가 이관 PIT 종료(1486초)보다 약 470초 앞서므로 벽시계는 줄 것으로 보고, 결정 4의 중앙값 판정으로 확인한다.
