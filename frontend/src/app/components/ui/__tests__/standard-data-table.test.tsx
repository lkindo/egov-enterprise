import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Column,
  RowActionLabel,
  StandardDataTable,
  StandardDataTableProps,
} from '../standard-data-table';

interface TestRow {
  id: number;
  name: string;
  state: string;
}

const rows: TestRow[] = [
  { id: 11, name: '홍길동', state: '활성' },
  { id: 12, name: '김영희', state: '대기' },
];

const columns: Column<TestRow>[] = [
  { header: '이름', accessor: 'name' },
  { header: '상태', accessor: (row, index) => `${row.state}-${index}` },
];

type TestTableOverrides = Partial<
  Omit<StandardDataTableProps<TestRow>, 'onRowClick' | 'rowActionLabel'>
> & (
  | { onRowClick: (item: TestRow) => void; rowActionLabel: RowActionLabel<TestRow> }
  | { onRowClick?: undefined; rowActionLabel?: never }
);

function renderTable(overrides: TestTableOverrides = {}) {
  const props: StandardDataTableProps<TestRow> = {
    columns,
    data: rows,
    keyField: 'id',
    ...overrides,
  };
  return render(<StandardDataTable {...props} />);
}

describe('StandardDataTable', () => {
  it('md 미만 카드 표현이 쓸 열 라벨을 각 셀의 data-label 로 제공한다', () => {
    // [2026-08-22 ADR-0006] 종전에는 모바일 전용 카드 컴포넌트가 열 라벨을 SPAN 으로 **한 벌 더**
    //   렌더했다(그래서 이 테스트가 `.md\:hidden` 안의 SPAN 을 찾았다). 이제 DOM 은 하나이고
    //   카드 표현은 CSS 가 `td::before { content: attr(data-label) }` 로 만든다.
    //   라벨의 존재는 여기서, 시각 표현은 globals.css 의 미디어쿼리에서 책임진다.
    renderTable();

    const table = screen.getByRole('table');
    const firstBodyRow = within(table).getAllByRole('row')[1];
    const labels = within(firstBodyRow)
      .getAllByRole('cell')
      .map((cell) => cell.getAttribute('data-label'));

    // 문자열 header 를 가진 열은 모두 라벨을 갖는다. 라벨이 없으면 md 미만에서 값만 남아
    // "이게 무슨 값인지" 알 수 없게 된다.
    expect(labels).toContain('이름');
    expect(labels).toContain('상태');
  });

  it('표에 접근 가능한 이름을 제공하고 클릭 콜백이 없으면 모바일 카드를 버튼으로 노출하지 않는다', () => {
    renderTable();

    expect(screen.getByRole('table', { name: '데이터 목록' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('실제 desktop overflow에만 표 이름과 결속된 키보드 스크롤 영역을 제공한다', () => {
    const clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return (this as HTMLElement).dataset.slot === 'standard-data-table-scroll-region' ? 320 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        return (this as HTMLElement).dataset.slot === 'standard-data-table-scroll-region' ? 640 : 0;
      },
    });

    try {
      renderTable({ accessibleLabel: '사용자 목록' });

      const region = screen.getByRole('region', { name: '사용자 목록 스크롤 영역' });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(region).toHaveClass('focus-visible:ring-2');
      region.focus();
      expect(region).toHaveFocus();
    } finally {
      if (clientWidthDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidthDescriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
      }
      if (scrollWidthDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scrollWidthDescriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
      }
    }
  });

  it('중첩된 실제 table과 동적 셀 변경을 관찰해 스크롤 영역 상태를 즉시 갱신한다', async () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const observedTargets = new Set<Element>();
    const clientWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const scrollWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');

    class TrackingResizeObserver {
      observe(target: Element) {
        observedTargets.add(target);
      }
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = TrackingResizeObserver as unknown as typeof ResizeObserver;
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return (this as HTMLElement).dataset.slot === 'standard-data-table-scroll-region' ? 320 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        if ((this as HTMLElement).dataset.slot !== 'standard-data-table-scroll-region') return 0;
        return this.textContent?.includes('동적으로 길어진 셀 내용') ? 640 : 320;
      },
    });

    try {
      const { rerender } = renderTable({ accessibleLabel: '동적 사용자 목록' });
      const table = screen.getByRole('table', { name: '동적 사용자 목록' });

      expect(observedTargets).toContain(table);
      expect(screen.queryByRole('region', { name: '동적 사용자 목록 스크롤 영역' })).not.toBeInTheDocument();

      rerender(
        <StandardDataTable
          columns={columns}
          data={[{ ...rows[0], name: '동적으로 길어진 셀 내용' }, rows[1]]}
          keyField="id"
          accessibleLabel="동적 사용자 목록"
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole('region', { name: '동적 사용자 목록 스크롤 영역' }))
          .toHaveAttribute('tabindex', '0');
      });

      rerender(
        <StandardDataTable
          columns={columns}
          data={rows}
          keyField="id"
          accessibleLabel="동적 사용자 목록"
        />,
      );

      await waitFor(() => {
        expect(screen.queryByRole('region', { name: '동적 사용자 목록 스크롤 영역' }))
          .not.toBeInTheDocument();
      });
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
      if (clientWidthDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidthDescriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
      }
      if (scrollWidthDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollWidth', scrollWidthDescriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
      }
    }
  });

  it('행 작업은 호출부가 명시한 실제 intent로 표시하고 셀 내부 조작은 행 작업을 실행하지 않는다', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const actionColumns: Column<TestRow>[] = [
      ...columns,
      {
        header: '작업',
        accessor: () => <button type="button">행 메뉴</button>,
      },
    ];

    renderTable({
      columns: actionColumns,
      onRowClick,
      rowActionLabel: (row) => `${row.name} 계정 선택`,
    });

    expect(document.querySelector('button button')).toBeNull();
    const firstRowAction = screen.getAllByRole('button', { name: '행 메뉴' })[0];
    await user.click(firstRowAction);
    expect(onRowClick).not.toHaveBeenCalled();

    const rowActions = screen.getAllByRole('button', { name: '홍길동 계정 선택' });
    expect(rowActions).toHaveLength(1);
    expect(rowActions[0]).toHaveTextContent('홍길동 계정 선택');
    rowActions[0].focus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledOnce();
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('키 접근자와 함수 접근자를 데스크톱·모바일 뷰에 동일하게 렌더링한다', () => {
    const onRowClick = vi.fn();
    renderTable({
      onRowClick,
      rowActionLabel: (row) => `${row.name} 상세 열기`,
      rowTestId: 'desktop-row',
    });

    expect(screen.getAllByText('홍길동')).toHaveLength(1);
    expect(screen.getAllByText('활성-0')).toHaveLength(1);

    const desktopRow = screen.getAllByTestId('desktop-row')[0];
    expect(desktopRow).not.toHaveAttribute('tabindex');
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('행·전체 선택을 실제 항목 배열로 bulk action에 전달하고 전체 해제한다', async () => {
    const user = userEvent.setup();
    const onBulkAction = vi.fn();
    const onRowClick = vi.fn();
    renderTable({
      enableSelection: true,
      onRowClick,
      rowActionLabel: (row) => `${row.name} 상세 열기`,
      bulkActions: [{ label: '상태 변경', onClick: onBulkAction }],
    });

    const table = screen.getByRole('table');
    const checkboxes = within(table).getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(onRowClick).not.toHaveBeenCalled();
    expect(screen.getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '상태 변경' }));
    expect(onBulkAction).toHaveBeenCalledWith([rows[0]]);

    await user.click(screen.getByRole('button', { name: '선택한 1개 항목 전체 해제' }));
    expect(screen.queryByRole('button', { name: '상태 변경' })).not.toBeInTheDocument();

    await user.click(checkboxes[0]);
    await user.click(screen.getByRole('button', { name: '상태 변경' }));
    expect(onBulkAction).toHaveBeenLastCalledWith(rows);
  });

  it('bulk action pending 상태를 비활성화하고 보조기술에 안내한다', async () => {
    const user = userEvent.setup();
    const onBulkAction = vi.fn();
    renderTable({
      enableSelection: true,
      bulkActions: [{
        label: '삭제',
        pendingLabel: '삭제 처리 중…',
        disabled: true,
        ariaBusy: true,
        onClick: onBulkAction,
      }],
    });

    await user.click(within(screen.getByRole('table')).getAllByRole('checkbox')[1]);

    const action = screen.getByRole('button', { name: '삭제 처리 중…' });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('aria-busy', 'true');
    await user.click(action);
    expect(onBulkAction).not.toHaveBeenCalled();
  });

  it('행 작업 문구가 비어 있으면 상세 동작을 추측하지 않고 중립 문구로 축소한다', () => {
    renderTable({ onRowClick: vi.fn(), rowActionLabel: '   ' });

    expect(screen.getAllByRole('button', { name: '1번째 항목 작업' })).toHaveLength(1);
    expect(screen.queryByText('상세 보기')).not.toBeInTheDocument();
  });

  it('검색 제출·초기화와 페이지 탐색을 상위 콜백에 결속한다', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const onClear = vi.fn();
    const onPageChange = vi.fn();
    renderTable({
      data: [],
      search: { placeholder: '이름 검색', onSearch, onClear },
      pagination: {
        currentPage: 3,
        totalPages: 8,
        totalCount: 71,
        pageSize: 10,
        onPageChange,
      },
    });

    const input = screen.getByRole('textbox', { name: '데이터 검색' });
    await user.type(input, 'alpha');
    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(onSearch).toHaveBeenCalledWith('alpha');
    expect(screen.getAllByText('"alpha"에 대한 검색 결과가 없습니다.')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(input).toHaveValue('');

    await user.click(screen.getByRole('button', { name: '이전 페이지' }));
    await user.click(screen.getByRole('button', { name: '4 페이지' }));
    await user.click(screen.getByRole('button', { name: '다음 페이지' }));
    expect(onPageChange.mock.calls).toEqual([[2], [4], [4]]);
    expect(screen.getByText((_, element) => (
      element?.tagName === 'P' && element.textContent?.includes('21–30번째') === true
    ))).toBeInTheDocument();
  });

  it('페이지 탐색은 순서 목록(ol/li) 시맨틱을 가진다 (KRDS/WCAG — breadcrumb 과 동일 규격)', () => {
    renderTable({
      pagination: { currentPage: 5, totalPages: 20, onPageChange: vi.fn() },
    });

    const nav = screen.getByRole('navigation', { name: '페이지 탐색' });
    const list = within(nav).getByRole('list');
    // 이전/다음 + 표시 페이지 번호들이 각각 listitem 이어야 스크린리더가
    // "몇 개 중 몇 번째"를 셈할 수 있다 (aria-hidden 인 말줄임 li 는 셈에서 제외됨).
    const items = within(list).getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(within(list).getByRole('button', { name: '이전 페이지' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: '다음 페이지' })).toBeInTheDocument();
  });

  it('페이지 범위가 바뀌는 즉시 이전 선택을 폐기한다', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = renderTable({
      enableSelection: true,
      bulkActions: [{ label: '삭제', onClick: vi.fn() }],
      pagination: { currentPage: 1, totalPages: 2, onPageChange },
    });

    const firstRowCheckbox = within(screen.getByRole('table')).getAllByRole('checkbox')[1];
    await user.click(firstRowCheckbox);
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument();

    rerender(
      <StandardDataTable
        columns={columns}
        data={rows}
        keyField="id"
        enableSelection
        bulkActions={[{ label: '삭제', onClick: vi.fn() }]}
        pagination={{ currentPage: 2, totalPages: 2, onPageChange }}
      />,
    );

    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('checkbox')[0]).not.toBeChecked();
  });

  it('오류·빈 상태를 구분하고 재시도 콜백을 제공한다', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = renderTable({ data: [], error: new Error('network down'), onRetry });

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByText('network down')).toHaveLength(1);
    await user.click(screen.getAllByRole('button', { name: '데이터 다시 불러오기' })[0]);
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(
      <StandardDataTable
        columns={columns}
        data={[]}
        keyField="id"
        emptyMessage="표시할 행이 없습니다."
      />,
    );
    expect(screen.getAllByText('표시할 행이 없습니다.')).toHaveLength(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
