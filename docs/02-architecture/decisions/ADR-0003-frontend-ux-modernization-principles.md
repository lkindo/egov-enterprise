# ADR-0003: 사용자 과업 중심 프런트엔드 UX 현대화 원칙

- **Status:** Accepted
- **Date:** 2026-08-20
- **Decision owners:** repository owner / frontend architecture
- **Related:** [ADR-0001](ADR-0001-core-app-product-boundary.md), [ADR-0002](ADR-0002-korean-first-frontend.md), [UI/UX 현대화 계획](../ui-ux-modernization-plan.md), [프런트엔드 헌법](../../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)

## Context

기존 프런트엔드 헌법은 `Unified Premium`, Hub Blue, glassmorphism, 필수 micro-interaction 같은 특정 미학과 `TanStack Query only`, 모든 초기 데이터 hydration, 모든 mutation optimistic update, `next/image priority` 같은 구현 세부를 장기 규범으로 고정했다.

동시에 이 저장소는 ADR-0001에 따라 동작하는 참조판이자 서로 다른 신규 프로젝트의 시작점이다. 공공서비스용 KRDS 프로필, 민간 파생 프로젝트용 브랜드 프로필, 관리자와 일반 사용자 표면이 같은 core를 공유한다. 특정 브랜드와 일시적인 라이브러리 API를 헌법의 기본 진실로 두면 재사용 경계, 접근성, 보안, 현재 framework API와 충돌한다.

2026-08-20 Claude UI/UX 계획을 현재 디스크에서 적대적으로 재검토한 결과도 다음을 확인했다.

- 활성 PRD와 사용자 과업 baseline이 없는 상태에서 admin route 수로 우선순위를 정했다.
- 실제 사용 중인 component를 dead code로 분류했고 route가 사용하지 않는 component를 파일럿 근거로 삼았다.
- 모든 page에 조상 error boundary가 있는데 페이지별 boundary 확대를 제안했다.
- 자동 접근성 검사에서 일부 대비 규칙이 비활성화돼 있고, 수동 보조기술 평가가 없다.
- KRDS, WCAG, data fetching, generator의 인가/DB 경계가 구현보다 늦게 결정되도록 돼 있었다.

사용자는 이 재검토 과정에서 필요하면 헌법을 개정해 최적안을 추천하도록 명시적으로 승인했다.

## Decision

### 1. 사용자 과업과 신뢰가 시각적 미학보다 우선한다

중대한 IA·업무 흐름·디자인 변경은 확인된 사용자군, 핵심 과업, 현재 기준선과 검증 계획을 가져야 한다. 화면 수, LOC, component 수, 자동 검사 수는 구현·진단 지표이며 사용자 경험 개선의 충분한 증거가 아니다.

### 2. core는 브랜드 중립적 semantic contract를 제공한다

특정 색상이나 미학을 core의 유일한 정체성으로 두지 않는다. 배포 시 `krds-standard`, `krds-aligned`, `premium` 등 명시적으로 선택한 brand profile이 동일한 semantic component, state, interaction, accessibility contract를 구현한다. light/dark/high-contrast 전략은 brand와 별도 축이다.

정부 masthead·운영기관 식별 요소는 theme color가 아니라 적용 자격과 기관 configuration이 확인된 경우에만 사용한다. KRDS 정렬·준수 표현은 pinned version, 적용 매핑, deviation과 검증 증거를 가질 때만 허용한다.

### 3. 공통 접근성 목표를 WCAG 2.2 A+AA로 상향한다

공통 base는 WCAG 2.2 A 및 AA를 제품 목표로 한다. 공공 profile은 KWCAG 2.2와 채택한 KRDS 버전의 적용 항목을 추가로 매핑한다. 자동 검사는 필요조건일 뿐 충분조건이 아니며 주요 완결 과업, 상태, 역할, 반응형 변형의 keyboard·screen reader·reflow/zoom·contrast mode·reduced motion 수동 평가를 포함한다.

평가 범위가 제한된 동안에는 `compliant` 대신 `target` 또는 `aligned`라고 표현한다. 준수 주장은 날짜, 표준 version, 대상 범위, 예외와 증거를 명시해야 한다.

### 4. server/client 데이터 소유권은 결과와 측정으로 결정한다

