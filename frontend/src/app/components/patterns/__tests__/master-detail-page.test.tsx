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

  it('기본 범위를 명시해도(detail) 상세 없이 저장 단축키를 실행하지 않는다', () => {
    const onSave = vi.fn();
    render(
      <MasterDetailPage
        title="메뉴 관리"
        masterTitle="메뉴 목록"
        master={<button type="button">목록</button>}
        onSaveShortcut={onSave}
        saveShortcutScope="detail"
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: '목록' }), { key: 's', metaKey: true });
    expect(onSave).not.toHaveBeenCalled();
  });

  it('선택과 무관한 저장(saveShortcutScope="page")은 상세 없이도 실행하고, 비활성·Alt 조합은 따른다', () => {
    // [2026-10-02] 메뉴 구조 저장은 여러 메뉴의 순서·계층 초안을 저장한다 — 어떤 메뉴를 골랐는지와 무관하다.
    const onSave = vi.fn();
    const { rerender } = render(
      <MasterDetailPage
        title="메뉴 관리"
        masterTitle="메뉴 목록"
        master={<button type="button">목록</button>}
        onSaveShortcut={onSave}
        saveShortcutScope="page"
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: '목록' }), { key: 's', ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('button', { name: '목록' }), { key: 's', ctrlKey: true, altKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);

    rerender(
      <MasterDetailPage
        title="메뉴 관리"
        masterTitle="메뉴 목록"
        master={<button type="button">목록</button>}
        onSaveShortcut={onSave}
        saveShortcutScope="page"
        saveShortcutDisabled
      />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: '목록' }), { key: 's', ctrlKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
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

  it('기본 폭은 좁은 마스터 + 넓은 상세이고, masterSize="wide" 만 넓은 마스터 + 좁은 상세로 바꾼다', () => {
    // 기본값(지정하지 않음·'default')은 기존 다섯 화면의 의미 그대로다.
    const { unmount } = renderPage();
    const defaultLayout = screen.getByTestId('master-detail-layout');
    expect(defaultLayout).toHaveClass('lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]');
    expect(defaultLayout).not.toHaveClass('lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]');
    unmount();

    const explicit = renderPage({ masterSize: 'default' });
    expect(screen.getByTestId('master-detail-layout')).toHaveClass('lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]');
    explicit.unmount();

    renderPage({ masterSize: 'wide' });
    const wide = screen.getByTestId('master-detail-layout');
    expect(wide).toHaveClass('lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]');
    expect(wide).not.toHaveClass('lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]');
    // 높이 제한과 각 영역의 스크롤은 폭과 무관하게 같다.
    expect(wide).toHaveClass('lg:h-[min(70vh,48rem)]');
    expect(screen.getByTestId('master-detail-master')).toHaveClass('max-h-[60vh]', 'overflow-auto');
  });

  describe('업무면 fill 셸 (2026-10-05, 카탈로그 §4)', () => {
    // fill 은 opt-in 이다. 기본(prop 없음)은 위 70vh 계약 그대로여야 하고(공통코드 허브 등 시각 회귀 기준선), fill 은
    // work-fill 조건(폭 lg 이상 · 높이 600px 이상 · screen) 안에서만 남은 높이를 채우고 조건 밖에서는 기본과 같다.
    // 루트는 고정 높이가 아니라 최소 높이다 — 창이 낮으면 셸이 늘어나 페이지가 스크롤하고 내용이 푸터를 덮지 않는다(work-fill.ts).
    const FILL_ROOT = ['work-fill:flex', 'work-fill:flex-col', 'work-fill:min-h-[var(--work-fill-height)]'];
    // 작업 영역은 기준 0px 로 남은 높이만 받고, 사슬이 끊기면 스스로 스크롤하는 안전판(relative·overflow-y-auto)을 둔다.
    // [2026-10-05 2차 리뷰] A2 의 바닥값은 공용 12rem 이 아니라 22rem 이다 — 12rem 이면 두 칸의 머리·여백만 남고 목록이 0줄이었다
    //   (Chromium 실측 1366×768 사이드바 펼침, 메뉴 보드 0줄). 그보다 낮은 창에서는 셸이 늘어나 페이지가 스크롤한다.
    const FILL_LAYOUT = [
      'work-fill:flex-[1_1_0px]', 'work-fill:min-h-[22rem]', 'work-fill:h-auto', 'print:h-auto',
      'work-fill:relative', 'work-fill:overflow-y-auto', 'work-fill:-m-1', 'work-fill:p-1',
    ];

    it('기본은 fill 클래스·표지를 하나도 갖지 않는다', () => {
      renderPage();
      const root = screen.getByTestId('master-detail-page');
      const layout = screen.getByTestId('master-detail-layout');

      // 표지는 fill 화면의 푸터 숨김 근거다(globals.css :has) — 기본 셸이 표지를 달면 일반 화면의 푸터가 넓은 화면에서 사라진다.
      expect(root).not.toHaveAttribute('data-work-fill');
      expect(root.className).not.toMatch(/work-fill:/);
      expect(layout.className).not.toMatch(/work-fill:|print:/);
      expect(screen.getByTestId('master-detail-master').className).not.toMatch(/print:/);
      expect(screen.getByTestId('master-detail-detail').className).not.toMatch(/print:/);
    });

    it('fill 이면 루트가 화면 높이의 세로 flex 가 되고 작업 영역이 남은 높이를 받는다', () => {
      renderPage({ fill: true });
      const root = screen.getByTestId('master-detail-page');
      const layout = screen.getByTestId('master-detail-layout');

      expect(root).toHaveAttribute('data-work-fill');
      expect(root).toHaveClass(...FILL_ROOT);
      expect(root.className, '루트에 고정 높이를 두면 낮은 창에서 내용이 루트 밖으로 넘쳐 푸터를 덮는다').not.toMatch(/work-fill:h-\[/);
      expect(layout).toHaveClass(...FILL_LAYOUT);
      // 공용 바닥값(12rem)은 A2 바닥값에 덮여 남지 않는다(tailwind-merge — 두 값이 함께 남으면 CSS 순서가 정한다).
      expect(layout).not.toHaveClass('work-fill:min-h-[12rem]');
      // 조건 밖에서는 기본과 같다 — 70vh·min-h 를 지우지 않고 조건 안에서만 덮는다.
      expect(layout).toHaveClass('lg:h-[min(70vh,48rem)]', 'min-h-[32rem]');
    });

    it('[2차 리뷰] fill 이면 조건 안에서만 머리·칸 여백을 줄이고, 설명을 제목 옆에 두며, 칸 도구 줄은 접지 않는다', () => {
      renderPage({ fill: true, description: '부서 계층을 편집합니다.', masterDescription: '부서 12개', masterTools: <button type="button">찾기</button> });
      const root = screen.getByTestId('master-detail-page');
      const master = screen.getByTestId('master-detail-master');
      const masterHead = master.closest('section')!.querySelector(':scope > header') as HTMLElement;
      const detailHead = screen.getByTestId('master-detail-detail').closest('section')!.querySelector(':scope > header') as HTMLElement;
      const tools = masterHead.querySelector('[data-master-tools]') as HTMLElement;

      expect(root).toHaveClass('work-fill:space-y-3');
      // 페이지 설명·칸 설명은 제목과 같은 줄(들어가지 않으면 다음 줄로 접힌다).
      const pageTitleRow = screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement;
      expect(pageTitleRow).toHaveClass('work-fill:flex', 'work-fill:flex-wrap', 'work-fill:items-baseline');
      expect(screen.getByText('부서 계층을 편집합니다.')).toHaveClass('work-fill:mt-0');
      expect(screen.getByText('부서 12개')).toHaveClass('work-fill:mt-0');
      // 칸 머리는 위아래 8px·좌우 12px, 칸 내용은 12px(기본 --filter-pad 32px 는 조건 밖에 그대로 남는다).
      for (const head of [masterHead, detailHead]) expect(head).toHaveClass('p-[var(--filter-pad)]', 'work-fill:px-3', 'work-fill:py-2');
      for (const pane of [master, screen.getByTestId('master-detail-detail')]) expect(pane).toHaveClass('p-[var(--filter-pad)]', 'work-fill:p-3');
      // 도구 줄은 조건 안에서 줄바꿈하지 않고 남는 자리를 받는다(제목 옆이 아니면 제목 아래 한 줄).
      expect(tools).toHaveClass('flex-wrap', 'work-fill:flex-nowrap', 'work-fill:grow');
    });

    it('[2차 리뷰] 넓은 마스터의 fill 은 조건 안에서 상세 칸을 18~22rem 으로 줄인다(조건 밖 기본 20~26rem 은 그대로)', () => {
      const { unmount } = renderPage({ fill: true, masterSize: 'wide' });
      const layout = screen.getByTestId('master-detail-layout');
      expect(layout).toHaveClass('lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]', 'work-fill:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]');
      unmount();
      // 기본 폭(좁은 마스터)과 fill 이 아닌 넓은 마스터는 바꾸지 않는다.
      const narrow = renderPage({ fill: true });
      expect(screen.getByTestId('master-detail-layout').className).not.toMatch(/work-fill:grid-cols/);
      narrow.unmount();
      renderPage({ masterSize: 'wide' });
      expect(screen.getByTestId('master-detail-layout').className).not.toMatch(/work-fill:/);
    });

    it('[2차 리뷰] fill 이 아니면 머리·칸 압축 클래스를 하나도 갖지 않는다(조건 밖·다른 화면 기준선 보존)', () => {
      renderPage({ description: '설명', masterDescription: '부서 12개', masterTools: <button type="button">찾기</button> });
      const page = screen.getByTestId('master-detail-page');
      for (const element of page.querySelectorAll<HTMLElement>('*')) {
        expect(element.className, element.outerHTML.slice(0, 80)).not.toMatch(/work-fill:/);
      }
    });

    it('fill 에서도 마스터·상세 칸은 각자 스크롤하고, 인쇄에서는 펼친다', () => {
      renderPage({ fill: true, masterSize: 'wide' });

      for (const pane of [screen.getByTestId('master-detail-master'), screen.getByTestId('master-detail-detail')]) {
        expect(pane).toHaveClass('min-h-0', 'flex-1', 'overflow-auto', 'print:max-h-none', 'print:overflow-visible');
      }
      expect(screen.getByTestId('master-detail-layout')).toHaveClass('lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]');
    });

    it('masterFillChild·detailFillChild 는 fill 일 때만 칸을 세로 flex 로 바꿔 자식에게 남은 높이를 넘긴다', () => {
      const { unmount } = renderPage({ fill: true, detailFillChild: true });
      expect(screen.getByTestId('master-detail-detail')).toHaveClass('work-fill:flex', 'work-fill:flex-col', 'overflow-auto');
      expect(screen.getByTestId('master-detail-master').className).not.toMatch(/work-fill:flex/);
      unmount();

      const both = renderPage({ fill: true, masterFillChild: true, detailFillChild: true });
      expect(screen.getByTestId('master-detail-master')).toHaveClass('work-fill:flex', 'work-fill:flex-col');
      expect(screen.getByTestId('master-detail-detail')).toHaveClass('work-fill:flex', 'work-fill:flex-col');
      both.unmount();

      // fill 이 아니면 아무 일도 하지 않는다(기본 배치 보존).
      renderPage({ masterFillChild: true, detailFillChild: true });
      expect(screen.getByTestId('master-detail-master').className).not.toMatch(/work-fill:/);
      expect(screen.getByTestId('master-detail-detail').className).not.toMatch(/work-fill:/);
    });

    it('fill 은 영역 수를 늘리지 않는다(단일 DOM, ADR-0006)', () => {
      const { container } = renderPage({ fill: true });

      expect(container.querySelectorAll('[data-testid="master-detail-master"]')).toHaveLength(1);
      expect(container.querySelectorAll('[data-testid="master-detail-detail"]')).toHaveLength(1);
    });
  });

  it('상위 허브가 h1을 소유하면 패널과 양쪽 section heading을 한 단계 내린다', () => {
    renderPage({ headingLevel: 2, showBreadcrumb: false });

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '부서 관리' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: '부서 목록' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 3, name: '기획부' })).toBeVisible();
  });
});
