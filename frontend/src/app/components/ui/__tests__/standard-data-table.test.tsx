import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Column,
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

function renderTable(overrides: Partial<StandardDataTableProps<TestRow>> = {}) {
  const props: StandardDataTableProps<TestRow> = {
    columns,
    data: rows,
    keyField: 'id',
    ...overrides,
  };
  return render(<StandardDataTable {...props} />);
}

describe('StandardDataTable', () => {
  it('키 접근자와 함수 접근자를 데스크톱·모바일 뷰에 동일하게 렌더링한다', () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick, rowTestId: 'desktop-row' });

    expect(screen.getAllByText('홍길동')).toHaveLength(2);
    expect(screen.getAllByText('활성-0')).toHaveLength(2);

    const desktopRow = screen.getAllByTestId('desktop-row')[0];
    fireEvent.keyDown(desktopRow, { key: 'Enter' });
    fireEvent.keyDown(desktopRow, { key: ' ' });
    expect(onRowClick).toHaveBeenNthCalledWith(1, rows[0]);
    expect(onRowClick).toHaveBeenNthCalledWith(2, rows[0]);
  });

  it('행·전체 선택을 실제 항목 배열로 bulk action에 전달하고 전체 해제한다', async () => {
    const user = userEvent.setup();
    const onBulkAction = vi.fn();
    renderTable({
      enableSelection: true,
      bulkActions: [{ label: '상태 변경', onClick: onBulkAction }],
    });

    const table = screen.getByRole('table');
    const checkboxes = within(table).getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(screen.getByText('1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '상태 변경' }));
    expect(onBulkAction).toHaveBeenCalledWith([rows[0]]);

    await user.click(screen.getByRole('button', { name: '선택한 1개 항목 전체 해제' }));
    expect(screen.queryByRole('button', { name: '상태 변경' })).not.toBeInTheDocument();

    await user.click(checkboxes[0]);
    await user.click(screen.getByRole('button', { name: '상태 변경' }));
    expect(onBulkAction).toHaveBeenLastCalledWith(rows);
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
    expect(screen.getAllByText('"alpha"에 대한 검색 결과가 없습니다.')).toHaveLength(2);

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

    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getAllByText('network down')).toHaveLength(2);
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
    expect(screen.getAllByText('표시할 행이 없습니다.')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
