# ADR-0006 — 반응형 표현은 단일 SSR DOM 위에서 CSS로만 전환한다

**Status:** Accepted
**Date:** 2026-08-22
**Deciders:** 사용자(제품), 프론트엔드
**Supersedes:** -

## Context

`StandardDataTable`(프론트 49개 화면이 채택)은 데스크톱 `<table>`(`hidden md:block`)과 모바일 카드 `<div>`(`md:hidden`)를 **조건부가 아니라 형제로 항상 함께 렌더**하고 있었다. 한쪽은 `display:none`이라 눈에도 접근성 트리에도 보이지 않지만 DOM에는 존재한다.

실측(10행 × 5열):

| 지표 | 실측 | 단일 트리 기대 |
|---|---:|---:|
| accessor 호출 | 100 | 50 |
| DOM 엘리먼트 | 487 | ≈216 |
| 중복된 testid 값 | 51 | 1 |
| 동일 `aria-label` 행 액션 버튼 | 20 | 10 |

결과로 세 가지 문제가 있었다.

1. **자동화 계약 파손** — Playwright의 `getByTestId`·CSS 로케이터는 hidden 요소도 resolve한다. 2026-08-22 CI run `32555133776`에서 `delete-mail-btn`이 3개→retry 시 7개로 잡혀 strict mode violation이 났다.
2. **accessor 부수효과 중복** — accessor는 소비자 코드다. 27개 파일이 accessor 안에서 버튼·링크·testid를 만들고, 그 전부가 두 번 실행됐다.
3. **모바일 트리의 조용한 비대칭 8건** — `rowTestId` 미전달(타입 단계에서 `Omit`), `empty-table-msg` testid 없음, `column.className` 무시, `caption` 접근 이름 없음, 전체 선택 체크박스 없음 등. 두 트리가 같은 계약을 지키지 않았다.

## Decision

**반응형 표현은 단일 SSR DOM 위에서 CSS로만 전환한다.** 본문 데이터 표현을 뷰포트에 따라 분기하기 위해 다음을 사용하지 않는다.

- `matchMedia` / `useSyncExternalStore` 기반 미디어 스토어
- `next/dynamic` 의 `ssr: false`
- 서버 뷰포트 힌트(`Sec-CH-Viewport-Width` 등)
- 같은 데이터를 두 벌 렌더한 뒤 `hidden`/`md:hidden`으로 한쪽만 보이기

`StandardDataTable`은 단일 `<table>` 트리를 렌더하고, `md` 미만 카드 표현은 `globals.css`의 미디어쿼리가 담당한다. `display`를 바꾸면 `<table>` 계열의 암시 role이 사라지므로 컴포넌트가 `role="table"`·`role="rowgroup"`을 명시하고, 각 `<td>`는 `data-label`로 열 이름을 실어 CSS `::before`가 표시한다.

## Rationale

**하이드레이션 경계를 새로 만들지 않는 것이 결정적이었다.** 이 저장소는 nonce CSP 때문에 `cacheComponents: false` + 루트 `force-dynamic`이다(DEC-OPS-011). 모든 페이지가 요청마다 SSR되고 **SSR HTML이 사용자가 보는 첫 화면**이지 버려지는 셸이 아니다. `matchMedia` 방식은 `useSyncExternalStore`로 감싸면 mismatch 경고는 없앨 수 있지만, "SSR이 칠한 것이 최종본이 아닌" 창을 49개 화면에 만든다. 같은 계열의 결함(`PageTransition`의 이중 마운트)을 바로 직전에 고쳤다.

부수적으로 `vitest.setup.ts`의 전역 `matchMedia` 목이 모든 쿼리에 `matches:false`를 돌려주므로, 훅 방식은 전 유닛테스트를 모바일로 렌더시킨다. 그 목을 고치면 `sidebar.tsx`가 뒤집힌다.

div + ARIA grid 전면 대체(ⓒ)는 같은 이득에 e2e `tr`/`table` 로케이터 14건 파손과 sticky header·caption 재설계 비용을 더한다. `rowTestId` 접미사 완화(ⓓ)는 측정된 중복 44건 중 0건을 고친다 — 중복의 대부분이 **소비자 accessor 안**에서 만들어지기 때문이다.

## Consequences

**얻는 것**
- accessor 호출과 DOM 산출물이 절반으로 준다. 하이드레이션 비용이 직접 줄어든다(force-dynamic 하에서 유의미).
- 모바일에서도 `caption` 접근 이름·열 머리글 연결·`rowTestId`·`empty-table-msg`를 **처음으로** 얻는다. 비대칭 8건이 구조적으로 사라진다.
- 소비자 49파일·accessor 251건은 **무수정**이다. public prop 계약이 그대로다.

**치르는 것**
- `display:block`이 암시 role을 지우므로 명시 role이 유일한 방어선이 된다. jsdom은 CSS를 적용하지 않아 렌더 테스트로는 이 축을 지킬 수 없어 **소스 계약**으로 고정했다(`dom-identity-invariants.test.ts`).
- 소비자가 넘긴 `column.className`(159건)의 폭·정렬 유틸리티는 카드 표현에서 미디어쿼리가 덮는다(선택자 특이성 0,1,3 > 유틸리티 0,1,0).
- 모바일 카드의 시각 디자인이 종전 전용 컴포넌트와 다르다. 라벨-값 2열 격자로 단순화됐다.

**회귀 방지**
- `ui/__tests__/standard-data-table-single-render.test.tsx` — accessor 호출 수, 식별자 1개, `rowTestId` 1개, 음성 대조군(표 1개·행 수·열 머리글 수)
- `src/__tests__/dom-identity-invariants.test.ts` — 명시 role 3종·`data-label`·`md:hidden` 재유입 금지 (소스 계약)
- 두 계약 모두 위반 주입으로 red 증명 완료(2026-08-22)

## Alternatives considered

| 안 | 기각 사유 |
|---|---|
| ⓐ `matchMedia` 훅으로 한 분기만 마운트 | 새 하이드레이션 경계. force-dynamic·CSP 제약과 충돌. vitest 전역 목이 전 테스트를 모바일로 렌더 |
| ⓒ div + ARIA grid 전면 대체 | 같은 이득에 e2e 14건 파손·sticky header·caption 재설계 비용 추가 |
| ⓓ 현행 유지 + `rowTestId` 접미사 | 중복 44건 중 0건 해결(대부분이 소비자 accessor 산출물) |
| ⓕ 셀 결과 호이스팅 | accessor는 50회로 줄지만 DOM·중복 식별자는 그대로 |
