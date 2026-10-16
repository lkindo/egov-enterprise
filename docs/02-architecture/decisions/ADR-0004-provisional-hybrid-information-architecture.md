# ADR-0004: 하이브리드 정보구조를 검증용 잠정 방향으로 채택

- **Status:** Accepted — provisional direction only
- **Date:** 2026-08-21
- **Decision owners:** repository owner / frontend architecture
- **Related:** [ADR-0003](ADR-0003-frontend-ux-modernization-principles.md), [정보구조 결정 패키지](../../01-product/information-architecture.md), [route capability manifest](../../../config/ui-route-capabilities.json), [navigation disposition overlay](../../../config/ui-navigation-disposition-proposal.json)

## Context

현재 구현에는 filesystem route 119개와 external alias 2개가 있다. 그러나 live 운영 메뉴,
authority assignment, 역할별 effective menu, route별 개인정보·인가 검토, 실제 사용자 top-task
연구가 없다. 따라서 현재 기술 namespace를 곧바로 목표 메뉴로 승인하거나 route별 label, group,
order, visibility를 추론할 수 없다.

정보구조 결정 패키지는 다음 세 대안을 비교했다.

1. 현 도메인 트리 정리
2. 역할별 독립 포털
3. 과업 중심 기본 내비게이션과 명시적인 관리 센터를 결합한 하이브리드

사용자는 최적안을 추천하고 안전하게 계속 진행하도록 지시했다. 이 지시는 검증할 대안의 방향을
선택할 권한은 제공하지만, 존재하지 않는 live menu·role·privacy·사용자 연구 증거나 제품 소유자
승인을 대신하지 않는다.

## Decision

대안 3인 **과업 중심 기본 내비게이션 + 명시적인 관리 센터**를 prototype, card sort,
tree test와 후속 IA 검증의 단일 잠정 방향으로 채택한다.

잠정 방향의 범위는 다음으로 한정한다.

- 첫 이행에서는 canonical URL을 유지한다.
- navigation의 label, group, order, visibility를 route와 authorization에서 분리한다.
- 일반 과업은 결과 중심으로 탐색하게 하고, 권한·실패 비용이 높은 관리 기능은 명시적인
  관리 센터 후보 아래에서 검증한다.
- menu DB, generator와 실행 UI는 accepted route disposition을 소비하기 전까지 이 결정을
  직접 읽거나 적용하지 않는다.

이 결정은 다음을 승인하지 않는다.

- 정확한 label, group, order, target tree 또는 route별 disposition
- live menu 구조, authority assignment, 역할별 effective exposure
- route별 authorization, privacy, capability 또는 profile ownership
- 로그 및 전역 URL privacy allowlist, 외부 telemetry 정책
- `PD-UX-001`, `PD-UX-002`, 전역 URL 후속 결정 또는 G1 통과

따라서 [navigation disposition overlay](../../../config/ui-navigation-disposition-proposal.json)는
계속 `state=proposed`, `acceptedDecision=null`이고 menu/generator consumer도 disabled 상태를
유지한다. 119개 route와 2개 alias의 미확인 필드와 승인은 그대로 blocker다.

## Rationale

현 도메인 트리 정리는 변경 위험은 작지만 기술·조직 용어를 사용자 mental model로 고착할 수
있다. 역할별 독립 포털은 민감 기능 격리에 유리하지만 복수 역할 사용자의 문맥 전환과 구현
중복 위험이 크다. 하이브리드는 URL 호환성과 단일 shell을 보존하면서 일반 과업과 고위험 관리
기능을 분리해 검증할 수 있고, 반증되면 consumer migration 없이 되돌릴 수 있다.

## Consequences

### Positive

- 연구와 prototype이 서로 다른 IA 방향으로 분산되지 않는다.
- URL 개명이나 메뉴 데이터 변경 없이 label과 grouping 가설을 검증할 수 있다.
- 일반 사용자 과업과 고위험 관리 기능의 노출 오류를 별도로 측정할 수 있다.

### Costs and risks

- 실제 사용자와 live authority 증거가 들어오면 label, cluster 또는 방향 자체가 바뀔 수 있다.
- "관리 센터"가 과밀해지거나 복수 역할 사용자의 handoff를 끊을 수 있다.
- 잠정 방향을 최종 IA나 authorization으로 오해할 위험이 있다.

## Validation and final acceptance boundary

최종 IA 승격은 다음 증거가 모두 있을 때 별도 accepted transition으로 수행한다.

- live menu, authority assignment와 synthetic effective-menu artifact
- 119 route와 2 alias의 authorization/privacy/capability/profile disposition 및 담당 승인
- role별 card sort/tree test와 독립 holdout 결과
- security/privacy의 URL·노출 검토와 접근성 과업 검증
- owner, 승인자, 날짜, 예외, rollback을 결속한 최종 decision record

하나라도 없으면 `PD-UX-001`과 G1은 계속 `blocked-input`이다.

## Rollback

후속 연구에서 critical-task 성공률, 첫 선택, 노출 오류 또는 접근성 결과가 승인 threshold를
충족하지 못하면 이 잠정 방향을 폐기하거나 새 ADR로 대체한다. 현재 결정은 executable consumer와
menu DB를 바꾸지 않으므로 rollback은 proposal의 잠정 방향 참조와 이 ADR을 supersede하는 것으로
끝나며 route 또는 데이터 rollback을 요구하지 않는다.