Server Component를 기본 구조로 하고 client boundary를 필요한 최소 범위로 둔다. 서버가 단독 소유하고 client cache가 필요 없는 데이터는 server-only service/RSC가 직접 가져올 수 있다. client interaction, mutation, background refresh가 필요한 원격 상태는 domain-owned typed TanStack query options/keys로 관리한다.

인증된 초기 핵심 데이터는 TTFB, 최초 데이터 표시, loading 노출, 중복 요청, route JS, cache recovery를 비교해 이익이 있을 때 prefetch/hydration한다. 임의의 hydration 개수 quota를 두지 않는다. query key와 invalidation hierarchy는 중앙 거대 registry가 아니라 해당 domain이 소유한다.

### 5. 상태와 개인정보에는 단일 명확한 소유자를 둔다

공유 가치가 있는 비민감 page/sort/tab 상태만 URL에 둔다. 자격증명, 개인정보, 민감 식별자·검색어·응답 데이터는 URL, JavaScript 접근 가능 영속 저장소, client log, analytics payload에 두지 않는다. 비민감 대용량 상태를 browser storage에 둘 때도 수명과 정보 분류를 검토한다. 외부 전역 상태 library는 실제 복잡성과 별도 채택 결정이 있을 때만 사용한다.

### 6. 복구·mutation은 영향과 위험에 맞춘다

Error Boundary는 page 수가 아니라 독립 복구 단위, query reset 범위, 인증·권한 경계에 맞춘다. 전역 무범위 refetch를 기본값으로 두지 않는다.

Optimistic UI는 작업이 가역적이고 충돌·실패를 안전하게 설명·rollback할 수 있을 때만 사용한다. 권한, 보안 설정, 파괴적·비가역 작업, 중복 실행 위험이 큰 작업은 명시적 근거가 없는 한 서버 확인 후 반영한다.

### 7. 실행되는 검증만 품질 증거로 인정한다

Hard gate는 exact population, 실행 경로, required CI consumer, owner, artifact, empty-population 방지, 재현 가능한 판정 red와 binding red, 예외·만료 정책을 가져야 한다. proxy metric을 사용자 품질이나 표준 준수로 과장하지 않는다. local hook은 빠른 feedback이고 병합 권위는 required CI다.

## Consequences

### Positive

- 공공·민간 profile을 같은 core에서 브랜드 오인 없이 지원할 수 있다.
- 헌법이 framework API 변화에 덜 흔들리고 장기 결과 원칙을 유지한다.
- data fetching, optimistic UI, error recovery를 화면 특성과 위험에 맞게 선택할 수 있다.
- 자동 접근성 green과 실제 접근성 준수의 차이를 명확히 한다.
- UI modernization의 성공을 code adoption이 아니라 사용자 과업과 산출물 진실성으로 판단한다.

### Costs and trade-offs

- 사용자 조사, manual AT, profile matrix와 route artifact 측정 비용이 추가된다.
- 한 개의 강제 template이나 중앙 registry보다 domain별 판단·테스트가 더 필요하다.
- brand profile×color mode 조합이 늘어 테스트 matrix가 커진다.
- 기존 헌법의 구현 세부는 architecture/testing/security guide와 gate registry에서 관리해야 하므로 문서 소유권이 중요해진다.

## Non-decisions

- 목표 sitemap과 menu tree는 `PD-UX-001`의 별도 제품 결정이다.
- 민감 log 검색 조건의 정확한 URL allowlist는 `PD-UX-002`의 별도 결정이다.
- KRDS standard/aligned의 항목별 적용 수준은 pinned mapping에서 확정한다.
- 특정 route의 RSC prefetch와 client fetch 선택은 representative measurement 후 wave evidence 또는 후속 ADR로 정한다.
- 외부 analytics/RUM 서비스 도입은 개인정보·보안 승인 전에는 결정하지 않는다.

## Validation

- [UI/UX 현대화 계획](../ui-ux-modernization-plan.md)의 Decision Gate와 task acceptance criteria로 집행한다.
- [프런트엔드 헌법](../../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)을 이 결정과 동기화한다.
- architecture/design/testing guide는 구체 구현과 실행 명령을 소유하되 이 ADR의 결과 원칙을 약화할 수 없다.
