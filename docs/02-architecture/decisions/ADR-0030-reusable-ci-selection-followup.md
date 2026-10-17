# ADR-0030 — 재사용 CI의 PR 제외 선언과 야간 중복 구성 제거

- 상태: Accepted
- 기록일: 2026-10-17
- 기존 결정일: 2026-10-13
- 승인 근거: [DEC-OPS-296](../../archived/operational-decisions-history.md#dec-ops-296)의 U15와 [DEC-OPS-301](../../archived/operational-decisions-history.md#dec-ops-301)의 Phase 2 마무리 결정. 2026-10-17 사용자의 문서 감사 후 정리 요청으로 기존 결정을 후속 ADR에 옮긴다.
- 대체: [ADR-0027](ADR-0027-ci-reusable-admission-layout-and-nightly.md) 결정 2의 모든 시작 구성에 PR 레이아웃을 배정하는 부분, 결정 4의 시작 구성과 같은 기능 목록인 단독 폐포도 실행하는 부분.
- 관련: [ADR-0028](ADR-0028-presets-are-named-domain-lists.md), [CI 가이드](../../03-guides/cicd-pipeline.md).

## 맥락

ADR-0027 이후 설문·결재 시작 구성을 추가하면서 PR 검증 비용과 같은 결과를 반복 생성하는 야간 비용을 줄이는 결정을 했다. 결정은 운영 인덱스에만 기록됐지만 Accepted ADR의 조건을 바꾸므로 후속 ADR에 모은다. 기존 승인 범위와 구현은 그대로이며 새 검증 생략이나 예산 확대를 승인하지 않는다.

## 결정

1. 시작 구성의 `ci.pr`이 `null`이면 해당 시작 구성은 PR 생성·검증에서 제외한다. 이 경우 `ci.main`에 두 레이아웃을 선언해야 하며, main push·수동 실행은 두 레이아웃을 모두 검증한다. 잘못되거나 불완전한 선언은 분류를 중단한다. 설문·결재 시작 구성에 적용한 기존 범위와 사용자 구성 대표 검증은 유지한다. 선언이 없는 시작 구성과 이벤트 미상은 기존의 두 레이아웃 fallback을 유지한다.
2. T2 전체 계획은 시작 구성과 기능 목록이 같은 단독 폐포를 제외한다. 같은 목록은 같은 결과라는 ADR-0028의 계약과 시작 구성의 두 레이아웃 검증이 그 근거다. 이름으로 직접 지정한 선택 구성은 계속 실행한다. 잡 수는 카탈로그에서 계산하며 ADR-0027의 결정 당시 26잡이나 DEC-OPS-301 당시 29잡을 현재 고정값으로 쓰지 않는다.
3. required context·실패 판정·검증 단계·임계값·main 검증은 바꾸지 않는다. PR에서 빠지는 구성 고유 회귀는 병합 후 main에서만 드러날 수 있다는 ADR-0027 결정 3의 수용 위험을 유지한다. T2는 required CI를 대체하지 않는다.

## 근거와 검증 경계

현재 실행 조건은 [분류기](../../../scripts/ci-change-scope.mjs), [기능 스키마](../../../config/modules/_schema.json), [야간 계획기](../../../scripts/reusable-nightly.mjs)가 소유한다. 회귀 근거는 [분류기 계약](../../../scripts/ci-change-scope.test.mjs)과 [야간 계획 계약](../../../scripts/reusable-nightly.test.mjs) 및 위 DEC의 당시 실행 기록이다. 이 문서 정리는 새 CI 실행·성능 실측·기관 승인을 주장하지 않는다.
