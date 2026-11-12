import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { StandardDataTable, nextServerSort, type Column, type ServerSortState } from '../standard-data-table';

/**
 * [Wave 4 GAP-UI-001] 서버 정렬 계약. serverSortKey 열은 serverSort 를 주는 표에서 서버에 정렬을 맡긴다 — 머리글은 상태를 그리기만
 * 하고(aria-sort), 누르면 다음 정렬을 onSortChange 로 알린다. 서버 정렬은 목록 전체에 걸리므로 '현재 페이지 안에서만' 고지를 하지
 * 않는다. serverSort 를 주지 않는 표에서 같은 열은 종전 현재 페이지 정렬이다.
 */
interface Row { id: number; name: string }

const rows: Row[] = [
  { id: 1, name: '나' },
  { id: 2, name: '가' },
];
const columns: Column<Row>[] = [
  { header: '이름', accessor: (item) => item.name, sortKey: 'name', serverSortKey: 'userNm' },
  { header: '번호', accessor: (item) => String(item.id) },
];
const NOTICE = '정렬은 현재 페이지 안에서만 적용됩니다';
const pagination = { currentPage: 1, totalPages: 3, onPageChange: () => {} };

function renderTable(serverSort?: ServerSortState & { onSortChange: (next: ServerSortState) => void }) {
  return render(
    <StandardDataTable<Row> columns={columns} data={rows} keyField="id" pagination={pagination} serverSort={serverSort} />,
  );
}

describe('서버 정렬', () => {
  it('머리글은 기본 → 오름차순 → 내림차순 → 기본으로 다음 정렬을 알리고, 행은 서버가 준 순서대로 둔다', () => {
    const onSortChange = vi.fn();
    const { rerender } = renderTable({ onSortChange });
    const header = screen.getByRole('columnheader', { name: '이름' });
    expect(header).toHaveAttribute('aria-sort', 'none');
    fireEvent.click(screen.getByRole('button', { name: /이름/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({ sortBy: 'userNm', sortDir: 'asc' });
    // 표는 스스로 재배열하지 않는다 — 서버가 다시 준 행이 순서다.
    expect(screen.getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual(['나1', '가2']);

    rerender(<StandardDataTable<Row> columns={columns} data={rows} keyField="id" pagination={pagination}
      serverSort={{ sortBy: 'userNm', sortDir: 'asc', onSortChange }} />);
    expect(screen.getByRole('columnheader', { name: '이름' })).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(screen.getByRole('button', { name: /이름/ }));
    expect(onSortChange).toHaveBeenLastCalledWith({ sortBy: 'userNm', sortDir: 'desc' });

    expect(nextServerSort({ sortBy: 'userNm', sortDir: 'desc' }, 'userNm')).toEqual({});
    expect(nextServerSort({ sortBy: 'crtDt', sortDir: 'desc' }, 'userNm')).toEqual({ sortBy: 'userNm', sortDir: 'asc' });
  });

  it('서버 정렬 열만 있으면 현재 페이지 고지를 하지 않고, 단추는 목록 전체 정렬이라고 말한다', () => {
    renderTable({ onSortChange: vi.fn() });
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /이름/ })).toHaveAttribute('title', '목록 전체를 정렬합니다');
  });

  it('serverSort 를 주지 않는 표에서 같은 열은 종전 현재 페이지 정렬이고 고지를 한다', () => {
    renderTable(undefined);
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /이름/ }));
    expect(screen.getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual(['가2', '나1']);
  });
});
