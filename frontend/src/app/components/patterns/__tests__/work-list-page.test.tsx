import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkListPage } from '../work-list-page';

// 브레드크럼은 메뉴 SSOT 를 조회한다 — 이 테스트의 대상은 셸의 골격이므로 메뉴 응답은 고정한다.
vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

/**
 * A1(조회형 목록) archetype 문법 불변식.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A1 · §3 G1~G3.
 * 이 셸의 존재 이유는 화면마다 조립 순서를 재발명하지 않는 것이므로, "무엇이 렌더되는가"가
 * 아니라 **순서와 단일성**을 검사한다 — 총 건수가 두 곳에서 나오거나 조회 조건이 표 아래로
 * 내려가면 컴포넌트가 있어도 문법은 무너진 것이다.
 */

const STORAGE_KEY = 'work-list-filter-open:test-screen';

/** 두 요소가 문서 순서상 앞뒤인지 — 클래스명이 아니라 DOM 순서로 골격을 고정한다. */
function precedes(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function renderPage(overrides: Partial<React.ComponentProps<typeof WorkListPage>> = {}) {
  return render(
    <WorkListPage
      title="업무 요청 목록"
      totalCount={1234}
      filter={<input aria-label="검색어" />}
      filterStateKey="test-screen"
      {...overrides}
    >
      <table data-testid="result-table">
        <caption>결과</caption>
        <tbody><tr><td>행</td></tr></tbody>
      </table>
    </WorkListPage>,
  );
}

describe('WorkListPage — A1 archetype 문법', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('G1 — 헤더 → 조회 조건 → 결과 툴바 → 표 순서를 유지한다', () => {
    renderPage();

    const breadcrumb = screen.getByRole('navigation', { name: '현재 위치' });
    const heading = screen.getByRole('heading', { level: 1, name: '업무 요청 목록' });
    const filter = screen.getByTestId('work-list-filter');
    const toolbar = screen.getByTestId('work-list-toolbar');
    const table = screen.getByTestId('result-table');

    expect(precedes(breadcrumb, heading)).toBe(true);
    expect(precedes(heading, filter)).toBe(true);
    expect(precedes(filter, toolbar)).toBe(true);
    expect(precedes(toolbar, table)).toBe(true);
  });

  it('G3 — 총 건수는 표 위 툴바에 한 번만 나온다', () => {
    const { container } = renderPage();

    const toolbar = screen.getByTestId('work-list-toolbar');
    expect(toolbar).toHaveTextContent('총 1,234건');
    // 문구는 `총 <span>1,234</span>건` 로 쪼개져 있으므로 요소가 아니라 문서 전체 텍스트로 센다.
    expect(container.textContent?.match(/총\s*[\d,]+건/g)).toHaveLength(1);
    expect(precedes(toolbar, screen.getByTestId('result-table'))).toBe(true);
  });

  it('G3 — 총 건수 live region 은 값이 없어도 유지된다', () => {
    const { container } = renderPage({ totalCount: undefined });

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion).toHaveTextContent('');
  });

  it('G2 — 조회 조건은 기본으로 펼쳐진다', () => {
    renderPage();

    expect(screen.getByTestId<HTMLDetailsElement>('work-list-filter').open).toBe(true);
  });

  it('G2 — 저장된 접힘 상태를 복원한다', () => {
    window.localStorage.setItem(STORAGE_KEY, 'false');
    renderPage();

    expect(screen.getByTestId<HTMLDetailsElement>('work-list-filter').open).toBe(false);
  });

  it('G2 — 접힘 상태 변경을 저장한다', () => {
    renderPage();
    const details = screen.getByTestId<HTMLDetailsElement>('work-list-filter');

    details.open = false;
    details.dispatchEvent(new Event('toggle'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');
  });

  it('메뉴 밖 화면은 브레드크럼을 끌 수 있다', () => {
    renderPage({ showBreadcrumb: false });

    expect(screen.queryByRole('navigation', { name: '현재 위치' })).toBeNull();
  });

  it('상위 허브가 h1을 소유하면 패널 제목과 조회 조건 heading을 한 단계 내린다', () => {
    renderPage({ headingLevel: 2, showBreadcrumb: false });

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '업무 요청 목록' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: '조회 조건' })).toBeVisible();
  });

  it('조회 조건이 없으면 조회 조건 영역 자체를 렌더하지 않는다', () => {
    renderPage({ filter: undefined });

    expect(screen.queryByTestId('work-list-filter')).toBeNull();
    expect(screen.getByTestId('work-list-toolbar')).toBeInTheDocument();
  });

  /*
    탭 전환 슬롯(A2 셸의 `navigation` 과 같은 계약). 두 가지를 고정한다 —
      (a) 탭은 조회조건보다 **앞**이다. 무엇을 조회할지가 조건보다 먼저 정해지기 때문이고,
          뒤에 두면 조건을 채운 뒤 탭을 바꿔 그 조건이 버려지는 순서가 된다.
      (b) 탭은 주요 액션과 **다른 줄**이다. 화면 전환과 쓰기 동작이 같은 줄에 붙으면 오조작이 된다.
  */
  it('탭 전환 슬롯은 헤더 아래·조회 조건 위에 오고 주요 액션과 같은 줄에 있지 않다', () => {
    renderPage({
      navigation: <nav aria-label="화면 전환"><button type="button">부서</button></nav>,
      actions: <button type="button">신규 등록</button>,
    });

    const heading = screen.getByRole('heading', { level: 1, name: '업무 요청 목록' });
    const actions = screen.getByRole('button', { name: '신규 등록' });
    const navigation = screen.getByTestId('work-list-navigation');
    const filter = screen.getByTestId('work-list-filter');

    expect(precedes(heading, navigation)).toBe(true);
    expect(precedes(navigation, filter)).toBe(true);
    expect(navigation.contains(actions)).toBe(false);
    expect(screen.getByRole('navigation', { name: '화면 전환' })).toBeVisible();
  });

  it('탭 전환 슬롯이 없으면 그 자리 자체를 렌더하지 않는다', () => {
    renderPage();

    expect(screen.queryByTestId('work-list-navigation')).toBeNull();
  });
});
