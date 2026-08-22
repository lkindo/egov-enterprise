# Design System: eGov Enterprise

> **상위 규범:** [프런트엔드 디자인 및 UX 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) · [ADR-0003](decisions/ADR-0003-frontend-ux-modernization-principles.md)
>
> **현대화 실행 계획:** [ui-ux-modernization-plan.md](ui-ux-modernization-plan.md)

## 1. 목표: Task-First, Profile-Driven

디자인 시스템의 첫 목표는 특정한 “프리미엄 외관”이 아니라 사용자가 핵심 과업을 안전하게 이해·완료·복구하도록 돕는 것이다. 재사용 core는 브랜드에 중립적인 시맨틱 컴포넌트 계약을 제공하고, 배포 프로필이 같은 계약을 서로 다른 시각 언어로 구현한다.

- **Task-first:** hierarchy, density, motion과 장식은 과업 이해와 피드백에 기여해야 한다.
- **Trustworthy:** demo·partial·unavailable 상태와 데이터 출처를 실제 기능처럼 위장하지 않는다.
- **Inclusive:** 모든 프로필은 동일한 WCAG 2.2 접근성 하한과 상태·입력 방식 계약을 유지한다.
- **Evidence-led:** 토큰·컴포넌트 채택률은 구현 지표다. UX 완료는 과업·접근성·성능 결과로 판정한다.

## 2. Profile과 Color Mode

브랜드와 색상 모드는 독립된 축이다.

| 축 | 후보 | 의미 |
|---|---|---|
| Brand profile | `krds-standard` | 자격 있는 공공서비스가 pinned KRDS 필수 항목과 identity 계약을 적용 |
| Brand profile | `krds-aligned` | KRDS 토큰·컴포넌트·패턴·접근성 계약을 따르며 기관별 시각 확장을 허용 |
| Brand profile | `premium` | 참조판·민간 파생 프로젝트용 선택 프로필. 기존 Hub Blue와 선택적 rich effect를 여기서 소유 |
| Color mode | `light`, `dark` | profile과 독립적인 명도 체계 |
| Contrast strategy | forced-colors/high-contrast | 운영체제 모드와 공공 프로필 요구에 따른 별도 전략 |

정부 masthead·운영기관 식별자는 단순 theme flag가 아니다. 적용 자격과 기관명·콘텐츠 구성, KRDS mapping이 확인된 경우에만 활성화한다. 기본 core나 premium profile에서 정부 서비스로 오인시킬 요소를 켜지 않는다.

KRDS 원문 version, profile별 claim, identity 자격, adopted/adapted/deferred 판정의 정본은 [KRDS 프로필 추적 매트릭스](krds-profile-mapping.md)와 [`config/krds-profile-mapping.json`](../../config/krds-profile-mapping.json)이다. 현재 허용되는 표현은 `target`이며, token 유사성이나 component 존재만으로 `aligned`·`verified scope`·`compliant`를 주장하지 않는다.

현재 구현이 실제로 위 profile matrix를 지원한다는 의미는 아니다. 도입 순서와 수용 기준은 현대화 계획 D2를 따른다.

## 3. Token Architecture

```text
primitive token → semantic token → 필요한 경우 component token
```

- **Primitive:** raw color/space/type scale. 컴포넌트가 직접 소비하지 않는다.
- **Semantic:** `background`, `surface`, `foreground`, `muted`, `primary`, `danger`, `focus-ring`처럼 역할을 표현하며 컴포넌트의 기본 API다.
- **Component:** 여러 실제 소비자에서 반복되는 컴포넌트별 결정을 표현할 때만 추가한다.

색상 토큰 구현의 현재 SSOT와 literal→semantic 매핑은 [design-tokens.md](../03-guides/design-tokens.md)를 따른다. profile 현대화가 완료되기 전에는 문서의 목표 상태와 현재 구현을 혼동하지 않는다.

