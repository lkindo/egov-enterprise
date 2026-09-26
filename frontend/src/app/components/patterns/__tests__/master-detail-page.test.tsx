import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MasterDetailLayout, MasterDetailPage } from '../master-detail-page';

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: () => <nav aria-label="현재 위치" />,
}));

function precedes(first: Element, second: Element): boolean {
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function renderPage(overrides: Partial<React.ComponentProps<typeof MasterDetailPage>> = {}) {
  return render(
    <MasterDetailPage
      title="부서 관리"
      masterTitle="부서 목록"
      master={(
        <>
          <button type="button" data-a2-master-item aria-current="true">기획부</button>
          <button type="button" data-a2-master-item>개발부</button>
        </>
      )}
      detail={<p>기획부 상세</p>}
      selectedItemLabel="기획부"
      {...overrides}
    />,
  );
}

describe('MasterDetailPage — A2 archetype 문법', () => {
  it('페이지 헤더 → 좌측 마스터 → 우측 상세 순서와 단일 h1을 유지한다', () => {
    renderPage();

    const heading = screen.getByRole('heading', { level: 1, name: '부서 관리' });
    const master = screen.getByTestId('master-detail-master');
    const detail = screen.getByTestId('master-detail-detail');

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(precedes(heading, master)).toBe(true);
    expect(precedes(master, detail)).toBe(true);
  });

  it('선택이 없으면 비활성 상세 대신 명시적 안내를 보여준다', () => {
    renderPage({ detail: undefined, selectedItemLabel: undefined });

    expect(screen.getByRole('status')).toHaveTextContent('항목을 선택하세요');
    expect(screen.getByRole('status')).toHaveTextContent('왼쪽 목록');
  });

  it('마스터 항목에서 아래·위 방향키로 인접 항목을 선택하고 포커스를 옮긴다', () => {
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    renderPage({
      master: (
        <>
          <button type="button" data-a2-master-item aria-current="true" onClick={onFirst}>기획부</button>
          <button type="button" data-a2-master-item onClick={onSecond}>개발부</button>
        </>
      ),
    });

    const first = screen.getByRole('button', { name: '기획부' });
    const second = screen.getByRole('button', { name: '개발부' });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });

    expect(second).toHaveFocus();
    expect(onSecond).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(second, { key: 'ArrowUp' });
    expect(first).toHaveFocus();
    expect(onFirst).toHaveBeenCalledTimes(1);
  });

  it('검색 입력에서는 방향키를 가로채지 않는다', () => {
    const onItem = vi.fn();
    renderPage({
      master: (
        <>
          <input aria-label="부서 검색" />
          <button type="button" data-a2-master-item onClick={onItem}>기획부</button>
        </>
      ),
    });

    const search = screen.getByRole('textbox', { name: '부서 검색' });
    search.focus();
    fireEvent.keyDown(search, { key: 'ArrowDown' });

    expect(onItem).not.toHaveBeenCalled();
    expect(search).toHaveFocus();
  });

  it('DnD 핸들·행 액션의 방향키는 마스터 선택 이동으로 가로채지 않는다', () => {
    const onItem = vi.fn();
    renderPage({
      master: (
        <>
          <button type="button">기획부 순서 이동 핸들</button>
          <button type="button" data-a2-master-item onClick={onItem}>기획부</button>
        </>
      ),
    });

    const dragHandle = screen.getByRole('button', { name: '기획부 순서 이동 핸들' });
    dragHandle.focus();
    fireEvent.keyDown(dragHandle, { key: 'ArrowDown' });

    expect(onItem).not.toHaveBeenCalled();
    expect(dragHandle).toHaveFocus();
  });

  it('Ctrl/Cmd+S를 화면의 실제 저장 동작에 연결하고 비활성 상태에서는 실행하지 않는다', () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <MasterDetailPage
        title="메뉴 관리"
        masterTitle="메뉴 목록"
        master={<button type="button">목록</button>}
        detail={<button type="button">상세 편집</button>}
        onSaveShortcut={onSave}
      />,
    );

    const masterButton = screen.getByRole('button', { name: '목록' });
    fireEvent.keyDown(masterButton, { key: 's', ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender(
      <MasterDetailPage
        title="메뉴 관리"
        masterTitle="메뉴 목록"
        master={<button type="button">목록</button>}
        detail={<button type="button">상세 편집</button>}
        onSaveShortcut={onSave}
        saveShortcutDisabled
      />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: '목록' }), { key: 's', ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('선택된 상세가 없으면 저장 단축키를 실행하지 않는다', () => {
    const onSave = vi.fn();
    render(
      <MasterDetailPage
        title="메뉴 관리"
        masterTitle="메뉴 목록"
        master={<button type="button">목록</button>}
        onSaveShortcut={onSave}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: '목록' }), { key: 's', ctrlKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('선택된 마스터 항목에서 Tab을 누르면 우측 상세의 첫 조작 요소로 이동한다', () => {
    renderPage({
      detailActions: <button type="button">기획부 수정</button>,
      detail: <p>기획부 상세 정보</p>,
    });

    const selected = screen.getByRole('button', { name: '기획부' });
    selected.focus();
    fireEvent.keyDown(selected, { key: 'Tab' });

    expect(screen.getByRole('button', { name: '기획부 수정' })).toHaveFocus();
  });

  describe('좁은 화면에서 항목을 고르면 상세로 옮긴다 (DIP C8)', () => {
    // 상세가 목록 아래에 쌓이는 배치에서는 선택만 바뀌어 사용자가 상세가 바뀐 줄 모른 채 목록에 머물렀다.
    // 쌓였는지는 실제 배치로 판정한다 — 상세의 위쪽이 누른 항목의 아래쪽보다 아래이면 쌓인 것이다.
    const place = (element: HTMLElement, top: number, height: number) => {
      element.getBoundingClientRect = () => ({ top, bottom: top + height, height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    };
    beforeEach(() => {
      vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('상세가 목록 아래에 쌓였으면 누를 때 상세로 스크롤하고 포커스를 옮긴다', () => {
      renderPage();
      const item = screen.getByRole('button', { name: '개발부' });
      const detail = screen.getByTestId('master-detail-detail');
      place(item, 100, 40);
      place(detail, 600, 300);
      const scrollIntoView = vi.fn();
      detail.scrollIntoView = scrollIntoView;

      fireEvent.click(item);

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
      expect(detail).toHaveFocus();
    });

    it('나란히 놓였으면 포커스를 옮기지 않는다', () => {
      renderPage();
      const item = screen.getByRole('button', { name: '개발부' });
      const detail = screen.getByTestId('master-detail-detail');
      place(item, 300, 40);
      place(detail, 120, 500);
      item.focus();

      fireEvent.click(item);

      expect(item).toHaveFocus();
    });

    it('점진 이행 레이아웃(MasterDetailLayout)도 같은 규칙을 따른다', () => {
      render(
        <MasterDetailLayout>
          <div><button type="button" data-a2-master-item>개발부</button></div>
          <div data-a2-detail tabIndex={-1} data-testid="layout-detail">개발부 상세</div>
        </MasterDetailLayout>,
      );
      const item = screen.getByRole('button', { name: '개발부' });
      const detail = screen.getByTestId('layout-detail');
      place(item, 100, 40);
      place(detail, 600, 300);
      detail.scrollIntoView = vi.fn();

      fireEvent.click(item);

      expect(detail).toHaveFocus();
    });

    it('방향키로 목록을 훑을 때는 상세로 옮기지 않는다', () => {
      renderPage();
      const first = screen.getByRole('button', { name: '기획부' });
      const second = screen.getByRole('button', { name: '개발부' });
      place(first, 100, 40);
      place(second, 140, 40);
      place(screen.getByTestId('master-detail-detail'), 600, 300);
      first.focus();

      fireEvent.keyDown(first, { key: 'ArrowDown' });

      expect(second).toHaveFocus();
    });
  });

  it('모바일·데스크톱 표현을 별도 DOM으로 복제하지 않는다', () => {
    const { container } = renderPage();

    expect(container.querySelectorAll('[data-testid="master-detail-master"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="master-detail-detail"]')).toHaveLength(1);
  });

  it('긴 master와 detail을 단일 DOM 안에서 각각 스크롤 가능한 높이로 제한한다', () => {
    renderPage();

    expect(screen.getByTestId('master-detail-layout')).toHaveClass('lg:h-[min(70vh,48rem)]');
    expect(screen.getByTestId('master-detail-master')).toHaveClass('max-h-[60vh]', 'overflow-auto');
    expect(screen.getByTestId('master-detail-detail')).toHaveClass('overflow-auto');
  });

  it('상위 허브가 h1을 소유하면 패널과 양쪽 section heading을 한 단계 내린다', () => {
    renderPage({ headingLevel: 2, showBreadcrumb: false });

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '부서 관리' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: '부서 목록' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: '기획부' })).toBeVisible();
  });
});