Token set equality와 정적 ratio test는 저비용 preflight다. 실제 대비는 profile×mode×state의 computed rendering에서 font size/weight, alpha, gradient, image, blur, focus, disabled/selected, forced colors까지 평가한다.

## 4. Typography, Content, Geometry

- 한국어 사용자 UI는 ADR-0002에 따라 한국어를 우선한다.
- font, size, weight, line height와 tracking은 장식적 정체성보다 읽기와 정보 밀도를 우선한다.
- 영문 uppercase와 넓은 letter spacing을 한국어 label에 기계적으로 적용하지 않는다.
- action label은 사용자가 결과를 예측할 수 있는 동사+대상 구조를 선호한다.
- 긴 한국어·영문·URL, 200% text와 320 CSS px에서 정보·기능을 보존한다.
- radius, blur, gradient, shadow는 profile recipe일 수 있지만 component semantic contract는 아니다.

기존 `Hub Blue (#0055FF)`, backdrop blur, premium shadow는 삭제 대상이 아니라 `premium` profile의 선택 표현이다. public/admin 모든 화면의 헌법적 기본값으로 강제하지 않는다.

## 5. Component Ownership

| 경계 | 허용 책임 | 금지 책임 |
|---|---|---|
| `components/ui` | service/router/context를 모르는 primitive | domain fetch, auth rule, route navigation |
| `components/shared` | 여러 feature가 쓰는 composite | 특정 domain mutation/validation |
| `features/<domain>` | domain UI, query options, service adapter | 다른 domain의 내부 구현 소유 |
| `app/**/_components` | app shell·segment 전용 UI | 근거 없는 전역 public API 승격 |

물리적 폴더 하나로 모든 component를 모으는 것은 목표가 아니다. 의존 방향, profile 제거 가능성, server/client boundary와 public API의 명확성이 목표다.

Page scaffold는 heading, breadcrumb, action, status slot 같은 표현 구조만 소유한다. API 호출, 권한, query/mutation, 도메인 validation은 소유하지 않는다. List/CRUD/Detail/Hub 네 가지 틀에 wizard, tree, calendar, composer, matrix/canvas를 억지로 넣지 않는다.

## 6. State and Interaction Contract

적용 가능한 컴포넌트·화면은 normal뿐 아니라 loading, stale refresh, first-use empty, filtered-zero, partial failure, offline, permission, validation, mutation pending/failure, destructive pending, session expiry, unsaved/autosaved/restored, demo/unavailable 상태를 명시한다.

각 상태는 다음을 가진다.

- visible message와 다음 행동.
- focus 정책과 screen-reader announcement.
- 입력·기존 데이터 보존 정책.
- 중복 실행·retry idempotence 정책.
- mobile representation과 keyboard/touch parity.

Hover-only tooltip에 필수 정보를 두지 않는다. dialog, sheet, menu와 composite widget은 진입 focus, keyboard 조작, Escape, 닫힘 후 focus return을 제공한다.

## 7. Verification

Component 품질은 실제 public variant와 state를 실행하는 테스트로 증명한다. 실행되지 않는 카탈로그나 snapshot만으로 품질을 주장하지 않는다.

- Unit/component: semantics, state, keyboard, focus, content bounds.
- Browser/E2E: actual CSS, overlay, responsive/reflow, complete process.
- Automated accessibility: 대표 DOM의 검출 가능한 규칙.
- Manual: keyboard, screen reader, zoom/reflow, high contrast, reduced motion.
- Visual: critical region의 profile×mode 기준선과 의미 assertion.

KRDS 적용 범위와 source pin은 [KRDS 프로필 추적 매트릭스](krds-profile-mapping.md), gate metadata와 release sign-off는 [현대화 계획](ui-ux-modernization-plan.md)이 정의한다.

---

*Verified against the frontend constitution, ADR-0003 and the pinned KRDS mapping: 2026-08-21*
